// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {describe, it, expect} from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  analyzeStdlibSkillCoverage,
  persistStdlibSnapshot,
} from '../stdlibSkillCoverage';
import {isUnsupported} from '../../types/sparkContracts';

describe('stdlibSkillCoverage', () => {
  it('produces a coverage contract over the real Skill registry + stdlib catalog', async () => {
    const contract = await analyzeStdlibSkillCoverage({ignoreSnapshot: true});

    // The catalog is real, so totals should be > 0 and the contract is not unsupported.
    expect(isUnsupported(contract)).toBe(false);
    expect(contract.totalModules).toBeGreaterThan(50);
    expect(contract.skillUsage.length).toBeGreaterThan(0);

    // Every Spark id from the plan should be represented in coverage entries.
    const sparkIds = contract.coverage.map(c => c.sparkId);
    expect(sparkIds).toContain(1);
    expect(sparkIds).toContain(21);

    // modulesCovered must be <= totalModules.
    expect(contract.modulesCovered).toBeLessThanOrEqual(contract.totalModules);

    // Each skillUsage entry must satisfy the drift invariant:
    //   declared U detected = declaredButUnused U detectedButUndeclared U common
    for (const usage of contract.skillUsage.slice(0, 5)) {
      const declared = new Set(usage.declared);
      const detected = new Set(usage.detected);
      for (const m of usage.declaredButUnused) {
        expect(declared.has(m)).toBe(true);
        expect(detected.has(m)).toBe(false);
      }
      for (const m of usage.detectedButUndeclared) {
        expect(detected.has(m)).toBe(true);
        expect(declared.has(m)).toBe(false);
      }
    }
  }, 30000);

  it('counts explicit INCLUDE statements as detected usage (Codex regression)', async () => {
    // After the Codex fix, a skill that already wrote `INCLUDE PERFETTO MODULE
    // android.binder` in its SQL must NOT be reported as `declaredButUnused`
    // — that explicit INCLUDE is exactly the form we want skill authors to
    // use, and it should count as detected stdlib usage.
    const contract = await analyzeStdlibSkillCoverage({ignoreSnapshot: true});
    const binderRootCause = contract.skillUsage.find(u => u.skillId === 'binder_root_cause');
    if (binderRootCause) {
      // binder_root_cause's SQL already explicitly includes android.binder.
      expect(binderRootCause.detected).toContain('android.binder');
    }
  }, 30000);

  it('round-trips through a snapshot to surface newly added modules', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdlib-cov-'));
    const snapshotPath = path.join(tmpDir, 'snapshot.json');

    // Write a snapshot with intentionally fewer modules so the analyzer
    // detects new additions on the second run.
    fs.writeFileSync(
      snapshotPath,
      JSON.stringify({version: 1, capturedAt: 1, modules: []}, null, 2),
    );

    const contract = await analyzeStdlibSkillCoverage({snapshotPath});
    expect(contract.newlyAddedModules?.length).toBeGreaterThan(0);
    expect(contract.coverage.find(c => c.sparkId === 21)?.status).toBe('implemented');

    // Persist a fresh snapshot and confirm no newly added modules detected
    // on the next run.
    persistStdlibSnapshot(snapshotPath);
    const second = await analyzeStdlibSkillCoverage({snapshotPath});
    expect(second.newlyAddedModules).toBeUndefined();

    fs.rmSync(tmpDir, {recursive: true, force: true});
  }, 30000);
});
