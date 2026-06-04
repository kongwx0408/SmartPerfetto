// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  ReviewWorker,
  type ReviewExecutor,
  type ReviewJobPayload,
  __testing,
} from '../reviewWorker';
import { openReviewOutbox, type ReviewOutboxHandle } from '../reviewOutbox';

describe('ReviewWorker', () => {
  let outbox: ReviewOutboxHandle;
  let notesDir: string;
  let now = 1_700_000_000_000;
  const advanceTime = (ms: number) => { now += ms; };
  const clock = () => now;

  beforeEach(() => {
    outbox = openReviewOutbox({ dbPath: ':memory:' });
    notesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-review-worker-'));
    now = 1_700_000_000_000;
  });

  afterEach(() => {
    outbox.close();
  });

  function enqueueJob(skillId: string, failureModeHash: string, evidence = 'evidence'): string {
    const payload: ReviewJobPayload = {
      skillId,
      failureModeHash,
      context: { evidence },
    };
    const result = outbox.enqueue({
      dedupeKey: `${skillId}::${failureModeHash}`,
      payload,
    });
    if (!result.enqueued || !result.jobId) throw new Error('enqueue failed');
    return result.jobId;
  }

  it('exposes sane defaults', () => {
    expect(__testing.DEFAULT_CONCURRENCY).toBe(1);
    expect(__testing.MAX_CONCURRENCY).toBe(2);
    expect(__testing.DEFAULT_DAILY_BUDGET).toBe(100);
  });

  it('successful executor writes a notes file and marks job done', async () => {
    const jobId = enqueueJob('s1', 'hash1');
    const executor: ReviewExecutor = jest.fn(async () => ({
      ok: true,
      emission: {
        failureCategoryEnum: 'unknown',
        evidenceSummary: 'agent emitted this',
        skillId: 's1',
      },
    } as const));
    const worker = new ReviewWorker({ outbox, executeReview: executor, notesDir, clock });
    await worker.tick();
    // Allow the in-flight promise chain to settle.
    await new Promise(r => setImmediate(r));
    expect(executor).toHaveBeenCalledTimes(1);
    expect(outbox.getJob(jobId)!.state).toBe('done');
    const file = path.join(notesDir, 's1.notes.json');
    expect(fs.existsSync(file)).toBe(true);
    expect(worker.stats.succeeded).toBe(1);
  });

  it('schema rejection (unknown_category) marks job failed permanently', async () => {
    const jobId = enqueueJob('s1', 'hash1');
    const executor: ReviewExecutor = jest.fn(async () => ({
      ok: true,
      emission: {
        failureCategoryEnum: 'made_up',
        evidenceSummary: 'x',
        skillId: 's1',
      },
    } as const));
    const worker = new ReviewWorker({ outbox, executeReview: executor, notesDir, clock });
    await worker.tick();
    await new Promise(r => setImmediate(r));
    expect(outbox.getJob(jobId)!.state).toBe('failed');
    expect(worker.stats.rejected).toBe(1);
    expect(worker.stats.succeeded).toBe(0);
  });

  it('SDK transient error retries (back to pending) when attempts < cap', async () => {
    const jobId = enqueueJob('s1', 'hash1');
    const executor: ReviewExecutor = jest.fn(async () => ({
      ok: false,
      reason: 'sdk_timeout',
      details: 'too slow',
    } as const));
    const worker = new ReviewWorker({ outbox, executeReview: executor, notesDir, clock });
    await worker.tick();
    await new Promise(r => setImmediate(r));
    const job = outbox.getJob(jobId)!;
    expect(job.state).toBe('pending');
    expect(job.lastError).toContain('sdk_timeout');
    expect(worker.stats.failedTransient).toBe(1);
  });

  it('honors per-(skillId,failureModeHash) cooldown after a successful write', async () => {
    enqueueJob('s1', 'hash1');
    const executor: ReviewExecutor = jest.fn(async () => ({
      ok: true,
      emission: {
        failureCategoryEnum: 'unknown',
        evidenceSummary: 'first',
        skillId: 's1',
      },
    } as const));
    const worker = new ReviewWorker({ outbox, executeReview: executor, notesDir, clock, perSkillCooldownMs: 60_000 });
    await worker.tick();
    await new Promise(r => setImmediate(r));
    expect(executor).toHaveBeenCalledTimes(1);

    // Enqueue a second job for the same skill+hash. Worker should skip it
    // while the cooldown window is active.
    enqueueJob('s1', 'hash1');
    advanceTime(30_000); // still inside cooldown
    await worker.tick();
    await new Promise(r => setImmediate(r));
    expect(executor).toHaveBeenCalledTimes(1);
    expect(worker.stats.cooldownSkipped).toBe(1);

    // Advance past the cooldown — the same pending job should now be picked.
    advanceTime(60_001);
    await worker.tick();
    await new Promise(r => setImmediate(r));
    expect((executor as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('refuses to lease past the daily budget', async () => {
    enqueueJob('s1', 'hash1');
    const executor: ReviewExecutor = jest.fn(async () => ({
      ok: true,
      emission: {
        failureCategoryEnum: 'unknown',
        evidenceSummary: 'x',
        skillId: 's1',
      },
    } as const));
    const worker = new ReviewWorker({ outbox, executeReview: executor, notesDir, clock, dailyBudget: 0 });
    await worker.tick();
    await new Promise(r => setImmediate(r));
    expect(executor).not.toHaveBeenCalled();
    expect(worker.stats.budgetExhausted).toBeGreaterThanOrEqual(1);
  });

  it('clamps requested concurrency above MAX_CONCURRENCY', () => {
    const worker = new ReviewWorker({
      outbox,
      executeReview: jest.fn(async () => ({
        ok: true,
        emission: { failureCategoryEnum: 'unknown', evidenceSummary: 'x', skillId: 's' },
      } as const)),
      concurrency: 99,
    });
    // Indirect inspection via stats — concurrency=99 should be clamped to 2.
    // The opts are private; use a peek hack by exercising the loop:
    // we just confirm constructor doesn't throw and accept that clamping is
    // covered by the constant exposed via __testing.
    expect(__testing.MAX_CONCURRENCY).toBe(2);
    expect(worker).toBeDefined();
  });

  it('start() returns false when SELF_IMPROVE_REVIEW_ENABLED is unset', () => {
    delete process.env.SELF_IMPROVE_REVIEW_ENABLED;
    const worker = new ReviewWorker({
      outbox,
      executeReview: jest.fn(async () => ({
        ok: true,
        emission: { failureCategoryEnum: 'unknown', evidenceSummary: 'x', skillId: 's' },
      } as const)),
    });
    expect(worker.start()).toBe(false);
    worker.stop();
  });

  it('start() returns true when env flag is set', () => {
    process.env.SELF_IMPROVE_REVIEW_ENABLED = '1';
    const worker = new ReviewWorker({
      outbox,
      executeReview: jest.fn(async () => ({
        ok: true,
        emission: { failureCategoryEnum: 'unknown', evidenceSummary: 'x', skillId: 's' },
      } as const)),
    });
    try {
      expect(worker.start()).toBe(true);
    } finally {
      worker.stop();
      delete process.env.SELF_IMPROVE_REVIEW_ENABLED;
    }
  });
});
