// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * queryComplexityClassifier follow-up unit tests
 *
 * Focus: narrow keyword pre-filter (confirm-short → quick) and semantic fallback.
 * The Haiku AI fallback is mocked to make tests deterministic and fast.
 *
 * Coverage (plan §9 testing strategy + Codex Q2 fix):
 *   - CONFIRM_KEYWORDS positive cases + length boundary
 *   - Hard rules (comparison only; selection is semantic context)
 *   - Priority: comparison runs before acknowledgement; bounded diagnosis goes through semantic AI classification
 */

import { jest, describe, it, expect } from '@jest/globals';

// Mock the Claude Agent SDK so no real network calls happen.
// Returns 'full' from Haiku fallback unless the prompt clearly asks for a
// bounded fact lookup. This keeps tests deterministic without bypassing the
// semantic classifier path.
jest.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: jest.fn((args: { prompt?: string } = {}) => ({
    [Symbol.asyncIterator]: async function* () {
      const prompt = String(args.prompt ?? '');
      const query = prompt.match(/## 用户问题\n([\s\S]*?)\n\n## 输出格式/)?.[1]?.trim() ?? prompt;
      const quick = query.includes('rcustomscroller')
        || query.includes('滑动 FPS 是多少')
        || query.includes('滑动帧率是多少')
        || query.includes('为什么这段选区频率低')
        || query.includes('这个 slice 的 dur 为什么这么长')
        || query.includes('root cause for this rcustomscroller CPU placement');
      yield {
        type: 'result',
        subtype: 'success',
        result: JSON.stringify({
          complexity: quick ? 'quick' : 'full',
          reason: quick ? 'bounded factual follow-up' : 'ai-fallback-mock',
        }),
      };
    },
    close: jest.fn(),
  })),
}));

import { classifyQueryComplexity } from '../queryComplexityClassifier';
import type { ComplexityClassifierInput } from '../types';

/** Build a ComplexityClassifierInput with sensible defaults; override only what the test cares about. */
function makeInput(override: Partial<ComplexityClassifierInput>): ComplexityClassifierInput {
  return {
    query: '',
    sceneType: 'general',
    hasSelectionContext: false,
    hasReferenceTrace: false,
    hasExistingFindings: false,
    hasPriorFullAnalysis: false,
    ...override,
  };
}

describe('classifyQueryComplexity — keyword pre-filter', () => {
  describe('CONFIRM_KEYWORDS in short query (<20 chars) → quick', () => {
    const cases = [
      '谢谢',
      '好的',
      '明白了',
      '嗯',
      '收到',
      '知道了',
      'thanks',
      'ok',
      'got it',
    ];
    it.each(cases)('classifies %p as quick even when prior full analysis exists', async (query) => {
      // hasPriorFullAnalysis=true proves the keyword pre-filter wins before semantic classification.
      const result = await classifyQueryComplexity(makeInput({ query, hasPriorFullAnalysis: true }));
      expect(result.complexity).toBe('quick');
      expect(result.source).toBe('hard_rule');
      expect(result.reason).toMatch(/confirm-like follow-up/);
    });
  });

  it('long mixed confirm + diagnosis query skips confirm rule and falls through to semantic classification', async () => {
    // Contains "谢谢" (confirm) but is longer than a pure acknowledgement.
    const result = await classifyQueryComplexity(makeInput({
      query: '谢谢,请详细分析一下这次滑动卡顿的整体原因和优化方向',
      hasPriorFullAnalysis: true,
    }));
    expect(result.complexity).toBe('full');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/ai-fallback-mock/);
  });

  it('short mixed confirm + diagnosis query skips acknowledgement rule and falls through to semantic classification', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: '谢谢，为什么滑动卡',
      sceneType: 'scrolling',
      hasPriorFullAnalysis: true,
    }));
    expect(result.complexity).toBe('full');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/ai-fallback-mock/);
  });

  it('long pure-confirm query (≥20 chars) skips confirm rule and falls through to semantic classification', async () => {
    const query = '非常感谢你，你的解释真的非常清楚，我完全明白了'; // 23 chars
    expect(query.length).toBeGreaterThanOrEqual(20);
    const result = await classifyQueryComplexity(makeInput({
      query,
      hasPriorFullAnalysis: true,
    }));
    expect(result.complexity).toBe('full');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/ai-fallback-mock/);
  });
});

describe('classifyQueryComplexity — local scope rules and semantic fallback', () => {
  const neutralQuery = '随便问问'; // No drill-down or confirm keywords

  it('UI selection context is semantic context, not a local hard quick lock', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: '这个 slice 的 dur 为什么这么长',
      hasSelectionContext: true,
      selectionContext: { kind: 'track_event', eventId: 123, ts: 1000 },
    }));
    expect(result.complexity).toBe('quick');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/bounded factual follow-up/);
  });

  it('comparison mode (reference trace) → full', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: neutralQuery,
      hasReferenceTrace: true,
    }));
    expect(result.complexity).toBe('full');
    expect(result.reason).toMatch(/comparison mode/);
  });

  it('prior findings are context for semantic classification, not an automatic full lock', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: neutralQuery,
      hasExistingFindings: true,
    }));
    expect(result.complexity).toBe('full');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/ai-fallback-mock/);
  });

  it('prior full analysis is context for semantic classification, not an automatic full lock', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: neutralQuery,
      hasPriorFullAnalysis: true,
    }));
    expect(result.complexity).toBe('full');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/ai-fallback-mock/);
  });

  it('implicit frame timeline follow-up after findings is decided by semantic classification', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: '能不能在timeline中标出这一帧',
      hasExistingFindings: true,
      hasPriorFullAnalysis: true,
    }));
    expect(result.complexity).toBe('full');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/ai-fallback-mock/);
  });

  it('selection context does not inherit prior full continuity by itself', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: '为什么这段选区频率低',
      hasSelectionContext: true,
      selectionContext: { kind: 'area', startNs: 100, endNs: 200 },
      hasPriorFullAnalysis: true,
    }));
    expect(result.complexity).toBe('quick');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/bounded factual follow-up/);
  });

  it('selection context allows broad scoped diagnosis to remain full', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: '分析这段滑动性能并给优化建议',
      sceneType: 'scrolling',
      hasSelectionContext: true,
      selectionContext: { kind: 'track_event', eventId: 123, ts: 1000 },
    }));
    expect(result.complexity).toBe('full');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/ai-fallback-mock/);
  });

  it('deterministic scene (scrolling) is decided by semantic classification', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: neutralQuery,
      sceneType: 'scrolling',
    }));
    expect(result.complexity).toBe('full');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/ai-fallback-mock/);
  });

  it('AI classifier keeps explicit thread placement and frequency follow-up quick after prior analysis', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: '上面 rcustomscroller 这个线程的核心摆放和 running 时候对应的频率是多少',
      hasPriorFullAnalysis: true,
      previousQueries: ['找到 Trace 里面 running time 排名前十的线程，从大到小排序'],
    }));
    expect(result.complexity).toBe('quick');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/bounded factual follow-up/);
  });

  it('AI classifier keeps explicit scrolling metric lookup quick even for scrolling scene', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: '滑动 FPS 是多少',
      sceneType: 'scrolling',
    }));
    expect(result.complexity).toBe('quick');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/bounded factual follow-up/);
  });

  it('AI classifier keeps bounded root-cause wording quick when target is a specific thread', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: 'root cause for this rcustomscroller CPU placement',
      hasPriorFullAnalysis: true,
      previousQueries: ['上面 rcustomscroller 这个线程的核心摆放和 running 时候对应的频率是多少'],
    }));
    expect(result.complexity).toBe('quick');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/bounded factual follow-up/);
  });

  it('AI classifier keeps bounded why questions quick when target is a selected range', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: '为什么这段选区频率低',
      hasPriorFullAnalysis: true,
    }));
    expect(result.complexity).toBe('quick');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/bounded factual follow-up/);
  });

  it('AI classifier keeps bounded why questions quick when target is a concrete slice', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: '这个 slice 的 dur 为什么这么长',
      hasPriorFullAnalysis: true,
    }));
    expect(result.complexity).toBe('quick');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/bounded factual follow-up/);
  });

  it('non-deterministic scene (memory) with no other hints → Haiku fallback', async () => {
    // Scene labels are context for the semantic classifier; they no longer
    // bypass it before the model can read the current question intent.
    const result = await classifyQueryComplexity(makeInput({
      query: neutralQuery,
      sceneType: 'memory',
    }));
    expect(result.source).toBe('ai'); // Mocked Haiku returns 'full', but via AI path.
  });
});

describe('classifyQueryComplexity — priority ordering', () => {
  it('selection context keeps bounded diagnostic wording on the semantic quick path', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: '为什么这段选区频率低',
      hasSelectionContext: true,
      selectionContext: {
        kind: 'area',
        source: 'area_selection',
        startNs: 100,
        endNs: 200,
      },
      hasPriorFullAnalysis: true,
    }));
    expect(result.complexity).toBe('quick');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/bounded factual follow-up/);
  });

  it('comparison mode still wins over selection context', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: '对比这段为什么变慢',
      hasReferenceTrace: true,
      hasSelectionContext: true,
      selectionContext: { kind: 'area', startNs: 100, endNs: 200 },
    }));
    expect(result.complexity).toBe('full');
    expect(result.reason).toMatch(/comparison mode/);
  });

  it('scene-level why question is decided by semantic classification and remains full', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: '为什么滑动卡',
      sceneType: 'scrolling',
    }));
    expect(result.complexity).toBe('full');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/ai-fallback-mock/);
  });

  it('broad scrolling analysis remains full', async () => {
    const result = await classifyQueryComplexity(makeInput({
      query: '分析滑动性能',
      sceneType: 'scrolling',
    }));
    expect(result.complexity).toBe('full');
    expect(result.source).toBe('ai');
    expect(result.reason).toMatch(/ai-fallback-mock/);
  });

  it('confirm keyword overrides hasPriorFullAnalysis (Codex Q2 fix)', async () => {
    // Central fix: a pure "谢谢" follow-up must not inherit full mode from the previous turn.
    const result = await classifyQueryComplexity(makeInput({
      query: '谢谢',
      hasPriorFullAnalysis: true,
    }));
    expect(result.complexity).toBe('quick');
    expect(result.reason).toMatch(/confirm-like follow-up/);
  });
});
