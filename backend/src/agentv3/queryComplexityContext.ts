// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import type { Finding } from '../agent/types';
import type { SceneType } from './sceneClassifier';
import type { ComplexityClassifierInput, SelectionContext } from './types';

const RECENT_TURN_LIMIT = 3;
const RECENT_FINDING_LIMIT = 5;

type PriorTurn = {
  query?: string;
  intent?: { complexity?: string };
  findings?: Finding[];
};

interface BuildComplexityClassifierInputParams {
  query: string;
  sceneType: SceneType;
  selectionContext?: SelectionContext;
  hasReferenceTrace: boolean;
  previousTurns: PriorTurn[];
}

function isFullLikeTurn(turn: PriorTurn): boolean {
  const complexity = turn.intent?.complexity;
  return complexity === 'complex' || complexity === 'moderate';
}

function formatFindingSummary(finding: Finding): string | null {
  const title = typeof finding.title === 'string' ? finding.title.trim() : '';
  if (!title) return null;
  const parts = [title];
  if (finding.category) parts.push(`category=${finding.category}`);
  if (finding.severity) parts.push(`severity=${finding.severity}`);
  return parts.join(' | ');
}

export function buildComplexityClassifierInput(
  params: BuildComplexityClassifierInputParams,
): ComplexityClassifierInput {
  const recentTurns = params.previousTurns.slice(-RECENT_TURN_LIMIT);
  const recentFullTurns = recentTurns.filter(isFullLikeTurn);
  const previousFindings = recentFullTurns
    .flatMap(turn => turn.findings ?? [])
    .map(formatFindingSummary)
    .filter((summary): summary is string => !!summary)
    .slice(-RECENT_FINDING_LIMIT);

  return {
    query: params.query,
    sceneType: params.sceneType,
    hasSelectionContext: !!params.selectionContext,
    selectionContext: params.selectionContext,
    hasReferenceTrace: params.hasReferenceTrace,
    hasExistingFindings: previousFindings.length > 0,
    hasPriorFullAnalysis: recentFullTurns.length > 0,
    previousQueries: recentTurns.map(t => t.query).filter((q): q is string => !!q),
    previousFindings,
  };
}
