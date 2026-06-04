// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { describe, it, expect } from '@jest/globals';
import {
  FAILURE_CATEGORIES,
  FAILURE_CATEGORY_DESCRIPTIONS,
  computeFailureModeHash,
  inferCategoryFromText,
  isKnownCategory,
  type FailureCategory,
} from '../failureTaxonomy';

describe('failureTaxonomy', () => {
  describe('FAILURE_CATEGORIES', () => {
    it('exposes the canonical 8 categories', () => {
      expect(FAILURE_CATEGORIES).toEqual([
        'misdiagnosis_vsync_vrr',
        'misdiagnosis_buffer_stuffing',
        'sql_missing_table',
        'sql_missing_column',
        'skill_empty_result',
        'tool_repeated_failure',
        'phase_missing_deep_drill',
        'unknown',
      ]);
    });

    it('has a description for every category', () => {
      for (const category of FAILURE_CATEGORIES) {
        expect(FAILURE_CATEGORY_DESCRIPTIONS[category]).toBeTruthy();
        expect(typeof FAILURE_CATEGORY_DESCRIPTIONS[category]).toBe('string');
      }
    });
  });

  describe('isKnownCategory', () => {
    it('accepts every defined category', () => {
      for (const category of FAILURE_CATEGORIES) {
        expect(isKnownCategory(category)).toBe(true);
      }
    });

    it('rejects unknown strings and non-strings', () => {
      expect(isKnownCategory('arbitrary_thing')).toBe(false);
      expect(isKnownCategory('')).toBe(false);
      expect(isKnownCategory(null)).toBe(false);
      expect(isKnownCategory(undefined)).toBe(false);
      expect(isKnownCategory(42)).toBe(false);
      expect(isKnownCategory({})).toBe(false);
    });
  });

  describe('computeFailureModeHash', () => {
    const baseInput = {
      sceneType: 'scrolling',
      archType: 'FLUTTER',
      category: 'misdiagnosis_vsync_vrr' as FailureCategory,
    };

    it('returns a 16-char hex string', () => {
      const hash = computeFailureModeHash(baseInput);
      expect(hash).toMatch(/^[a-f0-9]{16}$/);
    });

    it('is deterministic for the same input', () => {
      const a = computeFailureModeHash(baseInput);
      const b = computeFailureModeHash(baseInput);
      expect(a).toBe(b);
    });

    it('normalizes case (sceneType lower, archType upper)', () => {
      const lowered = computeFailureModeHash({ ...baseInput, sceneType: 'SCROLLING', archType: 'flutter' });
      const direct = computeFailureModeHash(baseInput);
      expect(lowered).toBe(direct);
    });

    it('treats whitespace consistently', () => {
      expect(computeFailureModeHash({ ...baseInput, sceneType: '  scrolling  ' })).toBe(
        computeFailureModeHash(baseInput),
      );
    });

    it('treats undefined and empty toolOrSkillId / errorClass as identical', () => {
      const empty = computeFailureModeHash({ ...baseInput, toolOrSkillId: '', errorClass: '' });
      const omit = computeFailureModeHash(baseInput);
      expect(empty).toBe(omit);
    });

    it('produces different hashes for different categories', () => {
      const vsync = computeFailureModeHash({ ...baseInput, category: 'misdiagnosis_vsync_vrr' });
      const buffer = computeFailureModeHash({ ...baseInput, category: 'misdiagnosis_buffer_stuffing' });
      expect(vsync).not.toBe(buffer);
    });

    it('produces different hashes for different scene/arch combos', () => {
      const a = computeFailureModeHash({ ...baseInput, sceneType: 'scrolling' });
      const b = computeFailureModeHash({ ...baseInput, sceneType: 'startup' });
      expect(a).not.toBe(b);
    });

    it('produces different hashes when toolOrSkillId differs', () => {
      const a = computeFailureModeHash({ ...baseInput, toolOrSkillId: 'execute_sql' });
      const b = computeFailureModeHash({ ...baseInput, toolOrSkillId: 'invoke_skill' });
      expect(a).not.toBe(b);
    });

    it('differentiates errorClass within the same category', () => {
      const a = computeFailureModeHash({ ...baseInput, errorClass: 'no_such_table' });
      const b = computeFailureModeHash({ ...baseInput, errorClass: 'no_such_column' });
      expect(a).not.toBe(b);
    });
  });

  describe('inferCategoryFromText', () => {
    it.each<[string, FailureCategory]>([
      ['no such table: android_frames', 'sql_missing_table'],
      ['SQL error: no such column "foo" in users', 'sql_missing_column'],
      ['VSync 误判 — 把 VRR 帧时长归为卡顿', 'misdiagnosis_vsync_vrr'],
      ['VRR misdiagnosis on Pixel 7', 'misdiagnosis_vsync_vrr'],
      ['BufferQueue stuffing pattern misclassified', 'misdiagnosis_buffer_stuffing'],
      ['skill returned empty result on this trace', 'skill_empty_result'],
      ['execute_sql repeated failure 3 times', 'tool_repeated_failure'],
      ['连续失败 5 次后放弃', 'tool_repeated_failure'],
      ['phase Phase 2.6 was skipped', 'phase_missing_deep_drill'],
      ['深钻阶段缺失', 'phase_missing_deep_drill'],
    ])('classifies %s as %s', (text, expected) => {
      expect(inferCategoryFromText(text)).toBe(expected);
    });

    it('returns unknown for ambiguous or empty input', () => {
      expect(inferCategoryFromText('')).toBe('unknown');
      expect(inferCategoryFromText(undefined)).toBe('unknown');
      expect(inferCategoryFromText('something happened')).toBe('unknown');
      expect(inferCategoryFromText('the analysis completed successfully')).toBe('unknown');
    });

    it('inferred category is always a known category', () => {
      const samples = [
        '',
        'random text',
        'no such table',
        'system crashed',
        '某个奇怪的错误信息',
      ];
      for (const sample of samples) {
        expect(isKnownCategory(inferCategoryFromText(sample))).toBe(true);
      }
    });
  });
});
