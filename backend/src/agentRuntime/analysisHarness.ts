// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { EventEmitter } from 'events';
import type {
  AnalysisOptions,
  AnalysisResult,
  IOrchestrator,
} from '../agent/core/orchestratorTypes';

export interface AnalysisHarnessInput {
  engine: IOrchestrator;
}

export class AnalysisHarness extends EventEmitter implements IOrchestrator {
  readonly engine: IOrchestrator;

  cleanupSession?: IOrchestrator['cleanupSession'];
  getFocusStore?: IOrchestrator['getFocusStore'];
  recordUserInteraction?: IOrchestrator['recordUserInteraction'];
  getInterventionController?: IOrchestrator['getInterventionController'];
  getSdkSessionId?: IOrchestrator['getSdkSessionId'];
  restoreSessionMapping?: IOrchestrator['restoreSessionMapping'];
  restoreArchitectureCache?: IOrchestrator['restoreArchitectureCache'];
  getCachedArchitecture?: IOrchestrator['getCachedArchitecture'];
  getSessionNotes?: IOrchestrator['getSessionNotes'];
  getSessionPlan?: IOrchestrator['getSessionPlan'];
  getSessionUncertaintyFlags?: IOrchestrator['getSessionUncertaintyFlags'];
  takeSnapshot?: IOrchestrator['takeSnapshot'];
  restoreFromSnapshot?: IOrchestrator['restoreFromSnapshot'];

  private readonly forwardUpdate: (...args: any[]) => void;

  constructor(input: AnalysisHarnessInput) {
    super();
    this.engine = input.engine;
    this.forwardUpdate = (...args: any[]) => {
      this.emit('update', ...args);
    };
    this.engine.on('update', this.forwardUpdate);
    this.bindOptionalHooks();
  }

  analyze(
    query: string,
    sessionId: string,
    traceId: string,
    options?: AnalysisOptions,
  ): Promise<AnalysisResult> {
    return this.engine.analyze(query, sessionId, traceId, options);
  }

  reset(): void {
    this.engine.reset();
  }

  detach(): void {
    this.engine.off('update', this.forwardUpdate);
  }

  private bindOptionalHooks(): void {
    const engine = this.engine;
    if (typeof engine.cleanupSession === 'function') {
      this.cleanupSession = (sessionId) => engine.cleanupSession!(sessionId);
    }
    if (typeof engine.getFocusStore === 'function') {
      this.getFocusStore = () => engine.getFocusStore!();
    }
    if (typeof engine.recordUserInteraction === 'function') {
      this.recordUserInteraction = (interaction) => engine.recordUserInteraction!(interaction);
    }
    if (typeof engine.getInterventionController === 'function') {
      this.getInterventionController = () => engine.getInterventionController!();
    }
    if (typeof engine.getSdkSessionId === 'function') {
      this.getSdkSessionId = (sessionId, referenceTraceId) => (
        engine.getSdkSessionId!(sessionId, referenceTraceId)
      );
    }
    if (typeof engine.restoreSessionMapping === 'function') {
      this.restoreSessionMapping = (sessionId, sdkSessionId) => (
        engine.restoreSessionMapping!(sessionId, sdkSessionId)
      );
    }
    if (typeof engine.restoreArchitectureCache === 'function') {
      this.restoreArchitectureCache = (traceId, architecture) => (
        engine.restoreArchitectureCache!(traceId, architecture)
      );
    }
    if (typeof engine.getCachedArchitecture === 'function') {
      this.getCachedArchitecture = (traceId) => engine.getCachedArchitecture!(traceId);
    }
    if (typeof engine.getSessionNotes === 'function') {
      this.getSessionNotes = (sessionId) => engine.getSessionNotes!(sessionId);
    }
    if (typeof engine.getSessionPlan === 'function') {
      this.getSessionPlan = (sessionId) => engine.getSessionPlan!(sessionId);
    }
    if (typeof engine.getSessionUncertaintyFlags === 'function') {
      this.getSessionUncertaintyFlags = (sessionId) => (
        engine.getSessionUncertaintyFlags!(sessionId)
      );
    }
    if (typeof engine.takeSnapshot === 'function') {
      this.takeSnapshot = (sessionId, traceId, sessionFields) => (
        engine.takeSnapshot!(sessionId, traceId, sessionFields)
      );
    }
    if (typeof engine.restoreFromSnapshot === 'function') {
      this.restoreFromSnapshot = (sessionId, traceId, snapshot) => (
        engine.restoreFromSnapshot!(sessionId, traceId, snapshot)
      );
    }
  }
}

export function createAnalysisHarness(input: AnalysisHarnessInput): AnalysisHarness {
  return new AnalysisHarness(input);
}
