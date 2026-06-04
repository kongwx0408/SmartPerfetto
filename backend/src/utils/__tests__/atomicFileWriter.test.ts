// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { atomicWriteFile, atomicWriteFileSync } from '../atomicFileWriter';

describe('atomicFileWriter', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('atomicWriteFileSync', () => {
    test('creates a new file with the given contents', () => {
      const target = path.join(tmpDir, 'config.json');
      atomicWriteFileSync(target, '{"x":1}');
      expect(fs.readFileSync(target, 'utf-8')).toBe('{"x":1}');
    });

    test('overwrites an existing file atomically', () => {
      const target = path.join(tmpDir, 'config.json');
      fs.writeFileSync(target, 'old content');
      atomicWriteFileSync(target, 'new content');
      expect(fs.readFileSync(target, 'utf-8')).toBe('new content');
    });

    test('leaves no orphaned tmp file on success', () => {
      const target = path.join(tmpDir, 'config.json');
      atomicWriteFileSync(target, 'hello');
      const tmpLeftover = fs.readdirSync(tmpDir).filter((f) => f.includes('.tmp.'));
      expect(tmpLeftover).toHaveLength(0);
    });

    test('cleans up tmp file when rename fails', () => {
      // Create a directory at the target path so rename fails (can't rename
      // a file over a non-empty directory).
      const target = path.join(tmpDir, 'will-fail');
      fs.mkdirSync(target);
      fs.writeFileSync(path.join(target, 'block'), 'block');

      expect(() => atomicWriteFileSync(target, 'payload')).toThrow();

      // tmp file from this attempt should be gone (other tmp files from prior
      // tests don't exist because beforeEach created a fresh dir).
      const tmpLeftover = fs.readdirSync(tmpDir).filter((f) => f.includes('.tmp.'));
      expect(tmpLeftover).toHaveLength(0);
    });

    test('accepts Buffer content', () => {
      const target = path.join(tmpDir, 'binary.bin');
      atomicWriteFileSync(target, Buffer.from([0x01, 0x02, 0x03]));
      expect(fs.readFileSync(target)).toEqual(Buffer.from([0x01, 0x02, 0x03]));
    });
  });

  describe('atomicWriteFile (async)', () => {
    test('creates a new file with the given contents', async () => {
      const target = path.join(tmpDir, 'config.json');
      await atomicWriteFile(target, '{"x":1}');
      expect(fs.readFileSync(target, 'utf-8')).toBe('{"x":1}');
    });

    test('cleans up tmp file when rename fails', async () => {
      const target = path.join(tmpDir, 'will-fail');
      fs.mkdirSync(target);
      fs.writeFileSync(path.join(target, 'block'), 'block');

      await expect(atomicWriteFile(target, 'payload')).rejects.toThrow();

      const tmpLeftover = fs.readdirSync(tmpDir).filter((f) => f.includes('.tmp.'));
      expect(tmpLeftover).toHaveLength(0);
    });
  });
});
