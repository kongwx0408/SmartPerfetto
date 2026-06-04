// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * GPU / SurfaceFlinger / Composition Aggregator (Spark Plan 16)
 *
 * Joins render-stage breakdown, SurfaceFlinger composition, GPU memory
 * snapshots, vendor profiler imports and SF latency parser output into one
 * `GpuSurfaceFlingerContract`.
 */

import {
  makeSparkProvenance,
  type GpuMemorySnapshot,
  type GpuProfilerImport,
  type GpuRenderStage,
  type GpuSurfaceFlingerContract,
  type NsTimeRange,
  type SurfaceFlingerComposition,
} from '../types/sparkContracts';

export interface GpuSurfaceFlingerOptions {
  range: NsTimeRange;
  renderStages?: GpuRenderStage[];
  surfaceFlingerCompositions?: SurfaceFlingerComposition[];
  gpuMemory?: GpuMemorySnapshot[];
  vendorProfilerImports?: GpuProfilerImport[];
  surfaceFlingerLatency?: GpuSurfaceFlingerContract['surfaceFlingerLatency'];
}

/** "Has data" guard that rejects both undefined and [] (Codex regression). */
function hasRows<T>(rows: T[] | undefined): rows is T[] {
  return Array.isArray(rows) && rows.length > 0;
}

export function buildGpuSurfaceFlinger(
  options: GpuSurfaceFlingerOptions,
): GpuSurfaceFlingerContract {
  const hasRender = hasRows(options.renderStages);
  const hasSf = hasRows(options.surfaceFlingerCompositions);
  const hasGpuMem = hasRows(options.gpuMemory);
  const hasVendor = hasRows(options.vendorProfilerImports);
  const hasLatency = Boolean(options.surfaceFlingerLatency);

  const allEmpty = !hasRender && !hasSf && !hasGpuMem && !hasVendor && !hasLatency;

  const hasAgi = hasVendor && options.vendorProfilerImports!.some(v => v.kind === 'agi');
  const hasNonAgi = hasVendor && options.vendorProfilerImports!.some(v => v.kind !== 'agi');
  const hasNamedVendor = hasVendor && options.vendorProfilerImports!.some(
    v => v.kind === 'mali' || v.kind === 'snapdragon' || v.kind === 'powervr',
  );

  return {
    ...makeSparkProvenance({
      source: 'gpu-surfaceflinger',
      ...(allEmpty ? {unsupportedReason: 'no GPU / SF facets supplied'} : {}),
    }),
    range: options.range,
    ...(hasRender ? {renderStages: options.renderStages} : {}),
    ...(hasSf ? {surfaceFlingerCompositions: options.surfaceFlingerCompositions} : {}),
    ...(hasGpuMem ? {gpuMemory: options.gpuMemory} : {}),
    ...(hasVendor ? {vendorProfilerImports: options.vendorProfilerImports} : {}),
    ...(hasLatency ? {surfaceFlingerLatency: options.surfaceFlingerLatency} : {}),
    coverage: [
      {sparkId: 14, planId: '16', status: hasRender || hasGpuMem ? 'implemented' : 'scaffolded'},
      {sparkId: 19, planId: '16', status: hasSf ? 'implemented' : 'scaffolded'},
      {sparkId: 46, planId: '16', status: hasLatency ? 'implemented' : 'scaffolded'},
      {sparkId: 65, planId: '16', status: hasAgi ? 'implemented' : 'scaffolded'},
      {sparkId: 66, planId: '16', status: hasNamedVendor ? 'implemented' : 'scaffolded'},
      {sparkId: 106, planId: '16', status: hasAgi ? 'implemented' : 'scaffolded'},
      {sparkId: 107, planId: '16', status: hasNonAgi ? 'implemented' : 'scaffolded'},
    ],
  };
}

/**
 * Detect HWC fallback rate over a window of compositions. Returns
 * fallbackRate ∈ [0,1] and the count of stuffed-buffer frames.
 */
export function summarizeComposition(
  compositions: SurfaceFlingerComposition[] | undefined,
): {fallbackRate: number; bufferStuffedCount: number; total: number} {
  if (!compositions || compositions.length === 0) {
    return {fallbackRate: 0, bufferStuffedCount: 0, total: 0};
  }
  const fallback = compositions.filter(c => c.hwcFallback === true).length;
  const stuffed = compositions.filter(c => c.bufferStuffing === true).length;
  return {
    fallbackRate: fallback / compositions.length,
    bufferStuffedCount: stuffed,
    total: compositions.length,
  };
}
