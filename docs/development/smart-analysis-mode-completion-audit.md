# Smart Analysis Mode Completion Audit

Date: 2026-05-24

Source contract: `docs/development/smart-analysis-mode-plan.md`

## Result

Current local implementation satisfies the v3.1 design contract with one
intentional product extension requested during implementation: Smart analysis
now starts with a selection-gated preview before any high-cost per-scene
deep-dive jobs run.

## Requirement Evidence

| Requirement | Current evidence |
|---|---|
| Three source-grounded reviews before implementation | `docs/development/smart-analysis-mode-review.md` contains architecture, runtime/cache/cancel, and product/verification reviews. |
| TODO written before execution | `docs/development/smart-analysis-mode-todo.md` tracks phases 0-5 and deferred non-goals. |
| Smart preset in main AI panel | `perfetto/ui/src/plugins/com.smartperfetto.AIAssistant/types.ts` adds `isSmart`; `ai_panel.ts` renders and handles `/smart`. |
| Smart disabled in comparison mode | `COMPARISON_PRESET_QUESTIONS` omits Smart; `handleSmartAnalysisCommand()` rejects when `referenceTraceId` is set. |
| Smart defaults to scene preview before deep analysis | `normalizeAnalyzeOptions.ts` defaults `smartAction` to `preview`; `SceneStoryService.start()` supports `previewOnly`; Smart preview E2E passed. |
| User can select all, scene types, or scene ids | `SceneAnalysisSelection` and `smartSelection` support `all`, `scene_types`, and `scene_ids`; selected-scope E2E passed for `cold_start`. |
| Route profiles isolate legacy and smart behavior | `domainManifest.ts` requires `routeProfile`; `buildAnalysisIntervals()` filters by profile; targeted tests and 6-trace regression passed. |
| Six Smart route classes exist | Smart routes cover startup, scroll, click, navigation, ANR/jank, and device state. |
| `device_state_snapshot` composite skill exists | Atomic skill was replaced by `backend/skills/composite/device_state_snapshot.skill.yaml`; skill validation passed. |
| Smart cache does not cross legacy or selected scopes | store/memory cache include profile; selected-scope reports bypass hash index replacement while remaining loadable by report id. |
| Stage 2 Smart SQL is gated without changing legacy | Smart runner passes `runWithSmartTraceSqlSemaphore()` only when `routeProfile === 'smart'`; legacy uses default runner concurrency. |
| Smart cancellation spans stages and prevents late terminal events | `SmartCancelBridge` supplies abort checks and terminal claims; `agentRoutes.ts` cancel endpoint fires the bridge. |
| Main chat finalization is shared | `finalizeAgentDrivenSession.ts` is used by normal agent completion and Smart completion. |
| Smart report contract is contract-only | `smart.strategy.md` has `strategy_kind: contract_only`; strategy loader excludes it from normal scene registration while exposing the contract. |
| Smart chat/report uses `metadata.sceneId='smart'` | `buildSmartChatReport.ts` and preview report builder set the Smart conclusion contract metadata. |
| Heavy Smart job payloads are projected | `SceneJobProjection` caps samples at 50KB; focused runner test verifies the bound. |
| Omitted Smart job rows keep full artifact evidence | `SceneAnalysisJobRunner` captures `dataEnvelopes`; `SceneJobArtifactStore` saves full rows and envelopes before report sanitization. |
| Smart skips snapshot persistence in v1 | Smart completion uses report artifact finalization, while snapshot integration remains deferred by design. |
| Frontend dual projection works | Browser smoke loaded `lacunh_heavy.pftrace`, clicked Smart, and observed preview report plus range-selection buttons in main panel and Story panel. |
| Generated frontend assets are refreshed | `./scripts/update-frontend.sh` generated `frontend/v55.2-934b4662a`; `npm run check:frontend-prebuild` passed. |

## Verification Evidence

- Targeted Jest suites passed for route profiles, interval selection, Smart
  service preview/selection, report store/cache, strategy loader, option
  normalization, and job projection/envelope capture.
- `cd backend && npm run typecheck` passed after the final envelope-capture fix.
- Smart preview SSE E2E passed on `test-traces/lacunh_heavy.pftrace`.
- Smart selected-scope SSE E2E passed on `test-traces/lacunh_heavy.pftrace`
  with `--smart-scope scene_types --smart-scene-type cold_start`.
- Earlier Smart analyze-all SSE E2E passed with claim verifier status `passed`.
- Final repository gate passed: `npm run verify:pr`.

## Deferred By Design

- No multi-scene sceneClassifier rewrite.
- No comparison plus Smart mode.
- No CLI `smp ask` Smart mode.
- No multi-trace Smart comparison.
- No Smart `AnalysisResultSnapshot` persistence until schema is extended.
- Dedicated true mixed-action fixture recording remains future fixture work; the
  current local E2E uses canonical traces plus selected-scope Smart verification.
