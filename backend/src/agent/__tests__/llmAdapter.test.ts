// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { createLLMClient, LLMConfigurationError } from '../llmAdapter';

describe('LLM adapter provider resolution', () => {
  const ENV_KEYS = [
    'SMARTPERFETTO_LLM_PROVIDER',
    'OPENAI_API_KEY',
    'DEEPSEEK_API_KEY',
  ] as const;
  const originalEnv = new Map<string, string | undefined>();

  beforeAll(() => {
    for (const key of ENV_KEYS) {
      originalEnv.set(key, process.env[key]);
    }
  });

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const original = originalEnv.get(key);
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  });

  it('does not default to DeepSeek when no provider credentials are configured', () => {
    expect(() => createLLMClient()).toThrow(LLMConfigurationError);
    expect(() => createLLMClient()).not.toThrow(/provider 'deepseek'/i);
  });

  it('selects OpenAI when only OPENAI_API_KEY is configured', () => {
    process.env.OPENAI_API_KEY = 'sk-test-openai';

    expect(() => createLLMClient()).not.toThrow();
  });

  it('keeps explicit DeepSeek selection for backward compatibility', () => {
    process.env.SMARTPERFETTO_LLM_PROVIDER = 'deepseek';

    expect(() => createLLMClient()).toThrow(/provider 'deepseek'/i);
  });
});
