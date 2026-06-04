// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * sceneCostEstimator — pure heuristic for the Scene Story preview endpoint.
 *
 * Given a trace duration (seconds) and the configured concurrency, predicts
 * how many AnalysisIntervals we will likely create, how long the pipeline
 * will take end-to-end, and the rough Claude spend.
 *
 * v1 is intentionally formula-only. `confidence: 'low'` is the honest
 * signal that there is no telemetry feedback loop yet — a later PR can
 * replace the fixed per-batch / per-scene constants with values derived
 * from historical jobs.
 */

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

export interface CostEstimateInput {
  /** Trace duration in seconds. Values <= 0 or non-finite are clamped to 0. */
  traceDurationSec: number;
  /** Override the configured JobRunner concurrency. Defaults to 3. */
  concurrency?: number;
}

export interface CostEstimate {
  /** Number of AnalysisIntervals we expect to schedule. */
  expectedScenes: number;
  /** Total end-to-end wall-clock estimate in seconds. */
  etaSec: number;
  /** Rough Claude spend estimate in USD. */
  estimatedUsd: number;
  /**
   * Always 'low' in v1 because the formula is pure heuristic. A future
   * telemetry-backed estimator may promote this to 'medium'/'high'.
   */
  confidence: 'low' | 'medium' | 'high';
}

// ---------------------------------------------------------------------------
// Formula constants — centralised so a later PR can tune them in one place
// ---------------------------------------------------------------------------

const MIN_EXPECTED_SCENES = 5;
const MAX_EXPECTED_SCENES = 20;
const SCENE_DURATION_DIVISOR_SEC = 10;

const STAGE1_PROBE_SEC = 8;
const STAGE2_PER_BATCH_SEC = 30;
const STAGE3_SUMMARY_SEC = 5;

const USD_PER_SCENE = 0.04;
const USD_BASELINE = 0.01;

const DEFAULT_CONCURRENCY = 3;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function estimateSceneStoryCost(input: CostEstimateInput): CostEstimate {
  const safeDuration =
    Number.isFinite(input.traceDurationSec) && input.traceDurationSec > 0
      ? input.traceDurationSec
      : 0;

  const rawConcurrency = input.concurrency ?? DEFAULT_CONCURRENCY;
  const safeConcurrency =
    Number.isFinite(rawConcurrency) && rawConcurrency >= 1
      ? Math.floor(rawConcurrency)
      : DEFAULT_CONCURRENCY;

  const expectedScenes = Math.min(
    Math.max(MIN_EXPECTED_SCENES, Math.ceil(safeDuration / SCENE_DURATION_DIVISOR_SEC)),
    MAX_EXPECTED_SCENES,
  );

  const batches = Math.ceil(expectedScenes / safeConcurrency);
  const etaSec = STAGE1_PROBE_SEC + batches * STAGE2_PER_BATCH_SEC + STAGE3_SUMMARY_SEC;

  // Round to 4 decimals to avoid float display noise in the JSON response.
  const estimatedUsd =
    Math.round((expectedScenes * USD_PER_SCENE + USD_BASELINE) * 10_000) / 10_000;

  return {
    expectedScenes,
    etaSec,
    estimatedUsd,
    confidence: 'low',
  };
}
