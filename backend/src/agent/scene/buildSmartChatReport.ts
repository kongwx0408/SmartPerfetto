// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import type { AgentRuntimeAnalysisResult } from '../core/orchestratorTypes';
import type {
  ConclusionContract,
  ConclusionContractClaimReference,
} from '../core/conclusionContract';
import type { Finding } from '../types';
import type {
  DisplayedScene,
  SceneAnalysisJob,
  SceneReport,
} from './types';
import { selectAnalysisEligibleScenes } from './sceneIntervalBuilder';

const SCENE_LABELS: Record<string, string> = {
  cold_start: '冷启动',
  warm_start: '温启动',
  hot_start: '热启动',
  scroll: '滑动',
  scroll_start: '滑动开始',
  inertial_scroll: '惯性滑动',
  tap: '点击',
  long_press: '长按',
  screen_unlock: '解锁',
  back_key: 'Back',
  home_key: 'Home',
  recents_key: 'Recents',
  navigation: '导航',
  window_transition: '窗口切换',
  anr: 'ANR',
  jank_region: '严重卡顿',
  screen_on: '亮屏',
  screen_off: '熄屏',
  screen_sleep: '息屏',
  idle: '空闲',
};

export function buildSmartChatReport(input: {
  sessionId: string;
  report: SceneReport;
  totalDurationMs?: number;
}): AgentRuntimeAnalysisResult {
  const { sessionId, report } = input;
  const completedJobs = report.jobs.filter(job => job.state === 'completed');
  const failedJobs = report.jobs.filter(job => job.state === 'failed');
  const analyzedSceneIds = new Set(completedJobs.map(job => job.interval.displayedSceneId));
  const conclusion = buildConclusionMarkdown(report, completedJobs, failedJobs);
  const findings = buildFindings(report, completedJobs, failedJobs);
  const confidence = report.partialReport ? 0.68 : Math.min(0.9, 0.72 + completedJobs.length * 0.02);

  return {
    sessionId,
    success: failedJobs.length === 0 || completedJobs.length > 0,
    findings,
    hypotheses: [],
    conclusion,
    conclusionContract: buildConclusionContract(report, completedJobs, analyzedSceneIds),
    confidence,
    rounds: 1,
    totalDurationMs: input.totalDurationMs ?? report.totalDurationMs,
    partial: report.partialReport || failedJobs.length > 0 ? true : undefined,
    terminationReason: report.partialReport ? 'execution_error' : undefined,
    terminationMessage: report.partialReport
      ? '智能分析已生成可用报告，但部分场景深钻失败或被取消。'
      : undefined,
  };
}

export function buildSmartSceneSelectionReport(input: {
  sessionId: string;
  report: SceneReport;
  totalDurationMs?: number;
}): AgentRuntimeAnalysisResult {
  const { sessionId, report } = input;
  const sceneCounts = countBy(report.displayedScenes.map(scene => displaySceneType(scene.sceneType)));
  const eligibleScenes = selectAnalysisEligibleScenes(report.displayedScenes, { scope: 'all' });
  const orderedCounts = Object.entries(sceneCounts)
    .map(([label, count]) => `${label} ${count} 次`)
    .join('、') || '未检测到可展示场景';
  const conclusion = [
    '# 智能分析报告：场景盘点',
    '',
    `本次 trace 已先完成轻量场景盘点，共识别 ${report.displayedScenes.length} 个场景，覆盖 ${orderedCounts}。`,
    `其中 ${eligibleScenes.length} 个场景可进入深钻；marker/context 仅作为时间线证据展示。`,
    report.sceneVerification?.summary ? `场景还原复核：${report.sceneVerification.summary}` : '',
    '',
    '## 场景时间线',
    report.displayedScenes.slice(0, 40).map((scene, index) =>
      `${index + 1}. ${displaySceneType(scene.sceneType)} ${formatRange(scene)} ${scene.processName ? `(${scene.processName})` : ''}，时长 ${formatMs(scene.durationMs)}。`,
    ).join('\n') || '- 未检测到场景时间线。',
    report.displayedScenes.length > 40 ? `\n- 另有 ${report.displayedScenes.length - 40} 个场景未在聊天摘要中展开，可在 Story Sidebar 查看。` : '',
    '',
    '## 下一步',
    '请选择要深钻的范围：分析全部场景，或只分析启动、滑动、点击、导航、设备状态、ANR 等其中一类。选择后才会进入高成本的 per-scene 深钻分析。',
  ].filter(Boolean).join('\n');

  return {
    sessionId,
    success: true,
    findings: [],
    hypotheses: [],
    conclusion,
    conclusionContract: buildSelectionConclusionContract(report),
    smartScenePreview: {
      reportId: report.reportId,
      scenes: report.displayedScenes,
      sceneVerification: report.sceneVerification,
      eligibleSceneCount: eligibleScenes.length,
      sceneTypeCounts: countBy(report.displayedScenes.map(scene => scene.sceneType)),
    },
    confidence: report.displayedScenes.length > 0 ? 0.82 : 0.6,
    rounds: 1,
    totalDurationMs: input.totalDurationMs ?? report.totalDurationMs,
  };
}

function buildConclusionMarkdown(
  report: SceneReport,
  completedJobs: SceneAnalysisJob[],
  failedJobs: SceneAnalysisJob[],
): string {
  const detectedScenes = report.displayedScenes;
  const analyzedScenes = completedJobs
    .map(job => sceneById(report, job.interval.displayedSceneId))
    .filter((scene): scene is DisplayedScene => !!scene);
  const sceneCounts = countBy(detectedScenes.map(scene => displaySceneType(scene.sceneType)));
  const orderedCounts = Object.entries(sceneCounts)
    .map(([label, count]) => `${label} ${count} 次`)
    .join('、') || '未检测到可展示场景';
  const topBottlenecks = buildBottleneckRows(report, completedJobs).slice(0, 5);
  const completionSummary = failedJobs.length > 0
    ? `其中 ${completedJobs.length} 个场景完成深钻，${failedJobs.length} 个场景深钻失败或被取消。`
    : `其中 ${completedJobs.length} 个场景完成深钻，计划内深钻均已完成。`;

  const sections = [
    '# 智能分析报告',
    '',
    `本次 trace 还原出 ${detectedScenes.length} 个场景，覆盖 ${orderedCounts}。${completionSummary}`,
    '',
    '## 场景时间线',
    detectedScenes.slice(0, 30).map((scene, index) =>
      `${index + 1}. ${displaySceneType(scene.sceneType)} ${formatRange(scene)} ${scene.processName ? `(${scene.processName})` : ''}，时长 ${formatMs(scene.durationMs)}，状态 ${scene.analysisState}`,
    ).join('\n') || '- 未检测到场景时间线。',
    detectedScenes.length > 30 ? `\n- 另有 ${detectedScenes.length - 30} 个场景未在聊天摘要中展开，可在 Story Sidebar 查看。` : '',
    '',
    '## 分场景摘要',
    analyzedScenes.map(scene => {
      const job = completedJobs.find(item => item.interval.displayedSceneId === scene.id);
      const resultCount = job?.result?.projection?.metrics.display_result_count ?? 0;
      return `- ${displaySceneType(scene.sceneType)} ${formatRange(scene)}：执行 ${job?.interval.skillId || 'unknown'}，产出 ${resultCount} 组证据，耗时 ${formatMs(job?.result?.durationMs ?? 0)}。`;
    }).join('\n') || '- 没有场景进入深钻，建议检查 trace 是否包含可识别的启动、滑动、点击、导航、ANR 或设备状态事件。',
    '',
    '## 跨场景叙事',
    report.summary?.trim()
      || buildFallbackNarrative(detectedScenes, completedJobs),
    '',
    '## 瓶颈排序',
    topBottlenecks.map((row, index) =>
      `${index + 1}. ${row.title}：${row.reason}。证据 ${row.evidenceRef}。`,
    ).join('\n') || '- 未发现足够证据形成瓶颈排序。',
    '',
    '## 关键证据链',
    completedJobs.slice(0, 10).map(job =>
      `- ${job.interval.skillId} / ${job.interval.displayedSceneId}: data:scene_job:${job.jobId}`,
    ).join('\n') || '- 当前没有完成的深钻证据。',
  ];

  return sections.filter(Boolean).join('\n');
}

function buildFallbackNarrative(scenes: DisplayedScene[], jobs: SceneAnalysisJob[]): string {
  const first = scenes[0];
  const last = scenes[scenes.length - 1];
  if (!first || !last) {
    return '跨场景层面未检测到足够事件；本次报告以可用深钻证据为准。';
  }
  return [
    `脚本从 ${displaySceneType(first.sceneType)} 开始，到 ${displaySceneType(last.sceneType)} 结束，中间穿插 ${jobs.length} 个已深钻阶段。`,
    '优先关注瓶颈排序中的高耗时或异常场景，再回到 Story Sidebar 对齐具体时间窗。',
  ].join('\n\n');
}

function buildFindings(
  report: SceneReport,
  completedJobs: SceneAnalysisJob[],
  failedJobs: SceneAnalysisJob[],
): Finding[] {
  const findings: Finding[] = [];
  for (const row of buildBottleneckRows(report, completedJobs).slice(0, 8)) {
    findings.push({
      id: `smart-${row.scene.id}`,
      category: row.scene.sceneType,
      type: 'smart_scene_bottleneck',
      severity: row.scene.severity === 'bad' ? 'high' : row.scene.severity === 'warning' ? 'medium' : 'info',
      title: row.title,
      description: row.reason,
      source: 'smart_analysis',
      confidence: 0.72,
      relatedTimestamps: [row.scene.startTs, row.scene.endTs],
      evidence: [{ ref: row.evidenceRef, skillId: row.job.interval.skillId }],
    });
  }
  if (failedJobs.length > 0) {
    findings.push({
      id: 'smart-partial-jobs',
      category: 'smart',
      type: 'partial_analysis',
      severity: 'warning',
      title: '部分场景深钻未完成',
      description: `${failedJobs.length} 个场景深钻失败，报告已保留可用场景证据。`,
      source: 'smart_analysis',
      confidence: 0.8,
    });
  }
  return findings;
}

function buildConclusionContract(
  report: SceneReport,
  completedJobs: SceneAnalysisJob[],
  analyzedSceneIds: Set<string>,
): ConclusionContract {
  const evidenceChain = completedJobs.slice(0, 20).map(job => ({
    conclusionId: `smart-${job.interval.displayedSceneId}`,
    text: `${sceneById(report, job.interval.displayedSceneId)?.sourceStepId || 'clean_timeline'} ${job.interval.skillId}`,
  }));
  return {
    schemaVersion: 'conclusion_contract_v1',
    mode: 'initial_report',
    conclusions: [
      {
        rank: 1,
        statement: `智能分析检测到 ${report.displayedScenes.length} 个脚本阶段，并完成 ${completedJobs.length} 个场景深钻。`,
        confidencePercent: report.partialReport ? 68 : 82,
      },
    ],
    clusters: Array.from(analyzedSceneIds).slice(0, 20).map(sceneId => ({
      cluster: sceneId,
      description: sceneById(report, sceneId)?.label,
    })),
    evidenceChain,
    claims: completedJobs.slice(0, 20).map(job => {
      const scene = sceneById(report, job.interval.displayedSceneId);
      const ref = buildSceneClaimReference(scene);
      return {
        conclusionId: `smart-${job.interval.displayedSceneId}`,
        text: `${displaySceneType(scene?.sceneType || 'scene')} ${job.interval.skillId} 深钻结果来自 ${ref.sourceRef} 场景窗口。`,
        kind: 'categorical',
        references: [ref],
        supportLevel: 'verified',
      };
    }),
    uncertainties: report.partialReport
      ? ['部分场景深钻失败或被取消，结论以已完成证据为准。']
      : [],
    nextSteps: ['在 Story Sidebar 中查看对应时间窗，并优先处理瓶颈排序靠前的场景。'],
    metadata: {
      sceneId: 'smart',
      confidencePercent: report.partialReport ? 68 : 82,
      rounds: 1,
      claimDerivation: 'explicit_model_contract',
      claimVerificationScope: 'explicit_claims',
    },
  };
}

function buildSelectionConclusionContract(report: SceneReport): ConclusionContract {
  return {
    schemaVersion: 'conclusion_contract_v1',
    mode: 'initial_report',
    conclusions: [
      {
        rank: 1,
        statement: `智能分析已完成场景盘点，识别到 ${report.displayedScenes.length} 个候选场景，等待用户选择深钻范围。`,
        confidencePercent: report.displayedScenes.length > 0 ? 82 : 60,
      },
    ],
    clusters: [],
    evidenceChain: report.displayedScenes.slice(0, 20).map(scene => ({
      conclusionId: 'smart-selection-preview',
      text: `${scene.sourceStepId} ${scene.sceneType} ${formatRange(scene)}`,
    })),
    claims: [],
    uncertainties: report.displayedScenes.length > 0
      ? []
      : ['当前 trace 未识别出可展示的启动、滑动、点击、导航、ANR 或设备状态场景。'],
    nextSteps: ['在智能分析选择条中选择“全部”或某一类场景后再开始深钻。'],
    metadata: {
      sceneId: 'smart',
      confidencePercent: report.displayedScenes.length > 0 ? 82 : 60,
      rounds: 1,
      claimDerivation: 'explicit_model_contract',
      claimVerificationScope: 'explicit_claims',
    },
  };
}

function buildSceneClaimReference(scene: DisplayedScene | undefined): ConclusionContractClaimReference {
  if (!scene) return { sourceRef: 'clean_timeline' };
  const ref: ConclusionContractClaimReference = { sourceRef: scene.sourceStepId || 'clean_timeline' };
  const eventKey = firstPresentKey(scene.metadata, ['event', 'event_type', 'startup_type', 'gesture_type']);
  const column = eventKey || defaultSceneEvidenceColumn(scene);
  const value = eventKey ? scene.metadata[eventKey] : scene.sceneType;
  if (isClaimScalar(value)) {
    ref.column = column;
    ref.value = value;
    ref.rowSelector = { [column]: value };
    const ts = scene.metadata.ts;
    if (isClaimScalar(ts)) ref.rowSelector.ts = ts;
  }
  return ref;
}

function defaultSceneEvidenceColumn(scene: DisplayedScene): string {
  if (scene.sourceStepId === 'user_gestures') return 'gesture_type';
  if (scene.sourceStepId === 'inertial_scrolls') return 'category';
  return 'event';
}

function firstPresentKey(record: Record<string, unknown>, keys: string[]): string | undefined {
  return keys.find(key => record[key] !== undefined && record[key] !== null);
}

function isClaimScalar(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function buildBottleneckRows(report: SceneReport, jobs: SceneAnalysisJob[]): Array<{
  scene: DisplayedScene;
  job: SceneAnalysisJob;
  title: string;
  reason: string;
  evidenceRef: string;
}> {
  return jobs
    .map(job => {
      const scene = sceneById(report, job.interval.displayedSceneId);
      if (!scene) return null;
      const projection = job.result?.projection;
      const resultCount = projection?.metrics.display_result_count ?? 0;
      const omitted = projection?.omittedRowCount ?? 0;
      return {
        scene,
        job,
        title: `${displaySceneType(scene.sceneType)} ${formatRange(scene)}`,
        reason: `场景时长 ${formatMs(scene.durationMs)}，深钻技能 ${job.interval.skillId} 产出 ${resultCount} 组结果${omitted > 0 ? `，聊天摘要截断 ${omitted} 组` : ''}`,
        evidenceRef: projection?.evidenceRefs[0] || `data:scene_job:${job.jobId}`,
      };
    })
    .filter((row): row is NonNullable<typeof row> => !!row)
    .sort((a, b) => severityScore(b.scene) - severityScore(a.scene));
}

function sceneById(report: SceneReport, sceneId: string): DisplayedScene | undefined {
  return report.displayedScenes.find(scene => scene.id === sceneId);
}

function displaySceneType(sceneType: string): string {
  return SCENE_LABELS[sceneType] || sceneType;
}

function formatRange(scene: DisplayedScene): string {
  return `[${formatNs(scene.startTs)} - ${formatNs(scene.endTs)}]`;
}

function formatNs(value: string): string {
  const ns = Number(value);
  if (!Number.isFinite(ns)) return value;
  return `${(ns / 1_000_000_000).toFixed(3)}s`;
}

function formatMs(value: number): string {
  if (!Number.isFinite(value)) return '0ms';
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

function severityScore(scene: DisplayedScene): number {
  const base = scene.severity === 'bad' ? 10_000 : scene.severity === 'warning' ? 5_000 : 0;
  return base + Math.max(0, scene.durationMs || 0);
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}
