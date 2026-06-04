// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * sceneTraceDurationProbe — fast trace duration lookup for the preview
 * endpoint, deliberately bypassing the full scene_reconstruction skill.
 *
 * `trace_bounds` is a Perfetto stdlib table populated for every loaded
 * trace, so this query is O(1) and typically returns in <50ms regardless
 * of trace size. Cost: a single SQL round-trip into trace_processor_shell.
 *
 * Returns 0 on any failure (missing table, query error, NaN row); the
 * caller (`estimateSceneStoryCost`) interprets 0 as "unknown duration"
 * and falls back to MIN_EXPECTED_SCENES, so the preview still gives a
 * usable lower-bound estimate even if the probe misbehaves.
 */

import type { TraceProcessorService } from '../../services/traceProcessorService';

const PROBE_SQL =
  'SELECT (end_ts - start_ts) / 1e9 AS duration_sec FROM trace_bounds';

export async function probeTraceDuration(
  tps: TraceProcessorService,
  traceId: string,
): Promise<number> {
  try {
    const result = await tps.query(traceId, PROBE_SQL);
    if (!result?.rows?.length) return 0;
    const raw = result.rows[0][0];
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch (err) {
    console.warn(
      `[sceneTraceDurationProbe] trace_bounds probe failed for ${traceId}:`,
      (err as Error)?.message ?? err,
    );
    return 0;
  }
}
