// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import type { TraceProcessorService } from '../services/traceProcessorService';
import type { IOrchestrator } from '../agent/core/orchestratorTypes';
import { getProviderService, type AgentRuntimeKind, type ProviderScope } from '../services/providerManager';
import { createAnalysisHarness } from './analysisHarness';
import { isProductionAgentRuntimeKind } from './runtimeCapabilities';
import {
  type ExperimentalAgentRuntimeKind,
  resolveExperimentalAgentRuntimeSelection,
} from './piAgentCoreRuntime';
import { createRuntimeRegistryForSelection } from './runtimeRegistry';

export type BackendAgentRuntimeKind = AgentRuntimeKind;
export type ResolvedAgentRuntimeKind = BackendAgentRuntimeKind | ExperimentalAgentRuntimeKind;
export const ANALYSIS_HARNESS_ENV = 'SMARTPERFETTO_ANALYSIS_HARNESS';

export interface RuntimeSelection<K extends string = ResolvedAgentRuntimeKind> {
  kind: K;
  source: 'provider' | 'snapshot' | 'env' | 'default';
  providerId?: string;
  providerName?: string;
  providerType?: string;
}

export interface CreateAgentOrchestratorInput {
  traceProcessorService: TraceProcessorService;
  /**
   * undefined = resolve current active provider.
   * string = use that provider.
   * null = pin to env/default fallback and ignore Provider Manager.
   */
  providerId?: string | null;
  runtimeOverride?: BackendAgentRuntimeKind;
  providerScope?: ProviderScope;
}

function parseRuntimeEnv(value: string | undefined): BackendAgentRuntimeKind | undefined {
  return isProductionAgentRuntimeKind(value) ? value : undefined;
}

export function isAnalysisHarnessEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const value = env[ANALYSIS_HARNESS_ENV]?.trim().toLowerCase();
  return value !== '0' && value !== 'false' && value !== 'off';
}

export function resolveAgentRuntimeSelection(
  providerId?: string | null,
  runtimeOverride?: BackendAgentRuntimeKind,
  providerScope?: ProviderScope,
): RuntimeSelection {
  const providerSvc = getProviderService();
  const provider = typeof providerId === 'string'
    ? providerSvc.getRawProvider(providerId, providerScope)
    : providerId === null || runtimeOverride
      ? undefined
      : providerSvc.getRawEffectiveProvider(providerScope);

  if (typeof providerId === 'string' && !provider) {
    throw new Error(`Provider not found: ${providerId}`);
  }

  if (provider) {
    return {
      kind: providerSvc.resolveAgentRuntime(provider),
      source: 'provider',
      providerId: provider.id,
      providerName: provider.name,
      providerType: provider.type,
    };
  }

  if (runtimeOverride) {
    return { kind: runtimeOverride, source: 'snapshot' };
  }

  const explicitRuntime = parseRuntimeEnv(process.env.SMARTPERFETTO_AGENT_RUNTIME);
  if (explicitRuntime) {
    return { kind: explicitRuntime, source: 'env' };
  }
  if (process.env.SMARTPERFETTO_AGENT_RUNTIME) {
    throw new Error(
      `Unsupported SMARTPERFETTO_AGENT_RUNTIME="${process.env.SMARTPERFETTO_AGENT_RUNTIME}". ` +
      'Use "claude-agent-sdk", "openai-agents-sdk", "pi-agent-core", or "opencode".'
    );
  }

  const experimentalRuntime = resolveExperimentalAgentRuntimeSelection();
  if (experimentalRuntime) {
    return experimentalRuntime;
  }

  return { kind: 'claude-agent-sdk', source: 'default' };
}

export function createAgentOrchestrator(input: CreateAgentOrchestratorInput): IOrchestrator {
  const selection = resolveAgentRuntimeSelection(input.providerId, input.runtimeOverride, input.providerScope);
  const registry = createRuntimeRegistryForSelection(selection.kind);
  const engine = registry.createOrchestrator(selection.kind, {
    traceProcessorService: input.traceProcessorService,
    selection,
  });
  return isAnalysisHarnessEnabled()
    ? createAnalysisHarness({ engine })
    : engine;
}
