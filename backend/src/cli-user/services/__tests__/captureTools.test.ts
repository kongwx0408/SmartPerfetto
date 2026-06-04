// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from '@jest/globals';
import {
  detectHostPlatformKey,
  resolveAdbTool,
  resolveTraceboxTool,
  androidTraceboxPlatformKey,
} from '../captureTools';

describe('capture tool resolution', () => {
  it('uses ADB_PATH before bundled adb', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartperfetto-adb-env-'));
    const adb = makeExecutable(dir, process.platform === 'win32' ? 'adb.exe' : 'adb');
    try {
      const resolved = resolveAdbTool({
        backendRoot: dir,
        env: { ADB_PATH: adb } as NodeJS.ProcessEnv,
      });
      expect(resolved.source).toBe('env');
      expect(resolved.path).toBe(adb);
      expect(resolved.exists).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reserves a platform-specific bundled adb path', () => {
    const platformKey = detectHostPlatformKey();
    if (!platformKey) return;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartperfetto-adb-bundled-'));
    const adbName = process.platform === 'win32' ? 'adb.exe' : 'adb';
    const adb = path.join(dir, 'prebuilts', 'android-platform-tools', platformKey, adbName);
    fs.mkdirSync(path.dirname(adb), { recursive: true });
    fs.writeFileSync(adb, '#!/bin/sh\nexit 0\n', 'utf-8');
    fs.chmodSync(adb, 0o755);
    try {
      const resolved = resolveAdbTool({
        backendRoot: dir,
        env: {} as NodeJS.ProcessEnv,
      });
      expect(resolved.source).toBe('bundled');
      expect(resolved.path).toBe(adb);
      expect(resolved.executable).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('resolves explicit tracebox override without consulting package slots', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartperfetto-tracebox-'));
    const tracebox = makeExecutable(dir, 'tracebox');
    try {
      const resolved = resolveTraceboxTool(tracebox, 'android-arm64', { backendRoot: dir });
      expect(resolved.source).toBe('override');
      expect(resolved.path).toBe(tracebox);
      expect(resolved.platformKey).toBe('android-arm64');
      expect(resolved.executable).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('maps Android ABIs to device-side tracebox package slots', () => {
    expect(androidTraceboxPlatformKey('arm64-v8a')).toBe('android-arm64');
    expect(androidTraceboxPlatformKey('armeabi-v7a')).toBe('android-arm');
    expect(androidTraceboxPlatformKey('x86_64')).toBe('android-x64');
    expect(androidTraceboxPlatformKey('x86')).toBe('android-x86');
    expect(androidTraceboxPlatformKey('unknown')).toBeUndefined();
  });
});

function makeExecutable(dir: string, name: string): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, '#!/bin/sh\nexit 0\n', 'utf-8');
  fs.chmodSync(file, 0o755);
  return file;
}
