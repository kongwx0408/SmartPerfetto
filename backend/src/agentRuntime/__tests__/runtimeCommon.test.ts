// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { describe, expect, it } from '@jest/globals';
import {
  buildQuickConversationContext,
  buildRuntimeSessionMapKey,
  collectRecentFindings,
  formatTraceContext,
  isFreshRuntimeEntry,
  knowledgeScopeFromAnalysisOptions,
  providerScopeFromAnalysisOptions,
  setLruCacheEntry,
  toProtocolHypothesis,
} from '../runtimeCommon';

describe('runtimeCommon', () => {
  it('derives provider and knowledge scopes from shared analysis options', () => {
    const options = {
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      runId: 'run-1',
    };

    expect(providerScopeFromAnalysisOptions(options)).toEqual({
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      userId: 'user-1',
    });
    expect(knowledgeScopeFromAnalysisOptions(options)).toEqual({
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      sourceRunId: 'run-1',
    });
    expect(providerScopeFromAnalysisOptions({ tenantId: 'tenant-only' })).toBeUndefined();
    expect(knowledgeScopeFromAnalysisOptions({ workspaceId: 'workspace-only' })).toBeUndefined();
  });

  it('centralizes runtime session keys and freshness checks', () => {
    const now = 1_700_000_000_000;

    expect(buildRuntimeSessionMapKey('s1')).toBe('s1');
    expect(buildRuntimeSessionMapKey('s1', 'trace-b')).toBe('s1:ref:trace-b');
    expect(isFreshRuntimeEntry({ updatedAt: now - 10 }, 100, now)).toBe(true);
    expect(isFreshRuntimeEntry({ updatedAt: now - 101 }, 100, now)).toBe(false);
    expect(isFreshRuntimeEntry(undefined, 100, now)).toBe(false);
  });

  it('formats frontend trace datasets once for both runtimes', () => {
    const markdown = formatTraceContext([{
      label: 'Frame stats',
      columns: ['name', 'dur_ms'],
      rows: [
        ['doFrame', 16.7],
        ['binder', null],
      ],
    }], 'en');

    expect(markdown).toContain('## Frontend Pre-queried Trace Data');
    expect(markdown).toContain('### Frame stats');
    expect(markdown).toContain('| doFrame | 16.7 |');
    expect(markdown).toContain('| binder | - |');
  });

  it('keeps runtime caches bounded with shared LRU semantics', () => {
    const cache = new Map<string, number>();
    setLruCacheEntry(cache, 'a', 1, 2);
    setLruCacheEntry(cache, 'b', 2, 2);
    setLruCacheEntry(cache, 'c', 3, 2);

    expect([...cache.keys()]).toEqual(['b', 'c']);
  });

  it('builds compact quick-mode local conversation context', () => {
    const context = buildQuickConversationContext([
      {
        id: 'turn-1',
        timestamp: 1,
        query: 'first',
        intent: {} as any,
        result: { message: 'old answer' } as any,
        findings: [],
        turnIndex: 0,
        completed: false,
      },
      {
        id: 'turn-2',
        timestamp: 2,
        query: '继续看上一轮',
        intent: {} as any,
        result: { message: '上一轮回答包含关键证据' } as any,
        findings: [{ title: '主线程阻塞', severity: 'high' } as any],
        turnIndex: 1,
        completed: true,
      },
    ], 'zh-CN');

    expect(context).toContain('## 最近对话上下文');
    expect(context).toContain('继续看上一轮');
    expect(context).toContain('[high] 主线程阻塞');
    expect(context).not.toContain('old answer');
  });

  it('collects the most recent findings consistently', () => {
    const sessionContext = {
      getAllTurns: () => [
        { findings: [{ title: 'old' }] },
        { findings: [{ title: 'recent-1' }, { title: 'recent-2' }] },
      ],
    };

    expect(collectRecentFindings(sessionContext, { maxTurns: 1, maxFindings: 1 })).toEqual([
      { title: 'recent-2' },
    ]);
  });

  it('maps runtime hypotheses into protocol hypotheses with provider-specific provenance', () => {
    const protocol = toProtocolHypothesis({
      id: 'h1',
      statement: 'Main thread is CPU-bound',
      status: 'confirmed',
      basis: 'running slices',
      evidence: 'art-1',
      formedAt: 10,
      resolvedAt: 20,
    }, 'openai');

    expect(protocol.proposedBy).toBe('openai');
    expect(protocol.supportingEvidence[0]).toMatchObject({
      source: 'openai',
      description: 'art-1',
    });
  });
});
