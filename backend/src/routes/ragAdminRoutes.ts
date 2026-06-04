// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * RAG admin routes — operator-side surface for the Plan 55 RAG
 * store. Lets a curator inspect index population per source kind,
 * delete blocked / stale chunks, and search the index directly
 * (without going through the agent).
 *
 * Endpoints (all under `/api/rag`):
 *   GET    /stats              per-kind chunk counts + last indexed
 *   GET    /chunks/:chunkId    fetch one chunk
 *   DELETE /chunks/:chunkId    remove a chunk (license-blocked
 *                              entries can be evicted permanently
 *                              once the curator decides to)
 *   POST   /search             body `{query, kinds?, topK?}` —
 *                              run a search like the agent would
 *
 * Ingestion endpoints (POST /ingest/blog, /ingest/aosp,
 * /ingest/oem) are intentionally NOT exposed in M2; ingesters are
 * called from operator scripts that supply the fetcher (with
 * authenticated source credentials) directly. M3 may add upload
 * endpoints once an authentication story exists.
 *
 * @module ragAdminRoutes
 */

import {createHash} from 'crypto';

import {Router, type Router as ExpressRouter} from 'express';

import {authenticate, requireRequestContext} from '../middleware/auth';
import {RagStore, type RagStoreSearchOptions} from '../services/ragStore';
import {knowledgeScopeFromRequestContext} from '../services/scopedKnowledgeStore';
import type {RagChunk, RagRetrievalResult, RagSourceKind} from '../types/sparkContracts';
import {backendLogPath} from '../runtimePaths';
import {requireCodebaseScope} from '../services/auth/codebaseScopes';
import {CodebaseRegistry, type CodebaseRef} from '../services/codebase/codebaseRegistry';
import {getDefaultCodebaseRegistry} from '../services/codebase/defaultCodebaseServices';
import {PathSecurityGate, type PathPreviewResult} from '../services/codebase/pathSecurityGate';
import {AppSourceIngester} from '../services/rag/appSourceIngester';
import {AospSourceIngester} from '../services/rag/aospSourceIngester';
import {KernelSourceIngester} from '../services/rag/kernelSourceIngester';
import {SymbolResolver} from '../services/symbol/symbolResolver';
import {codeAwareFeatureEnabled} from '../services/codebase/codeAwareFeature';

const DEFAULT_STORAGE_PATH = backendLogPath('rag_store.json');

let cachedStore: RagStore | null = null;
function getDefaultStore(): RagStore {
  if (!cachedStore) cachedStore = new RagStore(DEFAULT_STORAGE_PATH);
  return cachedStore;
}

export interface RagAdminRouteServices {
  registry?: CodebaseRegistry;
  gate?: PathSecurityGate;
  appSourceIngester?: AppSourceIngester;
  aospSourceIngester?: AospSourceIngester;
  kernelSourceIngester?: KernelSourceIngester;
}

function snippetHash(snippet: string): string {
  return createHash('sha256').update(snippet).digest('hex').slice(0, 12);
}

function isCodeAwareChunk(chunk: RagChunk): boolean {
  return chunk.kind === 'app_source' ||
    chunk.kind === 'kernel_source' ||
    chunk.registryOrigin === 'codebase_registry';
}

function sanitizeChunk(chunk: RagChunk): RagChunk & {snippetHash?: string; snippetLength?: number} {
  if (!isCodeAwareChunk(chunk)) return chunk;
  const {snippet, ...rest} = chunk;
  return {
    ...rest,
    snippet: undefined as any,
    snippetHash: snippetHash(snippet),
    snippetLength: snippet.length,
  };
}

function sanitizeRetrieval(result: RagRetrievalResult): RagRetrievalResult {
  return {
    ...result,
    results: result.results.map(hit => ({
      ...hit,
      ...(hit.chunk ? {chunk: sanitizeChunk(hit.chunk)} : {}),
    })),
  };
}

function sanitizeCodebase(ref: CodebaseRef) {
  const {rootPath: _rootPath, rootRealpath: _rootRealpath, consent, ...rest} = ref;
  return {
    ...rest,
    eligibleForSendToProvider: consent.sendToProvider,
    consent: {
      sendToProvider: consent.sendToProvider,
      consentedAt: consent.consentedAt,
      consentedBy: consent.consentedBy,
      consentHash: consent.consentHash,
    },
  };
}

function sanitizePreview(preview: PathPreviewResult) {
  return {
    blocked: preview.blocked,
    ...(preview.blockedReason ? {blockedReason: preview.blockedReason} : {}),
    acceptedFileCount: preview.acceptedFiles.length,
    skippedFileCount: preview.skippedFiles.length,
    acceptedFiles: preview.acceptedFiles.slice(0, 200),
    skippedFiles: preview.skippedFiles.slice(0, 200),
  };
}

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

/** Test/factory hook. */
export function createRagAdminRoutes(store?: RagStore, services: RagAdminRouteServices = {}): ExpressRouter {
  const s = store ?? getDefaultStore();
  const registry = services.registry ?? getDefaultCodebaseRegistry();
  const gate = services.gate ?? new PathSecurityGate();
  const appSourceIngester = services.appSourceIngester ?? new AppSourceIngester(s, registry, gate);
  const aospSourceIngester = services.aospSourceIngester ?? new AospSourceIngester(s, registry, gate);
  const kernelSourceIngester = services.kernelSourceIngester ?? new KernelSourceIngester(s, registry, gate);
  const symbolResolver = new SymbolResolver(s);
  const router = Router();
  router.use(authenticate);

  router.get('/stats', requireCodebaseScope('codebase:read'), (req, res) => {
    const scope = knowledgeScopeFromRequestContext(requireRequestContext(req));
    res.json({success: true, stats: s.getStats(scope)});
  });

  router.get('/chunks/:chunkId', requireCodebaseScope('codebase:read'), (req, res) => {
    const scope = knowledgeScopeFromRequestContext(requireRequestContext(req));
    const chunkId = routeParam(req.params.chunkId);
    const chunk = s.getChunk(chunkId, scope);
    if (!chunk) {
      return res.status(404).json({
        success: false,
        error: `Chunk '${chunkId}' not found`,
      });
    }
    res.json({success: true, chunk: sanitizeChunk(chunk)});
  });

  router.delete('/chunks/:chunkId', requireCodebaseScope('codebase:admin'), (req, res) => {
    const scope = knowledgeScopeFromRequestContext(requireRequestContext(req));
    const chunkId = routeParam(req.params.chunkId);
    const removed = s.removeChunk(chunkId, scope);
    if (!removed) {
      return res.status(404).json({
        success: false,
        error: `Chunk '${chunkId}' not found`,
      });
    }
    res.json({success: true});
  });

  router.post('/search', requireCodebaseScope('codebase:read'), (req, res) => {
    const scope = knowledgeScopeFromRequestContext(requireRequestContext(req));
    const {query, kinds, topK, codebaseIds, vendor, buildId, pathPrefix, symbolExact, filePathExact, languages} = (req.body ?? {}) as {
      query?: string;
      kinds?: RagSourceKind[];
      topK?: number;
    } & RagStoreSearchOptions;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: '`query` (string) is required',
      });
    }
    const result = s.search(query, {
      ...(kinds ? {kinds} : {}),
      ...(topK ? {topK} : {}),
      ...(codebaseIds ? {codebaseIds} : {}),
      ...(vendor ? {vendor} : {}),
      ...(buildId ? {buildId} : {}),
      ...(pathPrefix ? {pathPrefix} : {}),
      ...(symbolExact ? {symbolExact} : {}),
      ...(filePathExact ? {filePathExact} : {}),
      ...(languages ? {languages} : {}),
      scope,
    });
    res.json({success: true, result: sanitizeRetrieval(result)});
  });

  router.get('/codebases', requireCodebaseScope('codebase:read'), (_req, res) => {
    res.json({
      success: true,
      featureEnabled: codeAwareFeatureEnabled(),
      codebases: registry.list(),
    });
  });

  router.post('/codebases/preview', requireCodebaseScope('codebase:manage'), async (req, res) => {
    const {rootPath} = (req.body ?? {}) as {rootPath?: string};
    if (!rootPath || typeof rootPath !== 'string') {
      return res.status(400).json({success: false, error: '`rootPath` is required'});
    }
    res.json({success: true, preview: sanitizePreview(await gate.preview(rootPath))});
  });

  router.post('/codebases/register', requireCodebaseScope('codebase:manage'), async (req, res) => {
    const {
      kind = 'app_source',
      displayName,
      rootPath,
      commitHash,
      vendor,
      buildId,
      pathFilters,
      excludeGlobs,
      symbolMapPaths,
      licenseTag,
      sendToProvider,
    } = (req.body ?? {}) as Record<string, any>;
    if (!displayName || typeof displayName !== 'string') {
      return res.status(400).json({success: false, error: '`displayName` is required'});
    }
    if (!rootPath || typeof rootPath !== 'string') {
      return res.status(400).json({success: false, error: '`rootPath` is required'});
    }
    const preview = await gate.preview(rootPath);
    if (preview.blocked) {
      return res.status(400).json({
        success: false,
        error: preview.blockedReason ?? 'root blocked by path security gate',
        preview: sanitizePreview(preview),
      });
    }
    const context = requireRequestContext(req);
    try {
      const ref = registry.register({
        kind,
        displayName,
        rootPath,
        rootRealpath: preview.rootRealpath,
        ...(commitHash ? {commitHash} : {}),
        ...(vendor ? {vendor} : {}),
        ...(buildId ? {buildId} : {}),
        ...(Array.isArray(pathFilters) ? {pathFilters} : {}),
        ...(Array.isArray(excludeGlobs) ? {excludeGlobs} : {}),
        ...(Array.isArray(symbolMapPaths) ? {symbolMapPaths} : {}),
        ...(licenseTag ? {licenseTag} : {}),
        sendToProvider: Boolean(sendToProvider),
        consentedBy: context.userId,
        tenantId: context.tenantId,
        workspaceId: context.workspaceId,
        userId: context.userId,
      });
      res.json({success: true, codebase: sanitizeCodebase(ref), preview: sanitizePreview(preview)});
    } catch (error) {
      res.status(400).json({success: false, error: error instanceof Error ? error.message : String(error)});
    }
  });

  router.get('/codebases/:id', requireCodebaseScope('codebase:read'), (req, res) => {
    const codebaseId = routeParam(req.params.id);
    const ref = registry.get(codebaseId);
    if (!ref) {
      return res.status(404).json({success: false, error: `Codebase '${codebaseId}' not found`});
    }
    res.json({success: true, codebase: sanitizeCodebase(ref)});
  });

  router.get('/codebases/:id/symbols', requireCodebaseScope('codebase:read'), (req, res) => {
    const codebaseId = routeParam(req.params.id);
    const ref = registry.get(codebaseId);
    if (!ref) {
      return res.status(404).json({success: false, error: `Codebase '${codebaseId}' not found`});
    }
    const symbol = typeof req.query.symbol === 'string'
      ? req.query.symbol
      : typeof req.query.query === 'string'
        ? req.query.query
        : '';
    if (!symbol) {
      return res.status(400).json({success: false, error: '`symbol` or `query` is required'});
    }
    const common = {
      codebaseId,
      buildId: typeof req.query.buildId === 'string' ? req.query.buildId : undefined,
      topK: typeof req.query.topK === 'string' ? Number(req.query.topK) : undefined,
    };
    const result = ref.kind === 'kernel_source'
      ? symbolResolver.resolveKernel({
          symbol,
          vendor: ref.vendor,
          ...common,
        })
      : ref.kind === 'aosp'
        ? symbolResolver.resolveNative({
            symbol,
            ...common,
          })
        : symbolResolver.resolveApp({
            symbol,
            codebaseId,
            buildId: common.buildId,
            filePath: typeof req.query.filePath === 'string' ? req.query.filePath : undefined,
          });
    res.json({success: true, result});
  });

  router.get('/codebases/:id/excerpt', requireCodebaseScope('codebase:read'), (req, res) => {
    const codebaseId = routeParam(req.params.id);
    const ref = registry.get(codebaseId);
    if (!ref) {
      return res.status(404).json({success: false, error: `Codebase '${codebaseId}' not found`});
    }
    const chunkId = typeof req.query.chunkId === 'string' ? req.query.chunkId : '';
    if (!chunkId) {
      return res.status(400).json({success: false, error: '`chunkId` is required'});
    }
    const scope = knowledgeScopeFromRequestContext(requireRequestContext(req));
    const chunk = s.getChunk(chunkId, scope);
    if (!chunk || chunk.codebaseId !== codebaseId || !isCodeAwareChunk(chunk)) {
      return res.status(404).json({success: false, error: `Code excerpt '${chunkId}' not found`});
    }
    const maxLines = typeof req.query.maxLines === 'string'
      ? Math.max(1, Math.min(80, Number(req.query.maxLines) || 20))
      : 20;
    const lines = chunk.snippet.split(/\r?\n/).slice(0, maxLines);
    res.json({
      success: true,
      excerpt: {
        chunkId,
        codebaseId,
        filePath: chunk.filePath,
        lineRange: chunk.lineRange,
        symbol: chunk.symbol,
        language: chunk.language,
        text: lines.join('\n'),
        truncated: lines.length < chunk.snippet.split(/\r?\n/).length,
      },
    });
  });

  router.post('/codebases/:id/reindex', requireCodebaseScope('codebase:manage'), async (req, res) => {
    const codebaseId = routeParam(req.params.id);
    const ref = registry.get(codebaseId);
    if (!ref) {
      return res.status(404).json({success: false, error: `Codebase '${codebaseId}' not found`});
    }
    try {
      const result = await (ref.kind === 'kernel_source'
        ? kernelSourceIngester.ingest(codebaseId, req.body ?? {})
        : ref.kind === 'aosp'
          ? aospSourceIngester.ingest(codebaseId, req.body ?? {})
          : appSourceIngester.ingest(codebaseId, req.body ?? {}));
      res.json({success: true, result});
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  router.get('/codebases/:id/audit', requireCodebaseScope('codebase:read'), (req, res) => {
    const codebaseId = routeParam(req.params.id);
    const ref = registry.get(codebaseId);
    if (!ref) {
      return res.status(404).json({success: false, error: `Codebase '${codebaseId}' not found`});
    }
    res.json({
      success: true,
      audit: {
        codebaseId: ref.codebaseId,
        kind: ref.kind,
        indexGeneration: ref.indexGeneration,
        lastIngestAt: ref.lastIngestAt,
        lastIngestStatus: ref.lastIngestStatus,
        lastIngestError: ref.lastIngestError,
        chunkCount: ref.chunkCount ?? 0,
        blockedFileCount: ref.blockedFileCount ?? 0,
        redactionHitCount: ref.redactionHitCount ?? 0,
      },
    });
  });

  return router;
}

const ragAdminRoutes = createRagAdminRoutes();
export default ragAdminRoutes;
