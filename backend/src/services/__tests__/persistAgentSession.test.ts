// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { EnhancedSessionContext, sessionContextManager } from '../../agent/context/enhancedSessionContext';
import { SessionPersistenceService } from '../sessionPersistenceService';
import { persistAgentTurn } from '../persistAgentSession';

describe('persistAgentTurn', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    sessionContextManager.remove('session-partial-message');
  });

  it('persists partial assistant messages with a visible integrity warning', () => {
    const appendMessages = jest.fn();
    jest.spyOn(SessionPersistenceService, 'getInstance').mockReturnValue({
      saveSessionStateSnapshot: jest.fn(() => true),
      appendMessages,
    } as any);

    const sessionId = 'session-partial-message';
    const traceId = 'trace-partial-message';
    sessionContextManager.set(sessionId, traceId, new EnhancedSessionContext(sessionId, traceId));

    persistAgentTurn({
      sessionId,
      traceId,
      query: '分析这个启动 trace',
      result: {
        conclusion: '综合结论：\n完成综合结论输出。',
        totalDurationMs: 123,
        partial: true,
        terminationMessage: '最终结果质量闸门发现 provider 没有产出可独立交付的完整结论。',
      },
      session: {
        createdAt: Date.now(),
        orchestrator: {
          takeSnapshot: jest.fn(() => ({
            conversationSteps: [],
            dataEnvelopes: [],
            analysisNotes: [],
          })),
        },
      } as any,
    });

    expect(appendMessages).toHaveBeenCalledTimes(1);
    const messages = appendMessages.mock.calls[0]?.[1] as Array<{ role: string; content: string }>;
    const assistantMessage = messages.find(message => message.role === 'assistant');
    expect(assistantMessage?.content).toContain('结果完整性提示');
    expect(assistantMessage?.content).toContain('最终结果质量闸门');
    expect(assistantMessage?.content).toContain('综合结论');
  });
});
