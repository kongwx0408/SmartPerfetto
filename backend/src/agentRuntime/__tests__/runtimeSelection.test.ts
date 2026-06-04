// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { EventEmitter } from 'events';

let provider: any;

function createMockOrchestrator(runtime: string): any {
  const orchestrator = new EventEmitter() as any;
  orchestrator.runtime = runtime;
  orchestrator.analyze = jest.fn();
  orchestrator.reset = jest.fn();
  return orchestrator;
}

jest.mock('../../services/providerManager', () => ({
  getProviderService: () => ({
    getRawProvider: jest.fn(() => provider),
    getRawEffectiveProvider: jest.fn(() => provider),
    resolveAgentRuntime: jest.fn((p: any) => p.connection.agentRuntime),
  }),
}));

describe('resolveAgentRuntimeSelection', () => {
  const originalRuntime = process.env.SMARTPERFETTO_AGENT_RUNTIME;
  const originalHarness = process.env.SMARTPERFETTO_ANALYSIS_HARNESS;
  const originalExperimentalEnabled = process.env.SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME;
  const originalExperimentalRuntime = process.env.SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME;

  beforeEach(() => {
    provider = undefined;
    delete process.env.SMARTPERFETTO_AGENT_RUNTIME;
    delete process.env.SMARTPERFETTO_ANALYSIS_HARNESS;
    delete process.env.SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME;
    delete process.env.SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME;
    jest.resetModules();
  });

  afterEach(() => {
    if (originalRuntime === undefined) delete process.env.SMARTPERFETTO_AGENT_RUNTIME;
    else process.env.SMARTPERFETTO_AGENT_RUNTIME = originalRuntime;
    if (originalHarness === undefined) delete process.env.SMARTPERFETTO_ANALYSIS_HARNESS;
    else process.env.SMARTPERFETTO_ANALYSIS_HARNESS = originalHarness;
    if (originalExperimentalEnabled === undefined) delete process.env.SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME;
    else process.env.SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME = originalExperimentalEnabled;
    if (originalExperimentalRuntime === undefined) delete process.env.SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME;
    else process.env.SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME = originalExperimentalRuntime;
  });

  it('uses the active provider runtime before env fallbacks', async () => {
    provider = {
      id: 'provider-openai',
      name: 'OpenAI',
      type: 'openai',
      connection: { agentRuntime: 'openai-agents-sdk' },
    };
    process.env.SMARTPERFETTO_AGENT_RUNTIME = 'claude-agent-sdk';

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(resolveAgentRuntimeSelection()).toMatchObject({
      kind: 'openai-agents-sdk',
      source: 'provider',
      providerId: 'provider-openai',
      providerName: 'OpenAI',
      providerType: 'openai',
    });
  });

  it('uses Claude Agent SDK by default when no provider, snapshot, or env runtime exists', async () => {
    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(resolveAgentRuntimeSelection()).toEqual({
      kind: 'claude-agent-sdk',
      source: 'default',
    });
  });

  it('uses explicit SMARTPERFETTO_AGENT_RUNTIME when no provider is active', async () => {
    process.env.SMARTPERFETTO_AGENT_RUNTIME = 'openai-agents-sdk';

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(resolveAgentRuntimeSelection()).toMatchObject({
      kind: 'openai-agents-sdk',
      source: 'env',
    });
  });

  it('accepts public Pi agent-core through SMARTPERFETTO_AGENT_RUNTIME', async () => {
    process.env.SMARTPERFETTO_AGENT_RUNTIME = 'pi-agent-core';

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(resolveAgentRuntimeSelection(null)).toEqual({
      kind: 'pi-agent-core',
      source: 'env',
    });
  });

  it('uses snapshot runtime override before active provider fallback', async () => {
    provider = {
      id: 'provider-openai',
      name: 'OpenAI',
      type: 'openai',
      connection: { agentRuntime: 'openai-agents-sdk' },
    };

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(resolveAgentRuntimeSelection(undefined, 'claude-agent-sdk')).toMatchObject({
      kind: 'claude-agent-sdk',
      source: 'snapshot',
    });
  });

  it('uses snapshot runtime override before env fallback when Provider Manager is bypassed', async () => {
    process.env.SMARTPERFETTO_AGENT_RUNTIME = 'openai-agents-sdk';

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(resolveAgentRuntimeSelection(null, 'claude-agent-sdk')).toEqual({
      kind: 'claude-agent-sdk',
      source: 'snapshot',
    });
  });

  it('uses env/default fallback when providerId is explicitly null', async () => {
    provider = {
      id: 'provider-openai',
      name: 'OpenAI',
      type: 'openai',
      connection: { agentRuntime: 'openai-agents-sdk' },
    };

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(resolveAgentRuntimeSelection(null)).toMatchObject({
      kind: 'claude-agent-sdk',
      source: 'default',
    });
  });

  it('uses env runtime when providerId is explicitly null and env is configured', async () => {
    provider = {
      id: 'provider-openai',
      name: 'OpenAI',
      type: 'openai',
      connection: { agentRuntime: 'openai-agents-sdk' },
    };
    process.env.SMARTPERFETTO_AGENT_RUNTIME = 'openai-agents-sdk';

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(resolveAgentRuntimeSelection(null)).toEqual({
      kind: 'openai-agents-sdk',
      source: 'env',
    });
  });

  it('lets explicit providerId win over snapshot runtime override', async () => {
    provider = {
      id: 'provider-openai',
      name: 'OpenAI',
      type: 'openai',
      connection: { agentRuntime: 'openai-agents-sdk' },
    };

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(resolveAgentRuntimeSelection('provider-openai', 'claude-agent-sdk')).toMatchObject({
      kind: 'openai-agents-sdk',
      source: 'provider',
      providerId: 'provider-openai',
    });
  });

  it('lets an explicit custom Pi provider pin the public runtime', async () => {
    provider = {
      id: 'provider-pi',
      name: 'Pi Custom',
      type: 'custom',
      connection: {
        agentRuntime: 'pi-agent-core',
        piAgentCoreModelJson: '{"id":"pi-test","provider":"test"}',
      },
    };
    process.env.SMARTPERFETTO_AGENT_RUNTIME = 'claude-agent-sdk';

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(resolveAgentRuntimeSelection('provider-pi')).toMatchObject({
      kind: 'pi-agent-core',
      source: 'provider',
      providerId: 'provider-pi',
      providerName: 'Pi Custom',
      providerType: 'custom',
    });
  });

  it('throws when an explicit providerId does not exist', async () => {
    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');

    expect(() => resolveAgentRuntimeSelection('missing-provider')).toThrow(
      'Provider not found: missing-provider',
    );
  });

  it('rejects provider names as runtime env values', async () => {
    process.env.SMARTPERFETTO_AGENT_RUNTIME = 'deepseek';

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(() => resolveAgentRuntimeSelection()).toThrow(
      'Unsupported SMARTPERFETTO_AGENT_RUNTIME="deepseek"'
    );
  });

  it('keeps experimental runtime values out of public SMARTPERFETTO_AGENT_RUNTIME', async () => {
    process.env.SMARTPERFETTO_AGENT_RUNTIME = 'experimental-pi-agent-core';
    process.env.SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME = '1';
    process.env.SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME = 'experimental-pi-agent-core';

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(() => resolveAgentRuntimeSelection(null)).toThrow(
      'Unsupported SMARTPERFETTO_AGENT_RUNTIME="experimental-pi-agent-core"',
    );
  });

  it('keeps experimental OpenCode out of public SMARTPERFETTO_AGENT_RUNTIME', async () => {
    process.env.SMARTPERFETTO_AGENT_RUNTIME = 'experimental-opencode';
    process.env.SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME = '1';
    process.env.SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME = 'experimental-opencode';

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(() => resolveAgentRuntimeSelection(null)).toThrow(
      'Unsupported SMARTPERFETTO_AGENT_RUNTIME="experimental-opencode"',
    );
  });

  it('requires the hidden experiment enable flag before selecting the experimental runtime', async () => {
    process.env.SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME = 'experimental-pi-agent-core';

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(() => resolveAgentRuntimeSelection(null)).toThrow(
      'SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME requires SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME=1',
    );
  });

  it('selects the hidden experimental runtime only after provider, snapshot, and public env fallbacks', async () => {
    process.env.SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME = '1';
    process.env.SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME = 'experimental-pi-agent-core';

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(resolveAgentRuntimeSelection(null)).toEqual({
      kind: 'experimental-pi-agent-core',
      source: 'env',
    });
    expect(resolveAgentRuntimeSelection(null, 'claude-agent-sdk')).toEqual({
      kind: 'claude-agent-sdk',
      source: 'snapshot',
    });
  });

  it('selects the hidden experimental OpenCode runtime only behind the shared experiment gate', async () => {
    process.env.SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME = '1';
    process.env.SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME = 'experimental-opencode';

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(resolveAgentRuntimeSelection(null)).toEqual({
      kind: 'experimental-opencode',
      source: 'env',
    });
    expect(resolveAgentRuntimeSelection(null, 'openai-agents-sdk')).toEqual({
      kind: 'openai-agents-sdk',
      source: 'snapshot',
    });
  });

  it('lets an active Provider Manager runtime win over the hidden experimental env', async () => {
    provider = {
      id: 'provider-openai',
      name: 'OpenAI',
      type: 'openai',
      connection: { agentRuntime: 'openai-agents-sdk' },
    };
    process.env.SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME = '1';
    process.env.SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME = 'experimental-pi-agent-core';

    const { resolveAgentRuntimeSelection } = await import('../runtimeSelection');
    expect(resolveAgentRuntimeSelection()).toMatchObject({
      kind: 'openai-agents-sdk',
      source: 'provider',
      providerId: 'provider-openai',
    });
  });

  it('passes the resolved Claude runtime selection snapshot into the runtime instance', async () => {
    const claudeRuntime = createMockOrchestrator('claude');
    const createClaudeRuntime = jest.fn(() => claudeRuntime);
    jest.doMock('../../agentv3', () => ({ createClaudeRuntime }));

    const traceProcessorService = { kind: 'trace-processor' } as any;
    const { createAgentOrchestrator } = await import('../runtimeSelection');
    const orchestrator = createAgentOrchestrator({ traceProcessorService });

    expect(orchestrator).not.toBe(claudeRuntime);
    expect((orchestrator as any).engine).toBe(claudeRuntime);
    expect(createClaudeRuntime).toHaveBeenCalledWith(
      traceProcessorService,
      undefined,
      { kind: 'claude-agent-sdk', source: 'default' },
    );
  });

  it('passes the resolved OpenAI provider selection snapshot into the runtime instance', async () => {
    provider = {
      id: 'provider-openai',
      name: 'OpenAI',
      type: 'openai',
      connection: { agentRuntime: 'openai-agents-sdk' },
    };
    const claudeRuntime = createMockOrchestrator('claude');
    const openAIRuntime = createMockOrchestrator('openai');
    const createClaudeRuntime = jest.fn(() => claudeRuntime);
    const createOpenAIRuntime = jest.fn(() => openAIRuntime);
    jest.doMock('../../agentv3', () => ({ createClaudeRuntime }));
    jest.doMock('../../agentOpenAI', () => ({ createOpenAIRuntime }));

    const traceProcessorService = { kind: 'trace-processor' } as any;
    const { createAgentOrchestrator } = await import('../runtimeSelection');
    const orchestrator = createAgentOrchestrator({ traceProcessorService });

    expect(orchestrator).not.toBe(openAIRuntime);
    expect((orchestrator as any).engine).toBe(openAIRuntime);
    expect(createOpenAIRuntime).toHaveBeenCalledWith(
      traceProcessorService,
      {
        kind: 'openai-agents-sdk',
        source: 'provider',
        providerId: 'provider-openai',
        providerName: 'OpenAI',
        providerType: 'openai',
      },
    );
    expect(createClaudeRuntime).not.toHaveBeenCalled();
  });

  it('allows the default AnalysisHarness wrapper to be disabled by env kill switch', async () => {
    process.env.SMARTPERFETTO_ANALYSIS_HARNESS = '0';
    const claudeRuntime = createMockOrchestrator('claude');
    const createClaudeRuntime = jest.fn(() => claudeRuntime);
    jest.doMock('../../agentv3', () => ({ createClaudeRuntime }));

    const traceProcessorService = { kind: 'trace-processor' } as any;
    const { createAgentOrchestrator } = await import('../runtimeSelection');
    const orchestrator = createAgentOrchestrator({ traceProcessorService });

    expect(orchestrator).toBe(claudeRuntime);
    expect(createClaudeRuntime).toHaveBeenCalledWith(
      traceProcessorService,
      undefined,
      { kind: 'claude-agent-sdk', source: 'default' },
    );
  });

  it('creates the hidden experimental runtime behind the default AnalysisHarness wrapper', async () => {
    process.env.SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME = '1';
    process.env.SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME = 'experimental-pi-agent-core';

    const traceProcessorService = { kind: 'trace-processor' } as any;
    const { createAgentOrchestrator } = await import('../runtimeSelection');
    const orchestrator = createAgentOrchestrator({ traceProcessorService, providerId: null });

    expect(orchestrator).not.toBeUndefined();
    expect((orchestrator as any).engine?.constructor?.name).toBe('PiAgentCoreRuntime');
  });

  it('creates the hidden experimental OpenCode runtime behind the default AnalysisHarness wrapper', async () => {
    process.env.SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME = '1';
    process.env.SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME = 'experimental-opencode';

    const traceProcessorService = { kind: 'trace-processor' } as any;
    const { createAgentOrchestrator } = await import('../runtimeSelection');
    const orchestrator = createAgentOrchestrator({ traceProcessorService, providerId: null });

    expect(orchestrator).not.toBeUndefined();
    expect((orchestrator as any).engine?.constructor?.name).toBe('OpenCodeRuntime');
  });

  it('creates the public Pi runtime behind the default AnalysisHarness wrapper', async () => {
    process.env.SMARTPERFETTO_AGENT_RUNTIME = 'pi-agent-core';

    const traceProcessorService = { kind: 'trace-processor' } as any;
    const { createAgentOrchestrator } = await import('../runtimeSelection');
    const orchestrator = createAgentOrchestrator({ traceProcessorService, providerId: null });

    expect(orchestrator).not.toBeUndefined();
    expect((orchestrator as any).engine?.constructor?.name).toBe('PiAgentCoreRuntime');
  });

  it('parses the AnalysisHarness env switch conservatively', async () => {
    const {
      ANALYSIS_HARNESS_ENV,
      isAnalysisHarnessEnabled,
    } = await import('../runtimeSelection');

    expect(isAnalysisHarnessEnabled({})).toBe(true);
    expect(isAnalysisHarnessEnabled({ [ANALYSIS_HARNESS_ENV]: '1' })).toBe(true);
    expect(isAnalysisHarnessEnabled({ [ANALYSIS_HARNESS_ENV]: 'yes' })).toBe(true);
    expect(isAnalysisHarnessEnabled({ [ANALYSIS_HARNESS_ENV]: '0' })).toBe(false);
    expect(isAnalysisHarnessEnabled({ [ANALYSIS_HARNESS_ENV]: ' false ' })).toBe(false);
    expect(isAnalysisHarnessEnabled({ [ANALYSIS_HARNESS_ENV]: 'OFF' })).toBe(false);
  });
});
