// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

export interface SmartCancelToken {
  readonly signal: AbortSignal;
  throwIfAborted(): void;
}

export class SmartCancelBridge {
  private readonly controllers = new Map<string, AbortController>();
  private readonly terminalClaims = new Set<string>();

  create(parentSessionId: string): SmartCancelToken {
    this.release(parentSessionId);
    const controller = new AbortController();
    this.controllers.set(parentSessionId, controller);
    return {
      signal: controller.signal,
      throwIfAborted() {
        if (controller.signal.aborted) {
          throw new Error('Smart analysis cancelled');
        }
      },
    };
  }

  cancel(parentSessionId: string): boolean {
    const controller = this.controllers.get(parentSessionId);
    if (!controller) return false;
    controller.abort();
    return true;
  }

  tryClaimTerminal(parentSessionId: string): boolean {
    if (this.terminalClaims.has(parentSessionId)) return false;
    this.terminalClaims.add(parentSessionId);
    return true;
  }

  release(parentSessionId: string): void {
    this.controllers.delete(parentSessionId);
    this.terminalClaims.delete(parentSessionId);
  }
}
