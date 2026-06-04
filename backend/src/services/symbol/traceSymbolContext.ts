// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

export interface TraceSymbolFrame {
  module?: string;
  buildId?: string;
  address?: string;
  relativePc?: string;
  symbol?: string;
}

export interface TraceSymbolContext {
  frames: TraceSymbolFrame[];
  hasBuildIds: boolean;
  modules: string[];
}

export function normalizeTraceSymbolRows(rows: readonly Record<string, unknown>[]): TraceSymbolContext {
  const frames: TraceSymbolFrame[] = [];
  const modules = new Set<string>();
  let hasBuildIds = false;
  for (const row of rows) {
    const module = firstString(row, ['module', 'module_name', 'mapping_name', 'name']);
    const buildId = firstString(row, ['build_id', 'buildId', 'buildid']);
    const address = firstString(row, ['address', 'addr', 'pc']);
    const relativePc = firstString(row, ['relative_pc', 'rel_pc', 'relativePc']);
    const symbol = firstString(row, ['symbol', 'function_name', 'frame_name']);
    if (!module && !buildId && !address && !relativePc && !symbol) continue;
    if (module) modules.add(module);
    if (buildId) hasBuildIds = true;
    frames.push({
      ...(module ? {module} : {}),
      ...(buildId ? {buildId} : {}),
      ...(address ? {address} : {}),
      ...(relativePc ? {relativePc} : {}),
      ...(symbol ? {symbol} : {}),
    });
  }
  return {frames, hasBuildIds, modules: Array.from(modules).sort()};
}

function firstString(row: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'bigint') return value.toString();
  }
  return undefined;
}

