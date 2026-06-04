// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import type { AnalysisOptions } from '../agent/core/orchestratorTypes';
import type { ConversationTurn } from '../agent/types';
import { buildComplexityClassifierInput } from '../agentv3/queryComplexityContext';
import type { SceneType } from '../agentv3/sceneClassifier';
import type { ComplexityClassifierInput, QueryComplexity, SelectionContext } from '../agentv3/types';
import type { OutputLanguage } from '../agentv3/outputLanguage';
import { normalizeCodeAwareMode, type CodeAwareMode } from '../services/codebase/codeAwareFeature';
import type { KnowledgeScope } from '../services/scopedKnowledgeStore';
import type { ProviderScope } from '../services/providerManager';
import type { RuntimeSelection } from './runtimeSelection';
import type {
  EngineCapabilities,
  RuntimeClassifierPolicy,
  RuntimeContinuationPolicy,
} from './runtimeCapabilities';
import { getProductionEngineCapabilities } from './runtimeCapabilities';
import {
  buildRuntimeSessionMapKey,
  formatTraceContext,
  knowledgeScopeFromAnalysisOptions,
  providerScopeFromAnalysisOptions,
} from './runtimeCommon';

export interface RuntimeBudgetInputs {
  model?: string;
  lightModel?: string;
  maxTurns?: number;
  quickMaxTurns?: number;
  maxBudgetUsd?: number;
  maxOutputTokens?: number;
  fullPathPerTurnMs?: number;
  quickPathPerTurnMs?: number;
  classifierTimeoutMs?: number;
  verifierTimeoutMs?: number;
}

export interface AnalysisRunSpec {
  identity: {
    sessionId: string;
    traceId: string;
    referenceTraceId?: string;
    sessionMapKey: string;
  };
  query: {
    text: string;
  };
  runtime: {
    kind: string;
    selection: RuntimeSelection<string>;
    capabilities: EngineCapabilities;
  };
  scopes: {
    provider?: ProviderScope;
    knowledge?: KnowledgeScope;
    providerId?: string | null;
  };
  outputLanguage: OutputLanguage;
  scene: {
    type: SceneType;
  };
  mode: {
    requested: NonNullable<AnalysisOptions['analysisMode']>;
    resolved?: QueryComplexity;
    classifierPolicy: RuntimeClassifierPolicy;
    classifierInput: ComplexityClassifierInput;
  };
  traceContext: {
    datasetCount: number;
    promptSection: string;
  };
  selection: {
    present: boolean;
    kind?: SelectionContext['kind'];
    context?: SelectionContext;
  };
  tools: {
    requestScope: {
      sessionId: string;
      hasCodebaseAccess: boolean;
    };
    codeAwareMode: CodeAwareMode;
    codebaseIds: string[];
  };
  continuationPolicy: RuntimeContinuationPolicy;
  budget: RuntimeBudgetInputs;
}

export interface CreateAnalysisRunSpecInput {
  query: string;
  sessionId: string;
  traceId: string;
  options?: AnalysisOptions;
  runtimeSelection: RuntimeSelection<string>;
  engineCapabilities?: EngineCapabilities;
  sceneType: SceneType;
  outputLanguage: OutputLanguage;
  previousTurns?: ConversationTurn[];
  resolvedMode?: QueryComplexity;
  budget?: RuntimeBudgetInputs;
}

function compactCodebaseIds(ids: string[] | undefined): string[] {
  return Array.from(new Set(ids ?? [])).filter(Boolean);
}

function resolveEngineCapabilities(input: CreateAnalysisRunSpecInput): EngineCapabilities {
  const capabilities = input.engineCapabilities
    ?? getProductionEngineCapabilities(input.runtimeSelection.kind);
  if (capabilities.kind !== input.runtimeSelection.kind) {
    throw new Error(
      `Runtime capability mismatch: ${input.runtimeSelection.kind} != ${capabilities.kind}`,
    );
  }
  return capabilities;
}

export function createAnalysisRunSpec(input: CreateAnalysisRunSpecInput): AnalysisRunSpec {
  const options = input.options ?? {};
  const engineCapabilities = resolveEngineCapabilities(input);
  const codeAwareMode = normalizeCodeAwareMode(options.codeAwareMode);
  const codebaseIds = compactCodebaseIds(options.codebaseIds);
  const providerScope = providerScopeFromAnalysisOptions(options);
  const knowledgeScope = knowledgeScopeFromAnalysisOptions(options);
  const classifierInput = buildComplexityClassifierInput({
    query: input.query,
    sceneType: input.sceneType,
    selectionContext: options.selectionContext,
    hasReferenceTrace: !!options.referenceTraceId,
    previousTurns: input.previousTurns ?? [],
  });
  const traceContextPrompt = formatTraceContext(options.traceContext, input.outputLanguage);

  return {
    identity: {
      sessionId: input.sessionId,
      traceId: input.traceId,
      referenceTraceId: options.referenceTraceId,
      sessionMapKey: buildRuntimeSessionMapKey(input.sessionId, options.referenceTraceId),
    },
    query: {
      text: input.query,
    },
    runtime: {
      kind: input.runtimeSelection.kind,
      selection: input.runtimeSelection,
      capabilities: engineCapabilities,
    },
    scopes: {
      provider: providerScope,
      knowledge: knowledgeScope,
      providerId: options.providerId,
    },
    outputLanguage: input.outputLanguage,
    scene: {
      type: input.sceneType,
    },
    mode: {
      requested: options.analysisMode ?? 'auto',
      resolved: input.resolvedMode,
      classifierPolicy: engineCapabilities.classifierPolicy,
      classifierInput,
    },
    traceContext: {
      datasetCount: options.traceContext?.length ?? 0,
      promptSection: traceContextPrompt,
    },
    selection: {
      present: !!options.selectionContext,
      kind: options.selectionContext?.kind,
      context: options.selectionContext,
    },
    tools: {
      requestScope: {
        sessionId: input.sessionId,
        hasCodebaseAccess: codeAwareMode !== 'off' && codebaseIds.length > 0,
      },
      codeAwareMode,
      codebaseIds,
    },
    continuationPolicy: engineCapabilities.continuationPolicy,
    budget: input.budget ?? {},
  };
}
