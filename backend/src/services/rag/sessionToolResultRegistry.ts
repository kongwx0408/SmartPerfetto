// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import type {ProjectedPayload} from './toolResultProjectionFilter';

export type ToolRuntime = 'claude' | 'openai';

export interface SessionToolResultKey {
  sessionId: string;
  runId: string;
  runtime: ToolRuntime;
  invocationId: string;
}

export interface SessionToolResultEntry {
  llmPayload: unknown;
  sidecar: ProjectedPayload;
  createdAt: number;
}

export function serializeToolResultKey(key: SessionToolResultKey): string {
  return `${key.sessionId}:${key.runId}:${key.runtime}:${key.invocationId}`;
}

export class SessionToolResultRegistry {
  private readonly entries = new Map<string, SessionToolResultEntry>();
  private readonly aliases = new Map<string, string>();

  put(key: SessionToolResultKey, entry: Omit<SessionToolResultEntry, 'createdAt'>): void {
    this.entries.set(serializeToolResultKey(key), {
      ...entry,
      createdAt: Date.now(),
    });
  }

  alias(from: SessionToolResultKey, to: SessionToolResultKey): void {
    this.aliases.set(serializeToolResultKey(from), serializeToolResultKey(to));
  }

  getSidecar(key: SessionToolResultKey): ProjectedPayload | undefined {
    const serialized = serializeToolResultKey(key);
    const target = this.aliases.get(serialized) ?? serialized;
    return this.entries.get(target)?.sidecar;
  }

  getLlmPayload(key: SessionToolResultKey): unknown {
    const serialized = serializeToolResultKey(key);
    const target = this.aliases.get(serialized) ?? serialized;
    return this.entries.get(target)?.llmPayload;
  }

  clearRun(sessionId: string, runId: string): void {
    const prefix = `${sessionId}:${runId}:`;
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
    for (const key of this.aliases.keys()) {
      if (key.startsWith(prefix)) this.aliases.delete(key);
    }
  }
}

export function projectedSidecarMissing(toolName: string): ProjectedPayload {
  return {
    toolName,
    chunkRefs: [],
    outcome: 'sidecar_missing',
    legacyPath: false,
  };
}

