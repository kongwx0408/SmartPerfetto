// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * Memory / LMK / DMABUF Root-Cause Graph builder (Spark Plan 14)
 *
 * Combines five orthogonal memory facets (process snapshots, LMK kills,
 * DMA/DMABUF allocations, external artifacts, baseline diff) into one
 * `MemoryRootCauseContract`.
 */

import {
  makeSparkProvenance,
  type DmaBufAllocation,
  type LmkKillEvent,
  type MemoryExternalArtifact,
  type MemoryRootCauseContract,
  type NsTimeRange,
  type ProcessMemorySnapshot,
} from '../types/sparkContracts';

export interface MemoryRootCauseInput {
  range: NsTimeRange;
  processSnapshots?: ProcessMemorySnapshot[];
  lmkEvents?: LmkKillEvent[];
  dmaAllocations?: DmaBufAllocation[];
  externalArtifacts?: MemoryExternalArtifact[];
  baseline?: {
    baselineId: string;
    /** Map of `topContributors` keyed by category (graphics_buffer, java_heap, …). */
    perCategoryBytes?: Record<string, number>;
    /** Total delta against the baseline in bytes. */
    deltaBytes: number;
  };
}

/** Sort and slice the largest deltas from a per-category map. */
function topContributors(
  perCategory: Record<string, number> | undefined,
  topK = 5,
): Array<{key: string; deltaBytes: number}> | undefined {
  if (!perCategory) return undefined;
  return Object.entries(perCategory)
    .map(([key, deltaBytes]) => ({key, deltaBytes}))
    .sort((a, b) => Math.abs(b.deltaBytes) - Math.abs(a.deltaBytes))
    .slice(0, topK);
}

/** "Has data" guard that rejects both undefined and [] (Codex regression). */
function hasRows<T>(rows: T[] | undefined): rows is T[] {
  return Array.isArray(rows) && rows.length > 0;
}

export function buildMemoryRootCause(
  input: MemoryRootCauseInput,
): MemoryRootCauseContract {
  const hasProcess = hasRows(input.processSnapshots);
  const hasLmk = hasRows(input.lmkEvents);
  const hasDma = hasRows(input.dmaAllocations);
  const hasExternal = hasRows(input.externalArtifacts);

  const baselineDiff = input.baseline
    ? {
      baselineId: input.baseline.baselineId,
      deltaBytes: input.baseline.deltaBytes,
      ...(input.baseline.perCategoryBytes
        ? {topContributors: topContributors(input.baseline.perCategoryBytes)}
        : {}),
    }
    : undefined;

  const allEmpty =
    !hasProcess
    && !hasLmk
    && !hasDma
    && !hasExternal
    && !baselineDiff;

  return {
    ...makeSparkProvenance({
      source: 'memory-root-cause',
      ...(allEmpty ? {unsupportedReason: 'no memory facets supplied'} : {}),
    }),
    range: input.range,
    ...(hasProcess ? {processSnapshots: input.processSnapshots} : {}),
    ...(hasLmk ? {lmkEvents: input.lmkEvents} : {}),
    ...(hasDma ? {dmaAllocations: input.dmaAllocations} : {}),
    ...(hasExternal ? {externalArtifacts: input.externalArtifacts} : {}),
    ...(baselineDiff ? {baselineDiff} : {}),
    coverage: [
      {sparkId: 11, planId: '14', status: hasProcess ? 'implemented' : 'scaffolded'},
      {sparkId: 12, planId: '14', status: hasLmk ? 'implemented' : 'scaffolded'},
      {sparkId: 13, planId: '14', status: hasDma ? 'implemented' : 'scaffolded'},
      {sparkId: 34, planId: '14', status: baselineDiff ? 'implemented' : 'scaffolded'},
      {sparkId: 51, planId: '14', status: hasExternal && input.externalArtifacts!.some(a => a.kind === 'leak_canary') ? 'implemented' : 'scaffolded'},
      {sparkId: 70, planId: '14', status: hasExternal && input.externalArtifacts!.some(a => a.kind === 'leak_canary') ? 'implemented' : 'scaffolded'},
      {sparkId: 109, planId: '14', status: hasExternal && input.externalArtifacts!.some(a => a.kind === 'leak_canary') ? 'implemented' : 'scaffolded'},
      {sparkId: 112, planId: '14', status: hasExternal && input.externalArtifacts!.some(a => a.kind === 'koom') ? 'implemented' : 'scaffolded'},
    ],
  };
}
