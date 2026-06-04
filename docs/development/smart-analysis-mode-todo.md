# Smart Analysis Mode TODO

Date: 2026-05-24

Implementation is authorized by the maintainer in this session. This TODO
tracks the work needed to ship the feature described in
`docs/development/smart-analysis-mode-plan.md`.

## Phase 0: Zero-Behavior Infrastructure

- [x] Add `routeProfile: 'legacy' | 'smart'` to scene reconstruction route
  rules and enforce profile filtering in `domainManifest.ts`.
- [x] Keep `/scene-reconstruct` defaulting to `legacy`.
- [x] Add smart route rules for startup, scroll, click, navigation, ANR, and
  device state.
- [x] Add `device_state` scene type group and route screen on/off/sleep/unlock
  plus idle scenes.
- [x] Thread route profile through `buildAnalysisIntervals()` and
  `SceneStoryService.start()`.
- [x] Make `SceneReportStore` disk hash lookup profile-aware without adding
  `routeProfile` to `SceneReport`.
- [x] Make `SceneReportMemoryCache` and in-flight pending dedupe profile-aware.
- [x] Add smart-only SQL semaphore hook with no legacy behavior change.
- [x] Extract reusable completed-analysis finalization helper so normal
  `/analyze` and Smart Mode share report/SSE terminal behavior.
- [x] Add PR-A tests for route profile, cache isolation, and unchanged legacy
  behavior.

## Phase 1: Smart Backend Entry And Routing

- [x] Add `normalizeAnalyzeOptions.ts` to whitelist analyze options and reject
  unsupported smart combinations.
- [x] Reject smart plus `referenceTraceId`.
- [x] Reject smart on `/api/agent/v1/sessions/:sessionId/runs`.
- [x] Add Smart orchestration for `/smart` dispatch.
  - Implemented as the `runSmartAnalysis()` route-level orchestrator rather
    than a separate file, so it can reuse existing session/run finalization
    ownership without introducing another session abstraction.
- [x] Create a parent-to-child smart cancellation bridge.
- [x] Make `SceneStoryService` check cancellation before Stage 1, Stage 2,
  Stage 3, and finalization.
- [x] Return the final `SceneReport` from `SceneStoryService.start()` for fresh,
  cached, and empty runs.
- [x] Convert `device_state_snapshot` into the required composite skill while
  preserving the same skill id.

## Phase 2: Smart Output Contract

- [x] Add `backend/strategies/smart.strategy.md` with
  `strategy_kind: contract_only`.
- [x] Update `strategyLoader.ts` so contract-only strategies are excluded from
  normal classification and prompt injection but still expose final report
  contracts.
- [x] Add `SceneJobProjection` and keep persisted smart job payloads under the
  size cap.
- [x] Store full smart job envelopes out-of-band when a projection omits rows.
  - Stage 2 Smart jobs now capture `dataEnvelopes` before report sanitization,
    and omitted-row artifacts keep both full `displayResults` and envelopes.
- [x] Add `buildSmartChatReport.ts` to produce a readable main chat report from
  projected scene jobs.
- [x] Build smart `AgentRuntimeAnalysisResult` with
  `conclusionContract.metadata.sceneId = 'smart'`.
- [x] Generate HTML report through the shared finalization path.
- [x] Skip `AnalysisResultSnapshot` persistence for smart until the schema is
  ready.

## Phase 3: Frontend

- [x] Add the Smart preset button next to Story/scene presets in the main panel.
- [x] Intercept `/smart` and the Smart preset before `handleChatMessage()`.
- [x] POST `/api/agent/v1/analyze` with `{ query: '/smart', options: { preset:
  'smart', analysisMode } }`.
- [x] Disable or reject Smart while comparison mode is active.
- [x] Wire smart progress into the main chat and Story Sidebar dual projection.
- [x] Add a smart chat renderer if needed for structured smart payloads.
  - No new renderer was needed: Smart Mode emits markdown through the existing
    main chat renderer and uses Story Sidebar events for the structured
    projection.
- [x] Regenerate frontend types and prebuilt frontend assets through project
  scripts.

## Phase 4: E2E And Gates

- [x] Extend `verifyAgentSseScrolling.ts` to support Smart Mode without
  overloading `analysisMode`.
- [x] Add smart E2E fixture output under `backend/test-output/` only if the
  repository convention allows it; otherwise keep generated output untracked.
- [x] Run targeted backend tests for normalization, route profile, cache,
  smart orchestration, and strategy loader.
- [x] Run `cd backend && npm run typecheck`.
- [x] Run `cd backend && npm run validate:strategies`.
- [x] Run `cd backend && npm run validate:skills`.
- [x] Run `cd backend && npm run test:scene-trace-regression`.
- [x] Run frontend browser smoke after `./scripts/start-dev.sh`.
- [x] Run `./scripts/update-frontend.sh`.
- [x] Run final `npm run verify:pr` before opening or landing a PR.

## Phase 5: Selection-Gated Smart Flow

- [x] Make Smart preset default to a preview pass that reconstructs and lists
  scenes without running every deep-dive job.
- [x] Add `smartAction: 'preview' | 'analyze'` and
  `smartSelection` option validation for all-scene, scene-type, and scene-id
  scopes.
- [x] Emit `scene_story_selection_ready` after scene reconstruction so the UI can
  show range choices.
- [x] Let selected-scope Smart runs bypass hash cache replacement while still
  remaining report-id addressable.
- [x] Add main-panel and Story-panel buttons for `全部`, `启动`, `滑动`, `点击`,
  `导航`, `设备`, and `ANR` based on detected scene groups.
- [x] Add Smart preview E2E coverage and keep CLI Smart E2E defaulting to
  all-scene analyze for regression compatibility.
- [x] Add Smart selected-scope E2E coverage for scene-type filtering.
- [x] Browser-smoke the new preview flow: clicking Smart shows
  `智能分析报告：场景盘点` and the range-selection buttons before deep analysis.

## Deferred By Design

- [ ] No multi-scene classifier rewrite.
- [ ] No comparison plus smart mode.
- [ ] No `smp ask` smart mode.
- [ ] No multi-trace smart comparison.
- [ ] No smart `AnalysisResultSnapshot` persistence until the snapshot schema is
  extended.
