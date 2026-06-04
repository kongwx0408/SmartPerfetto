// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

export interface KallsymsEntry {
  address: bigint;
  type: string;
  symbol: string;
  module?: string;
}

export function parseKallsyms(text: string): KallsymsEntry[] {
  const entries: KallsymsEntry[] = [];
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const match = line.trim().match(/^([0-9a-fA-F]+)\s+([A-Za-z])\s+(\S+)(?:\s+\[([^\]]+)\])?/);
    if (!match) continue;
    entries.push({
      address: BigInt(`0x${match[1]}`),
      type: match[2],
      symbol: match[3],
      ...(match[4] ? {module: match[4]} : {}),
    });
  }
  entries.sort((a, b) => a.address < b.address ? -1 : a.address > b.address ? 1 : 0);
  return entries;
}

export function resolveKallsymsAddress(
  entries: readonly KallsymsEntry[],
  address: bigint,
): {entry: KallsymsEntry; offset: bigint} | undefined {
  let lo = 0;
  let hi = entries.length - 1;
  let best: KallsymsEntry | undefined;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const entry = entries[mid];
    if (entry.address <= address) {
      best = entry;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best ? {entry: best, offset: address - best.address} : undefined;
}

