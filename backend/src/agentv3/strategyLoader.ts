// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * Loads external prompt content from `backend/strategies/`:
 *
 * 1. **Scene strategies** (`*.strategy.md`): YAML frontmatter + Markdown body.
 *    Used by `sceneClassifier.ts` for matching and `claudeSystemPrompt.ts` for injection.
 *    Adding a new scene requires only a new `.strategy.md` file, no code changes.
 *
 * 2. **Prompt templates** (`*.template.md`): Markdown with optional `{{variable}}`
 *    placeholders, substituted at runtime by `renderTemplate()`.
 *    Used by `claudeSystemPrompt.ts` for role, methodology, output format,
 *    architecture guidance, and selection context sections.
 *    Adding/editing prompt content requires only template changes, no code changes.
 *
 * Both categories are cached on first load and cleared together via `invalidateStrategyCache()`.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/** Phase-level restatement hint — loaded from strategy frontmatter `phase_hints`. */
export interface PhaseHint {
  id: string;
  keywords: string[];
  constraints: string;
  criticalTools: string[];
  /** When true, this hint is injected as unconditional fallback if keyword matching fails. */
  critical: boolean;
}

/**
 * A single mandatory aspect a plan must touch — sourced from a scene's
 * `plan_template.mandatory_aspects` frontmatter. The submit_plan /
 * revise_plan hard-gate fails when no plan phase mentions any of the
 * `matchKeywords`.
 */
export interface PlanMandatoryAspect {
  /** Stable identifier for diff-friendly tracking (e.g. `frame_jank_analysis`). */
  id: string;
  matchKeywords: string[];
  suggestion: string;
}

/** Plan template loaded from a strategy's `plan_template:` frontmatter. */
export interface PlanTemplate {
  mandatoryAspects: PlanMandatoryAspect[];
}

/**
 * Scene-owned final report contract. Strategies declare these as data so
 * runtime quality gates can enforce scene completeness without adding
 * TypeScript branches for every analysis scenario.
 */
export interface FinalReportContractRequirement {
  id: string;
  label: string;
  description?: string;
  /**
   * Optional JavaScript regex patterns that make a required section conditional.
   * When present, the section is enforced only if the user's query mentions
   * the evidence surface described by these triggers.
   */
  triggerPatterns: string[];
  patterns: string[];
  /** AND-of-OR groups. Each inner group must match at least one pattern. */
  patternGroups: string[][];
  /** Defaults to true. Optional entries document nice-to-have structure. */
  required: boolean;
}

export interface FinalReportContract {
  requiredSections: FinalReportContractRequirement[];
}

export type StrategyKind = 'normal' | 'contract_only';

export interface StrategyDefinition {
  scene: string;
  /** contract_only strategies expose contracts without classifier/prompt injection. */
  strategyKind: StrategyKind;
  priority: number;
  effort: string;
  keywords: string[];
  compoundPatterns: RegExp[];
  /** Capability IDs required for this scene (missing = critical gap) */
  requiredCapabilities: string[];
  /** Capability IDs that enhance analysis but are not required */
  optionalCapabilities: string[];
  /** Phase-level hints for mid-analysis restatement injection. */
  phaseHints: PhaseHint[];
  /**
   * Plan template — mandatory aspects every submitted plan must cover for
   * this scene. `null` (vs. an empty mandatoryAspects array) means the
   * scene has deliberately opted out of plan-template validation.
   */
  planTemplate: PlanTemplate | null;
  /**
   * Data-only contract for final answer completeness. Runtime code must
   * execute this contract generically instead of hardcoding scene checks.
   */
  finalReportContract: FinalReportContract | null;
  content: string;
  /**
   * Absolute path to the source `*.strategy.md` file. Required because the
   * scene id (e.g. `touch_tracking`) is not always the file basename
   * (`touch-tracking.strategy.md`); callers that need the file itself —
   * fingerprinting, hot-reload diffing — must resolve through this field
   * instead of `${scene}.strategy.md`.
   */
  sourcePath: string;
}

const STRATEGIES_DIR = path.resolve(__dirname, '../../strategies');
/** Tolerates leading `<!-- -->` blocks (e.g. SPDX/license headers) before the frontmatter. */
const FRONTMATTER_RE = /^(?:\s*<!--[\s\S]*?-->\s*)*---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
/** In dev mode, skip caching so .strategy.md / .template.md edits take effect without restart. */
const DEV_MODE = process.env.NODE_ENV !== 'production';

let cache: Map<string, StrategyDefinition> | null = null;

function parseStrategyFile(filePath: string): StrategyDefinition | null {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return null;

  const frontmatter = yaml.load(match[1]) as Record<string, unknown>;
  const content = match[2].trim();

  const compoundPatternStrings = (frontmatter.compound_patterns as string[] | undefined) || [];
  const compoundPatterns = compoundPatternStrings.map(p => new RegExp(p, 'i'));

  const rawHints = (frontmatter.phase_hints as Array<Record<string, unknown>> | undefined) || [];
  const phaseHints: PhaseHint[] = rawHints.map(h => ({
    id: (h.id as string) || '',
    keywords: (h.keywords as string[]) || [],
    constraints: (h.constraints as string) || '',
    criticalTools: (h.critical_tools as string[]) || [],
    critical: (h.critical as boolean) ?? false,
  }));

  const rawPlanTemplate = frontmatter.plan_template as Record<string, unknown> | undefined;
  let planTemplate: PlanTemplate | null = null;
  if (rawPlanTemplate) {
    const aspects = (rawPlanTemplate.mandatory_aspects as Array<Record<string, unknown>> | undefined) || [];
    planTemplate = {
      mandatoryAspects: aspects.map(a => ({
        id: (a.id as string) || '',
        matchKeywords: (a.match_keywords as string[]) || [],
        suggestion: (a.suggestion as string) || '',
      })),
    };
  }

  const rawFinalReportContract = frontmatter.final_report_contract as Record<string, unknown> | undefined;
  let finalReportContract: FinalReportContract | null = null;
  if (rawFinalReportContract) {
    const requiredSections = (
      rawFinalReportContract.required_sections as Array<Record<string, unknown>> | undefined
    ) || [];
    finalReportContract = {
      requiredSections: requiredSections
        .map(section => {
          const patterns = (section.patterns as string[]) || [];
          const triggerPatterns = (section.trigger_patterns as string[]) || [];
          const patternGroups = Array.isArray(section.pattern_groups)
            ? (section.pattern_groups as unknown[])
              .filter(group => Array.isArray(group))
              .map(group => (group as unknown[]).filter(item => typeof item === 'string') as string[])
              .filter(group => group.length > 0)
            : [];
          return {
            id: (section.id as string) || '',
            label: (section.label as string) || (section.id as string) || '',
            description: (section.description as string | undefined) || undefined,
            triggerPatterns,
            patterns,
            patternGroups,
            required: (section.required as boolean | undefined) ?? true,
          };
        })
        .filter(section => section.id && section.label && (
          section.patterns.length > 0 || section.patternGroups.length > 0
        )),
    };
  }

  const rawStrategyKind = frontmatter.strategy_kind as string | undefined;
  const strategyKind: StrategyKind = rawStrategyKind === 'contract_only'
    ? 'contract_only'
    : 'normal';

  return {
    scene: frontmatter.scene as string,
    strategyKind,
    priority: (frontmatter.priority as number) ?? 99,
    effort: (frontmatter.effort as string) ?? 'high',
    keywords: (frontmatter.keywords as string[]) || [],
    compoundPatterns,
    requiredCapabilities: (frontmatter.required_capabilities as string[]) || [],
    optionalCapabilities: (frontmatter.optional_capabilities as string[]) || [],
    phaseHints,
    planTemplate,
    finalReportContract,
    content,
    sourcePath: filePath,
  };
}

export function loadStrategies(): Map<string, StrategyDefinition> {
  if (cache && !DEV_MODE) return cache;

  cache = new Map();
  const files = fs.readdirSync(STRATEGIES_DIR)
    .filter(f => f.endsWith('.strategy.md'));

  for (const file of files) {
    const def = parseStrategyFile(path.join(STRATEGIES_DIR, file));
    if (def) {
      cache.set(def.scene, def);
    }
  }

  return cache;
}

export function getStrategyContent(scene: string): string | undefined {
  const def = loadStrategies().get(scene);
  return def?.strategyKind === 'contract_only' ? undefined : def?.content;
}

export function getRegisteredScenes(): StrategyDefinition[] {
  return Array.from(loadStrategies().values())
    .filter(def => def.strategyKind !== 'contract_only');
}

/** Get phase-level restatement hints for a scene. Returns [] if scene has no hints. */
export function getPhaseHints(scene: string): PhaseHint[] {
  const def = loadStrategies().get(scene);
  if (def?.strategyKind === 'contract_only') return [];
  return def?.phaseHints || [];
}

/**
 * Get the plan template for a scene loaded from `plan_template:`
 * frontmatter. Returns `null` for unknown scenes and for scenes that
 * deliberately opted out (no `plan_template` block in their frontmatter).
 *
 * Phase 2.1 of v2.1 — strategies migrated to frontmatter take priority
 * over the legacy hardcoded `SCENE_PLAN_TEMPLATES` map; the legacy map
 * remains as a fallback in `scenePlanTemplates.ts` until every strategy
 * has migrated.
 */
export function getPlanTemplate(scene: string): PlanTemplate | null {
  const def = loadStrategies().get(scene);
  if (def?.strategyKind === 'contract_only') return null;
  return def?.planTemplate ?? null;
}

/**
 * Get the scene-owned final report completeness contract. Returns null for
 * scenes that have no declarative contract yet.
 */
export function getFinalReportContract(scene: string): FinalReportContract | null {
  return loadStrategies().get(scene)?.finalReportContract ?? null;
}

/**
 * Resolve the absolute path of the `*.strategy.md` file backing a scene.
 * Returns `undefined` for unknown scenes. Use this instead of `${scene}.strategy.md`
 * — file basenames may use hyphens (`touch-tracking.strategy.md`) where
 * the scene id uses underscores (`touch_tracking`).
 */
export function getStrategyFilePath(scene: string): string | undefined {
  return loadStrategies().get(scene)?.sourcePath;
}

/** Clear cached strategies and templates — useful for dev/test reloads. */
export function invalidateStrategyCache(): void {
  cache = null;
  templateCache.clear();
}

// ---------------------------------------------------------------------------
// Prompt & selection context templates ({{variable}} substitution)
// ---------------------------------------------------------------------------

const templateCache = new Map<string, string>();

/**
 * Load a prompt template from `backend/strategies/<name>.template.md`.
 * Templates use `{{variable}}` placeholders that callers substitute at runtime via `renderTemplate()`.
 * Static templates (no variables) can be used directly as-is.
 *
 * Results are cached in `templateCache` and cleared by `invalidateStrategyCache()`.
 */
export function loadPromptTemplate(name: string): string | undefined {
  if (templateCache.has(name) && !DEV_MODE) return templateCache.get(name);

  const filePath = path.join(STRATEGIES_DIR, `${name}.template.md`);
  if (!fs.existsSync(filePath)) return undefined;

  const content = fs.readFileSync(filePath, 'utf-8').trim();
  templateCache.set(name, content);
  return content;
}

/**
 * Load a selection context template from `backend/strategies/selection-<kind>.template.md`.
 * Delegates to `loadPromptTemplate()` with the `selection-` prefix.
 */
export function loadSelectionTemplate(kind: string): string | undefined {
  return loadPromptTemplate(`selection-${kind}`);
}

/**
 * Substitute `{{key}}` placeholders in a template string with provided values.
 */
export function renderTemplate(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}
