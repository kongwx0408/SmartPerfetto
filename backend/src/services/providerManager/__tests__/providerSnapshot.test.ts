// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { promises as fsp } from 'fs';
import os from 'os';
import path from 'path';
import { ProviderService } from '../providerService';
import { resolveProviderRuntimeSnapshot } from '../providerSnapshot';
import type { ProviderCreateInput } from '../types';

function makeTmpDir(): string {
  return path.join(os.tmpdir(), `provider-snapshot-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

describe('provider runtime snapshot hash', () => {
  let dir: string;
  let svc: ProviderService;

  beforeEach(async () => {
    dir = makeTmpDir();
    await fsp.mkdir(dir, { recursive: true });
    svc = new ProviderService(path.join(dir, 'providers.json'));
  });

  afterEach(async () => {
    await fsp.rm(dir, { recursive: true, force: true });
  });

  const openAIProvider: ProviderCreateInput = {
    name: 'OpenAI Provider',
    category: 'official',
    type: 'openai',
    models: { primary: 'gpt-5.2', light: 'gpt-5.2-mini' },
    connection: {
      agentRuntime: 'openai-agents-sdk',
      openaiBaseUrl: 'https://api.openai.example/v1',
      openaiApiKey: 'sk-openai-secret-value',
    },
    tuning: {
      fullPerTurnMs: 120000,
      quickPerTurnMs: 30000,
    },
  };

  it('is stable across activation-only metadata changes', () => {
    const provider = svc.create(openAIProvider);
    const before = resolveProviderRuntimeSnapshot(svc, provider.id).snapshotHash;

    svc.activate(provider.id);

    expect(resolveProviderRuntimeSnapshot(svc, provider.id).snapshotHash).toBe(before);
  });

  it('changes when resolved model or endpoint changes', () => {
    const provider = svc.create(openAIProvider);
    const before = resolveProviderRuntimeSnapshot(svc, provider.id).snapshotHash;

    svc.update(provider.id, {
      models: { primary: 'gpt-5.2-pro' },
      connection: { openaiBaseUrl: 'https://api.changed.example/v1' },
    });

    expect(resolveProviderRuntimeSnapshot(svc, provider.id).snapshotHash).not.toBe(before);
  });

  it('changes when secret material changes without storing plaintext secret', () => {
    const provider = svc.create(openAIProvider);
    const before = resolveProviderRuntimeSnapshot(svc, provider.id);

    svc.update(provider.id, {
      connection: { openaiApiKey: 'sk-openai-secret-value-v2' },
    });
    const after = resolveProviderRuntimeSnapshot(svc, provider.id);

    expect(after.snapshotHash).not.toBe(before.snapshotHash);
    expect(JSON.stringify(before.snapshot)).not.toContain('sk-openai-secret-value');
    expect(JSON.stringify(after.snapshot)).not.toContain('sk-openai-secret-value-v2');
    expect(after.snapshot.environment.OPENAI_API_KEY).toBeUndefined();
  });

  it('ignores OpenAI snapshot fields that the OpenAI runtime does not consume', () => {
    const provider = svc.create(openAIProvider);
    const before = resolveProviderRuntimeSnapshot(svc, provider.id);

    svc.update(provider.id, {
      models: { subAgent: 'ignored-openai-subagent-model' },
      tuning: {
        ...openAIProvider.tuning,
        maxBudgetUsd: 25,
        effort: 'max',
        verifierTimeoutMs: 70000,
        enableSubAgents: true,
        enableVerification: false,
      },
    });

    const after = resolveProviderRuntimeSnapshot(svc, provider.id);
    expect(after.snapshotHash).toBe(before.snapshotHash);
    expect(after.snapshot.resolvedModels.subAgent).toBeUndefined();
    expect(after.snapshot.resolvedTimeouts.verifierTimeoutMs).toBeUndefined();
    expect(after.snapshot.environment.OPENAI_SUB_AGENT_MODEL).toBeUndefined();
    expect(after.snapshot.environment.OPENAI_ENABLE_VERIFICATION).toBeUndefined();
  });

  it('captures OpenCode runtime snapshots without storing model JSON secrets', () => {
    const provider = svc.create({
      name: 'OpenCode Provider',
      category: 'custom',
      type: 'custom',
      models: { primary: 'opencode-primary', light: 'opencode-light' },
      connection: {
        agentRuntime: 'opencode',
        openaiBaseUrl: 'https://api.opencode.example/v1',
        openaiApiKey: 'sk-opencode-openai-secret',
        openCodeModelJson: '{"providerID":"smartperfetto","modelID":"opencode-test","apiKey":"sk-opencode-json-secret"}',
      },
    });

    const before = resolveProviderRuntimeSnapshot(svc, provider.id);
    svc.update(provider.id, {
      connection: {
        openCodeModelJson: '{"providerID":"smartperfetto","modelID":"opencode-test","apiKey":"sk-opencode-json-secret-v2"}',
      },
    });
    const after = resolveProviderRuntimeSnapshot(svc, provider.id);

    expect(before.snapshot.runtimeKind).toBe('opencode');
    expect(before.snapshot.baseUrl).toBe('https://api.opencode.example/v1');
    expect(before.snapshot.resolvedModels).toMatchObject({
      primary: 'opencode-primary',
      light: 'opencode-light',
    });
    expect(before.snapshotHash).not.toBe(after.snapshotHash);
    expect(JSON.stringify(before.snapshot)).not.toContain('sk-opencode-openai-secret');
    expect(JSON.stringify(before.snapshot)).not.toContain('sk-opencode-json-secret');
    expect(before.snapshot.environment.SMARTPERFETTO_OPENCODE_MODEL_JSON).toBeUndefined();
    expect(before.snapshot.environment.OPENAI_API_KEY).toBeUndefined();
  });

  it('captures Pi runtime snapshots without storing model JSON secrets', () => {
    const provider = svc.create({
      name: 'Pi Provider',
      category: 'custom',
      type: 'custom',
      models: { primary: 'pi-primary', light: 'pi-light' },
      connection: {
        agentRuntime: 'pi-agent-core',
        piAgentCoreModelJson: '{"id":"pi-test","provider":"test","apiKey":"sk-pi-json-secret"}',
      },
    });

    const before = resolveProviderRuntimeSnapshot(svc, provider.id);
    svc.update(provider.id, {
      connection: {
        piAgentCoreModelJson: '{"id":"pi-test","provider":"test","apiKey":"sk-pi-json-secret-v2"}',
      },
    });
    const after = resolveProviderRuntimeSnapshot(svc, provider.id);

    expect(before.snapshot.runtimeKind).toBe('pi-agent-core');
    expect(before.snapshot.resolvedModels).toMatchObject({
      primary: 'pi-primary',
      light: 'pi-light',
    });
    expect(before.snapshotHash).not.toBe(after.snapshotHash);
    expect(JSON.stringify(before.snapshot)).not.toContain('sk-pi-json-secret');
    expect(before.snapshot.environment.SMARTPERFETTO_PI_AGENT_CORE_MODEL_JSON).toBeUndefined();
  });
});
