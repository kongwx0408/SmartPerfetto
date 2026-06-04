// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * Startup / ANR / Method-Trace Graph builder (Spark Plan 17)
 *
 * Combines startup phase rows, ANR attribution and method-trace nodes
 * into one `StartupAnrMethodGraphContract`. Performs minimal validation:
 *  - Method-trace nodes must reference valid child ids; orphans are
 *    dropped from the children[] arrays so the contract can render.
 *  - Each child id is recorded in `coverage` to surface implementation
 *    completeness per spark.
 */

import {
  makeSparkProvenance,
  type AnrAttribution,
  type JankDecisionNode,
  type MethodTraceNode,
  type NsTimeRange,
  type StartupAnrMethodGraphContract,
  type StartupPhaseRow,
} from '../types/sparkContracts';

export interface StartupAnrMethodGraphOptions {
  range: NsTimeRange;
  startupPhases?: StartupPhaseRow[];
  anrAttributions?: AnrAttribution[];
  methodTraceGraph?: MethodTraceNode[];
  decisionTree?: JankDecisionNode;
}

/** Drop dangling child ids from method trace nodes. */
function pruneMethodTraceChildren(
  nodes: MethodTraceNode[] | undefined,
): MethodTraceNode[] | undefined {
  if (!nodes || nodes.length === 0) return nodes;
  const validIds = new Set(nodes.map(n => n.id));
  return nodes.map(n => ({
    ...n,
    ...(n.children
      ? {children: n.children.filter(childId => validIds.has(childId))}
      : {}),
  }));
}

/** "Has data" guard that rejects both undefined and [] (Codex regression). */
function hasRows<T>(rows: T[] | undefined): rows is T[] {
  return Array.isArray(rows) && rows.length > 0;
}

export function buildStartupAnrMethodGraph(
  options: StartupAnrMethodGraphOptions,
): StartupAnrMethodGraphContract {
  const prunedMethodGraph = pruneMethodTraceChildren(options.methodTraceGraph);
  const hasStartup = hasRows(options.startupPhases);
  const hasAnr = hasRows(options.anrAttributions);
  const hasMethod = hasRows(prunedMethodGraph);
  const hasTree = Boolean(options.decisionTree);

  const allEmpty = !hasStartup && !hasAnr && !hasMethod && !hasTree;

  // Phase coverage detection — flips coverage entries when a phase row
  // surfaces evidence for a particular spark.
  const hasArtJit = hasStartup && options.startupPhases!.some(
    p => p.artVerifierDurNs !== undefined || p.jitDurNs !== undefined || p.classLoadingDurNs !== undefined,
  );
  const hasCompose = hasStartup && options.startupPhases!.some(
    p => p.recompositionCount !== undefined && p.recompositionCount > 0,
  );
  const hasInitializers = hasStartup && options.startupPhases!.some(
    p => p.initializersFired !== undefined && p.initializersFired.length > 0,
  );
  const methodSources = new Set(
    hasMethod ? (prunedMethodGraph!.map(n => n.source).filter(Boolean) as string[]) : [],
  );
  const hasAnrThreadSamples = hasAnr && options.anrAttributions!.some(
    a => a.threadSamples !== undefined && a.threadSamples.length > 0,
  );

  return {
    ...makeSparkProvenance({
      source: 'startup-anr-method-graph',
      ...(allEmpty ? {unsupportedReason: 'no startup / ANR / method-trace facets supplied'} : {}),
    }),
    range: options.range,
    ...(hasStartup ? {startupPhases: options.startupPhases} : {}),
    ...(hasAnr ? {anrAttributions: options.anrAttributions} : {}),
    ...(hasMethod ? {methodTraceGraph: prunedMethodGraph} : {}),
    ...(hasTree ? {decisionTree: options.decisionTree} : {}),
    coverage: [
      {sparkId: 32, planId: '17', status: hasStartup ? 'implemented' : 'scaffolded'},
      {sparkId: 33, planId: '17', status: hasAnr ? 'implemented' : 'scaffolded'},
      {sparkId: 49, planId: '17', status: hasAnrThreadSamples ? 'implemented' : 'scaffolded'},
      {sparkId: 68, planId: '17', status: hasCompose ? 'implemented' : 'scaffolded'},
      {sparkId: 69, planId: '17', status: hasInitializers ? 'implemented' : 'scaffolded'},
      {sparkId: 72, planId: '17', status: methodSources.has('matrix') || methodSources.has('btrace') || methodSources.has('rheatrace') || methodSources.has('koom') ? 'implemented' : 'scaffolded'},
      {sparkId: 78, planId: '17', status: methodSources.has('bytecode') ? 'implemented' : 'scaffolded'},
      {sparkId: 132, planId: '17', status: hasArtJit ? 'implemented' : 'scaffolded'},
    ],
  };
}
