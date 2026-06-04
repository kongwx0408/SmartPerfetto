// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {createHash} from 'crypto';
import * as fsPromises from 'fs/promises';
import * as path from 'path';

import type {RagStore} from '../ragStore';
import {redactSecrets} from '../security/secretPatterns';
import type {CodebaseRegistry, CodebaseRef} from '../codebase/codebaseRegistry';
import {PathSecurityGate, type PathPreviewResult} from '../codebase/pathSecurityGate';
import {
  chunkSourceBySymbols,
  detectSourceSymbol,
  estimateTokenCount,
  languageForPath,
} from './baseIngester';

const DEFAULT_MAX_CHUNK_CHARS = 2200;

export interface AppSourceIngestOptions {
  maxChunkChars?: number;
  pathPrefix?: string;
}

export interface AppSourceIngestError {
  filePath: string;
  reason: string;
}

export interface AppSourceIngestResult {
  codebaseId: string;
  filesProcessed: number;
  chunksAdded: number;
  chunksSkipped: number;
  blockedFileCount: number;
  redactionHitCount: number;
  errors: AppSourceIngestError[];
}

function makeChunkId(codebaseId: string, indexGeneration: number, relativePath: string, startLine: number): string {
  return createHash('sha256')
    .update(`${codebaseId}|${indexGeneration}|${relativePath}|${startLine}`)
    .digest('hex')
    .slice(0, 16);
}

const chunkSource = chunkSourceBySymbols;

function filterPreviewFiles(preview: PathPreviewResult, ref: CodebaseRef, opts: AppSourceIngestOptions) {
  const prefixes = [
    ...(ref.pathFilters ?? []),
    ...(opts.pathPrefix ? [opts.pathPrefix] : []),
  ].filter(Boolean);
  if (prefixes.length === 0) return preview.acceptedFiles;
  return preview.acceptedFiles.filter(file =>
    prefixes.some(prefix => file.relativePath.startsWith(prefix.replace(/^\//, ''))),
  );
}

export class AppSourceIngester {
  constructor(
    private readonly store: RagStore,
    private readonly registry: CodebaseRegistry,
    private readonly gate: PathSecurityGate = new PathSecurityGate(),
  ) {}

  async ingest(codebaseId: string, opts: AppSourceIngestOptions = {}): Promise<AppSourceIngestResult> {
    const ref = this.registry.get(codebaseId);
    if (!ref) {
      throw new Error(`Codebase '${codebaseId}' not found`);
    }
    if (ref.kind !== 'app_source') {
      throw new Error(`Codebase '${codebaseId}' is kind=${ref.kind}; app source ingestion requires app_source`);
    }

    const preview = await this.gate.preview(ref.rootRealpath);
    if (preview.blocked) {
      this.registry.updateIngestStatus(codebaseId, {
        lastIngestStatus: 'blocked_by_security',
        lastIngestAt: Date.now(),
        lastIngestError: preview.blockedReason,
        blockedFileCount: preview.skippedFiles.length,
      });
      return {
        codebaseId,
        filesProcessed: 0,
        chunksAdded: 0,
        chunksSkipped: 0,
        blockedFileCount: preview.skippedFiles.length,
        redactionHitCount: 0,
        errors: [{filePath: ref.displayName, reason: preview.blockedReason ?? 'blocked'}],
      };
    }

    const maxChars = opts.maxChunkChars ?? DEFAULT_MAX_CHUNK_CHARS;
    const result: AppSourceIngestResult = {
      codebaseId,
      filesProcessed: 0,
      chunksAdded: 0,
      chunksSkipped: 0,
      blockedFileCount: preview.skippedFiles.length,
      redactionHitCount: 0,
      errors: [],
    };

    for (const file of filterPreviewFiles(preview, ref, opts)) {
      result.filesProcessed++;
      await new Promise<void>(r => setImmediate(r));
      try {
        const absolutePath = path.join(ref.rootRealpath, file.relativePath);
        const content = await fsPromises.readFile(absolutePath, 'utf-8');
        const chunks = chunkSource(content, maxChars);
        if (chunks.length === 0) {
          result.chunksSkipped++;
          continue;
        }
        for (const chunk of chunks) {
          const redaction = redactSecrets(chunk.text);
          result.redactionHitCount += redaction.redactedCount;
          this.store.addChunk({
            chunkId: makeChunkId(codebaseId, ref.indexGeneration, file.relativePath, chunk.startLine),
            kind: 'app_source',
            uri: `codebase://${codebaseId}/${file.relativePath}`,
            title: file.relativePath.split('/').pop(),
            snippet: chunk.text,
            tokenCount: estimateTokenCount(chunk.text),
            indexedAt: Date.now(),
            filePath: file.relativePath,
            lineRange: {start: chunk.startLine, end: chunk.endLine},
            ...(chunk.symbol ? {symbol: chunk.symbol} : {}),
            language: languageForPath(file.relativePath),
            ...(ref.commitHash ? {commitHash: ref.commitHash} : {}),
            ...(ref.vendor ? {vendor: ref.vendor} : {}),
            ...(ref.buildId ? {buildId: ref.buildId} : {}),
            codebaseId,
            registryOrigin: 'codebase_registry',
          });
          result.chunksAdded++;
        }
      } catch (error) {
        result.chunksSkipped++;
        result.errors.push({
          filePath: file.relativePath,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.store.flush();
    this.registry.updateIngestStatus(codebaseId, {
      lastIngestStatus: result.errors.length > 0 ? 'partial' : 'ok',
      lastIngestAt: Date.now(),
      lastIngestError: result.errors[0]?.reason,
      chunkCount: result.chunksAdded,
      blockedFileCount: result.blockedFileCount,
      redactionHitCount: result.redactionHitCount,
    });
    return result;
  }
}

export const __TEST_ONLY__ = {
  chunkSource,
  detectSymbol: detectSourceSymbol,
  makeChunkId,
  languageFor: languageForPath,
};
