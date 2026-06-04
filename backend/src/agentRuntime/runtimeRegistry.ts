// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import type { IOrchestrator } from '../agent/core/orchestratorTypes';
import { createClaudeRuntime } from '../agentv3';
import type { AgentRuntimeKind } from '../services/providerManager';
import type { TraceProcessorService } from '../services/traceProcessorService';
import type { RuntimeSelection } from './runtimeSelection';
import type { EngineCapabilities } from './runtimeCapabilities';
import { getProductionEngineCapabilities } from './runtimeCapabilities';
import {
  createPiAgentCoreRuntimeDefinition,
  EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND,
  PI_AGENT_CORE_RUNTIME_KIND,
} from './piAgentCoreRuntime';
import {
  createOpenCodeRuntimeDefinition,
  EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
  OPENCODE_RUNTIME_KIND,
} from './openCodeRuntime';

export interface RuntimeFactoryInput {
  traceProcessorService: TraceProcessorService;
  selection: RuntimeSelection<string>;
}

export interface RuntimeEngineDefinition {
  kind: string;
  capabilities: EngineCapabilities;
  createOrchestrator(input: RuntimeFactoryInput): IOrchestrator;
}

export class RuntimeRegistry {
  private readonly definitions = new Map<string, RuntimeEngineDefinition>();

  constructor(definitions: readonly RuntimeEngineDefinition[] = []) {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  register(definition: RuntimeEngineDefinition): void {
    if (definition.kind !== definition.capabilities.kind) {
      throw new Error(
        `Runtime registration mismatch: ${definition.kind} != ${definition.capabilities.kind}`,
      );
    }
    if (this.definitions.has(definition.kind)) {
      throw new Error(`Runtime already registered: ${definition.kind}`);
    }
    this.definitions.set(definition.kind, definition);
  }

  has(kind: string): boolean {
    return this.definitions.has(kind);
  }

  get(kind: string): RuntimeEngineDefinition | undefined {
    return this.definitions.get(kind);
  }

  require(kind: string): RuntimeEngineDefinition {
    const definition = this.get(kind);
    if (!definition) {
      throw new Error(`Unsupported agent runtime: ${kind}`);
    }
    return definition;
  }

  getCapabilities(kind: string): EngineCapabilities {
    return this.require(kind).capabilities;
  }

  createOrchestrator(kind: string, input: RuntimeFactoryInput): IOrchestrator {
    return this.require(kind).createOrchestrator(input);
  }

  listRuntimeKinds(): string[] {
    return Array.from(this.definitions.keys());
  }
}

const productionRuntimeDefinitions: readonly RuntimeEngineDefinition[] = [
  {
    kind: 'claude-agent-sdk',
    capabilities: getProductionEngineCapabilities('claude-agent-sdk'),
    createOrchestrator: ({ traceProcessorService, selection }) => (
      createClaudeRuntime(
        traceProcessorService,
        undefined,
        selection as RuntimeSelection<AgentRuntimeKind>,
      )
    ),
  },
  {
    kind: 'openai-agents-sdk',
    capabilities: getProductionEngineCapabilities('openai-agents-sdk'),
    createOrchestrator: ({ traceProcessorService, selection }) => {
      // Lazy import keeps the OpenAI runtime isolated from Claude-only startup
      // paths and avoids circular imports while both SDKs remain first-class.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createOpenAIRuntime } = require('../agentOpenAI') as typeof import('../agentOpenAI');
      return createOpenAIRuntime(
        traceProcessorService,
        selection as RuntimeSelection<AgentRuntimeKind>,
      );
    },
  },
  {
    kind: PI_AGENT_CORE_RUNTIME_KIND,
    capabilities: getProductionEngineCapabilities(PI_AGENT_CORE_RUNTIME_KIND),
    createOrchestrator: (input) => createPiAgentCoreRuntimeDefinition(PI_AGENT_CORE_RUNTIME_KIND)
      .createOrchestrator(input),
  },
  {
    kind: OPENCODE_RUNTIME_KIND,
    capabilities: getProductionEngineCapabilities(OPENCODE_RUNTIME_KIND),
    createOrchestrator: (input) => createOpenCodeRuntimeDefinition(OPENCODE_RUNTIME_KIND)
      .createOrchestrator(input),
  },
];

export function createRuntimeRegistry(
  definitions: readonly RuntimeEngineDefinition[] = [],
): RuntimeRegistry {
  return new RuntimeRegistry(definitions);
}

export function createProductionRuntimeRegistry(): RuntimeRegistry {
  return createRuntimeRegistry(productionRuntimeDefinitions);
}

export const productionRuntimeRegistry = createProductionRuntimeRegistry();

export function createRuntimeRegistryForSelection(kind: string): RuntimeRegistry {
  if (kind === EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND) {
    return createRuntimeRegistry([
      ...productionRuntimeDefinitions,
      createPiAgentCoreRuntimeDefinition(EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND),
    ]);
  }
  if (kind === EXPERIMENTAL_OPENCODE_RUNTIME_KIND) {
    return createRuntimeRegistry([
      ...productionRuntimeDefinitions,
      createOpenCodeRuntimeDefinition(EXPERIMENTAL_OPENCODE_RUNTIME_KIND),
    ]);
  }
  return productionRuntimeRegistry;
}
