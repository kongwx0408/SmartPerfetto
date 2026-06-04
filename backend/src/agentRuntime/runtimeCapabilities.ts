// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import type { AgentRuntimeKind } from '../services/providerManager';

export type RuntimeClassifierPolicy =
  | 'claude-local-rules-then-claude-light-model'
  | 'openai-local-rules-then-openai-light-model'
  | 'third-party-local-rules-only';

export interface RuntimeContinuationPolicy {
  sdkRunDoneMeansAnalysisDone: false;
  claudeVerifierCorrectionLoop: boolean;
  openAiPlanContinuation: boolean;
  openAiFinalReportContinuation: boolean;
}

export interface EngineCapabilities {
  kind: string;
  displayName: string;
  production: boolean;
  publicRuntime: boolean;
  nativeLoop: 'claude-agent-sdk' | 'openai-agents-sdk' | 'third-party-adapter' | 'pi-agent-core' | 'opencode-server';
  toolTransport: 'claude-mcp' | 'openai-function-tools' | 'shared-tool-spec' | 'pi-agent-core-tools' | 'opencode-mcp';
  toolSchemaDialect: 'zod_raw_shape' | 'typebox' | 'json_schema';
  eventModel: 'claude-agent-sdk' | 'openai-agents-sdk' | 'pi-agent-core' | 'opencode-server' | 'fake-third-party';
  abortMechanism: 'explicit-close' | 'abort-signal' | 'agent-abort' | 'session-abort-and-server-close';
  toolExecution: {
    defaultMode: 'sequential' | 'parallel' | 'sdk-controlled';
    requestScopedAllowlist: boolean;
    externalDiscovery: boolean;
    builtInShellOrFileTools: boolean;
  };
  classifierPolicy: RuntimeClassifierPolicy;
  continuationPolicy: RuntimeContinuationPolicy;
  snapshotState: {
    storesClaudeSdkSession: boolean;
    storesOpenAiResponseState: boolean;
    storesOpaqueThirdPartyState: boolean;
  };
  supportsProviderRuntimePinning: boolean;
}

const PRODUCTION_RUNTIME_KINDS: readonly AgentRuntimeKind[] = [
  'claude-agent-sdk',
  'openai-agents-sdk',
  'pi-agent-core',
  'opencode',
];

const PRODUCTION_ENGINE_CAPABILITIES: Record<AgentRuntimeKind, EngineCapabilities> = {
  'claude-agent-sdk': {
    kind: 'claude-agent-sdk',
    displayName: 'Claude Agent SDK',
    production: true,
    publicRuntime: true,
    nativeLoop: 'claude-agent-sdk',
    toolTransport: 'claude-mcp',
    toolSchemaDialect: 'zod_raw_shape',
    eventModel: 'claude-agent-sdk',
    abortMechanism: 'explicit-close',
    toolExecution: {
      defaultMode: 'sdk-controlled',
      requestScopedAllowlist: true,
      externalDiscovery: false,
      builtInShellOrFileTools: false,
    },
    classifierPolicy: 'claude-local-rules-then-claude-light-model',
    continuationPolicy: {
      sdkRunDoneMeansAnalysisDone: false,
      claudeVerifierCorrectionLoop: true,
      openAiPlanContinuation: false,
      openAiFinalReportContinuation: false,
    },
    snapshotState: {
      storesClaudeSdkSession: true,
      storesOpenAiResponseState: false,
      storesOpaqueThirdPartyState: false,
    },
    supportsProviderRuntimePinning: true,
  },
  'openai-agents-sdk': {
    kind: 'openai-agents-sdk',
    displayName: 'OpenAI Agents SDK',
    production: true,
    publicRuntime: true,
    nativeLoop: 'openai-agents-sdk',
    toolTransport: 'openai-function-tools',
    toolSchemaDialect: 'zod_raw_shape',
    eventModel: 'openai-agents-sdk',
    abortMechanism: 'abort-signal',
    toolExecution: {
      defaultMode: 'sequential',
      requestScopedAllowlist: true,
      externalDiscovery: false,
      builtInShellOrFileTools: false,
    },
    classifierPolicy: 'openai-local-rules-then-openai-light-model',
    continuationPolicy: {
      sdkRunDoneMeansAnalysisDone: false,
      claudeVerifierCorrectionLoop: false,
      openAiPlanContinuation: true,
      openAiFinalReportContinuation: true,
    },
    snapshotState: {
      storesClaudeSdkSession: false,
      storesOpenAiResponseState: true,
      storesOpaqueThirdPartyState: false,
    },
    supportsProviderRuntimePinning: true,
  },
  'pi-agent-core': {
    kind: 'pi-agent-core',
    displayName: 'Pi Agent Core',
    production: true,
    publicRuntime: true,
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
    supportsProviderRuntimePinning: true,
  },
  opencode: {
    kind: 'opencode',
    displayName: 'OpenCode',
    production: true,
    publicRuntime: true,
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
    supportsProviderRuntimePinning: true,
  },
};

export function listProductionRuntimeKinds(): readonly AgentRuntimeKind[] {
  return PRODUCTION_RUNTIME_KINDS;
}

export function isProductionAgentRuntimeKind(value: unknown): value is AgentRuntimeKind {
  return typeof value === 'string'
    && PRODUCTION_RUNTIME_KINDS.includes(value as AgentRuntimeKind);
}

export function getProductionEngineCapabilities(kind: string): EngineCapabilities {
  if (!isProductionAgentRuntimeKind(kind)) {
    throw new Error(`Unsupported agent runtime capabilities: ${kind}`);
  }
  return PRODUCTION_ENGINE_CAPABILITIES[kind];
}
