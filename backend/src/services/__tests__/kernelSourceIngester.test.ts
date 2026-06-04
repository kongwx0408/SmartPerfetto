// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';

import {CodebaseRegistry} from '../codebase/codebaseRegistry';
import {PathSecurityGate} from '../codebase/pathSecurityGate';
import {AospSourceIngester} from '../rag/aospSourceIngester';
import {KernelSourceIngester} from '../rag/kernelSourceIngester';
import {RagStore} from '../ragStore';

let tmpDir: string;
let sourceRoot: string;
let registry: CodebaseRegistry;
let store: RagStore;
let gate: PathSecurityGate;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codebase-source-ingester-'));
  sourceRoot = path.join(tmpDir, 'src');
  fs.mkdirSync(sourceRoot, {recursive: true});
  registry = new CodebaseRegistry(path.join(tmpDir, 'codebases.json'));
  store = new RagStore(path.join(tmpDir, 'rag.json'));
  gate = new PathSecurityGate({allowlistRoots: [sourceRoot]});
});

afterEach(() => {
  fs.rmSync(tmpDir, {recursive: true, force: true});
});

describe('KernelSourceIngester', () => {
  it('indexes vendor-isolated kernel chunks with SPDX license and line metadata', () => {
    fs.mkdirSync(path.join(sourceRoot, 'drivers/android'), {recursive: true});
    fs.writeFileSync(path.join(sourceRoot, 'drivers/android/binder.c'), [
      '// SPDX-License-Identifier: GPL-2.0-only',
      'int binder_wait_for_work(void) {',
      '  return 0;',
      '}',
    ].join('\n'));
    const ref = registry.register({
      kind: 'kernel_source',
      displayName: 'mtk-kernel',
      rootPath: sourceRoot,
      rootRealpath: sourceRoot,
      vendor: 'mtk',
      pathFilters: ['drivers/android'],
      sendToProvider: true,
    });

    const result = new KernelSourceIngester(store, registry, gate).ingest(ref.codebaseId);

    expect(result.errors).toHaveLength(0);
    expect(result.chunksAdded).toBeGreaterThan(0);
    const search = store.search('binder_wait_for_work', {
      kinds: ['kernel_source'],
      codebaseIds: [ref.codebaseId],
      vendor: 'mtk',
      pathPrefix: 'drivers/android',
    });
    expect(search.results[0].chunk).toMatchObject({
      kind: 'kernel_source',
      vendor: 'mtk',
      filePath: 'drivers/android/binder.c',
      symbol: 'binder_wait_for_work',
      license: 'GPL-2.0-only',
      registryOrigin: 'codebase_registry',
    });
  });

  it('fails closed when vendor or path filter is missing', () => {
    const noVendor = registry.register({
      kind: 'kernel_source',
      displayName: 'kernel',
      rootPath: sourceRoot,
      rootRealpath: sourceRoot,
      pathFilters: ['drivers/android'],
    });
    expect(() => new KernelSourceIngester(store, registry, gate).ingest(noVendor.codebaseId)).toThrow(/requires vendor/);

    const noPathFilter = registry.register({
      kind: 'kernel_source',
      displayName: 'kernel2',
      rootPath: sourceRoot,
      rootRealpath: sourceRoot,
      vendor: 'mtk',
    });
    expect(() => new KernelSourceIngester(store, registry, gate).ingest(noPathFilter.codebaseId)).toThrow(/requires pathFilters/);
  });
});

describe('AospSourceIngester', () => {
  it('indexes registered AOSP/native source with codebase metadata', () => {
    fs.mkdirSync(path.join(sourceRoot, 'frameworks/base/libs/hwui'), {recursive: true});
    fs.writeFileSync(path.join(sourceRoot, 'frameworks/base/libs/hwui/DrawFrameTask.cpp'), [
      'void DrawFrameTask::run() {',
      '  // draw frame',
      '}',
    ].join('\n'));
    const ref = registry.register({
      kind: 'aosp',
      displayName: 'aosp',
      rootPath: sourceRoot,
      rootRealpath: sourceRoot,
      licenseTag: 'Apache-2.0',
      commitHash: 'abc123',
      buildId: 'build-aosp',
      pathFilters: ['frameworks/base'],
      sendToProvider: true,
    });

    const result = new AospSourceIngester(store, registry, gate).ingest(ref.codebaseId);

    expect(result.errors).toHaveLength(0);
    const hit = store.search('DrawFrameTask run', {
      kinds: ['aosp'],
      codebaseIds: [ref.codebaseId],
      buildId: 'build-aosp',
    }).results[0].chunk;
    expect(hit).toMatchObject({
      kind: 'aosp',
      codebaseId: ref.codebaseId,
      registryOrigin: 'codebase_registry',
      filePath: 'frameworks/base/libs/hwui/DrawFrameTask.cpp',
      commitHash: 'abc123',
    });
  });
});

