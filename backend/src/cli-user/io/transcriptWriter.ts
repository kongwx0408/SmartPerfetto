// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * Append-only JSONL writers for transcript + raw stream logs.
 *
 * Why JSONL: resilient to partial writes (each line stands alone), trivial
 * to grep/tail, and future tooling can aggregate across sessions with
 * a one-liner like `cat ~/.smartperfetto/sessions/<id>/transcript.jsonl | jq`.
 */

import * as fs from 'fs';
import type { CliTranscriptTurn } from '../types';

/** Append one serialized line to a JSONL file. Creates the file if missing. */
function appendJsonLine(filePath: string, obj: unknown): void {
  fs.appendFileSync(filePath, `${JSON.stringify(obj)}\n`, 'utf-8');
}

export function appendTranscriptTurn(transcriptFile: string, turn: CliTranscriptTurn): void {
  appendJsonLine(transcriptFile, turn);
}

/** Append a raw StreamingUpdate event. PR1 always writes — PR4 may add `--no-stream-log`. */
export function appendStreamEvent(streamFile: string, event: unknown): void {
  appendJsonLine(streamFile, event);
}
