// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {describe, it, expect} from '@jest/globals';

import {
  computeBaselineDiff,
  evaluateRegressionGate,
  type RegressionRule,
  type TraceMetricSummary,
} from '../baselineDiffer';
import {
  type BaselineMetric,
  type BaselineRecord,
  type PerfBaselineKey,
  makeSparkProvenance,
} from '../../types/sparkContracts';

const KEY: PerfBaselineKey = {
  appId: 'anon-app',
  deviceId: 'anon-device',
  buildId: 'main-abc',
  cuj: 'scroll',
};

function makeMetric(
  metricId: string,
  median: number,
  overrides: Partial<BaselineMetric> = {},
): BaselineMetric {
  return {
    metricId,
    unit: 'ms',
    median,
    p95: median * 1.5,
    p99: median * 2,
    max: median * 3,
    sampleCount: 10,
    ...overrides,
  };
}

function makeBaseline(
  baselineId: string,
  metrics: BaselineMetric[],
): BaselineRecord {
  return {
    ...makeSparkProvenance({source: 'baseline-differ-test'}),
    baselineId,
    artifactId: 'art',
    capturedAt: 1714600000000,
    sampleCount: 10,
    key: KEY,
    status: 'reviewed',
    redactionState: 'partial',
    windowStartMs: 1714000000000,
    windowEndMs: 1714600000000,
    metrics,
  };
}

describe('computeBaselineDiff — happy path', () => {
  it('computes per-metric deltas with severity', () => {
    const base = makeBaseline('base', [
      makeMetric('frame.median_ms', 10),
      makeMetric('frame.jank_count', 4, {unit: 'count'}),
    ]);
    const candidate = makeBaseline('cand', [
      makeMetric('frame.median_ms', 20), // +100% — regression
      makeMetric('frame.jank_count', 4, {unit: 'count'}), // none
    ]);
    const diff = computeBaselineDiff(base, candidate);
    expect(diff.deltas).toHaveLength(2);
    const median = diff.deltas.find(d => d.metricId === 'frame.median_ms');
    expect(median?.severity).toBe('regression');
    expect(median?.deltaPct).toBeCloseTo(1.0, 5);
    const jank = diff.deltas.find(d => d.metricId === 'frame.jank_count');
    expect(jank?.severity).toBe('none');
  });

  it('classifies improvements as info regardless of magnitude', () => {
    const base = makeBaseline('base', [makeMetric('frame.median_ms', 20)]);
    const candidate = makeBaseline('cand', [
      makeMetric('frame.median_ms', 10), // -50%
    ]);
    const diff = computeBaselineDiff(base, candidate);
    expect(diff.deltas[0].severity).toBe('info');
    expect(diff.deltas[0].deltaPct).toBeCloseTo(-0.5, 5);
  });

  it('classifies sub-threshold change as none', () => {
    const base = makeBaseline('base', [makeMetric('frame.median_ms', 10)]);
    const candidate = makeBaseline('cand', [
      makeMetric('frame.median_ms', 10.02),
    ]);
    const diff = computeBaselineDiff(base, candidate);
    expect(diff.deltas[0].severity).toBe('none');
  });

  it('classifies mid-threshold change as warning', () => {
    const base = makeBaseline('base', [makeMetric('frame.median_ms', 10)]);
    const candidate = makeBaseline('cand', [
      makeMetric('frame.median_ms', 10.8), // +8% — warning
    ]);
    const diff = computeBaselineDiff(base, candidate);
    expect(diff.deltas[0].severity).toBe('warning');
  });

  it('describes a trace candidate by traceId', () => {
    const base = makeBaseline('base', [makeMetric('m', 10)]);
    const trace: TraceMetricSummary = {
      kind: 'trace',
      traceId: 'trace-abc',
      metrics: [makeMetric('m', 12)],
    };
    const diff = computeBaselineDiff(base, trace);
    expect(diff.candidate).toEqual({kind: 'trace', traceId: 'trace-abc'});
  });
});

describe('computeBaselineDiff — unsupported paths', () => {
  it('reports metric missing on candidate', () => {
    const base = makeBaseline('base', [makeMetric('only.base', 10)]);
    const candidate = makeBaseline('cand', []);
    const diff = computeBaselineDiff(base, candidate);
    const delta = diff.deltas[0];
    expect(delta.severity).toBe('unsupported');
    expect(delta.unsupportedReason).toMatch(/missing on candidate/);
    expect(delta.baseValue).toBe(10);
  });

  it('reports metric missing on baseline by default', () => {
    const base = makeBaseline('base', []);
    const candidate = makeBaseline('cand', [makeMetric('only.cand', 12)]);
    const diff = computeBaselineDiff(base, candidate);
    const delta = diff.deltas[0];
    expect(delta.severity).toBe('unsupported');
    expect(delta.unsupportedReason).toMatch(/missing on baseline/);
    expect(delta.candidateValue).toBe(12);
  });

  it('skips metrics missing on baseline when configured', () => {
    const base = makeBaseline('base', []);
    const candidate = makeBaseline('cand', [makeMetric('only.cand', 12)]);
    const diff = computeBaselineDiff(base, candidate, {
      reportMissingOnBase: false,
    });
    expect(diff.deltas).toHaveLength(0);
  });

  it('propagates unsupportedReason from a side metric', () => {
    const base = makeBaseline('base', [
      makeMetric('m', 10, {unsupportedReason: 'metric not collected'}),
    ]);
    const candidate = makeBaseline('cand', [makeMetric('m', 12)]);
    const diff = computeBaselineDiff(base, candidate);
    expect(diff.deltas[0].severity).toBe('unsupported');
    expect(diff.deltas[0].unsupportedReason).toMatch(/not collected/);
  });

  it('flags unit mismatch as unsupported', () => {
    const base = makeBaseline('base', [makeMetric('m', 10)]);
    const candidate = makeBaseline('cand', [
      makeMetric('m', 10, {unit: 'ns'}),
    ]);
    const diff = computeBaselineDiff(base, candidate);
    expect(diff.deltas[0].severity).toBe('unsupported');
    expect(diff.deltas[0].unsupportedReason).toMatch(/unit mismatch/);
  });

  it('flags low sample count as unsupported', () => {
    const base = makeBaseline('base', [
      makeMetric('m', 10, {sampleCount: 1}),
    ]);
    const candidate = makeBaseline('cand', [makeMetric('m', 12)]);
    const diff = computeBaselineDiff(base, candidate);
    expect(diff.deltas[0].severity).toBe('unsupported');
    expect(diff.deltas[0].unsupportedReason).toMatch(/sample count/);
  });

  it('flags divide-by-zero (baseValue=0) as unsupported', () => {
    const base = makeBaseline('base', [makeMetric('m', 0)]);
    const candidate = makeBaseline('cand', [makeMetric('m', 5)]);
    const diff = computeBaselineDiff(base, candidate);
    expect(diff.deltas[0].severity).toBe('unsupported');
    expect(diff.deltas[0].unsupportedReason).toMatch(/divide-by-zero/);
  });
});

describe('computeBaselineDiff — top regressions', () => {
  it('ranks regressions by absolute deltaPct', () => {
    const base = makeBaseline('base', [
      makeMetric('a', 10),
      makeMetric('b', 10),
      makeMetric('c', 10),
    ]);
    const candidate = makeBaseline('cand', [
      makeMetric('a', 11), // +10% — warning
      makeMetric('b', 30), // +200% — regression
      makeMetric('c', 15), // +50% — regression
    ]);
    const diff = computeBaselineDiff(base, candidate);
    expect(diff.topRegressions).toBeDefined();
    expect(diff.topRegressions?.[0].metricId).toBe('b');
    expect(diff.topRegressions?.[1].metricId).toBe('c');
  });
});

describe('evaluateRegressionGate', () => {
  function buildDiffWithDelta(deltaPct: number): ReturnType<typeof computeBaselineDiff> {
    const base = makeBaseline('base', [makeMetric('m', 10)]);
    const candidate = makeBaseline('cand', [
      makeMetric('m', 10 * (1 + deltaPct)),
    ]);
    return computeBaselineDiff(base, candidate);
  }

  it('passes when no rule is breached', () => {
    const diff = buildDiffWithDelta(0.02); // +2% — none
    const rules: RegressionRule[] = [{metricId: 'm', threshold: 0.10}];
    const gate = evaluateRegressionGate('base', diff, rules, {gateId: 'g1'});
    expect(gate.status).toBe('pass');
    expect(gate.rule).toBeUndefined();
  });

  it('fails when a rule is breached', () => {
    const diff = buildDiffWithDelta(0.20); // +20% — regression
    const rules: RegressionRule[] = [{metricId: 'm', threshold: 0.10}];
    const gate = evaluateRegressionGate('base', diff, rules, {gateId: 'g1'});
    expect(gate.status).toBe('fail');
    expect(gate.rule?.metricId).toBe('m');
    expect(gate.rule?.threshold).toBe(0.10);
  });

  it('returns flaky when an unsupported delta blocks confidence', () => {
    const base = makeBaseline('base', [makeMetric('m', 10)]);
    const candidate = makeBaseline('cand', [
      makeMetric('m', 10, {unsupportedReason: 'sensor disabled'}),
    ]);
    const diff = computeBaselineDiff(base, candidate);
    const rules: RegressionRule[] = [{metricId: 'm', threshold: 0.10}];
    const gate = evaluateRegressionGate('base', diff, rules, {gateId: 'g1'});
    expect(gate.status).toBe('flaky');
  });

  it('expectIncrease=false flips the threshold direction', () => {
    const diff = buildDiffWithDelta(-0.20); // -20%, an improvement vs default
    const rules: RegressionRule[] = [
      {metricId: 'm', threshold: 0.10, expectIncrease: false},
    ];
    const gate = evaluateRegressionGate('base', diff, rules, {gateId: 'g1'});
    expect(gate.status).toBe('fail');
    expect(gate.rule?.observed).toBeCloseTo(-0.20, 5);
  });

  it('skipReason omits diff and records reason', () => {
    const diff = buildDiffWithDelta(0.50);
    const gate = evaluateRegressionGate('base', diff, [], {
      gateId: 'g1',
      skipReason: 'baseline missing for this build',
    });
    expect(gate.status).toBe('skipped');
    expect(gate.diff).toBeUndefined();
    expect(gate.skipReason).toBe('baseline missing for this build');
  });
});
