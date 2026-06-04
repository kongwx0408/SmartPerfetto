// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * Atomic read/write of ~/.smartperfetto/index.json — the global session
 * catalog used by `smartperfetto list`. Hand-maintained rather than
 * reconstructed from the filesystem each time so `list` stays O(1).
 *
 * Atomicity is delegated to `atomicWriteFileSync` (tmp + rename with
 * pid/date/random suffix), which keeps concurrent CLI invocations from
 * colliding on the tmp path.
 */

import * as fs from 'fs';
import { atomicWriteFileSync } from '../../utils/atomicFileWriter';
import type { CliPaths } from './paths';
import type { CliSessionIndexEntry } from '../types';

export interface CliIndex {
  version: 1;
  sessions: Record<string, CliSessionIndexEntry>;
}

const EMPTY_INDEX: CliIndex = { version: 1, sessions: {} };

export function readIndex(paths: CliPaths): CliIndex {
  // Single read attempt — ENOENT (missing file, first run) and corrupt JSON
  // both fall through to an empty index, so there's no need for a separate
  // existsSync precheck (which would also open a TOCTOU race).
  try {
    const raw = fs.readFileSync(paths.indexFile, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.sessions) {
      return { ...EMPTY_INDEX, sessions: {} };
    }
    return { version: 1, sessions: parsed.sessions };
  } catch {
    return { ...EMPTY_INDEX, sessions: {} };
  }
}

export function writeIndex(paths: CliPaths, index: CliIndex): void {
  atomicWriteFileSync(paths.indexFile, JSON.stringify(index, null, 2));
}

/** Upsert a single session entry and atomically persist. */
export function upsertSession(paths: CliPaths, entry: CliSessionIndexEntry): void {
  const idx = readIndex(paths);
  idx.sessions[entry.sessionId] = entry;
  writeIndex(paths, idx);
}
