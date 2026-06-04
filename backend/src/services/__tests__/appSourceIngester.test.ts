// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';

import {CodebaseRegistry} from '../codebase/codebaseRegistry';
import {PathSecurityGate} from '../codebase/pathSecurityGate';
import {AppSourceIngester} from '../rag/appSourceIngester';
import {RagStore} from '../ragStore';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-source-ingester-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, {recursive: true, force: true});
});

function makeIngester(root: string, sendToProvider = true) {
  const store = new RagStore(path.join(tmpDir, 'rag.json'));
  const registry = new CodebaseRegistry(path.join(tmpDir, 'codebases.json'));
  const ref = registry.register({
    kind: 'app_source',
    displayName: 'App',
    rootPath: root,
    sendToProvider,
    buildId: 'debug',
  });
  const ingester = new AppSourceIngester(store, registry, new PathSecurityGate({allowlistRoots: [root]}));
  return {store, registry, ref, ingester};
}

describe('AppSourceIngester', () => {
  it('indexes Java/Kotlin source with codebase metadata and symbols', () => {
    const root = path.join(tmpDir, 'app');
    fs.mkdirSync(path.join(root, 'src/main/java/com/example'), {recursive: true});
    fs.writeFileSync(path.join(root, 'src/main/java/com/example/MainActivity.kt'), [
      'package com.example',
      'class MainActivity {',
      '  fun onCreate() {',
      '    val api_key = "1234567890"',
      '  }',
      '}',
    ].join('\n'));
    fs.writeFileSync(path.join(root, 'README.md'), '# ignored\n');

    const {store, ref, ingester, registry} = makeIngester(root);
    const result = ingester.ingest(ref.codebaseId);

    expect(result.filesProcessed).toBe(1);
    expect(result.chunksAdded).toBeGreaterThan(0);
    expect(result.redactionHitCount).toBe(1);
    const search = store.search('MainActivity', {kinds: ['app_source'], codebaseIds: [ref.codebaseId]});
    expect(search.results[0]?.chunk).toEqual(expect.objectContaining({
      kind: 'app_source',
      registryOrigin: 'codebase_registry',
      codebaseId: ref.codebaseId,
      filePath: 'src/main/java/com/example/MainActivity.kt',
      language: 'kotlin',
      buildId: 'debug',
    }));
    expect(registry.get(ref.codebaseId)?.lastIngestStatus).toBe('ok');
  });

  it('honors registered path filters', () => {
    const root = path.join(tmpDir, 'filtered');
    fs.mkdirSync(path.join(root, 'app'), {recursive: true});
    fs.mkdirSync(path.join(root, 'tools'), {recursive: true});
    fs.writeFileSync(path.join(root, 'app', 'Wanted.kt'), 'class Wanted\n');
    fs.writeFileSync(path.join(root, 'tools', 'Ignored.kt'), 'class Ignored\n');
    const store = new RagStore(path.join(tmpDir, 'rag-filtered.json'));
    const registry = new CodebaseRegistry(path.join(tmpDir, 'registry-filtered.json'));
    const ref = registry.register({
      kind: 'app_source',
      displayName: 'Filtered',
      rootPath: root,
      pathFilters: ['app/'],
    });

    new AppSourceIngester(store, registry, new PathSecurityGate({allowlistRoots: [root]})).ingest(ref.codebaseId);
    expect(store.search('Wanted', {kinds: ['app_source'], codebaseIds: [ref.codebaseId]}).results).toHaveLength(1);
    expect(store.search('Ignored', {kinds: ['app_source'], codebaseIds: [ref.codebaseId]}).results).toHaveLength(0);
  });

  it('marks ingestion blocked when the root is outside the security allowlist', () => {
    const root = path.join(tmpDir, 'blocked');
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, 'MainActivity.kt'), 'class MainActivity\n');
    const {ref, registry} = makeIngester(root);
    const blocked = new AppSourceIngester(
      new RagStore(path.join(tmpDir, 'rag-blocked.json')),
      registry,
      new PathSecurityGate({allowlistRoots: [path.join(tmpDir, 'other')]}),
    ).ingest(ref.codebaseId);

    expect(blocked.errors[0]?.reason).toBe('root_outside_allowlist');
    expect(registry.get(ref.codebaseId)?.lastIngestStatus).toBe('blocked_by_security');
  });
});
