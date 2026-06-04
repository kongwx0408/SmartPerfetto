// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import { describe, it, expect } from '@jest/globals';
import { PromptTemplateService } from '../promptTemplateService';

describe('PromptTemplateService', () => {
  const service = PromptTemplateService.getInstance();

  it('enforces evidence and uncertainty contract in analysis summary template', () => {
    const prompt = service.formatTemplate('analysis-summary', {
      question: 'Why is startup slow?',
      context: 'context',
      schema: 'schema',
    });

    expect(prompt).toContain('table[field]=value');
    expect(prompt).toContain('unable_to_determine');
    expect(prompt).toContain('Missing Data');
    expect(prompt).toContain('Action Items (owner, priority: P0/P1/P2');
    expect(service.getTemperature('analysis-summary')).toBe(0.2);
  });
});
