// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import type {
  AnalysisOptions,
  TraceDataset,
} from '../agent/core/orchestratorTypes';
import type { Finding, ConversationTurn } from '../agent/types';
import type { Hypothesis as ProtocolHypothesis } from '../agent/types/agentProtocol';
import { captureEntitiesFromResponses, applyCapturedEntities } from '../agent/core/entityCapture';
import type { Hypothesis } from '../agentv3/types';
import {
  DEFAULT_OUTPUT_LANGUAGE,
  localize,
  type OutputLanguage,
} from '../agentv3/outputLanguage';
import { SkillNotesBudget } from '../agentv3/selfImprove/skillNotesInjector';
import type { ProviderScope } from '../services/providerManager';
import type { KnowledgeScope } from '../services/scopedKnowledgeStore';

export const SDK_SESSION_FRESHNESS_MS = 4 * 60 * 60 * 1000;
export const DEFAULT_RUNTIME_CACHE_LIMIT = 50;

export function providerScopeFromAnalysisOptions(options: AnalysisOptions): ProviderScope | undefined {
  if (!options.tenantId || !options.workspaceId) return undefined;
  return {
    tenantId: options.tenantId,
    workspaceId: options.workspaceId,
    userId: options.userId,
  };
}

export function knowledgeScopeFromAnalysisOptions(options: AnalysisOptions): KnowledgeScope | undefined {
  if (!options.tenantId || !options.workspaceId) return undefined;
  return {
    tenantId: options.tenantId,
    workspaceId: options.workspaceId,
    userId: options.userId,
    sourceRunId: options.runId,
  };
}

export function buildRuntimeSessionMapKey(sessionId: string, referenceTraceId?: string): string {
  return referenceTraceId ? `${sessionId}:ref:${referenceTraceId}` : sessionId;
}

export function isFreshRuntimeEntry<T extends { updatedAt?: number }>(
  entry: T | undefined,
  freshnessMs = SDK_SESSION_FRESHNESS_MS,
  now = Date.now(),
): entry is T & { updatedAt: number } {
  return !!entry
    && typeof entry.updatedAt === 'number'
    && now - entry.updatedAt < freshnessMs;
}

export function getLruCacheEntry<K, V>(cache: Map<K, V>, key: K): V | undefined {
  const value = cache.get(key);
  if (value !== undefined) {
    cache.delete(key);
    cache.set(key, value);
  }
  return value;
}

export function setLruCacheEntry<K, V>(
  cache: Map<K, V>,
  key: K,
  value: V,
  maxEntries = DEFAULT_RUNTIME_CACHE_LIMIT,
): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > maxEntries) {
    const first = cache.keys().next();
    if (first.done) break;
    cache.delete(first.value);
  }
}

export function formatTraceContext(
  datasets: TraceDataset[] | undefined,
  outputLanguage: OutputLanguage = DEFAULT_OUTPUT_LANGUAGE,
): string {
  if (!datasets || datasets.length === 0) return '';
  const parts = datasets.map((d) => {
    const header = `| ${d.columns.join(' | ')} |`;
    const sep = `| ${d.columns.map(() => '---').join(' | ')} |`;
    const rows = d.rows.slice(0, 100).map(
      (r) => `| ${r.map((v) => String(v ?? '-')).join(' | ')} |`,
    );
    const truncNote = d.rows.length > 100
      ? localize(outputLanguage, `\n*(前 100 行，共 ${d.rows.length} 行)*`, `\n*(first 100 rows out of ${d.rows.length})*`)
      : '';
    return `### ${d.label}\n${header}\n${sep}\n${rows.join('\n')}${truncNote}`;
  });
  return localize(
    outputLanguage,
    `## 前端预查询 Trace 数据\n\n以下数据已由前端查询完毕，直接使用，无需重复 SQL 查询：\n\n${parts.join('\n\n')}`,
    `## Frontend Pre-queried Trace Data\n\nThe frontend has already queried the following data. Use it directly; do not repeat the same SQL query.\n\n${parts.join('\n\n')}`,
  );
}

function compactForPrompt(value: unknown, maxChars: number): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}...`;
}

export function buildQuickConversationContext(
  previousTurns: ConversationTurn[],
  outputLanguage: OutputLanguage = DEFAULT_OUTPUT_LANGUAGE,
): string | undefined {
  const turns = previousTurns.filter(turn => turn.completed).slice(-3);
  if (turns.length === 0) return undefined;

  const lines = [
    localize(
      outputLanguage,
      '## 最近对话上下文\n\n以下是 SmartPerfetto 本地保存的最近问答，用于理解“继续/刚才/这个”等指代；不要把它当作当前问题的新证据。',
      '## Recent Conversation Context\n\nThe following recent SmartPerfetto turns are local context for references like "continue", "earlier", or "this"; do not treat them as new evidence for the current question.',
    ),
  ];

  for (const turn of turns) {
    const query = compactForPrompt(turn.query, 220);
    const answer = compactForPrompt(turn.result?.message || '', 700);
    const findings = turn.findings
      .slice(0, 3)
      .map(f => `[${f.severity}] ${compactForPrompt(f.title, 160)}`)
      .filter(Boolean);

    lines.push(`### Turn ${turn.turnIndex + 1}`);
    lines.push(`- ${localize(outputLanguage, '用户', 'User')}: ${query}`);
    if (answer) {
      lines.push(`- ${localize(outputLanguage, '上轮回答', 'Previous answer')}: ${answer}`);
    }
    if (findings.length > 0) {
      lines.push(`- ${localize(outputLanguage, '上轮发现', 'Previous findings')}: ${findings.join('; ')}`);
    }
  }

  return lines.join('\n');
}

export function collectRecentFindings(
  sessionContext: any,
  options: { maxTurns?: number; maxFindings?: number } = {},
): Finding[] {
  try {
    let turns = sessionContext.getAllTurns?.() || [];
    if (options.maxTurns && options.maxTurns > 0) {
      turns = turns.slice(-options.maxTurns);
    }
    return turns.flatMap((turn: any) => turn.findings || []).slice(-(options.maxFindings ?? 5));
  } catch {
    return [];
  }
}

export function buildEntityContext(entityStore: any): string | undefined {
  try {
    const stats = entityStore.getStats?.();
    if (stats && stats.totalEntityCount === 0) return undefined;

    const lines: string[] = [];
    const frames = entityStore.getAllFrames?.() || [];
    if (frames.length > 0) {
      lines.push(`**帧 (${frames.length})**:`);
      for (const f of frames.slice(0, 15)) {
        const parts = [`frame_id=${f.frame_id}`];
        if (f.start_ts) parts.push(`ts=${f.start_ts}`);
        if (f.jank_type) parts.push(`jank=${f.jank_type}`);
        if (f.dur_ms) parts.push(`dur=${f.dur_ms}ms`);
        if (f.process_name) parts.push(`proc=${f.process_name}`);
        lines.push(`- ${parts.join(', ')}`);
      }
      if (frames.length > 15) lines.push(`- ...及其他 ${frames.length - 15} 帧`);
    }

    const sessions = entityStore.getAllSessions?.() || [];
    if (sessions.length > 0) {
      lines.push(`**滑动会话 (${sessions.length})**:`);
      for (const s of sessions.slice(0, 8)) {
        const parts = [`session_id=${s.session_id}`];
        if (s.start_ts) parts.push(`ts=${s.start_ts}`);
        if (s.jank_count) parts.push(`janks=${s.jank_count}`);
        if (s.process_name) parts.push(`proc=${s.process_name}`);
        lines.push(`- ${parts.join(', ')}`);
      }
    }

    return lines.length > 0 ? lines.join('\n') : undefined;
  } catch {
    return undefined;
  }
}

export function captureSkillDisplayEntities(
  displayResults: Array<{ stepId?: string; data?: any }>,
  entityStore: any,
  agentId: string,
): void {
  try {
    const data: Record<string, any> = {};
    for (const dr of displayResults) {
      if (dr.stepId && dr.data) data[dr.stepId] = dr.data;
    }
    const captured = captureEntitiesFromResponses([{
      agentId,
      success: true,
      toolResults: [{ toolName: 'invoke_skill', data }],
    } as any]);
    applyCapturedEntities(entityStore, captured);
  } catch (error) {
    console.warn(`[${agentId}] Entity capture failed:`, (error as Error).message);
  }
}

export function toProtocolHypothesis(
  h: Hypothesis,
  source: 'claude' | 'openai',
): ProtocolHypothesis {
  const statusMap: Record<string, ProtocolHypothesis['status']> = {
    formed: 'proposed',
    confirmed: 'confirmed',
    rejected: 'rejected',
  };
  const confidenceMap: Record<string, number> = { formed: 0.5, confirmed: 0.85, rejected: 0.1 };
  return {
    id: h.id,
    description: h.statement,
    status: statusMap[h.status] || 'proposed',
    confidence: confidenceMap[h.status] ?? 0.5,
    supportingEvidence: h.evidence && h.status === 'confirmed'
      ? [{ id: `${h.id}-ev`, type: 'observation' as const, description: h.evidence, source, strength: 0.8 }]
      : [],
    contradictingEvidence: h.evidence && h.status === 'rejected'
      ? [{ id: `${h.id}-ev`, type: 'observation' as const, description: h.evidence, source, strength: 0.8 }]
      : [],
    proposedBy: source,
    relevantAgents: [source],
    createdAt: h.formedAt,
    updatedAt: h.resolvedAt || h.formedAt,
  };
}

function parseQuickBudgetEnv(): number | undefined {
  const v = process.env.SELF_IMPROVE_QUICK_NOTES_BUDGET;
  if (!v) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function createRuntimeSkillNotesBudget(lightweight: boolean): SkillNotesBudget | undefined {
  if (process.env.SELF_IMPROVE_NOTES_INJECT_ENABLED !== '1') return undefined;
  if (!lightweight) return new SkillNotesBudget({ mode: 'full' });
  return new SkillNotesBudget({
    mode: 'quick',
    quickOverrideTotal: parseQuickBudgetEnv(),
  });
}
