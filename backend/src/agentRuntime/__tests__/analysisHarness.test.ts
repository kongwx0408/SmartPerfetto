// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { EventEmitter } from 'events';
import { describe, expect, it, jest } from '@jest/globals';
import type {
  AnalysisOptions,
  AnalysisResult,
  IOrchestrator,
} from '../../agent/core/orchestratorTypes';
import { createAnalysisHarness } from '../analysisHarness';
import { productionRuntimeRegistry } from '../runtimeRegistry';

const result: AnalysisResult = {
  sessionId: 'session-1',
  success: true,
  findings: [],
  hypotheses: [],
  conclusion: 'done',
  confidence: 1,
  rounds: 0,
  totalDurationMs: 1,
};

type MockEngine = IOrchestrator & EventEmitter & {
  analyze: jest.MockedFunction<IOrchestrator['analyze']>;
  reset: jest.MockedFunction<IOrchestrator['reset']>;
};

function createEngine(overrides: Partial<IOrchestrator> = {}): MockEngine {
  const engine = new EventEmitter() as MockEngine;
  engine.analyze = jest.fn(async (
    _query: string,
    _sessionId: string,
    _traceId: string,
    _options?: AnalysisOptions,
  ) => result);
  engine.reset = jest.fn();
  Object.assign(engine, overrides);
  return engine;
}

describe('AnalysisHarness hidden strangler', () => {
  it('delegates required IOrchestrator methods to the wrapped engine', async () => {
    const engine = createEngine();
    const harness = createAnalysisHarness({ engine });
    const options: AnalysisOptions = { analysisMode: 'fast' };

    await expect(harness.analyze('q', 'session-1', 'trace-1', options)).resolves.toBe(result);
    harness.reset();

    expect(engine.analyze).toHaveBeenCalledWith('q', 'session-1', 'trace-1', options);
    expect(engine.reset).toHaveBeenCalledTimes(1);
    harness.detach();
  });

  it('bridges runtime update events without synthesizing route-owned terminal events', async () => {
    const engine = createEngine();
    const harness = createAnalysisHarness({ engine });
    const updates: any[] = [];
    harness.on('update', (update) => updates.push(update));

    await harness.analyze('q', 'session-1', 'trace-1');
    expect(updates).toEqual([]);

    const progressUpdate = {
      type: 'progress',
      message: 'engine progress',
    };
    engine.emit('update', progressUpdate);

    expect(updates).toEqual([progressUpdate]);
    expect(updates.some((update) => update.type === 'analysis_completed')).toBe(false);
    harness.detach();
  });

  it('preserves optional hook presence when the wrapped engine does not expose hooks', () => {
    const harness = createAnalysisHarness({ engine: createEngine() });

    expect(typeof harness.cleanupSession).toBe('undefined');
    expect(typeof harness.getFocusStore).toBe('undefined');
    expect(typeof harness.recordUserInteraction).toBe('undefined');
    expect(typeof harness.getInterventionController).toBe('undefined');
    expect(typeof harness.getSdkSessionId).toBe('undefined');
    expect(typeof harness.restoreSessionMapping).toBe('undefined');
    expect(typeof harness.restoreArchitectureCache).toBe('undefined');
    expect(typeof harness.getCachedArchitecture).toBe('undefined');
    expect(typeof harness.getSessionNotes).toBe('undefined');
    expect(typeof harness.getSessionPlan).toBe('undefined');
    expect(typeof harness.getSessionUncertaintyFlags).toBe('undefined');
    expect(typeof harness.takeSnapshot).toBe('undefined');
    expect(typeof harness.restoreFromSnapshot).toBe('undefined');
    harness.detach();
  });

  it('forwards every optional IOrchestrator hook exposed by the wrapped engine', () => {
    const focusStore = { serialize: jest.fn() };
    const interventionController = { active: true };
    const architecture = { os: 'android' };
    const notes = [{ id: 'note-1' }];
    const plan = { phases: [] };
    const flags = [{ id: 'flag-1' }];
    const snapshot = { version: 1 };
    const hooks = {
      cleanupSession: jest.fn(),
      getFocusStore: jest.fn(() => focusStore),
      recordUserInteraction: jest.fn(),
      getInterventionController: jest.fn(() => interventionController),
      getSdkSessionId: jest.fn(() => 'sdk-session-1'),
      restoreSessionMapping: jest.fn(),
      restoreArchitectureCache: jest.fn(),
      getCachedArchitecture: jest.fn(() => architecture),
      getSessionNotes: jest.fn(() => notes),
      getSessionPlan: jest.fn(() => plan),
      getSessionUncertaintyFlags: jest.fn(() => flags),
      takeSnapshot: jest.fn(() => snapshot),
      restoreFromSnapshot: jest.fn(),
    };
    const harness = createAnalysisHarness({ engine: createEngine(hooks) });

    harness.cleanupSession!('session-1');
    harness.recordUserInteraction!({ kind: 'click' });
    harness.restoreSessionMapping!('session-1', 'sdk-session-1');
    harness.restoreArchitectureCache!('trace-1', architecture);
    harness.restoreFromSnapshot!('session-1', 'trace-1', snapshot);

    expect(harness.getFocusStore!()).toBe(focusStore);
    expect(harness.getInterventionController!()).toBe(interventionController);
    expect(harness.getSdkSessionId!('session-1', 'trace-ref')).toBe('sdk-session-1');
    expect(harness.getCachedArchitecture!('trace-1')).toBe(architecture);
    expect(harness.getSessionNotes!('session-1')).toBe(notes);
    expect(harness.getSessionPlan!('session-1')).toBe(plan);
    expect(harness.getSessionUncertaintyFlags!('session-1')).toBe(flags);
    expect(harness.takeSnapshot!('session-1', 'trace-1', { field: true })).toBe(snapshot);

    expect(hooks.cleanupSession).toHaveBeenCalledWith('session-1');
    expect(hooks.recordUserInteraction).toHaveBeenCalledWith({ kind: 'click' });
    expect(hooks.restoreSessionMapping).toHaveBeenCalledWith('session-1', 'sdk-session-1');
    expect(hooks.restoreArchitectureCache).toHaveBeenCalledWith('trace-1', architecture);
    expect(hooks.restoreFromSnapshot).toHaveBeenCalledWith('session-1', 'trace-1', snapshot);
    expect(hooks.getSdkSessionId.mock.calls).toEqual([['session-1', 'trace-ref']]);
    expect(hooks.takeSnapshot.mock.calls).toEqual([['session-1', 'trace-1', { field: true }]]);
    harness.detach();
  });

  it('does not register the harness as a production runtime path', () => {
    expect(productionRuntimeRegistry.listRuntimeKinds()).toEqual([
      'claude-agent-sdk',
      'openai-agents-sdk',
    ]);
    expect(productionRuntimeRegistry.has('analysis-harness')).toBe(false);
  });
});
