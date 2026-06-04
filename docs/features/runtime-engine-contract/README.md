# Runtime Engine Contract Feature Plan

**Status**: Draft v2, implementation planning document
**Owner**: TBD
**Created**: 2026-05-31
**Last updated**: 2026-06-01
**Decision**: Pi-ready, not Pi-driven
**Builds on**: `IOrchestrator`, Provider Manager, Claude runtime, OpenAI runtime,
`McpToolRegistry`, `SessionStateSnapshot`, SSE projection, CLI renderer, result
quality pipeline
**Related rules**: `.claude/rules/backend.md`,
`.claude/rules/product-surface.md`, `.claude/rules/testing.md`

## 1. Executive Summary

SmartPerfetto should keep Claude Agent SDK and OpenAI Agents SDK as first-class
execution choices, but the product contract should not be owned by either SDK.
The next refactor should make the runtime boundary thinner while preserving the
existing Claude/OpenAI behavior.

The immediate plan is **not** to add Pi as a product option. The immediate plan
is to make the Claude/OpenAI refactor structurally ready for a future third-party
engine by adding:

- characterization tests before behavior changes
- a shared SmartPerfetto tool body with SDK-native adapters
- a shared run-spec/policy layer extracted from existing runtime code
- an internal runtime registry and fake third-party adapter in tests
- explicit engine capabilities instead of scattered `if kind === ...` logic
- a later strangler `AnalysisHarness` only after parity is proven

The future Pi path remains open, but Pi does not drive the first implementation
milestones. A real Pi API spike happens after the extension seams exist, not
before the Claude/OpenAI cleanup begins.

## 2. Operating Decision

### 2.1 Pi-Ready, Not Pi-Driven

For the first implementation sequence:

- Production runtime choices remain `claude-agent-sdk` and `openai-agents-sdk`.
- Provider Manager schemas and UI remain scoped to the two current runtime
  choices.
- No Pi package is added to production dependencies.
- No `SMARTPERFETTO_AGENT_RUNTIME=pi-*` public value is introduced.
- No `.pi` project discovery, Pi extensions, shell tools, or file tools are
  allowed in SmartPerfetto product paths.
- Third-party readiness is tested with a fake adapter and contract tests, not by
  coupling the design to inferred Pi behavior.

The target architecture should make a future Pi adapter easy, but the current
refactor must pay for itself even if Pi is never shipped.

### 2.2 Why This Is Worth Doing

This refactor is worth doing only if it reduces duplicated product behavior
between Claude and OpenAI without destabilizing the current analysis surfaces.

The concrete benefits are:

- one place to define SmartPerfetto analysis setup, trace context, provider
  scope, tool scope, and continuation policy
- one shared tool body that can emit Claude, OpenAI, standalone MCP, and future
  third-party descriptors
- explicit tests that lock SSE, CLI, report, snapshot, and provider pinning
  behavior before moving code
- easier future engine onboarding because new engines adapt model/tool protocol,
  not SmartPerfetto product semantics
- safer experimentation because hidden or fake engines can be registered without
  changing Provider Manager or user-visible runtime values

This is not worth doing as a big-bang rewrite. Every milestone below has to
either keep production paths unchanged or introduce a feature-flagged/shadow
path with rollback.

## 3. Non-Goals

- Do not add Pi as a user-facing runtime in the first refactor.
- Do not embed `pi-coding-agent` as SmartPerfetto's orchestrator.
- Do not replace Provider Manager or runtime provider pinning semantics.
- Do not move prompt/strategy content into TypeScript.
- Do not collapse Web UI chat, SSE replay, CLI artifacts, HTML reports, and
  session snapshots into one output contract.
- Do not make the harness universally dispatch every tool call as the primary
  path. SDK-native tool invocation remains the default.
- Do not change the runtime classifier, verifier, resume, or continuation
  behavior unless the phase explicitly declares and tests that behavior change.
- Do not expose any third-party runtime through packaging, Docker, npm, or UI
  before backend smoke tests and `npm run verify:pr` pass.

## 4. Source-Grounded Current Architecture

This plan is grounded against the current source tree as of 2026-05-31.

### 4.1 Route-Facing Contract

`backend/src/agent/core/orchestratorTypes.ts` defines the current
`IOrchestrator` surface. It is broader than a simple `analyze/reset` interface:

- EventEmitter methods: `on`, `off`, `emit`, `removeAllListeners`
- core methods: `analyze`, `reset`
- optional session cleanup: `cleanupSession`
- focus/intervention hooks: `getFocusStore`, `recordUserInteraction`,
  `getInterventionController`
- SDK/session hooks: `getSdkSessionId`, deprecated `restoreSessionMapping`
- architecture cache hooks: `restoreArchitectureCache`, `getCachedArchitecture`
- report state hooks: `getSessionNotes`, `getSessionPlan`,
  `getSessionUncertaintyFlags`
- persistence hooks: `takeSnapshot`, `restoreFromSnapshot`

Any future `AnalysisHarness` must implement or deliberately route every consumed
hook. Draft v1's simplified five-method interface was not accurate enough.

### 4.2 Runtime Selection And Provider Pinning

`backend/src/agentRuntime/runtimeSelection.ts` currently:

- accepts only `claude-agent-sdk` and `openai-agents-sdk`
- resolves runtime in priority order: provider, snapshot override, env, default
- throws when an explicit provider id cannot be found
- creates either `ClaudeRuntime` or `OpenAIRuntime`

`backend/src/services/providerManager/types.ts` currently defines:

- `AgentRuntimeKind = 'claude-agent-sdk' | 'openai-agents-sdk'`
- `ProviderConnection.agentRuntime?: AgentRuntimeKind`
- `ProviderConnection.openaiProtocol?: 'responses' | 'chat_completions'`

The early refactor must preserve these public values. Third-party test engines
belong in internal test-only registry code, not in Provider Manager config.

### 4.3 Runtime Implementations

`backend/src/agentv3/claudeRuntime.ts` is both a SmartPerfetto analysis
implementation and a Claude SDK loop implementation. Important current behavior:

- wraps Claude SDK query with retry and a `close()` handle
- comments explicitly require callers to invoke `close()` to avoid zombie MCP
  tool executions
- builds Claude SDK options with system prompt, in-process MCP server,
  allowed tools, model, max turns, budget, cwd, env, and optional resume id
- works around Claude resume behavior where `systemPrompt` is ignored by
  prepending selection context into the resumed prompt
- owns Claude-specific verifier/correction loops

`backend/src/agentOpenAI/openAiRuntime.ts` is both a SmartPerfetto analysis
implementation and an OpenAI Agents SDK loop implementation. Important current
behavior:

- creates `OpenAIProvider`, `Runner`, and `Agent`
- uses `toolUseBehavior: 'run_llm_again'`
- sets `parallelToolCalls: false`
- streams with `runner.run(..., { stream: true, maxTurns, signal,
  previousResponseId })`
- owns OpenAI-specific plan completion, timeout degradation, and final-report
  continuation behavior
- persists OpenAI history, last response id, and reserved run state in
  `SessionStateSnapshot`

These native loops should stay native. The refactor should extract shared setup
and shared product policy around them, not force both SDKs through a fake common
loop.

### 4.4 Existing Shared Runtime Utilities

`backend/src/agentRuntime/runtimeCommon.ts` already contains reusable runtime
helpers:

- provider and knowledge scope derivation from `AnalysisOptions`
- session map key construction
- runtime LRU helpers and freshness rules
- trace context prompt formatting
- recent conversation and entity context helpers
- skill display entity capture
- protocol hypothesis conversion
- skill notes budget helpers

The plan should extend this area and adjacent files. It should not create a
greenfield shared layer while ignoring existing `runtimeCommon.ts`.

### 4.5 Tool Registry And Tool Adapters

`backend/src/agentv3/mcpToolRegistry.ts` currently stores SDK-shaped tool
descriptors returned by Claude SDK `tool(...)` and builds:

- the Claude in-process MCP server through `createSdkMcpServer`
- the prefixed Claude `allowedTools` list
- request-scoped filtering for code-aware tool exposure
- public ACI snapshots for external contracts

`backend/src/agentOpenAI/openAiToolAdapter.ts` currently adapts these
Claude-shaped descriptors into OpenAI function tools by expecting:

- `name`
- `description`
- `inputSchema: z.ZodRawShape`
- `handler`

`backend/src/agentv3/standaloneMcpServer.ts` also extracts the handler from the
SDK-shaped descriptor and exposes public tools externally.

This means the current practical source of truth is not SDK-neutral. The next
tool refactor should keep Zod/raw handler compatibility initially, but move the
canonical SmartPerfetto tool body above SDK-specific descriptors.

### 4.6 Streaming, SSE, CLI, And Terminal Events

`backend/src/agent/types.ts` defines a broad `StreamingUpdate.type` union. The
runtime/harness boundary must preserve current event names, including:

- `data`
- `thought`
- `tool_call`
- `finding`
- `progress`
- `answer_token`
- `conclusion`
- `error`
- `conversation_step`
- `degraded`
- sub-agent events
- planning events
- scene story events
- deprecated `skill_data`

`backend/src/routes/agentRoutes.ts` currently listens to orchestrator `update`
events, suppresses early `conclusion` and `answer_token`, derives
`conversation_step`, and later synthesizes the terminal `analysis_completed`
surface after deterministic result processing.

`backend/src/cli-user/repl/renderer.ts` and
`backend/src/cli-user/services/cliAnalyzeService.ts` consume the same
`StreamingUpdate` contract for terminal UX and transcript artifacts.

This means an internal `EngineEvent` must not be treated as the user-facing
event contract. It can represent native SDK progress, but `StreamingUpdate`
remains the product event surface.

### 4.7 Snapshot And Resume

`backend/src/agentv3/sessionStateSnapshot.ts` currently has version `1` and is
used by persistence, report generation, resume, and SSE reconnect paths. It
stores both product state and engine-specific state:

- conversation/query/conclusion history
- agent dialogue and sub-agent responses
- data envelopes, claim support, verification, identity resolutions
- analysis notes, plan, plan history, uncertainty flags
- Claude-specific hypotheses
- architecture cache
- `sdkSessionId`
- `agentRuntimeKind`
- provider id and provider snapshot hash
- OpenAI history, last response id, and reserved run state
- code-aware snapshot data

The first phases should not rewrite this shape. Snapshot splitting should happen
only after the shared setup, tool, event, and registry seams are tested.

## 5. Target Architecture

The target architecture is a strangler, not a rewrite.

```text
HTTP routes / CLI / resume
  -> AgentAnalyzeSessionService
  -> IOrchestrator facade
       current: ClaudeRuntime or OpenAIRuntime
       later:   AnalysisHarness
  -> shared preparation and policy
       run spec, tool scope, provider scope, continuation policy
  -> native runtime engine
       Claude SDK loop or OpenAI Agents SDK loop
       future: hidden/fake/third-party engine
  -> SmartPerfetto result pipeline
       normalizer, verifier, report, snapshot, SSE/CLI projection
```

### 5.1 Stable Outer Facade

Routes, session service, resume routes, scene reconstruction routes, CLI, and
tests should continue to depend on `IOrchestrator`.

The eventual `AnalysisHarness` is an implementation detail behind
`createAgentOrchestrator`. It must preserve:

- EventEmitter behavior
- `analyze` return shape
- provider/runtime pinning
- snapshot save/restore hooks
- report getter hooks until those are removed from consumers
- route-level `analysis_completed` synthesis

### 5.2 Native Engine Boundary

The internal engine boundary is lower-level than `IOrchestrator`.

Draft shape:

```ts
export type ProductionEngineKind = 'claude-agent-sdk' | 'openai-agents-sdk';

export type TestEngineKind = 'third-party-test-engine';

export type InternalEngineKind = ProductionEngineKind | TestEngineKind;

export interface EngineCapabilities {
  kind: InternalEngineKind;
  resumeMode: 'sdk_session_id' | 'response_id' | 'history' | 'none';
  systemPromptOnResume: 'supported' | 'ignored' | 'transport_specific';
  nativeToolModel: 'mcp' | 'function_tools' | 'external_host';
  schemaDialect: 'zod_raw_shape' | 'json_schema' | 'typebox' | 'mixed';
  supportsStructuredOutput: boolean;
  supportsSubAgents: boolean;
  supportsVerifierCorrectionLoop: boolean;
  supportsPlanContinuation: boolean;
  supportsFinalReportContinuation: boolean;
  maxNativeToolConcurrency: number;
  requiresExplicitClose: boolean;
  usageGranularity: 'none' | 'tokens' | 'cost_and_tokens';
}

export interface NativeRunInput {
  runId: string;
  sessionId: string;
  traceId: string;
  prompt: string;
  systemPrompt: string;
  tools: RuntimeToolView[];
  provider: ResolvedRuntimeProvider;
  previousState?: EngineState;
  signal: AbortSignal;
}

export interface RuntimeEngine {
  readonly kind: InternalEngineKind;
  readonly capabilities: EngineCapabilities;
  run(input: NativeRunInput): AsyncIterable<NativeEngineEvent>;
  close(): Promise<void>;
  snapshotState?(): EngineState | undefined;
  restoreState?(state: EngineState): void;
}
```

This is not the first code to write. It is the target shape once M1-M5 tests and
shared seams prove the contract.

### 5.3 Analysis Harness Responsibilities

The future `AnalysisHarness` owns SmartPerfetto product semantics:

- output language
- provider scope and knowledge scope
- trace context and selection context handling
- scene and complexity policy
- prompt/strategy assembly from existing strategy files
- tool scope and code-aware gating
- plan, hypotheses, notes, uncertainty flags, recovery state
- mapping native engine signals into `StreamingUpdate`
- continuation policy above native SDK runs
- final result normalization, verifier, and quality gates
- report and snapshot state

The harness must not own SDK-specific transport details.

### 5.4 Engine Responsibilities

Each runtime engine owns only the native protocol loop:

| Engine | Owns | Must not own |
| --- | --- | --- |
| Claude | Claude SDK query, retry/close, in-process MCP binding, allowed tools, SDK session id, Claude-specific resume quirks, Claude usage/error mapping | SmartPerfetto scene policy, report contract, provider UI, final result snapshot shape |
| OpenAI | OpenAI provider/runner/agent construction, Responses vs Chat Completions transport, function tool binding, previous response id/history, OpenAI usage/error mapping | SmartPerfetto tool semantics, report contract, Provider Manager semantics |
| Fake third-party | Contract tests for a non-Claude/non-OpenAI engine, limited event/state/tool behavior | Production config, Provider Manager values, user-visible runtime |
| Future Pi | Real Pi transport/tool/state mapping after a spike | Pi coding-agent harness, `.pi` discovery, shell/file tools, project extensions as product truth |

### 5.5 Tool Architecture

The tool refactor should move from "Claude SDK descriptor is the source of
truth" to "SmartPerfetto shared tool body is the source of truth".

Draft shape:

```ts
export interface SharedToolSpec {
  name: string;
  description: string;
  exposure: McpToolExposure;
  inputSchema: z.ZodRawShape;
  createHandler(context: RuntimeToolContext): RuntimeToolHandler;
  requires?: string[];
}

export interface RuntimeToolViews {
  shared: SharedToolSpec;
  claude?: unknown;
  openai?: Tool;
  standaloneMcp?: StandaloneMcpToolDescriptor;
  thirdPartyTest?: unknown;
}
```

Important constraints:

- Keep Zod raw shape as canonical in the first tool refactor because current
  Claude/OpenAI adapters already rely on it.
- Emit JSON Schema from the shared spec for OpenAI and standalone MCP.
- Add TypeBox only when a real third-party/Pi adapter proves it needs TypeBox.
- SDK-native invocation remains the primary path. Claude calls the Claude MCP
  tool handler; OpenAI calls the OpenAI function tool handler.
- Do not add a harness-level universal dispatcher as the production tool path.

### 5.6 Event Architecture

Use two event layers:

1. `NativeEngineEvent`: low-level events from a native SDK run.
2. `StreamingUpdate`: existing SmartPerfetto product stream emitted to routes,
   SSE replay, CLI, reports, and tests.

Draft native event categories:

```ts
export type NativeEngineEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_started'; name: string; callId?: string; args?: unknown }
  | { type: 'tool_finished'; name: string; callId?: string; result?: unknown }
  | { type: 'usage'; usage: RuntimeUsage }
  | { type: 'native_warning'; warning: RuntimeWarning }
  | { type: 'native_done'; state?: EngineState; finalText?: string }
  | { type: 'native_error'; error: RuntimeEngineError };
```

The harness and existing route layer decide whether these become `progress`,
`thought`, `tool_call`, `answer_token`, `degraded`, `conclusion`, or no public
event. `analysis_completed` remains route/result-pipeline owned.

### 5.7 State Architecture

Early phases keep `SessionStateSnapshot` version 1 intact.

Only after the harness is active should the project consider a state split:

```ts
interface FutureSessionStateSnapshot {
  version: 2;
  harnessState: SmartPerfettoHarnessState;
  engineState: {
    kind: ProductionEngineKind;
    providerId: string | null;
    providerSnapshotHash: string | null;
    opaque: unknown;
  };
}
```

The M7 snapshot phase must make an explicit release-boundary decision:

- compatible read of v1 snapshots, or
- intentional fail-fast for old in-flight resume state with clear error text

That decision should not be hidden inside earlier refactors.

## 6. Implementation Phases

### M0 - Draft v2 And Source Inventory

Goal: Turn the reviewed idea into an implementation-grade plan.

Production behavior: unchanged.

Files:

- `docs/features/runtime-engine-contract/README.md`
- `docs/features/runtime-engine-contract/review-rounds.md`

Work:

- Replace Draft v1 with this Draft v2 plan.
- Record that the new direction is Pi-ready, not Pi-driven.
- Ground every phase in current source files and tests.
- Remove the old "real Pi spike before any runtime code" blocker.
- Keep a later real Pi spike as a validation phase after extension seams exist.

Verification:

- `git diff --check`
- For untracked docs, also run `git diff --no-index --check /dev/null <file>`.

Exit criteria:

- README describes phase order, architecture, source map, tests, rollback, and
  acceptance gates.
- Review notes say Round 4 supersedes Round 3's Pi-first blocker.

### M1 - Characterization Tests Before Runtime Changes

Goal: Lock current behavior so later refactors cannot silently break it.

Production behavior: unchanged. No runtime code path should change except test
fixtures/helpers if required.

Files to inspect or add:

- `backend/src/agentRuntime/__tests__/runtimeSelection.test.ts`
- `backend/src/assistant/application/__tests__/agentAnalyzeSessionService.test.ts`
- `backend/src/agentv3/__tests__/mcpToolRegistry.test.ts`
- `backend/src/agentOpenAI/__tests__/openAiToolAdapter.test.ts`
- `backend/src/agentv3/__tests__/standaloneMcpServer.test.ts`
- `backend/src/assistant/stream/__tests__/streamProjector.contract.test.ts`
- new: `backend/src/agentRuntime/__tests__/orchestratorContractInventory.test.ts`
- new: `backend/src/agentRuntime/__tests__/streamingUpdateInventory.test.ts`
- new: `backend/src/agentRuntime/__tests__/snapshotRuntimeStateInventory.test.ts`

Work:

- Add an inventory test for every consumed `IOrchestrator` hook.
- Add a runtime selection matrix for provider, snapshot override, env, invalid
  env, and default resolution.
- Add a Provider Manager pinning test for explicit provider missing and
  provider snapshot mismatch behavior.
- Add a streaming event inventory test that protects current public
  `StreamingUpdate.type` values used by SSE and CLI.
- Add a snapshot inventory test that documents current Claude and OpenAI state
  fields.
- Add a tool registry/adapters parity test for tool names, exposure filtering,
  code-aware gating, and OpenAI schema conversion.

Verification:

```bash
cd backend && npx jest \
  src/agentRuntime/__tests__/runtimeSelection.test.ts \
  src/assistant/application/__tests__/agentAnalyzeSessionService.test.ts \
  src/agentv3/__tests__/mcpToolRegistry.test.ts \
  src/agentOpenAI/__tests__/openAiToolAdapter.test.ts \
  src/agentv3/__tests__/standaloneMcpServer.test.ts \
  src/assistant/stream/__tests__/streamProjector.contract.test.ts

cd backend && npx tsc --noEmit
```

If any tests touch runtime/provider/session behavior:

```bash
cd backend && npm run test:scene-trace-regression
```

Exit criteria:

- Existing Claude/OpenAI behavior is documented by tests.
- No implementation abstraction has been introduced yet.
- The test suite can catch public event, provider selection, snapshot, and tool
  exposure regressions.

### M2 - Shared Tool Body And SDK-Native Adapters

Goal: Make SmartPerfetto tool definitions SDK-neutral without changing how SDKs
invoke tools.

Production behavior: should be unchanged.

Files:

- `backend/src/agentv3/claudeMcpServer.ts`
- `backend/src/agentv3/mcpToolRegistry.ts`
- `backend/src/agentOpenAI/openAiToolAdapter.ts`
- `backend/src/agentv3/standaloneMcpServer.ts`
- `backend/src/agentv3/__tests__/mcpToolRegistry.test.ts`
- `backend/src/agentOpenAI/__tests__/openAiToolAdapter.test.ts`
- `backend/src/agentv3/__tests__/standaloneMcpServer.test.ts`
- new: `backend/src/agentRuntime/runtimeToolSpec.ts`
- new: `backend/src/agentRuntime/__tests__/runtimeToolSpec.test.ts`

Work:

- Introduce a shared tool spec that preserves current Zod raw shape and handler
  semantics.
- Make `McpToolRegistry` store shared tool specs or expose shared specs next to
  the existing SDK descriptor during migration.
- Build Claude SDK descriptors from shared specs.
- Build OpenAI function tools from shared specs, preserving current JSON schema
  sanitization and argument normalization.
- Build standalone MCP descriptors from shared specs, preserving public/internal
  filtering.
- Add a fake third-party adapter test that consumes the same shared specs and
  proves the registry no longer assumes Claude/OpenAI only.

Constraints:

- No product path should dispatch tools through a generic harness dispatcher.
- Internal tools stay internal.
- Code-aware tools still require codebase permission.
- Standalone MCP stays safe for external hosts.

Verification:

```bash
cd backend && npx jest \
  src/agentv3/__tests__/mcpToolRegistry.test.ts \
  src/agentOpenAI/__tests__/openAiToolAdapter.test.ts \
  src/agentv3/__tests__/standaloneMcpServer.test.ts

cd backend && npx tsc --noEmit
cd backend && npm run test:scene-trace-regression
```

Exit criteria:

- Claude and OpenAI receive equivalent tool names/descriptions/schemas.
- Tool exposure and code-aware gating are unchanged.
- A fake third-party adapter can consume the shared specs in tests without a
  production runtime value.

### M3 - Shared Analysis Run Spec In Shadow Mode

Goal: Extract shared request preparation while both runtimes still execute their
current code paths.

Production behavior: unchanged. The shared spec is built and compared in tests
or logs, but not used to drive production behavior yet.

Files:

- `backend/src/agentRuntime/runtimeCommon.ts`
- `backend/src/agentv3/claudeRuntime.ts`
- `backend/src/agentOpenAI/openAiRuntime.ts`
- `backend/src/agentRuntime/runtimeSelection.ts`
- new: `backend/src/agentRuntime/analysisRunSpec.ts`
- new: `backend/src/agentRuntime/__tests__/analysisRunSpec.test.ts`

Work:

- Define `AnalysisRunSpec` as the shared preparation output:
  - session id, trace id, reference trace id
  - provider scope and knowledge scope
  - output language
  - quick/full mode
  - scene and complexity inputs
  - trace context prompt section
  - selection context handling
  - tool request scope
  - provider/runtime selection snapshot
  - continuation policy flags
  - timeout/budget inputs
- Reuse existing `runtimeCommon.ts` helpers instead of duplicating them.
- Preserve current classifier behavior:
  - Claude can keep its current AI/hard-rule classifier path.
  - OpenAI can keep its local-first/light-model fallback path.
  - Any unification is a later explicit behavior change.
- Add comparison tests that show the new run spec captures existing runtime
  inputs without switching the runtime loops.

Verification:

```bash
cd backend && npx jest \
  src/agentRuntime/__tests__/analysisRunSpec.test.ts \
  src/agentRuntime/__tests__/runtimeSelection.test.ts \
  src/agentv3/__tests__/queryComplexityClassifier.followup.test.ts

cd backend && npx tsc --noEmit
```

If runtime setup files are modified:

```bash
cd backend && npm run test:scene-trace-regression
```

Exit criteria:

- Shared run spec can represent the current Claude/OpenAI setup.
- Runtime-specific classifier, verifier, and continuation policy remain
  unchanged.
- No route, CLI, report, or snapshot surface changes.

### M4 - Adopt Shared Preparation In Claude/OpenAI Runtimes

Goal: Use shared preparation outputs in both runtimes while keeping native SDK
loops and current `IOrchestrator` classes.

Production behavior: intended to be unchanged. This is the first behavior-risky
phase and must be tightly tested.

Files:

- `backend/src/agentv3/claudeRuntime.ts`
- `backend/src/agentOpenAI/openAiRuntime.ts`
- `backend/src/agentRuntime/analysisRunSpec.ts`
- `backend/src/agentRuntime/runtimeCommon.ts`
- `backend/src/agentRuntime/runtimeSelection.ts`

Work:

- Replace duplicated provider scope, trace context, session key, and tool scope
  preparation with `AnalysisRunSpec` where parity tests already exist.
- Keep Claude SDK query options and OpenAI `Runner/Agent` loops native.
- Keep Claude verifier/correction loops in Claude runtime.
- Keep OpenAI plan/final-report continuation loops in OpenAI runtime.
- Keep route-level suppression of `conclusion` and `answer_token`.
- Keep `SessionStateSnapshot` v1 writes.

Verification:

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
```

If OpenAI runtime behavior changes, also run:

```bash
cd backend && npm run verify:e2e:openai-startup
```

Exit criteria:

- Claude and OpenAI still pass focused runtime tests.
- Scene trace regression passes.
- Provider pinning and snapshot restoration remain intact.
- Any intentional behavior difference is documented in this file before merge.

### M5 - Runtime Registry And Fake Third-Party Adapter

Goal: Prove the architecture is third-party-ready without shipping a third-party
runtime.

Production behavior: unchanged for users.

Files:

- `backend/src/agentRuntime/runtimeSelection.ts`
- `backend/src/agentRuntime/index.ts`
- new: `backend/src/agentRuntime/runtimeRegistry.ts`
- new: `backend/src/agentRuntime/runtimeCapabilities.ts` or extension of the
  existing capabilities file
- new: `backend/src/agentRuntime/__tests__/runtimeRegistry.test.ts`
- new: `backend/src/agentRuntime/__tests__/fakeThirdPartyRuntime.test.ts`

Work:

- Introduce a registry that maps production runtime kinds to factories and
  capability descriptors.
- Keep public `AgentRuntimeKind` limited to Claude/OpenAI.
- Register fake third-party engine only in tests.
- Move engine capability decisions into `EngineCapabilities`.
- Add tests proving product code asks capabilities rather than hardcoding every
  behavior by engine name.
- Ensure unsupported env values still fail with clear errors.

Verification:

```bash
cd backend && npx jest \
  src/agentRuntime/__tests__/runtimeSelection.test.ts \
  src/agentRuntime/__tests__/runtimeRegistry.test.ts \
  src/agentRuntime/__tests__/fakeThirdPartyRuntime.test.ts \
  src/services/providerManager/__tests__/providerService.test.ts

cd backend && npx tsc --noEmit
cd backend && npm run test:scene-trace-regression
```

Exit criteria:

- A fake non-Claude/non-OpenAI engine can compile and run contract tests.
- Provider Manager remains user-facing Claude/OpenAI only.
- Runtime selection behavior remains compatible.

### M6 - AnalysisHarness Strangler Go/No-Go

Goal: Decide whether enough shared preparation, tools, events, and registry
support exists to introduce `AnalysisHarness`.

Production behavior: initially feature-flagged or shadowed. Do not make this a
forced switch in the same PR that creates the harness.

Files:

- new: `backend/src/agentRuntime/analysisHarness.ts`
- `backend/src/agentRuntime/runtimeSelection.ts`
- `backend/src/agentv3/claudeRuntime.ts`
- `backend/src/agentOpenAI/openAiRuntime.ts`
- `backend/src/assistant/application/agentAnalyzeSessionService.ts`
- `backend/src/routes/agentRoutes.ts`
- `backend/src/routes/agentResumeRoutes.ts`
- `backend/src/routes/agentSceneReconstructRoutes.ts`
- CLI service and renderer tests

Work:

- Implement `AnalysisHarness` behind `IOrchestrator`.
- Route all current `IOrchestrator` hooks explicitly:
  - EventEmitter methods
  - `analyze`, `reset`, `cleanupSession`
  - intervention hooks or documented no-op behavior
  - SDK/session hooks
  - architecture cache hooks
  - report state hooks
  - snapshot hooks
- Wrap native Claude/OpenAI loops as engine adapters.
- Keep native SDK loop ownership.
- Keep `StreamingUpdate` as the public event contract.
- Keep `analysis_completed` route-owned.
- Start with a flag or test-only constructor before making it default.

Go/no-go conditions before coding:

- M1-M5 are merged and green.
- Tool spec no longer depends on Claude descriptor shape.
- Fake third-party engine tests pass.
- Event inventory tests cover SSE and CLI.
- Snapshot v1 behavior is locked.

Verification:

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

Before landing a harness default switch:

```bash
npm run verify:pr
```

Exit criteria:

- Old direct runtime path and new harness path can be compared.
- No public event, report, CLI, or snapshot contract regresses.
- Rollback is one flag or one factory switch.

### M7 - Snapshot State Split

Goal: Split SmartPerfetto product state from engine-local opaque state, if the
harness has become the default path.

Production behavior: intentionally changed only after a release-boundary
decision.

Files:

- `backend/src/agentv3/sessionStateSnapshot.ts`
- `backend/src/services/sessionPersistenceService.ts`
- `backend/src/services/persistAgentSession.ts`
- `backend/src/assistant/application/agentAnalyzeSessionService.ts`
- `backend/src/routes/agentResumeRoutes.ts`
- report routes and snapshot tests

Work:

- Decide whether v1 snapshots are read compatibly or fail fast after the cut.
- If compatible, add typed migration from v1 to v2.
- If fail-fast, add explicit error text and user-facing recovery behavior.
- Move Claude `sdkSessionId` and OpenAI response/history state under
  engine-local state.
- Keep report generation product fields outside engine-local state.
- Keep provider id and provider snapshot hash non-secret and explicit.

Verification:

```bash
cd backend && npx jest \
  src/assistant/application/__tests__/agentAnalyzeSessionService.test.ts \
  src/services/__tests__/analysisResultSnapshotStore.test.ts \
  src/services/__tests__/persistAgentSession.test.ts \
  src/routes/__tests__/agentRoutesRbac.test.ts

cd backend && npm run typecheck
cd backend && npm run test:scene-trace-regression
```

Before merge:

```bash
npm run verify:pr
```

Exit criteria:

- Resume, report generation, SSE reconnect, and CLI artifacts read the same
  product state.
- Engine-local state is opaque to product consumers.
- Old snapshot behavior is explicit and tested.

### M8 - Real Third-Party / Pi API Spike

Goal: Validate the future third-party path against real Pi APIs after the
extension seams exist.

Production behavior: unchanged. This is a spike and should not ship a user
option.

Files:

- `docs/features/runtime-engine-contract/pi-spike.md` or equivalent evidence
  note
- temporary spike code outside production imports, or a separate local checkout

Work:

- Inspect real Pi package APIs and version constraints.
- Answer which surface is appropriate:
  - lower-level `pi-ai`
  - `pi-agent-core`
  - external-orchestrator adapter only
- Document stream event shape.
- Document tool schema requirements.
- Document state/resume model.
- Document dependency footprint and packaging implications.
- Prove `.pi` discovery, project extensions, file tools, and shell tools can be
  disabled or bypassed.
- Compare Pi needs against `EngineCapabilities` and fake third-party adapter
  tests.

Verification:

- Spike-specific smoke command documented in the spike note.
- No production dependency or runtime selection change unless a follow-up phase
  is approved.

Exit criteria:

- Clear recommendation: thin engine, external-orchestrator adapter, or no-go.
- Gaps are mapped to specific contract changes.

### M9 - Hidden Experimental Third-Party Runtime

Goal: If M8 succeeds, add a hidden experimental runtime path without UI exposure.

Production behavior: opt-in only, likely local/dev flag only.

Files:

- runtime registry and engine adapter files
- provider/runtime config code if a hidden config path is approved
- packaging dependency checks
- docs under this feature directory

Work:

- Add dynamic import or optional dependency handling.
- Keep Provider Manager UI unchanged.
- Gate runtime by explicit experiment flag.
- Disable external project config discovery.
- Disable shell/file tools unless explicitly re-reviewed.
- Add a real smoke test plus fake-engine parity tests.

Verification:

```bash
cd backend && npx tsc --noEmit
cd backend && npm run test:scene-trace-regression
npm run verify:pr
```

Additional packaging checks before any public release:

- npm pack/install smoke
- Docker smoke
- portable package smoke
- dependency/license review

Exit criteria:

- Hidden engine can run one safe SmartPerfetto analysis smoke.
- Existing Claude/OpenAI paths remain green.
- Packaging does not require the hidden dependency unless explicitly enabled.

### M10 - User-Facing Runtime Option

Goal: Expose a third-party runtime only after it behaves like a supported
SmartPerfetto engine.

Production behavior: new user-facing feature.

Work:

- Add Provider Manager type/config/UI only after backend support is stable.
- Add generated frontend/backend types.
- Add docs explaining capability limits.
- Add migration and rollback notes.
- Run full PR gate and packaging verification.

Verification:

```bash
npm run verify:pr
```

Plus UI/provider tests and packaging smokes appropriate to the release.

Exit criteria:

- Runtime is documented, tested, packaged, and reversible.
- The runtime is not presented as equivalent unless capability gaps are closed.

## 7. Source-To-Phase Matrix

| Source area | Current role | First touched in | Risk | Required guard |
| --- | --- | --- | --- | --- |
| `backend/src/agent/core/orchestratorTypes.ts` | Route-facing orchestrator contract | M1 inventory, M6 harness | High | Hook inventory test and route/service tests |
| `backend/src/agentRuntime/runtimeSelection.ts` | Runtime selection and factory | M1 tests, M5 registry | High | Runtime selection matrix, provider pinning tests |
| `backend/src/services/providerManager/types.ts` | Public provider runtime values | M1 tests, M10 only for public third-party | High | Do not widen public runtime kind before M10 |
| `backend/src/agentRuntime/runtimeCommon.ts` | Existing shared helpers | M3 | Medium | Reuse, do not duplicate |
| `backend/src/agentv3/claudeRuntime.ts` | Claude product plus SDK loop | M3 shadow, M4 adoption, M6 adapter | High | Claude focused tests, scene regression, close/cancel test |
| `backend/src/agentOpenAI/openAiRuntime.ts` | OpenAI product plus SDK loop | M3 shadow, M4 adoption, M6 adapter | High | OpenAI focused tests, e2e startup, scene regression |
| `backend/src/agentv3/mcpToolRegistry.ts` | Tool registry and Claude SDK server | M2 | High | Registry, standalone MCP, OpenAI adapter tests |
| `backend/src/agentOpenAI/openAiToolAdapter.ts` | Claude descriptor to OpenAI tool adapter | M2 | High | Schema/argument/error parity tests |
| `backend/src/agentv3/standaloneMcpServer.ts` | External safe MCP exposure | M2 | High | Public/internal exposure tests |
| `backend/src/agent/types.ts` | Public `StreamingUpdate` contract | M1 inventory, M6 harness | High | Event inventory, SSE, CLI tests |
| `backend/src/routes/agentRoutes.ts` | SSE projection and final `analysis_completed` | M1 tests, M6 harness | High | SSE projection tests, scene regression |
| `backend/src/cli-user/services/cliAnalyzeService.ts` | CLI event and artifact path | M1 tests, M6 harness | Medium | CLI service tests |
| `backend/src/agentv3/sessionStateSnapshot.ts` | Durable product and engine state | M1 inventory, M7 split | High | Snapshot migration/fail-fast tests |

## 8. How We Avoid Breaking Existing Logic

The safety plan is structural:

1. Characterize first. M1 creates tests for current public contracts before code
   is moved.
2. Keep production paths unchanged until parity exists. M2 and M3 can be
   introduced as adapters/shadow specs.
3. Use native SDK loops. Claude and OpenAI keep their current loop semantics
   until a phase explicitly changes them.
4. Preserve public event names. `StreamingUpdate` remains the product stream;
   internal native events do not leak to clients.
5. Keep Provider Manager stable. Public runtime kinds stay Claude/OpenAI until a
   future user-facing phase.
6. Keep snapshots stable early. Snapshot splitting waits until the harness path
   is proven.
7. Add fake third-party tests before real third-party code. This catches
   hardcoded two-engine assumptions without adding dependency risk.
8. Require scene regression for runtime/provider/session/tool changes.
9. Require `npm run verify:pr` before landing any default runtime switch or
   user-facing runtime option.
10. Make rollback cheap. M4-M6 should be reversible by restoring the old factory
    path or disabling the harness flag.

## 9. Verification Matrix

| Change type | Minimum verification |
| --- | --- |
| Docs-only, not runtime-read | `git diff --check` |
| Type-only runtime contracts | `cd backend && npx tsc --noEmit` plus focused contract tests |
| Runtime selection/provider pinning | `runtimeSelection`, provider service/routes, session service tests |
| Tool registry/adapters | MCP registry, standalone MCP, OpenAI tool adapter tests, scene trace regression |
| Runtime setup or engine loop changes | focused runtime tests, typecheck, build, scene trace regression |
| OpenAI runtime behavior | OpenAI focused tests plus `npm run verify:e2e:openai-startup` when behavior changes |
| Snapshot/resume/report changes | session service, persistence, report/snapshot tests, scene trace regression |
| Harness default switch | focused runtime/session/CLI/report tests, scene trace regression, root `npm run verify:pr` |
| Public third-party runtime | root `npm run verify:pr`, UI/provider tests, npm/Docker/portable packaging smokes |

## 10. Rollback Plan

M1: Remove characterization-only tests if they are wrong, no product rollback.

M2: Keep old Claude descriptor path until shared specs are proven. If adapters
fail, switch registry output back to existing SDK-shaped descriptors.

M3: Disable shadow spec construction. Existing runtimes continue to prepare
requests themselves.

M4: Revert the runtime preparation adoption or guard it behind a flag.

M5: Remove fake third-party registration. Public runtime selection remains
Claude/OpenAI.

M6: Keep `createAgentOrchestrator` returning direct Claude/OpenAI runtimes until
the harness passes parity. Rollback is the factory switch.

M7: If snapshot v2 migration fails, keep v1 snapshot writes and postpone the
state split.

M8-M10: Third-party work must be optional. Removing the experiment should not
affect Claude/OpenAI imports, packaging, or Provider Manager config.

M12-M14: OpenCode follows the same third-party expansion discipline as Pi:
source/API spike first, hidden runtime second, public option only after backend
smoke, frontend/provider checks, report inspection, and root `verify:pr` pass.
OpenCode must be treated as a coding-agent surface with built-in project/file/
shell affordances until source evidence proves those can be disabled or bypassed
inside SmartPerfetto.

## 11. Development TODO Checklist

- [x] M0: Draft v2 accepted after review.
- [x] M1: Add orchestrator, event, selection, snapshot, and tool inventory
  tests.
- [x] M2: Introduce shared tool body and SDK-native adapters.
- [x] M3: Add shared `AnalysisRunSpec` in shadow mode.
- [x] M4: Adopt shared preparation in Claude/OpenAI runtimes.
- [x] M5: Add runtime registry and fake third-party adapter tests.
- [x] M6: Decide and implement `AnalysisHarness` strangler behind a safe gate.
- [x] M7: Split snapshot state only after harness parity.
- [x] M8: Run real Pi/third-party API spike.
- [x] M9: Add hidden experimental third-party runtime only if M8 succeeds.
- [x] M10: Expose user-facing runtime option only after full verification.
- [x] M11: Complete post-public Pi parity and final multi-agent E2E gates.
- [x] M12: Run OpenCode source/API spike and decide adapter boundary.
- [x] M13: Add hidden experimental OpenCode runtime only if M12 succeeds.
- [x] M14: Expose OpenCode as a user-facing fourth runtime only after full
  verification.

## 12. Open Questions

1. Should M4 be one PR per runtime or one PR that changes both Claude and
   OpenAI together? Safer default: one runtime at a time after shared tests land.
2. Should M6 use a runtime flag, an internal constructor path, or a test-only
   factory first? Safer default: test-only factory, then hidden flag.
3. Should snapshot v2 preserve v1 resume compatibility? This must be decided in
   M7, not earlier.
4. Should classifier behavior ever be unified? Safer default: preserve current
   engine-specific behavior until a separate behavior-change plan exists.
5. Which real Pi surface is appropriate if M8 proceeds? The answer must come
   from source/API evidence, not inference.
6. Does OpenCode expose a narrow SDK/server surface that can run only
   SmartPerfetto request-scoped tools, or must it be treated as an external
   orchestrator with stronger sandboxing and a no-go/default-hidden decision?

## 13. Final Acceptance Criteria

This feature is complete only when:

- Claude and OpenAI both run through the intended shared preparation/tool
  surfaces without changing user-visible behavior.
- The public `IOrchestrator`, `StreamingUpdate`, report, CLI, and snapshot
  surfaces are protected by tests.
- Provider Manager and runtime pinning semantics remain intact.
- A fake third-party adapter proves the architecture is not hardcoded to two
  engines.
- Any real third-party/Pi work is optional, gated, and backed by source evidence.
- Any OpenCode work is optional, gated, source-grounded, and does not enable
  built-in file/shell/project-discovery behavior in SmartPerfetto product
  paths.
- Root `npm run verify:pr` passes before any default runtime switch or
  user-facing runtime option lands.
