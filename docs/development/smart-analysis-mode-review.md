# Smart Analysis Mode Review

Date: 2026-05-24

Source contract: `docs/development/smart-analysis-mode-plan.md`

## Scope

This review checks the plan against the current repository state before feature
implementation. It intentionally treats Smart Analysis Mode as a new preset on
top of the existing Scene Story pipeline, not as a rewrite of the single-scene
classifier or the existing `/scene-reconstruct` product surface.

## Review 1: Architecture And Boundaries

Findings:

1. The existing `/scene-reconstruct` path is already the right execution core:
   `SceneStoryService` runs Stage 1 `scene_reconstruction`, Stage 2
   per-interval jobs, Stage 3 summary, and Stage 4 `SceneReport` persistence.
   Smart Mode should extend this path through a route profile, not fork the
   scene extraction model.
2. Current Stage 2 routing is still legacy-only. `domainManifest.ts` has
   `startup_scene` and `non_startup_scene`; the second route maps scroll plus
   interaction to `scrolling_analysis`. Smart Mode needs a distinct `smart`
   route profile with six route classes: startup, scroll, click, navigation,
   ANR, and device state.
3. `SceneReconstructionRouteRule` currently has no `routeProfile`. Adding
   profile filtering at `getSceneReconstructionRoutes()` and
   `buildAnalysisIntervals()` is the correct source-of-truth boundary. The
   default profile must remain `legacy` so `/scene-reconstruct` is unchanged.
4. `strategyLoader.ts` currently registers every `*.strategy.md` as a normal
   scene strategy. Adding `backend/strategies/smart.strategy.md` without
   `strategy_kind: contract_only` handling would leak `smart` into classifier
   and prompt injection. The loader must retain the final report contract while
   excluding contract-only strategies from registered scenes and normal
   strategy content lookup.
5. The repository already has `backend/skills/atomic/device_state_snapshot`.
   The plan asks for `backend/skills/composite/device_state_snapshot.skill.yaml`.
   We cannot have two skills with the same name. The correct implementation is
   to migrate/replace the atomic skill with a composite skill at the same skill
   id, or rename the old atomic helper only if the skill registry supports that
   without breaking existing callers.
6. Smart Mode belongs behind `/api/agent/v1/analyze` with `query: "/smart"` and
   `options.preset: "smart"`. The dispatch must happen after request
   validation but before normal agent strategy execution. It must reject
   comparison and follow-up run paths.

Risks:

- If route profiles are optional at too many call sites, smart routes can leak
  into legacy scene reconstruction.
- If `smart.strategy.md` is registered as a normal strategy, a regular natural
  language query could be classified as `smart` by keyword or priority.
- If device-state is added as a second skill id collision, skill validation or
  runtime lookup can become non-deterministic.

## Review 2: Runtime, SSE, Cache, Cancel

Findings:

1. `SceneStoryService.start()` currently returns `Promise<void>`. Smart Mode
   needs the final `SceneReport` as a barrier so the smart orchestrator can
   build the chat report, HTML report, and terminal `analysis_completed`
   payload. The service should return the report for fresh, cached, and empty
   Stage 2 paths.
2. Current `SceneReportStore` caches file-backed reports by `traceHash` only.
   Smart and legacy must share the same `report.traceHash` value while using
   different lookup keys. The profile must be stored in the index entry/key, not
   in the persisted `SceneReport` JSON.
3. Current external-RPC memory cache is keyed by `traceId` only. It must become
   profile-aware to avoid returning a legacy report to smart mode or the reverse.
4. Current in-flight dedupe uses `hash + owner`. It must include profile,
   otherwise a smart request can await a legacy run already in progress.
5. `SceneAnalysisJobRunner` only persists `displayResults` and leaves
   `dataEnvelopes` empty. Smart needs bounded `SceneJobProjection` objects and,
   when needed, full envelopes stored out-of-band. The runner's executor result
   type must carry enough raw result data to build these projections.
6. Cancellation currently exists at two unrelated layers: agent cancel marks a
   main session failed, and scene-story cancel cancels a scene session runner.
   Smart Mode has a parent agent session plus nested scene-story execution, so
   it needs an explicit bridge from parent session id to child scene-story
   session id and a terminal latch to stop late terminal events.
7. `SceneStoryService.cancel()` only works after a Stage 2 runner exists. Smart
   cancellation must also be checked before Stage 1, between Stage 1 and Stage 2,
   before Stage 3, and before finalization.
8. SQL concurrency is intentionally global today; `SceneAnalysisJobRunner`
   comments reject per-trace locking for legacy behavior. The smart-only SQL
   semaphore must be opt-in and no-op for legacy. Wrapping the whole skill
   execution is simpler but reduces smart Stage 2 parallelism; this tradeoff
   should be explicit in the implementation.

Risks:

- Cache isolation is the easiest place to ship a subtle cross-mode correctness
  bug.
- Parent cancel can otherwise close the chat SSE while nested smart work keeps
  spending tokens or SQL time.
- Persisting full job result envelopes inside `SceneReport` would bloat cached
  reports and the Story Sidebar response.

## Review 3: Product Surfaces And Verification

Findings:

1. Product surfaces remain separate: chat bubble, HTML report, CLI/E2E
   artifact, Story Sidebar timeline, and snapshots. The plan explicitly says
   Smart Mode must skip `AnalysisResultSnapshot` persistence for now.
2. `verifyAgentSseScrolling.ts` currently accepts only `fast`, `full`, and
   `auto` for `--mode`. The design's sample command `--mode smart` does not
   match current code. The E2E script should either gain a smart preset flag or
   accept `--preset smart` while keeping `analysisMode` values unchanged.
3. Frontend `/scene` is delegated to `StoryController`. Smart should not reuse
   that command path directly because the design requires main chat plus Story
   Sidebar dual projection from `/analyze`.
4. `StoryPanelState.analysisId` exists but the current `/scene` flow does not
   set it after `StoryController.start()` receives the backend analysis id.
   Smart implementation should not depend on that existing gap; if it adds
   Story Sidebar cancellation/status, it should thread ids explicitly.
5. Generated frontend contract files must be regenerated through the existing
   generator/update flow, not edited by hand.

Required test additions:

- Analyze option normalization matrix:
  smart accepted, smart plus `referenceTraceId` rejected, smart on
  `/sessions/:sessionId/runs` rejected, unknown options stripped.
- Route profile tests:
  legacy returns current two routes; smart returns six route classes; missing or
  invalid profiles fail at the manifest boundary.
- Interval builder tests:
  legacy skips device state; smart routes screen on/off/idle to
  `device_state_snapshot`, tap to `click_response_analysis`, navigation keys to
  `navigation_analysis`, ANR/jank to `anr_analysis`.
- Cache isolation tests:
  disk `loadByHash` and memory cache do not cross between `legacy` and `smart`.
- Strategy loader tests:
  contract-only `smart` is visible to `getFinalReportContract('smart')` and not
  visible to normal registered scenes or prompt strategy content.
- Smart orchestrator tests:
  cached report path, empty Stage 2 path, cancel path, terminal event latch, and
  main chat event projection.
- Frontend tests:
  smart preset renders only outside comparison mode, sends `/smart` with
  `options.preset: "smart"`, and does not go through normal
  `handleChatMessage()`.

Verification targets:

- `cd backend && npm run typecheck`
- `cd backend && npm run validate:strategies`
- `cd backend && npm run validate:skills`
- `cd backend && npm run test:scene-trace-regression`
- Targeted smart E2E through `verifyAgentSseScrolling.ts` after adding smart
  preset support.
- Frontend dev smoke through `./scripts/start-dev.sh` and browser inspection.
- `./scripts/update-frontend.sh` after frontend plugin changes.
- Final repository gate: `npm run verify:pr`

## Independent Review Status

An independent read-only sub-agent review was started on 2026-05-24. Its
findings must be reconciled into this document before the implementation phase
is considered complete.

Update: the read-only sub-agent exceeded two wait windows and was shut down
without producing findings. Per `AGENTS.md`, this implementation proceeds with
the structured three-pass self-review above plus a required post-diff review
before final verification.
