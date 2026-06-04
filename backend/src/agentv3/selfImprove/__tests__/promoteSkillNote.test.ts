// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { describe, it, expect, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promoteSkillNote } from '../promoteSkillNote';
import { writeSkillNote, readSkillNotesFile } from '../skillNotesWriter';

describe('promoteSkillNote', () => {
  let runtimeDir: string;
  let curatedDir: string;

  beforeEach(() => {
    runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-runtime-'));
    curatedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-curated-'));
    // Seed runtime with a single note via the canonical writer.
    writeSkillNote({
      failureCategoryEnum: 'misdiagnosis_vsync_vrr',
      evidenceSummary: 'sample',
      skillId: 's1',
    }, { notesDir: runtimeDir });
  });

  it('returns skill_not_found when the runtime file is absent', () => {
    const result = promoteSkillNote('missing_skill', 'note-x', { runtimeDir, curatedDir });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('skill_not_found');
  });

  it('returns note_not_found when the noteId is unknown', () => {
    const result = promoteSkillNote('s1', 'no-such-note', { runtimeDir, curatedDir });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('note_not_found');
  });

  it('promotes a note and removes it from runtime', () => {
    const runtime = readSkillNotesFile(path.join(runtimeDir, 's1.notes.json'));
    const noteId = runtime.notes[0].id;
    const result = promoteSkillNote('s1', noteId, { runtimeDir, curatedDir });
    expect(result.ok).toBe(true);
    expect(result.curatedPath).toContain('s1.notes.json');

    const curated = readSkillNotesFile(path.join(curatedDir, 's1.notes.json'));
    expect(curated.notes.map(n => n.id)).toContain(noteId);

    const runtimeAfter = readSkillNotesFile(path.join(runtimeDir, 's1.notes.json'));
    expect(runtimeAfter.notes.map(n => n.id)).not.toContain(noteId);
  });

  it('refuses to double-promote', () => {
    const runtime = readSkillNotesFile(path.join(runtimeDir, 's1.notes.json'));
    const noteId = runtime.notes[0].id;
    expect(promoteSkillNote('s1', noteId, { runtimeDir, curatedDir }).ok).toBe(true);
    // After promotion, runtime no longer has the note — second call returns
    // note_not_found, which is the idempotent outcome we want.
    const second = promoteSkillNote('s1', noteId, { runtimeDir, curatedDir });
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('note_not_found');
  });

  it('dry-run does not modify files', () => {
    const runtime = readSkillNotesFile(path.join(runtimeDir, 's1.notes.json'));
    const noteId = runtime.notes[0].id;
    const result = promoteSkillNote('s1', noteId, { runtimeDir, curatedDir, dryRun: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(curatedDir, 's1.notes.json'))).toBe(false);
    const runtimeAfter = readSkillNotesFile(path.join(runtimeDir, 's1.notes.json'));
    expect(runtimeAfter.notes.map(n => n.id)).toContain(noteId);
  });

  it('detects already_curated when the note already exists in curated', () => {
    const runtime = readSkillNotesFile(path.join(runtimeDir, 's1.notes.json'));
    const noteId = runtime.notes[0].id;
    // First promotion succeeds.
    expect(promoteSkillNote('s1', noteId, { runtimeDir, curatedDir }).ok).toBe(true);
    // Re-add same note id back into runtime (simulating a regenerated emission)
    // and verify the second promote sees it as already curated.
    const restored = readSkillNotesFile(path.join(runtimeDir, 's1.notes.json'));
    restored.notes.push({
      id: noteId,
      failureCategory: 'misdiagnosis_vsync_vrr',
      evidenceSummary: 'sample',
      candidateKeywords: [],
      candidateConstraints: '',
      candidateCriticalTools: [],
      createdAt: 0,
      cooldownUntil: 0,
      byteSize: 0,
    });
    fs.writeFileSync(path.join(runtimeDir, 's1.notes.json'), JSON.stringify(restored, null, 2));
    const second = promoteSkillNote('s1', noteId, { runtimeDir, curatedDir });
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('already_curated');
  });
});
