// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { describe, expect, it, jest } from '@jest/globals';
import type { IOrchestrator } from '../../agent/core/orchestratorTypes';
import {
  createRuntimeRegistry,
  productionRuntimeRegistry,
  type RuntimeEngineDefinition,
} from '../runtimeRegistry';
import {
  getProductionEngineCapabilities,
  isProductionAgentRuntimeKind,
  listProductionRuntimeKinds,
  type EngineCapabilities,
} from '../runtimeCapabilities';

function fakeCapabilities(kind = 'fake-runtime'): EngineCapabilities {
  return {
    kind,
    displayName: 'Fake Runtime',
    production: false,
    publicRuntime: false,
    nativeLoop: 'third-party-adapter',
    toolTransport: 'shared-tool-spec',
    toolSchemaDialect: 'zod_raw_shape',
    eventModel: 'fake-third-party',
    abortMechanism: 'abort-signal',
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
  };
}

describe('runtime registry', () => {
  it('lists the public production runtimes, including Pi Agent Core and OpenCode', () => {
    expect(listProductionRuntimeKinds()).toEqual([
      'claude-agent-sdk',
      'openai-agents-sdk',
      'pi-agent-core',
      'opencode',
    ]);
    expect(productionRuntimeRegistry.listRuntimeKinds()).toEqual([
      'claude-agent-sdk',
      'openai-agents-sdk',
      'pi-agent-core',
      'opencode',
    ]);
    expect(isProductionAgentRuntimeKind('claude-agent-sdk')).toBe(true);
    expect(isProductionAgentRuntimeKind('openai-agents-sdk')).toBe(true);
    expect(isProductionAgentRuntimeKind('pi-agent-core')).toBe(true);
    expect(isProductionAgentRuntimeKind('opencode')).toBe(true);
    expect(isProductionAgentRuntimeKind('fake-third-party-runtime')).toBe(false);
  });

  it('exposes policy-relevant runtime differences as EngineCapabilities', () => {
    const claude = productionRuntimeRegistry.getCapabilities('claude-agent-sdk');
    const openai = productionRuntimeRegistry.getCapabilities('openai-agents-sdk');
    const pi = productionRuntimeRegistry.getCapabilities('pi-agent-core');
    const opencode = productionRuntimeRegistry.getCapabilities('opencode');

    expect(claude).toBe(getProductionEngineCapabilities('claude-agent-sdk'));
    expect(openai).toBe(getProductionEngineCapabilities('openai-agents-sdk'));
    expect(pi).toBe(getProductionEngineCapabilities('pi-agent-core'));
    expect(opencode).toBe(getProductionEngineCapabilities('opencode'));
    expect(claude).toMatchObject({
      publicRuntime: true,
      nativeLoop: 'claude-agent-sdk',
      toolTransport: 'claude-mcp',
      classifierPolicy: 'claude-local-rules-then-claude-light-model',
      continuationPolicy: {
        claudeVerifierCorrectionLoop: true,
        openAiPlanContinuation: false,
        openAiFinalReportContinuation: false,
      },
      snapshotState: {
        storesClaudeSdkSession: true,
        storesOpenAiResponseState: false,
      },
    });
    expect(openai).toMatchObject({
      publicRuntime: true,
      nativeLoop: 'openai-agents-sdk',
      toolTransport: 'openai-function-tools',
      classifierPolicy: 'openai-local-rules-then-openai-light-model',
      continuationPolicy: {
        claudeVerifierCorrectionLoop: false,
        openAiPlanContinuation: true,
        openAiFinalReportContinuation: true,
      },
      snapshotState: {
        storesClaudeSdkSession: false,
        storesOpenAiResponseState: true,
      },
    });
    expect(pi).toMatchObject({
      publicRuntime: true,
      nativeLoop: 'pi-agent-core',
      toolTransport: 'pi-agent-core-tools',
      toolSchemaDialect: 'typebox',
      classifierPolicy: 'third-party-local-rules-only',
      continuationPolicy: {
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
    });
    expect(opencode).toMatchObject({
      publicRuntime: true,
      nativeLoop: 'opencode-server',
      toolTransport: 'opencode-mcp',
      toolSchemaDialect: 'json_schema',
      classifierPolicy: 'third-party-local-rules-only',
      toolExecution: {
        externalDiscovery: false,
        builtInShellOrFileTools: false,
      },
      snapshotState: {
        storesClaudeSdkSession: false,
        storesOpenAiResponseState: false,
        storesOpaqueThirdPartyState: true,
      },
      supportsProviderRuntimePinning: true,
    });
  });

  it('creates runtimes through registered definitions', () => {
    const orchestrator = { analyze: jest.fn(), reset: jest.fn() } as unknown as IOrchestrator;
    const createOrchestrator = jest.fn((_input: any) => orchestrator);
    const definition: RuntimeEngineDefinition = {
      kind: 'fake-runtime',
      capabilities: fakeCapabilities('fake-runtime'),
      createOrchestrator,
    };
    const registry = createRuntimeRegistry([definition]);
    const traceProcessorService = { kind: 'trace-processor' } as any;
    const selection = { kind: 'fake-runtime', source: 'default' as const };

    expect(registry.createOrchestrator('fake-runtime', {
      traceProcessorService,
      selection,
    })).toBe(orchestrator);
    expect(createOrchestrator).toHaveBeenCalledWith({
      traceProcessorService,
      selection,
    });
  });

  it('fails closed for unknown, duplicate, and mismatched registrations', () => {
    const definition: RuntimeEngineDefinition = {
      kind: 'fake-runtime',
      capabilities: fakeCapabilities('fake-runtime'),
      createOrchestrator: jest.fn(() => ({}) as IOrchestrator),
    };
    const registry = createRuntimeRegistry([definition]);

    expect(() => registry.require('missing-runtime')).toThrow(
      'Unsupported agent runtime: missing-runtime',
    );
    expect(() => registry.register(definition)).toThrow(
      'Runtime already registered: fake-runtime',
    );
    expect(() => createRuntimeRegistry([{
      ...definition,
      kind: 'fake-runtime-alias',
    }])).toThrow(
      'Runtime registration mismatch: fake-runtime-alias != fake-runtime',
    );
  });
});
