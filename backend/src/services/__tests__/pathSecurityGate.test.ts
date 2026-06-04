// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';

import {PathSecurityGate, isWithinAllowlist} from '../codebase/pathSecurityGate';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'path-gate-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, {recursive: true, force: true});
});

describe('PathSecurityGate', () => {
  it('uses path.relative boundary semantics for sibling paths', () => {
    const root = path.join(tmpDir, 'code');
    const sibling = path.join(tmpDir, 'code2');
    fs.mkdirSync(root);
    fs.mkdirSync(sibling);

    expect(isWithinAllowlist(path.join(root), [root])).toBe(true);
    expect(isWithinAllowlist(path.join(sibling), [root])).toBe(false);
  });

  it('previews only allowed source files and skips excluded paths', () => {
    const root = path.join(tmpDir, 'repo');
    fs.mkdirSync(path.join(root, 'src'), {recursive: true});
    fs.mkdirSync(path.join(root, 'build'), {recursive: true});
    fs.writeFileSync(path.join(root, 'src', 'MainActivity.kt'), 'class MainActivity\n');
    fs.writeFileSync(path.join(root, 'src', '.env'), 'SECRET=1\n');
    fs.writeFileSync(path.join(root, 'build', 'Generated.kt'), 'class Generated\n');
    fs.writeFileSync(path.join(root, 'README.md'), '# docs\n');

    const gate = new PathSecurityGate({allowlistRoots: [tmpDir]});
    const preview = gate.preview(root);

    expect(preview.blocked).toBe(false);
    expect(preview.rootRealpath).toBe(fs.realpathSync(root));
    expect(preview.acceptedFiles.map(f => f.relativePath)).toEqual(['src/MainActivity.kt']);
    expect(preview.skippedFiles.map(f => f.relativePath)).toEqual(
      expect.arrayContaining(['README.md', 'src/.env']),
    );
  });

  it('rejects roots outside the allowlist', () => {
    const root = path.join(tmpDir, 'repo');
    fs.mkdirSync(root);
    const gate = new PathSecurityGate({allowlistRoots: [path.join(tmpDir, 'other')]});
    const preview = gate.preview(root);
    expect(preview.blocked).toBe(true);
    expect(preview.blockedReason).toBe('root_outside_allowlist');
  });
});

