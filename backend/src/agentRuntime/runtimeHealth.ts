// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { serverConfig } from '../config';
import { getOpenAIRuntimeDiagnostics } from '../agentOpenAI';
import { getClaudeRuntimeDiagnostics } from '../agentv3/claudeConfig';
import { collectEnvCredentialSources } from './envCredentialSources';
import { resolveAgentRuntimeSelection } from './runtimeSelection';
import { getProviderService } from '../services/providerManager';
import { getSmartPerfettoVersion } from '../version';
import {
  EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND,
  getPiAgentCoreRuntimeDiagnostics,
  PI_AGENT_CORE_RUNTIME_KIND,
} from './piAgentCoreRuntime';
import {
  EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
  getOpenCodeRuntimeDiagnostics,
  OPENCODE_RUNTIME_KIND,
} from './openCodeRuntime';

export function buildRuntimeHealthPayload(now: Date = new Date()) {
  const runtimeSelection = resolveAgentRuntimeSelection();
  const providerSvc = getProviderService();
  const activeProvider = providerSvc.list().find(p => p.isActive);
  const selectedProviderId = runtimeSelection.source === 'provider'
    ? runtimeSelection.providerId
    : null;
  const claudeDiagnostics = getClaudeRuntimeDiagnostics(
    runtimeSelection.kind === 'claude-agent-sdk' ? selectedProviderId : null,
  );
  const openAIDiagnostics = getOpenAIRuntimeDiagnostics(
    runtimeSelection.kind === 'openai-agents-sdk' ? selectedProviderId : null,
  );
  const selectedDiagnostics = runtimeSelection.kind === 'openai-agents-sdk'
    ? openAIDiagnostics
    : runtimeSelection.kind === PI_AGENT_CORE_RUNTIME_KIND ||
      runtimeSelection.kind === EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND
      ? getPiAgentCoreRuntimeDiagnostics(process.env, runtimeSelection.kind)
      : runtimeSelection.kind === EXPERIMENTAL_OPENCODE_RUNTIME_KIND ||
        runtimeSelection.kind === OPENCODE_RUNTIME_KIND
        ? getOpenCodeRuntimeDiagnostics(process.env, runtimeSelection.kind)
        : claudeDiagnostics;
  const selectedModel = 'model' in selectedDiagnostics
    ? selectedDiagnostics.model
    : selectedDiagnostics.runtime === EXPERIMENTAL_OPENCODE_RUNTIME_KIND ||
      selectedDiagnostics.runtime === OPENCODE_RUNTIME_KIND
      ? 'opencode'
    : 'modelConfigured' in selectedDiagnostics && selectedDiagnostics.modelConfigured
      ? 'pi-agent-core'
      : '';
  const selectedProviderMode = 'providerMode' in selectedDiagnostics
    ? selectedDiagnostics.providerMode
    : selectedDiagnostics.runtime;
  const envSources = collectEnvCredentialSources(process.env, 'health');
  const providerOverridesEnv = runtimeSelection.source === 'provider' && envSources.length > 0;

  return {
    status: 'OK',
    timestamp: now.toISOString(),
    environment: serverConfig.nodeEnv,
    version: getSmartPerfettoVersion(),
    aiEngine: {
      runtime: runtimeSelection.kind,
      model: selectedModel,
      providerMode: selectedProviderMode,
      configured: selectedDiagnostics.configured,
      source: runtimeSelection.source,
      credentialSource: runtimeSelection.source === 'provider'
        ? 'provider-manager'
        : 'env-or-default',
      envCredentialSources: envSources,
      providerOverridesEnv,
      ...(activeProvider ? {
        activeProvider: {
          id: activeProvider.id,
          name: activeProvider.name,
          type: activeProvider.type,
        },
      } : {}),
      authRequired: !!process.env.SMARTPERFETTO_API_KEY
        || process.env.SMARTPERFETTO_ENTERPRISE === 'true'
        || !!process.env.SMARTPERFETTO_OIDC_ISSUER_URL,
      diagnostics: selectedDiagnostics,
    },
  };
}
