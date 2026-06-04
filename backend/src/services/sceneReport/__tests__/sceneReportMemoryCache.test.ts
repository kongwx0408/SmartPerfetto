// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * Unit tests for SceneReportMemoryCache — verifies LRU semantics
 * (eviction of oldest, promotion on get/set, delete, clear) using
 * minimal SceneReport fixtures.
 */

import { SceneReportMemoryCache } from '../sceneReportMemoryCache';
import type { SceneReport } from '../../../agent/scene/types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeReport(reportId: string): SceneReport {
  return {
    reportId,
    traceHash: null,
    traceId: `trace-${reportId}`,
    traceOrigin: 'external_rpc',
    cachePolicy: 'memory_session',
    expiresAt: null,
    createdAt: 0,
    traceMeta: { durationSec: 0 },
    displayedScenes: [],
    cachedDataEnvelopes: [],
    jobs: [],
    summary: null,
    insights: [],
    partialReport: false,
    totalDurationMs: 0,
    generatedBy: { runtime: 'claude-sdk', pipelineVersion: 'v2' },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SceneReportMemoryCache', () => {
  describe('constructor', () => {
    it('throws on non-positive maxSize', () => {
      expect(() => new SceneReportMemoryCache(0)).toThrow(/positive integer/);
      expect(() => new SceneReportMemoryCache(-1)).toThrow(/positive integer/);
    });

    it('throws on non-integer maxSize', () => {
      expect(() => new SceneReportMemoryCache(1.5)).toThrow(/positive integer/);
      expect(() => new SceneReportMemoryCache(Number.NaN)).toThrow(/positive integer/);
    });
  });

  describe('basic get/set/delete', () => {
    it('returns undefined on empty cache', () => {
      const cache = new SceneReportMemoryCache(3);
      expect(cache.get('missing')).toBeUndefined();
      expect(cache.size).toBe(0);
    });

    it('stores and retrieves a report', () => {
      const cache = new SceneReportMemoryCache(3);
      const r = makeReport('a');
      cache.set('trace-a', r);
      expect(cache.get('trace-a')).toBe(r);
      expect(cache.size).toBe(1);
    });

    it('isolates reports with the same traceId by route profile', () => {
      const cache = new SceneReportMemoryCache(3);
      const legacy = makeReport('legacy');
      const smart = makeReport('smart');

      cache.set('trace-a', legacy, 'legacy');
      cache.set('trace-a', smart, 'smart');

      expect(cache.get('trace-a', 'legacy')).toBe(legacy);
      expect(cache.get('trace-a', 'smart')).toBe(smart);
      expect(cache.size).toBe(2);
    });

    it('deletes an entry', () => {
      const cache = new SceneReportMemoryCache(3);
      cache.set('trace-a', makeReport('a'));
      expect(cache.delete('trace-a')).toBe(true);
      expect(cache.delete('trace-a')).toBe(false);
      expect(cache.get('trace-a')).toBeUndefined();
      expect(cache.size).toBe(0);
    });

    it('deletes only the requested route profile', () => {
      const cache = new SceneReportMemoryCache(3);
      cache.set('trace-a', makeReport('legacy'), 'legacy');
      cache.set('trace-a', makeReport('smart'), 'smart');

      expect(cache.delete('trace-a', 'smart')).toBe(true);
      expect(cache.get('trace-a', 'smart')).toBeUndefined();
      expect(cache.get('trace-a', 'legacy')?.reportId).toBe('legacy');
      expect(cache.size).toBe(1);
    });

    it('clears everything', () => {
      const cache = new SceneReportMemoryCache(3);
      cache.set('a', makeReport('a'));
      cache.set('b', makeReport('b'));
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeUndefined();
    });
  });

  describe('LRU eviction', () => {
    it('evicts the oldest entry when maxSize is exceeded', () => {
      const cache = new SceneReportMemoryCache(3);
      cache.set('a', makeReport('a'));
      cache.set('b', makeReport('b'));
      cache.set('c', makeReport('c'));
      expect(cache.size).toBe(3);

      // Adding 'd' evicts 'a' (oldest).
      cache.set('d', makeReport('d'));
      expect(cache.size).toBe(3);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')?.reportId).toBe('b');
      expect(cache.get('c')?.reportId).toBe('c');
      expect(cache.get('d')?.reportId).toBe('d');
    });

    it('promotes on get so the refreshed entry survives eviction', () => {
      const cache = new SceneReportMemoryCache(3);
      cache.set('a', makeReport('a'));
      cache.set('b', makeReport('b'));
      cache.set('c', makeReport('c'));

      // Touching 'a' moves it to the tail — 'b' becomes the oldest.
      cache.get('a');
      cache.set('d', makeReport('d'));

      expect(cache.get('a')?.reportId).toBe('a');
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')?.reportId).toBe('c');
      expect(cache.get('d')?.reportId).toBe('d');
    });

    it('re-setting an existing key refreshes without evicting', () => {
      const cache = new SceneReportMemoryCache(3);
      cache.set('a', makeReport('a'));
      cache.set('b', makeReport('b'));
      cache.set('c', makeReport('c'));

      // Re-inserting 'a' moves it to the tail → order becomes [b, c, a].
      // Important: no intermediate `get` calls here — each `get` would
      // promote its entry to MRU and defeat the eviction we want to assert.
      const updated = makeReport('a-v2');
      cache.set('a', updated);
      expect(cache.size).toBe(3);

      // Now 'b' is the oldest. Adding 'd' should evict 'b', not 'a'.
      cache.set('d', makeReport('d'));
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('a')).toBe(updated);
      expect(cache.get('c')?.reportId).toBe('c');
      expect(cache.get('d')?.reportId).toBe('d');
    });

    it('handles maxSize=1 degenerate case', () => {
      const cache = new SceneReportMemoryCache(1);
      cache.set('a', makeReport('a'));
      cache.set('b', makeReport('b'));
      expect(cache.size).toBe(1);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')?.reportId).toBe('b');
    });
  });
});
