// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { EventEmitter } from 'events';
import { pathToFileURL } from 'url';
import type { IOrchestrator } from '../agent/core/orchestratorTypes';
import type { AnalysisOptions, AnalysisResult } from '../agent/core/orchestratorTypes';
import type { Finding, StreamingUpdate } from '../agent/types';
import type { Hypothesis as ProtocolHypothesis } from '../agent/types/agentProtocol';
import { createArchitectureDetector } from '../agent/detectors/architectureDetector';
import type { ArchitectureInfo } from '../agent/detectors/types';
import { sessionContextManager } from '../agent/context/enhancedSessionContext';
import { createSkillExecutor } from '../services/skillEngine/skillExecutor';
import { ensureSkillRegistryInitialized, skillRegistry } from '../services/skillEngine/skillLoader';
import type { TraceProcessorService } from '../services/traceProcessorService';
import { getExtendedKnowledgeBase } from '../services/sqlKnowledgeBase';
import { sanitizeCodeAwareText } from '../services/security/codeAwareOutputRegistry';
import {
  createPiAgentCoreSnapshotEngineState,
  type SessionFieldsForSnapshot,
  type SessionStateSnapshot,
} from '../agentv3/sessionStateSnapshot';
import {
  createClaudeMcpServer,
  loadLearnedSqlFixPairs,
  MIN_PHASE_SUMMARY_CHARS,
} from '../agentv3/claudeMcpServer';
import {
  buildQuickSystemPrompt,
  buildSystemPrompt,
} from '../agentv3/claudeSystemPrompt';
import { extractFindingsFromText } from '../agentv3/claudeFindingExtractor';
import { detectFocusApps } from '../agentv3/focusAppDetector';
import { ArtifactStore } from '../agentv3/artifactStore';
import {
  buildNegativePatternSection,
  buildPatternContextSection,
  extractTraceFeatures,
} from '../agentv3/analysisPatternMemory';
import { probeTraceCompleteness } from '../agentv3/traceCompletenessProber';
import { classifyScene, type SceneType } from '../agentv3/sceneClassifier';
import { localize, parseOutputLanguage, type OutputLanguage } from '../agentv3/outputLanguage';
import type {
  AnalysisNote,
  AnalysisPlanV3,
  ClaudeAnalysisContext,
  Hypothesis,
  PlanPhase,
  UncertaintyFlag,
} from '../agentv3/types';
import {
  applyFinalResultQualityGate,
  hasDeliverableFinalReportHeading,
  looksLikeProcessNarrationConclusion,
} from '../services/finalResultQualityGate';
import type { ClaimVerificationResult } from '../types/claimVerification';
import type { RuntimeToolResult, SharedToolSpec } from './runtimeToolSpec';
import {
  createJsonSchemaFromZodRawShape,
  normalizeRuntimeToolArgs,
} from './runtimeToolSpec';
import type { RuntimeSelection } from './runtimeSelection';
import type { RuntimeEngineDefinition, RuntimeFactoryInput } from './runtimeRegistry';
import type { EngineCapabilities } from './runtimeCapabilities';
import { createAnalysisRunSpec, type AnalysisRunSpec } from './analysisRunSpec';
import {
  EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
  type ExperimentalOpenCodeRuntimeKind,
} from './openCodeRuntime';
import {
  buildEntityContext,
  captureSkillDisplayEntities,
  createRuntimeSkillNotesBudget,
  knowledgeScopeFromAnalysisOptions,
} from './runtimeCommon';

export const EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND = 'experimental-pi-agent-core' as const;
export const PI_AGENT_CORE_RUNTIME_KIND = 'pi-agent-core' as const;
export type ExperimentalPiAgentCoreRuntimeKind = typeof EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND;
export type PublicPiAgentCoreRuntimeKind = typeof PI_AGENT_CORE_RUNTIME_KIND;
export type PiAgentCoreRuntimeKind = ExperimentalPiAgentCoreRuntimeKind | PublicPiAgentCoreRuntimeKind;

export const EXPERIMENTAL_AGENT_RUNTIME_ENABLED_ENV = 'SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME';
export const EXPERIMENTAL_AGENT_RUNTIME_ENV = 'SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME';
export const PI_AGENT_CORE_MODULE_PATH_ENV = 'SMARTPERFETTO_PI_AGENT_CORE_MODULE_PATH';
export const PI_AGENT_CORE_FAKE_STREAM_ENV = 'SMARTPERFETTO_PI_AGENT_CORE_FAKE_STREAM';
export const PI_AGENT_CORE_MODEL_JSON_ENV = 'SMARTPERFETTO_PI_AGENT_CORE_MODEL_JSON';
export const PI_AGENT_CORE_SYSTEM_PROMPT_ENV = 'SMARTPERFETTO_PI_AGENT_CORE_SYSTEM_PROMPT';

const PI_AGENT_CORE_PREVIEW_CLAIM_VERIFICATION: ClaimVerificationResult = {
  schemaVersion: 'claim_verifier@1',
  status: 'not_checked',
  policy: 'record_only',
  notCheckedReason: 'pi-agent-core public preview smoke is capability-limited and does not produce evidence-bound SmartPerfetto claims yet',
  passed: false,
  checkedClaimCount: 0,
  unsupportedClaimCount: 0,
  claimResults: [],
  issues: [],
};

export type ExperimentalAgentRuntimeKind =
  | ExperimentalPiAgentCoreRuntimeKind
  | ExperimentalOpenCodeRuntimeKind;

type EnvLike = Record<string, string | undefined>;

interface PiAgentCoreAgentState {
  messages?: unknown[];
  tools?: unknown[];
  errorMessage?: string;
}

interface PiAgentCoreAgent {
  state: PiAgentCoreAgentState;
  subscribe(listener: (event: PiAgentCoreEvent, signal?: AbortSignal) => Promise<void> | void): () => void;
  prompt(input: string): Promise<void>;
  abort(): void;
  reset(): void;
}

interface PiAgentCoreModule {
  Agent: new (options?: Record<string, unknown>) => PiAgentCoreAgent;
}

const importEsmModule = new Function(
  'specifier',
  'return import(specifier);',
) as (specifier: string) => Promise<unknown>;

export type PiAgentCoreModuleLoader = (
  env: EnvLike,
) => Promise<PiAgentCoreModule>;

export type PiAgentCoreEvent =
  | { type: 'agent_start' }
  | { type: 'agent_end'; messages?: unknown[] }
  | { type: 'turn_start' }
  | { type: 'turn_end'; message?: unknown; toolResults?: unknown[] }
  | {
      type: 'message_update';
      assistantMessageEvent?: {
        type?: string;
        text?: string;
        delta?: string;
        partial?: unknown;
      };
      message?: unknown;
    }
  | { type: 'message_start'; message?: unknown }
  | { type: 'message_end'; message?: unknown }
  | { type: 'tool_execution_start'; toolName?: string; toolCallId?: string; args?: unknown }
  | { type: 'tool_execution_update'; toolName?: string; toolCallId?: string; args?: unknown; update?: unknown; partialResult?: unknown }
  | { type: 'tool_execution_end'; toolName?: string; toolCallId?: string; result?: unknown; isError?: boolean }
  | { type: string; [key: string]: unknown };

export interface PiAgentCoreTool {
  name: string;
  label: string;
  description: string;
  parameters: Record<string, unknown>;
  executionMode: 'sequential';
  execute(
    toolCallId: string,
    params: unknown,
    signal?: AbortSignal,
    onUpdate?: (update: unknown) => void,
  ): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    details?: unknown;
    isError?: boolean;
    terminate?: boolean;
  }>;
}

export interface PiAgentCoreRuntimeOptions {
  env?: EnvLike;
  moduleLoader?: PiAgentCoreModuleLoader;
}

interface PiAgentCoreModelConfig {
  model: Record<string, unknown>;
  apiKey?: string;
  apiKeyEnv?: string;
  maxRetryDelayMs?: number;
  transport?: string;
  thinkingLevel?: string;
  thinkingBudgets?: Record<string, number>;
}

interface PiAnalysisPreparation {
  systemPrompt: string;
  prompt: string;
  tools: PiAgentCoreTool[];
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

function truthyEnv(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes';
}

export function resolveExperimentalAgentRuntimeSelection(
  env: EnvLike = process.env,
): RuntimeSelection<ExperimentalAgentRuntimeKind> | undefined {
  const requestedRuntime = env[EXPERIMENTAL_AGENT_RUNTIME_ENV]?.trim();
  const enabled = truthyEnv(env[EXPERIMENTAL_AGENT_RUNTIME_ENABLED_ENV]);

  if (!requestedRuntime) return undefined;
  if (!enabled) {
    throw new Error(
      `${EXPERIMENTAL_AGENT_RUNTIME_ENV} requires ${EXPERIMENTAL_AGENT_RUNTIME_ENABLED_ENV}=1`,
    );
  }
  const supportedRuntimes = [
    EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND,
    EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
  ] as const;
  if (!supportedRuntimes.includes(requestedRuntime as ExperimentalAgentRuntimeKind)) {
    throw new Error(
      `Unsupported ${EXPERIMENTAL_AGENT_RUNTIME_ENV}="${requestedRuntime}". ` +
      `Use "${EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND}" or "${EXPERIMENTAL_OPENCODE_RUNTIME_KIND}".`,
    );
  }
  return { kind: requestedRuntime as ExperimentalAgentRuntimeKind, source: 'env' };
}

export function getPiAgentCoreEngineCapabilities(
  kind: PiAgentCoreRuntimeKind = EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND,
): EngineCapabilities {
  const publicRuntime = kind === PI_AGENT_CORE_RUNTIME_KIND;
  return {
    kind,
    displayName: publicRuntime ? 'Pi Agent Core' : 'Experimental Pi Agent Core',
    production: publicRuntime,
    publicRuntime,
    nativeLoop: 'pi-agent-core',
    toolTransport: 'pi-agent-core-tools',
    toolSchemaDialect: 'typebox',
    eventModel: 'pi-agent-core',
    abortMechanism: 'agent-abort',
    toolExecution: {
      defaultMode: 'sequential',
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

export function getPiAgentCoreRuntimeDiagnostics(
  env: EnvLike = process.env,
  runtime: PiAgentCoreRuntimeKind = PI_AGENT_CORE_RUNTIME_KIND,
) {
  const modelJson = env[PI_AGENT_CORE_MODEL_JSON_ENV]?.trim();
  const fakeStream = truthyEnv(env[PI_AGENT_CORE_FAKE_STREAM_ENV]);
  const modulePath = env[PI_AGENT_CORE_MODULE_PATH_ENV]?.trim();
  return {
    configured: Boolean(modelJson || fakeStream),
    runtime,
    experimental: runtime === EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND,
    package: '@earendil-works/pi-agent-core',
    modelConfigured: Boolean(modelJson),
    fakeStream,
    modulePath: modulePath || undefined,
  };
}

export async function loadPiAgentCoreModule(
  env: EnvLike = process.env,
): Promise<PiAgentCoreModule> {
  const explicitModulePath = env[PI_AGENT_CORE_MODULE_PATH_ENV]?.trim();
  if (explicitModulePath) {
    return importEsmModule(pathToFileURL(explicitModulePath).href) as Promise<PiAgentCoreModule>;
  }

  const packageName = '@earendil-works/pi-agent-core';
  return importEsmModule(packageName) as Promise<PiAgentCoreModule>;
}

function extractAssistantText(message: unknown): string {
  const content = (message as { content?: unknown[] } | undefined)?.content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => {
    const block = part as { type?: string; text?: string; thinking?: string };
    if (block.type === 'text' && typeof block.text === 'string') return block.text;
    if (block.type === 'thinking' && typeof block.thinking === 'string') return block.thinking;
    return '';
  }).filter(Boolean).join('\n');
}

function latestAssistantText(messages: unknown[] | undefined): string {
  const reversed = [...(messages ?? [])].reverse();
  for (const message of reversed) {
    if ((message as { role?: string }).role !== 'assistant') continue;
    const text = extractAssistantText(message);
    if (text) return text;
  }
  return '';
}

function looksLikeFinalReport(text: string): boolean {
  return (
    hasDeliverableFinalReportHeading(text) ||
    /#\s+.+分析报告/.test(text) ||
    /##\s*(1[.、)]?\s*)?概览/.test(text) ||
    /##\s*(关键发现|根因分析|优化建议|证据索引)/.test(text) ||
    /\[Evidence:/.test(text)
  );
}

function findDeliverableReportHeadingIndex(text: string): number {
  const match = text.match(
    /(?:^|\n)\s{0,3}(?:#{1,3}\s*)?(?:(?:[^\n#]{0,40})?分析报告|综合结论|关键结论|最终结论|最终报告|根因分析|Final Conclusion|Final Report|Analysis Report|Root Cause)(?=\s|[：:。.!！?\n]|$)/i,
  );
  return match?.index ?? -1;
}

export function sanitizePiAgentCoreConclusionText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const headingIndex = findDeliverableReportHeadingIndex(trimmed);
  if (headingIndex <= 0) return trimmed;

  const reportText = trimmed.slice(headingIndex).trim();
  if (!hasDeliverableFinalReportHeading(reportText)) return trimmed;

  const prefix = trimmed.slice(0, headingIndex).trim();
  const prefixLooksProcessNarration =
    looksLikeProcessNarrationConclusion(prefix) ||
    /(?:I have all (?:the )?necessary|now let me|let me write|key findings?:|我(?:已|会|将)|现在.{0,40}(?:输出|撰写|生成)|开始撰写|完整结构化报告|update_plan_phase|submit_plan|resolve_hypothesis)/i.test(prefix);

  return prefixLooksProcessNarration ? reportText : trimmed;
}

function selectAssistantConclusion(messages: unknown[] | undefined): string {
  const assistantTexts = (messages ?? [])
    .filter(message => (message as { role?: string }).role === 'assistant')
    .map(extractAssistantText)
    .map(text => text.trim())
    .filter(Boolean);
  if (assistantTexts.length === 0) return '';
  const reportTexts = assistantTexts.filter(looksLikeFinalReport);
  const candidates = reportTexts.length > 0 ? reportTexts : assistantTexts;
  return candidates.reduce((best, text) => (
    text.length > best.length ? text : best
  ), candidates[0]);
}

function latestAssistantMessage(messages: unknown[] | undefined): Record<string, unknown> | undefined {
  const reversed = [...(messages ?? [])].reverse();
  return reversed.find(message => (message as { role?: string }).role === 'assistant') as
    | Record<string, unknown>
    | undefined;
}

function hasAdequateClosedPhaseSummary(phase: PlanPhase): boolean {
  if (phase.status !== 'completed' && phase.status !== 'skipped') return false;
  return typeof phase.summary === 'string' && phase.summary.trim().length >= MIN_PHASE_SUMMARY_CHARS;
}

export function getPiAgentCorePlanCompletionStatus(plan: AnalysisPlanV3 | null | undefined): {
  complete: boolean;
  hasPlan: boolean;
  pendingPhases: PlanPhase[];
} {
  if (!plan || !Array.isArray(plan.phases) || plan.phases.length === 0) {
    return { complete: false, hasPlan: false, pendingPhases: [] };
  }
  const pendingPhases = plan.phases.filter(phase => !hasAdequateClosedPhaseSummary(phase));
  return {
    complete: pendingPhases.length === 0,
    hasPlan: true,
    pendingPhases,
  };
}

function isFinalReportPhase(phase: PlanPhase): boolean {
  return /(?:综合结论|最终结论|结论|报告|final report|final conclusion|summary|recommendation)/i
    .test(`${phase.name} ${phase.goal}`);
}

export function completePiAgentCoreFinalReportPhaseIfDelivered(
  plan: AnalysisPlanV3 | null | undefined,
  conclusion: string,
  outputLanguage: OutputLanguage,
  now: () => number = Date.now,
): PlanPhase | undefined {
  if (!plan?.phases?.length) return undefined;
  const sanitizedConclusion = sanitizePiAgentCoreConclusionText(conclusion);
  if (
    !hasDeliverableFinalReportHeading(sanitizedConclusion) ||
    !looksLikeFinalReport(sanitizedConclusion)
  ) {
    return undefined;
  }

  const status = getPiAgentCorePlanCompletionStatus(plan);
  if (status.complete || status.pendingPhases.length !== 1) return undefined;

  const [phase] = status.pendingPhases;
  if (!phase || !isFinalReportPhase(phase)) return undefined;

  phase.status = 'completed';
  phase.completedAt = now();
  phase.summary = localize(
    outputLanguage,
    '最终报告已由 Pi Agent Core 直接交付；该最终结论阶段按完整报告自动闭合。',
    'The final report was delivered by Pi Agent Core; the final-report phase was auto-closed from the complete report.',
  );
  return phase;
}

function formatIncompletePlanMessage(
  planStatus: ReturnType<typeof getPiAgentCorePlanCompletionStatus>,
  outputLanguage: OutputLanguage,
): string {
  if (!planStatus.hasPlan) {
    return localize(
      outputLanguage,
      'Pi Agent Core 分析没有提交 plan，结果只能作为不完整分析使用。',
      'Pi Agent Core analysis did not submit a plan; treat the result as incomplete.',
    );
  }
  const pending = planStatus.pendingPhases
    .map(phase => phase.name || phase.id)
    .filter(Boolean)
    .join(', ');
  return localize(
    outputLanguage,
    `Pi Agent Core 分析 plan 尚未完成。未完成阶段：${pending || 'unknown'}`,
    `Pi Agent Core analysis plan is incomplete. Pending phases: ${pending || 'unknown'}`,
  );
}

function estimateConfidence(findings: Finding[], partial: boolean): number {
  if (findings.length === 0) return partial ? 0.25 : 0.35;
  const avg = findings.reduce((sum, finding) => sum + (finding.confidence ?? 0.5), 0) / findings.length;
  const confidence = Math.min(1, Math.max(0, avg));
  return partial ? Math.min(confidence, 0.55) : confidence;
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
          source: 'pi-agent-core',
          strength: 0.8,
        }]
      : [],
    contradictingEvidence: hypothesis.evidence && hypothesis.status === 'rejected'
      ? [{
          id: `${hypothesis.id}-ev`,
          type: 'observation',
          description: hypothesis.evidence,
          source: 'pi-agent-core',
          strength: 0.8,
        }]
      : [],
    proposedBy: 'pi-agent-core',
    relevantAgents: ['pi-agent-core'],
    createdAt: hypothesis.formedAt,
    updatedAt: hypothesis.resolvedAt || hypothesis.formedAt,
  };
}

function summarizePiToolResult(result: unknown): string {
  const content = (result as { content?: Array<{ text?: unknown }> } | undefined)?.content;
  const text = Array.isArray(content)
    ? content.map(block => typeof block.text === 'string' ? block.text : '').filter(Boolean).join('\n')
    : typeof result === 'string'
      ? result
      : JSON.stringify(result);
  if (!text) return '';
  return text.length > 1200 ? `${text.slice(0, 1200)}...` : text;
}

export function projectPiAgentCoreEventToStreamingUpdate(
  event: PiAgentCoreEvent,
  timestamp = Date.now(),
): StreamingUpdate | undefined {
  switch (event.type) {
    case 'agent_start':
      return { type: 'progress', content: 'Pi agent-core run started', timestamp };
    case 'turn_start':
      return { type: 'progress', content: 'Pi agent-core turn started', timestamp };
    case 'message_update':
      // Pi agent-core providers can stream cumulative assistant partials,
      // tool-call JSON, SQL args, and reasoning deltas through message_update.
      // SmartPerfetto keeps the final report route-owned, so Pi text deltas are
      // read from agent state after completion instead of emitted live.
      return undefined;
    case 'tool_execution_start':
      return {
        type: 'agent_task_dispatched',
        content: {
          taskId: event.toolCallId || 'unknown',
          toolName: event.toolName || 'unknown',
          args: event.args,
          message: `Pi agent-core dispatched ${event.toolName || 'unknown'}`,
        },
        timestamp,
      };
    case 'tool_execution_update':
      return {
        type: 'progress',
        content: {
          module: 'pi-agent-core',
          tool: event.toolName,
          toolCallId: event.toolCallId,
          update: event.partialResult ?? event.update,
        },
        timestamp,
      };
    case 'tool_execution_end':
      return event.isError
        ? {
            type: 'error',
            content: {
              module: 'pi-agent-core',
              tool: event.toolName,
              toolCallId: event.toolCallId,
              result: summarizePiToolResult(event.result),
            },
            timestamp,
          }
        : {
            type: 'agent_response',
            content: {
              taskId: event.toolCallId || 'unknown',
              result: summarizePiToolResult(event.result),
            },
            timestamp,
          };
    case 'agent_end':
      return { type: 'progress', content: 'Pi agent-core run ended', timestamp };
    default:
      return undefined;
  }
}

function stringifyPiToolResult(result: RuntimeToolResult): Array<{ type: 'text'; text: string }> {
  const content = (result as { content?: Array<Record<string, unknown>> }).content;
  if (!Array.isArray(content)) {
    return [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }];
  }
  return content.map((block) => ({
    type: 'text' as const,
    text: typeof block.text === 'string' ? block.text : JSON.stringify(block),
  }));
}

export function createPiAgentCoreToolFromSharedSpec(
  spec: SharedToolSpec,
  options: {
    allowedToolNames: ReadonlySet<string>;
    runtimeKind?: PiAgentCoreRuntimeKind;
    extra?: unknown;
  },
): PiAgentCoreTool {
  if (!options.allowedToolNames.has(spec.name)) {
    throw new Error(`Pi agent-core tool is not allowed in this request: ${spec.name}`);
  }

  return {
    name: spec.name,
    label: spec.summary || spec.name,
    description: spec.description,
    parameters: createJsonSchemaFromZodRawShape(spec.inputSchema),
    executionMode: 'sequential',
    execute: async (toolCallId, params, signal, onUpdate) => {
      if (signal?.aborted) {
        return {
          content: [{ type: 'text', text: 'Tool execution aborted before start.' }],
          isError: true,
        };
      }
      onUpdate?.({ type: 'smartperfetto_tool_started', toolCallId, toolName: spec.name });
      const normalizedArgs = normalizeRuntimeToolArgs(params) as Record<string, unknown>;
      const result = await spec.handler(normalizedArgs, {
        runtime: options.runtimeKind ?? PI_AGENT_CORE_RUNTIME_KIND,
        toolCallId,
        signal,
        ...(options.extra && typeof options.extra === 'object' ? options.extra : {}),
      });
      onUpdate?.({ type: 'smartperfetto_tool_finished', toolCallId, toolName: spec.name });
      return {
        content: stringifyPiToolResult(result),
        details: result,
      };
    },
  };
}

function createFakePiStream(finalText: string) {
  return async (model: Record<string, unknown>) => {
    const timestamp = Date.now();
    const finalMessage = {
      role: 'assistant',
      content: [{ type: 'text', text: finalText }],
      api: String(model.api ?? 'smartperfetto-fake'),
      provider: String(model.provider ?? 'smartperfetto'),
      model: String(model.id ?? model.name ?? 'experimental-pi-agent-core-fake'),
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: 'stop',
      timestamp,
    };
    const events = [
      { type: 'start', partial: { ...finalMessage, content: [] } },
      { type: 'text_start', contentIndex: 0, partial: { ...finalMessage, content: [] } },
      { type: 'text_delta', contentIndex: 0, partial: finalMessage, delta: finalText },
      { type: 'text_end', contentIndex: 0, partial: finalMessage, content: finalText },
      { type: 'done', reason: 'stop', message: finalMessage },
    ];
    return {
      async *[Symbol.asyncIterator]() {
        for (const event of events) {
          await new Promise(resolve => setTimeout(resolve, 50));
          yield event;
        }
      },
      result: async () => finalMessage,
    };
  };
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeThinkingBudgets(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const budgets = Object.fromEntries(
    Object.entries(value)
      .map(([key, nested]) => [key, normalizeOptionalNumber(nested)] as const)
      .filter((entry): entry is readonly [string, number] => entry[1] !== undefined),
  );
  return Object.keys(budgets).length > 0 ? budgets : undefined;
}

function resolveProviderEnvApiKey(provider: unknown, env: EnvLike): string | undefined {
  if (typeof provider !== 'string') return undefined;
  const normalized = provider.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const candidates = [
    `${normalized.toUpperCase()}_API_KEY`,
    provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : undefined,
    provider === 'openai' ? 'OPENAI_API_KEY' : undefined,
    provider === 'deepseek' ? 'DEEPSEEK_API_KEY' : undefined,
    provider === 'google' ? 'GOOGLE_API_KEY' : undefined,
    provider === 'openrouter' ? 'OPENROUTER_API_KEY' : undefined,
    provider === 'groq' ? 'GROQ_API_KEY' : undefined,
    provider === 'mistral' ? 'MISTRAL_API_KEY' : undefined,
    provider === 'xai' ? 'XAI_API_KEY' : undefined,
  ].filter((candidate): candidate is string => !!candidate);
  for (const candidate of candidates) {
    const value = env[candidate]?.trim();
    if (value) return value;
  }
  return undefined;
}

function resolvePiAgentCoreModel(env: EnvLike, fakeStream: boolean): PiAgentCoreModelConfig {
  const rawModel = env[PI_AGENT_CORE_MODEL_JSON_ENV];
  if (rawModel) {
    try {
      const parsed = JSON.parse(rawModel);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('model JSON must be an object');
      }
      const {
        apiKey,
        apiKeyEnv,
        maxRetryDelayMs,
        transport,
        thinkingLevel,
        thinkingBudgets,
        ...model
      } = parsed as Record<string, unknown>;
      return {
        model,
        apiKey: normalizeOptionalString(apiKey),
        apiKeyEnv: normalizeOptionalString(apiKeyEnv),
        maxRetryDelayMs: normalizeOptionalNumber(maxRetryDelayMs),
        transport: normalizeOptionalString(transport),
        thinkingLevel: normalizeOptionalString(thinkingLevel),
        thinkingBudgets: normalizeThinkingBudgets(thinkingBudgets),
      };
    } catch (err) {
      throw new Error(`${PI_AGENT_CORE_MODEL_JSON_ENV} must be valid JSON: ${(err as Error).message}`);
    }
  }
  if (fakeStream) {
    return {
      model: {
        id: 'experimental-pi-agent-core-fake',
        name: 'experimental-pi-agent-core-fake',
        api: 'smartperfetto-fake',
        provider: 'smartperfetto',
        baseUrl: '',
        reasoning: false,
        input: [],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 0,
        maxTokens: 0,
      },
    };
  }
  throw new Error(
    `${PI_AGENT_CORE_MODEL_JSON_ENV} is required for the experimental Pi agent-core runtime ` +
    `unless ${PI_AGENT_CORE_FAKE_STREAM_ENV}=1 is used for a local smoke.`,
  );
}

export class PiAgentCoreRuntime extends EventEmitter implements IOrchestrator {
  private readonly env: EnvLike;
  private readonly moduleLoader: PiAgentCoreModuleLoader;
  private activeAgent?: PiAgentCoreAgent;
  private readonly artifactStores = new Map<string, ArtifactStore>();
  private readonly sessionNotes = new Map<string, AnalysisNote[]>();
  private readonly sessionPlans = new Map<string, { current: AnalysisPlanV3 | null; history: AnalysisPlanV3[] }>();
  private readonly sessionHypotheses = new Map<string, Hypothesis[]>();
  private readonly sessionUncertaintyFlags = new Map<string, UncertaintyFlag[]>();
  private readonly architectureCache = new Map<string, ArchitectureInfo>();

  constructor(
    private readonly traceProcessorService: TraceProcessorService,
    private readonly selection: RuntimeSelection<PiAgentCoreRuntimeKind>,
    options: PiAgentCoreRuntimeOptions = {},
  ) {
    super();
    this.env = options.env ?? process.env;
    this.moduleLoader = options.moduleLoader ?? loadPiAgentCoreModule;
  }

  async analyze(
    query: string,
    sessionId: string,
    traceId: string,
    options: AnalysisOptions = {},
  ): Promise<AnalysisResult> {
    const fakeStream = truthyEnv(this.env[PI_AGENT_CORE_FAKE_STREAM_ENV]);
    return fakeStream
      ? this.analyzeFakeStream(query, sessionId, traceId)
      : this.analyzeWithSmartPerfettoTools(query, sessionId, traceId, options);
  }

  private async analyzeFakeStream(
    query: string,
    sessionId: string,
    traceId: string,
  ): Promise<AnalysisResult> {
    const startedAt = Date.now();
    const modelConfig = resolvePiAgentCoreModel(this.env, true);
    const { Agent } = await this.moduleLoader(this.env);
    const systemPrompt = this.env[PI_AGENT_CORE_SYSTEM_PROMPT_ENV] ?? '';
    const streamFn = createFakePiStream(
      this.selection.kind === PI_AGENT_CORE_RUNTIME_KIND
        ? `Pi agent-core smoke completed for query "${query}" on trace ${traceId}.`
        : `Experimental Pi agent-core smoke completed for query "${query}" on trace ${traceId}.`,
    );

    const agent = new Agent({
      initialState: {
        systemPrompt,
        model: modelConfig.model,
        tools: [],
        messages: [],
      },
      streamFn,
      toolExecution: 'sequential',
      beforeToolCall: async (context: unknown) => ({
        block: true,
        reason: `Tool calls are blocked until SmartPerfetto explicitly maps shared tools: ${JSON.stringify(context)}`,
      }),
    });
    this.activeAgent = agent;

    const unsubscribe = agent.subscribe((event) => {
      const update = projectPiAgentCoreEventToStreamingUpdate(event);
      if (update) this.emit('update', update);
    });
    try {
      this.emit('update', {
        type: 'progress',
        content: {
          module: 'pi-agent-core',
          runtime: this.selection.kind,
          message: this.selection.kind === PI_AGENT_CORE_RUNTIME_KIND
            ? 'Pi agent-core runtime selected'
            : 'Hidden experimental Pi agent-core runtime selected',
          source: this.selection.source,
        },
        timestamp: Date.now(),
      });
      await agent.prompt(query);
    } finally {
      unsubscribe();
    }

    const conclusion = sanitizePiAgentCoreConclusionText(latestAssistantText(agent.state.messages) ||
      (this.selection.kind === PI_AGENT_CORE_RUNTIME_KIND
        ? 'Pi agent-core runtime completed without assistant text.'
        : 'Experimental Pi agent-core runtime completed without assistant text.'));
    return {
      sessionId,
      success: true,
      findings: [],
      hypotheses: [],
      conclusion,
      claimSupport: [],
      claimVerificationResult: PI_AGENT_CORE_PREVIEW_CLAIM_VERIFICATION,
      identityResolutions: [],
      confidence: 0.25,
      rounds: 1,
      totalDurationMs: Date.now() - startedAt,
      partial: true,
      terminationReason: 'plan_incomplete',
      terminationMessage: this.selection.kind === PI_AGENT_CORE_RUNTIME_KIND
        ? 'Pi agent-core runtime completed through the capability-limited public preview path.'
        : 'Hidden experimental Pi agent-core runtime smoke path; SmartPerfetto tool/report parity is not public yet.',
    };
  }

  private async analyzeWithSmartPerfettoTools(
    query: string,
    sessionId: string,
    traceId: string,
    options: AnalysisOptions,
  ): Promise<AnalysisResult> {
    const startedAt = Date.now();
    const modelConfig = resolvePiAgentCoreModel(this.env, false);
    const { Agent } = await this.moduleLoader(this.env);
    const prep = await this.prepareAnalysis(query, sessionId, traceId, options);

    const agent = new Agent({
      initialState: {
        systemPrompt: prep.systemPrompt,
        model: modelConfig.model,
        tools: prep.tools,
        messages: [],
        thinkingLevel: modelConfig.thinkingLevel ?? 'off',
      },
      sessionId,
      toolExecution: 'sequential',
      transport: modelConfig.transport ?? 'auto',
      maxRetryDelayMs: modelConfig.maxRetryDelayMs,
      thinkingBudgets: modelConfig.thinkingBudgets,
      getApiKey: (provider: string) => (
        modelConfig.apiKey ||
        (modelConfig.apiKeyEnv ? this.env[modelConfig.apiKeyEnv]?.trim() : undefined) ||
        resolveProviderEnvApiKey(provider, this.env)
      ),
      beforeToolCall: async ({ toolCall }: any) => {
        if (!prep.allowedToolNames.has(toolCall?.name)) {
          return {
            block: true,
            reason: `Tool ${toolCall?.name || 'unknown'} is not in the SmartPerfetto request-scoped allowlist.`,
          };
        }
        return undefined;
      },
    });
    this.activeAgent = agent;

    let rounds = 0;
    const unsubscribe = agent.subscribe((event) => {
      if (event.type === 'turn_end') rounds++;
      const update = projectPiAgentCoreEventToStreamingUpdate(event);
      if (update) this.emit('update', update);
    });

    try {
      this.emit('update', {
        type: 'progress',
        content: {
          module: 'pi-agent-core',
          runtime: this.selection.kind,
          mode: prep.quickMode ? 'fast' : 'full',
          toolCount: prep.tools.length,
          message: this.selection.kind === PI_AGENT_CORE_RUNTIME_KIND
            ? 'Pi agent-core SmartPerfetto analysis started'
            : 'Hidden experimental Pi agent-core SmartPerfetto analysis started',
          source: this.selection.source,
        },
        timestamp: Date.now(),
      });
      await agent.prompt(prep.prompt);
    } finally {
      unsubscribe();
    }

    const latestAssistant = latestAssistantMessage(agent.state.messages);
    const stopReason = typeof latestAssistant?.stopReason === 'string'
      ? latestAssistant.stopReason
      : undefined;
    const errorMessage = typeof latestAssistant?.errorMessage === 'string'
      ? latestAssistant.errorMessage
      : agent.state.errorMessage;
    if (stopReason === 'error' || stopReason === 'aborted' || errorMessage) {
      return {
        sessionId,
        success: false,
        findings: [],
        hypotheses: prep.hypotheses.map(toProtocolHypothesis),
        conclusion: errorMessage || 'Pi Agent Core analysis failed.',
        confidence: 0,
        rounds: Math.max(rounds, 1),
        totalDurationMs: Date.now() - startedAt,
        terminationReason: stopReason === 'aborted' ? 'timeout' : 'execution_error',
        terminationMessage: errorMessage || 'Pi Agent Core reported an execution error.',
      };
    }

    let conclusion = sanitizePiAgentCoreConclusionText(
      selectAssistantConclusion(agent.state.messages) ||
      'Pi Agent Core runtime completed without assistant text.',
    );
    if (options.codeAwareMode && options.codeAwareMode !== 'off') {
      conclusion = sanitizeCodeAwareText(sessionId, conclusion);
    }

    const closedFinalPhase = completePiAgentCoreFinalReportPhaseIfDelivered(
      prep.analysisPlan.current,
      conclusion,
      prep.analysisRunSpec.outputLanguage,
    );
    if (closedFinalPhase) {
      this.emit('update', {
        type: 'plan_phase_updated',
        content: {
          phaseId: closedFinalPhase.id,
          status: closedFinalPhase.status,
          summary: closedFinalPhase.summary,
          phaseName: closedFinalPhase.name,
        },
        timestamp: Date.now(),
      });
    }

    const planStatus = getPiAgentCorePlanCompletionStatus(prep.analysisPlan.current);
    let partial = false;
    let terminationReason: AnalysisResult['terminationReason'];
    let terminationMessage: string | undefined;
    if (!prep.quickMode && !planStatus.complete) {
      partial = true;
      terminationReason = 'plan_incomplete';
      terminationMessage = formatIncompletePlanMessage(planStatus, prep.analysisRunSpec.outputLanguage);
    } else if (stopReason === 'length') {
      partial = true;
      terminationReason = 'max_turns';
      terminationMessage = 'Pi Agent Core model stopped because the response reached its length limit.';
    }

    const findings = extractFindingsFromText(conclusion);
    const result: AnalysisResult = {
      sessionId,
      success: true,
      findings,
      hypotheses: prep.hypotheses.map(toProtocolHypothesis),
      conclusion,
      confidence: estimateConfidence(findings, partial),
      rounds: Math.max(rounds, 1),
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
      this.emit('update', {
        type: 'degraded',
        content: {
          module: 'piAgentCoreRuntime',
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
        agentId: 'pi-agent-core',
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
  ): Promise<PiAnalysisPreparation> {
    const outputLanguage = parseOutputLanguage(this.env.SMARTPERFETTO_OUTPUT_LANGUAGE);
    const sceneType = classifyScene(query);
    const quickMode = options.analysisMode === 'fast';
    const focusResult = await detectFocusApps(this.traceProcessorService, traceId);
    const effectivePackageName = options.packageName || focusResult.primaryApp;
    const analysisRunSpec = createAnalysisRunSpec({
      query,
      sessionId,
      traceId,
      options,
      runtimeSelection: this.selection,
      engineCapabilities: getPiAgentCoreEngineCapabilities(this.selection.kind),
      sceneType,
      outputLanguage,
    });

    await ensureSkillRegistryInitialized();
    const skillExecutor = createSkillExecutor(this.traceProcessorService);
    skillExecutor.registerSkills(skillRegistry.getAllSkills());
    skillExecutor.setFragmentRegistry(skillRegistry.getFragmentCache());

    let architecture = this.architectureCache.get(traceId);
    if (!architecture) {
      try {
        architecture = await createArchitectureDetector().detect({
          traceId,
          traceProcessorService: this.traceProcessorService,
          packageName: effectivePackageName,
        });
        if (architecture) this.architectureCache.set(traceId, architecture);
      } catch (err) {
        console.warn('[PiAgentCoreRuntime] Architecture detection failed:', (err as Error).message);
      }
    }
    if (architecture) {
      this.emit('update', {
        type: 'architecture_detected',
        content: { architecture },
        timestamp: Date.now(),
      });
    }

    let traceCompleteness: Awaited<ReturnType<typeof probeTraceCompleteness>> | undefined;
    try {
      traceCompleteness = await probeTraceCompleteness(
        this.traceProcessorService,
        traceId,
        architecture?.type,
      );
    } catch (err) {
      console.warn('[PiAgentCoreRuntime] Trace completeness probe failed:', (err as Error).message);
    }

    const sessionContext = sessionContextManager.getOrCreate(sessionId, traceId);
    const previousTurns = sessionContext.getAllTurns?.() || [];
    const previousFindings = previousTurns
      .slice(-3)
      .flatMap((turn: any) => Array.isArray(turn?.findings) ? turn.findings : []);
    const conversationSummary = previousTurns.length > 0
      ? sessionContext.generatePromptContext(2000)
      : undefined;
    const entityStore = sessionContext.getEntityStore();
    const entityContext = buildEntityContext(entityStore);

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

    if (!this.sessionHypotheses.has(sessionId)) {
      this.sessionHypotheses.set(sessionId, []);
    }
    const hypotheses = this.sessionHypotheses.get(sessionId)!;
    hypotheses.splice(0);

    if (!this.sessionUncertaintyFlags.has(sessionId)) {
      this.sessionUncertaintyFlags.set(sessionId, []);
    }
    const uncertaintyFlags = this.sessionUncertaintyFlags.get(sessionId)!;
    uncertaintyFlags.splice(0);

    const watchdogWarning: { current: string | null } = { current: null };
    const recentSqlErrors = loadLearnedSqlFixPairs(5, analysisRunSpec.scopes.knowledge);
    const skillNotesBudget = createRuntimeSkillNotesBudget(quickMode);
    const { toolDefinitions } = createClaudeMcpServer({
      sessionId,
      traceId,
      traceProcessorService: this.traceProcessorService,
      skillExecutor,
      packageName: effectivePackageName,
      emitUpdate: (update) => this.emit('update', update),
      onSkillResult: (result) => {
        captureSkillDisplayEntities(result.displayResults, entityStore, 'pi-agent-core');
      },
      analysisNotes: notes,
      artifactStore,
      cachedArchitecture: architecture,
      recentSqlErrors,
      analysisPlan: quickMode ? undefined : analysisPlan,
      watchdogWarning,
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
    const tools = toolDefinitions.map(definition => (
      createPiAgentCoreToolFromSharedSpec(definition.shared, {
        allowedToolNames,
        runtimeKind: this.selection.kind,
      })
    ));

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
        tools,
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
      // Non-fatal. Pi can still use lookup_sql_schema/knowledge tools.
    }

    const traceFeatures = extractTraceFeatures({
      architectureType: architecture?.type,
      sceneType,
      packageName: effectivePackageName,
    });
    const patternContext = buildPatternContextSection(
      traceFeatures,
      knowledgeScopeFromAnalysisOptions(options),
    );
    const negativePatternContext = buildNegativePatternSection(
      traceFeatures,
      knowledgeScopeFromAnalysisOptions(options),
    );
    const traceInfo = this.traceProcessorService.getTrace(traceId);
    const systemPromptEnv = normalizeOptionalString(this.env[PI_AGENT_CORE_SYSTEM_PROMPT_ENV]);
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
      patternContext,
      negativePatternContext,
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
    return {
      systemPrompt: systemPromptEnv
        ? `${sharedSystemPrompt}\n\n${systemPromptEnv}`
        : sharedSystemPrompt,
      prompt,
      tools,
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
      engineState: createPiAgentCoreSnapshotEngineState({
        providerId: sessionFields.agentRuntimeProviderId,
        providerSnapshotHash: sessionFields.agentRuntimeProviderSnapshotHash,
        opaque: {
          messageCount: this.activeAgent?.state.messages?.length ?? 0,
          toolCount: this.activeAgent?.state.tools?.length ?? 0,
        },
      }),
      agentRuntimeKind: PI_AGENT_CORE_RUNTIME_KIND,
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
    if (snapshot.artifacts && snapshot.artifacts.length > 0) {
      this.artifactStores.set(sessionId, ArtifactStore.fromSnapshot(snapshot.artifacts));
    }
    if (snapshot.architecture) {
      this.architectureCache.set(traceId, snapshot.architecture);
    }
  }

  reset(): void {
    this.activeAgent?.reset();
    this.removeAllListeners();
  }

  abortActiveRun(): void {
    this.activeAgent?.abort();
  }
}

export function createPiAgentCoreRuntime(
  input: RuntimeFactoryInput,
  options: PiAgentCoreRuntimeOptions = {},
): IOrchestrator {
  return new PiAgentCoreRuntime(
    input.traceProcessorService,
    input.selection.kind === EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND ||
      input.selection.kind === PI_AGENT_CORE_RUNTIME_KIND
      ? input.selection as RuntimeSelection<PiAgentCoreRuntimeKind>
      : { kind: PI_AGENT_CORE_RUNTIME_KIND, source: 'env' },
    options,
  );
}

export function createPiAgentCoreRuntimeDefinition(
  kind: PiAgentCoreRuntimeKind = EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND,
): RuntimeEngineDefinition {
  return {
    kind,
    capabilities: getPiAgentCoreEngineCapabilities(kind),
    createOrchestrator: (input) => createPiAgentCoreRuntime(input),
  };
}
