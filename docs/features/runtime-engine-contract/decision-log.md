# Runtime Engine Contract Decision Log

Status: active
Created: 2026-05-31
Last updated: 2026-06-01 21:09:18 CST

## Decisions

### D001 - Bootstrap From Draft v2, Not Earlier Review Rounds

Time: 2026-05-31 19:05:47 CST
Milestone: bootstrap

Decision:
- Treat `README.md` Draft v2 and Round 4 in `review-rounds.md` as the current
  execution direction.
- Earlier review rounds remain historical evidence but do not override the
  current Pi-ready, not Pi-driven plan.

Rationale:
- `README.md` now explicitly keeps public runtime choices scoped to
  `claude-agent-sdk` and `openai-agents-sdk` until later phases.
- Round 4 supersedes the earlier Pi-first blocker and preserves future Pi work
  as M8+.

Implications:
- M1-M5 focus on Claude/OpenAI refactor safety plus fake third-party tests.
- No early production Pi dependency, Provider Manager UI change, or public Pi
  runtime option.

### D002 - Preserve Claude/OpenAI Behavior Until Explicit Milestone Says Otherwise

Time: 2026-05-31 19:05:47 CST
Milestone: bootstrap

Decision:
- The initial milestones preserve existing Claude/OpenAI runtime behavior.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes, by default through M5.
- Expand runtime contract: only through tests/shared internal seams until M5.
- Modify public `AgentRuntimeKind`: no, not before M10.
- Introduce fake third-party adapter: yes, in tests by M2/M5.
- Enter `AnalysisHarness`: no before M6 go/no-go.
- Touch snapshot state split: no before M7.
- Enter real Pi/API spike: no before M8.

Rationale:
- The plan requires characterization before behavior changes and forbids a
  big-bang rewrite.

### D003 - Current Primary Agent Uses Self-Check Instead Of Codex Reviewing Itself

Time: 2026-05-31 19:05:47 CST
Milestone: bootstrap

Decision:
- Do not call Codex as an independent reviewer for this task because the
  current primary agent is Codex.
- Use milestone tests, E2E/scene regression, and recorded post-diff self-checks
  as the quality gates requested by the maintainer.

Rationale:
- Project instructions say if the primary agent is Codex, do not call Codex to
  review itself.

### D004 - M1 Is Characterization-Only

Time: 2026-05-31 19:12:10 CST
Milestone: M1

Decision:
- M1 changes are limited to tests and driver docs. No production runtime,
  Provider Manager, route, CLI, report, snapshot, or tool implementation code
  was changed.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes.
- Expand runtime contract: no production contract expansion in M1.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: no, deferred to M2/M5.
- Enter `AnalysisHarness`: no.
- Touch snapshot state split: no, inventory only.
- Enter real Pi/API spike: no.

Rationale:
- Draft v2 requires characterization before runtime changes.
- Focused tests now protect current event, snapshot, provider, session, and
  tool behavior before M2 begins.

### D005 - Shared Tool Body, SDK-Native Invocation

Time: 2026-05-31 19:23:36 CST
Milestone: M2

Decision:
- Introduce `SharedToolSpec` as the SmartPerfetto tool body and keep each SDK
  on native tool invocation.
- Keep Zod raw shape as the canonical early schema source. Emit JSON Schema for
  OpenAI and standalone MCP adapters from the same raw shape.
- Keep `McpToolRegistry.registerSdk` as the compatibility bridge while storing
  both `shared` and Claude SDK-native descriptor views.
- Preserve ACI snapshot default-summary behavior; a missing explicit summary
  still emits `''`.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes, native loops and tool invocation
  remain in place.
- Expand runtime contract: yes, internally through shared tool body only.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: yes, test-only coverage in M2.
- Enter `AnalysisHarness`: no.
- Touch snapshot state split: no.
- Enter real Pi/API spike: no.

Rationale:
- Draft v2 requires shared tool bodies without moving execution ownership into
  a universal harness dispatcher.
- Zod is already the practical current source; adding TypeBox or Pi-specific
  schema dependencies before M8 would be premature.

### D006 - AnalysisRunSpec Is Shadow-Only And Preserves Classifier Differences

Time: 2026-05-31 19:29:31 CST
Milestone: M3

Decision:
- Introduce `AnalysisRunSpec` as a pure shadow preparation output.
- Do not make Claude or OpenAI production loops consume the spec before M4.
- Keep classifier behavior as runtime-specific policy data:
  - Claude: local rules plus Claude light-model classifier fallback.
  - OpenAI: local rules plus OpenAI light-model classifier fallback.
- Keep continuation behavior runtime-specific:
  - Claude owns verifier/correction loop.
  - OpenAI owns plan/final-report continuations.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes.
- Expand runtime contract: yes, internally through a shadow run-spec type.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: already test-only in M2; no new runtime.
- Enter `AnalysisHarness`: no.
- Touch snapshot state split: no.
- Enter real Pi/API spike: no.

Rationale:
- Draft v2 requires proving shared request preparation before adoption.
- Classifier unification would be a behavior change and is outside M3.

### D007 - M4 Shared Preparation Adoption Is Implemented But Not Released Past Gate

Time: 2026-05-31 19:36:18 CST
Milestone: M4

Decision:
- Adopt `AnalysisRunSpec` inside Claude/OpenAI runtimes only for preparation
  fields with existing parity coverage: provider scope, knowledge scope, trace
  context prompt section, session map key, previous-turn context, and
  budget/policy snapshots.
- Preserve native SDK loops and runtime-specific continuation/verifier
  ownership.
- Do not proceed to M5 while `verify:e2e:openai-startup` is failing.
- Do not assume a waiver for the OpenAI startup E2E gate. The current failure is
  external provider quota: `429 Insufficient balance or no resource package`.

Tracked questions:
- Keep Claude/OpenAI original behavior: intended yes; local tests and scene
  regression pass, but OpenAI startup E2E remains externally blocked.
- Expand runtime contract: yes, internally by consuming existing M3 run-spec
  fields in M4 runtime preparation.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: no new production adapter; existing M2
  fake adapter remains test-only.
- Enter `AnalysisHarness`: no.
- Touch snapshot state split: no.
- Enter real Pi/API spike: no.

Rationale:
- Draft v2 makes M4 the first behavior-risky phase and requires OpenAI startup
  E2E when OpenAI runtime behavior changes.
- The failing E2E did start the OpenAI runtime path and reached the configured
  model, but the provider rejected the request before analysis evidence could
  be produced. This is not enough to clear the M4 gate.

### D008 - M4 Retry Does Not Create An E2E Waiver

Time: 2026-05-31 19:38:54 CST
Milestone: M4

Decision:
- Keep M4 blocked after a second `verify:e2e:openai-startup` attempt failed
  with the same external `429 Insufficient balance or no resource package`
  provider response.
- Do not substitute CLI fake E2E or scene regression for the required OpenAI
  startup E2E without an explicit maintainer decision.

Tracked questions:
- Keep Claude/OpenAI original behavior: intended yes; still not fully proven by
  the required OpenAI startup E2E.
- Expand runtime contract: no additional expansion in this retry.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: no.
- Enter `AnalysisHarness`: no.
- Touch snapshot state split: no.
- Enter real Pi/API spike: no.

Rationale:
- The project has fake modes for CLI/codebase E2E, but no existing offline
  replacement for the OpenAI startup E2E gate. Replacing that gate would be a
  maintainer decision, not an implementation assumption.

### D009 - Goal Blocked After Three Consecutive M4 E2E Quota Failures

Time: 2026-05-31 19:40:22 CST
Milestone: M4

Decision:
- Treat the active thread goal as blocked after a third consecutive
  `verify:e2e:openai-startup` attempt failed with the same external
  OpenAI-compatible provider quota response.
- Do not start M5 while M4 lacks a passing required E2E gate or explicit
  maintainer waiver/alternate gate.

Tracked questions:
- Keep Claude/OpenAI original behavior: not fully proven because the required
  OpenAI startup E2E remains externally blocked.
- Expand runtime contract: no additional expansion.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: no.
- Enter `AnalysisHarness`: no.
- Touch snapshot state split: no.
- Enter real Pi/API spike: no.

Rationale:
- The implementation has exhausted meaningful self-contained progress inside
  the current gate. Continuing would either skip a required gate or replace it
  without maintainer approval.

### D010 - M4 Gate Cleared After Provider Recharge

Time: 2026-05-31 19:53:08 CST
Milestone: M4

Decision:
- Treat M4 as completed because the required OpenAI startup E2E passed after
  the provider was recharged.
- Start M5 using the normal milestone flow. No waiver or alternate gate is
  needed.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes, backed by focused tests,
  typecheck/build, scene trace regression, and the passing OpenAI startup E2E.
- Expand runtime contract: only the planned internal M4 shared-preparation
  adoption.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: no additional adapter in M4; M5 will add
  registry-level fake third-party tests.
- Enter `AnalysisHarness`: no.
- Touch snapshot state split: no.
- Enter real Pi/API spike: no.

Rationale:
- The E2E produced a completed final report, passed claim verification, emitted
  no SSE errors, and preserved required startup evidence. The previous blocker
  was external quota, not a product behavior failure.

### D011 - Internal Runtime Registry And Capabilities Without Public Runtime Expansion

Time: 2026-05-31 19:58:53 CST
Milestone: M5

Decision:
- Add an internal runtime registry and `EngineCapabilities` seam for production
  Claude/OpenAI factories.
- Keep public `AgentRuntimeKind`, Provider Manager schemas, and accepted
  `SMARTPERFETTO_AGENT_RUNTIME` values limited to `claude-agent-sdk` and
  `openai-agents-sdk`.
- Register fake third-party engines only in tests.
- Move `AnalysisRunSpec` classifier and continuation policy selection to
  `EngineCapabilities` instead of hardcoded runtime branches.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes; factory outputs and runtime
  selection precedence are covered by focused tests and scene regression.
- Expand runtime contract: yes, internally through registry/capabilities only.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: yes, test-only registry and spec-policy
  coverage.
- Enter `AnalysisHarness`: no.
- Touch snapshot state split: no.
- Enter real Pi/API spike: no.

Rationale:
- M5 should prove third-party readiness without making a third-party runtime a
  product option. The fake test runtime exercises the registry and shared
  policy path while remaining outside Provider Manager and public env parsing.

### D012 - M6 Adds Hidden Harness Wrapper Only, No Default Path Switch

Time: 2026-05-31 20:02:43 CST
Milestone: M6

Decision:
- Implement `AnalysisHarness` as a hidden/test-only wrapper around an existing
  engine orchestrator.
- Do not register the harness as a production runtime.
- Do not switch `createAgentOrchestrator`, routes, CLI, reports, or snapshots
  to the harness default path in M6.
- Preserve optional-hook presence semantics by exposing optional forwarding
  methods only when the wrapped engine exposes them.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes, production runtime selection still
  returns direct Claude/OpenAI runtimes.
- Expand runtime contract: yes, internally through a hidden harness wrapper and
  focused tests.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: unchanged from M5; no new production
  adapter.
- Enter `AnalysisHarness`: yes, hidden/test-only wrapper only.
- Touch snapshot state split: no.
- Enter real Pi/API spike: no.

Rationale:
- M6 should prove the `IOrchestrator` hook routing boundary before any default
  switch. Keeping optional-hook presence identical to the wrapped engine avoids
  route behavior drift if the harness is later made default.

### D013 - M7 Snapshot Split No-Go Until Harness Default/Parity Decision

Time: 2026-05-31 20:04:04 CST
Milestone: M7

Decision:
- Do not start the snapshot state split while `AnalysisHarness` is only
  hidden/test-only.
- Treat M7 as blocked on a maintainer decision because `README.md` requires the
  harness to have become the default path before snapshot split.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes; no M7 code changes were made.
- Expand runtime contract: no additional expansion.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: no.
- Enter `AnalysisHarness`: not beyond M6 hidden/test-only wrapper.
- Touch snapshot state split: no, blocked.
- Enter real Pi/API spike: no.

Rationale:
- Snapshot state split changes durable resume/report behavior and requires root
  `npm run verify:pr`. Doing it before harness default/parity would violate the
  M7 precondition and remove a clear rollback boundary.

### D014 - AnalysisHarness Becomes Default Wrapper With Env Kill Switch

Time: 2026-05-31 20:52:34 CST
Milestone: M7 prerequisite

Decision:
- Wrap production Claude/OpenAI orchestrators with `AnalysisHarness` by default
  after runtime registry selection.
- Add `SMARTPERFETTO_ANALYSIS_HARNESS=0` as the rollback switch to return the
  direct engine path.
- Keep the harness as a wrapper only; it does not own SDK inner loops, SDK tool
  invocation, route terminal event synthesis, or snapshot splitting.
- Keep `RuntimeToolSpec` source imports inside declared dependencies by
  deriving MCP result/annotation types from the Claude SDK descriptor instead
  of importing the transitive MCP SDK package directly.
- Keep the Jest Claude SDK mock aligned with the real SDK descriptor shape so
  characterization tests exercise the same `inputSchema` boundary.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes, backed by focused tests,
  OpenAI startup E2E, `test:core`, scene trace regression, and root
  `npm run verify:pr`.
- Expand runtime contract: yes, the planned harness wrapper is now the default
  route-facing wrapper with an env rollback switch.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: unchanged from M5; no new production
  adapter.
- Enter `AnalysisHarness`: yes, as a default wrapper around the selected
  Claude/OpenAI engine.
- Touch snapshot state split: no.
- Enter real Pi/API spike: no.

Rationale:
- M7 snapshot split required a harness-default/parity decision. Wrapping the
  already selected production engine keeps runtime/provider pinning and SDK
  ownership intact while making the route-facing path comparable enough for M7
  planning. The kill switch preserves a scoped rollback path.

### D015 - M7 Uses Compatible Engine-State Split, Not Fail-Fast Cutover

Time: 2026-05-31 20:57:23 CST
Milestone: M7

Decision:
- Add canonical `engineState` to `SessionStateSnapshot` and move Claude SDK
  session state plus OpenAI response/history/run state under that engine-local
  boundary.
- Keep legacy top-level runtime mirror fields during this milestone so existing
  persisted sessions, CLI artifact config, reports, and resume paths remain
  compatible.
- Product consumers must read runtime/provider state through helper functions,
  not by directly reaching into engine-specific state.
- Do not bump to a fail-fast snapshot version in M7 because no release-boundary
  decision has authorized breaking old in-flight or persisted sessions.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes, restore reads `engineState` first
  and falls back to legacy v1 mirrors.
- Expand runtime contract: yes, internally through a typed engine-state
  snapshot boundary.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: unchanged from M5; no new production
  adapter.
- Enter `AnalysisHarness`: already default wrapper from D014.
- Touch snapshot state split: yes, as a compatible split with legacy mirrors.
- Enter real Pi/API spike: no.

Rationale:
- M7 requires the split, but the current code has durable legacy fallback paths
  and CLI config surfaces that would be unnecessarily broken by a fail-fast cut.
  A compatible canonical field gives the architecture a clean boundary while
  preserving a scoped rollback path.

### D016 - M7 Gate Passed; M8 Remains Evidence-Only

Time: 2026-05-31 21:07:08 CST
Milestone: M7

Decision:
- Treat M7 as completed after focused snapshot/runtime tests, route/resume/SSE
  coverage, typecheck/build, scene trace regression, root `npm run verify:pr`,
  and post-diff self-check passed.
- Allow M8 to begin as a source-grounded Pi/third-party API spike only.
- M8 must not add a production Pi dependency, public runtime value, Provider
  Manager UI, packaging exposure, shell/file tools, or product runtime path.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes, backed by focused tests, root
  `verify:pr`, and scene trace regression.
- Expand runtime contract: yes, through canonical snapshot `engineState`.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: unchanged from M5; no new production
  adapter.
- Enter `AnalysisHarness`: already default wrapper from D014.
- Touch snapshot state split: yes, completed as a compatible split.
- Enter real Pi/API spike: yes next, but evidence-only and not a product path.

Rationale:
- The snapshot split gives the runtime boundary a durable state seam while
  retaining rollback through legacy mirrors. The next useful risk-reduction
  step is to inspect real Pi/third-party APIs against the seams already built,
  without changing production behavior.

### D017 - M8 Starts As Package Evidence Spike Only

Time: 2026-05-31 21:10:02 CST
Milestone: M8

Decision:
- Inspect real `pi-ai` and `pi-agent-core` package metadata and tarball
  contents without adding them to production dependencies or runtime imports.
- Run only safe metadata/import smokes outside the SmartPerfetto product path,
  if package contents show such a smoke will not mutate workspace state,
  discover `.pi`, or enable shell/file tools.
- Record findings in `pi-spike.md` before any later hidden runtime decision.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes; M8 should be docs/spike-only.
- Expand runtime contract: no production expansion in M8 unless findings only
  recommend future contract changes.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: unchanged from M5; no new production
  adapter.
- Enter `AnalysisHarness`: unchanged.
- Touch snapshot state split: no additional M8 snapshot code.
- Enter real Pi/API spike: yes, package/source evidence only.

Rationale:
- M8's value is reducing uncertainty about the real third-party surface after
  the extension seams exist. Installing or wiring a package now would violate
  the Pi-ready, not Pi-driven boundary.

### D018 - M8 Recommends Pi Agent Core Only Behind A Future Hidden Gate

Time: 2026-05-31 21:17:11 CST
Milestone: M8

Decision:
- Treat unscoped `pi-ai` and `pi-agent-core` as no-go package names because
  they are placeholder `0.0.1` reservations with no usable runtime API.
- Treat `@earendil-works/pi-agent-core@0.78.0` as the only plausible future
  thin-engine adapter target.
- Do not embed `@earendil-works/pi-coding-agent` as a production orchestrator;
  it is a larger external coding-agent product surface with resource discovery,
  sessions, built-in file/shell tools, packages, extensions, prompts, and TUI
  concerns.
- Do not start M9 coding without an explicit maintainer go decision because
  M9 would introduce a real optional third-party dependency and hidden runtime
  path.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes; M8 changed only docs/spike
  evidence.
- Expand runtime contract: not in production. Future M9 would need explicit
  `EngineCapabilities` additions for TypeBox schema dialect, Pi agent-core
  event kinds, abort support, state shape, and tool execution policy.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: unchanged from M5; M8 only compares the
  real Pi surface against fake third-party seams.
- Enter `AnalysisHarness`: unchanged.
- Touch snapshot state split: no new snapshot code; M8 only maps future Pi
  state needs to the M7 `engineState` boundary.
- Enter real Pi/API spike: yes, completed as package/API evidence only.

Rationale:
- `@earendil-works/pi-agent-core` matches Draft v2's "SDK owns inner loop +
  native tool execution" direction closely enough to justify a hidden adapter
  design, but its TypeBox schema model, dependency footprint, event projection,
  and resource-discovery/security boundaries need explicit approval before any
  package enters SmartPerfetto code or packaging.

### D019 - Goal Continuation Grants M9 Hidden Runtime Go Under M8 Guardrails

Time: 2026-05-31 22:31:49 CST
Milestone: M9

Decision:
- Treat the goal continuation after the M8 stop point as maintainer go for M9
  coding, limited to a hidden experimental runtime path.
- The M9 implementation must target the M8-recommended
  `@earendil-works/pi-agent-core` surface or a fake Pi-like adapter first.
- Do not expose a public runtime option, Provider Manager UI, public
  `AgentRuntimeKind`, or public `SMARTPERFETTO_AGENT_RUNTIME=pi-*` value in M9.
- Keep the real package optional/dynamic so Claude/OpenAI production paths and
  default packaging remain usable without Pi.
- Do not use `@earendil-works/pi-coding-agent` as a production orchestrator in
  M9.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes; M9 must be opt-in and hidden.
- Expand runtime contract: yes, internally if needed for Pi-like TypeBox
  schema dialect, event kinds, abort support, state payload, and tool execution
  policy.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: yes, M9 should include Pi-like fake
  parity before relying on any real package behavior.
- Enter `AnalysisHarness`: unchanged; it remains the route-facing wrapper.
- Touch snapshot state split: only through engine-local state if needed for the
  hidden adapter; product snapshot/report fields must not move.
- Enter real Pi/API spike: already completed in M8; M9 may add hidden
  experiment code only behind a gate.

Rationale:
- M8 answered the package/API question and found a plausible thin-engine
  target. The next end-state requirement is a hidden experimental third-party
  runtime, but the risk must stay contained behind explicit experiment gating,
  dynamic import, fake adapter tests, and full PR verification.

### D020 - M9 Hidden Runtime Uses Dynamic Optional Pi Agent Core, Not Production Dependency

Time: 2026-05-31 22:48:21 CST
Milestone: M9

Decision:
- Add `experimental-pi-agent-core` as an internal hidden runtime kind only.
- Gate it behind `SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME=1` and
  `SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME=experimental-pi-agent-core`.
- Do not accept `experimental-pi-agent-core` through public
  `SMARTPERFETTO_AGENT_RUNTIME`.
- Load `@earendil-works/pi-agent-core` only through dynamic import or an
  explicit module path. Do not add it to root/backend package manifests.
- Disable external discovery and built-in shell/file tools by construction:
  the adapter starts with no tools, blocks unexpected native tool calls, and
  only exposes request-scoped shared SmartPerfetto tools through the adapter
  helper.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes, hidden env only after provider,
  snapshot, and public env selection gates.
- Expand runtime contract: yes, internally for Pi agent-core capabilities,
  event projection, abort, optional dynamic import, and TypeBox-like tool
  schema output.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: yes, Pi-like focused tests cover fake
  module behavior and shared-tool adaptation.
- Enter `AnalysisHarness`: unchanged; hidden runtime is wrapped by the default
  harness like other selected engines.
- Touch snapshot state split: no new product snapshot fields in M9.
- Enter real Pi/API spike: completed in M8; M9 only adds hidden optional code.

Rationale:
- M9 needs a real third-party smoke without making Pi a production dependency or
  a public product option. Dynamic import plus hidden env gating preserves
  packaging and rollback boundaries while proving the M8-recommended surface.

### D021 - M9 Gate Passed; M10 Requires Separate Public-Surface Approval

Time: 2026-05-31 22:48:21 CST
Milestone: M9

Decision:
- Treat M9 as completed after focused tests, hidden real-package smoke,
  typecheck, scene trace regression, root `npm run verify:pr`, package impact
  scan, and post-diff self-check passed.
- Do not start M10 automatically. M10 would intentionally modify public
  Provider Manager/runtime/UI/docs/packaging surface and needs an explicit
  maintainer go decision.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes, verified by root `verify:pr` and
  scene trace regression.
- Expand runtime contract: M9 internal expansion completed.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: already present and extended with Pi-like
  tests.
- Enter `AnalysisHarness`: unchanged.
- Touch snapshot state split: no additional state split.
- Enter real Pi/API spike: no additional spike beyond hidden smoke.

Rationale:
- Hidden runtime success proves optional third-party execution can sit behind
  the runtime contract. User-facing exposure is a different product/API
  decision and should not be inferred from hidden smoke success.

### D022 - Goal Continuation Grants M10 Public-Surface Go With Capability Limits

Time: 2026-05-31 22:56:33 CST
Milestone: M10

Decision:
- Treat the current goal continuation as maintainer go to start M10, because
  the active objective still explicitly includes M10 and the user resumed the
  goal after M9 stopped on the public-surface approval boundary.
- Expose Pi agent-core only as a capability-limited public runtime option.
- Keep the M9 hidden `experimental-pi-agent-core` path available as a
  compatibility/rollback path while adding a public runtime value.
- Do not present Pi agent-core as equivalent to Claude/OpenAI unless tests and
  docs prove the specific capability.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes, all existing selection precedence
  and Provider Manager pinning must stay covered.
- Expand runtime contract: yes, publicly for Pi agent-core.
- Modify public `AgentRuntimeKind`: yes, M10 is the first phase allowed to do
  this.
- Introduce fake third-party adapter: already present; keep it as contract
  coverage.
- Enter `AnalysisHarness`: unchanged.
- Touch snapshot state split: only as needed to type the public runtime state;
  product/report fields must stay separate.
- Enter real Pi/API spike: no new spike; use M8 evidence plus M9 hidden smoke.

Rationale:
- M10's value is making the third-party runtime surface explicit and reversible.
  The risk is product/API exposure, so the implementation must couple UI,
  Provider Manager validation, docs, package checks, and full verification
  rather than only widening a backend union type.

### D023 - M10 Ships Pi Agent Core As Optional Public Preview

Time: 2026-05-31 23:18:59 CST
Milestone: M10

Decision:
- Treat `pi-agent-core` as a public `AgentRuntimeKind` only after M9 hidden
  smoke and M10 full verification passed.
- Limit Provider Manager public Pi support to `custom` providers with explicit
  Pi model JSON. Official Claude/OpenAI provider presets must not expose Pi as
  a selectable runtime.
- Keep `@earendil-works/pi-agent-core` as an optional backend dependency and
  keep runtime loading dynamic/module-path based.
- Preserve the hidden `experimental-pi-agent-core` path as a rollback and
  compatibility path.
- Document Pi as capability-limited, not feature-equivalent to Claude/OpenAI.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes, backed by focused runtime/provider
  tests, root `verify:pr`, and scene trace regression.
- Expand runtime contract: yes, now publicly for Pi agent-core.
- Modify public `AgentRuntimeKind`: yes, intentionally in M10 only.
- Introduce fake third-party adapter: already present; M10 keeps fake
  third-party tests as architecture guard coverage.
- Enter `AnalysisHarness`: unchanged; it remains the route-facing wrapper.
- Touch snapshot state split: yes, only to add typed public Pi engine-local
  state; product/report fields remain separate.
- Enter real Pi/API spike: already completed in M8; M10 uses M8 evidence plus
  M9/M10 smokes.

Rationale:
- M10's user-facing value requires backend, Provider Manager, UI, docs,
  packaging, and rollback to move together. Optional dependency plus custom-only
  Provider Manager exposure keeps existing Claude/OpenAI users insulated while
  making the third-party runtime explicit and testable.

### D024 - Post-M10 Claude Correction Is Text-Only And Skipped For Deliverable Reports

Time: 2026-06-01 02:08:02 CST
Milestone: Post-M10 E2E

Decision:
- Keep Claude/OpenAI original runtime behavior, but change Claude's post-report
  correction retry policy.
- Correction retry must not expose MCP tools, must not resume the long-running
  SDK analysis conversation, and must not perform additional data gathering.
- The correction prompt may use the existing report text and verifier issues
  only.
- If the current conclusion is already a deliverable final report, skip the
  extra SDK correction unless the verifier found a truncation error.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes for the main SDK-native analysis
  loop and tool execution; only post-report correction policy changed.
- Expand runtime contract: no.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: already present; unchanged.
- Enter `AnalysisHarness`: unchanged.
- Touch snapshot state split: no.
- Enter real Pi/API spike: no.

Rationale:
- Post-M10 E2E showed that report correction retries can generate timeout and
  session-limit noise after the main Claude report is already deliverable and
  passes final E2E/claim-verifier gates. Treating correction as text-only and
  skipping it for deliverable non-truncated reports preserves the quality gate
  without turning optional cleanup into a source of runtime instability.

### D025 - Final Claude E2E Matrix Is Temporarily Blocked By External SDK Quota

Time: 2026-06-01 02:08:02 CST
Milestone: Post-M10 E2E

Decision:
- Do not mark the three-agent E2E matrix complete until Claude startup and
  scrolling can be rerun after quota is available.
- Treat the current Claude failure as an external execution blocker, not a
  maintainer architecture decision and not a code rollback trigger.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes; no fallback runtime should mask a
  Claude-specific quota failure in Claude E2E.
- Expand runtime contract: no.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: unchanged.
- Enter `AnalysisHarness`: unchanged.
- Touch snapshot state split: no.
- Enter real Pi/API spike: no.

Rationale:
- The latest Claude startup rerun failed before any agent task/tool execution
  with `You've hit your session limit · resets 6am (Asia/Shanghai)`. OpenAI,
  Pi preview, focused Jest, typecheck, and scene regression can continue, but
  Claude startup/scrolling E2E must wait for quota reset/restoration.

### D026 - Pi Agent Core Must Move From Preview Smoke To Shared SmartPerfetto Analysis

Time: 2026-06-01 02:16:19 CST
Milestone: M11

Decision:
- Treat the maintainer's latest instruction as approval and requirement to
  implement a real Pi Agent Core analysis path, not only a capability-limited
  fake-stream preview.
- Align Pi with Claude/OpenAI by reusing SmartPerfetto-owned product seams:
  system prompt assembly, strategy/scene context, shared MCP tool bodies,
  planning and hypothesis tools, route-owned finalization, report/snapshot
  surfaces, and claim-verification artifacts.
- Keep Pi Agent Core as the native inner loop and tool executor. Do not embed
  `@earendil-works/pi-coding-agent`, `.pi` discovery, shell tools, file tools,
  or package-extension tools.
- Keep fake-stream mode as an explicit smoke/test mode and continue labeling it
  capability-limited.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes. M11 changes only the Pi runtime
  implementation and shared tests; Claude/OpenAI remain first-class.
- Expand runtime contract: no new public runtime value; M11 deepens the
  existing public `pi-agent-core` capability behind the same contract.
- Modify public `AgentRuntimeKind`: no; `pi-agent-core` was already added in
  M10.
- Introduce fake third-party adapter: already present; M11 adds real Pi parity
  tests and keeps fake-stream smoke separate.
- Enter `AnalysisHarness`: unchanged; Pi remains wrapped by the existing
  harness when enabled.
- Touch snapshot state split: only if needed to persist Pi engine-local opaque
  state; product/report fields must stay top-level.
- Enter real Pi/API spike: no new package spike; use the M8/M10 source-grounded
  `@earendil-works/pi-agent-core@0.78.0` evidence.

Rationale:
- The package API supports a Claude-like native loop with SmartPerfetto tools:
  `Agent` accepts system prompt/model/tools, emits lifecycle/tool events, runs
  request-scoped `AgentTool`s, supports sequential execution, abort, session id,
  and dynamic API key resolution. The current adapter deliberately leaves those
  capabilities unused, so presenting Pi as public-preview-only no longer
  satisfies the goal.

### D027 - M11 Pi Real Runtime Uses Shared SmartPerfetto Contract

Time: 2026-06-01 03:09:28 CST
Milestone: M11

Decision:
- Treat M11 as completed after Pi Agent Core real-mode startup and scrolling
  strict E2E passed with claim verification.
- Keep fake-stream as explicit smoke/test-only preview behavior.
- Pi real mode now uses shared SmartPerfetto prompt builders, shared MCP tool
  bodies, request-scoped Pi `AgentTool`s, plan/hypothesis/note tools,
  architecture detection, route-owned finalization, and the shared quality
  pipeline.
- Pi real mode must not emit `analysis_completed`; that remains owned by the
  route after deterministic result processing.
- Pi model configuration may be provided through
  `SMARTPERFETTO_PI_AGENT_CORE_MODEL_JSON`, but secret fields such as `apiKey`
  and `apiKeyEnv` must not be copied into persisted model state.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes. M11 changed Pi implementation and
  Pi tests/docs, while OpenAI final E2E was rerun and passed.
- Expand runtime contract: no new public runtime value; this deepens existing
  `pi-agent-core` behavior.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: already present; M11 keeps fake-stream
  separate from real Pi analysis.
- Enter `AnalysisHarness`: unchanged.
- Touch snapshot state split: only Pi opaque engine-local state helpers; product
  report/claim/snapshot state remains top-level.
- Enter real Pi/API spike: completed earlier; M11 uses the optional
  `@earendil-works/pi-agent-core` runtime plus real model config.

Rationale:
- The previous public-preview Pi path was not enough for the maintainer's
  parity requirement. Passing real startup/scrolling E2E with SmartPerfetto
  tools and claim verification proves Pi can sit behind the same product
  contract without becoming a Claude/OpenAI hardcode or a separate `.pi`
  project runtime.

### D028 - Final Three-Agent Gate Still Waits On External Claude SDK Quota

Time: 2026-06-01 03:22:49 CST
Milestone: Post-M10/M11 E2E

Decision:
- Keep the overall goal active and incomplete even though M11 and OpenAI/Pi E2E
  are green.
- Do not run the final root `npm run verify:pr` as a completion gate until
  Claude startup and scrolling strict E2E can execute after quota restoration.
- Treat the latest Claude startup and scrolling failures as an external SDK
  quota blocker because both runs reached SmartPerfetto preparation but failed
  before any agent task/tool execution.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes; no fallback runtime should mask a
  Claude-specific E2E quota failure.
- Expand runtime contract: no.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: unchanged.
- Enter `AnalysisHarness`: unchanged.
- Touch snapshot state split: no.
- Enter real Pi/API spike: no additional spike.

Rationale:
- The latest Claude startup and scrolling outputs both show
  `agentTaskDispatchedCount=0`, `dataEnvelopeItemCount=0`, and the same SDK
  message: `You've hit your session limit · resets 6am (Asia/Shanghai)`.
  This does not prove or disprove Claude analysis quality after the M11 changes,
  so it cannot close the final matrix.

### D029 - Claude Correction Diagnostics Must Not Become User-Facing Report Scaffold

Time: 2026-06-01 12:21:02 CST
Milestone: Post-M10/M11 E2E

Decision:
- Treat user-visible correction labels and verifier diagnostics at the top of a
  final report as output abnormalities even when the strict E2E JSON gate
  passes.
- Claude text-only correction must directly output a user report. It must not
  label the report as `修正版`, `修正后`, `corrected`, `revised`, or
  verification feedback.
- Plan deviations, missing tool lists, unresolved hypotheses, and internal
  phase ids should be resolved or summarized inside relevant evidence/
  limitations sections, not exposed as a leading verifier-diagnostic block.
- Keep Final Report Contract content errors correction-blocking. Only
  non-content bookkeeping errors such as `plan_deviation`, plus proven soft
  truncation false positives, may be deferred to final gates for already
  deliverable reports.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes for the main SDK-native analysis
  loop; this changes only the post-report correction prompt/sanitizer.
- Expand runtime contract: no.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: unchanged.
- Enter `AnalysisHarness`: unchanged.
- Touch snapshot state split: no.
- Enter real Pi/API spike: no additional spike.

Rationale:
- The previous Claude scrolling strict E2E passed structured checks but the
  rendered report exposed `滑动性能分析报告（修正版）` and
  `计划执行偏差（p1.5 + p2）` near the top. That is an unacceptable product
  surface leak because the final report should be analysis output, not a
  verifier/debug transcript. Focused tests now cover both prompt constraints and
  sanitizer cleanup; final Claude E2E remains blocked by external SDK quota.

### D030 - OpenCode Must Start As Source-Grounded External-Agent Spike

Time: 2026-06-01 13:11:15 CST
Milestone: M12

Decision:
- Treat the maintainer's OpenCode request as approval to evaluate and, if safe,
  implement OpenCode as a fourth SmartPerfetto agent runtime.
- Start with M12 source/API spike only. Do not add a production package
  dependency, public runtime value, Provider Manager UI, generated frontend
  change, or product import before the spike answers the adapter-boundary
  questions.
- Treat OpenCode as a coding-agent/external-orchestrator surface until source
  evidence proves SmartPerfetto can disable or bypass built-in project
  discovery, file tools, shell tools, extension loading, and OpenCode-owned
  prompts.
- M13 hidden runtime can proceed only if M12 proves a safe SDK/server boundary.
- M14 public fourth runtime can proceed only after hidden smoke, focused tests,
  four-agent startup/scrolling E2E, frontend Provider Manager checks, HTML
  report inspection, and root `verify:pr`.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes; M12 must be docs/spike-only.
- Expand runtime contract: not in production during M12. Possible future M13
  expansion depends on OpenCode source evidence.
- Modify public `AgentRuntimeKind`: no in M12; only M14 may do this.
- Introduce fake third-party adapter: existing fake/Pi coverage remains;
  OpenCode-specific fake coverage is deferred to M13 if the spike succeeds.
- Enter `AnalysisHarness`: unchanged.
- Touch snapshot state split: no in M12.
- Enter real Pi/API spike: no additional Pi spike.
- Enter real OpenCode/API spike: yes, source/package evidence only.

Rationale:
- OpenCode can plausibly be a fourth runtime, but it has a larger coding-agent
  product surface than Pi Agent Core. The safe path is to prove the external
  boundary first, then add a hidden adapter, and only then expose public
  Provider Manager/UI support.

### D031 - M12 Recommends Hidden OpenCode External-Orchestrator Adapter

Time: 2026-06-01 13:16:24 CST
Milestone: M12

Decision:
- Treat M12 as completed and allow M13 hidden runtime work to begin.
- Implement OpenCode as a server-backed external-orchestrator adapter, not as a
  thin in-process SDK engine.
- Use `@opencode-ai/sdk` only through dynamic/optional loading in M13; keep
  `opencode-ai` CLI/server startup outside public package exposure until
  hidden smoke proves the boundary.
- Bridge SmartPerfetto tools through MCP/standalone transport rather than
  OpenCode file-based custom tools.
- M13 must harden config and process environment: isolated HOME/config/project,
  `autoupdate: false`, `share: disabled`, `snapshot: false`, `plugin: []`,
  `instructions: []`, denied `edit`/`bash`/`webfetch`/`external_directory`,
  disabled built-in coding tools, and per-session tool allowlists.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes; M12 changed docs only.
- Expand runtime contract: yes next in M13, hidden only.
- Modify public `AgentRuntimeKind`: no. M13 stays hidden; M14 is the first
  possible public expansion.
- Introduce fake third-party adapter: existing coverage remains; M13 should add
  OpenCode fake/module tests.
- Enter `AnalysisHarness`: unchanged.
- Touch snapshot state split: only opaque hidden OpenCode session state if M13
  needs it.
- Enter real OpenCode/API spike: completed as source/package evidence and safe
  no-model smoke.

Rationale:
- Official docs and package types show OpenCode has usable server/session/event
  APIs, per-session system/model/tools parameters, MCP support, and SDK
  lifecycle control. They also show default coding-agent affordances that are
  unsafe for SmartPerfetto unless explicitly denied and tested.

### D032 - M13 Keeps OpenCode Hidden Until Request-Scoped Tool Parity Exists

Time: 2026-06-01 13:28:50 CST
Milestone: M13

Decision:
- Treat M13 as completed only for a hidden, partial OpenCode runtime smoke.
- Keep OpenCode out of public `SMARTPERFETTO_AGENT_RUNTIME`, Provider Manager
  types/UI, generated frontend contracts, package manifests, and user docs.
- Model OpenCode as a server-backed external-orchestrator adapter with
  hardening owned by SmartPerfetto: isolated HOME/config/project, inline config,
  built-in coding tools disabled, dangerous permissions denied, and route-owned
  `analysis_completed` preserved.
- Allow the existing SmartPerfetto standalone MCP server only behind
  `SMARTPERFETTO_OPENCODE_ENABLE_STANDALONE_MCP=1`. This bridge is public/
  read-only and does not expose trace/session tools.
- Do not enter public M14 until OpenCode has a session-scoped SmartPerfetto MCP
  bridge or equivalent request-scoped tool transport, real model/provider
  mapping, startup/scrolling E2E, frontend checks, report inspection, and root
  `verify:pr`.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes; M13 hidden OpenCode changes do
  not alter Claude/OpenAI/Pi production runtime behavior.
- Expand runtime contract: hidden only. `EngineCapabilities` gained OpenCode
  external-server values; public Provider Manager runtime values are unchanged.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: existing fake/Pi coverage remains; M13
  adds OpenCode fake-module and hidden selection tests.
- Enter `AnalysisHarness`: unchanged; hidden OpenCode is wrapped by the default
  harness when selected through the experimental gate.
- Touch snapshot state split: no.
- Enter real OpenCode/API spike: M12 completed; M13 uses the source-grounded
  SDK/server boundary without adding production dependency exposure.

Rationale:
- OpenCode can be safely started, configured, and connected to a restricted
  public/read-only MCP bridge, but that is not enough to claim Claude/OpenAI/Pi
  analysis parity. Keeping it hidden avoids misrepresenting a server smoke as a
  fourth supported runtime while preserving a clear path to M14.

### D033 - Claude Final E2E Remains Blocked By External SDK Quota

Time: 2026-06-01 13:33:49 CST
Milestone: Post-M10/M11 E2E

Decision:
- Keep the final multi-agent matrix incomplete after the latest Claude startup
  retry.
- Do not run the paired Claude scrolling retry immediately after the startup
  run hit the same session-limit response, to avoid spending another attempt
  before the stated reset time.
- Do not treat OpenAI/Pi/M13 OpenCode hidden gates as a substitute for Claude
  final E2E.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes. The latest failure happens before
  Claude agent/tool work and does not justify code fallback behavior.
- Expand runtime contract: no.
- Modify public `AgentRuntimeKind`: no.
- Introduce fake third-party adapter: unchanged.
- Enter `AnalysisHarness`: unchanged.
- Touch snapshot state split: no.
- Enter real OpenCode/API spike: no; M13 hidden runtime remains separate.

Rationale:
- The latest Claude startup retry again produced
  `agentTaskDispatchedCount=0`, `dataEnvelopeItemCount=0`, and
  `You've hit your session limit · resets 4pm (Asia/Shanghai)`. This is an
  external SDK quota gate, not evidence of a SmartPerfetto runtime regression.

### D034 - Final Three-Agent Matrix Is Complete; OpenCode Public Exposure Stays Gated

Time: 2026-06-01 16:32:50 CST
Milestone: Post-M10/M11 E2E

Decision:
- Treat the final three-public-runtime startup/scrolling E2E matrix as
  complete after Claude startup and scrolling both passed following the stated
  SDK quota reset.
- Treat root `npm run verify:pr` as the final PR gate for the completed
  M1-M11 plus Post-M10 public-runtime work; it passed after the E2E matrix was
  green.
- Do not reinterpret the hidden OpenCode M13 smoke as a supported fourth
  runtime. Public OpenCode exposure remains M14-gated until request-scoped
  trace tools, real model/provider mapping, OpenCode startup/scrolling E2E,
  frontend Provider Manager checks, generated HTML report inspection, and root
  `verify:pr` pass.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes. Claude/OpenAI startup/scrolling
  strict E2E and root PR verification passed.
- Expand runtime contract: not in this final gate. The existing public
  expansion remains Pi Agent Core from M10/M11; OpenCode remains hidden.
- Modify public `AgentRuntimeKind`: no additional change after M10.
- Introduce fake third-party adapter: unchanged.
- Enter `AnalysisHarness`: unchanged; default harness path remains covered by
  root verification.
- Touch snapshot state split: no additional snapshot changes.
- Enter real OpenCode/API spike: already completed in M12; M14 remains gated.

Rationale:
- The final three-agent matrix now has startup and scrolling evidence for
  Claude, OpenAI, and Pi with claim verification passed, 0 unsupported/issues,
  non-partial reports, and normal tool/data-envelope counts. The remaining
  Claude correction timeout is a non-user-facing optional retry diagnostic; the
  verified report text and HTML scans did not expose correction scaffolding.

### D035 - Maintainer Approved OpenCode As Public Fourth Runtime

Time: 2026-06-01 21:09:18 CST
Milestone: M14

Decision:
- Treat the maintainer's "SmartPerfetto 就有四个 agent" direction as the M14
  public go decision for OpenCode.
- Expand public runtime/provider/UI/docs/package surface only after the hidden
  M13 OpenCode boundary and M14 request-scoped tool parity are verified.
- The supported public runtime set is now `claude-agent-sdk`,
  `openai-agents-sdk`, `pi-agent-core`, and `opencode`.

Tracked questions:
- Keep Claude/OpenAI original behavior: yes, verified again by startup and
  scrolling E2E.
- Expand runtime contract: yes, intentionally in M14 for public OpenCode.
- Modify public `AgentRuntimeKind`: yes, intentionally in M14.
- Introduce fake third-party adapter: unchanged from earlier gates.
- Enter `AnalysisHarness`: unchanged; default harness remains the route-facing
  wrapper.
- Touch snapshot state split: no new split work in M14 beyond OpenCode engine
  state support.
- Enter real OpenCode/API spike: already completed in M12; M14 uses the
  source-grounded adapter boundary.

Rationale:
- M12/M13 proved the safe OpenCode server boundary. M14 adds the public option
  only after request-scoped SmartPerfetto tool execution, strict startup/
  scrolling E2E, frontend Provider Manager checks, report inspection, and root
  `verify:pr`.

### D036 - Custom Provider UI Must Expose All Four Runtime Choices Safely

Time: 2026-06-01 21:09:18 CST
Milestone: M14

Decision:
- Add `Custom Provider` to Provider Manager templates and expose all four
  runtime choices in the Custom Provider connection section.
- Fix the Pi Agent Core/OpenCode runtime-specific field rendering crash before
  closing M14.
- Do not save or mutate any real provider during the visual check.

Rationale:
- Public OpenCode is not complete unless a user can reach the runtime selector
  through the public Custom Provider path. The Computer Use check found a
  Mithril fragment-key crash when selecting Pi/OpenCode; fixing it is part of
  the M14 gate, not optional polish.

### D037 - Final M14 Four-Agent Matrix Is The Completion Gate

Time: 2026-06-01 21:09:18 CST
Milestone: M14

Decision:
- Treat M14 as complete only after startup and scrolling strict E2E passed for
  all four public runtimes, report/session scans were clean, Chrome visual
  report checks passed, focused tests/typecheck/scene regression passed, and
  root `npm run verify:pr` passed.
- Record that `/simplify` has no runnable shell/npm entry in this workspace;
  this gap is documented instead of being claimed as executed.

Rationale:
- The maintainer explicitly required fixing issues and rerunning until all
  startup/scrolling E2E checks for all agents are clean. The final matrix
  covers Claude, OpenAI, Pi Agent Core, and OpenCode with claim verification
  passed, 0 unsupported/issues, non-partial reports, normal tool/data-envelope
  counts, and clean generated reports.

### D038 - Public Docs Must Track Four Runtime Surface Without Fixed Counts

Time: 2026-06-02 16:56:44 CST
Milestone: Post-M14 docs sync

Decision:
- Update public English/Chinese docs, architecture docs, configuration docs,
  and env templates to document all four supported runtime values:
  `claude-agent-sdk`, `openai-agents-sdk`, `pi-agent-core`, and `opencode`.
- Keep Pi Agent Core and OpenCode documented as optional custom-provider
  runtimes, not default first-setup requirements.
- Document OpenCode as explicit Provider Manager/env model configuration with
  isolated server/project state and request-scoped SmartPerfetto MCP tools; do
  not imply personal OpenCode CLI login/config reuse.
- Replace hardcoded Skill/test count language in touched public docs with
  registry/file-tree/source-of-truth wording.

Rationale:
- After M14, runtime code and verification had reached four public agents, but
  several public docs still described two or three runtimes. That mismatch
  would mislead setup, `/health` diagnostics, rollback, and support triage.

### D039 - Release Gate Treats Report Warnings As Product Output Regressions

Time: 2026-06-02 19:05:09 CST
Milestone: Post-M14 release readiness

Decision:
- Keep Claude context pressure diagnostics as internal monitoring logs only.
- Do not emit monitor-only context pressure warnings as user-facing progress
  updates or generated report content.

Rationale:
- The strict Claude startup E2E was functionally green, but the generated HTML
  report contained a context-pressure warning in the conversation timeline. The
  maintainer asked to monitor outputs for abnormalities and fix them before
  release; release readiness therefore treats clean user-visible reports as a
  gate, not just `passed:true` JSON.

### D040 - Pi Agent Core OpenAI-Compatible Gateways Need Explicit API Mode

Time: 2026-06-02 19:05:09 CST
Milestone: Post-M14 release readiness

Decision:
- Keep the env/docs example for official OpenAI Responses as
  `api:"openai-responses"`.
- Document that OpenAI-compatible chat/completions gateways should use
  `api:"openai-completions"` in `SMARTPERFETTO_PI_AGENT_CORE_MODEL_JSON`.

Rationale:
- The real Pi Agent Core E2E against a Z.ai OpenAI-compatible gateway failed
  with 404 when using `openai-responses`, then passed after switching the Pi
  model JSON to `openai-completions`. This is a provider/API-shape finding, not
  a SmartPerfetto runtime contract change.
