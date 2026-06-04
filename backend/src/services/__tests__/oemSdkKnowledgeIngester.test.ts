// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {describe, it, expect, beforeEach, afterEach} from '@jest/globals';

import {RagStore} from '../ragStore';
import {
  OemSdkKnowledgeIngester,
  __TEST_ONLY__,
  type OemSdkDocument,
  type OemSdkFetcher,
} from '../oemSdkKnowledgeIngester';

let tmpDir: string;
let storagePath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oem-sdk-ingester-test-'));
  storagePath = path.join(tmpDir, 'rag.json');
});

afterEach(() => {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  }
});

class StubOemFetcher implements OemSdkFetcher {
  constructor(private docs: OemSdkDocument[] | Error) {}
  async fetchDocs(): Promise<OemSdkDocument[]> {
    if (this.docs instanceof Error) throw this.docs;
    return this.docs;
  }
}

function makeDoc(overrides: Partial<OemSdkDocument> = {}): OemSdkDocument {
  return {
    vendor: 'mtk',
    docPath: 'tuning/cpu-freq-floor.md',
    content:
      'CPU frequency floor settings on Dimensity SoCs.\n\n' +
      'Recommended floor for foreground apps is 1.4GHz.',
    fetchedAt: 1714600000000,
    license: 'proprietary',
    ...overrides,
  };
}

describe('OemSdkKnowledgeIngester — happy path', () => {
  it('ingests a doc and stores chunks under kind=oem_sdk', async () => {
    const store = new RagStore(storagePath);
    const ingester = new OemSdkKnowledgeIngester(
      store,
      new StubOemFetcher([makeDoc()]),
    );
    const result = await ingester.ingest();
    expect(result.docsProcessed).toBe(1);
    expect(result.chunksAdded).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
    expect(store.getStats().oem_sdk.chunkCount).toBe(result.chunksAdded);
  });

  it('chunk URI carries the vendor:: prefix shape', async () => {
    const store = new RagStore(storagePath);
    const ingester = new OemSdkKnowledgeIngester(
      store,
      new StubOemFetcher([makeDoc()]),
    );
    await ingester.ingest();
    const search = store.search('cpu frequency floor');
    expect(search.results[0].chunk?.uri).toMatch(/^oem:\/\/mtk\//);
  });

  it('chunkId stable across re-ingestion', async () => {
    const store = new RagStore(storagePath);
    const ingester = new OemSdkKnowledgeIngester(
      store,
      new StubOemFetcher([makeDoc()]),
    );
    await ingester.ingest();
    const before = store.getStats().oem_sdk.chunkCount;
    await ingester.ingest();
    expect(store.getStats().oem_sdk.chunkCount).toBe(before);
  });

  it('preserves author + license on chunks', async () => {
    const store = new RagStore(storagePath);
    const ingester = new OemSdkKnowledgeIngester(
      store,
      new StubOemFetcher([
        makeDoc({author: 'mtk-platform-team', license: 'proprietary'}),
      ]),
    );
    await ingester.ingest();
    const search = store.search('cpu floor');
    expect(search.results[0].chunk?.author).toBe('mtk-platform-team');
    expect(search.results[0].chunk?.license).toBe('proprietary');
  });
});

describe('OemSdkKnowledgeIngester — license + vendor gates', () => {
  it('rejects docs without license', async () => {
    const store = new RagStore(storagePath);
    const ingester = new OemSdkKnowledgeIngester(
      store,
      new StubOemFetcher([makeDoc({license: ''})]),
    );
    const result = await ingester.ingest();
    expect(result.chunksSkipped).toBe(1);
    expect(result.errors[0].reason).toMatch(/license required/);
  });

  it('rejects docs without vendor', async () => {
    const store = new RagStore(storagePath);
    const ingester = new OemSdkKnowledgeIngester(
      store,
      new StubOemFetcher([makeDoc({vendor: ''})]),
    );
    const result = await ingester.ingest();
    expect(result.chunksSkipped).toBe(1);
    expect(result.errors[0].reason).toMatch(/vendor/);
  });
});

describe('OemSdkKnowledgeIngester — fetcher errors', () => {
  it('reports a fetcher error without throwing', async () => {
    const store = new RagStore(storagePath);
    const ingester = new OemSdkKnowledgeIngester(
      store,
      new StubOemFetcher(new Error('vendor portal down')),
    );
    const result = await ingester.ingest();
    expect(result.docsProcessed).toBe(0);
    expect(result.errors[0].reason).toMatch(/vendor portal down/);
  });
});

describe('OemSdkKnowledgeIngester — internals', () => {
  it('uriFor strips a leading slash and prefixes oem://', () => {
    expect(__TEST_ONLY__.uriFor('mtk', '/tuning/cpu.md')).toBe(
      'oem://mtk/tuning/cpu.md',
    );
    expect(__TEST_ONLY__.uriFor('mtk', 'tuning/cpu.md')).toBe(
      'oem://mtk/tuning/cpu.md',
    );
  });

  it('chunkText emits at least one chunk for non-empty input', () => {
    const out = __TEST_ONLY__.chunkText('a paragraph\n\nanother', 100);
    expect(out.length).toBeGreaterThan(0);
  });

  it('chunkText returns empty for whitespace input', () => {
    expect(__TEST_ONLY__.chunkText('   ', 100)).toEqual([]);
  });

  it('makeChunkId differs across (uri, offset) pairs', () => {
    const a = __TEST_ONLY__.makeChunkId('oem://mtk/a.md', 0);
    const b = __TEST_ONLY__.makeChunkId('oem://mtk/a.md', 100);
    const c = __TEST_ONLY__.makeChunkId('oem://qualcomm/a.md', 0);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});
