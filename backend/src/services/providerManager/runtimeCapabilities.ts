// SPDX-License-Identifier: AGPL-3.0-or-later

import type {
  AgentRuntimeKind,
  DualSurfaceProviderType,
  ProviderConfig,
  ProviderType,
} from './types';

export const DUAL_SURFACE_PROVIDER_TYPES: readonly DualSurfaceProviderType[] = [
  'deepseek',
  'glm',
  'qwen',
  'qwen_coding',
  'kimi_code',
  'kimi',
  'doubao',
  'minimax',
  'xiaomi',
  'tencent_token_plan',
  'tencent_coding_plan',
  'hunyuan',
  'qianfan',
  'stepfun',
  'siliconflow',
  'huawei',
];

const CLAUDE_RUNTIME_TYPES: readonly ProviderType[] = [
  'anthropic',
  'bedrock',
  'vertex',
  ...DUAL_SURFACE_PROVIDER_TYPES,
  'custom',
];

const OPENAI_RUNTIME_TYPES: readonly ProviderType[] = [
  'openai',
  'ollama',
  ...DUAL_SURFACE_PROVIDER_TYPES,
  'custom',
];

const PI_AGENT_CORE_RUNTIME_TYPES: readonly ProviderType[] = [
  'custom',
];

const OPENCODE_RUNTIME_TYPES: readonly ProviderType[] = [
  'custom',
];

export function isAgentRuntimeKind(value: unknown): value is AgentRuntimeKind {
  return value === 'claude-agent-sdk'
    || value === 'openai-agents-sdk'
    || value === 'pi-agent-core'
    || value === 'opencode';
}

export function isDualSurfaceProviderType(type: ProviderType): type is DualSurfaceProviderType {
  return DUAL_SURFACE_PROVIDER_TYPES.includes(type as DualSurfaceProviderType);
}

export function supportsAgentRuntimeType(type: ProviderType, runtime: AgentRuntimeKind): boolean {
  if (runtime === 'openai-agents-sdk') return OPENAI_RUNTIME_TYPES.includes(type);
  if (runtime === 'pi-agent-core') return PI_AGENT_CORE_RUNTIME_TYPES.includes(type);
  if (runtime === 'opencode') return OPENCODE_RUNTIME_TYPES.includes(type);
  return CLAUDE_RUNTIME_TYPES.includes(type);
}

export function assertAgentRuntimeSupported(type: ProviderType, runtime?: unknown): asserts runtime is AgentRuntimeKind | undefined {
  if (runtime === undefined || runtime === null) return;
  if (!isAgentRuntimeKind(runtime)) {
    throw new Error(`Invalid agent runtime: ${String(runtime)}`);
  }
  if (!supportsAgentRuntimeType(type, runtime)) {
    throw new Error(`Provider type "${type}" does not support ${runtime}`);
  }
}

export function resolveProviderAgentRuntime(
  provider?: Pick<ProviderConfig, 'type' | 'connection'> | null,
): AgentRuntimeKind {
  const explicitRuntime = provider?.connection.agentRuntime;
  assertAgentRuntimeSupported(provider?.type ?? 'custom', explicitRuntime);
  if (explicitRuntime) return explicitRuntime;

  switch (provider?.type as ProviderType | undefined) {
    case 'openai':
    case 'ollama':
      return 'openai-agents-sdk';
    case 'custom':
      if (
        provider?.connection.openCodeModelJson ||
        provider?.connection.openCodeSdkModulePath
      ) {
        return 'opencode';
      }
      if (
        provider?.connection.openaiProtocol ||
        provider?.connection.openaiBaseUrl ||
        provider?.connection.openaiApiKey
      ) {
        const hasClaudeSurface = Boolean(
          provider.connection.claudeBaseUrl ||
          provider.connection.claudeApiKey ||
          provider.connection.claudeAuthToken,
        );
        return hasClaudeSurface ? 'claude-agent-sdk' : 'openai-agents-sdk';
      }
      return 'claude-agent-sdk';
    case 'anthropic':
    case 'bedrock':
    case 'vertex':
    default:
      return 'claude-agent-sdk';
  }
}

export function sharedKeyShouldUseClaudeAuthToken(type: ProviderType): boolean {
  return [
    'deepseek',
    'qwen',
    'qwen_coding',
    'kimi',
    'doubao',
    'minimax',
    'tencent_token_plan',
    'tencent_coding_plan',
    'hunyuan',
    'qianfan',
    'stepfun',
    'huawei',
  ].includes(type);
}
