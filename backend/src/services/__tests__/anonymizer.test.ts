// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {describe, it, expect} from '@jest/globals';
import {Anonymizer, LargeTraceStreamReporter} from '../anonymizer';

describe('Anonymizer', () => {
  it('returns the same placeholder for the same input', () => {
    const a = new Anonymizer();
    const p1 = a.redact('package', 'com.example.app');
    const p2 = a.redact('package', 'com.example.app');
    expect(p1).toBe(p2);
    // 12 hex chars after the domain prefix.
    expect(p1).toMatch(/^app_[0-9a-f]{12}$/);
  });

  it('placeholder is deterministic across separate Anonymizer instances (Codex regression)', () => {
    // Order independence: two runs with different scan orders must produce
    // the same placeholder for the same input.
    const runA = new Anonymizer();
    runA.redact('package', 'com.first');
    runA.redact('package', 'com.second');
    const targetA = runA.redact('package', 'com.example.app');

    const runB = new Anonymizer();
    runB.redact('package', 'com.example.app'); // encountered first in this run
    runB.redact('package', 'com.first');
    const targetB = runB.redact('package', 'com.example.app');

    expect(targetA).toBe(targetB);
  });

  it('separates per-domain placeholders even for identical original strings', () => {
    const a = new Anonymizer();
    const pkg = a.redact('package', 'main');
    const proc = a.redact('process', 'main');
    expect(pkg).not.toBe(proc);
    expect(pkg.startsWith('app_')).toBe(true);
    expect(proc.startsWith('proc_')).toBe(true);
  });

  it('redactString replaces every occurrence in a body', () => {
    const a = new Anonymizer();
    const body =
      '/data/data/com.example.app/files/x.db ' +
      'opened by com.example.app';
    const out = a.redactString('package', 'com.example.app', body);
    expect(out).not.toContain('com.example.app');
    expect(out).toMatch(/app_[0-9a-f]{12}/);
  });

  it('toContract strips raw originals from public mappings (Codex round 8 P1)', () => {
    const a = new Anonymizer();
    a.redact('package', 'com.confidential.app');
    a.redact('path', '/data/data/com.confidential.app/secret.db');
    const c = a.toContract();
    expect(c.state).toBe('redacted');
    for (const m of c.mappings) {
      expect(m.original).toBe('');
      expect(m.placeholder.length).toBeGreaterThan(0);
    }
    // Operators with the Anonymizer can still get the reverse table.
    const raw = a.exportRawMappings();
    expect(raw.find(m => m.original === 'com.confidential.app')).toBeDefined();
  });

  it('includeRawMappings preserves originals for operator-side use', () => {
    const a = new Anonymizer();
    a.redact('package', 'com.x');
    const c = a.toContract({includeRawMappings: true});
    expect(c.mappings[0].original).toBe('com.x');
  });

  it('toContract returns redacted state with no pending domains', () => {
    const a = new Anonymizer();
    a.redact('package', 'com.x');
    const c = a.toContract();
    expect(c.state).toBe('redacted');
    expect(c.mappings).toHaveLength(1);
  });

  it('toContract returns partial state when pending domains supplied', () => {
    const a = new Anonymizer();
    a.redact('package', 'com.x');
    const c = a.toContract({pendingDomains: ['path']});
    expect(c.state).toBe('partial');
    expect(c.pendingDomains).toEqual(['path']);
  });
});

describe('LargeTraceStreamReporter', () => {
  it('accumulates chunk progress and clamps at totalBytes', () => {
    const reporter = new LargeTraceStreamReporter(1000);
    const a = reporter.report(400);
    const b = reporter.report(700);
    expect(a.processedBytes).toBe(400);
    expect(a.chunksEmitted).toBe(1);
    expect(b.processedBytes).toBe(1000);
    expect(b.done).toBe(true);
  });

  it('complete() marks done regardless of byte progress', () => {
    const reporter = new LargeTraceStreamReporter(2000);
    const final = reporter.complete();
    expect(final.done).toBe(true);
    expect(final.processedBytes).toBe(2000);
  });
});
