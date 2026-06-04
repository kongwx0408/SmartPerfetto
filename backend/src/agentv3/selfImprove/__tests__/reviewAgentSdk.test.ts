// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { describe, it, expect } from '@jest/globals';
import {
  buildReviewAgentPrompt,
  __testing,
} from '../reviewAgentSdk';

describe('buildReviewAgentPrompt', () => {
  it('embeds skillId and failureModeHash into the prompt', () => {
    const prompt = buildReviewAgentPrompt({
      skillId: 'scrolling_jank_detection',
      failureModeHash: 'cafebabe12345678',
      context: { stuff: 'here' },
    });
    expect(prompt).toContain('scrolling_jank_detection');
    expect(prompt).toContain('cafebabe12345678');
    expect(prompt).toContain('"stuff": "here"');
  });

  it('omits the hash with `(none)` when not provided', () => {
    const prompt = buildReviewAgentPrompt({
      skillId: 's1',
      context: {},
    });
    expect(prompt).toContain('Failure mode hash:  (none)');
  });

  it('includes the canonical category enum list', () => {
    const prompt = buildReviewAgentPrompt({ skillId: 's1', context: {} });
    expect(prompt).toContain('misdiagnosis_vsync_vrr');
    expect(prompt).toContain('sql_missing_table');
    expect(prompt).toContain('unknown');
  });

  it('explicitly forbids destructive output that would trip the scanner', () => {
    const prompt = buildReviewAgentPrompt({ skillId: 's1', context: {} });
    expect(prompt).toContain('shell commands');
    expect(prompt).toContain('SQL DDL');
    expect(prompt).toContain('ignore the');
  });
});

describe('extractJsonObject', () => {
  const { extractJsonObject } = __testing;

  it('parses a clean JSON object', () => {
    expect(extractJsonObject('{"foo":1}')).toEqual({ foo: 1 });
  });

  it('extracts an object surrounded by prose', () => {
    expect(extractJsonObject('here you go: {"foo":2}\nthanks')).toEqual({ foo: 2 });
  });

  it('returns null when no JSON is present', () => {
    expect(extractJsonObject('plain text only')).toBeNull();
  });

  it('returns null when JSON is malformed', () => {
    expect(extractJsonObject('here {not really: json}')).toBeNull();
  });

  it('returns null when the parsed value is an array', () => {
    expect(extractJsonObject('[1,2,3]')).toBeNull();
  });
});

describe('SDK constants', () => {
  it('caps wall-clock at 90s by default', () => {
    expect(__testing.DEFAULT_TIMEOUT_MS).toBe(90_000);
  });
  it('uses haiku light model by default', () => {
    expect(__testing.DEFAULT_MODEL).toBe('claude-haiku-4-5');
  });
  it('limits agent to 8 turns', () => {
    expect(__testing.MAX_TURNS).toBe(8);
  });
});
