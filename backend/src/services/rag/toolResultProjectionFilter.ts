// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {createHash} from 'crypto';

import type {RagSourceKind} from '../../types/sparkContracts';
import type {CodeLookupOutcome} from '../codebase/codeLookupLedger';
import type {SanitizedRagResult} from './lookupResponseFilter';

export interface ProjectedPayload {
  toolName: string;
  chunkRefs: Array<{
    chunkId: string;
    codebaseId?: string;
    kind: RagSourceKind;
    snippetHash?: string;
    snippetLength?: number;
    redactedCount?: number;
  }>;
  outcome: CodeLookupOutcome;
  legacyPath: boolean;
}

function hashSnippet(snippet: string): string {
  return createHash('sha256').update(snippet).digest('hex').slice(0, 12);
}

export function projectRagResultForSseAndLog(toolName: string, result: SanitizedRagResult): ProjectedPayload {
  let outcome: CodeLookupOutcome = 'success';
  const chunkRefs = result.hits.map(hit => {
    if (hit.unsupportedReason) outcome = hit.unsupportedReason === 'budget_exceeded'
      ? 'budget_exceeded'
      : 'rejected';
    return {
      chunkId: hit.chunkId,
      ...(hit.metadata?.codebaseId ? {codebaseId: hit.metadata.codebaseId} : {}),
      kind: hit.metadata?.kind ?? 'androidperformance.com',
      ...(hit.snippet ? {snippetHash: hashSnippet(hit.snippet), snippetLength: hit.snippet.length} : {}),
      ...(hit.redactedCount !== undefined ? {redactedCount: hit.redactedCount} : {}),
    };
  });
  return {
    toolName,
    chunkRefs,
    outcome,
    legacyPath: result.legacyPath,
  };
}

