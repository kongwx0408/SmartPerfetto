// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { describe, expect, it, jest } from '@jest/globals';
import { z } from 'zod';
import {
  createClaudeSdkToolFromSharedSpec,
  createJsonSchemaFromZodRawShape,
  normalizeRuntimeToolArgs,
  sharedToolSpecFromClaudeSdkTool,
  stringifyRuntimeToolResult,
  type SharedToolSpec,
} from '../runtimeToolSpec';

function sdkTool(name: string) {
  return {
    name,
    description: `${name} description`,
    inputSchema: {
      q: z.string(),
      params: z.record(z.string(), z.any()).optional().describe('Optional params'),
    },
    annotations: { readOnlyHint: true },
    handler: jest.fn(async (args: Record<string, unknown>, _extra: unknown) => ({
      content: [{ type: 'text' as const, text: JSON.stringify(args) }],
    })),
  };
}

describe('SharedToolSpec', () => {
  it('builds a shared tool body from the existing Claude SDK descriptor shape', async () => {
    const existing = sdkTool('invoke_skill');
    const shared = sharedToolSpecFromClaudeSdkTool(
      'invoke_skill',
      existing,
      'public',
      { summary: 'Invoke a skill', requires: ['traceProcessor'] },
    );

    expect(shared).toMatchObject({
      name: 'invoke_skill',
      description: 'invoke_skill description',
      exposure: 'public',
      summary: 'Invoke a skill',
      requires: ['traceProcessor'],
      annotations: { readOnlyHint: true },
    });
    await shared.handler({ q: 'hello' }, {});
    expect(existing.handler).toHaveBeenCalledWith({ q: 'hello' }, {});
  });

  it('builds a Claude SDK-native descriptor from a shared spec', async () => {
    const existing = sdkTool('execute_sql');
    const shared = sharedToolSpecFromClaudeSdkTool('execute_sql', existing, 'public');
    const claude = createClaudeSdkToolFromSharedSpec(shared);

    expect(claude.name).toBe('execute_sql');
    expect(claude.description).toBe('execute_sql description');
    expect(claude.inputSchema).toBe(shared.inputSchema);
    expect(claude.annotations).toEqual({ readOnlyHint: true });

    const result = await claude.handler({ q: 'select 1' } as any, {});
    expect(result.content[0]).toEqual({
      type: 'text',
      text: '{"q":"select 1"}',
    });
  });

  it('emits adapter-safe JSON Schema from the shared Zod raw shape', () => {
    const schema = createJsonSchemaFromZodRawShape({
      skillId: z.string(),
      params: z.record(z.string(), z.any()).optional().describe('Optional skill parameters'),
    });

    expect(schema.required).toEqual(['skillId']);
    expect((schema.properties as any).skillId).toMatchObject({ type: 'string' });
    expect((schema.properties as any).params).toMatchObject({ type: 'string' });
    expect(JSON.stringify(schema)).not.toContain('propertyNames');
    expect(JSON.stringify(schema)).not.toContain('"additionalProperties":{}');
  });

  it('normalizes JSON container strings and stringifies MCP-style results', () => {
    expect(normalizeRuntimeToolArgs({
      params: '{"enable_startup_details": false}',
      list: ['{"a": 1}', 'plain'],
    })).toEqual({
      params: { enable_startup_details: false },
      list: [{ a: 1 }, 'plain'],
    });
    expect(stringifyRuntimeToolResult({
      content: [
        { type: 'text', text: 'first' },
        { type: 'json', payload: { ok: true } },
      ],
    })).toBe('first\n{"type":"json","payload":{"ok":true}}');
  });

  it('supports a fake third-party adapter without a production runtime value', async () => {
    const handler = jest.fn(async (args: Record<string, unknown>, _extra: unknown) => ({
      content: [{ type: 'text' as const, text: JSON.stringify(args) }],
    }));
    const shared: SharedToolSpec = {
      name: 'third_party_probe',
      description: 'Probe shared tool body',
      exposure: 'public',
      inputSchema: { payload: z.string() },
      handler,
    };
    const fakeThirdPartyAdapter = {
      name: `third-party-test:${shared.name}`,
      schema: createJsonSchemaFromZodRawShape(shared.inputSchema),
      call: async (rawArgs: unknown) => shared.handler(
        normalizeRuntimeToolArgs(rawArgs) as Record<string, unknown>,
        { runtime: 'third-party-test-engine' },
      ),
    };

    const result = await fakeThirdPartyAdapter.call({ payload: '{"nested": true}' });

    expect(fakeThirdPartyAdapter.name).toBe('third-party-test:third_party_probe');
    expect(fakeThirdPartyAdapter.schema).toMatchObject({
      type: 'object',
      properties: { payload: { type: 'string' } },
    });
    expect(handler).toHaveBeenCalledWith(
      { payload: { nested: true } },
      { runtime: 'third-party-test-engine' },
    );
    expect((result.content[0] as any).text).toBe('{"payload":{"nested":true}}');
  });
});
