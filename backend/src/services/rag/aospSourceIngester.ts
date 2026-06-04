// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fsPromises from 'fs/promises';
import * as path from 'path';

import type {RagStore} from '../ragStore';
import type {CodebaseRegistry, CodebaseRef} from '../codebase/codebaseRegistry';
import {PathSecurityGate, type PathPreviewResult} from '../codebase/pathSecurityGate';
import {
  chunkSourceBySymbols,
  estimateTokenCount,
  languageForPath,
  stableChunkId,
} from './baseIngester';

const DEFAULT_MAX_CHUNK_CHARS = 2200;

export interface AospSourceIngestOptions {
  maxChunkChars?: number;
  pathPrefix?: string;
}

export interface AospSourceIngestResult {
  codebaseId: string;
  filesProcessed: number;
  chunksAdded: number;
  chunksSkipped: number;
  blockedFileCount: number;
  errors: Array<{filePath: string; reason: string}>;
}

function filterPreviewFiles(preview: PathPreviewResult, ref: CodebaseRef, opts: AospSourceIngestOptions) {
  const prefixes = [
    ...(ref.pathFilters ?? []),
    ...(opts.pathPrefix ? [opts.pathPrefix] : []),
  ].filter(Boolean).map(prefix => prefix.replace(/^\//, ''));
  if (prefixes.length === 0) return preview.acceptedFiles;
  return preview.acceptedFiles.filter(file =>
    prefixes.some(prefix => file.relativePath.startsWith(prefix)),
  );
}

export class AospSourceIngester {
  constructor(
    private readonly store: RagStore,
    private readonly registry: CodebaseRegistry,
    private readonly gate: PathSecurityGate = new PathSecurityGate(),
  ) {}

  async ingest(codebaseId: string, opts: AospSourceIngestOptions = {}): Promise<AospSourceIngestResult> {
    const ref = this.registry.get(codebaseId);
    if (!ref) throw new Error(`Codebase '${codebaseId}' not found`);
    if (ref.kind !== 'aosp') {
      throw new Error(`Codebase '${codebaseId}' is kind=${ref.kind}; AOSP ingestion requires aosp`);
    }
    if (!ref.licenseTag) {
      throw new Error(`AOSP codebase '${codebaseId}' requires licenseTag`);
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
        errors: [{filePath: ref.displayName, reason: preview.blockedReason ?? 'blocked'}],
      };
    }
    const result: AospSourceIngestResult = {
      codebaseId,
      filesProcessed: 0,
      chunksAdded: 0,
      chunksSkipped: 0,
      blockedFileCount: preview.skippedFiles.length,
      errors: [],
    };
    const maxChars = opts.maxChunkChars ?? DEFAULT_MAX_CHUNK_CHARS;
    for (const file of filterPreviewFiles(preview, ref, opts)) {
      result.filesProcessed++;
      await new Promise<void>(r => setImmediate(r));
      try {
        const content = await fsPromises.readFile(path.join(ref.rootRealpath, file.relativePath), 'utf-8');
        const chunks = chunkSourceBySymbols(content, maxChars);
        if (chunks.length === 0) {
          result.chunksSkipped++;
          continue;
        }
        for (const chunk of chunks) {
          this.store.addChunk({
            chunkId: stableChunkId([codebaseId, ref.indexGeneration, file.relativePath, chunk.startLine]),
            kind: 'aosp',
            uri: `codebase://${codebaseId}/${file.relativePath}`,
            title: file.relativePath.split('/').pop(),
            snippet: chunk.text,
            tokenCount: estimateTokenCount(chunk.text),
            license: ref.licenseTag,
            indexedAt: Date.now(),
            filePath: file.relativePath,
            lineRange: {start: chunk.startLine, end: chunk.endLine},
            ...(chunk.symbol ? {symbol: chunk.symbol} : {}),
            language: languageForPath(file.relativePath),
            ...(ref.commitHash ? {commitHash: ref.commitHash} : {}),
            ...(ref.buildId ? {buildId: ref.buildId} : {}),
            codebaseId,
            registryOrigin: 'codebase_registry',
          });
          result.chunksAdded++;
        }
      } catch (error) {
        result.chunksSkipped++;
        result.errors.push({filePath: file.relativePath, reason: error instanceof Error ? error.message : String(error)});
      }
    }
    this.store.flush();
    this.registry.updateIngestStatus(codebaseId, {
      lastIngestStatus: result.errors.length > 0 ? 'partial' : 'ok',
      lastIngestAt: Date.now(),
      lastIngestError: result.errors[0]?.reason,
      chunkCount: result.chunksAdded,
      blockedFileCount: result.blockedFileCount,
    });
    return result;
  }
}

