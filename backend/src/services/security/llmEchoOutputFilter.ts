// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {createHash} from 'crypto';

export interface CodeRef {
  chunkId: string;
  codebaseId: string;
  filePath: string;
  lineRange?: {start: number; end: number};
  symbol?: string;
}

interface Pattern {
  text: string;
  hash: string;
  kind: 'exact' | 'line' | 'sliding' | 'canary';
  codeRef?: CodeRef;
}

export interface LlmEchoStats {
  bytesProcessed: number;
  hits: Array<{
    patternHash: string;
    patternKind: Pattern['kind'];
    codeRef?: CodeRef;
    replacement: string;
    atOffset: number;
  }>;
  redactedBytes: number;
}

function hash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 12);
}

function replacementFor(pattern: Pattern): string {
  if (pattern.kind === 'canary' || !pattern.codeRef) return '[REDACTED_CODE_ECHO]';
  const loc = pattern.codeRef.lineRange
    ? `${pattern.codeRef.filePath}:${pattern.codeRef.lineRange.start}-${pattern.codeRef.lineRange.end}`
    : pattern.codeRef.filePath;
  return `[Code: ${pattern.codeRef.symbol ?? pattern.codeRef.chunkId} @ ${loc}]`;
}

export class LLMEchoOutputStream {
  private patterns: Pattern[] = [];
  private buffer = '';
  private destroyed = false;
  private bytesProcessed = 0;
  private redactedBytes = 0;
  private hits: LlmEchoStats['hits'] = [];

  constructor(private readonly maxPatternLength = 2048) {}

  registerSnippet(snippet: string, ref: CodeRef): void {
    this.assertActive();
    this.addPattern(snippet, 'exact', ref);
    for (const line of snippet.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.length >= 8) this.addPattern(trimmed, 'line', ref);
    }
    for (let i = 0; i < snippet.length; i += 80) {
      const window = snippet.slice(i, i + 80).trim();
      if (window.length >= 16) this.addPattern(window, 'sliding', ref);
    }
    this.sortPatterns();
  }

  registerCanary(canary: string): void {
    this.assertActive();
    this.addPattern(canary, 'canary');
    this.sortPatterns();
  }

  write(tokenChunk: string | Buffer): string {
    this.assertActive();
    const text = Buffer.isBuffer(tokenChunk) ? tokenChunk.toString('utf-8') : tokenChunk;
    this.bytesProcessed += Buffer.byteLength(text);
    this.buffer += text;
    const redacted = this.redact(this.buffer);
    const safeWindow = Math.max(0, this.maxPatternLength - 1);
    if (redacted.length <= safeWindow) {
      this.buffer = redacted;
      return '';
    }
    const emitLength = redacted.length - safeWindow;
    const out = redacted.slice(0, emitLength);
    this.buffer = redacted.slice(emitLength);
    return out;
  }

  flush(): string {
    this.assertActive();
    const out = this.redact(this.buffer);
    this.buffer = '';
    return out;
  }

  stats(): LlmEchoStats {
    return {
      bytesProcessed: this.bytesProcessed,
      hits: [...this.hits],
      redactedBytes: this.redactedBytes,
    };
  }

  destroy(): void {
    this.buffer = '';
    this.patterns = [];
    this.destroyed = true;
  }

  private addPattern(text: string, kind: Pattern['kind'], codeRef?: CodeRef): void {
    const normalized = text.trim();
    if (!normalized) return;
    this.patterns.push({
      text: normalized,
      hash: hash(normalized),
      kind,
      ...(codeRef ? {codeRef} : {}),
    });
  }

  private sortPatterns(): void {
    const seen = new Set<string>();
    this.patterns = this.patterns
      .filter(pattern => {
        const key = `${pattern.kind}:${pattern.hash}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.text.length - a.text.length);
  }

  private redact(input: string): string {
    let output = input;
    for (const pattern of this.patterns) {
      let index = output.indexOf(pattern.text);
      while (index >= 0) {
        const replacement = replacementFor(pattern);
        this.hits.push({
          patternHash: pattern.hash,
          patternKind: pattern.kind,
          ...(pattern.codeRef ? {codeRef: pattern.codeRef} : {}),
          replacement,
          atOffset: index,
        });
        this.redactedBytes += Buffer.byteLength(pattern.text);
        output = output.slice(0, index) + replacement + output.slice(index + pattern.text.length);
        index = output.indexOf(pattern.text, index + replacement.length);
      }
    }
    return output;
  }

  private assertActive(): void {
    if (this.destroyed) {
      throw new Error('LLMEchoOutputStream has been destroyed');
    }
  }
}

