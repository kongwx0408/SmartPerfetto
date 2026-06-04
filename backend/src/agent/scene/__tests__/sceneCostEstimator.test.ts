// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * Golden tests for estimateSceneStoryCost. The formula is v1 heuristic;
 * these tests pin the intended output for a handful of representative
 * points so any later refactor flags unexpected drift.
 */

import { estimateSceneStoryCost } from '../sceneCostEstimator';

describe('estimateSceneStoryCost', () => {
  // -------------------------------------------------------------------------
  // expectedScenes — clamped to [5, 20], ceil(duration / 10)
  // -------------------------------------------------------------------------

  describe('expectedScenes clamping', () => {
    it('floors short traces to MIN_EXPECTED_SCENES = 5', () => {
      expect(estimateSceneStoryCost({ traceDurationSec: 5 }).expectedScenes).toBe(5);
      expect(estimateSceneStoryCost({ traceDurationSec: 0 }).expectedScenes).toBe(5);
      expect(estimateSceneStoryCost({ traceDurationSec: 40 }).expectedScenes).toBe(5);
    });

    it('scales linearly in the 50..200 range', () => {
      expect(estimateSceneStoryCost({ traceDurationSec: 50 }).expectedScenes).toBe(5);
      expect(estimateSceneStoryCost({ traceDurationSec: 51 }).expectedScenes).toBe(6);
      expect(estimateSceneStoryCost({ traceDurationSec: 100 }).expectedScenes).toBe(10);
      expect(estimateSceneStoryCost({ traceDurationSec: 155 }).expectedScenes).toBe(16);
    });

    it('caps long traces to MAX_EXPECTED_SCENES = 20', () => {
      expect(estimateSceneStoryCost({ traceDurationSec: 200 }).expectedScenes).toBe(20);
      expect(estimateSceneStoryCost({ traceDurationSec: 600 }).expectedScenes).toBe(20);
      expect(estimateSceneStoryCost({ traceDurationSec: 36_000 }).expectedScenes).toBe(20);
    });

    it('treats negative / NaN / Infinity durations as 0', () => {
      expect(estimateSceneStoryCost({ traceDurationSec: -10 }).expectedScenes).toBe(5);
      expect(estimateSceneStoryCost({ traceDurationSec: Number.NaN }).expectedScenes).toBe(5);
      expect(estimateSceneStoryCost({ traceDurationSec: Infinity }).expectedScenes).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // etaSec — 8 (Stage1) + ceil(scenes/concurrency)*30 (Stage2) + 5 (Stage3)
  // -------------------------------------------------------------------------

  describe('etaSec formula', () => {
    it('uses default concurrency=3 when not supplied', () => {
      // 5 scenes / 3 = ceil(1.66) = 2 batches → 8 + 2*30 + 5 = 73
      expect(estimateSceneStoryCost({ traceDurationSec: 10 }).etaSec).toBe(73);
    });

    it('halves batches when concurrency=6', () => {
      // 20 scenes / 3 = 7 batches → 8 + 210 + 5 = 223
      expect(estimateSceneStoryCost({ traceDurationSec: 200 }).etaSec).toBe(223);
      // 20 scenes / 6 = 4 batches → 8 + 120 + 5 = 133
      expect(
        estimateSceneStoryCost({ traceDurationSec: 200, concurrency: 6 }).etaSec,
      ).toBe(133);
    });

    it('falls back to default concurrency when given a bad value', () => {
      const baseline = estimateSceneStoryCost({ traceDurationSec: 100 });
      expect(estimateSceneStoryCost({ traceDurationSec: 100, concurrency: 0 }).etaSec)
        .toBe(baseline.etaSec);
      expect(estimateSceneStoryCost({ traceDurationSec: 100, concurrency: -2 }).etaSec)
        .toBe(baseline.etaSec);
      expect(
        estimateSceneStoryCost({ traceDurationSec: 100, concurrency: Number.NaN }).etaSec,
      ).toBe(baseline.etaSec);
    });

    it('floors non-integer concurrency', () => {
      // concurrency 3.9 → 3 → same as default
      expect(
        estimateSceneStoryCost({ traceDurationSec: 100, concurrency: 3.9 }).etaSec,
      ).toBe(estimateSceneStoryCost({ traceDurationSec: 100 }).etaSec);
    });
  });

  // -------------------------------------------------------------------------
  // estimatedUsd — scenes * 0.04 + 0.01
  // -------------------------------------------------------------------------

  describe('estimatedUsd formula', () => {
    it('uses flat per-scene + baseline cost', () => {
      // 5 scenes → 5*0.04 + 0.01 = 0.21
      expect(estimateSceneStoryCost({ traceDurationSec: 10 }).estimatedUsd).toBeCloseTo(0.21, 4);
      // 20 scenes → 20*0.04 + 0.01 = 0.81
      expect(estimateSceneStoryCost({ traceDurationSec: 300 }).estimatedUsd).toBeCloseTo(0.81, 4);
    });

    it('rounds to 4 decimals', () => {
      const estimate = estimateSceneStoryCost({ traceDurationSec: 100 });
      const decimals = (estimate.estimatedUsd.toString().split('.')[1] ?? '').length;
      expect(decimals).toBeLessThanOrEqual(4);
    });
  });

  // -------------------------------------------------------------------------
  // confidence — always 'low' in v1
  // -------------------------------------------------------------------------

  it("always reports confidence='low' in v1", () => {
    expect(estimateSceneStoryCost({ traceDurationSec: 5 }).confidence).toBe('low');
    expect(estimateSceneStoryCost({ traceDurationSec: 200 }).confidence).toBe('low');
    expect(estimateSceneStoryCost({ traceDurationSec: 36_000 }).confidence).toBe('low');
  });
});
