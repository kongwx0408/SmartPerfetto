// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';
import type {
  AnalysisOptions,
  AnalysisResult,
  IOrchestrator,
} from '../agent/core/orchestratorTypes';
import type { Finding, StreamingUpdate } from '../agent/types';
import type { Hypothesis as ProtocolHypothesis } from '../agent/types/agentProtocol';
import type { ArchitectureInfo } from '../agent/detectors/types';
import { createArchitectureDetector } from '../agent/detectors/architectureDetector';
import { sessionContextManager } from '../agent/context/enhancedSessionContext';
import { createSkillExecutor } from '../services/skillEngine/skillExecutor';
import { ensureSkillRegistryInitialized, skillRegistry } from '../services/skillEngine/skillLoader';
import { ArtifactStore } from '../agentv3/artifactStore';
import {
  buildNegativePatternSection,
  buildPatternContextSection,
  extractTraceFeatures,
} from '../agentv3/analysisPatternMemory';
import {
  createClaudeMcpServer,
  loadLearnedSqlFixPairs,
} from '../agentv3/claudeMcpServer';
import {
  buildQuickSystemPrompt,
  buildSystemPrompt,
} from '../agentv3/claudeSystemPrompt';
import { extractFindingsFromText } from '../agentv3/claudeFindingExtractor';
import { detectFocusApps } from '../agentv3/focusAppDetector';
import { localize, parseOutputLanguage } from '../agentv3/outputLanguage';
import { classifyScene, type SceneType } from '../agentv3/sceneClassifier';
import { probeTraceCompleteness } from '../agentv3/traceCompletenessProber';
import type {
  AnalysisNote,
  AnalysisPlanV3,
  ClaudeAnalysisContext,
  Hypothesis,
  UncertaintyFlag,
} from '../agentv3/types';
import {
  createOpenCodeSnapshotEngineState,
  type SessionFieldsForSnapshot,
  type SessionStateSnapshot,
} from '../agentv3/sessionStateSnapshot';
import type { McpToolDefinition } from '../agentv3/mcpToolRegistry';
import type { JsonRpcRequest, JsonRpcResponse } from '../agentv3/standaloneMcpServer';
import { RPC_ERROR_CODES } from '../agentv3/standaloneMcpServer';
import { applyFinalResultQualityGate } from '../services/finalResultQualityGate';
import { getExtendedKnowledgeBase } from '../services/sqlKnowledgeBase';
import { sanitizeCodeAwareText } from '../services/security/codeAwareOutputRegistry';
import { getProviderService, type ProviderConfig } from '../services/providerManager';
import type { RuntimeSelection } from './runtimeSelection';
import type { EngineCapabilities } from './runtimeCapabilities';
import type { RuntimeEngineDefinition, RuntimeFactoryInput } from './runtimeRegistry';
import { createAnalysisRunSpec, type AnalysisRunSpec } from './analysisRunSpec';
import {
  buildEntityContext,
  captureSkillDisplayEntities,
  createRuntimeSkillNotesBudget,
  knowledgeScopeFromAnalysisOptions,
} from './runtimeCommon';
import { createJsonSchemaFromZodRawShape, normalizeRuntimeToolArgs } from './runtimeToolSpec';

export const EXPERIMENTAL_OPENCODE_RUNTIME_KIND = 'experimental-opencode' as const;
export const OPENCODE_RUNTIME_KIND = 'opencode' as const;
export type ExperimentalOpenCodeRuntimeKind = typeof EXPERIMENTAL_OPENCODE_RUNTIME_KIND;
export type PublicOpenCodeRuntimeKind = typeof OPENCODE_RUNTIME_KIND;
export type OpenCodeRuntimeKind = ExperimentalOpenCodeRuntimeKind | PublicOpenCodeRuntimeKind;

export const OPENCODE_SDK_MODULE_PATH_ENV = 'SMARTPERFETTO_OPENCODE_SDK_MODULE_PATH';
export const OPENCODE_PROJECT_DIR_ENV = 'SMARTPERFETTO_OPENCODE_PROJECT_DIR';
export const OPENCODE_SERVER_PORT_ENV = 'SMARTPERFETTO_OPENCODE_SERVER_PORT';
export const OPENCODE_SERVER_TIMEOUT_MS_ENV = 'SMARTPERFETTO_OPENCODE_SERVER_TIMEOUT_MS';
export const OPENCODE_PROMPT_TIMEOUT_MS_ENV = 'SMARTPERFETTO_OPENCODE_PROMPT_TIMEOUT_MS';
export const OPENCODE_MODEL_JSON_ENV = 'SMARTPERFETTO_OPENCODE_MODEL_JSON';
export const OPENCODE_SYSTEM_PROMPT_ENV = 'SMARTPERFETTO_OPENCODE_SYSTEM_PROMPT';
export const OPENCODE_ENABLE_STANDALONE_MCP_ENV = 'SMARTPERFETTO_OPENCODE_ENABLE_STANDALONE_MCP';
export const OPENCODE_MCP_COMMAND_JSON_ENV = 'SMARTPERFETTO_OPENCODE_MCP_COMMAND_JSON';
export const OPENCODE_MCP_TIMEOUT_MS_ENV = 'SMARTPERFETTO_OPENCODE_MCP_TIMEOUT_MS';
export const OPENCODE_REAL_ANALYSIS_ENV = 'SMARTPERFETTO_OPENCODE_REAL_ANALYSIS';

const DEFAULT_SERVER_TIMEOUT_MS = 15_000;
const DEFAULT_PROMPT_TIMEOUT_MS = 20 * 60_000;
const PROMPT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_MCP_TIMEOUT_MS = 5_000;
const STANDALONE_MCP_NAME = 'smartperfetto';

const STANDALONE_MCP_PUBLIC_TOOLS = [
  'lookup_blog_knowledge',
  'lookup_aosp_source',
  'lookup_oem_sdk',
  'lookup_baseline',
  'compare_baselines',
  'recall_project_memory',
  'recall_similar_case',
] as const;

const OPENCODE_BUILT_IN_TOOL_IDS = [
  'invalid',
  'question',
  'bash',
  'read',
  'glob',
  'grep',
  'edit',
  'write',
  'task',
  'webfetch',
  'todowrite',
  'websearch',
  'skill',
  'apply_patch',
] as const;

type EnvLike = Record<string, string | undefined>;

interface OpenCodeServerHandle {
  url: string;
  close(): void;
}

interface OpenCodeSdkResponse<T> {
  data?: T;
}

interface OpenCodeSession {
  id: string;
}

interface OpenCodeModelRef {
  providerID: string;
  modelID: string;
}

interface OpenCodeClient {
  session: {
    create(input: { body?: { title?: string } }): Promise<OpenCodeSdkResponse<OpenCodeSession> | OpenCodeSession>;
    prompt(input: OpenCodePromptInput): Promise<unknown>;
    promptAsync?(input: OpenCodePromptInput): Promise<unknown>;
    status?(input?: { query?: { directory?: string } }): Promise<unknown>;
    messages?(input: {
      path: { id: string };
      query?: { directory?: string; limit?: number; order?: 'asc' | 'desc' };
    }): Promise<unknown>;
    abort?(input: { path: { id: string } }): Promise<unknown>;
  };
}

interface OpenCodePromptInput {
  path: { id: string };
  query?: { directory?: string };
  body?: {
    noReply?: boolean;
    model?: OpenCodeModelRef;
    agent?: string;
    system?: string;
    tools?: Record<string, boolean>;
    parts: Array<{ type: 'text'; text: string }>;
  };
}

interface OpenCodeInstance {
  client: OpenCodeClient;
  server: OpenCodeServerHandle;
}

interface OpenCodeSdkModule {
  createOpencode(options?: Record<string, unknown>): Promise<OpenCodeInstance>;
}

export type OpenCodeSdkModuleLoader = (env: EnvLike) => Promise<OpenCodeSdkModule>;

export interface OpenCodeRuntimeOptions {
  env?: EnvLike;
  moduleLoader?: OpenCodeSdkModuleLoader;
}

interface OpenCodeModelConfig {
  model: OpenCodeModelRef;
  providerConfig?: Record<string, unknown>;
  smallModel?: string;
}

interface OpenCodeAnalysisPreparation {
  systemPrompt: string;
  prompt: string;
  toolDefinitions: McpToolDefinition[];
  allowedToolNames: Set<string>;
  quickMode: boolean;
  sceneType: SceneType;
  packageName?: string;
  architecture?: ArchitectureInfo;
  sessionContext: ReturnType<typeof sessionContextManager.getOrCreate>;
  previousTurns: any[];
  analysisPlan: { current: AnalysisPlanV3 | null; history: AnalysisPlanV3[] };
  notes: AnalysisNote[];
  hypotheses: Hypothesis[];
  uncertaintyFlags: UncertaintyFlag[];
  analysisRunSpec: AnalysisRunSpec;
}

export type OpenCodeEvent =
  | {
      type?: string;
      name?: string;
      data?: Record<string, unknown>;
      properties?: Record<string, unknown>;
    }
  | Record<string, unknown>;

const importEsmModule = new Function(
  'specifier',
  'return import(specifier);',
) as (specifier: string) => Promise<unknown>;

function truthyEnv(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes';
}

function numericEnv(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseCommandJson(value: string | undefined): string[] | undefined {
  if (!value?.trim()) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some(item => typeof item !== 'string' || item.trim() === '')) {
      throw new Error('command must be a JSON string array');
    }
    return parsed;
  } catch (err) {
    throw new Error(
      `${OPENCODE_MCP_COMMAND_JSON_ENV} must be a JSON string array: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function describeOpenCodeSdkError(error: unknown): string {
  if (!error) return 'unknown error';
  if (typeof error === 'string') return error;
  if (!isRecord(error)) return String(error);
  const data = isRecord(error.data) ? error.data : undefined;
  const message = typeof error.message === 'string'
    ? error.message
    : typeof data?.message === 'string'
      ? data.message
      : undefined;
  if (message) return message;
  try {
    return JSON.stringify(error);
  } catch {
    return 'unserializable error';
  }
}

function unwrapSdkData<T>(value: OpenCodeSdkResponse<T> | T, context = 'OpenCode SDK request'): T {
  if (value && typeof value === 'object' && 'data' in value) {
    const response = value as OpenCodeSdkResponse<T> & { error?: unknown };
    if (response.error !== undefined) {
      throw new Error(`${context} failed: ${describeOpenCodeSdkError(response.error)}`);
    }
    if (response.data === undefined || response.data === null) {
      throw new Error(`${context} returned no data`);
    }
    return response.data as T;
  }
  return value as T;
}

function assertSdkSuccess(value: unknown, context: string): void {
  if (!isRecord(value)) return;
  if ('error' in value && value.error !== undefined) {
    throw new Error(`${context} failed: ${describeOpenCodeSdkError(value.error)}`);
  }
}

export function getOpenCodeEngineCapabilities(
  kind: OpenCodeRuntimeKind = EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
): EngineCapabilities {
  const publicRuntime = kind === OPENCODE_RUNTIME_KIND;
  return {
    kind,
    displayName: publicRuntime ? 'OpenCode' : 'Experimental OpenCode',
    production: publicRuntime,
    publicRuntime,
    nativeLoop: 'opencode-server',
    toolTransport: 'opencode-mcp',
    toolSchemaDialect: 'json_schema',
    eventModel: 'opencode-server',
    abortMechanism: 'session-abort-and-server-close',
    toolExecution: {
      defaultMode: 'sdk-controlled',
      requestScopedAllowlist: true,
      externalDiscovery: false,
      builtInShellOrFileTools: false,
    },
    classifierPolicy: 'third-party-local-rules-only',
    continuationPolicy: {
      sdkRunDoneMeansAnalysisDone: false,
      claudeVerifierCorrectionLoop: false,
      openAiPlanContinuation: false,
      openAiFinalReportContinuation: false,
    },
    snapshotState: {
      storesClaudeSdkSession: false,
      storesOpenAiResponseState: false,
      storesOpaqueThirdPartyState: true,
    },
    supportsProviderRuntimePinning: publicRuntime,
  };
}

export function getOpenCodeRuntimeDiagnostics(
  env: EnvLike = process.env,
  kind: OpenCodeRuntimeKind = OPENCODE_RUNTIME_KIND,
) {
  const modulePath = env[OPENCODE_SDK_MODULE_PATH_ENV]?.trim();
  const projectDir = env[OPENCODE_PROJECT_DIR_ENV]?.trim();
  const modelJson = env[OPENCODE_MODEL_JSON_ENV]?.trim();
  const standaloneMcpEnabled = truthyEnv(env[OPENCODE_ENABLE_STANDALONE_MCP_ENV]);
  return {
    configured: Boolean(modulePath) || Boolean(env.PATH),
    runtime: kind,
    experimental: kind === EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
    package: '@opencode-ai/sdk',
    cliPackage: 'opencode-ai',
    modulePath: modulePath || undefined,
    projectDir: projectDir || undefined,
    modelConfigured: Boolean(modelJson || env.OPENAI_MODEL),
    serverPort: numericEnv(env[OPENCODE_SERVER_PORT_ENV]),
    serverTimeoutMs: numericEnv(env[OPENCODE_SERVER_TIMEOUT_MS_ENV]) ?? DEFAULT_SERVER_TIMEOUT_MS,
    standaloneMcpEnabled,
    standaloneMcpTimeoutMs: numericEnv(env[OPENCODE_MCP_TIMEOUT_MS_ENV]) ?? DEFAULT_MCP_TIMEOUT_MS,
  };
}

export async function loadOpenCodeSdkModule(
  env: EnvLike = process.env,
): Promise<OpenCodeSdkModule> {
  const explicitModulePath = env[OPENCODE_SDK_MODULE_PATH_ENV]?.trim();
  const specifier = explicitModulePath
    ? pathToFileURL(explicitModulePath).href
    : '@opencode-ai/sdk';
  const module = await importEsmModule(specifier) as Partial<OpenCodeSdkModule>;
  if (typeof module.createOpencode !== 'function') {
    throw new Error('OpenCode SDK module does not export createOpencode');
  }
  return module as OpenCodeSdkModule;
}

export function createOpenCodeToolAllowlist(
  allowedToolNames: readonly string[] = [],
): Record<string, boolean> {
  const tools: Record<string, boolean> = {};
  for (const toolId of OPENCODE_BUILT_IN_TOOL_IDS) {
    tools[toolId] = false;
  }
  for (const toolName of allowedToolNames) {
    tools[toolName] = true;
  }
  return tools;
}

export function createOpenCodeStandaloneMcpToolNames(
  mcpName = STANDALONE_MCP_NAME,
): string[] {
  return STANDALONE_MCP_PUBLIC_TOOLS.flatMap(toolName => [
    toolName,
    `${mcpName}_${toolName}`,
    `mcp__${mcpName}__${toolName}`,
  ]);
}

export function createOpenCodeStandaloneMcpConfig(
  env: EnvLike = process.env,
): Record<string, unknown> {
  if (!truthyEnv(env[OPENCODE_ENABLE_STANDALONE_MCP_ENV])) {
    return {};
  }

  const explicitCommand = parseCommandJson(env[OPENCODE_MCP_COMMAND_JSON_ENV]);
  const command = explicitCommand ?? [
    path.resolve(process.cwd(), 'node_modules/.bin/tsx'),
    path.resolve(process.cwd(), 'bin/smartperfetto-mcp.ts'),
  ];

  return {
    [STANDALONE_MCP_NAME]: {
      type: 'local',
      enabled: true,
      timeout: numericEnv(env[OPENCODE_MCP_TIMEOUT_MS_ENV]) ?? DEFAULT_MCP_TIMEOUT_MS,
      command,
      environment: {
        SMARTPERFETTO_STANDALONE_MCP: '1',
      },
    },
  };
}

export function createOpenCodeHardenedConfig(
  allowedToolNames: readonly string[] = [],
  env: EnvLike = process.env,
  bridge?: OpenCodeMcpBridgeHandle,
  modelConfig?: OpenCodeModelConfig,
): Record<string, unknown> {
  const mcpToolNames = bridge
    ? createOpenCodeMcpToolNames(allowedToolNames)
    : truthyEnv(env[OPENCODE_ENABLE_STANDALONE_MCP_ENV])
      ? createOpenCodeStandaloneMcpToolNames()
      : [];
  const mcpConfig = bridge
    ? {
        [STANDALONE_MCP_NAME]: {
          type: 'local',
          enabled: true,
          timeout: numericEnv(env[OPENCODE_MCP_TIMEOUT_MS_ENV]) ?? DEFAULT_MCP_TIMEOUT_MS,
          command: resolveOpenCodeBridgeCommand(env),
          environment: {
            SMARTPERFETTO_OPENCODE_BRIDGE_PORT: String(bridge.port),
            SMARTPERFETTO_OPENCODE_BRIDGE_TOKEN: bridge.token,
          },
        },
      }
    : createOpenCodeStandaloneMcpConfig(env);
  const standaloneMcpToolNames = mcpToolNames;
  const tools = createOpenCodeToolAllowlist(allowedToolNames);
  for (const toolName of standaloneMcpToolNames) {
    tools[toolName] = true;
  }
  const permission = {
    edit: 'deny',
    bash: 'deny',
    webfetch: 'deny',
    external_directory: 'deny',
  };

  return {
    autoupdate: false,
    share: 'disabled',
    snapshot: false,
    instructions: [],
    mcp: mcpConfig,
    lsp: false,
    formatter: false,
    ...(modelConfig?.providerConfig ? { provider: modelConfig.providerConfig } : {}),
    ...(modelConfig?.smallModel ? { small_model: modelConfig.smallModel } : {}),
    ...(modelConfig ? { model: `${modelConfig.model.providerID}/${modelConfig.model.modelID}` } : {}),
    tools,
    permission,
    agent: {
      smartperfetto: {
        mode: 'primary',
        hidden: true,
        ...(modelConfig ? { model: `${modelConfig.model.providerID}/${modelConfig.model.modelID}` } : {}),
        tools,
        permission,
        maxSteps: 80,
      },
    },
  };
}

export function projectOpenCodeEventToStreamingUpdate(
  event: OpenCodeEvent,
  timestamp = Date.now(),
): StreamingUpdate | undefined {
  const type = typeof event.type === 'string' ? event.type : undefined;
  const name = typeof event.name === 'string' ? event.name : type;
  const data = (event.data ?? event.properties ?? {}) as Record<string, unknown>;

  if (name === 'session.next.text.delta.1' || type === 'session.next.text.delta') {
    const delta = typeof data.delta === 'string' ? data.delta : '';
    if (!delta) return undefined;
    return { type: 'answer_token', content: delta, timestamp };
  }

  if (name === 'session.next.tool.called.1' || type === 'session.next.tool.called') {
    return {
      type: 'tool_call',
      content: {
        name: data.tool ?? data.name ?? 'unknown_tool',
        input: data.input,
        callId: data.callID ?? data.callId,
        runtime: EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
      },
      timestamp,
    };
  }

  if (name === 'session.next.tool.success.1' || type === 'session.next.tool.success') {
    return {
      type: 'progress',
      content: `OpenCode tool completed: ${String(data.tool ?? data.name ?? 'unknown_tool')}`,
      timestamp,
    };
  }

  if (name === 'session.next.tool.failed.1' || type === 'session.next.tool.failed') {
    return {
      type: 'degraded',
      content: {
        source: EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
        reason: 'tool_failed',
        tool: data.tool ?? data.name ?? 'unknown_tool',
        error: data.error,
      },
      timestamp,
    };
  }

  if (name === 'session.status' || type === 'session.status') {
    return {
      type: 'progress',
      content: {
        runtime: EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
        status: data.status,
      },
      timestamp,
    };
  }

  return undefined;
}

function buildSmokePrompt(query: string, traceId: string, options?: AnalysisOptions): string {
  const mode = options?.analysisMode ?? 'auto';
  const packageName = options?.packageName ?? 'unknown';
  return [
    'SmartPerfetto OpenCode hidden-runtime smoke.',
    `Trace ID: ${traceId}`,
    `Package: ${packageName}`,
    `Analysis mode: ${mode}`,
    `User query: ${query}`,
  ].join('\n');
}

function resolveOpenCodeBridgeCommand(env: EnvLike): string[] {
  const explicitCommand = parseCommandJson(env[OPENCODE_MCP_COMMAND_JSON_ENV]);
  if (explicitCommand) return explicitCommand;

  const compiledChild = path.join(__dirname, 'openCodeMcpBridgeChild.js');
  if (fs.existsSync(compiledChild)) {
    return [process.execPath, compiledChild];
  }

  const tsChild = path.resolve(process.cwd(), 'src/agentRuntime/openCodeMcpBridgeChild.ts');
  const tsxBin = path.resolve(process.cwd(), 'node_modules/.bin/tsx');
  return [tsxBin, tsChild];
}

function createOpenCodeMcpToolNames(
  toolNames: readonly string[],
  mcpName = STANDALONE_MCP_NAME,
): string[] {
  return toolNames.flatMap(toolName => [
    toolName,
    `${mcpName}_${toolName}`,
    `mcp__${mcpName}__${toolName}`,
  ]);
}

function normalizeOpenCodeMcpToolName(
  name: string,
  definitions: readonly McpToolDefinition[],
  mcpName = STANDALONE_MCP_NAME,
): McpToolDefinition | undefined {
  return definitions.find(definition => (
    definition.name === name ||
    `${mcpName}_${definition.name}` === name ||
    `mcp__${mcpName}__${definition.name}` === name
  ));
}

function rpcError(
  id: string | number | null,
  code: number,
  message: string,
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

type OpenCodeBridgeUpdateEmitter = (update: StreamingUpdate) => void;

function summarizeOpenCodeToolResult(result: unknown): string {
  if (typeof result === 'string') {
    return result.length > 2000 ? `${result.slice(0, 2000)}...` : result;
  }
  const content = isRecord(result) && Array.isArray(result.content)
    ? result.content
      .map(block => isRecord(block) && typeof block.text === 'string' ? block.text : '')
      .filter(Boolean)
      .join('\n')
    : '';
  if (content) {
    return content.length > 2000 ? `${content.slice(0, 2000)}...` : content;
  }
  let text: string;
  try {
    text = JSON.stringify(result);
  } catch {
    text = String(result);
  }
  if (!text) return '';
  return text.length > 2000 ? `${text.slice(0, 2000)}...` : text;
}

export async function dispatchOpenCodeBridgeRequest(
  definitions: readonly McpToolDefinition[],
  req: JsonRpcRequest,
  emitUpdate?: OpenCodeBridgeUpdateEmitter,
): Promise<JsonRpcResponse | null> {
  if (req.id === undefined) return null;
  const id = req.id;
  if (req.method === '__parse_error__') {
    return rpcError(null, RPC_ERROR_CODES.PARSE_ERROR, 'Invalid JSON');
  }
  if (req.method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: { name: STANDALONE_MCP_NAME, version: '1.0.0' },
        capabilities: { tools: {} },
      },
    };
  }
  if (req.method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: definitions.map(definition => ({
          name: definition.name,
          description: definition.summary || definition.shared.description,
          inputSchema: createJsonSchemaFromZodRawShape(definition.shared.inputSchema),
        })),
      },
    };
  }
  if (req.method === 'tools/call') {
    const params = (req.params ?? {}) as { name?: string; arguments?: unknown };
    if (!params.name || typeof params.name !== 'string') {
      return rpcError(id, RPC_ERROR_CODES.INVALID_PARAMS, '`name` is required');
    }
    const definition = normalizeOpenCodeMcpToolName(params.name, definitions);
    if (!definition) {
      return rpcError(id, RPC_ERROR_CODES.METHOD_NOT_FOUND, `Unknown tool '${params.name}'`);
    }
    const args = normalizeRuntimeToolArgs(params.arguments ?? {}) as Record<string, unknown>;
    const taskId = String(id ?? `${params.name}-${Date.now()}`);
    try {
      emitUpdate?.({
        type: 'agent_task_dispatched',
        content: {
          taskId,
          toolName: definition.name,
          args,
          message: `OpenCode dispatched ${definition.name}`,
        },
        timestamp: Date.now(),
      });
      const result = await definition.shared.handler(
        args,
        { runtime: OPENCODE_RUNTIME_KIND },
      );
      emitUpdate?.({
        type: 'agent_response',
        content: {
          taskId,
          result: summarizeOpenCodeToolResult(result),
        },
        timestamp: Date.now(),
      });
      return { jsonrpc: '2.0', id, result };
    } catch (err) {
      emitUpdate?.({
        type: 'agent_response',
        content: {
          taskId,
          result: `ERROR: ${err instanceof Error ? err.message : String(err)}`,
        },
        timestamp: Date.now(),
      });
      return rpcError(
        id,
        RPC_ERROR_CODES.TOOL_EXECUTION_FAILED,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  return rpcError(id, RPC_ERROR_CODES.METHOD_NOT_FOUND, `Unknown method '${req.method}'`);
}

interface OpenCodeMcpBridgeHandle {
  port: number;
  token: string;
  close(): Promise<void>;
}

function startOpenCodeMcpBridge(
  definitions: readonly McpToolDefinition[],
  emitUpdate?: OpenCodeBridgeUpdateEmitter,
): Promise<OpenCodeMcpBridgeHandle> {
  const token = crypto.randomBytes(24).toString('hex');
  const server = net.createServer((socket) => {
    socket.setEncoding('utf-8');
    let buffer = '';
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      const newline = buffer.indexOf('\n');
      if (newline < 0) return;
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      void (async () => {
        try {
          const envelope = JSON.parse(line) as { token?: string; request?: JsonRpcRequest };
          if (envelope.token !== token || !envelope.request) {
            socket.write(`${JSON.stringify(rpcError(null, RPC_ERROR_CODES.INVALID_REQUEST, 'Invalid bridge request'))}\n`);
            socket.end();
            return;
          }
          const response = await dispatchOpenCodeBridgeRequest(definitions, envelope.request, emitUpdate);
          if (response) socket.write(`${JSON.stringify(response)}\n`);
          socket.end();
        } catch {
          socket.write(`${JSON.stringify(rpcError(null, RPC_ERROR_CODES.PARSE_ERROR, 'Invalid bridge JSON'))}\n`);
          socket.end();
        }
      })();
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('OpenCode MCP bridge did not bind to a TCP port'));
        return;
      }
      resolve({
        port: address.port,
        token,
        close: () => new Promise<void>((closeResolve, closeReject) => {
          server.close(err => err ? closeReject(err) : closeResolve());
        }),
      });
    });
  });
}

function createTempDirectory(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getProviderForSelection(selection: RuntimeSelection<string>): ProviderConfig | undefined {
  if (selection.source !== 'provider' || !selection.providerId) return undefined;
  return getProviderService().getRawProvider(selection.providerId);
}

function createOpenCodeProviderConfig(
  providerID: string,
  modelID: string,
  options: {
    name?: string;
    baseURL?: string;
    apiKey?: string;
  },
): Record<string, unknown> {
  return {
    [providerID]: {
      npm: '@ai-sdk/openai-compatible',
      name: options.name ?? 'SmartPerfetto OpenAI-compatible',
      options: {
        ...(options.baseURL ? { baseURL: options.baseURL } : {}),
        ...(options.apiKey ? { apiKey: options.apiKey } : {}),
      },
      models: {
        [modelID]: {
          id: modelID,
          name: modelID,
          tool_call: true,
          reasoning: false,
          temperature: true,
          limit: { context: 128_000, output: 16_384 },
          cost: { input: 0, output: 0 },
          modalities: { input: ['text'], output: ['text'] },
          status: 'active',
        },
      },
    },
  };
}

function resolveOpenCodeModelConfig(
  env: EnvLike,
  selection: RuntimeSelection<string>,
): OpenCodeModelConfig {
  const provider = getProviderForSelection(selection);
  const providerModelJson = provider?.connection.openCodeModelJson?.trim();
  const rawModel = providerModelJson || env[OPENCODE_MODEL_JSON_ENV]?.trim();
  if (rawModel) {
    try {
      const parsed = JSON.parse(rawModel) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('model JSON must be an object');
      }
      const providerID = normalizeOptionalString(parsed.providerID)
        || normalizeOptionalString(parsed.providerId)
        || normalizeOptionalString(parsed.provider)
        || 'smartperfetto';
      const modelID = normalizeOptionalString(parsed.modelID)
        || normalizeOptionalString(parsed.modelId)
        || normalizeOptionalString(parsed.model)
        || normalizeOptionalString(parsed.id);
      if (!modelID) throw new Error('modelID/model/id is required');
      const baseURL = normalizeOptionalString(parsed.baseURL)
        || normalizeOptionalString(parsed.baseUrl);
      const apiKey = normalizeOptionalString(parsed.apiKey)
        || (normalizeOptionalString(parsed.apiKeyEnv)
          ? env[normalizeOptionalString(parsed.apiKeyEnv)!]?.trim()
          : undefined);
      return {
        model: { providerID, modelID },
        providerConfig: createOpenCodeProviderConfig(providerID, modelID, {
          baseURL,
          apiKey,
          name: normalizeOptionalString(parsed.name),
        }),
        smallModel: normalizeOptionalString(parsed.smallModel)
          || normalizeOptionalString(parsed.smallModelID),
      };
    } catch (err) {
      throw new Error(`${OPENCODE_MODEL_JSON_ENV} must be valid JSON: ${(err as Error).message}`);
    }
  }

  const providerConnection = provider?.connection;
  const modelID = provider?.models.primary
    || env.OPENAI_MODEL
    || env.SMARTPERFETTO_OPENCODE_MODEL;
  const baseURL = providerConnection?.openaiBaseUrl
    || providerConnection?.baseUrl
    || env.OPENAI_BASE_URL;
  const apiKey = providerConnection?.openaiApiKey
    || providerConnection?.apiKey
    || env.OPENAI_API_KEY;
  if (!modelID) {
    throw new Error(`${OPENCODE_MODEL_JSON_ENV} or an OpenAI-compatible primary model is required for OpenCode`);
  }
  if (!baseURL) {
    throw new Error(`${OPENCODE_MODEL_JSON_ENV} or an OpenAI-compatible base URL is required for OpenCode`);
  }
  return {
    model: { providerID: 'smartperfetto', modelID },
    providerConfig: createOpenCodeProviderConfig('smartperfetto', modelID, {
      baseURL,
      apiKey,
      name: provider?.name,
    }),
    smallModel: provider?.models.light
      ? `smartperfetto/${provider.models.light}`
      : env.OPENAI_LIGHT_MODEL
        ? `smartperfetto/${env.OPENAI_LIGHT_MODEL}`
        : undefined,
  };
}

function extractTextParts(value: unknown): string {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value
      .map(part => isRecord(part) && part.type === 'text' && typeof part.text === 'string' ? part.text : '')
      .filter(Boolean)
      .join('\n');
  }
  if (!isRecord(value)) return '';
  if (value.type === 'text' && typeof value.text === 'string') return value.text;
  return Array.isArray(value.parts) ? extractTextParts(value.parts) : '';
}

function getOpenCodeMessageRole(value: Record<string, unknown>): string | undefined {
  if (typeof value.role === 'string') return value.role;
  const info = isRecord(value.info) ? value.info : undefined;
  return typeof info?.role === 'string' ? info.role : undefined;
}

function collectOpenCodeAssistantTexts(value: unknown, output: string[]): void {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) collectOpenCodeAssistantTexts(item, output);
    return;
  }
  if (!isRecord(value)) return;

  if (getOpenCodeMessageRole(value) === 'assistant') {
    const text = extractTextParts(value).trim();
    if (text) output.push(text);
    return;
  }

  for (const key of ['data', 'message', 'messages', 'response', 'result']) {
    if (key in value) collectOpenCodeAssistantTexts(value[key], output);
  }
}

export function extractOpenCodeAssistantText(value: unknown): string {
  const assistantTexts: string[] = [];
  collectOpenCodeAssistantTexts(value, assistantTexts);
  const nonEmptyAssistantTexts = assistantTexts.filter(Boolean);
  const assistantText = selectBestOpenCodeAssistantText(nonEmptyAssistantTexts);
  if (assistantText) return assistantText;
  if (isRecord(value) && Array.isArray(value.parts)) return extractTextParts(value).trim();
  if (isRecord(value) && 'data' in value && isRecord(value.data) && Array.isArray(value.data.parts)) {
    return extractTextParts(value.data).trim();
  }
  return '';
}

function scoreOpenCodeAssistantText(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  let score = Math.min(trimmed.length, 50_000);
  const headingCount = trimmed.match(/^#{1,3}\s+\S/gm)?.length ?? 0;
  if (headingCount > 0) score += 20_000 + Math.min(headingCount, 8) * 1000;
  if (/\b(report|analysis)\b/i.test(trimmed) || /报告|分析/.test(trimmed)) {
    score += 3000;
  }
  return score;
}

function selectBestOpenCodeAssistantText(texts: readonly string[]): string | undefined {
  let best: { text: string; score: number } | undefined;
  for (const text of texts) {
    const score = scoreOpenCodeAssistantText(text);
    if (!best || score >= best.score) {
      best = { text, score };
    }
  }
  return best?.text;
}

function collectOpenCodeAssistantMessages(value: unknown, output: Record<string, unknown>[]): void {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) collectOpenCodeAssistantMessages(item, output);
    return;
  }
  if (!isRecord(value)) return;
  if (getOpenCodeMessageRole(value) === 'assistant') {
    output.push(value);
    return;
  }
  for (const key of ['data', 'message', 'messages', 'response', 'result']) {
    if (key in value) collectOpenCodeAssistantMessages(value[key], output);
  }
}

function getLatestOpenCodeAssistantMessage(value: unknown): Record<string, unknown> | undefined {
  const messages: Record<string, unknown>[] = [];
  collectOpenCodeAssistantMessages(value, messages);
  return messages[messages.length - 1];
}

function isOpenCodeAssistantMessageComplete(message: Record<string, unknown> | undefined): boolean {
  if (!message) return false;
  const info = isRecord(message.info) ? message.info : message;
  if (info.error !== undefined) {
    throw new Error(`OpenCode assistant message failed: ${describeOpenCodeSdkError(info.error)}`);
  }
  if (typeof info.finish === 'string' && info.finish.trim()) return true;
  const time = isRecord(info.time) ? info.time : undefined;
  return typeof time?.completed === 'number';
}

function isOpenCodeSessionIdle(statusResponse: unknown, sessionId: string): boolean {
  if (!isRecord(statusResponse)) return false;
  const statusMap = isRecord(statusResponse.data) ? statusResponse.data : statusResponse;
  const directStatus = isRecord(statusMap[sessionId]) ? statusMap[sessionId] : undefined;
  if (directStatus) return directStatus.type === 'idle';
  const statuses = Object.values(statusMap).filter(isRecord);
  return statuses.length > 0 && statuses.every(status => status.type === 'idle');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runOpenCodePrompt(
  opencode: OpenCodeInstance,
  promptInput: OpenCodePromptInput,
  options: {
    sessionId: string;
    projectDir: string;
    timeoutMs: number;
  },
): Promise<{ promptResponse?: unknown; messagesResponse?: unknown }> {
  const { sessionId, projectDir, timeoutMs } = options;
  if (opencode.client.session.promptAsync && opencode.client.session.messages) {
    assertSdkSuccess(
      await opencode.client.session.promptAsync(promptInput),
      'OpenCode async prompt',
    );
    const startedAt = Date.now();
    let messagesResponse: unknown;
    while (Date.now() - startedAt < timeoutMs) {
      await delay(PROMPT_POLL_INTERVAL_MS);
      messagesResponse = unwrapSdkData(await opencode.client.session.messages({
        path: { id: sessionId },
        query: { directory: projectDir, limit: 50, order: 'asc' },
      }), 'OpenCode messages');
      const latestAssistant = getLatestOpenCodeAssistantMessage(messagesResponse);
      if (isOpenCodeAssistantMessageComplete(latestAssistant)) {
        return { messagesResponse };
      }
      if (opencode.client.session.status) {
        const statusResponse = await opencode.client.session.status({
          query: { directory: projectDir },
        });
        assertSdkSuccess(statusResponse, 'OpenCode session status');
        if (isOpenCodeSessionIdle(statusResponse, sessionId) && extractOpenCodeAssistantText(messagesResponse)) {
          return { messagesResponse };
        }
      }
    }
    throw new Error(`OpenCode prompt timed out after ${timeoutMs}ms`);
  }

  const promptResponse = unwrapSdkData(await opencode.client.session.prompt(promptInput), 'OpenCode prompt');
  const messagesResponse = opencode.client.session.messages
    ? unwrapSdkData(await opencode.client.session.messages({
        path: { id: sessionId },
        query: { directory: projectDir, limit: 50, order: 'asc' },
      }), 'OpenCode messages')
    : undefined;
  return { promptResponse, messagesResponse };
}

function toProtocolHypothesis(hypothesis: Hypothesis): ProtocolHypothesis {
  const statusMap: Record<string, ProtocolHypothesis['status']> = {
    formed: 'proposed',
    confirmed: 'confirmed',
    rejected: 'rejected',
  };
  const confidenceMap: Record<string, number> = { formed: 0.5, confirmed: 0.85, rejected: 0.1 };
  return {
    id: hypothesis.id,
    description: hypothesis.statement,
    status: statusMap[hypothesis.status] || 'proposed',
    confidence: confidenceMap[hypothesis.status] ?? 0.5,
    supportingEvidence: hypothesis.evidence && hypothesis.status === 'confirmed'
      ? [{
          id: `${hypothesis.id}-ev`,
          type: 'observation',
          description: hypothesis.evidence,
          source: 'opencode',
          strength: 0.8,
        }]
      : [],
    contradictingEvidence: hypothesis.evidence && hypothesis.status === 'rejected'
      ? [{
          id: `${hypothesis.id}-ev`,
          type: 'observation',
          description: hypothesis.evidence,
          source: 'opencode',
          strength: 0.8,
        }]
      : [],
    proposedBy: 'opencode',
    relevantAgents: ['opencode'],
    createdAt: hypothesis.formedAt,
    updatedAt: hypothesis.resolvedAt || hypothesis.formedAt,
  };
}

function estimateConfidence(findings: readonly Finding[], partial?: boolean): number {
  if (findings.length === 0) return partial ? 0.25 : 0.35;
  const avg = findings.reduce((sum, finding) => sum + (finding.confidence ?? 0.5), 0) / findings.length;
  const confidence = Math.min(1, Math.max(0, avg));
  return partial ? Math.min(confidence, 0.55) : confidence;
}

export function getOpenCodePlanCompletionStatus(plan: AnalysisPlanV3 | null): { complete: boolean; pending: string[] } {
  if (!plan?.phases?.length) {
    return { complete: false, pending: ['plan_missing'] };
  }
  const pending = plan.phases
    .filter((phase: any) => phase.status !== 'completed' && phase.status !== 'skipped')
    .map((phase: any) => phase.id || phase.title || 'unknown');
  return { complete: pending.length === 0, pending };
}

function formatIncompletePlanMessage(
  status: { pending: string[] },
  outputLanguage: string,
): string {
  const pending = status.pending.join(', ');
  return localize(
    outputLanguage as any,
    `OpenCode 分析 plan 尚未完成。未完成阶段：${pending || 'unknown'}`,
    `OpenCode analysis plan is incomplete. Pending phases: ${pending || 'unknown'}`,
  );
}

export class OpenCodeRuntime extends EventEmitter implements IOrchestrator {
  private readonly env: EnvLike;
  private readonly moduleLoader: OpenCodeSdkModuleLoader;
  private readonly selection: RuntimeSelection<OpenCodeRuntimeKind>;
  private currentSessionId?: string;
  private currentServer?: OpenCodeServerHandle;
  private readonly artifactStores = new Map<string, ArtifactStore>();
  private readonly sessionNotes = new Map<string, AnalysisNote[]>();
  private readonly sessionPlans = new Map<string, { current: AnalysisPlanV3 | null; history: AnalysisPlanV3[] }>();
  private readonly sessionHypotheses = new Map<string, Hypothesis[]>();
  private readonly sessionUncertaintyFlags = new Map<string, UncertaintyFlag[]>();
  private readonly architectureCache = new Map<string, ArchitectureInfo>();

  constructor(
    private readonly input: RuntimeFactoryInput,
    options: OpenCodeRuntimeOptions = {},
  ) {
    super();
    this.env = options.env ?? process.env;
    this.moduleLoader = options.moduleLoader ?? loadOpenCodeSdkModule;
    this.selection = input.selection as RuntimeSelection<OpenCodeRuntimeKind>;
  }

  async analyze(
    query: string,
    sessionId: string,
    traceId: string,
    options?: AnalysisOptions,
  ): Promise<AnalysisResult> {
    if (
      this.selection.kind === OPENCODE_RUNTIME_KIND ||
      truthyEnv(this.env[OPENCODE_REAL_ANALYSIS_ENV])
    ) {
      return this.analyzeWithSmartPerfettoTools(query, sessionId, traceId, options ?? {});
    }

    const startedAt = Date.now();
    this.emitUpdate({
      type: 'progress',
      content: 'Starting experimental OpenCode hidden runtime smoke',
      timestamp: Date.now(),
    });

    const sdk = await this.moduleLoader(this.env);
    const projectDir = this.env[OPENCODE_PROJECT_DIR_ENV]?.trim()
      || createTempDirectory('smartperfetto-opencode-project-');
    const homeDir = createTempDirectory('smartperfetto-opencode-home-');
    const configDir = createTempDirectory('smartperfetto-opencode-config-');
    const port = numericEnv(this.env[OPENCODE_SERVER_PORT_ENV]);
    const timeout = numericEnv(this.env[OPENCODE_SERVER_TIMEOUT_MS_ENV]) ?? DEFAULT_SERVER_TIMEOUT_MS;

    const previousHome = process.env.HOME;
    const previousConfigDir = process.env.OPENCODE_CONFIG_DIR;
    try {
      process.env.HOME = homeDir;
      process.env.OPENCODE_CONFIG_DIR = configDir;
      const opencode = await sdk.createOpencode({
        hostname: '127.0.0.1',
        ...(port ? { port } : {}),
        timeout,
        config: createOpenCodeHardenedConfig([], this.env),
      });
      this.currentServer = opencode.server;
      const created = unwrapSdkData(await opencode.client.session.create({
        body: { title: `SmartPerfetto ${sessionId}` },
      }), 'OpenCode hidden session create');
      this.currentSessionId = created.id;
      unwrapSdkData(await opencode.client.session.prompt({
        path: { id: created.id },
        query: { directory: projectDir },
        body: {
          noReply: true,
          system: 'SmartPerfetto OpenCode hidden runtime smoke. Do not run tools.',
          tools: createOpenCodeToolAllowlist(),
          parts: [{ type: 'text', text: buildSmokePrompt(query, traceId, options) }],
        },
      }), 'OpenCode hidden prompt');
    } finally {
      process.env.HOME = previousHome;
      if (previousConfigDir === undefined) delete process.env.OPENCODE_CONFIG_DIR;
      else process.env.OPENCODE_CONFIG_DIR = previousConfigDir;
      this.closeServer();
    }

    const duration = Date.now() - startedAt;
    const conclusion = [
      'OpenCode hidden runtime smoke completed.',
      'This M13 path verifies server/session/config isolation only; it is not a full SmartPerfetto analysis result yet.',
      'Public OpenCode runtime exposure remains blocked until real startup/scrolling E2E and report verification pass.',
    ].join('\n');

    this.emitUpdate({
      type: 'conclusion',
      content: conclusion,
      timestamp: Date.now(),
    });

    return {
      sessionId,
      success: true,
      findings: [],
      hypotheses: [],
      conclusion,
      confidence: 0.1,
      rounds: 1,
      totalDurationMs: duration,
      partial: true,
      terminationReason: 'plan_incomplete',
      terminationMessage: 'experimental-opencode hidden smoke is not real analysis',
    };
  }

  private async analyzeWithSmartPerfettoTools(
    query: string,
    sessionId: string,
    traceId: string,
    options: AnalysisOptions,
  ): Promise<AnalysisResult> {
    const startedAt = Date.now();
    const sdk = await this.moduleLoader(this.env);
    const modelConfig = resolveOpenCodeModelConfig(this.env, this.selection);
    const prep = await this.prepareAnalysis(query, sessionId, traceId, options);
    const bridge = await startOpenCodeMcpBridge(
      prep.toolDefinitions,
      update => this.emitUpdate(update),
    );
    const projectDir = this.env[OPENCODE_PROJECT_DIR_ENV]?.trim()
      || createTempDirectory('smartperfetto-opencode-project-');
    const homeDir = createTempDirectory('smartperfetto-opencode-home-');
    const configDir = createTempDirectory('smartperfetto-opencode-config-');
    const port = numericEnv(this.env[OPENCODE_SERVER_PORT_ENV]);
    const timeout = numericEnv(this.env[OPENCODE_SERVER_TIMEOUT_MS_ENV]) ?? DEFAULT_SERVER_TIMEOUT_MS;
    const promptTimeout = numericEnv(this.env[OPENCODE_PROMPT_TIMEOUT_MS_ENV]) ?? DEFAULT_PROMPT_TIMEOUT_MS;

    const previousHome = process.env.HOME;
    const previousConfigDir = process.env.OPENCODE_CONFIG_DIR;
    let promptResponse: unknown;
    let messagesResponse: unknown;
    try {
      process.env.HOME = homeDir;
      process.env.OPENCODE_CONFIG_DIR = configDir;
      const opencode = await sdk.createOpencode({
        hostname: '127.0.0.1',
        ...(port ? { port } : {}),
        timeout,
        config: createOpenCodeHardenedConfig(
          Array.from(prep.allowedToolNames),
          this.env,
          bridge,
          modelConfig,
        ),
      });
      this.currentServer = opencode.server;
      const created = unwrapSdkData(await opencode.client.session.create({
        body: { title: `SmartPerfetto ${sessionId}` },
      }), 'OpenCode session create');
      this.currentSessionId = created.id;
      this.emitUpdate({
        type: 'progress',
        content: {
          module: 'opencode',
          runtime: this.selection.kind,
          mode: prep.quickMode ? 'fast' : 'full',
          toolCount: prep.toolDefinitions.length,
          message: 'OpenCode SmartPerfetto analysis started',
          source: this.selection.source,
        },
        timestamp: Date.now(),
      });
      const promptResult = await runOpenCodePrompt(opencode, {
        path: { id: created.id },
        query: { directory: projectDir },
        body: {
          model: modelConfig.model,
          agent: 'smartperfetto',
          system: prep.systemPrompt,
          tools: createOpenCodeToolAllowlist(createOpenCodeMcpToolNames(Array.from(prep.allowedToolNames))),
          parts: [{ type: 'text', text: prep.prompt }],
        },
      }, {
        sessionId: created.id,
        projectDir,
        timeoutMs: promptTimeout,
      });
      promptResponse = promptResult.promptResponse;
      messagesResponse = promptResult.messagesResponse;
    } finally {
      process.env.HOME = previousHome;
      if (previousConfigDir === undefined) delete process.env.OPENCODE_CONFIG_DIR;
      else process.env.OPENCODE_CONFIG_DIR = previousConfigDir;
      this.closeServer();
      await bridge.close().catch(() => undefined);
    }

    let conclusion = extractOpenCodeAssistantText(messagesResponse)
      || extractOpenCodeAssistantText(promptResponse)
      || 'OpenCode runtime completed without assistant text.';
    if (options.codeAwareMode && options.codeAwareMode !== 'off') {
      conclusion = sanitizeCodeAwareText(sessionId, conclusion);
    }

    const planStatus = getOpenCodePlanCompletionStatus(prep.analysisPlan.current);
    let partial = false;
    let terminationReason: AnalysisResult['terminationReason'];
    let terminationMessage: string | undefined;
    if (!prep.quickMode && !planStatus.complete) {
      partial = true;
      terminationReason = 'plan_incomplete';
      terminationMessage = formatIncompletePlanMessage(
        planStatus,
        prep.analysisRunSpec.outputLanguage,
      );
    }

    const findings = extractFindingsFromText(conclusion);
    const result: AnalysisResult = {
      sessionId,
      success: true,
      findings,
      hypotheses: prep.hypotheses.map(toProtocolHypothesis),
      conclusion,
      confidence: estimateConfidence(findings, partial),
      rounds: 1,
      totalDurationMs: Date.now() - startedAt,
      partial: partial || undefined,
      terminationReason,
      terminationMessage,
    };

    const gateIssue = applyFinalResultQualityGate({ result, query, sceneType: prep.sceneType });
    if (gateIssue && !result.partial) {
      result.partial = true;
      result.terminationReason = result.terminationReason ?? 'plan_incomplete';
      result.terminationMessage = gateIssue.message;
      result.confidence = estimateConfidence(result.findings, true);
      this.emitUpdate({
        type: 'degraded',
        content: {
          module: 'openCodeRuntime',
          fallback: gateIssue.code,
          message: gateIssue.message,
          partial: true,
        },
        timestamp: Date.now(),
      });
    }

    prep.sessionContext.addTurn(
      query,
      {
        primaryGoal: query,
        aspects: [],
        expectedOutputType: 'diagnosis',
        complexity: prep.quickMode ? 'simple' : 'complex',
        followUpType: prep.previousTurns.length > 0 ? 'extend' : 'initial',
      },
      {
        agentId: 'opencode',
        success: result.success,
        findings: result.findings,
        confidence: result.confidence,
        message: result.conclusion,
        partial: result.partial,
        terminationReason: result.terminationReason,
        terminationMessage: result.terminationMessage,
      },
      result.findings,
    );

    return result;
  }

  private async prepareAnalysis(
    query: string,
    sessionId: string,
    traceId: string,
    options: AnalysisOptions,
  ): Promise<OpenCodeAnalysisPreparation> {
    const outputLanguage = parseOutputLanguage(this.env.SMARTPERFETTO_OUTPUT_LANGUAGE);
    const sceneType = classifyScene(query);
    const quickMode = options.analysisMode === 'fast';
    const focusResult = await detectFocusApps(this.input.traceProcessorService, traceId);
    const effectivePackageName = options.packageName || focusResult.primaryApp;
    const analysisRunSpec = createAnalysisRunSpec({
      query,
      sessionId,
      traceId,
      options,
      runtimeSelection: this.selection,
      engineCapabilities: getOpenCodeEngineCapabilities(this.selection.kind),
      sceneType,
      outputLanguage,
    });

    await ensureSkillRegistryInitialized();
    const skillExecutor = createSkillExecutor(this.input.traceProcessorService);
    skillExecutor.registerSkills(skillRegistry.getAllSkills());
    skillExecutor.setFragmentRegistry(skillRegistry.getFragmentCache());

    let architecture = this.architectureCache.get(traceId);
    if (!architecture) {
      try {
        architecture = await createArchitectureDetector().detect({
          traceId,
          traceProcessorService: this.input.traceProcessorService,
          packageName: effectivePackageName,
        });
        if (architecture) this.architectureCache.set(traceId, architecture);
      } catch (err) {
        console.warn('[OpenCodeRuntime] Architecture detection failed:', (err as Error).message);
      }
    }
    if (architecture) {
      this.emitUpdate({
        type: 'architecture_detected',
        content: { architecture },
        timestamp: Date.now(),
      });
    }

    let traceCompleteness: Awaited<ReturnType<typeof probeTraceCompleteness>> | undefined;
    try {
      traceCompleteness = await probeTraceCompleteness(
        this.input.traceProcessorService,
        traceId,
        architecture?.type,
      );
    } catch (err) {
      console.warn('[OpenCodeRuntime] Trace completeness probe failed:', (err as Error).message);
    }

    const sessionContext = sessionContextManager.getOrCreate(sessionId, traceId);
    const previousTurns = sessionContext.getAllTurns?.() || [];
    const previousFindings = previousTurns
      .slice(-3)
      .flatMap((turn: any) => Array.isArray(turn?.findings) ? turn.findings : []);
    const conversationSummary = previousTurns.length > 0
      ? sessionContext.generatePromptContext(2000)
      : undefined;
    const entityContext = buildEntityContext(sessionContext.getEntityStore());

    if (!this.artifactStores.has(sessionId)) {
      this.artifactStores.set(sessionId, new ArtifactStore());
    }
    const artifactStore = this.artifactStores.get(sessionId)!;

    let notes = this.sessionNotes.get(sessionId);
    if (!notes) {
      notes = [];
      this.sessionNotes.set(sessionId, notes);
    }
    if (!this.sessionPlans.has(sessionId)) {
      this.sessionPlans.set(sessionId, { current: null, history: [] });
    }
    const analysisPlan = this.sessionPlans.get(sessionId)!;
    if (analysisPlan.current) {
      analysisPlan.history.push(analysisPlan.current);
      if (analysisPlan.history.length > 3) analysisPlan.history.shift();
    }
    const previousPlan = analysisPlan.current ?? undefined;
    analysisPlan.current = null;

    if (!this.sessionHypotheses.has(sessionId)) this.sessionHypotheses.set(sessionId, []);
    const hypotheses = this.sessionHypotheses.get(sessionId)!;
    hypotheses.splice(0);
    if (!this.sessionUncertaintyFlags.has(sessionId)) this.sessionUncertaintyFlags.set(sessionId, []);
    const uncertaintyFlags = this.sessionUncertaintyFlags.get(sessionId)!;
    uncertaintyFlags.splice(0);

    const recentSqlErrors = loadLearnedSqlFixPairs(5, analysisRunSpec.scopes.knowledge);
    const skillNotesBudget = createRuntimeSkillNotesBudget(quickMode);
    const { toolDefinitions } = createClaudeMcpServer({
      sessionId,
      traceId,
      traceProcessorService: this.input.traceProcessorService,
      skillExecutor,
      packageName: effectivePackageName,
      emitUpdate: update => this.emitUpdate(update),
      onSkillResult: (result) => {
        captureSkillDisplayEntities(result.displayResults, sessionContext.getEntityStore(), 'opencode');
      },
      analysisNotes: notes,
      artifactStore,
      cachedArchitecture: architecture,
      recentSqlErrors,
      analysisPlan: quickMode ? undefined : analysisPlan,
      watchdogWarning: { current: null },
      hypotheses,
      sceneType,
      uncertaintyFlags,
      lightweight: quickMode,
      skillNotesBudget,
      outputLanguage,
      knowledgeScope: analysisRunSpec.scopes.knowledge,
      codeAwareMode: options.codeAwareMode,
      codebaseIds: options.codebaseIds,
      referenceTraceId: options.referenceTraceId,
    });
    const allowedToolNames = new Set(toolDefinitions.map(definition => definition.name));

    let prompt = query;
    if (analysisRunSpec.traceContext.promptSection) {
      prompt = `${analysisRunSpec.traceContext.promptSection}\n\n${prompt}`;
    }

    if (quickMode) {
      return {
        systemPrompt: buildQuickSystemPrompt({
          architecture,
          packageName: effectivePackageName,
          focusApps: focusResult.apps.length > 0 ? focusResult.apps : undefined,
          focusMethod: focusResult.method,
          selectionContext: options.selectionContext,
          outputLanguage,
        }),
        prompt,
        toolDefinitions,
        allowedToolNames,
        quickMode,
        sceneType,
        packageName: effectivePackageName,
        architecture,
        sessionContext,
        previousTurns,
        analysisPlan,
        notes,
        hypotheses,
        uncertaintyFlags,
        analysisRunSpec,
      };
    }

    let knowledgeBaseContext: string | undefined;
    try {
      const kb = await getExtendedKnowledgeBase();
      knowledgeBaseContext = kb.getContextForAI(query, 8);
    } catch {
      // Non-fatal. OpenCode can still use lookup_sql_schema/knowledge tools.
    }

    const traceFeatures = extractTraceFeatures({
      architectureType: architecture?.type,
      sceneType,
      packageName: effectivePackageName,
    });
    const traceInfo = this.input.traceProcessorService.getTrace(traceId);
    const analysisContext: ClaudeAnalysisContext = {
      query,
      architecture,
      packageName: effectivePackageName,
      focusApps: focusResult.apps.length > 0 ? focusResult.apps : undefined,
      focusMethod: focusResult.method,
      previousFindings,
      conversationSummary,
      knowledgeBaseContext,
      entityContext,
      sceneType,
      analysisNotes: notes.length > 0 ? notes : undefined,
      sqlErrorFixPairs: recentSqlErrors
        .filter((entry: any) => entry.fixedSql)
        .slice(-3)
        .map((entry: any) => ({
          errorSql: entry.errorSql,
          errorMessage: entry.errorMessage,
          fixedSql: entry.fixedSql,
        })),
      patternContext: buildPatternContextSection(
        traceFeatures,
        knowledgeScopeFromAnalysisOptions(options),
      ),
      negativePatternContext: buildNegativePatternSection(
        traceFeatures,
        knowledgeScopeFromAnalysisOptions(options),
      ),
      previousPlan,
      planHistory: analysisPlan.history.length > 0 ? analysisPlan.history : undefined,
      selectionContext: options.selectionContext,
      traceCompleteness,
      traceOs: traceInfo?.traceOs,
      traceFormat: traceInfo?.traceFormat,
      outputLanguage,
      codeAwareMode: options.codeAwareMode,
      codebaseIds: options.codebaseIds,
    };
    const sharedSystemPrompt = buildSystemPrompt(analysisContext);
    const extraSystemPrompt = normalizeOptionalString(
      getProviderForSelection(this.selection)?.connection.openCodeSystemPrompt,
    ) || normalizeOptionalString(this.env[OPENCODE_SYSTEM_PROMPT_ENV]);
    return {
      systemPrompt: extraSystemPrompt
        ? `${sharedSystemPrompt}\n\n${extraSystemPrompt}`
        : sharedSystemPrompt,
      prompt,
      toolDefinitions,
      allowedToolNames,
      quickMode,
      sceneType,
      packageName: effectivePackageName,
      architecture,
      sessionContext,
      previousTurns,
      analysisPlan,
      notes,
      hypotheses,
      uncertaintyFlags,
      analysisRunSpec,
    };
  }

  reset(): void {
    this.currentSessionId = undefined;
    this.closeServer();
    this.removeAllListeners();
  }

  async cleanupSession(_sessionId: string): Promise<void> {
    this.closeServer();
  }

  restoreArchitectureCache(traceId: string, architecture: ArchitectureInfo): void {
    this.architectureCache.set(traceId, architecture);
  }

  getCachedArchitecture(traceId: string): ArchitectureInfo | undefined {
    return this.architectureCache.get(traceId);
  }

  getSessionNotes(sessionId: string): AnalysisNote[] {
    return this.sessionNotes.get(sessionId) || [];
  }

  getSessionPlan(sessionId: string): AnalysisPlanV3 | null {
    return this.sessionPlans.get(sessionId)?.current ?? null;
  }

  getSessionUncertaintyFlags(sessionId: string): UncertaintyFlag[] {
    return this.sessionUncertaintyFlags.get(sessionId) || [];
  }

  takeSnapshot(
    sessionId: string,
    traceId: string,
    sessionFields: SessionFieldsForSnapshot,
  ): SessionStateSnapshot {
    const planState = this.sessionPlans.get(sessionId);
    const artifactStore = this.artifactStores.get(sessionId);
    return {
      version: 1,
      snapshotTimestamp: Date.now(),
      sessionId,
      traceId,
      ...sessionFields,
      analysisNotes: this.sessionNotes.get(sessionId) || [],
      analysisPlan: planState?.current ?? null,
      planHistory: planState?.history ?? [],
      uncertaintyFlags: this.sessionUncertaintyFlags.get(sessionId) || [],
      claudeHypotheses: this.sessionHypotheses.get(sessionId) || undefined,
      architecture: this.architectureCache.get(traceId),
      engineState: createOpenCodeSnapshotEngineState({
        providerId: sessionFields.agentRuntimeProviderId,
        providerSnapshotHash: sessionFields.agentRuntimeProviderSnapshotHash,
        opaque: {
          openCodeSessionId: this.currentSessionId,
        },
      }),
      agentRuntimeKind: OPENCODE_RUNTIME_KIND,
      agentRuntimeProviderId: sessionFields.agentRuntimeProviderId,
      agentRuntimeProviderSnapshotHash: sessionFields.agentRuntimeProviderSnapshotHash,
      artifacts: artifactStore?.serialize(),
    };
  }

  restoreFromSnapshot(sessionId: string, traceId: string, snapshot: SessionStateSnapshot): void {
    if (snapshot.analysisNotes.length > 0) {
      this.sessionNotes.set(sessionId, [...snapshot.analysisNotes]);
    }
    if (snapshot.analysisPlan || snapshot.planHistory.length > 0) {
      this.sessionPlans.set(sessionId, {
        current: snapshot.analysisPlan,
        history: snapshot.planHistory,
      });
    }
    if (snapshot.claudeHypotheses && snapshot.claudeHypotheses.length > 0) {
      this.sessionHypotheses.set(sessionId, [...snapshot.claudeHypotheses]);
    }
    if (snapshot.uncertaintyFlags.length > 0) {
      this.sessionUncertaintyFlags.set(sessionId, [...snapshot.uncertaintyFlags]);
    }
    if (snapshot.architecture) {
      this.architectureCache.set(traceId, snapshot.architecture);
    }
    if (snapshot.artifacts) {
      try {
        this.artifactStores.set(sessionId, ArtifactStore.fromSnapshot(snapshot.artifacts));
      } catch {
        // Ignore malformed legacy artifact snapshots.
      }
    }
  }

  private closeServer(): void {
    const server = this.currentServer;
    this.currentServer = undefined;
    server?.close();
  }

  private emitUpdate(update: StreamingUpdate): void {
    this.emit('update', update);
  }
}

export function createOpenCodeRuntimeDefinition(
  kind: OpenCodeRuntimeKind = EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
): RuntimeEngineDefinition {
  return {
    kind,
    capabilities: getOpenCodeEngineCapabilities(kind),
    createOrchestrator: input => new OpenCodeRuntime(input),
  };
}
