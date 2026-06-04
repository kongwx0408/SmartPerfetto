# Process And Thread Identity Contract Feature Plan

**Status**: Draft v6, fourth cross-feature review feedback applied
**Owner**: TBD
**Created**: 2026-05-21
**Builds on**: `process_identity_resolver`, `identityGate`, SkillExecutor process identity gate, raw SQL process warnings
**Related rules**: `.claude/rules/product-surface.md`, `.claude/rules/backend.md`, `.claude/rules/skills.md`, `.claude/rules/testing.md`

## 1. Summary

SmartPerfetto already has a process identity gate:

- `backend/skills/atomic/process_identity_resolver.skill.yaml` resolves package/process candidates.
- `backend/src/services/processIdentity/identityGate.ts` detects process filters and applies Skill gate policy.
- `SkillExecutor` invokes the resolver and rewrites verified parameters.
- raw SQL paths can expose `processIdentityWarning` so direct `execute_sql`
  bypasses are not silently authoritative.

This feature extends that work into a first-class Process and Thread Identity
Contract. The contract should make identity resolution reusable across Skills,
raw SQL evidence, Evidence Contract, and deterministic verifier.

The main upgrade is thread identity. Android traces commonly contain reused
thread names, multiple app processes, provider processes, render/producer
threads, Binder pools, and zygote-forked processes. Name-only matching is not
good enough for high-risk claims.

The thread side must be narrower than a generic `thread.name` detector. Current
Skills often use thread names for role classification or architecture detection;
those queries must not be accidentally gated as identity assertions.

## 2. Product Goal

Before SmartPerfetto makes an identity-sensitive claim, it should know whether
the target is:

- the intended package or process
- the app main thread, not just any thread named `main`
- the correct `RenderThread`, Binder thread, producer thread, or SurfaceFlinger thread
- valid inside the claimed time window
- unique enough to support a verified conclusion

This improves all analysis modes, especially startup, scrolling, rendering,
Binder, lock contention, CPU scheduling, and regression comparison.

## 3. Current Code Grounding

| Area | Current source | What exists |
| --- | --- | --- |
| Resolver Skill | `backend/skills/atomic/process_identity_resolver.skill.yaml` | Resolves process candidates using process metadata, thread summary, frame summary, OOM adj, battery stats, and target match sources. |
| Gate policy | `backend/src/services/processIdentity/identityGate.ts` | Detects process identity filters and decides `none`, `verify_if_present`, or required behavior. |
| Skill integration | `backend/src/services/skillEngine/skillExecutor.ts` | Applies process identity gate before normal/composite Skill execution and caches successful resolutions. |
| Raw SQL warning | `backend/src/agentv3/claudeMcpServer.ts` | Adds warnings when raw SQL filters by process/package identity and bypasses Skill gate. |
| Existing test seam | `backend/src/services/skillEngine/__tests__/skillExecutorProcessIdentity.test.ts` | Covers resolver rewrite, weak evidence blocking, missing target behavior, and transient failure cache rules. |
| Skill docs | `backend/skills/README.md` | Documents main-thread identification by `t.tid = p.pid`, not `t.name = 'main'`. |

Current limitation: the resolver is process-centered. It accepts `thread_name`,
but there is no unified thread identity contract that can prove "this exact
thread in this time window" across Skills, raw SQL, evidence refs, and verifier.

## 4. Target Contract

Add a reusable contract under `backend/src/services/processIdentity/` or
`backend/src/types/identityContract.ts`.

```ts
export type IdentityContractVersion = 'identity_contract@1';
export type TraceTimestampNs = string | number;

export interface AnalysisIdentityTargetV1 {
  traceId: string;
  traceSide?: 'current' | 'reference' | 'unknown';
  packageName?: string;
  processName?: string;
  threadName?: string;
  role?: 'app_main' | 'render_thread' | 'binder_thread' | 'producer' | 'surfaceflinger' | 'hwc' | 'unknown';
  upid?: number;
  utid?: number;
  pid?: number;
  tid?: number;
  timeRange?: { startTs: TraceTimestampNs; endTs: TraceTimestampNs };
  source: 'user_param' | 'skill_param' | 'selection' | 'visible_window' | 'sql_filter' | 'derived';
}

export interface ResolvedProcessIdentityV1 {
  upid: number;
  pid?: number;
  processName?: string;
  packageName?: string;
  startTs?: TraceTimestampNs;
  endTs?: TraceTimestampNs;
  matchSources: string[];
  confidence: number;
}

export interface ResolvedThreadIdentityV1 {
  utid: number;
  tid?: number;
  threadName?: string;
  role?: AnalysisIdentityTargetV1['role'];
  owningUpid?: number;
  processName?: string;
  activeRange?: { startTs?: TraceTimestampNs; endTs?: TraceTimestampNs };
  matchSources: string[];
  confidence: number;
}

export interface IdentityResolutionV1 {
  version: IdentityContractVersion;
  identityRefId: string;
  target: AnalysisIdentityTargetV1;
  status: 'verified' | 'ambiguous' | 'weak' | 'missing' | 'not_required' | 'error';
  processes: ResolvedProcessIdentityV1[];
  threads: ResolvedThreadIdentityV1[];
  warnings: string[];
  recommendedParams?: Record<string, string | number | boolean>;
}
```

### 4.1 Existing status migration

Current process identity status values must be mapped deliberately:

| Current status | v1 status | Notes |
| --- | --- | --- |
| `verified` | `verified` | Strong enough for high-risk identity claims. |
| `ambiguous` | `ambiguous` | Multiple viable candidates. |
| `unresolved` | `error` or `missing` | Implementation must distinguish resolver failure from no evidence. |
| `not_found` | `missing` | No viable candidate. |
| current `weak_match` reason folded into `ambiguous` | `weak` | v1 should preserve weak evidence separately so verifier can downgrade instead of treating it as normal ambiguity. |

This mapping is an M0 gate because the verifier/report semantics depend on the
difference between weak, ambiguous, missing, and resolver error.

Trace-side compatibility note: current `DataEnvelopeTraceSide` is only
`current | reference`. `unknown` may be used inside identity targets for legacy
or degraded inputs, but it must not be persisted into `DataEnvelopeMeta` unless
the DataEnvelope type and generated frontend consumers are migrated together.

### 4.2 Cross-feature dependency boundary

Identity Contract must publish a standalone sidecar first:

```text
IdentityResolutionV1 + identityRefId + status + warnings + recommendedParams
```

Evidence Contract links to that sidecar later. The sidecar cannot depend on
Evidence anchors existing first; otherwise Identity and Evidence block each
other. Identity M0/M1 is therefore allowed to land before Evidence M0.5.

## 5. Resolution Rules

### 5.1 Process identity

Keep the existing resolver/gate behavior as the process baseline:

- package/process name filters should trigger verification when present
- Skills that explicitly require identity must block on missing/weak evidence
- successful resolutions can rewrite Skill params to stable ids
- transient resolver errors must not poison cache

### 5.2 Thread identity

Thread identity should be verified when a claim or Skill depends on a specific
thread role:

| Role | Verification rule |
| --- | --- |
| app main | prefer `thread.tid = process.pid` for the resolved process; do not rely on `thread.name = 'main'`. |
| RenderThread | match name plus owning `upid` and active time window; handle multiple RenderThreads across process restarts. |
| Binder thread | match Binder/thread-pool patterns plus owning process and blocking/wakeup evidence where relevant. |
| producer | match producer process/thread/layer evidence from rendering pipeline detection. |
| SurfaceFlinger | match process identity and known SF thread names only inside system process scope. |

### 5.3 Time-window constraint

If a target includes time range, a verified identity must be active or observable
inside that window. Name matches outside the selected analysis window are weak.

### 5.4 Ambiguity policy

Ambiguous identity should not be hidden:

- `verified`: unique enough for high-risk claims
- `weak`: plausible but name-only or missing ids
- `ambiguous`: multiple viable candidates
- `missing`: no candidate
- `not_required`: Skill/query does not depend on identity

High-risk claims can use only `verified` identity or clearly marked partial
claim support. `partial` is not an `IdentityResolutionV1.status`; it belongs to
claim/evidence support. Identity status should remain one of
`verified | ambiguous | weak | missing | not_required | error`.

`verified` must require uniqueness, not just the highest-scoring row:

- exactly one primary candidate inside the target time window, or a deterministic
  tie-break using stable ids already supplied by the user/selection
- runner-up candidates are either outside the time window or below a documented
  confidence gap
- shared UID, provider processes, process restarts, and same-name processes
  downgrade to `ambiguous` unless the target includes enough ids/time bounds to
  separate them
- if all viable candidates are only name matches, status is `weak`, not
  `verified`

### 5.5 Detector taxonomy

Do not extend the current process filter detector by simply treating every
`thread.name` predicate as an identity target. Split detection into categories:

| Category | Examples | Behavior |
| --- | --- | --- |
| `process_identity_filter` | package/process name, `process_name`, `client_process`, `server_process` | Existing process gate/warning behavior. |
| `thread_target_filter` | user target asks for main thread, specific `utid/tid`, role-specific target inside a resolved process | Eligible for thread identity gate. |
| `thread_role_classification` | counting `RenderThread`, Binder pools, producer signatures, architecture detection | No gate by default; can feed resolver evidence. |
| `non_identity_name_filter` | `slice.name`, `track.name`, `counter_track.name`, generic event names | Never identity gate. |

Only `thread_target_filter` should block or rewrite Skill params. Role
classification SQL can emit evidence, but should not become an identity gate
unless the Skill declares a target identity requirement or the final claim uses
that role as a verified target.

## 6. Product Surfaces

| Surface | Behavior |
| --- | --- |
| Skills | Current DSL uses `identity.policy` and process-only `identity.scope`; this feature must explicitly extend `SkillIdentityConfig`, `SkillExecutor`, validator, and Skill authoring docs before any `thread` requirement is accepted. |
| Raw SQL | `execute_sql` can attach identity warnings when filters use process/thread names without resolver output. |
| Evidence Contract | Evidence anchors can include `identityRefId` and resolved process/thread ids. |
| Deterministic verifier | Identity-sensitive claims fail or downgrade when identity is weak/ambiguous. |
| Reports | Developer/debug appendix should show resolved target, status, warnings, and recommended params. |
| CLI | CLI compare/analyze should receive the same identity warnings as Web UI. |
| Raw trace comparison appendix | Fixed SQL appendix builders such as raw trace comparison must use the same identity rules as `execute_sql_on`; hardcoded package/thread-name filters cannot bypass the contract. |
| Agent report/API/export | `/api/agent/v1/:sessionId/report`, `/api/reports/:reportId/export`, SSE `analysis_completed`, and session restore/status/turn APIs must retain identity status when evidence/verifier state is visible. |

## 7. Implementation Plan

### M0a. Contract and inventory

- Add identity contract types and fixtures.
- Inventory existing resolver output and map it to `IdentityResolutionV1`.
- Add thread identity target examples for startup, scrolling, Binder, rendering,
  and CPU/lock Skills.
- Add process lifetime fields (`startTs` / `endTs`) to resolver output and
  parsing where available; process restart/time-window checks depend on them.

Exit criteria:

- Existing process resolver can produce a process-only `IdentityResolutionV1`
  without behavior changes.
- The status migration table is implemented or pinned in tests.

### M0b. Resolver output fields

- Add process lifetime fields to `process_identity_resolver` output where
  available.
- Parse and preserve `startTs` / `endTs` in runtime identity candidates.
- Keep this as a separate slice from pure type/schema work because it changes
  resolver output.

Exit criteria:

- Restart/time-window fixture tests can distinguish old and new process
  lifetimes.

### M1. Thread resolver service

- Add `threadIdentityResolver.ts`.
- Resolve main thread by `tid = pid` under resolved process.
- Resolve role-based threads with process ownership, time window, and match
  source accounting.
- Treat name-only matches as weak unless uniqueness is proven in the time window.
- Preserve ns timestamps as `TraceTimestampNs` (`string | number`) through the
  resolver, DataEnvelope/Evidence mapping, and tests. Do not coerce large
  Perfetto timestamp expressions to JavaScript `number` if that loses precision.

Exit criteria:

- Unit tests cover duplicate thread names, process restarts, multiple app
  processes, and missing time-window evidence.

### M2. Skill DSL and SkillExecutor integration

- Extend current `SkillIdentityConfig` deliberately. Today the contract is
  `identity.policy` with process-only `identity.scope`; v1 must update:
  `backend/src/services/processIdentity/types.ts`,
  `backend/src/services/skillEngine/types.ts`,
  `backend/src/services/processIdentity/identityGate.ts`,
  `backend/src/services/skillEngine/skillExecutor.ts`,
  `backend/src/cli/commands/validate.ts`, and `backend/skills/README.md`.
- Prefer one canonical type source or a re-export; duplicated
  `SkillIdentityConfig` definitions must not drift.
- Prefer a compatible DSL shape such as `identity.scope: 'process' | 'thread' |
  'process_thread'` or `identity.thread`, rather than a parallel unchecked
  `thread_identity.required` field.
- In this milestone, apply thread identity gate only when the Skill declares a
  thread target. Claim/verifier-triggered thread identity gating belongs to M4,
  after claim support and verifier metadata exist.
- Pass resolved `upid/utid/pid/tid` into Skill params where the Skill accepts them.
- Keep non-identity Skills free from resolver overhead.

Exit criteria:

- Startup main-thread and rendering RenderThread Skills can request verified
  thread identity.

### M3. Raw SQL detector upgrade

- Extend detector output to classify SQL by the taxonomy in §5.5:
  - `process_identity_filter`
  - `thread_target_filter`
  - `thread_role_classification`
  - `non_identity_name_filter`
- Treat `thread.name` and `thread_name` as risky only when they bind a user
  target, a claim target, a main-thread assertion, or a Skill-declared thread
  identity requirement.
- Replace the current boolean-style detector with a structured API such as
  `analyzeIdentityFilters(sql, context)`, where context includes tool name,
  trace side, user target/selection, active plan/claim target if available, and
  Skill identity config when applicable.
- Keep `RenderThread`/Binder/producer counting and feature-scoring queries as
  role classification unless they are later used as verified target identity.
- Do not flag unrelated names such as `slice.name`, `track.name`, or
  `counter_track.name` as identity filters.
- Attach warnings and suggested resolver Skill usage to raw SQL tool results.
- Persist raw SQL identity warnings/status into Evidence Contract anchors or
  DataEnvelope metadata; tool JSON alone is not enough for report/export/verifier.
- Cover both `execute_sql` and `execute_sql_on`; comparison raw SQL must preserve
  identity warning/status into comparison reports and exports.
- Cover raw trace comparison appendix builders that directly call trace queries.
  They must not keep private identity heuristics such as `thread.name = 'main'`
  when the project rule requires `thread.tid = process.pid` for app main thread.

Exit criteria:

- Tests cover process filter false positives and thread filter warnings.
- Tests prove role-classification thread-name SQL does not trigger gate.
- Raw SQL identity warnings survive DataEnvelope/report/export paths.
- Analysis-result comparison paths preserve identity warning/status when
  comparison evidence is built from raw SQL or snapshot evidence.

### M4. Evidence and verifier integration

- Add `identityRefId`, resolved ids, `IdentityResolutionV1.status`,
  `warnings`, and `recommendedParams` to Evidence Contract anchors or a linked
  identity sidecar.
- Extend `DataEnvelopeMeta`, `createDataEnvelope` options, Evidence builder,
  snapshot/report/export, and generated frontend types as needed; otherwise
  identity warnings will remain tool-only and disappear before verifier/report.
- If `IdentityResolutionV1` is introduced outside the current generated-type
  inputs, update `backend/scripts/generateFrontendTypes.ts`, generated frontend
  exports, and `backend/scripts/checkTypesSync.ts` in the same slice. Do not
  leave the identity sidecar as a backend-only type while UI/report/export
  surfaces consume it dynamically.
- Deterministic verifier checks identity-sensitive claims against the identity
  contract.
- Claim/verifier-triggered identity checks are introduced here. Earlier Skill
  integration milestones must not depend on final claim/verifier signals.
- Report/export includes identity resolution status in debug appendix.

Exit criteria:

- A claim naming "main thread" fails or downgrades if evidence only cites a
  thread named `main` without process-owned `tid = pid` support.

### M5. Product hardening

- Add real trace smoke coverage with Heavy/Light startup traces.
- Add rendering trace fixtures where host HWUI and producer chains need separate
  identity resolution.
- Document Skill authoring rules for process/thread identity.

Exit criteria:

- `validate:skills` or equivalent checks catch Skills that declare thread
  identity but do not consume the resolved params.

## 8. Non-Goals

- Do not force every Skill to run identity resolution.
- Do not treat thread names as globally unique.
- Do not make raw SQL impossible; warn and annotate when it bypasses identity
  guardrails.
- Do not gate thread-name role-classification queries unless they are bound to a
  target identity assertion.
- Do not solve source-code symbol identity here. That belongs to codebase-aware
  analysis.
- Do not make SurfaceFlinger/HWC identity depend on app package heuristics alone.

## 9. Testing And Acceptance

Minimum tests:

- `identityGate` tests for process-filter behavior remain green.
- new `threadIdentityResolver.test.ts`
  - main thread by `tid = pid`
  - duplicate `RenderThread` names across processes
  - process restart with old/new `upid`
  - provider process and app process both matching package prefix
  - time-window mismatch downgrades confidence
- SkillExecutor tests
  - thread identity required blocks weak/missing resolution
  - verified thread identity rewrites params
  - non-identity Skills do not invoke resolver
- raw SQL detector tests
  - flags risky target-bound `thread.name` filters
  - treats rendering feature-scoring `RenderThread` counts as classification
  - avoids `slice.name` false positives
  - persists warning/status into evidence/report/export path
  - covers raw trace comparison appendix SQL so fixed comparison report sections
    cannot bypass identity warnings or main-thread identity rules
- verifier integration tests
  - identity-sensitive claim fails on weak thread identity
- comparison integration tests
  - comparison evidence preserves identity status for current/reference trace
    sides and does not introduce baseline/candidate as low-level trace sides
- type-sync gate
  - `npm --prefix backend run generate:frontend-types`
  - `npm --prefix backend run check:types`
  - `checkTypesSync.ts` must compare identity/evidence metadata fields that this
    feature adds
  - after generated type, SSE/API, or AI Assistant parser changes, run
    `./scripts/update-frontend.sh` and `npm run check:frontend-prebuild`

- focused test gate
  - add new identity tests to `test:core` / root `verify:pr`, or document and
    run exact focused `npx jest ... --runInBand` commands for each PR slice
  - sidecar/status tests must cover write, read, report/export, and restore paths

- report/API/export gate
  - `/api/agent/v1/:sessionId/report` JSON keeps identity status
  - `/api/reports/:reportId/export` HTML keeps identity status
  - CLI JSON/NDJSON/show surfaces include compact identity warnings when present

Legacy path check:

- `backend/src/agent/tools/sqlExecutor.ts` contains an older `execute_sql` path.
  During implementation, either migrate the same warning semantics there or
  explicitly classify that path as non-product/legacy with tests proving current
  Web UI/CLI/API routes do not depend on it.

Before completion:

```bash
npm --prefix backend run build
npm --prefix backend run generate:frontend-types
npm --prefix backend run check:types
npm run verify:pr
```

If frontend identity warnings or report UI change, verify dev mode and refresh
`frontend/` before shipping.

Release-surface smoke for product-visible changes:

- npm packed CLI smoke when CLI output/export behavior changes
- Docker/portable Web UI smoke when API/UI/prebuild behavior changes

## 10. Review Questions

- Should thread identity be part of the existing process resolver Skill, or a
  separate service/Skill pair?
- Which thread roles must be P0: app main, RenderThread, Binder peer, producer?
- Should raw SQL with name-only thread filters be warn-only or hard-blocked in
  full analysis?
- How much identity detail should appear in normal reports vs developer appendix?
- Should identity resolution be cached per session, per trace, or per
  target/time-window tuple?
