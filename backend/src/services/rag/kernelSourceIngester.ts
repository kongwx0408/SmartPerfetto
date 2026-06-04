// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fsPromises from 'fs/promises';
import * as path from 'path';

import type {RagStore} from '../ragStore';
import type {CodebaseRegistry, CodebaseRef} from '../codebase/codebaseRegistry';
import {PathSecurityGate, type PathPreviewResult} from '../codebase/pathSecurityGate';
import {redactSecrets} from '../security/secretPatterns';
import {
  chunkSourceBySymbols,
  estimateTokenCount,
  languageForPath,
  stableChunkId,
} from './baseIngester';

const DEFAULT_MAX_CHUNK_CHARS = 1800;
const UNKNOWN_LICENSE = 'UNKNOWN';

export interface KernelSourceIngestOptions {
  maxChunkChars?: number;
  pathPrefix?: string;
}

export interface KernelSourceIngestError {
  filePath: string;
  reason: string;
}

export interface KernelSourceIngestResult {
  codebaseId: string;
  filesProcessed: number;
  chunksAdded: number;
  chunksSkipped: number;
  blockedFileCount: number;
  redactionHitCount: number;
  errors: KernelSourceIngestError[];
}

function spdxLicense(content: string): string | undefined {
  const header = content.split(/\r?\n/).slice(0, 12).join('\n');
  const match = header.match(/SPDX-License-Identifier:\s*([A-Za-z0-9+_.()-]+(?:\s+(?:WITH|OR|AND)\s+[A-Za-z0-9+_.()-]+)*)/);
  return match?.[1]?.trim();
}

function filterPreviewFiles(preview: PathPreviewResult, ref: CodebaseRef, opts: KernelSourceIngestOptions) {
  const prefixes = [
    ...(ref.pathFilters ?? []),
    ...(opts.pathPrefix ? [opts.pathPrefix] : []),
  ].filter(Boolean).map(prefix => prefix.replace(/^\//, ''));
  if (prefixes.length === 0) return [];
  return preview.acceptedFiles.filter(file =>
    prefixes.some(prefix => file.relativePath.startsWith(prefix)),
  );
}

export class KernelSourceIngester {
  constructor(
    private readonly store: RagStore,
    private readonly registry: CodebaseRegistry,
    private readonly gate: PathSecurityGate = new PathSecurityGate(),
  ) {}

  async ingest(codebaseId: string, opts: KernelSourceIngestOptions = {}): Promise<KernelSourceIngestResult> {
    const ref = this.registry.get(codebaseId);
    if (!ref) {
      throw new Error(`Codebase '${codebaseId}' not found`);
    }
    if (ref.kind !== 'kernel_source') {
      throw new Error(`Codebase '${codebaseId}' is kind=${ref.kind}; kernel ingestion requires kernel_source`);
    }
    if (!ref.vendor) {
      throw new Error(`Kernel codebase '${codebaseId}' requires vendor`);
    }
    if ((ref.pathFilters ?? []).length === 0 && !opts.pathPrefix) {
      throw new Error(`Kernel codebase '${codebaseId}' requires pathFilters or pathPrefix`);
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

    const result: KernelSourceIngestResult = {
      codebaseId,
      filesProcessed: 0,
      chunksAdded: 0,
      chunksSkipped: 0,
      blockedFileCount: preview.skippedFiles.length,
      redactionHitCount: 0,
      errors: [],
    };
    const maxChars = opts.maxChunkChars ?? DEFAULT_MAX_CHUNK_CHARS;

    for (const file of filterPreviewFiles(preview, ref, opts)) {
      result.filesProcessed++;
      await new Promise<void>(r => setImmediate(r));
      try {
        const absolutePath = path.join(ref.rootRealpath, file.relativePath);
        const content = await fsPromises.readFile(absolutePath, 'utf-8');
        const license = ref.licenseTag ?? spdxLicense(content);
        const chunks = chunkSourceBySymbols(content, maxChars);
        if (chunks.length === 0) {
          result.chunksSkipped++;
          continue;
        }
        for (const chunk of chunks) {
          const redaction = redactSecrets(chunk.text);
          result.redactionHitCount += redaction.redactedCount;
          this.store.addChunk({
            chunkId: stableChunkId([codebaseId, ref.indexGeneration, file.relativePath, chunk.startLine]),
            kind: 'kernel_source',
            uri: `codebase://${codebaseId}/${file.relativePath}`,
            title: file.relativePath.split('/').pop(),
            snippet: redaction.text,
            tokenCount: estimateTokenCount(redaction.text),
            license: license ?? UNKNOWN_LICENSE,
            indexedAt: Date.now(),
            filePath: file.relativePath,
            lineRange: {start: chunk.startLine, end: chunk.endLine},
            ...(chunk.symbol ? {symbol: chunk.symbol} : {}),
            language: languageForPath(file.relativePath),
            ...(ref.commitHash ? {commitHash: ref.commitHash} : {}),
            vendor: ref.vendor,
            ...(ref.buildId ? {buildId: ref.buildId} : {}),
            codebaseId,
            registryOrigin: 'codebase_registry',
            ...(!license ? {unsupportedReason: 'license_unknown'} : {}),
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
  spdxLicense,
  filterPreviewFiles,
};

