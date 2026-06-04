// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { describe, expect, it, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  getPrebuiltTraceProcessorPath,
  getTraceProcessorPath,
} from '../workingTraceProcessor';

const originalTraceProcessorPath = process.env.TRACE_PROCESSOR_PATH;

afterEach(() => {
  if (originalTraceProcessorPath === undefined) {
    delete process.env.TRACE_PROCESSOR_PATH;
  } else {
    process.env.TRACE_PROCESSOR_PATH = originalTraceProcessorPath;
  }
  jest.restoreAllMocks();
});

describe('trace_processor_shell prebuilt path resolution', () => {
  it('uses an explicit TRACE_PROCESSOR_PATH before packaged prebuilts', () => {
    process.env.TRACE_PROCESSOR_PATH = '/opt/perfetto/trace_processor_shell';

    expect(getTraceProcessorPath()).toBe('/opt/perfetto/trace_processor_shell');
  });

  it('uses the packaged prebuilt when no explicit path is configured', () => {
    delete process.env.TRACE_PROCESSOR_PATH;
    const prebuiltPath = getPrebuiltTraceProcessorPath();
    if (!prebuiltPath) return;

    const existsSpy = jest.spyOn(fs, 'existsSync').mockImplementation((candidate) => (
      path.resolve(String(candidate)) === prebuiltPath
    ));

    expect(getTraceProcessorPath()).toBe(prebuiltPath);
    expect(existsSpy).toHaveBeenCalledWith(prebuiltPath);
  });

  it('ignores placeholder TRACE_PROCESSOR_PATH values and still uses packaged prebuilts', () => {
    process.env.TRACE_PROCESSOR_PATH = '/path/to/trace_processor_shell';
    const prebuiltPath = getPrebuiltTraceProcessorPath();
    if (!prebuiltPath) return;

    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(fs, 'existsSync').mockImplementation((candidate) => (
      path.resolve(String(candidate)) === prebuiltPath
    ));

    expect(getTraceProcessorPath()).toBe(prebuiltPath);
  });
});
