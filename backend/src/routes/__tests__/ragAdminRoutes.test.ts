// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {describe, it, expect, beforeEach, afterEach} from '@jest/globals';
import express from 'express';
import request from 'supertest';

import {createRagAdminRoutes} from '../ragAdminRoutes';
import {RagStore} from '../../services/ragStore';
import type {RagChunk} from '../../types/sparkContracts';
import {CodebaseRegistry} from '../../services/codebase/codebaseRegistry';
import {PathSecurityGate} from '../../services/codebase/pathSecurityGate';

let tmpDir: string;
let store: RagStore;
let registry: CodebaseRegistry;
let app: express.Express;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-admin-test-'));
  store = new RagStore(path.join(tmpDir, 'rag.json'));
  registry = new CodebaseRegistry(path.join(tmpDir, 'codebases.json'));
  app = express();
  app.use(express.json({limit: '5mb'}));
  app.use('/api/rag', createRagAdminRoutes(store, {
    registry,
    gate: new PathSecurityGate({allowlistRoots: [tmpDir]}),
  }));
});

afterEach(() => {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  }
});

function makeChunk(overrides: Partial<RagChunk> = {}): RagChunk {
  return {
    chunkId: 'c-001',
    kind: 'androidperformance.com',
    uri: 'https://androidperformance.com/x',
    snippet: 'binder transactions',
    indexedAt: 1714600000000,
    ...overrides,
  };
}

describe('GET /api/rag/stats', () => {
  it('returns per-kind counts', async () => {
    store.addChunk(makeChunk({chunkId: 'a'}));
    store.addChunk(
      makeChunk({chunkId: 'b', kind: 'aosp', license: 'Apache-2.0'}),
    );
    const res = await request(app).get('/api/rag/stats');
    expect(res.status).toBe(200);
    expect(res.body.stats['androidperformance.com'].chunkCount).toBe(1);
    expect(res.body.stats.aosp.chunkCount).toBe(1);
  });
});

describe('GET / DELETE /api/rag/chunks/:chunkId', () => {
  it('returns a known chunk', async () => {
    store.addChunk(makeChunk({chunkId: 'a'}));
    const res = await request(app).get('/api/rag/chunks/a');
    expect(res.status).toBe(200);
    expect(res.body.chunk.chunkId).toBe('a');
  });

  it('sanitizes source-backed chunks on the legacy chunk endpoint', async () => {
    const root = path.join(tmpDir, 'repo');
    fs.mkdirSync(root);
    const ref = registry.register({
      kind: 'app_source',
      displayName: 'Repo',
      rootPath: root,
    });
    store.addChunk(makeChunk({
      chunkId: 'source-a',
      kind: 'app_source',
      uri: 'codebase://source-a/MainActivity.kt',
      snippet: 'class MainActivity { fun secretLaunch() {} }',
      codebaseId: ref.codebaseId,
      registryOrigin: 'codebase_registry',
      filePath: 'MainActivity.kt',
      language: 'kotlin',
    }));

    const res = await request(app).get('/api/rag/chunks/source-a');
    expect(res.status).toBe(200);
    expect(res.body.chunk.snippet).toBeUndefined();
    expect(res.body.chunk.snippetHash).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toContain('secretLaunch');
  });

  it('404 on missing chunkId', async () => {
    const res = await request(app).get('/api/rag/chunks/missing');
    expect(res.status).toBe(404);
  });

  it('DELETE removes the chunk', async () => {
    store.addChunk(makeChunk({chunkId: 'a'}));
    const res = await request(app).delete('/api/rag/chunks/a');
    expect(res.status).toBe(200);
    expect(store.getChunk('a')).toBeUndefined();
  });

  it('DELETE returns 404 for missing chunk', async () => {
    const res = await request(app).delete('/api/rag/chunks/missing');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/rag/search', () => {
  beforeEach(() => {
    store.addChunk(
      makeChunk({chunkId: 'a', snippet: 'binder transactions reveal latency'}),
    );
    store.addChunk(
      makeChunk({chunkId: 'b', snippet: 'frame timeline tells the truth'}),
    );
  });

  it('runs a search and returns ranked hits', async () => {
    const res = await request(app)
      .post('/api/rag/search')
      .send({query: 'binder transactions'});
    expect(res.status).toBe(200);
    expect(res.body.result.results.length).toBeGreaterThan(0);
    expect(res.body.result.results[0].chunkId).toBe('a');
  });

  it('respects kinds filter', async () => {
    const res = await request(app)
      .post('/api/rag/search')
      .send({query: 'binder', kinds: ['aosp']});
    expect(res.body.result.results).toHaveLength(0);
  });

  it('400 on missing query', async () => {
    const res = await request(app).post('/api/rag/search').send({});
    expect(res.status).toBe(400);
  });
});

describe('codebase routes', () => {
  it('previews, registers, reindexes, and resolves app source symbols', async () => {
    const root = path.join(tmpDir, 'HighPerformanceMini');
    fs.mkdirSync(path.join(root, 'launch-aosp/src/main/java/com/example'), {recursive: true});
    fs.writeFileSync(
      path.join(root, 'launch-aosp/src/main/java/com/example/MainActivity.kt'),
      'package com.example\nclass MainActivity { fun simulateHeavyLaunch() {} }\n',
    );

    const preview = await request(app)
      .post('/api/rag/codebases/preview')
      .send({rootPath: root});
    expect(preview.status).toBe(200);
    expect(preview.body.preview.acceptedFileCount).toBe(1);

    const registered = await request(app)
      .post('/api/rag/codebases/register')
      .send({
        kind: 'app_source',
        displayName: 'HighPerformanceMini',
        rootPath: root,
        sendToProvider: true,
      });
    expect(registered.status).toBe(200);
    const codebaseId = registered.body.codebase.codebaseId;
    expect(registered.body.codebase.rootPath).toBeUndefined();

    const reindex = await request(app)
      .post(`/api/rag/codebases/${codebaseId}/reindex`)
      .send({});
    expect(reindex.status).toBe(200);
    expect(reindex.body.result.chunksAdded).toBeGreaterThan(0);

    const symbols = await request(app)
      .get(`/api/rag/codebases/${codebaseId}/symbols`)
      .query({symbol: 'MainActivity'});
    expect(symbols.status).toBe(200);
    expect(symbols.body.result.success).toBe(true);
    expect(symbols.body.result.candidates[0]).toEqual(expect.objectContaining({
      codebaseId,
      filePath: 'launch-aosp/src/main/java/com/example/MainActivity.kt',
    }));

    const search = await request(app)
      .post('/api/rag/search')
      .send({query: 'simulateHeavyLaunch', kinds: ['app_source'], codebaseIds: [codebaseId]});
    expect(search.status).toBe(200);
    expect(JSON.stringify(search.body)).not.toContain('simulateHeavyLaunch()');
    expect(search.body.result.results[0].chunk.snippetHash).toEqual(expect.any(String));

    const chunkId = search.body.result.results[0].chunkId;
    const excerpt = await request(app)
      .get(`/api/rag/codebases/${codebaseId}/excerpt`)
      .query({chunkId});
    expect(excerpt.status).toBe(200);
    expect(excerpt.body.excerpt.text).toContain('simulateHeavyLaunch()');
    expect(excerpt.body.excerpt.filePath).toBe('launch-aosp/src/main/java/com/example/MainActivity.kt');
  });
});
