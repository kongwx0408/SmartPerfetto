// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { describe, expect, it } from '@jest/globals';
import { buildComplexityClassifierPrompt } from '../queryComplexityPrompt';

describe('buildComplexityClassifierPrompt', () => {
  it('renders the real shared template with structured context', () => {
    const prompt = buildComplexityClassifierPrompt({
      query: '上面 rcustomscroller 这个线程的核心摆放和 running 时候对应的频率是多少',
      sceneType: 'general',
      hasSelectionContext: false,
      hasReferenceTrace: false,
      hasExistingFindings: true,
      hasPriorFullAnalysis: true,
      previousQueries: ['找到 Trace 里面 running time 排名前十的线程，从大到小排序'],
      previousFindings: ['rcustomscroller high running time | category=scheduling | severity=medium'],
    });

    expect(prompt).toContain('sceneType: general');
    expect(prompt).toContain('hasSelectionContext: false');
    expect(prompt).toContain('hasReferenceTrace: false');
    expect(prompt).toContain('hasExistingFindings: true');
    expect(prompt).toContain('hasPriorFullAnalysis: true');
    expect(prompt).toContain('previousQueries:');
    expect(prompt).toContain('previousFindings:');
    expect(prompt).toContain('rcustomscroller high running time');
    expect(prompt).toContain('UI 选区只是范围信号');
    expect(prompt).toContain('上面 rcustomscroller 这个线程');
  });

  it('truncates long previous queries and findings before rendering', () => {
    const prompt = buildComplexityClassifierPrompt({
      query: '继续',
      sceneType: 'general',
      hasSelectionContext: false,
      hasReferenceTrace: false,
      hasExistingFindings: true,
      hasPriorFullAnalysis: true,
      previousQueries: [`${'q'.repeat(260)}QUERY_TAIL_SHOULD_BE_CUT`],
      previousFindings: [`${'f'.repeat(220)}FINDING_TAIL_SHOULD_BE_CUT`],
    });

    expect(prompt).not.toContain('QUERY_TAIL_SHOULD_BE_CUT');
    expect(prompt).not.toContain('FINDING_TAIL_SHOULD_BE_CUT');
  });
});
