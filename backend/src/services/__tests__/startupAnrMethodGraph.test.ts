// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {describe, it, expect} from '@jest/globals';
import {buildStartupAnrMethodGraph} from '../startupAnrMethodGraph';
import {isUnsupported} from '../../types/sparkContracts';

describe('buildStartupAnrMethodGraph', () => {
  it('flips Spark #132 implemented when ART/JIT timings surface', () => {
    const c = buildStartupAnrMethodGraph({
      range: {startNs: 0, endNs: 1},
      startupPhases: [
        {
          phase: 'application_create',
          range: {startNs: 0, endNs: 1},
          artVerifierDurNs: 50_000_000,
          jitDurNs: 80_000_000,
        },
      ],
    });
    expect(c.coverage.find(x => x.sparkId === 132)?.status).toBe('implemented');
  });

  it('flips Spark #68 implemented for non-zero recomposition counts', () => {
    const c = buildStartupAnrMethodGraph({
      range: {startNs: 0, endNs: 1},
      startupPhases: [
        {
          phase: 'first_frame',
          range: {startNs: 0, endNs: 1},
          recompositionCount: 12,
        },
      ],
    });
    expect(c.coverage.find(x => x.sparkId === 68)?.status).toBe('implemented');
  });

  it('drops dangling method-trace children', () => {
    const c = buildStartupAnrMethodGraph({
      range: {startNs: 0, endNs: 1},
      methodTraceGraph: [
        {id: 'a', method: 'A', selfNs: 1, totalNs: 2, children: ['b', 'ghost']},
        {id: 'b', method: 'B', selfNs: 1, totalNs: 1},
      ],
    });
    expect(c.methodTraceGraph?.[0].children).toEqual(['b']);
  });

  it('flips Spark #72/#78 based on method-trace source', () => {
    const c = buildStartupAnrMethodGraph({
      range: {startNs: 0, endNs: 1},
      methodTraceGraph: [
        {id: 'a', method: 'A', selfNs: 1, totalNs: 1, source: 'matrix'},
        {id: 'b', method: 'B', selfNs: 1, totalNs: 1, source: 'bytecode'},
      ],
    });
    expect(c.coverage.find(x => x.sparkId === 72)?.status).toBe('implemented');
    expect(c.coverage.find(x => x.sparkId === 78)?.status).toBe('implemented');
  });

  it('marks unsupported when nothing supplied', () => {
    const c = buildStartupAnrMethodGraph({range: {startNs: 0, endNs: 1}});
    expect(isUnsupported(c)).toBe(true);
  });

  it('treats empty arrays as missing data, not as supported coverage (Codex regression)', () => {
    const c = buildStartupAnrMethodGraph({
      range: {startNs: 0, endNs: 1},
      startupPhases: [],
      anrAttributions: [],
      methodTraceGraph: [],
    });
    expect(isUnsupported(c)).toBe(true);
    expect(c.startupPhases).toBeUndefined();
    expect(c.anrAttributions).toBeUndefined();
    expect(c.methodTraceGraph).toBeUndefined();
    for (const entry of c.coverage) {
      expect(entry.status).toBe('scaffolded');
    }
  });
});
