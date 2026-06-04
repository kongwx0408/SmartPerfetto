# Runtime Engine Contract Implementation TODO

Status: active
Created: 2026-05-31
Last updated: 2026-06-02 19:42:58 CST
Source of truth: `README.md`, `review-rounds.md`, this file, `progress.md`,
`decision-log.md`, and `verification-log.md`.

## Operating Rules

- Resume rule: before choosing work, read `README.md`, `review-rounds.md`,
  this file, `progress.md`, `decision-log.md`, and `verification-log.md`.
- Direction: Pi-ready, not Pi-driven.
- Public runtime scope stays `claude-agent-sdk` and `openai-agents-sdk` until
  M10.
- Early phases must not add a production Pi dependency, expose Pi runtime env
  values, modify Provider Manager UI, or change user-facing runtime options.
- Every milestone must finish with focused Jest coverage plus the verification
  listed below, an E2E or trace-regression level behavior check for runtime
  behavior, a post-diff self-check, and updates to all four driver logs.
- Do not advance past a failed gate. Fix or explicitly record a maintainer
  decision/blocker.

## Global Post-Diff Self-Check

Run after each milestone and record the result in `verification-log.md`:

- Architecture still matches `README.md` Draft v2.
- Provider Manager/runtime provider pinning semantics are preserved.
- No prompt, tool list, scene list, Skill count, or output contract is
  hardcoded in TypeScript.
- Public `IOrchestrator`, `StreamingUpdate`, report, CLI, snapshot, and SSE
  contracts are unchanged unless the milestone explicitly says otherwise.
- No unplanned Pi production dependency, public env value, packaging exposure,
  or Provider Manager UI change has been introduced.
- Rollback path remains clear and scoped to the milestone.

## M1 - Characterization / Inventory Tests

Status: completed

Goal:
- Lock current behavior before runtime refactors. No production runtime
  behavior should change.

Modify files:
- `backend/src/agentRuntime/__tests__/runtimeSelection.test.ts`
- `backend/src/assistant/application/__tests__/agentAnalyzeSessionService.test.ts`
- `backend/src/agentv3/__tests__/mcpToolRegistry.test.ts`
- `backend/src/agentOpenAI/__tests__/openAiToolAdapter.test.ts`
- `backend/src/agentv3/__tests__/standaloneMcpServer.test.ts`
- `backend/src/assistant/stream/__tests__/streamProjector.contract.test.ts`
- new `backend/src/agentRuntime/__tests__/orchestratorContractInventory.test.ts`
- new `backend/src/agentRuntime/__tests__/streamingUpdateInventory.test.ts`
- new `backend/src/agentRuntime/__tests__/snapshotRuntimeStateInventory.test.ts`
- Possibly source-only type exports if tests reveal hidden contracts, but avoid
  behavior changes.

Checklist:
- [x] Inventory every consumed `IOrchestrator` hook, including EventEmitter,
  session/provider, snapshot, report, intervention, architecture cache, and any
  current route-only optional hooks.
- [x] Add runtime selection matrix tests for provider override, snapshot
  override, env fallback, invalid env, and default runtime.
- [x] Add Provider Manager/session pinning coverage for missing explicit
  provider and provider snapshot mismatch behavior.
- [x] Add `StreamingUpdate.type` inventory coverage for public SSE/CLI event
  names.
- [x] Add `SessionStateSnapshot` inventory coverage for current Claude/OpenAI
  state fields.
- [x] Add tool registry/adapters parity coverage for names, exposure filtering,
  code-aware gating, and OpenAI schema conversion.

Risks:
- Characterization tests may overfit implementation details instead of public
  contracts.
- Existing tests may expose stale assumptions or missing optional fixture skips.
- Runtime/provider/session files imply scene regression even if production
  behavior is unchanged.

Verification commands:
```bash
cd backend && npx jest \
  src/agentRuntime/__tests__/runtimeSelection.test.ts \
  src/assistant/application/__tests__/agentAnalyzeSessionService.test.ts \
  src/agentv3/__tests__/mcpToolRegistry.test.ts \
  src/agentOpenAI/__tests__/openAiToolAdapter.test.ts \
  src/agentv3/__tests__/standaloneMcpServer.test.ts \
  src/assistant/stream/__tests__/streamProjector.contract.test.ts \
  src/agentRuntime/__tests__/orchestratorContractInventory.test.ts \
  src/agentRuntime/__tests__/streamingUpdateInventory.test.ts \
  src/agentRuntime/__tests__/snapshotRuntimeStateInventory.test.ts

cd backend && npx tsc --noEmit
cd backend && npm run test:scene-trace-regression
```

E2E or behavior verification:
- Scene trace regression is the runtime-level behavior gate.
- Confirm no production code path changed except any type-only exports needed
  for tests.

Rollback:
- Remove newly added characterization tests or adjust them if they encode the
  wrong contract. No product rollback expected.

Completion evidence:
- [x] Focused Jest pass logged in `verification-log.md`.
- [x] `npx tsc --noEmit` pass logged.
- [x] Scene trace regression pass logged.
- [x] Post-diff self-check logged.
- [x] `progress.md`, `decision-log.md`, `verification-log.md`, and
  `review-rounds.md` updated.

## M2 - Shared Tool Body And SDK-Native Adapters

Status: completed

Goal:
- Make SmartPerfetto tool definitions SDK-neutral while preserving SDK-native
  invocation.

Modify files:
- `backend/src/agentv3/claudeMcpServer.ts`
- `backend/src/agentv3/mcpToolRegistry.ts`
- `backend/src/agentOpenAI/openAiToolAdapter.ts`
- `backend/src/agentv3/standaloneMcpServer.ts`
- `backend/src/agentv3/__tests__/mcpToolRegistry.test.ts`
- `backend/src/agentOpenAI/__tests__/openAiToolAdapter.test.ts`
- `backend/src/agentv3/__tests__/standaloneMcpServer.test.ts`
- new `backend/src/agentRuntime/runtimeToolSpec.ts`
- new `backend/src/agentRuntime/__tests__/runtimeToolSpec.test.ts`

Checklist:
- [x] Introduce shared tool spec with canonical Zod raw shape and handler
  semantics.
- [x] Expose shared specs from `McpToolRegistry` without breaking existing
  Claude descriptor consumers during migration.
- [x] Build Claude SDK descriptors from shared specs.
- [x] Build OpenAI function tools from shared specs, preserving JSON schema
  sanitization and argument normalization.
- [x] Build standalone MCP descriptors from shared specs, preserving public vs
  internal filtering.
- [x] Add fake third-party adapter coverage that consumes shared specs without
  a production runtime value.

Risks:
- Tool exposure or code-aware gating could widen accidentally.
- OpenAI JSON schema conversion or argument parsing could drift.
- Standalone MCP could expose internal-only tools if filtering moves.

Verification commands:
```bash
cd backend && npx jest \
  src/agentRuntime/__tests__/runtimeToolSpec.test.ts \
  src/agentv3/__tests__/mcpToolRegistry.test.ts \
  src/agentOpenAI/__tests__/openAiToolAdapter.test.ts \
  src/agentv3/__tests__/standaloneMcpServer.test.ts

cd backend && npx tsc --noEmit
cd backend && npm run test:scene-trace-regression
```

E2E or behavior verification:
- Scene trace regression proves runtime/tool behavior still works through the
  existing Claude/OpenAI product path.

Rollback:
- Keep or restore the previous Claude descriptor source path and remove the
  shared spec bridge.

Completion evidence:
- [x] Focused Jest pass logged.
- [x] Typecheck pass logged.
- [x] Scene trace regression pass logged.
- [x] Tool exposure parity summarized in `verification-log.md`.
- [x] Driver logs and `review-rounds.md` updated.

## M3 - AnalysisRunSpec Shadow Mode

Status: completed

Goal:
- Extract shared request preparation into a shadow `AnalysisRunSpec` without
  switching Claude/OpenAI runtime loops.

Modify files:
- `backend/src/agentRuntime/runtimeCommon.ts`
- `backend/src/agentv3/claudeRuntime.ts`
- `backend/src/agentOpenAI/openAiRuntime.ts`
- `backend/src/agentRuntime/runtimeSelection.ts`
- new `backend/src/agentRuntime/analysisRunSpec.ts`
- new `backend/src/agentRuntime/__tests__/analysisRunSpec.test.ts`

Checklist:
- [x] Define `AnalysisRunSpec` for session/trace ids, provider and knowledge
  scope, output language, analysis mode, trace/selection context, tool scope,
  provider/runtime snapshot, continuation policy, timeout, and budget inputs.
- [x] Reuse `runtimeCommon.ts` helpers instead of duplicating shared logic.
- [x] Preserve Claude/OpenAI classifier differences.
- [x] Add tests comparing shadow spec fields against existing runtime inputs.
- [x] Keep route, CLI, report, and snapshot surfaces unchanged.

Risks:
- Shadow code can drift if it is not compared to real runtime inputs.
- Prematurely unifying classifiers would change behavior.
- Shared setup may accidentally bypass provider/runtime pinning.

Verification commands:
```bash
cd backend && npx jest \
  src/agentRuntime/__tests__/analysisRunSpec.test.ts \
  src/agentRuntime/__tests__/runtimeSelection.test.ts \
  src/agentv3/__tests__/queryComplexityClassifier.followup.test.ts

cd backend && npx tsc --noEmit
cd backend && npm run test:scene-trace-regression
```

E2E or behavior verification:
- Scene trace regression is required because runtime setup files are touched.

Rollback:
- Disable or remove shadow spec construction; existing runtimes continue to
  prepare requests directly.

Completion evidence:
- [x] Focused Jest pass logged.
- [x] Typecheck pass logged.
- [x] Scene trace regression pass logged.
- [x] Classifier preservation decision logged.
- [x] Driver logs and `review-rounds.md` updated.

## M4 - Adopt Shared Preparation In Claude/OpenAI Runtimes

Status: completed

Goal:
- Have both runtimes consume proven shared preparation outputs while keeping
  native SDK loops and current `IOrchestrator` classes.

Modify files:
- `backend/src/agentv3/claudeRuntime.ts`
- `backend/src/agentOpenAI/openAiRuntime.ts`
- `backend/src/agentRuntime/analysisRunSpec.ts`
- `backend/src/agentRuntime/runtimeCommon.ts`
- `backend/src/agentRuntime/runtimeSelection.ts`

Checklist:
- [x] Replace duplicated provider scope preparation where parity tests exist.
- [x] Replace duplicated trace context/session key/tool scope preparation where
  parity tests exist.
- [x] Keep Claude SDK query options and OpenAI `Runner/Agent` loops native.
- [x] Keep Claude verifier/correction loop only on Claude.
- [x] Keep OpenAI plan/final-report continuation loop only on OpenAI.
- [x] Keep `SessionStateSnapshot` v1 writes and route-level public event
  suppression unchanged.

Risks:
- Subtle request-preparation changes can affect analysis quality or runtime
  selection.
- OpenAI startup path can regress if shared prep misses OpenAI-specific state.
- Provider Manager pinning can be broken by over-sharing.

Verification commands:
```bash
cd backend && npx jest \
  src/agentRuntime/__tests__/runtimeSelection.test.ts \
  src/agentRuntime/__tests__/analysisRunSpec.test.ts \
  src/assistant/application/__tests__/agentAnalyzeSessionService.test.ts \
  src/agentOpenAI/__tests__/openAiConfig.test.ts \
  src/agentOpenAI/__tests__/openAiRuntime.test.ts \
  src/agentOpenAI/__tests__/openAiToolAdapter.test.ts \
  src/services/providerManager/__tests__/providerService.test.ts \
  src/services/providerManager/__tests__/providerRoutes.test.ts

cd backend && npm run typecheck
cd backend && npm run build
cd backend && npm run test:scene-trace-regression
cd backend && npm run verify:e2e:openai-startup
```

E2E or behavior verification:
- Scene trace regression plus OpenAI startup E2E because OpenAI runtime behavior
  is touched.

Rollback:
- Revert specific runtime adoption sites back to local preparation or guard
  shared preparation behind a runtime-internal flag.

Completion evidence:
- [x] Focused Jest pass logged.
- [x] Typecheck/build pass logged.
- [x] Scene trace regression pass logged.
- [x] OpenAI startup E2E pass logged. Earlier attempts failed three times on
  external provider quota, then the required gate passed after the provider was
  recharged.
- [x] Driver logs and `review-rounds.md` updated.

## M5 - Runtime Registry, EngineCapabilities, Fake Third-Party Adapter Tests

Status: completed

Goal:
- Prove third-party readiness without adding a production third-party runtime.

Modify files:
- `backend/src/agentRuntime/runtimeSelection.ts`
- `backend/src/agentRuntime/index.ts`
- new `backend/src/agentRuntime/runtimeRegistry.ts`
- new or existing `backend/src/agentRuntime/runtimeCapabilities.ts`
- new `backend/src/agentRuntime/__tests__/runtimeRegistry.test.ts`
- new `backend/src/agentRuntime/__tests__/fakeThirdPartyRuntime.test.ts`

Checklist:
- [x] Introduce runtime registry for production factories and capabilities.
- [x] Keep public `AgentRuntimeKind` limited to Claude/OpenAI.
- [x] Register fake third-party engine only in tests.
- [x] Move policy-relevant runtime differences into `EngineCapabilities`.
- [x] Add tests proving product policy can read capabilities instead of
  hardcoding Claude/OpenAI everywhere.
- [x] Preserve invalid env/provider failure behavior.

Risks:
- Accidentally widening public runtime kind before M10.
- Registry indirection can obscure provider snapshot errors.
- Capabilities can become an unstructured replacement for `if kind`.

Verification commands:
```bash
cd backend && npx jest \
  src/agentRuntime/__tests__/runtimeSelection.test.ts \
  src/agentRuntime/__tests__/runtimeRegistry.test.ts \
  src/agentRuntime/__tests__/fakeThirdPartyRuntime.test.ts \
  src/services/providerManager/__tests__/providerService.test.ts

cd backend && npx tsc --noEmit
cd backend && npm run test:scene-trace-regression
```

E2E or behavior verification:
- Scene trace regression covers runtime/provider/session behavior.

Rollback:
- Restore direct factory selection in `runtimeSelection.ts`; remove fake test
  engine registration. Public runtime choices remain unchanged.

Completion evidence:
- [x] Focused Jest pass logged.
- [x] Typecheck pass logged.
- [x] Scene trace regression pass logged.
- [x] Decision log confirms public runtime kind unchanged.
- [x] Driver logs and `review-rounds.md` updated.

## M6 - AnalysisHarness Strangler

Status: completed

Goal:
- Introduce `AnalysisHarness` behind a safe gate or test-only constructor after
  M1-M5 prove shared seams.

Modify files:
- new `backend/src/agentRuntime/analysisHarness.ts`
- `backend/src/agentRuntime/runtimeSelection.ts`
- `backend/src/agentv3/claudeRuntime.ts`
- `backend/src/agentOpenAI/openAiRuntime.ts`
- `backend/src/assistant/application/agentAnalyzeSessionService.ts`
- `backend/src/routes/agentRoutes.ts`
- `backend/src/routes/agentResumeRoutes.ts`
- `backend/src/routes/agentSceneReconstructRoutes.ts`
- CLI service and renderer tests as needed.

Checklist:
- [x] Re-read M1-M5 gates and record go/no-go.
- [x] Implement `AnalysisHarness` as an `IOrchestrator` implementation behind
  a flag or test-only factory first.
- [x] Route every current `IOrchestrator` hook explicitly.
- [x] Keep native SDK loop ownership in engine adapters.
- [x] Keep `StreamingUpdate` as the public event contract.
- [x] Keep route-owned `analysis_completed`.
- [x] Compare direct runtime path and harness path before any default switch.

Risks:
- This is the main architecture risk: hooks, events, report state, and snapshots
  can be split incorrectly.
- Route/CLI/report users can depend on optional hooks not captured in the
  interface.
- Default switch can be too large if done in the same milestone.

Verification commands:
```bash
cd backend && npx jest \
  src/agentRuntime/__tests__/runtimeSelection.test.ts \
  src/agentRuntime/__tests__/analysisRunSpec.test.ts \
  src/agentRuntime/__tests__/runtimeRegistry.test.ts \
  src/assistant/application/__tests__/agentAnalyzeSessionService.test.ts \
  src/agentOpenAI/__tests__/openAiRuntime.test.ts \
  src/services/__tests__/agentResultNormalizer.test.ts \
  src/services/__tests__/finalResultQualityGate.test.ts \
  src/services/verifier/__tests__/claimVerificationRunner.test.ts \
  src/services/__tests__/analysisResultSnapshotStore.test.ts \
  src/cli-user/services/__tests__/cliAnalyzeService.runTurn.test.ts \
  src/cli-user/services/__tests__/cliAnalyzeService.test.ts

cd backend && npm run typecheck
cd backend && npm run build
cd backend && npm run test:scene-trace-regression
```

Before a harness default-path switch:
```bash
npm run verify:pr
```

E2E or behavior verification:
- Scene trace regression is required. Root `verify:pr` is required before any
  default-path switch.

Rollback:
- Keep `createAgentOrchestrator` returning direct Claude/OpenAI runtimes or
  disable the harness flag.

Completion evidence:
- [x] Focused Jest pass logged.
- [x] Typecheck/build pass logged.
- [x] Scene trace regression pass logged.
- [x] Root `verify:pr` logged if default path changes. Not required in M6
  because no default path switch was made.
- [x] Harness go/no-go and rollback switch logged.
- [x] Driver logs and `review-rounds.md` updated.

## Harness Default/Parity Prerequisite - M7 Unblock

Status: completed

Goal:
- Make the tested harness comparable to the default route-facing path before
  touching durable snapshot state.

Modify files:
- `backend/src/agentRuntime/runtimeSelection.ts`
- `backend/src/agentRuntime/__tests__/runtimeSelection.test.ts`
- `backend/src/agentRuntime/runtimeToolSpec.ts`
- `backend/src/agentv3/__mocks__/claude-agent-sdk.ts`

Checklist:
- [x] Wrap production Claude/OpenAI orchestrators with `AnalysisHarness` by
  default after runtime registry selection.
- [x] Add rollback kill switch:
  `SMARTPERFETTO_ANALYSIS_HARNESS=0`.
- [x] Keep public `AgentRuntimeKind`, Provider Manager schemas/UI, and accepted
  `SMARTPERFETTO_AGENT_RUNTIME` values unchanged.
- [x] Keep SDK-native loops and SDK-native tool execution ownership unchanged.
- [x] Keep route-owned `analysis_completed` and public
  `StreamingUpdate`/CLI/report/snapshot contracts unchanged.
- [x] Remove direct source import from the transitive MCP SDK package by
  deriving tool result/annotation types from the Claude SDK descriptor.
- [x] Align the Jest Claude SDK mock with the real SDK `tool(...)` descriptor
  shape while preserving its legacy `schema` alias for older tests.

Risks:
- Default wrapping can change optional-hook presence or event forwarding.
- Tests can pass against a stale SDK mock while production descriptors differ.
- A transitive dependency import can make package/deadcode gates fail.

Verification commands:
```bash
cd backend && npx jest \
  src/agentRuntime/__tests__/runtimeSelection.test.ts \
  src/agentRuntime/__tests__/analysisHarness.test.ts \
  src/agentRuntime/__tests__/runtimeToolSpec.test.ts \
  src/agentv3/__tests__/mcpToolRegistry.test.ts \
  src/agentOpenAI/__tests__/openAiToolAdapter.test.ts \
  src/agentv3/__tests__/standaloneMcpServer.test.ts

cd backend && npx jest \
  src/agentv3/__tests__/claudeRuntimeRuntimeSnapshots.test.ts \
  src/agentv3/__tests__/claudeMcpServer.test.ts \
  src/agentRuntime/__tests__/runtimeToolSpec.test.ts \
  src/agentv3/__tests__/mcpToolRegistry.test.ts

cd backend && npx tsc --noEmit
cd backend && npm run verify:e2e:openai-startup
npm run verify:pr
git diff --check
```

E2E or behavior verification:
- OpenAI startup E2E passed with the default harness wrapping the OpenAI path.
- Root `npm run verify:pr` passed after the type/mock compatibility fixes.

Rollback:
- Set `SMARTPERFETTO_ANALYSIS_HARNESS=0` to restore direct engine
  construction, or revert the wrapper call in `runtimeSelection.ts`.

Completion evidence:
- [x] Focused Jest pass logged.
- [x] Typecheck/build pass logged.
- [x] OpenAI startup E2E pass logged.
- [x] Root `verify:pr` pass logged.
- [x] Post-diff self-check logged.
- [x] Driver logs and `review-rounds.md` updated.

## M7 - Snapshot State Split

Status: completed

Goal:
- Split product state from engine-local opaque state only after harness parity.

Modify files:
- `backend/src/agentv3/sessionStateSnapshot.ts`
- `backend/src/services/sessionPersistenceService.ts`
- `backend/src/services/persistAgentSession.ts`
- `backend/src/assistant/application/agentAnalyzeSessionService.ts`
- `backend/src/routes/agentResumeRoutes.ts`
- report routes and snapshot tests as needed.

Checklist:
- [x] Confirm harness default/stability decision before starting.
  Current decision: default harness wrapper is enabled with an env kill switch,
  and root `npm run verify:pr` passed. M7 can be planned next after re-reading
  driver files.
- [x] Decide v1 compatibility vs fail-fast with explicit error text.
  Current decision: compatible split. New snapshots write canonical
  `engineState`, while old top-level runtime mirrors remain readable/writable
  during this milestone.
- [x] Move Claude `sdkSessionId` and OpenAI response/history state under
  engine-local state.
- [x] Keep report-generation product fields outside engine-local state.
- [x] Keep provider id and provider snapshot hash non-secret and explicit.
- [x] Cover resume, report generation, SSE reconnect, and CLI artifact paths.

Risks:
- Durable session resume can break without a clear user-facing recovery path.
- Reports/snapshots can lose provenance if engine-local state swallows product
  fields.
- This may require release-boundary communication.

Verification commands:
```bash
cd backend && npx jest \
  src/assistant/application/__tests__/agentAnalyzeSessionService.test.ts \
  src/services/__tests__/analysisResultSnapshotStore.test.ts \
  src/services/__tests__/persistAgentSession.test.ts \
  src/routes/__tests__/agentRoutesRbac.test.ts

cd backend && npm run typecheck
cd backend && npm run test:scene-trace-regression
npm run verify:pr
```

E2E or behavior verification:
- Scene trace regression plus root `verify:pr` before merge.

Rollback:
- Keep v1 snapshot writes and postpone split; if v2 exists, disable v2 writes
  and retain v1 read/write path until a migration decision is made.

Completion evidence:
- [x] Compatibility/fail-fast decision logged.
- [x] Focused Jest pass logged.
- [x] Typecheck/build pass logged.
- [x] Scene trace regression pass logged.
- [x] Root `verify:pr` pass logged.
- [x] Driver logs and `review-rounds.md` updated.

## M8 - Real Pi / Third-Party API Spike

Status: completed

Goal:
- Validate real third-party/Pi APIs after extension seams exist. Do not ship a
  user option.

Modify files:
- new `docs/features/runtime-engine-contract/pi-spike.md` or equivalent
  evidence note.
- Temporary spike code outside production imports if needed.

Checklist:
- [x] Inspect real Pi package APIs and version constraints.
- [x] Determine whether the right surface is `pi-ai`, `pi-agent-core`, an
  external-orchestrator adapter, or no-go.
- [x] Document stream event shape, tool schema requirements, state/resume model,
  dependency footprint, packaging impact, and security controls.
- [x] Prove `.pi` discovery, project extensions, file tools, and shell tools can
  be disabled or bypassed before any product path is considered.
- [x] Compare findings against `EngineCapabilities` and fake third-party tests.

Risks:
- Network/API availability and credentials may block real smoke validation.
- Pi may own too much project/session/tool state for the thin engine cut.
- Optional dependency and packaging constraints may be larger than runtime code.

Verification commands:
```bash
git diff --check
```

Plus spike-specific smoke command documented in `pi-spike.md`.

E2E or behavior verification:
- Spike smoke only; production behavior must remain unchanged.

Rollback:
- Remove spike-only files or leave evidence docs. No production runtime or
  dependency rollback should be needed.

Completion evidence:
- [x] Spike evidence note created.
- [x] Recommendation recorded: thin engine, external-orchestrator adapter, or
  no-go.
- [x] No production dependency/runtime selection/UI change confirmed.
- [x] Driver logs and `review-rounds.md` updated.

## M9 - Hidden Experimental Third-Party Runtime

Status: completed

Goal:
- If M8 succeeds, add a hidden opt-in experimental runtime without UI exposure.

Modify files:
- Runtime registry and engine adapter files.
- Provider/runtime config only if a hidden config path is approved.
- Packaging dependency checks.
- Docs under `docs/features/runtime-engine-contract/`.

Checklist:
- [x] Require M8 go decision before coding.
- [x] Add dynamic import or optional dependency handling.
- [x] Keep Provider Manager UI unchanged.
- [x] Gate runtime by explicit experiment flag.
- [x] Disable external project config discovery.
- [x] Disable shell/file tools unless explicitly re-reviewed.
- [x] Add real smoke test plus fake-engine parity tests.

Risks:
- Optional dependency can still leak into npm/Docker/portable packaging.
- Hidden config can become de facto public API if not gated.
- Security model can be weaker than SmartPerfetto MCP tool constraints.

Verification commands:
```bash
cd backend && npx tsc --noEmit
cd backend && npm run test:scene-trace-regression
npm run verify:pr
```

Additional checks before public release:
- npm pack/install smoke.
- Docker smoke.
- Portable package smoke.
- Dependency/license review.

E2E or behavior verification:
- One safe SmartPerfetto analysis smoke through the hidden runtime plus scene
  trace regression for existing paths.

Rollback:
- Disable experiment flag, remove dynamic import registration, and ensure
  Claude/OpenAI imports and packaging remain independent.

Completion evidence:
- [x] M8 approval logged.
- [x] Hidden runtime smoke logged.
- [x] Typecheck, scene regression, and root `verify:pr` pass logged.
- [x] Packaging impact logged.
- [x] Driver logs and `review-rounds.md` updated.

## M10 - User-Facing Runtime Option

Status: completed

Goal:
- Expose a third-party runtime only after it behaves like a supported
  SmartPerfetto engine.

Modify files:
- Provider Manager type/config/UI files.
- Generated frontend/backend contract files as required.
- User docs and reference docs.
- Packaging manifests and release docs as required.

Checklist:
- [x] Require M9 hidden runtime success and maintainer go decision.
- [x] Add public Provider Manager type/config/UI.
- [x] Regenerate frontend/backend types from sources.
- [x] Add user docs, capability limits, migration notes, and rollback notes.
- [x] Run full PR and packaging verification.

Risks:
- This expands public API and packaging surface.
- UI/provider pinning regressions can switch existing sessions unexpectedly.
- Runtime capability gaps can be misrepresented as parity.

Verification commands:
```bash
npm run verify:pr
```

Plus UI/provider tests and npm/Docker/portable packaging smokes appropriate to
the release.

E2E or behavior verification:
- User-facing runtime smoke, existing Claude/OpenAI behavior checks, and
  packaging smokes.

Rollback:
- Revert UI/public config exposure, hide runtime behind the experiment flag
  again, and keep existing Claude/OpenAI Provider Manager behavior.

Completion evidence:
- [x] Maintainer approval logged.
- [x] Root `verify:pr` pass logged.
- [x] UI/provider tests logged.
- [x] Packaging smokes logged.
- [x] Driver logs and `review-rounds.md` updated.

## Post-M10 - Three-Agent Startup/Scrolling E2E And Log-Clean Fix Loop

Status: completed

Goal:
- After M1-M10, run startup and scrolling E2E for all three public runtimes:
  `claude-agent-sdk`, `openai-agents-sdk`, and `pi-agent-core`.
- Monitor stdout/stderr and structured JSON output for abnormal runtime
  behavior, fix code issues, and rerun until the matrix is clean.

Modified files:
- `backend/src/agentv3/claudeSseBridge.ts`
- `backend/src/agentv3/claudeVerifier.ts`
- `backend/src/agentv3/claudeRuntime.ts`
- `backend/src/agentv3/claudeMcpServer.ts`
- `backend/src/agentv3/__tests__/claudeSseBridge.test.ts`
- `backend/src/agentv3/__tests__/claudeVerifier.test.ts`
- `backend/src/agentv3/__tests__/claudeRuntimeRuntimeSnapshots.test.ts`
- `backend/src/agentv3/__tests__/claudeMcpServer.test.ts`
- `backend/src/agentRuntime/piAgentCoreRuntime.ts`
- `backend/src/agentRuntime/__tests__/piAgentCoreRuntime.test.ts`
- `backend/src/scripts/verifyAgentSseScrolling.ts`
- Runtime-engine-contract driver docs.

Risks:
- Extra Claude correction retries can consume quota and emit timeout/session
  limit noise even when the main report is already deliverable.
- Verifier JSON parsing must tolerate markdown/prose around JSON arrays without
  warning noise.
- Claude text-only correction output can leak internal correction scaffolding
  such as "修正版", verifier diagnostics, plan-deviation text, missing tool
  lists, or internal phase ids into user-facing reports.
- Pi public preview fake-stream E2E is capability-limited and must not be
  represented as model-backed real Pi analysis.

Verification commands:
- `cd backend && npx jest src/agentv3/__tests__/claudeSseBridge.test.ts src/agentv3/__tests__/claudeVerifier.test.ts src/agentv3/__tests__/claudeRuntimeRuntimeSnapshots.test.ts src/agentv3/__tests__/claudeMcpServer.test.ts src/agentRuntime/__tests__/piAgentCoreRuntime.test.ts --runInBand --no-cache`
- `cd backend && npx tsc --noEmit`
- `cd backend && npm run test:scene-trace-regression`
- `cd backend && SMARTPERFETTO_AGENT_RUNTIME=claude-agent-sdk npx tsx src/scripts/verifyAgentSseScrolling.ts --mode full --timeout-ms 1200000 --trace ../test-traces/lacunh_heavy.pftrace --query "分析启动性能" --output test-output/e2e-claude-startup-real.json --keep-session --require-conclusion-evidence --require-claim-verifier-ok --require-non-partial --require-final-report-heading --forbid-process-narration --forbid-degraded-fallback completed_plan_summary_fallback --require-text "冷启动" --require-text "ChaosTask" --forbid-text "完成综合结论输出" --forbid-text "分阶段证据摘要" --forbid-text "完整结构化报告已生成" --forbid-text "应维持温启动" --forbid-text "bindApplication 不存在"`
- Equivalent strict startup/scrolling commands for OpenAI.
- Pi startup/scrolling smoke commands with
  `SMARTPERFETTO_AGENT_RUNTIME=pi-agent-core`,
  `SMARTPERFETTO_PI_AGENT_CORE_FAKE_STREAM=1`, isolated `HOME`, `PI_OFFLINE=1`,
  and `--allow-capability-limited-runtime`.

E2E or behavior verification:
- OpenAI startup and scrolling strict E2E passed after M11.
- Pi startup and scrolling strict real-model E2E passed after M11, with
  `claimVerifierStatus=passed`, non-partial final reports, normal
  request-scoped SmartPerfetto tool events, and no runtime-owned
  `analysis_completed`.
- Claude startup passed once after the stricter Final Report Contract
  correction policy, then a Claude scrolling run exposed user-visible
  correction scaffolding in the report (`修正版` / `计划执行偏差`). Focused
  sanitizer and correction-prompt tests now cover this.
- The latest Claude startup and scrolling reruns after that sanitizer fix
  passed after the stated Claude SDK quota reset, with claim verification
  passed, non-partial reports, normal tool/data-envelope counts, and report
  scaffold scans clean. The only remaining runtime diagnostic was a
  non-user-facing optional correction retry timeout; the verified final report
  did not leak correction scaffolding.

Rollback:
- Revert the Post-M10 Claude correction/verifier/SSE/MCP attribution changes
  if they regress Claude/OpenAI production behavior.
- Revert the Pi smoke/script changes if capability-limited preview reporting
  becomes misleading.

Completion evidence:
- [x] Focused Jest for Post-M10/M11 fixes passed after the latest correction
  scaffold sanitizer: 5 suites, 216 tests.
- [x] `cd backend && npx tsc --noEmit` passed.
- [x] `cd backend && npm run test:scene-trace-regression` passed all 6 traces.
- [x] OpenAI startup strict E2E passed after M11.
- [x] OpenAI scrolling strict E2E passed after M11.
- [x] Pi startup strict real-model E2E passed after M11.
- [x] Pi scrolling strict real-model E2E passed after M11.
- [x] Claude startup final clean rerun after latest correction-scaffold
  sanitizer passed after quota reset: `claimVerifierStatus=passed`, 12 checked
  claims, 0 unsupported/issues, 28 task dispatches, 36 data envelopes,
  `analysisCompletedConclusionChars=12702`.
- [x] Claude scrolling strict E2E after latest correction-scaffold sanitizer
  passed after quota reset: `claimVerifierStatus=passed`, 12 checked claims,
  0 unsupported/issues, 20 task dispatches, 26 data envelopes,
  `analysisCompletedConclusionChars=9096`.
- [x] Final root `npm run verify:pr` after all three-agent E2E passes.
- [x] Post-diff self-check after final E2E matrix is clean.

## M11 - Pi Agent Core Claude-Parity Analysis Runtime

Status: completed

Goal:
- Replace Pi Agent Core's public-preview fake-stream analysis path with a real
  SmartPerfetto analysis runtime that is aligned with the Claude Agent SDK and
  OpenAI Agents SDK product contract.
- Pi Agent Core must use SmartPerfetto's shared system prompt, scene strategy,
  planning/hypothesis tools, trace SQL/Skill tools, evidence/report pipeline,
  and route-owned terminal events. It must not use `.pi` discovery,
  package-extension tools, shell tools, or file tools.
- Fake stream remains only as an explicit smoke/test mode and must continue to
  be labeled capability-limited.

Modify files:
- `backend/src/agentRuntime/piAgentCoreRuntime.ts`
- `backend/src/agentRuntime/__tests__/piAgentCoreRuntime.test.ts`
- `backend/src/agentRuntime/runtimeCapabilities.ts`
- `backend/src/scripts/verifyAgentSseScrolling.ts` if strict Pi E2E needs
  capability flags or assertions adjusted.
- Runtime-engine-contract driver docs.

Risks:
- Accidentally treating a fake smoke as real Pi parity.
- Reimplementing Claude/OpenAI product policy inside a Pi-only path instead of
  reusing shared prompt/tool/report seams.
- Leaking secrets from `SMARTPERFETTO_PI_AGENT_CORE_MODEL_JSON` into model
  objects, logs, snapshots, or reports.
- Letting Pi Agent Core run non-SmartPerfetto tools or external discovery.
- Producing a final answer before full-mode plan phases complete.
- Breaking Provider Manager/runtime pinning while changing public Pi behavior.

Verification commands:
```bash
cd backend && npx jest src/agentRuntime/__tests__/piAgentCoreRuntime.test.ts --runInBand --no-cache
cd backend && npx tsc --noEmit
cd backend && npm run test:scene-trace-regression
git diff --check
```

E2E or behavior verification:
- Add a focused fake Pi Agent Core parity test that proves the runtime builds
  SmartPerfetto tools, exposes plan tools in full mode, forwards tool events,
  and returns a non-preview result when fake-stream is off.
- Pi startup and scrolling strict E2E passed with a real
  `@earendil-works/pi-agent-core` runtime and Z.ai/OpenAI-compatible model
  configuration loaded through `SMARTPERFETTO_PI_AGENT_CORE_MODEL_JSON`.

Rollback:
- Revert `piAgentCoreRuntime.ts` to the M10 preview adapter, keep
  `SMARTPERFETTO_PI_AGENT_CORE_FAKE_STREAM=1` smoke mode, and keep
  Claude/OpenAI as the supported production-quality runtimes.

Completion evidence:
- [x] Driver docs updated with M11 scope and decision.
- [x] Pi runtime uses shared SmartPerfetto system prompt and tools.
- [x] Pi runtime emits normal tool/progress events and never emits
  route-owned `analysis_completed`.
- [x] Pi runtime differentiates real analysis results from fake-stream preview
  results.
- [x] Focused Jest passed.
- [x] Typecheck passed.
- [x] Scene trace regression passed.
- [x] Pi startup/scrolling strict E2E passed.
- [x] Post-diff self-check logged.

## M12 - OpenCode Source/API Spike And Adapter Decision

Status: completed

Goal:
- Determine whether OpenCode can become a fourth SmartPerfetto agent runtime
  without violating Draft v2 boundaries.
- Decide whether the right first implementation is a thin SDK/server engine, a
  stricter external-orchestrator adapter, hidden-only/no-go, or a future public
  runtime path.
- Prove from source/package evidence that built-in file tools, shell tools,
  project discovery, extensions, and OpenCode-owned prompts can be disabled or
  bypassed before any product path is considered.

Modify files:
- `docs/features/runtime-engine-contract/opencode-spike.md`
- Runtime-engine-contract driver docs.
- Spike-only temp install or scratch code outside production imports if needed.

Checklist:
- [x] Inspect official OpenCode docs, package metadata, tarball/type
  declarations, CLI/server/SDK entrypoints, and version constraints.
- [x] Document stream/event shape, tool schema model, state/resume model,
  dependency footprint, server lifecycle, and packaging impact.
- [x] Document whether OpenCode can accept request-scoped SmartPerfetto tools
  while disabling built-in shell/file/project-extension behavior.
- [x] Compare OpenCode requirements against `EngineCapabilities`, shared tool
  specs, `AnalysisHarness`, Provider Manager pinning, snapshot state, and
  route-owned finalization.
- [x] Decide M13 go/no-go and whether public M14 is plausible.

Risks:
- OpenCode is a coding-agent product surface, not just an LLM SDK; accidental
  project discovery, file writes, shell commands, extension loading, or
  OpenCode prompt ownership would violate SmartPerfetto boundaries.
- A server-backed adapter may require process lifecycle and auth isolation that
  is larger than Pi Agent Core.
- Public exposure can confuse Provider Manager users if capability gaps are
  not explicit.

Verification commands:
```bash
git diff --check
```

Plus spike-specific import/server smoke commands documented in
`opencode-spike.md`, if source evidence shows they are safe.

E2E or behavior verification:
- Spike smoke only; production behavior must remain unchanged.
- No backend production import, public runtime value, Provider Manager UI,
  package dependency, or generated frontend change is allowed in M12.

Rollback:
- Remove `opencode-spike.md` or leave it as evidence. No production runtime,
  dependency, Provider Manager, frontend, or packaging rollback should be
  required.

Completion evidence:
- [x] OpenCode spike evidence note created.
- [x] Adapter recommendation recorded: proceed to M13 hidden runtime as a
  server-backed external-orchestrator adapter, not a thin in-process SDK.
- [x] No production dependency/runtime selection/UI change confirmed.
- [x] Driver logs and `review-rounds.md` updated.

## M13 - Hidden Experimental OpenCode Runtime

Status: completed

Goal:
- If M12 succeeds, add OpenCode as a hidden opt-in runtime without public UI or
  Provider Manager exposure.

Modify files:
- `backend/src/agentRuntime/runtimeCapabilities.ts`
- `backend/src/agentRuntime/runtimeRegistry.ts`
- `backend/src/agentRuntime/runtimeSelection.ts`
- new `backend/src/agentRuntime/openCodeRuntime.ts`
- new `backend/src/agentRuntime/__tests__/openCodeRuntime.test.ts`
- existing runtime registry/selection tests as needed.
- Runtime-engine-contract driver docs.

Checklist:
- [x] Add hidden internal runtime kind `experimental-opencode`.
- [x] Gate it behind the existing experimental runtime env gate and a new
  OpenCode-specific hidden runtime value.
- [x] Load OpenCode SDK/server/CLI dynamically through explicit module/binary
  paths or optional dependency handling; do not add public package exposure in
  M13.
- [x] Generate hardened OpenCode config with isolated HOME/config/project,
  disabled sharing/autoupdate/snapshot/plugin/instructions, and denied
  built-in file/shell/web/external-directory permissions.
- [x] Adapt shared SmartPerfetto MCP tools through standalone MCP transport, or
  stop if OpenCode cannot restrict execution to SmartPerfetto request-scoped
  tools. Current M13 result: standalone public/read-only MCP can be connected
  behind `SMARTPERFETTO_OPENCODE_ENABLE_STANDALONE_MCP=1`; request-scoped trace
  tools are intentionally not exposed yet, so M14 remains blocked until a
  session-scoped MCP bridge and real analysis E2E pass.
- [x] Project OpenCode events into normal SmartPerfetto events without emitting
  route-owned `analysis_completed`.
- [x] Add focused tests for config hardening, hidden selection, capabilities,
  no public runtime exposure, event projection, and no-model hidden smoke.

Risks:
- Hidden runtime may still load OpenCode project config, file tools, shell
  tools, or extension packages unless explicitly disabled.
- Optional dependency/server process lifecycle can leak into default packaging.

Verification commands:
```bash
cd backend && npx tsc --noEmit
cd backend && npm run test:scene-trace-regression
```

E2E or behavior verification:
- Hidden OpenCode smoke plus scene trace regression. Public behavior remains
  Claude/OpenAI/Pi only.

Rollback:
- Unset hidden env vars or remove hidden registry registration and adapter.

Completion evidence:
- [x] M12 go decision logged.
- [x] Focused Jest and hidden smoke passed.
- [x] Typecheck and scene regression passed.
- [x] Post-diff self-check logged.

## M14 - User-Facing OpenCode Runtime Option

Status: completed

Goal:
- Expose OpenCode as a supported fourth runtime only after the hidden path
  proves SmartPerfetto-quality analysis and safe sandbox boundaries.

Modify files:
- Provider Manager type/config/UI files.
- Generated frontend/backend contracts if required.
- Docs, env examples, architecture docs, packaging manifests, and E2E scripts.

Risks:
- Public runtime expansion changes API, UI, packaging, docs, and user
  expectations.
- OpenCode capability gaps must not be presented as Claude/OpenAI/Pi parity
  unless startup/scrolling E2E proves it.

Verification commands:
```bash
npm run verify:pr
```

E2E or behavior verification:
- Startup and scrolling E2E for Claude, OpenAI, Pi, and OpenCode.
- Frontend Provider Manager check with Computer Use.
- Generated HTML report opened and inspected in Chrome for OpenCode output
  quality and obvious rendering/report abnormalities.

Rollback:
- Revert public Provider Manager/UI/docs/package exposure and keep OpenCode
  hidden or disabled.

Completion evidence:
- [x] Maintainer go/public decision logged.
- [x] Four-agent startup/scrolling E2E matrix passed.
- [x] Frontend and report visual checks passed.
- [x] Root `verify:pr` passed.
- [x] Post-diff self-check logged.

## Post-M14 - Release Readiness And Publish Gate

Status: completed

Goal:
- Before pushing and publishing the four-agent release, rerun the full release
  gate, verify generated reports in a browser, document any release-time config
  findings, then publish the next version only if all gates pass.

Modify files:
- Release docs/logs only unless a gate exposes a product issue.
- Version files during the release step.

Risks:
- Releasing with stale generated frontend or uncommitted submodule state.
- Treating a gateway-specific Pi Agent Core model JSON as a generic default.
- Publishing before `npm run verify:pr`, report rendering, and E2E output scans
  are clean.

Verification commands:
```bash
cd backend && npx jest src/agentv3/__tests__/claudeRuntimeRuntimeSnapshots.test.ts --runInBand --no-cache
cd backend && npx tsc --noEmit
cd backend && npm run test:scene-trace-regression
npm run verify:pr
git diff --check
```

E2E or behavior verification:
- Claude, OpenAI, Pi Agent Core, and OpenCode startup/scrolling strict E2E.
- Unified JSON/session/report scan for claim verifier, errors, and forbidden
  report/session text.
- Browser render/scroll check for all eight generated HTML reports.

Rollback:
- Do not publish if any gate fails.
- If a release commit is made before publish, revert the release/version commit
  and keep the feature commit on the branch.
- Runtime rollback remains selecting `claude-agent-sdk` or
  `openai-agents-sdk`, or removing Pi/OpenCode custom provider/env runtime
  config.

Completion evidence:
- [x] Four-agent startup/scrolling E2E matrix passed on 2026-06-02.
- [x] Unified JSON/session/report scan passed.
- [x] Browser report render/scroll check passed.
- [x] Focused Jest, typecheck, scene regression, and root `verify:pr` passed.
- [x] Pi Agent Core `openai-completions` gateway config finding documented.
- [x] `git diff --check` passed after docs/log updates.
- [x] Version bump, commit, push, publish, and post-publish verification
  completed.
