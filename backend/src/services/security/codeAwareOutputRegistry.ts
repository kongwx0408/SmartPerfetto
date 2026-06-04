// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import type {SanitizedRagResult} from '../rag/lookupResponseFilter';
import {LLMEchoOutputStream, type CodeRef} from './llmEchoOutputFilter';

const sessionStreams = new Map<string, LLMEchoOutputStream>();

function streamFor(sessionId: string): LLMEchoOutputStream {
  let stream = sessionStreams.get(sessionId);
  if (!stream) {
    stream = new LLMEchoOutputStream();
    sessionStreams.set(sessionId, stream);
  }
  return stream;
}

export function registerCodeAwareLookupForEcho(sessionId: string | undefined, result: SanitizedRagResult): void {
  if (!sessionId) return;
  const stream = streamFor(sessionId);
  for (const hit of result.hits) {
    if (!hit.snippet || !hit.metadata?.codebaseId || !hit.metadata.filePath) continue;
    const ref: CodeRef = {
      chunkId: hit.chunkId,
      codebaseId: hit.metadata.codebaseId,
      filePath: hit.metadata.filePath,
      ...(hit.metadata.lineRange ? {lineRange: hit.metadata.lineRange} : {}),
      ...(hit.metadata.symbol ? {symbol: hit.metadata.symbol} : {}),
    };
    stream.registerSnippet(hit.snippet, ref);
  }
}

export function registerCodeAwareCanary(sessionId: string | undefined, canary: string): void {
  if (!sessionId || !canary) return;
  streamFor(sessionId).registerCanary(canary);
}

export function sanitizeCodeAwareText(sessionId: string | undefined, text: string): string {
  if (!sessionId || !text) return text;
  const stream = sessionStreams.get(sessionId);
  if (!stream) return text;
  return stream.write(text) + stream.flush();
}

export function clearCodeAwareOutputGuards(sessionId: string): void {
  const stream = sessionStreams.get(sessionId);
  stream?.destroy();
  sessionStreams.delete(sessionId);
}

