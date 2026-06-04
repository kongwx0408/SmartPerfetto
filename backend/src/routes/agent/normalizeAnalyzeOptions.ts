// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import type { CodeAwareMode } from '../../services/codebase/codeAwareFeature';
import type { SelectionContext } from '../../agentv3/types';
import type {
  SceneAnalysisSelection,
  SceneAnalysisSelectionScope,
} from '../../agent/scene/types';

export type AnalyzeEndpointKind = '/analyze' | '/sessions/:id/runs';
export type AnalyzePreset = 'smart';
export type AnalyzeMode = 'fast' | 'full' | 'auto';
export type SmartAnalyzeAction = 'preview' | 'analyze';

export interface NormalizedAnalyzeOptions {
  analysisMode: AnalyzeMode;
  preset?: AnalyzePreset;
  codeAwareMode?: CodeAwareMode;
  codebaseIds?: string[];
  generateTracks?: boolean;
  forceRefresh?: boolean;
  selectionContext?: SelectionContext;
  blockedStrategyIds?: string[];
  maxRounds?: number;
  confidenceThreshold?: number;
  maxNoProgressRounds?: number;
  maxFailureRounds?: number;
  maxConcurrentTasks?: number;
  taskTimeoutMs?: number;
  packageName?: string;
  timeRange?: unknown;
  adb?: unknown;
  estimatedSqlMs?: number;
  heavySkill?: boolean;
  longTask?: boolean;
  traceSizeBytes?: number;
  smartAction?: SmartAnalyzeAction;
  smartSelection?: SceneAnalysisSelection;
}

export class AnalyzeOptionsError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly httpStatus = 400,
  ) {
    super(message);
    this.name = 'AnalyzeOptionsError';
  }
}

export function normalizeAnalyzeOptions(
  rawOptions: unknown,
  ctx: {
    endpoint: AnalyzeEndpointKind;
    hasReferenceTraceId: boolean;
  },
): NormalizedAnalyzeOptions {
  const raw = rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)
    ? rawOptions as Record<string, unknown>
    : {};

  const analysisMode = normalizeAnalysisMode(raw.analysisMode);
  const preset = normalizePreset(raw.preset);
  if (preset === 'smart' && ctx.hasReferenceTraceId) {
    throw new AnalyzeOptionsError(
      '智能分析暂不支持双 trace 对比',
      'SMART_COMPARISON_UNSUPPORTED',
    );
  }
  if (preset === 'smart' && ctx.endpoint === '/sessions/:id/runs') {
    throw new AnalyzeOptionsError(
      '智能分析仅支持新会话，不能作为已有会话的后续轮次运行',
      'SMART_CONTINUATION_UNSUPPORTED',
    );
  }

  const normalized: NormalizedAnalyzeOptions = { analysisMode };
  if (preset) normalized.preset = preset;
  const smartAction = normalizeSmartAction(raw.smartAction, preset);
  if (smartAction) {
    normalized.smartAction = smartAction;
    if (smartAction === 'analyze') {
      normalized.smartSelection = normalizeSmartSelection(raw.smartSelection);
    }
  } else if (raw.smartSelection !== undefined) {
    throw new AnalyzeOptionsError(
      'smartSelection requires preset=smart',
      'SMART_SELECTION_REQUIRES_SMART_PRESET',
    );
  }

  const codeAwareMode = normalizeCodeAwareMode(raw.codeAwareMode);
  if (codeAwareMode) normalized.codeAwareMode = codeAwareMode;

  const codebaseIds = normalizeStringArray(raw.codebaseIds);
  if (codebaseIds.length > 0) normalized.codebaseIds = codebaseIds;

  const blockedStrategyIds = normalizeStringArray(raw.blockedStrategyIds);
  if (blockedStrategyIds.length > 0) normalized.blockedStrategyIds = blockedStrategyIds;

  copyBoolean(raw, normalized, 'generateTracks');
  copyBoolean(raw, normalized, 'forceRefresh');
  copyBoolean(raw, normalized, 'heavySkill');
  copyBoolean(raw, normalized, 'longTask');
  copyNumber(raw, normalized, 'maxRounds');
  copyNumber(raw, normalized, 'confidenceThreshold');
  copyNumber(raw, normalized, 'maxNoProgressRounds');
  copyNumber(raw, normalized, 'maxFailureRounds');
  copyNumber(raw, normalized, 'maxConcurrentTasks');
  copyNumber(raw, normalized, 'taskTimeoutMs');
  copyNumber(raw, normalized, 'estimatedSqlMs');
  copyNumber(raw, normalized, 'traceSizeBytes');
  copyString(raw, normalized, 'packageName');

  if (raw.selectionContext && typeof raw.selectionContext === 'object') {
    normalized.selectionContext = raw.selectionContext as SelectionContext;
  }
  if (raw.timeRange && typeof raw.timeRange === 'object') {
    normalized.timeRange = raw.timeRange;
  }
  if (raw.adb && typeof raw.adb === 'object') {
    normalized.adb = raw.adb;
  }

  return normalized;
}

function normalizeAnalysisMode(value: unknown): AnalyzeMode {
  return value === 'fast' || value === 'full' || value === 'auto'
    ? value
    : 'auto';
}

function normalizePreset(value: unknown): AnalyzePreset | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === 'smart') return 'smart';
  throw new AnalyzeOptionsError(
    `Unsupported analyze preset: ${String(value)}`,
    'UNSUPPORTED_ANALYZE_PRESET',
  );
}

function normalizeSmartAction(
  value: unknown,
  preset: AnalyzePreset | undefined,
): SmartAnalyzeAction | undefined {
  if (!preset) {
    if (value === undefined || value === null || value === '') return undefined;
    throw new AnalyzeOptionsError(
      'smartAction requires preset=smart',
      'SMART_ACTION_REQUIRES_SMART_PRESET',
    );
  }

  if (value === undefined || value === null || value === '') return 'preview';
  if (value === 'preview' || value === 'analyze') return value;
  throw new AnalyzeOptionsError(
    `Unsupported smartAction: ${String(value)}`,
    'UNSUPPORTED_SMART_ACTION',
  );
}

function normalizeSmartSelection(value: unknown): SceneAnalysisSelection {
  if (value === undefined || value === null || value === '') {
    return { scope: 'all' };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AnalyzeOptionsError(
      'smartSelection must be an object',
      'INVALID_SMART_SELECTION',
    );
  }

  const raw = value as Record<string, unknown>;
  const scope = normalizeSmartSelectionScope(raw.scope);
  const label = normalizeOptionalString(raw.label, 80);
  const reportId = normalizeOptionalString(raw.reportId, 128);
  const sceneSnapshotId = normalizeOptionalString(raw.sceneSnapshotId, 128);
  const common = {
    ...(label ? { label } : {}),
    ...(reportId ? { reportId } : {}),
    ...(sceneSnapshotId ? { sceneSnapshotId } : {}),
  };
  if (scope === 'all') {
    return { scope, ...common };
  }

  if (scope === 'scene_types') {
    const sceneTypes = normalizeStringArray(raw.sceneTypes).slice(0, 64);
    if (sceneTypes.length === 0) {
      throw new AnalyzeOptionsError(
        'smartSelection.sceneTypes is required for scene_types scope',
        'INVALID_SMART_SELECTION',
      );
    }
    return { scope, sceneTypes, ...common };
  }

  const sceneIds = normalizeStringArray(raw.sceneIds).slice(0, 128);
  if (sceneIds.length === 0) {
    throw new AnalyzeOptionsError(
      'smartSelection.sceneIds is required for scene_ids scope',
      'INVALID_SMART_SELECTION',
    );
  }
  return { scope, sceneIds, ...common };
}

function normalizeSmartSelectionScope(value: unknown): SceneAnalysisSelectionScope {
  if (value === 'all' || value === 'scene_types' || value === 'scene_ids') {
    return value;
  }
  throw new AnalyzeOptionsError(
    `Unsupported smartSelection.scope: ${String(value)}`,
    'INVALID_SMART_SELECTION',
  );
}

function normalizeCodeAwareMode(value: unknown): CodeAwareMode | undefined {
  if (value === 'off' || value === 'metadata_only' || value === 'provider_send') {
    return value;
  }
  return undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const text = item.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function copyBoolean(
  raw: Record<string, unknown>,
  out: NormalizedAnalyzeOptions,
  key: keyof NormalizedAnalyzeOptions & string,
): void {
  if (typeof raw[key] === 'boolean') {
    (out as any)[key] = raw[key];
  }
}

function copyNumber(
  raw: Record<string, unknown>,
  out: NormalizedAnalyzeOptions,
  key: keyof NormalizedAnalyzeOptions & string,
): void {
  const value = raw[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    (out as any)[key] = value;
  }
}

function copyString(
  raw: Record<string, unknown>,
  out: NormalizedAnalyzeOptions,
  key: keyof NormalizedAnalyzeOptions & string,
): void {
  const value = raw[key];
  if (typeof value === 'string' && value.trim()) {
    (out as any)[key] = value.trim();
  }
}

function normalizeOptionalString(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text) return undefined;
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}
