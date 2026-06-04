// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { describe, expect, it } from '@jest/globals';
import { buildComplexityClassifierInput } from '../queryComplexityContext';

describe('buildComplexityClassifierInput', () => {
  it('bounds prior full/finding signals to the recent turn window', () => {
    const input = buildComplexityClassifierInput({
      query: 'trace 时长多少',
      sceneType: 'general',
      hasReferenceTrace: false,
      previousTurns: [
        {
          query: '很久以前分析滑动性能',
          intent: { complexity: 'complex' },
          findings: [{ id: 'old', title: 'old jank', description: 'old', severity: 'high', confidence: 0.9 }],
        },
        { query: '谢谢', intent: { complexity: 'simple' }, findings: [] },
        { query: '包名是什么', intent: { complexity: 'simple' }, findings: [] },
        { query: 'trace 时长多少', intent: { complexity: 'simple' }, findings: [] },
      ],
    });

    expect(input.hasPriorFullAnalysis).toBe(false);
    expect(input.hasExistingFindings).toBe(false);
    expect(input.previousQueries).toEqual(['谢谢', '包名是什么', 'trace 时长多少']);
    expect(input.previousFindings).toEqual([]);
  });

  it('includes compact recent finding summaries from recent full turns', () => {
    const input = buildComplexityClassifierInput({
      query: '上面第 2 个发现继续看根因',
      sceneType: 'scrolling',
      hasReferenceTrace: false,
      previousTurns: [
        { query: 'trace 时长多少', intent: { complexity: 'simple' }, findings: [] },
        {
          query: '分析滑动性能',
          intent: { complexity: 'complex' },
          findings: [
            {
              id: 'f1',
              title: 'RenderThread heavy frame',
              description: 'render thread work overlaps a jank frame',
              category: 'render',
              severity: 'medium',
              confidence: 0.8,
            },
            {
              id: 'f2',
              title: 'Binder wait overlaps jank',
              description: 'binder wait overlaps a jank frame',
              category: 'binder',
              severity: 'high',
              confidence: 0.9,
            },
          ],
        },
      ],
    });

    expect(input.hasPriorFullAnalysis).toBe(true);
    expect(input.hasExistingFindings).toBe(true);
    expect(input.previousFindings).toEqual([
      'RenderThread heavy frame | category=render | severity=medium',
      'Binder wait overlaps jank | category=binder | severity=high',
    ]);
  });
});
