// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {describe, expect, it} from '@jest/globals';

import {HTMLReportGenerator, type AgentDrivenReportData} from '../htmlReportGenerator';

function makeReportData(contract: unknown): AgentDrivenReportData {
  return {
    traceId: 'trace-code-aware',
    query: 'why slow',
    result: {
      sessionId: 'session-code-aware',
      success: true,
      findings: [],
      hypotheses: [],
      conclusion: 'Root cause references CodeRef only.',
      conclusionContract: contract,
      confidence: 0.8,
      rounds: 1,
      totalDurationMs: 100,
    },
    hypotheses: [],
    dialogue: [],
    timestamp: 1714600000000,
  };
}

describe('HTMLReportGenerator code-aware rendering', () => {
  it('renders CodeRef and patchStatus without raw source or sketch diff text', () => {
    const html = new HTMLReportGenerator().generateAgentDrivenHTML(makeReportData({
      codeReferences: [{
        chunkId: 'chunk-main',
        codebaseId: 'cb_app',
        filePath: 'app/src/Main.kt',
        lineRange: {start: 10, end: 12},
        symbol: 'MainActivity.onCreate',
      }],
      patchProposals: [{
        patchProposalId: 'patch-1',
        patchStatus: 'sketch',
        rationale: 'Move heavy initialization out of startup.',
        diff: 'diff --git a/app/src/Main.kt b/app/src/Main.kt\n-secret\n+secret',
      }],
    }));

    expect(html).toContain('代码引用与 Patch');
    expect(html).toContain('chunk-main');
    expect(html).toContain('app/src/Main.kt:10-12');
    expect(html).toContain('patch-status sketch');
    expect(html).toContain('Move heavy initialization');
    expect(html).not.toContain('-secret');
    expect(html).not.toContain('+secret');
  });
});

