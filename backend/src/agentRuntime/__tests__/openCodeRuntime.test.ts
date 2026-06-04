// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { describe, expect, it, jest } from '@jest/globals';
import {
  EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
  OpenCodeRuntime,
  createOpenCodeHardenedConfig,
  createOpenCodeStandaloneMcpConfig,
  createOpenCodeStandaloneMcpToolNames,
  createOpenCodeToolAllowlist,
  dispatchOpenCodeBridgeRequest,
  extractOpenCodeAssistantText,
  getOpenCodePlanCompletionStatus,
  getOpenCodeEngineCapabilities,
  getOpenCodeRuntimeDiagnostics,
  projectOpenCodeEventToStreamingUpdate,
  runOpenCodePrompt,
  type OpenCodeSdkModuleLoader,
} from '../openCodeRuntime';
import type { RuntimeFactoryInput } from '../runtimeRegistry';

function createFakeRuntimeInput(): RuntimeFactoryInput {
  return {
    traceProcessorService: {} as any,
    selection: {
      kind: EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
      source: 'env',
    },
  };
}

function createFakeModuleLoader(record: {
  createOptions?: Record<string, unknown>;
  promptInput?: unknown;
  closeCount: number;
}): OpenCodeSdkModuleLoader {
  return jest.fn(async () => ({
    createOpencode: jest.fn(async (options?: Record<string, unknown>) => {
      record.createOptions = options;
      return {
        server: {
          url: 'http://127.0.0.1:4106',
          close: jest.fn(() => {
            record.closeCount += 1;
          }),
        },
        client: {
          session: {
            create: jest.fn(async () => ({ data: { id: 'ses-opencode-test' } })),
            prompt: jest.fn(async (input: unknown) => {
              record.promptInput = input;
              return { data: { info: { role: 'user' }, parts: [] } };
            }),
          },
        },
      };
    }),
  }));
}

describe('experimental OpenCode runtime contract', () => {
  it('describes OpenCode as hidden, server-backed, JSON Schema, and no shell/file tools', () => {
    expect(getOpenCodeEngineCapabilities()).toMatchObject({
      kind: EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
      production: false,
      publicRuntime: false,
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
      supportsProviderRuntimePinning: false,
    });
  });

  it('hardens OpenCode config and disables dangerous built-in tools', () => {
    const config = createOpenCodeHardenedConfig(['smartperfetto_query_trace']);

    expect(config).toMatchObject({
      autoupdate: false,
      share: 'disabled',
      snapshot: false,
      instructions: [],
      mcp: {},
      lsp: false,
      formatter: false,
      permission: {
        edit: 'deny',
        bash: 'deny',
        webfetch: 'deny',
        external_directory: 'deny',
      },
    });
    expect(config.tools).toMatchObject({
      bash: false,
      read: false,
      grep: false,
      glob: false,
      edit: false,
      write: false,
      apply_patch: false,
      webfetch: false,
      websearch: false,
      skill: false,
      todowrite: false,
      question: false,
      smartperfetto_query_trace: true,
    });
    expect((config.agent as any).smartperfetto.tools).toMatchObject(
      config.tools as Record<string, unknown>,
    );
  });

  it('adds standalone public MCP only behind the hidden OpenCode MCP gate', () => {
    expect(createOpenCodeStandaloneMcpConfig({})).toEqual({});

    const config = createOpenCodeHardenedConfig([], {
      SMARTPERFETTO_OPENCODE_ENABLE_STANDALONE_MCP: '1',
      SMARTPERFETTO_OPENCODE_MCP_COMMAND_JSON: '["/usr/bin/node","/tmp/smartperfetto-mcp.js"]',
      SMARTPERFETTO_OPENCODE_MCP_TIMEOUT_MS: '7777',
    });

    expect(config.mcp).toEqual({
      smartperfetto: {
        type: 'local',
        enabled: true,
        timeout: 7777,
        command: ['/usr/bin/node', '/tmp/smartperfetto-mcp.js'],
        environment: {
          SMARTPERFETTO_STANDALONE_MCP: '1',
        },
      },
    });
    expect(config.tools).toMatchObject({
      bash: false,
      read: false,
      edit: false,
      write: false,
      apply_patch: false,
      lookup_blog_knowledge: true,
      smartperfetto_lookup_blog_knowledge: true,
      mcp__smartperfetto__lookup_blog_knowledge: true,
    });
  });

  it('enumerates conservative standalone MCP tool-name variants for OpenCode', () => {
    expect(createOpenCodeStandaloneMcpToolNames()).toEqual(
      expect.arrayContaining([
        'lookup_blog_knowledge',
        'smartperfetto_lookup_blog_knowledge',
        'mcp__smartperfetto__lookup_blog_knowledge',
        'recall_similar_case',
        'smartperfetto_recall_similar_case',
        'mcp__smartperfetto__recall_similar_case',
      ]),
    );
  });

  it('builds per-request tool allowlists by denying built-ins first', () => {
    expect(createOpenCodeToolAllowlist(['smartperfetto_query_trace'])).toMatchObject({
      bash: false,
      edit: false,
      write: false,
      read: false,
      apply_patch: false,
      smartperfetto_query_trace: true,
    });
  });

  it('extracts final assistant text without leaking user prompts or reasoning', () => {
    const response = {
      data: [
        {
          info: { role: 'user' },
          parts: [{ type: 'text', text: '用户原始问题，不应作为报告' }],
        },
        {
          info: { role: 'assistant' },
          parts: [
            { type: 'step-start' },
            { type: 'reasoning', text: 'internal reasoning should not leak' },
            { type: 'text', text: '最终报告正文' },
            { type: 'step-finish' },
          ],
        },
      ],
    };

    expect(extractOpenCodeAssistantText(response)).toBe('最终报告正文');
  });

  it('prefers a full assistant report over a later short assistant summary', () => {
    const fullReport = [
      '# 启动性能分析报告',
      '',
      '## 结论',
      '这是 OpenCode 生成的完整报告正文。',
      '',
      '## 证据',
      '- smartperfetto_query_trace 返回了启动阶段证据。',
      '',
      '## 建议',
      '继续保留完整证据链。',
    ].join('\n');
    const response = {
      data: [
        {
          info: { role: 'assistant', finish: 'stop' },
          parts: [{ type: 'text', text: fullReport }],
        },
        {
          info: { role: 'assistant', finish: 'stop' },
          parts: [{ type: 'text', text: '分析完成，完整报告已经生成。' }],
        },
      ],
    };

    expect(extractOpenCodeAssistantText(response)).toBe(fullReport);
  });

  it('uses OpenCode promptAsync and polls completed assistant messages', async () => {
    const promptAsync = jest.fn(async (_input?: unknown) => ({ response: { status: 204 } }));
    const messages = jest.fn(async (_input?: unknown) => ({
      data: [
        {
          info: { role: 'assistant', finish: 'stop' },
          parts: [{ type: 'text', text: '异步最终报告' }],
        },
      ],
    }));
    const result = await runOpenCodePrompt({
      client: {
        session: {
          prompt: jest.fn(),
          promptAsync,
          messages,
        },
      },
      server: { url: 'http://127.0.0.1:4106', close: jest.fn() },
    } as any, {
      path: { id: 'ses-opencode' },
      query: { directory: '/tmp/project' },
      body: { parts: [{ type: 'text', text: '分析启动性能' }] },
    }, {
      sessionId: 'ses-opencode',
      projectDir: '/tmp/project',
      timeoutMs: 5_000,
    });

    expect(promptAsync).toHaveBeenCalledTimes(1);
    expect(messages).toHaveBeenCalledWith({
      path: { id: 'ses-opencode' },
      query: { directory: '/tmp/project', limit: 50, order: 'asc' },
    });
    expect(extractOpenCodeAssistantText(result.messagesResponse)).toBe('异步最终报告');
  });

  it('emits SmartPerfetto tool dispatch and response events from the OpenCode MCP bridge', async () => {
    const updates: any[] = [];
    const response = await dispatchOpenCodeBridgeRequest([
      {
        name: 'smartperfetto_query_trace',
        exposure: 'internal',
        tool: {},
        shared: {
          name: 'smartperfetto_query_trace',
          description: 'Run a trace query',
          exposure: 'internal',
          inputSchema: {},
          handler: jest.fn(async (args: Record<string, unknown>) => ({
            content: [{ type: 'text', text: `ran ${args.sql}` }],
          })),
        },
      } as any,
    ], {
      jsonrpc: '2.0',
      id: 'tool-call-1',
      method: 'tools/call',
      params: {
        name: 'mcp__smartperfetto__smartperfetto_query_trace',
        arguments: { sql: 'select 1' },
      },
    }, update => updates.push(update));

    expect(response).toMatchObject({
      jsonrpc: '2.0',
      id: 'tool-call-1',
      result: {
        content: [{ type: 'text', text: 'ran select 1' }],
      },
    });
    expect(updates).toEqual([
      expect.objectContaining({
        type: 'agent_task_dispatched',
        content: expect.objectContaining({
          taskId: 'tool-call-1',
          toolName: 'smartperfetto_query_trace',
          args: { sql: 'select 1' },
        }),
      }),
      expect.objectContaining({
        type: 'agent_response',
        content: expect.objectContaining({
          taskId: 'tool-call-1',
          result: 'ran select 1',
        }),
      }),
    ]);
  });

  it('treats completed and skipped OpenCode plan phases as closed', () => {
    expect(getOpenCodePlanCompletionStatus({
      phases: [
        { id: 'p1', status: 'completed' },
        { id: 'p2', status: 'skipped' },
      ],
    } as any)).toEqual({ complete: true, pending: [] });

    expect(getOpenCodePlanCompletionStatus({
      phases: [
        { id: 'p1', status: 'completed' },
        { id: 'p2', status: 'in_progress' },
      ],
    } as any)).toEqual({ complete: false, pending: ['p2'] });
  });

  it('projects OpenCode events without synthesizing route terminal events', () => {
    expect(projectOpenCodeEventToStreamingUpdate({
      name: 'session.next.text.delta.1',
      data: { delta: 'hello' },
    }, 10)).toEqual({
      type: 'answer_token',
      content: 'hello',
      timestamp: 10,
    });
    expect(projectOpenCodeEventToStreamingUpdate({
      name: 'session.next.tool.called.1',
      data: {
        tool: 'smartperfetto_query_trace',
        callID: 'call-1',
        input: { sql: 'select 1' },
      },
    }, 11)).toMatchObject({
      type: 'tool_call',
      content: {
        name: 'smartperfetto_query_trace',
        callId: 'call-1',
        runtime: EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
      },
      timestamp: 11,
    });
    expect(projectOpenCodeEventToStreamingUpdate({
      name: 'session.next.tool.failed.1',
      data: { tool: 'bash', error: { message: 'denied' } },
    }, 12)).toMatchObject({
      type: 'degraded',
      content: {
        source: EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
        reason: 'tool_failed',
        tool: 'bash',
      },
      timestamp: 12,
    });
    expect(projectOpenCodeEventToStreamingUpdate({
      name: 'analysis_completed',
      data: {},
    })).toBeUndefined();
  });

  it('runs hidden no-reply smoke with isolated config and closes the server', async () => {
    const record: { createOptions?: Record<string, unknown>; promptInput?: unknown; closeCount: number } = {
      closeCount: 0,
    };
    const runtime = new OpenCodeRuntime(createFakeRuntimeInput(), {
      env: {
        SMARTPERFETTO_OPENCODE_SERVER_PORT: '4106',
        SMARTPERFETTO_OPENCODE_SERVER_TIMEOUT_MS: '12345',
      },
      moduleLoader: createFakeModuleLoader(record),
    });
    const updates: unknown[] = [];
    runtime.on('update', update => updates.push(update));

    const result = await runtime.analyze(
      '分析启动性能',
      'session-opencode',
      'trace-opencode',
      { analysisMode: 'full', packageName: 'com.example' },
    );

    expect(result).toMatchObject({
      success: true,
      partial: true,
      terminationReason: 'plan_incomplete',
    });
    expect(result.conclusion).toContain('OpenCode hidden runtime smoke completed');
    expect(record.closeCount).toBe(1);
    expect(record.createOptions).toMatchObject({
      hostname: '127.0.0.1',
      port: 4106,
      timeout: 12345,
      config: expect.objectContaining({
        share: 'disabled',
        snapshot: false,
        instructions: [],
        mcp: {},
      }),
    });
    expect(record.promptInput).toMatchObject({
      path: { id: 'ses-opencode-test' },
      body: {
        noReply: true,
        tools: expect.objectContaining({
          bash: false,
          edit: false,
          write: false,
          apply_patch: false,
        }),
      },
    });
    expect(updates).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'progress' }),
      expect.objectContaining({ type: 'conclusion' }),
    ]));
  });

  it('reports hidden runtime diagnostics without exposing a public provider', () => {
    expect(getOpenCodeRuntimeDiagnostics({
      SMARTPERFETTO_OPENCODE_SDK_MODULE_PATH: '/tmp/sdk.js',
      SMARTPERFETTO_OPENCODE_PROJECT_DIR: '/tmp/project',
      SMARTPERFETTO_OPENCODE_SERVER_PORT: '4107',
      SMARTPERFETTO_OPENCODE_SERVER_TIMEOUT_MS: '5000',
    }, EXPERIMENTAL_OPENCODE_RUNTIME_KIND)).toMatchObject({
      configured: true,
      runtime: EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
      experimental: true,
      package: '@opencode-ai/sdk',
      cliPackage: 'opencode-ai',
      modulePath: '/tmp/sdk.js',
      projectDir: '/tmp/project',
      serverPort: 4107,
      serverTimeoutMs: 5000,
      standaloneMcpEnabled: false,
      standaloneMcpTimeoutMs: 5000,
    });
  });

  it('reports public OpenCode diagnostics by default for M14 provider checks', () => {
    expect(getOpenCodeRuntimeDiagnostics({
      PATH: '/usr/bin',
      SMARTPERFETTO_OPENCODE_MODEL_JSON: '{"providerID":"smartperfetto","modelID":"test-model"}',
    })).toMatchObject({
      configured: true,
      runtime: 'opencode',
      experimental: false,
      modelConfigured: true,
      package: '@opencode-ai/sdk',
      cliPackage: 'opencode-ai',
    });
  });
});
