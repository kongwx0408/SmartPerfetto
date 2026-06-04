// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';

import {
  runCodebaseRegisterCommand,
  runCodebaseReindexCommand,
  runCodebaseSymbolsCommand,
} from '../codebase';

let tmpDir: string;
let sessionDir: string;
let root: string;
let logSpy: jest.SpiedFunction<typeof console.log>;
let errorSpy: jest.SpiedFunction<typeof console.error>;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-codebase-'));
  sessionDir = path.join(tmpDir, 'sessions');
  root = path.join(tmpDir, 'repo');
  fs.mkdirSync(path.join(root, 'drivers/android'), {recursive: true});
  fs.writeFileSync(path.join(root, 'drivers/android/binder.c'), [
    '// SPDX-License-Identifier: GPL-2.0-only',
    'int binder_wait_for_work(void) { return 0; }',
  ].join('\n'));
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
  fs.rmSync(tmpDir, {recursive: true, force: true});
});

describe('smp codebase command handlers', () => {
  it('supports dry-run registration without writing registry state', async () => {
    const code = await runCodebaseRegisterCommand({
      rootPath: root,
      kind: 'kernel_source',
      vendor: 'mtk',
      pathFilters: ['drivers/android'],
      dryRun: true,
      sessionDir,
    });

    expect(code).toBe(0);
    expect(logSpy.mock.calls.join('\n')).toContain('"kind": "kernel_source"');
    expect(fs.existsSync(path.join(sessionDir, 'codebase_registry.json'))).toBe(false);
  });

  it('registers, reindexes, and resolves kernel symbols', async () => {
    await runCodebaseRegisterCommand({
      rootPath: root,
      kind: 'kernel_source',
      name: 'mtk-kernel',
      vendor: 'mtk',
      pathFilters: ['drivers/android'],
      sendToProvider: true,
      sessionDir,
    });
    const firstLine = String(logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] ?? '');
    const codebaseId = firstLine.split('\t')[0];

    const reindex = await runCodebaseReindexCommand({codebaseId, sessionDir});
    expect(reindex).toBe(0);

    const symbols = await runCodebaseSymbolsCommand({
      symbol: 'binder_wait_for_work',
      codebaseId,
      sessionDir,
    });
    expect(symbols).toBe(0);
    expect(logSpy.mock.calls.join('\n')).toContain('binder_wait_for_work');
  });
});
