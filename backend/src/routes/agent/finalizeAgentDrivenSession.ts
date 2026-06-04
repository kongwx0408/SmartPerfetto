// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import type {
  AgentRuntimeAnalysisResult,
  Hypothesis,
  StreamingUpdate,
} from '../../agent';

type SessionStatus = 'pending' | 'running' | 'awaiting_user' | 'completed' | 'failed' | 'quota_exceeded';

interface FinalizeSessionLike {
  result?: AgentRuntimeAnalysisResult;
  hypotheses: Hypothesis[];
  conclusionHistory: Array<{ turn: number; conclusion: string; confidence: number; timestamp: number }>;
  runSequence?: number;
  activeRun?: { runId?: string; requestId?: string; sequence?: number };
  status: SessionStatus;
  sseClients: any[];
  logger: {
    info(component: string, message: string, meta?: Record<string, unknown>): void;
    warn(component: string, message: string, meta?: Record<string, unknown>): void;
    error(component: string, message: string, error?: unknown): void;
    close(): void;
  };
}

export interface FinalizeAgentDrivenSessionDeps<TSession extends FinalizeSessionLike> {
  applyFinalResultQualityGate(input: {
    result: AgentRuntimeAnalysisResult;
    query: string;
  }): { code: string; message: string } | null | undefined;
  broadcast(sessionId: string, update: StreamingUpdate): void;
  buildConversationStepUpdate(session: TSession, update: StreamingUpdate): StreamingUpdate | null;
  appendConversationStep(session: TSession, update: StreamingUpdate): void;
  annotateLatestCompletedTurn(sessionId: string, traceId: string, result: AgentRuntimeAnalysisResult): void;
  terminalRunStatusForResult(result: AgentRuntimeAnalysisResult): string;
  markSessionRunStatus(session: TSession, status: string): void;
  persistAgentTurn(input: {
    session: any;
    sessionId: string;
    traceId: string;
    query: string;
    result: {
      conclusion: string;
      totalDurationMs: number;
      partial?: boolean;
      terminationMessage?: string;
    };
    logger: TSession['logger'];
    logComponent: string;
  }): void;
  ensureCompletedAnalysisSseEvents(session: TSession): unknown[];
  sendAgentDrivenResult(client: any, session: TSession): void;
}

export function finalizeAgentDrivenSession<TSession extends FinalizeSessionLike>(input: {
  sessionId: string;
  query: string;
  traceId: string;
  session: TSession;
  result: AgentRuntimeAnalysisResult;
  logComponent: string;
}, deps: FinalizeAgentDrivenSessionDeps<TSession>): void {
  const { sessionId, query, traceId, session, result } = input;
  const { logger } = session;

  session.result = result;
  delete (session as any).completedAnalysisFinalArtifacts;
  delete (session as any).completedAnalysisSseEvents;
  delete (session as any).completedAnalysisSseEventsQualityGateVersion;

  const existingIds = new Set(session.hypotheses.map(h => h.id));
  for (const h of result.hypotheses) {
    if (!existingIds.has(h.id)) {
      session.hypotheses.push(h);
      existingIds.add(h.id);
    } else {
      const idx = session.hypotheses.findIndex(existing => existing.id === h.id);
      if (idx >= 0) session.hypotheses[idx] = h;
    }
  }

  const currentTurn = session.runSequence || 1;
  if (!session.conclusionHistory) session.conclusionHistory = [];
  if (result.conclusion) {
    session.conclusionHistory.push({
      turn: currentTurn,
      conclusion: result.conclusion,
      confidence: result.confidence ?? 0,
      timestamp: Date.now(),
    });
  }

  const finalQualityIssue = deps.applyFinalResultQualityGate({ result, query });
  if (finalQualityIssue) {
    const update: StreamingUpdate = {
      type: 'degraded',
      content: {
        module: 'agentRoutes',
        fallback: 'final_result_quality_gate',
        code: finalQualityIssue.code,
        partial: true,
        message: result.terminationMessage || finalQualityIssue.message,
      },
      timestamp: Date.now(),
    };
    deps.broadcast(sessionId, update);
    const conversationStep = deps.buildConversationStepUpdate(session, update);
    if (conversationStep) {
      deps.appendConversationStep(session, conversationStep);
      deps.broadcast(sessionId, conversationStep);
    }
  }

  deps.annotateLatestCompletedTurn(sessionId, traceId, result);

  const terminalRunStatus = deps.terminalRunStatusForResult(result);
  session.status = terminalRunStatus === 'quota_exceeded'
    ? 'quota_exceeded'
    : result.success ? 'completed' : 'failed';
  deps.markSessionRunStatus(session, terminalRunStatus);

  logger.info(input.logComponent, 'Agent-driven result finalized', {
    confidence: result.confidence,
    rounds: result.rounds,
    findingsCount: result.findings.length,
    hypothesesCount: result.hypotheses.length,
    claimSupportCount: result.claimSupport?.length || 0,
    claimVerifierStatus: result.claimVerificationResult?.status,
    partial: result.partial,
    terminationReason: result.terminationReason,
    runId: session.activeRun?.runId,
    requestId: session.activeRun?.requestId,
    runSequence: session.activeRun?.sequence,
  });

  deps.persistAgentTurn({
    session,
    sessionId,
    traceId,
    query,
    result: {
      conclusion: result.conclusion,
      totalDurationMs: result.totalDurationMs,
      partial: result.partial,
      terminationMessage: result.terminationMessage,
    },
    logger,
    logComponent: input.logComponent,
  });

  deps.ensureCompletedAnalysisSseEvents(session);
  const clientCount = session.sseClients.length;
  session.sseClients.forEach((client, index) => {
    try {
      logger.info('AgentRoutes', `Sending finalized result to client ${index + 1}/${clientCount}`);
      deps.sendAgentDrivenResult(client, session);
    } catch (e: any) {
      logger.error('AgentRoutes', `Error sending finalized result to client ${index + 1}`, e);
    }
  });
  logger.close();
}
