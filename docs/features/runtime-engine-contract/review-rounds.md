# Runtime Engine Contract Review Rounds

**Date**: 2026-05-31
**Scope**: `docs/features/runtime-engine-contract/README.md`
**Method**: multi-round architecture review before runtime implementation.

## Round 0 — Draft Seed

Author: Codex

### Scope

Created Draft v1 for thinning SmartPerfetto's runtime contract so Claude,
OpenAI, Pi, and future engines can be replaceable execution adapters behind a
shared SmartPerfetto analysis harness.

### Draft v1 Decisions

1. Keep `IOrchestrator` as the route/CLI-facing facade.
2. Introduce internal `RuntimeEngine` / `EngineRunInput` / `EngineEvent` /
   `EngineState` contracts.
3. Move product semantics into `AnalysisHarness`.
4. Treat `RuntimeToolSpec` as the neutral tool descriptor and adapt outward to
   Claude, OpenAI, Pi, and standalone MCP.
5. Split snapshots into `harnessState` and `engineState`.
6. Defer Pi until existing Claude/OpenAI behavior is protected by parity tests.
7. Forbid direct `pi-coding-agent` embedding in backend runtime; prefer `pi-ai`
   or `pi-agent-core` for a narrow experimental adapter.

### Known Review Targets

- Boundary between `AnalysisHarness` and engine adapters.
- Whether the engine event model is sufficient for Claude SDK and OpenAI Agents
  SDK streaming behavior.
- How to migrate current Claude SDK-shaped MCP tool descriptors to neutral
  `RuntimeToolSpec` without changing behavior.
- Snapshot migration and old-session compatibility.
- Provider Manager naming: keep `agentRuntime` publicly or introduce
  `engineKind` internally only.
- Pi dependency and security model.

## Round 1 — Architecture Boundary Review

Reviewer: Claude (Opus 4.8), grounded against current `backend/src` code.

### Scope Decisions (from maintainer)

- Target: full 3-engine platform (Claude + OpenAI + Pi), not a 2-engine cleanup.
- Pi (`pi-ai` / `pi-agent-core`) is a committed near-term integration, so the
  contract must be designed to host Pi now.
- Resume compatibility: OK to break in-flight/persisted session resume at the
  refactor cut. No legacy snapshot migration is required.

These decisions reject the "defer Pi / 2-engine only" option and accept
trimming snapshot back-compat.

### Verdict

Thesis is correct and grounded: both runtimes independently call
`classifyScene`, `classifyQueryComplexity`, `buildSystemPrompt`, the strategy
loader, the contract gate, and `takeSnapshot`, so the SDK adapters really do own
product logic that belongs in a shared harness. Direction approved. The draft is
calibrated for a clean 2-engine extraction; with Pi committed near-term it needs
an earlier Pi-fit checkpoint, and two current-code descriptions are inaccurate in
ways that under-size the hardest milestone.

### P0 Findings

1. **Pi is committed but the contract is designed top-down with no early Pi
   probe.** Draft freezes `RuntimeEngine` / `EngineEvent` / `RuntimeToolSpec` /
   `EngineState` in M1–M2 and only meets Pi at M6. If Pi's real stream/tool/state
   model does not fit, M2–M5 (plus both migrated engines) get reworked. Add a
   read-only Pi feasibility spike between M1 and M2 that maps a real
   `pi-ai`/`pi-agent-core` run onto the proposed contract before it freezes.
   Validate at minimum: streaming event shape vs `EngineEvent`, tool definition +
   execution model vs `RuntimeToolSpec.execute`, and resumable state vs
   `EngineState.payload`. (Maintainer knows the Pi API directly; this spike should
   use the real package, not inference.)

### P1 Findings

2. **Draft §5.1 misrepresents `IOrchestrator`.** The shown 5-method interface is
   a fiction. Real surface (`agent/core/orchestratorTypes.ts:167`) is an
   EventEmitter plus ~13 optional hooks, and the route/session layer consumes
   most of them: `getInterventionController`, `getProgressTracker` (not even
   declared on the interface), `getSdkSessionId`, `getSessionNotes`,
   `getSessionPlan`, `getSessionUncertaintyFlags`, `getCachedArchitecture`,
   `restoreArchitectureCache`, `takeSnapshot`, `restoreFromSnapshot`,
   `cleanupSession`, `on`/`emit`/`removeAllListeners`. `AnalysisHarness` must
   re-expose all of these from harness-owned state, so **M4 is the main effort**,
   not a swap. v2 must replace the snippet with the real surface and decide which
   hooks the harness keeps vs. deliberately slims.

3. **Verifier parity is asymmetric.** The iterative
   `verifyConclusion → generateCorrectionPrompt → re-run` loop is Claude-only
   (`agentv3/claudeRuntime.ts:76,1559,1622`); OpenAI relies on
   `finalReportContractGate`. Draft §5.3/§5.4 treats verifier as uniformly
   harness-owned and bars `OpenAIEngine` from "evidence verification." Lifting the
   verifier into the harness as one uniform step silently gives OpenAI the Claude
   correction loop, violating the "preserve existing behavior" invariant. Make
   verifier per-engine opt-in, or decide to unify and test it as an explicit
   behavior change.

4. **`EngineEvent` single-`done` cannot express the correction loop.** The
   verifier re-invokes the model with a fresh system prompt, so the harness drives
   multiple `engine.run()` calls per turn. State this in §5.2 ("engine run = one
   model conversation to completion; harness orchestrates N runs per analyze").

5. **M2 is an execution-ownership inversion plus a schema source-of-truth
   decision, not a descriptor reshape.** Today `McpToolDefinition` wraps the
   actual Claude SDK `tool` object and the OpenAI adapter reads its `inputSchema`
   as a Zod raw shape (`z.toJSONSchema`, `agentOpenAI/openAiToolAdapter.ts`). The
   proposed `RuntimeToolSpec.execute(args, ctx)` moves execution out of the Claude
   in-process MCP tool. With Pi committed there are now three schema targets
   (Claude/Zod, OpenAI+MCP/JSON Schema, Pi/TypeBox). Open Question #2 must become a
   decision in M2, not stay open. Recommend keeping a single richer schema source
   (Zod or TypeBox) and emitting JSON Schema for OpenAI/MCP.

6. **Complexity classifier already diverges** (Claude `classifyQueryComplexity`
   async/LLM vs OpenAI `classifyQueryComplexityLocal`). Whatever the harness picks
   changes behavior on one side; choose consciously in M3.

### P2 Findings

7. **M3 is not greenfield.** `agentRuntime/runtimeCommon.ts` (263 lines) already
   shares `formatTraceContext`, `buildQuickConversationContext`,
   `collectRecentFindings`, `buildEntityContext`, `captureSkillDisplayEntities`,
   `toProtocolHypothesis`, `createRuntimeSkillNotesBudget`, plus provider/knowledge
   scope resolvers and LRU/session-map helpers. Frame M3 as growing this file, not
   creating a new shared layer.

8. **Interface hygiene.** `getProgressTracker` is called on the orchestrator but
   absent from `IOrchestrator`; fold it (and the deprecated `restoreSessionMapping`)
   into the M4 interface cleanup.

### Accepted / Rejected

- Rejected (by maintainer): "drop Pi / 2-engine only" and "extract the contract
  bottom-up from the two engines you have." Pi is committed, so the contract is
  designed for three engines, de-risked by the P0 early spike.
- Accepted (by maintainer): trim resume back-compat. Simplify M5 — split
  `harnessState` / `engineState`, fail fast on unknown/old shape, drop
  `runtime_contract_snapshot@1` versioning and legacy-migration tests.

### Proposed For Draft v2 (not yet applied)

- §5.1: replace the 5-method snippet with the real `IOrchestrator` surface;
  note harness re-exposes or deliberately slims each hook (P1-2, P2-8).
- §5.2/§5.3/§5.4: add the multi-run note; make verifier per-engine (P1-3, P1-4).
- New milestone M1.5: read-only Pi contract feasibility spike (P0-1).
- M2: convert Open Question #2 into a schema source-of-truth decision; describe
  the execution-ownership inversion (P1-5).
- M3: state it extends `runtimeCommon.ts`; record the classifier choice
  (P2-7, P1-6).
- M5: simplify to split-state + fail-fast, no versioned migration (accepted).

### Verification

Docs-only round. `git diff --check` clean.

## Round 2 — Independent Codex Review (read-only)

Reviewer: Codex (read-only sandbox, session `019e7d33-1f7d-7150-be47-7450ed924365`).
Adjudication by Claude.

> Note: an earlier version of this section was recorded before the Codex call
> actually succeeded (a tool-arg error). It has been replaced with Codex's real
> output below.

### Primary question — can a thin contract contain 3 SDKs? (maintainer's worry)

**Codex verdict: workable-but-leaky.** The cut is right *only if* Draft v2 states
explicitly that **the SDK owns the inner agent loop and native tool invocation**,
while the harness owns run setup, SmartPerfetto state, event projection,
verifier/final-report continuations, and persistence. If the harness instead
drives tools through a universal `RuntimeToolSpec.execute()` loop, the abstraction
leaks badly.

Codex's sharper point: the draft is **too thin at the wrong place**. `EngineEvent`
(`README.md:153-167`) models only text/tool/usage/done/error, but the real
runtime emits plan phases, tool-side progress, degraded states, sub-agent events,
and compact boundaries that routes and CLI already consume (`agent/types.ts:316-365`,
`assistant/stream/streamProjector.ts:127-200`, `cli-user/repl/renderer.ts:80-160`).

Per-SDK leakage Codex enumerated:

- **Claude Agent SDK** owns the loop via `query()` (mcpServers, allowedTools,
  maxTurns, maxBudgetUsd, resume, sub-agents) (`claudeRuntime.ts:903-927`); tools
  are SDK-native in-process MCP (`claudeMcpServer.ts:1596-1635`). Resume is by SDK
  session id and already needs a Claude-specific workaround because `systemPrompt`
  is ignored on resume (`claudeRuntime.ts:888-896,1060-1073`). Streaming is not a
  simple union — the bridge buffers text to separate thought vs answer and maps
  result/sub-agent/compact events (`claudeSseBridge.ts:152-191,275-326,330-430`).
  Cancellation needs `close()` to kill the subprocess, so `dispose?(): void` is too
  weak.
- **OpenAI Agents SDK** Runner owns the loop (`toolUseBehavior:'run_llm_again'`,
  parallel tool calls off, `runner.run(...,{stream,maxTurns,signal,previousResponseId})`)
  (`openAiRuntime.ts:677-817`). State is history + `lastResponseId` + run state, not
  a session id (`openAiRuntime.ts:99-104,876-880,1151-1184`). It already runs
  product-level continuation loops for incomplete plans and the final-report
  contract (`openAiRuntime.ts:886-958,1615-1654`) — so **one `done` cannot mean
  "analysis complete," only "this SDK run ended."**
- **Pi** is not installed and provider/runtime types only admit Claude/OpenAI
  (`package.json:102-117`, `providerManager/types.ts:10`, `runtimeCapabilities.ts:44-55`).
  Codex's key warning: **if Pi exposes a higher-level autonomous harness with its
  own project/session/tool source of truth, this thin boundary is the *wrong* cut
  for Pi** — it would need a stricter "external orchestrator engine" adapter with
  stronger sandboxing. Treat Pi as an M0/M1 spike, not an assumption.

**Antidote (Codex):** do not branch on `engine.kind` in product logic; give the
contract an **engine capabilities/policy descriptor** so the differences become
*data*, not control flow. Fields named: resume mode, system-prompt-on-resume
behavior, tool schema dialect, native MCP/function-tool support, raw stream event
kinds, structured-output support, correction-loop support, sub-agent support, tool
concurrency, usage/cost granularity, abort/close requirements. Pi also needs
Provider Manager + `runtimeSelection.ts:42-65` changes, not just a new engine file.

*Claude adjudication:* the capabilities descriptor is the right antidote, but it
must encode **engine properties the harness reads to choose a policy**, not a
grab-bag of per-engine toggles — otherwise it is an `if`-ladder by another name.
This also resolves the Round-1 tool-dispatch question in favour of
**engine-owns-loop + shared tool body** (Codex's "shared handler body adapted into
SDK-native tools"), which both reviewers now agree on.

### Codex on Round 1 findings

P0-1 AGREE (severity correct; draft still defers Pi at `README.md:44-45,443-474`,
conflicting with the binding scope). P1-2 AGREE. **P1-3 PARTIAL** — OpenAI is not
just a "single final gate"; it already runs plan/final-report continuations
(`openAiRuntime.ts:886-958,1615-1654`), so R1 understated it. P1-4 AGREE. **P1-5
AGREE, arguably P0 before M2.** P1-6 AGREE (`openAiRuntime.ts:1535-1572`). P2-7
AGREE. P2-8 AGREE, with real route implications (`agentRoutes.ts:2308-2313,2468-2478`).

### Risks both reviews under-weighted (Codex)

- **Tool execution ownership** is the single biggest open decision; define it as a
  shared handler body adapted into SDK-native tools, not a harness dispatcher
  (`README.md:203-209`).
- **SSE/CLI event-name stability**: routes suppress some events and synthesize
  `analysis_completed`; replay and CLI consume specific names
  (`agentRoutes.ts:3381-3406,5623-5655`, `sessionSseReplay.ts:15-19`).
- **Abort/dispose lifecycle**: Claude needs query `close()`, OpenAI uses
  `AbortSignal` + provider close; make async disposal mandatory
  (`claudeRuntime.ts:479-501`, `openAiRuntime.ts:810-817,1048-1053`).
- **Mid-run intervention** is exposed on the interface and `InterventionController`
  can pause, but **neither runtime really supports it through the SDK loop today**
  (`interventionController.ts:202-225,608-658`) — so little is lost by a coarse
  between-run model.
- **Snapshot legacy migration**: draft still requires it (`README.md:430-433,529-531`);
  per the binding decision, drop migration and just version the new per-engine
  payload.

### Net must-fix-before-M1 (merged R1 + R2)

1. State explicitly: **SDK owns the loop + native tool execution**;
   `RuntimeToolSpec` is a shared tool *body* adapted into each SDK, not a harness
   dispatcher.
2. Add an **engine capabilities/policy descriptor** to the contract.
3. Model **analysis completion as harness-driven multi-run**, separate from an
   SDK-run `done`; reproduce Claude's in-loop verifier without granting OpenAI a
   new loop.
4. **Real Pi API spike** before freezing the contract / M2; decide whether Pi fits
   a thin engine or needs an external-orchestrator adapter.
5. Make **abort/dispose async + mandatory**; add a cancellation test.
6. **Protect SSE/CLI event names** (parity test) and update Provider Manager /
   `runtimeSelection` for a third engine.
7. Widen `EngineEvent` to cover plan / tool-progress / degraded / sub-agent /
   compact, or define how the harness reconstructs them.

### Bottom line (Codex)

**"LGTM to proceed to Draft v2, not to implementation freeze."** Direction
approved by both reviewers; the contract is not ready to freeze until the must-fix
decisions above land in v2.

### Verification

Docs-only round. `git diff --check` clean. Codex ran read-only; no code edits, no
tests.

## Round 3 — Executable TODO Review

Reviewer: Codex, grounded against Draft v1 plus Round 1 and Round 2.

### Verdict

Do not start implementation from `README.md` as currently written. The real
state is: the direction is approved, but the executable plan is still split
between Draft v1 and review notes. The next real TODO is not M1 contract
scaffolding; it is a Draft v2 reconciliation pass that turns the accepted review
decisions into a new implementation plan.

The core architecture should be:

```text
AnalysisHarness owns SmartPerfetto product semantics.
Each SDK/engine owns its native inner loop and native tool invocation.
Shared SmartPerfetto tool bodies are adapted into SDK-native tool definitions.
```

Any TODO that assumes the harness directly dispatches every tool through
`RuntimeToolSpec.execute()` is the wrong cut.

### P0 TODOs Before Any Runtime Code

1. **Rewrite Draft v1 into Draft v2 before M1.**
   `README.md` still says Pi is deferred to M6, still proposes
   `RuntimeToolSpec.execute()`, still shows a fictional 5-method
   `IOrchestrator`, and still requires legacy snapshot migration. Those points
   conflict with accepted Round 1 / Round 2 decisions.

2. **Add a pre-freeze Pi API spike.**
   This must happen before `RuntimeEngine`, `EngineEvent`, `RuntimeToolSpec`, or
   `EngineState` freeze. The spike should use a real Pi package or a checked-out
   local Pi workspace, not inferred docs. It must answer:
   - Is Pi suitable as a thin native-loop engine?
   - Or does Pi require a stricter external-orchestrator adapter because it owns
     project/session/tool state?
   - Which surface is the right first dependency: `pi-ai` or `pi-agent-core`?
   - Can `.pi` discovery, project extensions, file tools, and shell tools be
     proven disabled?

3. **Decide tool execution ownership explicitly.**
   The accepted decision is engine-owned native loop plus shared tool body:

   ```text
   SharedToolBody + canonical schema
     -> Claude SDK in-process MCP tool
     -> OpenAI Agents function tool
     -> Pi tool definition
     -> standalone MCP descriptor
   ```

   Do not design a harness-level universal tool dispatcher as the primary path.
   It will fight Claude SDK MCP, OpenAI `run_llm_again`, and likely Pi's own tool
   model.

4. **Replace the `IOrchestrator` summary with the real consumed surface.**
   The harness must either implement or deliberately remove/route every consumed
   hook:
   - EventEmitter methods: `on`, `off`, `emit`, `removeAllListeners`
   - core: `analyze`, `reset`, `cleanupSession`
   - intervention: `recordUserInteraction`, `getInterventionController`
   - SDK/session: `getSdkSessionId`, `restoreSessionMapping`
   - architecture cache: `restoreArchitectureCache`, `getCachedArchitecture`
   - report state: `getSessionNotes`, `getSessionPlan`,
     `getSessionUncertaintyFlags`
   - persistence: `takeSnapshot`, `restoreFromSnapshot`

   Also audit the undocumented `getProgressTracker` route usage and either add
   it to the interface or remove the route dependency.

5. **Define SDK-run vs analysis-run semantics.**
   `EngineEvent.done` can only mean "one native SDK run ended." It must not mean
   "SmartPerfetto analysis completed." The harness owns multi-run continuation:
   planning continuation, verifier correction, final-report retry, and fallback
   synthesis.

### P1 TODOs For Draft v2

1. **Add `EngineCapabilities` / policy descriptor.**
   Required fields:
   - resume mode: SDK session id, response id, history, none
   - whether system prompt applies on resume
   - tool schema dialect: Zod, JSON Schema, TypeBox, mixed
   - native tool model: MCP, function tools, Pi tools, external host
   - streaming event kinds supported natively
   - structured output support
   - correction-loop support
   - plan/final-report continuation support
   - sub-agent support
   - tool concurrency behavior
   - abort/close requirements
   - usage/cost granularity

   This should be data that selects harness policy, not `if
   engine.kind === ...` spread through product code.

2. **Make cancellation/disposal mandatory and async.**
   `dispose?(): void` is too weak. The contract needs a mandatory async close or
   abort lifecycle because Claude requires query `close()` and OpenAI requires
   `AbortSignal` plus provider close. Add a cancellation parity test to the first
   implementation milestone that touches engines.

3. **Add a real event parity inventory.**
   Draft v1's `EngineEvent` covers only text/tool/usage/done/error. Before
   implementation, list how existing runtime/projected events map:
   - `progress`
   - `thought`
   - `agent_task_dispatched`
   - `agent_response`
   - `answer_token`
   - `conclusion`
   - `degraded`
   - sub-agent events
   - compact/recovery events
   - route-synthesized `analysis_completed`

   Decide which are native engine events and which are reconstructed by the
   harness or route layer. Then add a parity test for SSE replay and CLI
   rendering.

4. **Choose verifier and continuation policy per engine.**
   Claude has verifier correction loops. OpenAI already has plan and
   final-report continuations. Draft v2 must preserve those differences unless
   it explicitly declares a behavior change and adds tests for it.

5. **Resolve schema source of truth in M2.**
   Open Question #2 should become a decision before tool refactor begins. The
   practical options are:
   - keep Zod as canonical, emit JSON Schema / TypeBox as adapter output
   - move to TypeBox as canonical, adapt Zod/Claude if needed
   - keep current Claude SDK descriptor as source only temporarily and mark it
     as an intermediate compatibility step

   Do not leave canonical schema unresolved while adding Pi.

6. **Record the complexity-classifier decision.**
   Claude and OpenAI paths currently differ. Draft v2 must say whether the
   harness preserves engine-specific classifiers or moves to one shared
   classifier as an intentional behavior change.

### P2 TODOs

1. Frame M3 as extending `runtimeCommon.ts`, not greenfield shared code.
2. Remove legacy snapshot migration work from M5 if the maintainer decision
   remains "break old resume at the refactor cut."
3. Split "Pi support" into:
   - dependency/security spike
   - provider/runtime type support
   - fake-engine adapter test
   - real Pi smoke
   - hidden experimental runtime
   - user-facing option
4. Add a "non-TODO" section to prevent premature work:
   - no Provider Manager UI for Pi before backend smoke
   - no public `SMARTPERFETTO_AGENT_RUNTIME=pi-agent-core` before experiment
     gate
   - no `pi-coding-agent` harness embedding
   - no stable docs update until runtime contracts are proven
5. Add explicit packaging checks for optional Pi dependency before any npm,
   Docker, or portable exposure.

### Recommended New TODO Order

1. **M0.1 Draft v2 reconciliation**
   Apply Round 1 and Round 2 accepted decisions to `README.md`. Update status,
   milestones, contract snippets, snapshot stance, and open questions.

2. **M0.2 Interface and event inventory**
   Add a table of every consumed `IOrchestrator` hook and every runtime/SSE/CLI
   event. Mark each as harness-owned, engine-owned, route-owned, deprecated, or
   removed.

3. **M0.3 Pi contract spike**
   Use real Pi APIs in a throwaway spike. Produce a short evidence note with API
   shape, stream events, tool schema, state/resume model, dependency footprint,
   and security controls.

4. **M1 Contract scaffold**
   Add pure types and fake-engine tests only after M0.1-M0.3 are complete.
   Include `EngineCapabilities`, async close/abort lifecycle, SDK-run vs
   analysis-run semantics, and event mapping.

5. **M2 Shared tool body and schema adapter**
   Extract shared tool body/spec without changing behavior. Keep SDK-native
   tool invocation. Run MCP/OpenAI/standalone adapter tests plus scene
   regression.

6. **M3 Shared run spec and policy selection**
   Grow `runtimeCommon.ts` / `analysisRunSpec` to produce scene, mode, prompt,
   tool scope, provider scope, comparison identity, and continuation policy.

7. **M4 Harness strangler**
   Introduce `AnalysisHarness` as the route-facing orchestrator while Claude and
   OpenAI engines still own their native SDK loops.

8. **M5 Snapshot cutover**
   Split harness state and engine state. If old resume is intentionally broken,
   fail fast on old/unknown shapes and document the cut.

9. **M6 Hidden Pi engine**
   Add Pi behind an experimental env flag, using the result of the Pi spike.
   Start with fake-engine and real smoke tests before any UI exposure.

10. **M7 Public option**
    Only after root `npm run verify:pr`, packaging checks, docs, and provider UI
    tests are complete.

### Bottom Line

The true immediate TODO is **Draft v2 reconciliation + Pi spike**, not contract
scaffolding. Current review evidence says the plan is directionally right but
still too abstract at the exact seams that matter: native SDK loop ownership,
tool ownership, event parity, cancellation, and Pi's real API shape.

### Verification

Docs-only review round. No code changes or tests required beyond Markdown diff
checks when this section is committed.

## Round 4 — Draft v2 Rewrite Review

Reviewer: Codex structured self-review fallback, grounded against the
maintainer's updated direction after Round 3. This is not an independent
read-only review gate; it records the reconciliation applied to Draft v2 because
the current primary agent is Codex.

### Decision Change

Round 3 correctly identified that Draft v1 was not implementation-ready, but its
"Pi spike before any runtime code" ordering is too Pi-driven for the current
product need.

The updated direction is:

```text
Pi-ready, not Pi-driven.

First refactor Claude/OpenAI around shared SmartPerfetto contracts.
Use fake third-party adapter tests to prevent two-engine hardcoding.
Run the real Pi/API spike later, after the extension seams exist.
```

This keeps the architecture extensible while avoiding a dependency on Pi's
unknown API shape before the existing two runtimes are stabilized.

### What Draft v2 Fixes

1. **Public runtime scope stays Claude/OpenAI.**
   `AgentRuntimeKind`, Provider Manager, env parsing, and user-facing runtime
   choices remain scoped to the two current SDKs until a later explicit phase.

2. **Third-party readiness is still tested early.**
   Draft v2 adds a fake third-party adapter milestone so the architecture cannot
   quietly bake in Claude/OpenAI assumptions.

3. **Real Pi work is moved later, not removed.**
   The Pi/API spike becomes M8, after shared tool specs, run specs, capability
   descriptors, registry tests, and fake-engine tests exist.

4. **Tool ownership is corrected.**
   The plan now uses shared SmartPerfetto tool bodies plus SDK-native adapters.
   It explicitly rejects a harness-level universal tool dispatcher as the
   primary production path.

5. **The real `IOrchestrator` surface is acknowledged.**
   Draft v2 lists EventEmitter methods, snapshot hooks, report hooks,
   intervention hooks, architecture cache hooks, and SDK/session hooks.

6. **Event layering is explicit.**
   Internal native engine events are separate from public `StreamingUpdate`
   events. Route-level `analysis_completed` remains route/result-pipeline owned.

7. **Snapshot rewrite is delayed.**
   Early phases preserve `SessionStateSnapshot` v1. Splitting harness state from
   engine state is M7, after the harness path is proven.

8. **Testing is phase-specific.**
   Each milestone names focused Jest suites, type/build checks, scene trace
   regression requirements, and the root `npm run verify:pr` gate for default
   switches or user-facing runtime exposure.

### Remaining Review Questions

1. Should M4 adopt shared preparation one runtime at a time? Recommended answer:
   yes, unless the shared code is too entangled to review independently.
2. Should the harness first exist only as a test-only factory? Recommended
   answer: yes, then hidden flag, then default switch.
3. Should snapshot v2 preserve v1 resume compatibility? Leave this undecided
   until M7, because the earlier phases do not need that risk.
4. Should classifier behavior be unified? Recommended answer: no for this
   refactor. Preserve Claude/OpenAI differences until a separate behavior-change
   plan exists.

### Bottom Line

Draft v2 is now the correct development guide for the next implementation pass.
It is intentionally conservative: current Claude/OpenAI behavior is protected
first; future third-party/Pi extensibility is enforced by contracts and fake
adapter tests before any real Pi dependency enters the repo.

### Verification

Docs-only review round. Run Markdown diff checks for both files before treating
M0 as complete.

## Round 5 — M1 Implementation Self-Check

Reviewer: Codex structured self-check, backed by focused tests and scene trace
regression.

### Scope

M1 characterization / inventory tests only. No production runtime code was
changed.

### Implemented

- Added an `IOrchestrator` consumed-hook inventory test.
- Added a `StreamingUpdate` public event inventory test covering route terminal
  events and CLI final-answer filtering.
- Added a `SessionStateSnapshot` v1 runtime-state inventory test covering
  Provider Manager runtime values, provider pinning fields, Claude SDK state,
  and OpenAI response/history state.
- Expanded runtime selection tests for default behavior, provider metadata,
  snapshot-over-env precedence, and explicit Provider Manager bypass.
- Expanded tool tests for request-scoped code-aware gating, standalone MCP
  refusal of code-aware tools, and OpenAI adapter fail-closed behavior.

### Self-Check

- Architecture still matches Draft v2: characterize first, no abstraction
  introduced yet.
- Provider Manager/runtime provider pinning semantics were not changed.
- Public `AgentRuntimeKind` remains Claude/OpenAI only.
- Public `IOrchestrator`, `StreamingUpdate`, report, CLI, snapshot, and SSE
  contracts were not changed.
- No Pi production dependency, public env value, packaging exposure, or Provider
  Manager UI change was introduced.
- Rollback is deleting the M1 characterization tests.

### Verification

- Focused Jest: 9 suites, 75 tests passed.
- `cd backend && npx tsc --noEmit`: passed.
- `cd backend && npm run test:scene-trace-regression`: passed all 6 canonical
  traces.
- `git diff --check`: passed.

### Verdict

M1 gate passed. M2 can start from the shared tool body and SDK-native adapter
refactor.

## Round 6 — M2 Implementation Self-Check

Reviewer: Codex structured self-check, backed by focused tests and scene trace
regression.

### Scope

M2 shared tool body and SDK-native adapters.

### Implemented

- Added `SharedToolSpec` as the internal SmartPerfetto tool-body contract.
- Generated Claude SDK descriptors from shared specs while keeping existing
  `registerSdk` call sites compatible.
- Changed OpenAI function tools and standalone MCP descriptors/calls to read
  shared specs instead of treating Claude SDK descriptors as canonical.
- Added a fake third-party adapter test that consumes shared specs without
  adding a production runtime value.
- Preserved ACI default summary behavior: absent explicit summary still emits
  `''`.

### Self-Check

- Architecture still follows Draft v2: SDKs own native loops and native tool
  invocation; shared tool body is adapted outward.
- Provider Manager/runtime provider pinning, public runtime values, snapshot,
  SSE, CLI, report, and `IOrchestrator` contracts were not changed.
- No prompt, scene, Skill count, or output contract was hardcoded.
- No Pi dependency, public Pi env value, packaging exposure, or Provider
  Manager UI change was introduced.
- Rollback is reverting the shared tool spec bridge and restoring direct Claude
  descriptor extraction.

### Verification

- Focused Jest: 4 suites, 40 tests passed.
- `cd backend && npx tsc --noEmit`: passed.
- `cd backend && npm run test:scene-trace-regression`: passed all 6 canonical
  traces.
- `git diff --check`: passed.

### Verdict

M2 gate passed. M3 can start from `AnalysisRunSpec` shadow mode.

## Round 7 — M3 Implementation Self-Check

Reviewer: Codex structured self-check, backed by focused tests, build, and
scene trace regression.

### Scope

M3 `AnalysisRunSpec` shadow mode.

### Implemented

- Added `AnalysisRunSpec` as a pure shared request-preparation snapshot.
- Captured identity, provider/knowledge scope, output language, scene input,
  classifier input/policy, trace context prompt section, selection context,
  tool request scope, runtime selection, continuation policy, and budget inputs.
- Reused `runtimeCommon.ts` and `queryComplexityContext.ts` instead of
  duplicating existing helper logic.
- Exported the helper from `agentRuntime/index.ts` for later M4 adoption.
- Kept production Claude/OpenAI loops from consuming the spec in M3.

### Self-Check

- Architecture still follows Draft v2: run-spec/policy exists as a shadow
  contract before runtime adoption.
- Claude/OpenAI classifier differences are preserved as policy data, not
  unified.
- Provider Manager/runtime provider pinning, public runtime values, snapshot,
  SSE, CLI, report, and `IOrchestrator` contracts were not changed.
- No prompt, scene, Skill count, or output contract was hardcoded.
- No Pi dependency, public Pi env value, packaging exposure, or Provider
  Manager UI change was introduced.
- Rollback is deleting the shadow spec, its test, and its export.

### Verification

- Focused Jest: 3 suites, 44 tests passed.
- `cd backend && npx tsc --noEmit`: passed.
- `cd backend && npm run test:scene-trace-regression`: passed all 6 canonical
  traces.
- `cd backend && npm run build`: passed.
- `git diff --check`: passed.

### Verdict

M3 gate passed. M4 can start adopting shared preparation into Claude/OpenAI
runtimes incrementally.

## Round 8 - M4 Implementation Self-Check

Reviewer: Codex structured self-check, backed by focused tests, build, scene
trace regression, and attempted OpenAI startup E2E.

### Scope

M4 conservative shared-preparation adoption inside the existing Claude/OpenAI
runtimes.

### Implemented

- Passed the resolved runtime-selection snapshot from `runtimeSelection.ts` into
  runtime instances.
- Built `AnalysisRunSpec` in Claude/OpenAI analyze paths after existing scene
  and mode classification.
- Replaced local preparation reads where parity coverage already existed:
  provider scope, knowledge scope, trace context prompt section, session map
  key, previous-turn context, and runtime budget/policy snapshots.
- Kept Claude SDK query and OpenAI `Runner/Agent` loops native.
- Kept Claude verifier/correction and OpenAI continuation ownership in their
  existing runtimes.
- Kept snapshot v1, public events, report, CLI, route suppression, and Provider
  Manager UI unchanged.

### Self-Check

- Architecture still follows Draft v2: M4 adopts shared preparation but does
  not introduce the M6 harness.
- Provider Manager/runtime provider pinning is preserved by passing the resolved
  selection snapshot into the runtime instance.
- Public `AgentRuntimeKind` remains Claude/OpenAI only.
- Public `IOrchestrator`, `StreamingUpdate`, report, CLI, snapshot, and SSE
  contracts were not changed.
- No prompt, scene list, Skill count, or output contract was hardcoded.
- No Pi production dependency, public Pi env value, packaging exposure, or
  Provider Manager UI change was introduced.
- Rollback is reverting the M4 adoption sites or guarding them behind a
  runtime-internal flag.

### Verification

- Focused Jest: 8 suites, 126 tests passed.
- `cd backend && npm run typecheck`: passed.
- `cd backend && npm run build`: passed.
- `cd backend && npm run test:scene-trace-regression`: passed all 6 canonical
  traces.
- `git diff --check`: passed.
- `cd backend && npm run verify:e2e:openai-startup`: failed because the
  configured OpenAI-compatible provider returned
  `AI analysis failed: 429 Insufficient balance or no resource package. Please
  recharge.`

### Verdict

M4 local gates passed, but the milestone gate is blocked by external OpenAI
startup E2E quota. M5 must not start until a working provider is available, an
explicit maintainer waiver/alternate E2E gate is recorded, or the M4 adoption is
reverted/guarded.

### Follow-Up Retry

At 2026-05-31 19:38:54 CST, `cd backend && npm run
verify:e2e:openai-startup` was retried and failed with the same provider
response:

`AI analysis failed: 429 Insufficient balance or no resource package. Please recharge.`

This does not change the verdict. M4 remains blocked, and M5 remains gated.

### Third Attempt

At 2026-05-31 19:40:22 CST, `cd backend && npm run
verify:e2e:openai-startup` was retried again and failed with the same provider
response:

`AI analysis failed: 429 Insufficient balance or no resource package. Please recharge.`

This is the third consecutive goal turn with the same external M4 E2E blocker.
M5 remains gated.

### Gate Cleared

At 2026-05-31 19:53:08 CST, `cd backend && npm run
verify:e2e:openai-startup` passed after the provider was recharged.

Evidence:
- `backend/test-output/e2e-openai-startup-real.json`
- `backend/logs/sessions/session_agent-1780227841062-d0jqh9ms_2026-05-31T11-44-01-062Z.jsonl`
- Report URL:
  `/api/reports/agent-report-agent-1780227841062-d0jqh9ms-1780228369773-siw8m3`

The successful run reports `passed: true`, no SSE errors, plan submission,
architecture detection, data envelopes, final report evidence, claim verifier
passed with 0 unsupported claims, and required startup evidence text.

M4 gate is now passed. M5 can start without a waiver.

## Round 9 - M5 Implementation Self-Check

Reviewer: Codex structured self-check, backed by focused tests, build, and
scene trace regression.

### Scope

M5 runtime registry, `EngineCapabilities`, and fake third-party runtime tests.

### Implemented

- Added internal `EngineCapabilities` for Claude and OpenAI.
- Added runtime registry support for registered definitions, capability lookup,
  duplicate/mismatch protection, and factory invocation.
- Moved production orchestrator creation through the registry while preserving
  OpenAI lazy import and the resolved runtime-selection snapshot.
- Moved `AnalysisRunSpec` classifier and continuation policies to
  capabilities.
- Added test-only fake third-party runtime coverage proving internal extension
  without public runtime expansion.

### Self-Check

- Architecture still follows Draft v2: registry/capabilities exist before M6
  harness and do not replace SDK-native loops.
- Provider Manager/runtime provider pinning and explicit provider errors remain
  preserved.
- Public `AgentRuntimeKind` remains Claude/OpenAI only.
- Public `IOrchestrator`, `StreamingUpdate`, report, CLI, snapshot, and SSE
  contracts were not changed.
- No prompt, scene list, Skill count, or output contract was hardcoded.
- No Pi production dependency, public Pi env value, packaging exposure, or
  Provider Manager UI change was introduced.
- Rollback is reverting the registry/capabilities files and returning
  `runtimeSelection.ts` to direct factory selection.

### Verification

- Focused Jest: 4 suites, 45 tests passed.
- Additional `AnalysisRunSpec` Jest: 1 suite, 3 tests passed.
- `cd backend && npx tsc --noEmit`: passed.
- `cd backend && npm run build`: passed.
- `cd backend && npm run test:scene-trace-regression`: passed all 6 canonical
  traces.
- `git diff --check`: passed.

### Verdict

M5 gate passed. M6 can start as a hidden/test-only `AnalysisHarness` strangler
only after reading the driver files again.

## Round 10 - M6 Implementation Self-Check

Reviewer: Codex structured self-check, backed by focused tests, build, and
scene trace regression.

### Scope

M6 hidden/test-only `AnalysisHarness` strangler. No default path switch.

### Implemented

- Added `AnalysisHarness` as an `IOrchestrator` wrapper around an existing
  engine orchestrator.
- Delegated `analyze` and `reset` to the wrapped engine.
- Bridged engine `update` events through the harness.
- Preserved optional-hook presence semantics by assigning optional forwarding
  methods only when the wrapped engine exposes the hook.
- Added focused tests for required delegation, event bridging, optional-hook
  parity, and no production runtime registration.

### Self-Check

- Architecture still follows Draft v2: harness exists hidden/test-only and does
  not replace SDK-native loops.
- Provider Manager/runtime provider pinning remains unchanged.
- Public `AgentRuntimeKind` remains Claude/OpenAI only.
- Public `IOrchestrator`, `StreamingUpdate`, report, CLI, snapshot, and SSE
  contracts were not changed.
- The harness does not synthesize route-owned `analysis_completed`.
- No prompt, scene list, Skill count, or output contract was hardcoded.
- No Pi production dependency, public Pi env value, packaging exposure, or
  Provider Manager UI change was introduced.
- Rollback is deleting the hidden harness file and its tests.

### Verification

- Harness-focused Jest: 5 suites, 27 tests passed.
- M6 wider focused Jest: 12 suites, 179 tests passed.
- `cd backend && npx tsc --noEmit`: passed.
- `cd backend && npm run build`: passed.
- `cd backend && npm run test:scene-trace-regression`: passed all 6 canonical
  traces.
- `git diff --check`: passed.
- Root `npm run verify:pr`: not required because M6 did not switch the harness
  into the default path.

### Verdict

M6 gate passed as a hidden/test-only strangler. M7 can start only after the
driver files confirm whether this level of harness stability is sufficient for
snapshot state split.

## Round 11 - M7 Go/No-Go Self-Check

Reviewer: Codex structured self-check against the M7 precondition.

### Scope

M7 snapshot state split decision only. No snapshot code was changed.

### Finding

M7 should not start yet. `README.md` says snapshot state split should happen
only if the harness has become the default path. M6 intentionally kept
`AnalysisHarness` hidden/test-only and did not switch `createAgentOrchestrator`,
routes, CLI, reports, or snapshots to the harness.

### Decision

M7 is blocked on maintainer direction:
- promote/flag harness default first and run root `npm run verify:pr`,
- defer M7 while keeping harness hidden/test-only, or
- explicitly waive the default-harness prerequisite and accept the snapshot
  split risk with the full M7/root verification gate.

### Verdict

M7 is not safe to execute automatically in the current state.

## Round 12 - Harness Default/Parity Self-Check

Reviewer: Codex structured self-check, backed by focused tests, OpenAI startup
E2E, root `verify:pr`, and post-diff inspection.

### Scope

M7 prerequisite only: promote/flag `AnalysisHarness` into a comparable default
route-facing path before any snapshot state split.

### Implemented

- `createAgentOrchestrator` now creates the selected production Claude/OpenAI
  engine through the runtime registry, then wraps it with `AnalysisHarness` by
  default.
- `SMARTPERFETTO_ANALYSIS_HARNESS=0` restores the direct engine path.
- Public `AgentRuntimeKind`, Provider Manager schemas/UI, accepted
  `SMARTPERFETTO_AGENT_RUNTIME` values, snapshot shape, report/CLI/SSE
  contracts, and Pi path remain unchanged.
- `runtimeToolSpec.ts` no longer imports the transitive MCP SDK package
  directly; result/annotation types are derived from the Claude SDK descriptor.
- The Jest Claude SDK mock now matches the real SDK descriptor shape while
  preserving the old `schema` alias for existing tests.

### Self-Check

- Architecture still follows Draft v2: the harness is a route-facing wrapper,
  while SDK inner loops and SDK-native tool invocation remain engine-owned.
- Provider Manager/runtime provider pinning remains intact because selection
  happens before wrapping.
- Public runtime values are unchanged; no third-party production runtime or Pi
  dependency was introduced.
- Public `StreamingUpdate`, route-owned `analysis_completed`, report, CLI,
  snapshot, and SSE contracts were not changed.
- No prompt, scene list, Skill count, tool list, or output contract was
  hardcoded.
- Rollback is scoped and immediate through `SMARTPERFETTO_ANALYSIS_HARNESS=0`.

### Verification

- Runtime selection focused Jest: 1 suite, 14 tests passed.
- Wider harness/default focused Jest: 13 suites, 184 tests passed.
- Tool/runtime/harness focused Jest: 6 suites, 59 tests passed.
- Claude runtime/mock compatibility Jest: 4 suites, 130 tests passed.
- `cd backend && npx tsc --noEmit`: passed.
- `cd backend && npm run build`: passed.
- `cd backend && npm run verify:e2e:openai-startup`: passed with default
  harness wrapping the OpenAI path.
- `cd backend && npm run test:core`: passed, 62 suites, 703 tests.
- Root `npm run verify:pr`: passed, including quality, frontend prebuild,
  Rust verify, backend validation/typecheck/build/CLI pack/core tests, and all
  6 scene trace regression traces.
- `git diff --check`: passed before doc updates.

### Verdict

Harness default/parity prerequisite passed. M7 snapshot split may be planned
next, but it still needs its own implementation plan, focused coverage for
snapshot/report/CLI/SSE surfaces, scene regression, root `verify:pr`, and a
separate post-diff self-check.

## Round 13 - M7 Implementation Self-Check

Reviewer: Codex structured self-check, backed by focused tests, route/resume
coverage, scene trace regression, and root `verify:pr`.

### Scope

M7 compatible snapshot state split. The milestone adds a canonical
engine-local state boundary while preserving legacy top-level mirrors.

### Implemented

- Added canonical `engineState` to `SessionStateSnapshot`.
- Added typed Claude/OpenAI engine-state builders, runtime/provider helper
  getters, and `normalizeSessionStateSnapshot` for legacy v1 mirrors.
- Updated persistence load paths to normalize direct snapshots and reconstructed
  legacy runtime-array snapshots.
- Updated Claude runtime snapshots to write canonical Claude engine state and
  restore SDK session id/mode through the helper.
- Updated OpenAI runtime snapshots to write canonical OpenAI engine state and
  restore history, last response id, and run state through the helper.
- Updated HTTP analyze restore, explicit `/resume`, and CLI artifact config
  code to read runtime/provider metadata through helper functions.
- Kept legacy top-level mirrors writable so rollback and old-session
  compatibility remain intact.

### Self-Check

- Architecture still follows Draft v2: engine-local snapshot state is explicit,
  while product/report state remains top-level.
- Provider Manager/runtime provider pinning is preserved through helper reads
  that prefer `engineState.provider` and fall back to legacy fields.
- Public `AgentRuntimeKind`, accepted `SMARTPERFETTO_AGENT_RUNTIME` values,
  `IOrchestrator`, `StreamingUpdate`, route-owned `analysis_completed`,
  report, CLI, and SSE contracts were not changed.
- No prompt, scene list, Skill count, tool list, or output contract was
  hardcoded.
- No Pi production dependency, public Pi env value, packaging exposure, or
  Provider Manager UI change was introduced.
- Rollback is scoped because legacy mirrors are still emitted in M7 snapshots.

### Verification

- Focused non-route Jest: 8 suites, 97 tests passed.
- Route/resume/SSE Jest: 1 suite, 10 tests passed with `--forceExit`.
- `cd backend && npx tsc --noEmit`: passed.
- `cd backend && npm run build`: passed.
- `cd backend && npm run test:scene-trace-regression`: passed all 6 canonical
  traces.
- Root `npm run verify:pr`: passed, including quality, frontend prebuild,
  Rust verify, backend validation/typecheck/build/CLI pack/core tests, and all
  6 scene trace regression traces.
- `git diff --check`: passed.

### Verdict

M7 gate passed. M8 may start as an evidence-only Pi/third-party API spike; it
must not add a production dependency, public runtime value, Provider Manager UI,
packaging exposure, or product runtime path.

## Round 14 - M8 Pi / Third-Party API Spike Self-Check

Reviewer: Codex structured self-check, backed by npm registry metadata,
tarball/type inspection, and a safe temp-directory import smoke.

### Scope

M8 evidence-only Pi/third-party API spike. No production dependency, runtime
selection value, Provider Manager UI, packaging path, or product runtime import
was added.

### Evidence

- Unscoped `pi-ai@0.0.1` and `pi-agent-core@0.0.1` are placeholder
  package-name reservations and expose no usable SmartPerfetto runtime API.
- `@earendil-works/pi-ai@0.78.0` is a lower-level provider/model substrate with
  TypeBox-backed tool schemas and provider stream events.
- `@earendil-works/pi-agent-core@0.78.0` exposes a plausible thin agent-core
  surface: `Agent`, `agentLoop`, native tool execution, lifecycle/tool events,
  abort support, and in-memory/session storage primitives.
- `@earendil-works/pi-coding-agent@0.78.0` is a broad coding-agent
  CLI/SDK/harness with built-in file/shell tools and resource discovery. It
  should not be embedded as SmartPerfetto's production orchestrator.
- A safe temp install/import smoke for `@earendil-works/pi-agent-core` passed
  outside the repo with isolated `HOME`, `--ignore-scripts`, and a TypeBox
  `noop` tool.

### Self-Check

- Architecture still follows Draft v2: M8 only validates the future
  third-party surface after the registry, shared tool body, harness, and
  snapshot seams exist.
- Provider Manager/runtime provider pinning remains unchanged.
- Public `AgentRuntimeKind` and accepted `SMARTPERFETTO_AGENT_RUNTIME` values
  remain Claude/OpenAI only.
- Public `IOrchestrator`, `StreamingUpdate`, route-owned
  `analysis_completed`, report, CLI, snapshot, and SSE contracts were not
  changed.
- No prompt, scene list, Skill count, tool list, or output contract was
  hardcoded.
- No Pi production dependency, public Pi env value, packaging exposure, or
  Provider Manager UI change was introduced.

### Verification

- Package metadata, tarball contents, README/API/type declarations, exports,
  binaries, dependency footprints, and security/discovery controls were
  recorded in `pi-spike.md`.
- Safe import smoke passed for `@earendil-works/pi-agent-core`.
- `git diff --check` passed.
- No-index whitespace checks for runtime-engine-contract docs passed.
- Pi/public-third-party scan found no production Pi runtime value, Provider
  Manager UI change, package manifest change, or production Pi import.

### Verdict

M8 evidence gate passed. The next implementation step is M9, but it must not
start automatically: the M9 checklist explicitly requires a maintainer go
decision before introducing a real hidden optional third-party runtime.

## Round 15 - M9 Hidden Runtime Self-Check

Reviewer: Codex structured self-check, backed by focused tests, hidden
real-package smoke, scene trace regression, root `verify:pr`, and post-diff
inspection.

### Scope

M9 hidden experimental third-party runtime. This does not expose a public
runtime option, Provider Manager UI, public `AgentRuntimeKind`, or public
`SMARTPERFETTO_AGENT_RUNTIME=pi-*` value.

### Implemented

- Added hidden internal runtime kind `experimental-pi-agent-core`.
- Added hidden env gating through
  `SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME=1` and
  `SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME=experimental-pi-agent-core`.
- Kept public `SMARTPERFETTO_AGENT_RUNTIME` Claude/OpenAI-only and fail-closed
  for `experimental-pi-agent-core`.
- Added dynamic optional import and explicit module-path support for
  `@earendil-works/pi-agent-core`.
- Added Pi agent-core capabilities for TypeBox-like tool schema, Pi event
  model, agent abort, sequential request-scoped tool execution, no external
  discovery, and no built-in shell/file tools.
- Added Pi-like shared tool adapter, event projector, and hidden smoke runtime.
- Integrated hidden runtime selection through the runtime registry only when
  the hidden kind is selected.
- Updated CLI runtime guard so the hidden runtime is not treated as Claude.

### Self-Check

- Architecture still follows Draft v2: native engine loops own execution, while
  SmartPerfetto keeps the route-facing harness and public stream/result
  contracts.
- Provider Manager/runtime provider pinning remains intact: provider and
  snapshot selections still win before hidden env selection.
- Public `AgentRuntimeKind` and public `SMARTPERFETTO_AGENT_RUNTIME` values
  remain Claude/OpenAI only.
- Public `IOrchestrator`, `StreamingUpdate`, route-owned
  `analysis_completed`, report, CLI, snapshot, and SSE contracts were not
  changed.
- The Pi event projector never emits route-owned `analysis_completed`.
- No prompt, scene list, Skill count, tool list, or output contract was
  hardcoded.
- No production Pi dependency, manifest dependency, Provider Manager UI,
  `.pi` discovery, project extensions, built-in shell tools, or built-in file
  tools were introduced.
- Rollback is scoped: unset hidden env vars, or remove the hidden registry
  definition and adapter. Claude/OpenAI imports and packaging stay independent.

### Verification

- M9 focused Jest: 6 suites, 44 tests passed.
- Hidden real-package smoke with the M8 temp install of
  `@earendil-works/pi-agent-core`: passed.
- `cd backend && npx tsc --noEmit`: passed.
- `cd backend && npm run test:scene-trace-regression`: passed all 6 canonical
  traces.
- Root `npm run verify:pr`: passed, including quality, frontend prebuild, Rust
  verify, backend validation/typecheck/build/CLI package check, `test:core`
  with 62 suites and 709 tests, trace processor ensure, and all 6 scene trace
  regression traces.
- `git diff --check`: passed.
- No-index whitespace checks for untracked files passed.
- Package/public-surface scan found no package manifest dependency or Provider
  Manager UI change.

### Verdict

M9 gate passed. M10 must not start automatically because it would intentionally
expand public Provider Manager/runtime/UI/docs/packaging surface and needs a
separate maintainer go decision.

## Round 16 - M10 Public Runtime Self-Check

Reviewer: Codex structured self-check, backed by focused tests, public Pi
smoke, package smokes, frontend prebuild regeneration, scene trace regression,
root `verify:pr`, and post-diff inspection.

### Scope

M10 user-facing Pi Agent Core runtime option. This intentionally expands public
runtime/provider/UI/docs/packaging surface after M9 hidden runtime success.

### Implemented

- Added public `pi-agent-core` runtime kind and production
  `EngineCapabilities`.
- Restricted Provider Manager public Pi selection to custom providers with
  Pi-specific model JSON/config fields.
- Added Provider Manager env mapping, masking, route validation, connection
  tester validation, runtime health, CLI runtime guard, env credential sources,
  runtime registry, and snapshot engine-state typing for public Pi.
- Kept the hidden `experimental-pi-agent-core` path as the rollback/compat
  path.
- Updated AI Assistant provider form/switcher source and regenerated the
  committed `frontend/` prebuild.
- Added `@earendil-works/pi-agent-core` as an optional backend dependency and
  recorded package install smokes for default and `--omit=optional` installs.
- Updated user docs, architecture docs, env examples, and project description
  with public-preview capability limits and rollback notes.

### Self-Check

- Architecture follows Draft v2: SmartPerfetto keeps the route-facing harness
  and product contracts, while Pi Agent Core owns its native loop and
  request-scoped native tool execution.
- Provider Manager/runtime provider pinning is preserved. Existing explicit
  provider and snapshot choices still win over env/default fallback.
- Public `AgentRuntimeKind` is intentionally widened only in M10.
- Claude/OpenAI paths remain first-class and unchanged in selection precedence.
- Public `IOrchestrator`, `StreamingUpdate`, route-owned
  `analysis_completed`, report, CLI, and SSE contracts remain unchanged.
- Snapshot state adds typed public Pi engine-local state only; product/report
  state remains outside engine-local state.
- The Pi runtime projector never emits route-owned `analysis_completed`.
- No prompt, scene list, Skill count, tool list, or output contract was
  hardcoded.
- `.pi` discovery, project extensions, built-in shell tools, and built-in file
  tools remain disabled/not used by SmartPerfetto.
- Rollback is scoped: revert public Provider Manager/UI/docs/package exposure
  and fall back to Claude/OpenAI or the M9 hidden gate.

### Verification

- M10 focused Jest: 10 suites, 103 tests passed.
- Public Pi `createAgentOrchestrator` smoke: passed with public-preview
  termination metadata and no runtime `analysis_completed` event.
- `cd backend && npx tsc --noEmit`: passed.
- `cd backend && npm run build`: passed.
- `cd backend && npm run cli:pack-check`: passed.
- `cd backend && npm run test:scene-trace-regression`: passed all 6 canonical
  traces.
- `./scripts/update-frontend.sh`: passed.
- `npm run check:frontend-prebuild`: passed.
- npm pack/default install smoke: passed and installed optional
  `@earendil-works/pi-agent-core`.
- npm pack `--omit=optional` install smoke: passed and omitted
  `@earendil-works/pi-agent-core`.
- Root `npm run verify:pr`: passed, including quality, frontend prebuild,
  Rust verify, backend validation/typecheck/build/CLI package check,
  `test:core` with 62 suites and 712 tests, trace processor ensure, and all 6
  scene trace regression traces.
- `git diff --check`: passed.
- No-index whitespace checks for untracked files passed.

### Verdict

M10 gate passed. Runtime-engine-contract Draft v2 M1-M10 are complete, with
Pi Agent Core exposed as an optional, capability-limited public preview and
Claude/OpenAI protected by the full PR gate.

## Round 17 - Post-M10 Three-Agent E2E Self-Check

Reviewer: Codex structured self-check, backed by focused tests, OpenAI/Pi E2E
evidence, Claude E2E reruns, typecheck, scene trace regression, and log scans.

### Scope

User-added post-M10 gate: run startup and scrolling E2E for Claude, OpenAI, and
Pi Agent Core; monitor output; fix abnormalities; rerun until clean.

### Implemented

- Fixed Claude SDK event bridge handling for SDK `system/status` and
  `rate_limit_event` messages.
- Enforced startup Final Report Contract completeness in Claude verifier.
- Made verifier JSON parsing robust to markdown/prose around JSON arrays.
- Converted Claude correction retry to text-only, with no MCP server, no
  allowed tools, and no resume of the full SDK conversation.
- Added a skip guard so deliverable non-truncated reports do not spend extra
  SDK quota on optional correction.
- Backfilled concurrent/late tool result phase attribution to recently
  completed semantic phases.
- Added Pi public-preview fake-stream claim-verification metadata and
  capability-limited E2E smoke support.

### Self-Check

- Architecture remains Draft v2 compliant: SDK-native loops own main execution,
  while SmartPerfetto owns the harness, verifier, event projection, report, and
  snapshot surfaces.
- Provider Manager/runtime pinning is unchanged.
- Public `AgentRuntimeKind` is unchanged after M10.
- No prompt/tool list/scene list/Skill count/output contract was hardcoded.
- No unplanned Pi production dependency or UI change was introduced.
- Rollback remains local to the Post-M10 Claude verifier/runtime/bridge/MCP
  attribution changes and the Pi smoke/script preview metadata changes.

### Verification

- Focused Jest passed: 5 suites, 206 tests.
- `cd backend && npx tsc --noEmit`: passed.
- `cd backend && npm run test:scene-trace-regression`: passed all 6 traces.
- OpenAI startup strict E2E: passed.
- OpenAI scrolling strict E2E: passed.
- Pi startup public-preview smoke: passed.
- Pi scrolling public-preview smoke: passed.
- Claude startup strict E2E reruns found and drove fixes for correction
  timeout, verifier JSON-repair noise, phase attribution, and extra correction
  quota use.
- Latest Claude startup rerun after those fixes is blocked before agent work by
  external Claude SDK quota:
  `You've hit your session limit · resets 6am (Asia/Shanghai)`.
- Claude scrolling strict E2E remains pending until Claude SDK quota is
  available again.

### Verdict

Post-M10 code-level fixes are locally green under focused Jest, typecheck, and
scene regression, and OpenAI/Pi E2E evidence is green. The final three-agent E2E
matrix is not complete: Claude startup/scrolling must be rerun after quota reset
or restoration, followed by log scans and root `npm run verify:pr`.

## Round 18 - M11 Pi Parity Design Self-Check

Reviewer: Codex structured self-check, source-grounded against the current
SmartPerfetto runtime files and local `@earendil-works/pi-agent-core@0.78.0`
package declarations.

### Scope

M11 Pi Agent Core Claude-parity analysis runtime. This is not a new public
runtime value; it deepens the already public `pi-agent-core` runtime from
capability-limited preview toward real SmartPerfetto analysis.

### Findings

- Current Pi adapter uses `tools: []`, blocks every tool call, uses only an
  env-provided system prompt, and returns `partial: true` /
  `plan_incomplete` with preview `not_checked` claim verification.
- Pi Agent Core itself supports the primitives SmartPerfetto needs for parity:
  native agent loop, system prompt/model state, request-scoped tools,
  sequential tool execution, lifecycle/tool events, abort, session id, and
  dynamic API key resolution.
- SmartPerfetto already has the needed shared seams from M1-M10:
  `AnalysisRunSpec`, `EngineCapabilities`, `McpToolRegistry.shared`,
  `createPiAgentCoreToolFromSharedSpec`, `AnalysisHarness`, and route-owned
  claim verification/report finalization.

### Design Guardrails

- Reuse `buildSystemPrompt` / `buildQuickSystemPrompt` and
  `createClaudeMcpServer` shared tool definitions instead of duplicating prompt
  or tool contracts in Pi code.
- Keep Pi's inner loop native: pass Pi Agent Core `AgentTool`s and let the SDK
  execute them.
- Keep route-owned terminal events; Pi runtime must not emit
  `analysis_completed`.
- Separate fake-stream smoke mode from real model-backed analysis in result
  metadata and verification.
- Do not introduce `.pi` discovery, Pi coding-agent harness, shell/file tools,
  or Provider Manager UI changes in M11.

### Verdict

Design is implementable without a big-bang rewrite. Proceed with focused Pi
runtime changes and parity tests, then run typecheck and scene trace
regression. Real Pi startup/scrolling E2E remains gated on model/API
configuration; fake-stream smoke cannot close that gate.

## Round 19 - M11 Pi Parity Implementation Self-Check

Reviewer: Codex structured self-check, backed by focused Jest, typecheck, scene
trace regression, strict real Pi startup/scrolling E2E, and post-diff
inspection.

### Scope

M11 Pi Agent Core Claude-parity implementation. This deepens the existing
public `pi-agent-core` runtime; it does not add a new runtime value, Provider
Manager UI surface, or dependency exposure.

### Implemented

- Kept fake-stream as explicit smoke/test-only preview behavior.
- Built real Pi analysis from shared SmartPerfetto preparation:
  `AnalysisRunSpec`, scene/focus/architecture detection, trace-completeness
  context, and shared prompt builders.
- Built Pi request-scoped tools from `createClaudeMcpServer` shared MCP tool
  definitions, including SQL, Skill, schema lookup, planning, hypothesis, and
  notes tools.
- Projected Pi lifecycle/tool events into normal SmartPerfetto progress/tool
  events without leaking message deltas, raw tool floods, thoughts, or
  route-owned `analysis_completed`.
- Removed preview verification metadata from real Pi results so the route
  quality pipeline owns claim support and verification.
- Sanitized model JSON handling so secret fields are not copied into model
  state.
- Selected final-report-like assistant output over bookkeeping messages for
  real Pi conclusions.

### Self-Check

- Architecture follows Draft v2: Pi Agent Core owns the native loop and native
  tool execution; SmartPerfetto owns setup, tools, event projection, reports,
  snapshots, and route finalization.
- Provider Manager/runtime pinning is preserved.
- No prompt, tool list, scene list, Skill count, or output contract was
  hardcoded in Pi code.
- Public `IOrchestrator`, `StreamingUpdate`, route-owned
  `analysis_completed`, report, CLI, snapshot, and SSE contracts remain
  unchanged.
- `.pi` discovery, Pi coding-agent harness, shell/file tools, package
  extensions, and extra Provider Manager UI changes remain out of the product
  path.
- Rollback is scoped to restoring the M10 preview adapter and keeping
  `SMARTPERFETTO_PI_AGENT_CORE_FAKE_STREAM=1` smoke mode.

### Verification

- Focused Pi Jest: 1 suite, 12 tests passed.
- Combined runtime-focused Jest: 5 suites, 210 tests passed.
- `cd backend && npx tsc --noEmit`: passed.
- `cd backend && npm run test:scene-trace-regression`: passed all 6 canonical
  traces.
- `git diff --check`: passed before the final driver-doc update.
- Pi startup strict real-model E2E: passed with
  `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues,
  `agentTaskDispatchedCount=35`, `agentResponseCount=35`,
  `dataEnvelopeItemCount=37`, and a non-partial final report.
- Pi scrolling strict real-model E2E: passed with
  `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues,
  `agentTaskDispatchedCount=25`, `agentResponseCount=25`,
  `dataEnvelopeItemCount=28`, and a non-partial final report.

### Verdict

M11 gate passed. Pi Agent Core is no longer only a capability-limited fake
preview path; real model-backed startup and scrolling analysis now runs through
the shared SmartPerfetto analysis contract.

## Round 20 - Final Three-Agent Matrix Retry

Reviewer: Codex structured self-check, backed by OpenAI/Pi final E2E evidence
and current Claude retry outputs.

### Scope

User-added final gate: after M11, run startup and scrolling E2E for
`claude-agent-sdk`, `openai-agents-sdk`, and `pi-agent-core`, monitor output,
fix abnormalities, and rerun until all three agents are clean.

### Verification

- OpenAI startup strict E2E after M11: passed with
  `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues,
  `dataEnvelopeItemCount=36`, and a non-partial final report.
- OpenAI scrolling strict E2E after M11: passed with
  `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues,
  `dataEnvelopeItemCount=27`, and a non-partial final report.
- Pi startup/scrolling strict real-model E2E: passed in Round 19.
- Claude startup retry at `2026-06-01 03:22:30 CST`: failed before agent work
  with `You've hit your session limit · resets 6am (Asia/Shanghai)`;
  `agentTaskDispatchedCount=0`, `dataEnvelopeItemCount=0`.
- Claude scrolling retry immediately after startup: failed before agent work
  with the same Claude SDK session-limit message;
  `agentTaskDispatchedCount=0`, `dataEnvelopeItemCount=0`.

### Verdict

The final three-agent matrix is not complete. OpenAI and Pi are clean after
M11, but Claude startup and scrolling must be rerun after SDK quota
reset/restoration. Do not run or record final root `npm run verify:pr` as the
completion gate until Claude E2E passes.

## Round 21 - Claude Correction Scaffold Self-Check

Reviewer: Codex structured self-check, backed by focused Jest, typecheck,
scene trace regression, and attempted Claude startup/scrolling strict E2E.

### Scope

Fix a user-visible output abnormality found in the previous Claude scrolling
run: a corrected report could expose internal correction scaffold such as
`滑动性能分析报告（修正版）` and `计划执行偏差（p1.5 + p2）` near the top of
the final report.

### Implemented

- Tightened Claude correction prompts so text-only correction must output a
  clean user-facing report and must not label itself as corrected/revised or
  verification feedback.
- Changed correction guidance for plan deviations and unresolved hypotheses so
  they are handled in report prose or limitations sections, not as tool calls
  or leading verifier diagnostics.
- Added conclusion sanitization for corrected report headings, duplicate
  nearby report headings, and leading verifier/plan-deviation blocks.
- Added focused tests for correction prompt constraints and sanitizer behavior.

### Self-Check

- Architecture still follows Draft v2: SDK-native Claude loop remains engine
  owned; SmartPerfetto owns post-report correction policy, verifier behavior,
  report projection, and route finalization.
- Provider Manager/runtime provider pinning remains unchanged.
- Public `AgentRuntimeKind`, `IOrchestrator`, `StreamingUpdate`, route-owned
  `analysis_completed`, report, CLI, and snapshot contracts remain unchanged.
- No prompt/tool list/scene list/Skill count/output contract was hardcoded.
  The change only constrains verifier-feedback-to-report cleanup.
- No Pi dependency, public runtime value, Provider Manager UI, package
  exposure, `.pi` discovery, shell tools, or file tools were introduced.
- Rollback is scoped to the Claude correction prompt/sanitizer changes and
  their focused tests.

### Verification

- Claude verifier/runtime snapshot Jest: 2 suites, 108 tests passed.
- Combined runtime-focused Jest: 5 suites, 216 tests passed.
- `cd backend && npx tsc --noEmit`: passed.
- `cd backend && npm run test:scene-trace-regression`: passed all 6 canonical
  traces.
- Claude scrolling strict E2E after the fix failed before agent work with
  external SDK quota:
  `You've hit your session limit · resets 4pm (Asia/Shanghai)`.
  Evidence: `backend/test-output/e2e-claude-scrolling-real.json`,
  `backend/logs/sessions/session_agent-1780287590640-9tw0f7rr_2026-06-01T04-19-50-641Z.jsonl`,
  `agentTaskDispatchedCount=0`, `dataEnvelopeItemCount=0`.
- Claude startup strict E2E after the fix failed before agent work with the same
  external SDK quota message. Evidence:
  `backend/test-output/e2e-claude-startup-real.json`,
  `backend/logs/sessions/session_agent-1780287653649-b6dd9x7a_2026-06-01T04-20-53-650Z.jsonl`,
  `agentTaskDispatchedCount=0`, `dataEnvelopeItemCount=0`.

### Verdict

The code-level fix is locally green, but the final three-agent matrix is still
not complete. Claude startup and scrolling must be rerun after SDK quota
reset/restoration to prove the clean-report behavior in real E2E output, then
root `npm run verify:pr` must pass.

## Round 22 - OpenCode Fourth Runtime Scope Self-Check

Reviewer: Codex structured self-check, before OpenCode code changes.

### Scope

Evaluate OpenCode as a fourth SmartPerfetto agent runtime after Claude,
OpenAI, and Pi. This is a new scope expansion on top of Draft v2 and must not
bypass the source/API spike discipline used for Pi.

### Guardrails

- Start with M12 source/API spike only.
- Do not add a production OpenCode dependency, public runtime value, Provider
  Manager UI, generated frontend contract, or product import during M12.
- Treat OpenCode as a coding-agent/external-orchestrator surface until source
  evidence proves SmartPerfetto can disable or bypass built-in project
  discovery, file tools, shell tools, extension loading, and OpenCode-owned
  prompts.
- If M12 succeeds, M13 may add a hidden runtime with focused tests and scene
  regression.
- Public OpenCode exposure requires M14: Provider Manager/UI/docs/packaging,
  four-agent startup/scrolling E2E, frontend checks using Computer Use, HTML
  report inspection in Chrome, and root `verify:pr`.

### Verdict

Proceed with M12 spike. OpenCode is plausible as a fourth agent, but the
adapter boundary must be proven from official docs/package source before any
runtime code or public surface is added.

## Round 23 - M12 OpenCode Spike Self-Check

Reviewer: Codex structured self-check, backed by official docs, npm package
metadata, tarball/type inspection, temp install, server health smoke, and
no-reply session smoke.

### Scope

M12 OpenCode source/API spike. This is evidence-only and does not add a
production runtime path or public surface.

### Findings

- OpenCode's current integration surface is a headless HTTP server plus
  generated SDK client.
- `@opencode-ai/sdk@1.15.13` starts `opencode serve` and injects inline config
  via `OPENCODE_CONFIG_CONTENT`.
- `opencode-ai@1.15.13` is the CLI binary package. The unscoped package name
  `opencode` does not exist on npm.
- OpenCode supports session prompt APIs with model, agent, system, per-request
  tools, and message parts.
- v2 SDK types expose rich `session.next.*` events suitable for event
  projection.
- MCP can be configured or added dynamically; this is a better first bridge
  than file-based `.opencode/tools`.
- OpenCode built-in tool IDs remain listable even when disabled in config, so
  M13 must prove denial/allowlist behavior rather than assuming hidden tools
  disappear.

### Verdict

Proceed to M13 hidden runtime as a server-backed external-orchestrator adapter.
Do not expose OpenCode publicly until hidden smoke, focused tests, scene
regression, frontend checks, report inspection, four-agent E2E, and root
`verify:pr` pass.

## Round 24 - M13 Hidden OpenCode Runtime Self-Check

Reviewer: Codex structured self-check, backed by focused tests, typecheck,
scene trace regression, hidden OpenCode server smoke, and hidden MCP status
smoke.

### Scope

M13 hidden experimental OpenCode runtime. The goal is a safe opt-in runtime
adapter scaffold, not a public fourth runtime.

### Implemented

- Added hidden `experimental-opencode` runtime selection behind the shared
  experimental runtime env gate.
- Registered OpenCode only in the internal runtime registry when selected.
- Added OpenCode `EngineCapabilities` for a server-backed external orchestrator.
- Added dynamic SDK/server loading through optional package resolution or
  explicit `SMARTPERFETTO_OPENCODE_SDK_MODULE_PATH`.
- Added adapter-owned hardening: isolated process environment during smoke,
  inline OpenCode config, denied dangerous permissions, disabled built-in
  coding tools, no project/plugin/instruction discovery by default.
- Added optional hidden standalone MCP bridge for SmartPerfetto public/read-only
  tools only.
- Added event projection tests and protected route-owned `analysis_completed`.

### Self-Check

- Architecture still follows Draft v2: OpenCode owns its server loop; product
  contracts remain SmartPerfetto-owned.
- Provider Manager/runtime pinning and public runtime values are unchanged.
- No OpenCode production dependency, Provider Manager UI, generated frontend,
  route/SSE/CLI/report/snapshot, prompt, scene, Skill count, or output contract
  change was introduced.
- The hidden MCP bridge is not full analysis parity. It proves safe public MCP
  attachment, not request-scoped trace tool execution.
- Rollback is removing hidden registration/adapter or unsetting the experiment
  env vars.

### Verification

- Focused Jest: 4 suites, 49 tests passed.
- `cd backend && npx tsc --noEmit`: passed.
- `cd backend && npm run build`: passed.
- `cd backend && npm run test:scene-trace-regression`: passed all 6 canonical
  traces.
- Hidden runtime smoke: passed through `createAgentOrchestrator`; selected
  `OpenCodeRuntime`, emitted `progress` and `conclusion`, and returned
  `partial=true` / `plan_incomplete`.
- Hidden MCP status smoke: passed; OpenCode reported `smartperfetto` MCP
  status `connected`.

### Verdict

M13 hidden runtime gate passed. M14 must not start as public exposure yet:
OpenCode still needs session-scoped SmartPerfetto trace tools, real provider/
model mapping, strict startup and scrolling E2E, frontend checks using Computer
Use, generated HTML report inspection in Chrome, and root `verify:pr`.

## Round 25 - Post-M13 Claude E2E Blocker Self-Check

Reviewer: Codex structured self-check, backed by a real Claude startup E2E
retry.

### Scope

Re-test the previous final-matrix Claude startup blocker after M13 completed.

### Finding

The Claude startup strict E2E still fails before agent/tool execution with the
external SDK response:

`You've hit your session limit · resets 4pm (Asia/Shanghai)`

The run reached trace loading, architecture detection, prompt construction, and
Claude SDK initialization. It did not dispatch agent tasks or data envelopes.

### Verification

- Evidence: `backend/test-output/e2e-claude-startup-real.json`
- Session log:
  `backend/logs/sessions/session_agent-1780292021048-hr47itrt_2026-06-01T05-33-41-049Z.jsonl`
- Counts: `agentTaskDispatchedCount=0`, `dataEnvelopeItemCount=0`

### Verdict

No code rollback is indicated. The final matrix remains blocked by external
Claude SDK quota until the stated 4pm reset/restoration. The paired Claude
scrolling retry should run after quota is available.

## Round 26 - Final Three-Agent Matrix Self-Check

Reviewer: Codex structured self-check, backed by Claude/OpenAI/Pi
startup/scrolling E2E, generated report scans, Chrome visual inspection, and
root `verify:pr`.

### Scope

Close the user-requested final gate after Post-M10/M11: all three public
runtimes must pass startup and scrolling E2E, abnormalities must be fixed and
rerun, generated reports must be inspected, and the root PR verification gate
must pass.

### Verification

- Claude startup strict E2E: passed after SDK quota reset with
  `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues,
  28 task dispatches, 36 data envelopes, and a non-partial final report.
- Claude scrolling strict E2E: passed after SDK quota reset with
  `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues,
  20 task dispatches, 26 data envelopes, and a non-partial final report.
- OpenAI startup strict E2E: passed with `claimVerifierStatus=passed`,
  12 checked claims, 0 unsupported/issues, 36 data envelopes, and a
  non-partial final report.
- OpenAI scrolling strict E2E: passed with `claimVerifierStatus=passed`,
  12 checked claims, 0 unsupported/issues, 27 data envelopes, and a
  non-partial final report.
- Pi startup and scrolling strict real-model E2E: passed in the M11 gate with
  claim verification passed, 0 unsupported/issues, request-scoped
  SmartPerfetto tool events, and non-partial final reports.
- Generated Claude report text scans found no correction scaffold leakage,
  forbidden fallback prose, forbidden startup claims, or final-report contract
  gaps.
- The generated Claude scrolling HTML report was opened in Google Chrome with
  Computer Use; the report shell rendered normally.
- Root `npm run verify:pr`: passed after all three public-runtime E2E checks
  were green.

### Self-Check

- Draft v2 ownership boundaries remain intact: runtime-native loops own model
  and native tool execution; SmartPerfetto owns shared preparation, result
  quality, reports, snapshots, and public event projection.
- Provider Manager/runtime provider pinning remains preserved.
- Public `IOrchestrator`, `StreamingUpdate`, report, CLI, snapshot, and SSE
  contracts remain unchanged by the final gate.
- No prompt/tool list/scene list/Skill count/output contract was hardcoded.
- No unplanned Pi/OpenCode production dependency, public env value, packaging
  exposure, Provider Manager UI change, file/shell tool, or project-discovery
  behavior was introduced.
- The latest Claude logs still include a non-user-facing optional correction
  retry timeout. It did not affect strict E2E, report text, or root PR gates.

### Verdict

The public three-agent final matrix is complete and clean enough to close the
Post-M10/M11 gate. M14 public OpenCode remains separate and gated: the hidden
M13 OpenCode smoke is not a supported fourth runtime until request-scoped trace
tools, real model/provider mapping, OpenCode startup/scrolling E2E, frontend
Provider Manager checks, generated HTML report inspection, and root
`verify:pr` all pass.

## Round 27 - M14 Public OpenCode / Four-Agent Gate Self-Check

Reviewer: Codex structured self-check, backed by focused tests, four-agent
startup/scrolling E2E, generated report/session scans, Computer Use Chrome
inspection, scene trace regression, and root `verify:pr`.

### Scope

Expose OpenCode as the fourth public SmartPerfetto runtime after M12/M13 proved
the safe server-backed adapter boundary and M14 implemented request-scoped
SmartPerfetto tool parity.

### Implemented

- Added public OpenCode runtime/provider surface alongside Claude Agent SDK,
  OpenAI Agents SDK, and Pi Agent Core.
- Kept OpenCode as a hardened external-orchestrator adapter with isolated
  config/project state and SmartPerfetto request-scoped MCP tools.
- Fixed public Custom Provider reachability so the Add Provider flow exposes
  Claude SDK, OpenAI SDK, Pi Agent Core, and OpenCode.
- Fixed Pi/OpenCode connection-field rendering so runtime switching no longer
  crashes the Perfetto UI.
- Preserved secret boundaries for Pi/OpenCode model JSON fields in provider
  snapshots and enterprise provider storage.

### Verification

- M14 focused Jest passed: 9 suites, 204 tests.
- `cd backend && npx tsc --noEmit`: passed.
- `cd backend && npm run test:scene-trace-regression`: passed all 6 canonical
  traces.
- `./scripts/update-frontend.sh`: passed.
- `npm run check:frontend-prebuild`: passed.
- Four-agent strict E2E matrix passed:
  - Claude startup and scrolling.
  - OpenAI startup and scrolling.
  - Pi Agent Core startup and scrolling.
  - OpenCode startup and scrolling.
- Each E2E output had `claimVerifierStatus=passed`, 12 checked claims, 0
  unsupported/issues, no SSE errors, normal SmartPerfetto tool/data-envelope
  activity, and a non-partial final report.
- All eight generated HTML reports and all eight session logs were scanned for
  forbidden correction scaffold, fallback text, process narration, quota/session
  limit text, and error-level logs; scans were clean.
- The latest Claude scrolling report and OpenCode scrolling report were opened
  in Google Chrome with Computer Use and visually inspected for normal report
  shell, overview/plan/data rendering, and scrollability.
- Root `npm run verify:pr`: passed, including quality, frontend prebuild, Rust
  verify, backend validation/typecheck/build/CLI pack, 62 core suites with 727
  tests, trace processor ensure, and all 6 scene trace regression traces.

### Self-Check

- Draft v2 ownership boundaries remain intact: runtime-native SDK/server loops
  own execution, while SmartPerfetto owns shared preparation, request-scoped
  tools, event projection, reports, snapshots, and result quality.
- Provider Manager/runtime provider pinning remains preserved.
- Public `IOrchestrator`, `StreamingUpdate`, report, CLI, snapshot, and SSE
  contracts remain protected.
- No prompt/tool list/scene list/Skill count/output contract was hardcoded.
- OpenCode built-in file/shell/project-discovery behavior remains disabled or
  bypassed in SmartPerfetto product paths.
- Rollback is scoped to removing public OpenCode Provider Manager/UI/docs/
  package exposure and leaving the hidden adapter disabled.

### Verdict

M14 gate passed. Runtime-engine-contract Draft v2 M1-M14 is complete, and
SmartPerfetto now has four public agent runtimes: Claude Agent SDK, OpenAI
Agents SDK, Pi Agent Core, and OpenCode.

## Round 28 - Post-M14 Public Docs Sync Self-Check

Reviewer: Codex structured self-check after docs/env-template patch.

Scope:
- Public README, quick-start, configuration, architecture, product, and env
  template documentation after the four-agent runtime expansion.

Findings:
- Prior docs had partial Pi Agent Core coverage, but public setup and
  architecture entry points still contained stale two-runtime or three-runtime
  descriptions.
- OpenCode configuration was underdocumented outside the runtime-engine-contract
  feature docs, especially `SMARTPERFETTO_OPENCODE_MODEL_JSON`, OpenAI-compatible
  fallback fields, custom-provider-only exposure, and no personal OpenCode login
  reuse.
- Some touched docs still contained fixed Skill/test counts, which conflicts
  with the registry/file-tree source-of-truth rule.

Action:
- Updated public docs/env templates to list `claude-agent-sdk`,
  `openai-agents-sdk`, `pi-agent-core`, and `opencode`.
- Documented Pi/OpenCode as optional custom-provider runtimes.
- Documented OpenCode's isolated server, disabled built-in file/shell/web/edit
  behavior, and request-scoped SmartPerfetto MCP bridge.
- Replaced fixed-count wording with registry/file-tree wording.

Verification:
- `git diff --check`: passed.
- Stale runtime wording scan: passed.
- Hardcoded Skill/test count scan: passed except for the intentional rule text
  that forbids hardcoding counts.

## Round 29 - Post-M14 Release Gate Self-Check

Reviewer: Codex structured self-check plus automated tests/E2E/report scans.

Scope:
- Final release-readiness gate before push and publish.

Findings:
- The first release-rerun Claude startup report exposed a user-visible context
  pressure warning in the generated timeline even though the strict E2E JSON
  passed. This was treated as a release-blocking report abnormality.
- Real Pi Agent Core E2E against an OpenAI-compatible Z.ai gateway requires
  `api:"openai-completions"`; `openai-responses` is valid for official OpenAI
  Responses but not for that chat/completions gateway.
- Computer Use could list Chrome but could not attach to the Chrome window
  (`cgWindowNotFound`), so the report visual check used Playwright against a
  local read-only `127.0.0.1` report server.

Action:
- Kept Claude context pressure diagnostics in internal monitoring logs only.
- Added focused Jest coverage to prevent context-pressure warnings from
  appearing as user-facing progress updates.
- Documented the Pi Agent Core `openai-completions` gateway mode in env
  examples and English/Chinese configuration docs.
- Reran the complete four-agent startup/scrolling E2E matrix.

Verification:
- All eight strict E2E outputs passed with claim verifier status `passed`, 12
  checked claims, 0 unsupported claims, and 0 verifier issues.
- Unified JSON/session/report scan passed for all eight outputs.
- Browser render/scroll scan passed for all eight generated HTML reports, with
  no non-favicon console errors.
- Focused Jest, backend typecheck, scene trace regression, and root
  `npm run verify:pr` passed.
- `/simplify` has no runnable shell/npm entry in this workspace; the gap is
  recorded instead of being claimed as executed.

Verdict:
- Release gate is green pending final `git diff --check`, commit/version bump,
  push, publish, and post-publish verification.

## Round 30 - v1.0.28 Publish Self-Check

Reviewer: Codex structured release self-check.

Scope:
- Final publication chain after the four-agent runtime contract gate.

Findings:
- The release commit was version-only after the full four-agent gate.
- The Perfetto submodule commit was pushed to fork before the root gitlink was
  committed.
- npm, GitHub Release, and Docker publication all completed successfully.

Action:
- Pushed `main` with feature commit `a212ca89` and release commit `e275f2b0`.
- Published `@gracker/smartperfetto@1.0.28`.
- Built and uploaded Windows x64, macOS arm64, and Linux x64 portable assets.
- Waited for tag-triggered Docker Build and Publish workflow to complete.
- Verified Docker Hub `1.0.28` and `latest` manifests.

Verification:
- Version-state root `npm run verify:pr`: passed.
- Fresh npm install smoke: passed on Node `v24.15.0`.
- `smp --version`: `1.0.28`.
- `smp doctor --format json`: `ok:true`.
- GitHub Release `v1.0.28`: published, not draft, not prerelease, with three
  uploaded portable assets.
- Docker Build and Publish run `26816581871`: success.
- Docker Hub `1.0.28` and `latest` digests match:
  `sha256:004c015ee05e47de08ebe66d61fd6cdd770b800aa291ec386b6f7b49f7448276`.

Verdict:
- v1.0.28 is published and verified. Runtime-engine-contract Draft v2 M1-M14
  plus the four-agent release gate are complete.
