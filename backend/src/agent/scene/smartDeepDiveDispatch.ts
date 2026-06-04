// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import type { TraceDataset } from '../core/orchestratorTypes';
import type { SelectionContext } from '../../agentv3/types';
import { selectAnalysisEligibleScenes } from './sceneIntervalBuilder';
import type {
  DisplayedScene,
  SceneAnalysisSelection,
  SceneReport,
} from './types';

export interface SmartDeepDiveDispatch {
  query: string;
  selectedScenes: DisplayedScene[];
  selectionContext?: SelectionContext;
  traceContext?: TraceDataset[];
  packageName?: string;
}

const STARTUP_TYPES = new Set(['cold_start', 'warm_start', 'hot_start']);
const SCROLL_TYPES = new Set(['scroll', 'inertial_scroll']);
const CLICK_TYPES = new Set(['tap', 'long_press', 'screen_unlock']);
const NAVIGATION_TYPES = new Set(['back_key', 'home_key', 'recents_key', 'navigation', 'window_transition', 'app_switch']);
const DEVICE_TYPES = new Set(['screen_on', 'screen_off', 'screen_sleep', 'idle']);
const ANR_TYPES = new Set(['anr', 'jank_region']);

const SCENE_TYPE_LABELS: Record<string, string> = {
  cold_start: '冷启动',
  warm_start: '温启动',
  hot_start: '热启动',
  scroll: '滑动',
  inertial_scroll: '惯性滑动',
  tap: '点击',
  long_press: '长按',
  screen_unlock: '解锁',
  back_key: 'Back',
  home_key: 'Home',
  recents_key: 'Recents',
  navigation: '导航',
  window_transition: '窗口切换',
  app_switch: '应用切换',
  screen_on: '亮屏',
  screen_off: '熄屏',
  screen_sleep: '息屏',
  idle: '空闲',
  anr: 'ANR',
  jank_region: '严重卡顿',
  scroll_start: '滑动开始',
};

export function buildSmartDeepDiveDispatch(input: {
  report: SceneReport;
  selection?: SceneAnalysisSelection;
}): SmartDeepDiveDispatch | null {
  const selectedScenes = selectAnalysisEligibleScenes(
    input.report.displayedScenes,
    input.selection,
  );
  if (selectedScenes.length === 0) return null;

  const query = buildDispatchQuery(input.selection, selectedScenes);
  const selectionContext = buildAreaSelectionContext(selectedScenes);
  const traceContext = buildSelectedScenesTraceContext(selectedScenes);
  const packageName = inferPackageName(selectedScenes);

  return {
    query,
    selectedScenes,
    selectionContext,
    traceContext,
    packageName,
  };
}

function buildDispatchQuery(
  selection: SceneAnalysisSelection | undefined,
  scenes: DisplayedScene[],
): string {
  const sceneTypes = new Set(scenes.map((scene) => scene.sceneType));
  const selectedCount = scenes.length;
  const suffix = `（智能分析已选中 ${selectedCount} 个场景）`;

  if (!selection || selection.scope === 'all') {
    return `按场景时间线分析这个 trace 的性能问题${suffix}`;
  }

  if (isSubset(sceneTypes, STARTUP_TYPES)) return `分析启动性能${suffix}`;
  if (isSubset(sceneTypes, SCROLL_TYPES)) return `分析滑动性能${suffix}`;
  if (isSubset(sceneTypes, CLICK_TYPES)) return `分析点击响应性能${suffix}`;
  if (isSubset(sceneTypes, NAVIGATION_TYPES)) return `分析导航和转场性能${suffix}`;
  if (isSubset(sceneTypes, DEVICE_TYPES)) return `分析设备状态变化对性能的影响${suffix}`;
  if (isSubset(sceneTypes, ANR_TYPES)) return `分析 ANR 和严重卡顿区间${suffix}`;

  const label = selection.label?.trim();
  return label
    ? `分析${label}相关性能问题${suffix}`
    : `分析所选场景的性能问题${suffix}`;
}

function isSubset(values: Set<string>, allowed: Set<string>): boolean {
  if (values.size === 0) return false;
  for (const value of values) {
    if (!allowed.has(value)) return false;
  }
  return true;
}

function buildAreaSelectionContext(scenes: DisplayedScene[]): SelectionContext | undefined {
  let start: bigint | undefined;
  let end: bigint | undefined;
  for (const scene of scenes) {
    const sceneStart = parseNs(scene.startTs);
    const sceneEnd = parseNs(scene.endTs);
    if (sceneStart == null || sceneEnd == null) continue;
    start = start == null || sceneStart < start ? sceneStart : start;
    end = end == null || sceneEnd > end ? sceneEnd : end;
  }
  if (start == null || end == null || end < start) return undefined;

  const startNs = Number(start);
  const endNs = Number(end);
  if (!Number.isSafeInteger(startNs) || !Number.isSafeInteger(endNs)) {
    return undefined;
  }

  return {
    kind: 'area',
    startNs,
    endNs,
    durationNs: endNs - startNs,
    trackCount: 0,
  };
}

function buildSelectedScenesTraceContext(scenes: DisplayedScene[]): TraceDataset[] {
  return [{
    label: '智能分析选中的场景时间线',
    columns: [
      '#',
      'scene_type',
      'label',
      'start_s',
      'end_s',
      'duration_ms',
      'process',
      'severity',
      'role',
      'confidence',
      'parent_scene_id',
      'child_scene_ids',
      'source_id',
    ],
    rows: scenes.map((scene, index) => [
      index + 1,
      scene.sceneType,
      SCENE_TYPE_LABELS[scene.sceneType] || scene.label || scene.sceneType,
      formatSeconds(scene.startTs),
      formatSeconds(scene.endTs),
      Math.round(scene.durationMs),
      scene.processName || '-',
      scene.severity,
      scene.sceneRole || 'action',
      typeof scene.confidenceScore === 'number' ? scene.confidenceScore.toFixed(2) : '-',
      scene.parentSceneId || '-',
      scene.childSceneIds?.join(',') || '-',
      scene.id,
    ]),
  }];
}

function inferPackageName(scenes: DisplayedScene[]): string | undefined {
  for (const scene of scenes) {
    const processName = scene.processName?.trim();
    if (!processName || processName === 'system') continue;
    return processName;
  }
  return undefined;
}

function parseNs(value: string): bigint | undefined {
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

function formatSeconds(value: string): string {
  const parsed = parseNs(value);
  if (parsed == null) return value;
  return (Number(parsed) / 1e9).toFixed(3);
}
