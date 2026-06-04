// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

export {
  createAgentOrchestrator,
  resolveAgentRuntimeSelection,
  type BackendAgentRuntimeKind,
  type CreateAgentOrchestratorInput,
  type RuntimeSelection,
} from './runtimeSelection';
export {
  createAnalysisRunSpec,
  type AnalysisRunSpec,
  type CreateAnalysisRunSpecInput,
  type RuntimeBudgetInputs,
} from './analysisRunSpec';
export {
  getProductionEngineCapabilities,
  isProductionAgentRuntimeKind,
  listProductionRuntimeKinds,
  type EngineCapabilities,
  type RuntimeClassifierPolicy,
  type RuntimeContinuationPolicy,
} from './runtimeCapabilities';
export {
  RuntimeRegistry,
  createProductionRuntimeRegistry,
  createRuntimeRegistry,
  productionRuntimeRegistry,
  type RuntimeEngineDefinition,
  type RuntimeFactoryInput,
} from './runtimeRegistry';
export {
  EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
  OPENCODE_PROJECT_DIR_ENV,
  OPENCODE_SDK_MODULE_PATH_ENV,
  OPENCODE_SERVER_PORT_ENV,
  OPENCODE_SERVER_TIMEOUT_MS_ENV,
  OpenCodeRuntime,
  createOpenCodeHardenedConfig,
  createOpenCodeRuntimeDefinition,
  createOpenCodeToolAllowlist,
  getOpenCodeEngineCapabilities,
  getOpenCodeRuntimeDiagnostics,
  projectOpenCodeEventToStreamingUpdate,
  type ExperimentalOpenCodeRuntimeKind,
  type OpenCodeEvent,
  type OpenCodeRuntimeOptions,
  type OpenCodeSdkModuleLoader,
} from './openCodeRuntime';
export {
  SDK_SESSION_FRESHNESS_MS,
  buildEntityContext,
  buildQuickConversationContext,
  buildRuntimeSessionMapKey,
  captureSkillDisplayEntities,
  collectRecentFindings,
  createRuntimeSkillNotesBudget,
  formatTraceContext,
  getLruCacheEntry,
  isFreshRuntimeEntry,
  knowledgeScopeFromAnalysisOptions,
  providerScopeFromAnalysisOptions,
  setLruCacheEntry,
  toProtocolHypothesis,
} from './runtimeCommon';
