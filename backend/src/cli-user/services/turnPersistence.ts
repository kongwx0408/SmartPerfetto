// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * Per-turn persistence helper shared by `analyze` and `resume`.
 *
 * Both commands end a turn with the same fan-out: write conclusion +
 * per-turn markdown + HTML report + config + transcript + index entry,
 * then render the conclusion block and the completion summary. This
 * helper owns those eight steps so the call sites stay short and
 * uniform — any future addition (e.g. a `--no-report` flag) only
 * touches one place.
 */

import * as path from 'path';
import type { CliPaths, SessionPaths } from '../io/paths';
import type { Renderer } from '../repl/renderer';
import type { CliSessionConfig, CliSessionIndexEntry } from '../types';
import type { RunTurnOutput } from './cliAnalyzeService';
import {
  writeConfig,
  writeConclusion,
  writeJsonFile,
  writeReportHtml,
  writeTurnReportHtml,
  writeTurnMarkdown,
} from '../io/sessionStore';
import { upsertSession } from '../io/indexJson';
import { appendTranscriptTurn } from '../io/transcriptWriter';

export interface CommitTurnInput {
  paths: CliPaths;
  sp: SessionPaths;
  renderer: Renderer;

  /** User-facing session id. For resume this equals the input session id;
   *  for a fresh analyze it equals `result.sessionId`. */
  sessionId: string;
  /** 1-indexed. */
  turn: number;
  /** The user's question for this turn. */
  query: string;
  /** Output of CliAnalyzeService.runTurn(). */
  result: RunTurnOutput;
  /** Caller-constructed config. This helper persists it verbatim. */
  config: CliSessionConfig;
  /** Pre-formatted markdown for `turns/NNN.md`. */
  turnMarkdown: string;
  /** Optional deterministic appendix, currently used by dual-trace comparison. */
  reportAppendix?: { markdown: string; html: string };
  /** Caller-constructed index row. */
  indexEntry: CliSessionIndexEntry;
}

export function commitTurnOutputs(input: CommitTurnInput): void {
  const { paths, sp, renderer, sessionId, turn, query, result, config, turnMarkdown, reportAppendix, indexEntry } = input;

  const conclusion = result.result.conclusion || '';

  writeConclusion(sp, conclusion);
  writeTurnMarkdown(sp, turn, reportAppendix?.markdown ? `${turnMarkdown}\n\n${reportAppendix.markdown}` : turnMarkdown);
  writeAnalysisQualitySidecars(sp, turn, result);

  let turnReportPath: string | undefined;
  const reportHtml = result.reportHtml && reportAppendix?.html
    ? appendHtmlToBody(result.reportHtml, reportAppendix.html)
    : result.reportHtml;
  const reportPathForUser = result.reportHtml
    ? (turnReportPath = writeTurnReportHtml(sp, turn, reportHtml || ''), writeReportHtml(sp, reportHtml || ''), sp.report)
    : `(report generation failed${result.reportError ? `: ${result.reportError}` : ''})`;

  writeConfig(sp, config);

  appendTranscriptTurn(sp.transcript, {
    turn,
    timestamp: config.lastTurnAt,
    question: query,
    conclusionMd: conclusion,
    confidence: result.result.confidence,
    rounds: result.result.rounds,
    durationMs: result.result.totalDurationMs,
    reportFile: turnReportPath,
    error: result.reportError,
  });

  upsertSession(paths, indexEntry);

  renderer.printConclusion(conclusion, {
    confidence: result.result.confidence,
    rounds: result.result.rounds,
    durationMs: result.result.totalDurationMs,
    claimVerification: result.result.claimVerificationResult
      ? {
        status: result.result.claimVerificationResult.status,
        checkedClaimCount: result.result.claimVerificationResult.checkedClaimCount,
        unsupportedClaimCount: result.result.claimVerificationResult.unsupportedClaimCount,
        issueCount: result.result.claimVerificationResult.issues?.length || 0,
      }
      : undefined,
  });
  renderer.printCompletion({
    reportPath: reportPathForUser,
    turnReportPath,
    sessionDir: sp.dir,
    sessionId,
    success: result.result.success,
  });
}

function writeAnalysisQualitySidecars(sp: SessionPaths, turn: number, result: RunTurnOutput): void {
  const turnPrefix = path.join(sp.turnsDir, String(turn).padStart(3, '0'));
  writeJsonFile(sp, sp.claimSupport, result.result.claimSupport || []);
  writeJsonFile(sp, `${turnPrefix}.claim-support.json`, result.result.claimSupport || []);
  writeJsonFile(sp, sp.claimVerification, result.result.claimVerificationResult || null);
  writeJsonFile(sp, `${turnPrefix}.claim-verification.json`, result.result.claimVerificationResult || null);
  writeJsonFile(sp, sp.identityResolutions, result.result.identityResolutions || []);
  writeJsonFile(sp, `${turnPrefix}.identity-resolutions.json`, result.result.identityResolutions || []);
}

function appendHtmlToBody(html: string, appendixHtml: string): string {
  const closeBody = /<\/body>\s*<\/html>\s*$/i;
  if (closeBody.test(html)) {
    return html.replace(closeBody, `${appendixHtml}\n</body>\n</html>`);
  }
  return `${html}\n${appendixHtml}`;
}
