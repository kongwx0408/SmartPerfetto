// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';

import {CodebaseRegistry} from '../codebase/codebaseRegistry';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codebase-registry-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, {recursive: true, force: true});
});

describe('CodebaseRegistry', () => {
  it('registers codebases and exposes summaries without rootPath', () => {
    const registry = new CodebaseRegistry(path.join(tmpDir, 'registry.json'));
    const ref = registry.register({
      kind: 'app_source',
      displayName: 'HighPerformance',
      rootPath: tmpDir,
      sendToProvider: true,
      userId: 'user-a',
    });

    expect(ref.rootRealpath).toBe(fs.realpathSync(tmpDir));
    expect(ref.consent.sendToProvider).toBe(true);
    const summary = registry.list()[0] as any;
    expect(summary.codebaseId).toBe(ref.codebaseId);
    expect(summary.rootPath).toBeUndefined();
    expect(summary.eligibleForSendToProvider).toBe(true);
  });

  it('persists across instances', () => {
    const registryPath = path.join(tmpDir, 'registry.json');
    const registry = new CodebaseRegistry(registryPath);
    const ref = registry.register({
      kind: 'app_source',
      displayName: 'App',
      rootPath: tmpDir,
    });
    const reloaded = new CodebaseRegistry(registryPath);
    expect(reloaded.get(ref.codebaseId)?.displayName).toBe('App');
  });
});

