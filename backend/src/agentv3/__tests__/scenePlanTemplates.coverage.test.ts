// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * Regression: a hyphen-form key (`'touch-tracking'`) silently disabled
 * the submit_plan hard-gate because strategy frontmatter declares the
 * scene with an underscore (`scene: touch_tracking`). This suite locks
 * down key shape and 12-scene coverage so the bug pattern can't return.
 */

import { describe, it, expect } from '@jest/globals';
import {
  getScenePlanTemplate,
  listScenePlanTemplateKeys,
  SCENES_WITHOUT_PLAN_TEMPLATE,
} from '../scenePlanTemplates';
import { getRegisteredScenes } from '../strategyLoader';

describe('SCENE_PLAN_TEMPLATES coverage', () => {
  it('uses no hyphen-form scene keys (regression: touch-tracking)', () => {
    for (const key of listScenePlanTemplateKeys()) {
      expect(key).not.toMatch(/-/);
    }
  });

  it('every template key matches a registered strategy scene id', () => {
    const registered = new Set(getRegisteredScenes().map(s => s.scene));
    const keys = listScenePlanTemplateKeys();
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(registered.has(key)).toBe(true);
    }
  });

  it('covers every registered scene (template OR explicit opt-out)', () => {
    const registered = getRegisteredScenes().map(s => s.scene);
    expect(registered.length).toBeGreaterThan(0);

    const templateKeys = new Set(listScenePlanTemplateKeys());
    const uncovered = registered.filter(
      s => !templateKeys.has(s) && !SCENES_WITHOUT_PLAN_TEMPLATE.has(s),
    );
    expect(uncovered).toEqual([]);
  });

  it('template keys and opt-out set are disjoint', () => {
    for (const key of listScenePlanTemplateKeys()) {
      expect(SCENES_WITHOUT_PLAN_TEMPLATE.has(key)).toBe(false);
    }
  });

  it('every mandatory aspect declares non-empty matchKeywords and suggestion', () => {
    for (const key of listScenePlanTemplateKeys()) {
      const template = getScenePlanTemplate(key)!;
      for (const aspect of template.mandatoryAspects) {
        expect(aspect.matchKeywords.length).toBeGreaterThan(0);
        expect(aspect.suggestion.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('getScenePlanTemplate resolves opt-out scenes to undefined', () => {
    for (const scene of SCENES_WITHOUT_PLAN_TEMPLATE) {
      expect(getScenePlanTemplate(scene)).toBeUndefined();
    }
  });

  it('getScenePlanTemplate resolves a known compound-name scene (touch_tracking)', () => {
    expect(getScenePlanTemplate('touch_tracking')).toBeDefined();
    expect(getScenePlanTemplate('touch-tracking')).toBeUndefined();
  });
});
