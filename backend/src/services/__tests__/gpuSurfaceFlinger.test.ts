// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {describe, it, expect} from '@jest/globals';
import {
  buildGpuSurfaceFlinger,
  summarizeComposition,
} from '../gpuSurfaceFlinger';
import {isUnsupported} from '../../types/sparkContracts';

describe('buildGpuSurfaceFlinger', () => {
  it('flags Spark #14 implemented when render stages or GPU memory provided', () => {
    const c = buildGpuSurfaceFlinger({
      range: {startNs: 0, endNs: 1},
      renderStages: [{stage: 'fragment_shading', durNs: 12_000_000}],
    });
    expect(c.coverage.find(x => x.sparkId === 14)?.status).toBe('implemented');
  });

  it('flags AGI as Spark #65/#106 and vendor profiler as #66/#107', () => {
    const c = buildGpuSurfaceFlinger({
      range: {startNs: 0, endNs: 1},
      vendorProfilerImports: [
        {kind: 'agi', summary: 'AGI snapshot'},
        {kind: 'mali', summary: 'Mali snapshot'},
      ],
    });
    expect(c.coverage.find(x => x.sparkId === 65)?.status).toBe('implemented');
    expect(c.coverage.find(x => x.sparkId === 66)?.status).toBe('implemented');
    expect(c.coverage.find(x => x.sparkId === 106)?.status).toBe('implemented');
    expect(c.coverage.find(x => x.sparkId === 107)?.status).toBe('implemented');
  });

  it('marks unsupported when nothing supplied', () => {
    const c = buildGpuSurfaceFlinger({range: {startNs: 0, endNs: 1}});
    expect(isUnsupported(c)).toBe(true);
  });

  it('treats empty arrays as missing data, not as supported coverage (Codex regression)', () => {
    const c = buildGpuSurfaceFlinger({
      range: {startNs: 0, endNs: 1},
      renderStages: [],
      surfaceFlingerCompositions: [],
      gpuMemory: [],
      vendorProfilerImports: [],
    });
    expect(isUnsupported(c)).toBe(true);
    expect(c.renderStages).toBeUndefined();
    expect(c.surfaceFlingerCompositions).toBeUndefined();
    expect(c.gpuMemory).toBeUndefined();
    expect(c.vendorProfilerImports).toBeUndefined();
    for (const entry of c.coverage) {
      expect(entry.status).toBe('scaffolded');
    }
  });
});

describe('summarizeComposition', () => {
  it('computes HWC fallback rate and BufferStuffing count', () => {
    const summary = summarizeComposition([
      {vsyncId: 1, ts: 1, hwcFallback: true, bufferStuffing: false},
      {vsyncId: 2, ts: 2, hwcFallback: false, bufferStuffing: true},
      {vsyncId: 3, ts: 3, hwcFallback: true, bufferStuffing: true},
      {vsyncId: 4, ts: 4, hwcFallback: false, bufferStuffing: false},
    ]);
    expect(summary.total).toBe(4);
    expect(summary.fallbackRate).toBe(0.5);
    expect(summary.bufferStuffedCount).toBe(2);
  });

  it('returns zeros for empty input', () => {
    expect(summarizeComposition(undefined).total).toBe(0);
    expect(summarizeComposition([]).fallbackRate).toBe(0);
  });
});
