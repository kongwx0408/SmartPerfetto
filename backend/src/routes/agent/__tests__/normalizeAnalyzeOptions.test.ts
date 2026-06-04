// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {
  AnalyzeOptionsError,
  normalizeAnalyzeOptions,
} from '../normalizeAnalyzeOptions';

describe('normalizeAnalyzeOptions', () => {
  it('defaults unsupported analysisMode to auto and strips unknown options', () => {
    const normalized = normalizeAnalyzeOptions(
      {
        analysisMode: 'turbo',
        maxRounds: 3,
        confidenceThreshold: 0.5,
        unknown: 'ignored',
      },
      { endpoint: '/analyze', hasReferenceTraceId: false },
    );

    expect(normalized).toEqual({
      analysisMode: 'auto',
      maxRounds: 3,
      confidenceThreshold: 0.5,
    });
  });

  it('accepts smart preset on new analyze requests without comparison', () => {
    expect(normalizeAnalyzeOptions(
      { analysisMode: 'full', preset: 'smart' },
      { endpoint: '/analyze', hasReferenceTraceId: false },
    )).toEqual({
      analysisMode: 'full',
      preset: 'smart',
      smartAction: 'preview',
    });
  });

  it('accepts smart analyze selection scopes', () => {
    expect(normalizeAnalyzeOptions(
      {
        preset: 'smart',
        smartAction: 'analyze',
        smartSelection: {
          scope: 'scene_types',
          sceneTypes: ['scroll', 'scroll', 'inertial_scroll'],
          label: '滑动',
          reportId: 'report-123',
          sceneSnapshotId: 'legacy-snapshot-123',
        },
      },
      { endpoint: '/analyze', hasReferenceTraceId: false },
    )).toEqual({
      analysisMode: 'auto',
      preset: 'smart',
      smartAction: 'analyze',
      smartSelection: {
        scope: 'scene_types',
        sceneTypes: ['scroll', 'inertial_scroll'],
        label: '滑动',
        reportId: 'report-123',
        sceneSnapshotId: 'legacy-snapshot-123',
      },
    });
  });

  it('defaults smart analyze selection to all scenes', () => {
    expect(normalizeAnalyzeOptions(
      { preset: 'smart', smartAction: 'analyze' },
      { endpoint: '/analyze', hasReferenceTraceId: false },
    )).toEqual({
      analysisMode: 'auto',
      preset: 'smart',
      smartAction: 'analyze',
      smartSelection: { scope: 'all' },
    });
  });

  it('rejects smart preset with referenceTraceId', () => {
    expect(() => normalizeAnalyzeOptions(
      { preset: 'smart' },
      { endpoint: '/analyze', hasReferenceTraceId: true },
    )).toThrow(AnalyzeOptionsError);

    try {
      normalizeAnalyzeOptions(
        { preset: 'smart' },
        { endpoint: '/analyze', hasReferenceTraceId: true },
      );
    } catch (error: any) {
      expect(error.code).toBe('SMART_COMPARISON_UNSUPPORTED');
      expect(error.httpStatus).toBe(400);
    }
  });

  it('rejects smart preset on continuation run endpoint', () => {
    expect(() => normalizeAnalyzeOptions(
      { preset: 'smart' },
      { endpoint: '/sessions/:id/runs', hasReferenceTraceId: false },
    )).toThrow(/仅支持新会话/);
  });

  it('accepts normal continuation runs and comparison options', () => {
    expect(normalizeAnalyzeOptions(
      { analysisMode: 'fast', codeAwareMode: 'metadata_only', codebaseIds: ['a', 'a', 'b'] },
      { endpoint: '/sessions/:id/runs', hasReferenceTraceId: true },
    )).toEqual({
      analysisMode: 'fast',
      codeAwareMode: 'metadata_only',
      codebaseIds: ['a', 'b'],
    });
  });

  it('rejects unknown presets instead of passing them through', () => {
    expect(() => normalizeAnalyzeOptions(
      { preset: 'other' },
      { endpoint: '/analyze', hasReferenceTraceId: false },
    )).toThrow(/Unsupported analyze preset/);
  });

  it('rejects invalid smart action and selection payloads', () => {
    expect(() => normalizeAnalyzeOptions(
      { smartAction: 'preview' },
      { endpoint: '/analyze', hasReferenceTraceId: false },
    )).toThrow(/requires preset=smart/);

    expect(() => normalizeAnalyzeOptions(
      { preset: 'smart', smartAction: 'deep' },
      { endpoint: '/analyze', hasReferenceTraceId: false },
    )).toThrow(/Unsupported smartAction/);

    expect(() => normalizeAnalyzeOptions(
      { preset: 'smart', smartAction: 'analyze', smartSelection: { scope: 'scene_types' } },
      { endpoint: '/analyze', hasReferenceTraceId: false },
    )).toThrow(/sceneTypes is required/);
  });
});
