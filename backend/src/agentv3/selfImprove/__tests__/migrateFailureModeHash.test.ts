// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { describe, it, expect } from '@jest/globals';
import {
  backfillPatternEntries,
  backfillNegativeEntries,
} from '../migrateFailureModeHash';
import type { AnalysisPatternEntry, NegativePatternEntry } from '../../types';

const baseEntry: AnalysisPatternEntry = {
  id: 'p1',
  traceFeatures: ['arch:FLUTTER', 'scene:scrolling'],
  sceneType: 'scrolling',
  keyInsights: [],
  architectureType: 'FLUTTER',
  confidence: 0.8,
  createdAt: 1700000000000,
  matchCount: 1,
};

const baseNegative: NegativePatternEntry = {
  id: 'n1',
  traceFeatures: ['arch:STANDARD', 'scene:startup'],
  sceneType: 'startup',
  failedApproaches: [],
  architectureType: 'STANDARD',
  createdAt: 1700000000000,
  matchCount: 1,
};

describe('backfillPatternEntries', () => {
  it('returns the same entry shape with failureModeHash filled in', () => {
    const { entries, report } = backfillPatternEntries([baseEntry]);
    expect(entries).toHaveLength(1);
    expect(entries[0].failureModeHash).toMatch(/^[a-f0-9]{16}$/);
    expect(report.total).toBe(1);
    expect(report.newlyHashed).toBe(1);
  });

  it('preserves existing failureModeHash and counts as alreadyHashed', () => {
    const seeded = { ...baseEntry, failureModeHash: 'deadbeefdeadbeef' };
    const { entries, report } = backfillPatternEntries([seeded]);
    expect(entries[0].failureModeHash).toBe('deadbeefdeadbeef');
    expect(report.alreadyHashed).toBe(1);
    expect(report.newlyHashed).toBe(0);
  });

  it('infers category=unknown when keyInsights are empty', () => {
    const { report } = backfillPatternEntries([baseEntry]);
    expect(report.byCategory.unknown).toBe(1);
  });

  it('classifies entries with diagnostic insights', () => {
    const e = { ...baseEntry, keyInsights: ['detected VSync misdiagnosis on VRR boundary'] };
    const { report } = backfillPatternEntries([e]);
    expect(report.byCategory.misdiagnosis_vsync_vrr).toBe(1);
  });

  it('captures up to 3 samples per category', () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({
      ...baseEntry,
      id: `p${i}`,
      keyInsights: [`no such table: t${i}`],
    }));
    const { report } = backfillPatternEntries(entries);
    expect(report.byCategory.sql_missing_table).toBe(5);
    expect(report.samples.sql_missing_table.length).toBe(3);
  });

  it('produces same hash for entries that share scene/arch/category', () => {
    const a = { ...baseEntry, id: 'a', keyInsights: ['no such table: x'] };
    const b = { ...baseEntry, id: 'b', keyInsights: ['no such table: y'] };
    const { entries } = backfillPatternEntries([a, b]);
    expect(entries[0].failureModeHash).toBe(entries[1].failureModeHash);
  });
});

describe('backfillNegativeEntries', () => {
  it('hashes each FailedApproach individually + entry overall', () => {
    const entry: NegativePatternEntry = {
      ...baseNegative,
      failedApproaches: [
        { type: 'sql_error', approach: 'SELECT *', reason: 'no such table: android_frames' },
        { type: 'tool_failure', approach: 'execute_sql', reason: 'connection timeout' },
      ],
    };
    const { entries, report } = backfillNegativeEntries([entry]);
    expect(entries[0].failureModeHash).toMatch(/^[a-f0-9]{16}$/);
    for (const a of entries[0].failedApproaches) {
      expect(a.failureModeHash).toMatch(/^[a-f0-9]{16}$/);
    }
    // The two approaches have different inferred categories, so distinct hashes.
    const hashes = new Set(entries[0].failedApproaches.map(a => a.failureModeHash));
    expect(hashes.size).toBe(2);
    expect(report.newlyHashed).toBe(1);
  });

  it('preserves existing approach-level hashes', () => {
    const entry: NegativePatternEntry = {
      ...baseNegative,
      failedApproaches: [
        { type: 'sql_error', approach: 'SELECT *', reason: 'no such table', failureModeHash: 'cafebabecafebabe' },
      ],
    };
    const { entries } = backfillNegativeEntries([entry]);
    expect(entries[0].failedApproaches[0].failureModeHash).toBe('cafebabecafebabe');
  });

  it('classifies negative entries with sql_missing_column reason', () => {
    const entry: NegativePatternEntry = {
      ...baseNegative,
      failedApproaches: [
        { type: 'sql_error', approach: 'SELECT bad', reason: 'no such column: bad' },
      ],
    };
    const { report } = backfillNegativeEntries([entry]);
    expect(report.byCategory.sql_missing_column).toBe(1);
  });

  it('counts already-hashed negative entries without re-hashing', () => {
    const entry: NegativePatternEntry = {
      ...baseNegative,
      failureModeHash: 'feedfacefeedface',
      failedApproaches: [],
    };
    const { entries, report } = backfillNegativeEntries([entry]);
    expect(entries[0].failureModeHash).toBe('feedfacefeedface');
    expect(report.alreadyHashed).toBe(1);
    expect(report.newlyHashed).toBe(0);
  });
});
