# Evidence Contract v1 Feature Plan

**Status**: Draft v6, fourth cross-feature review feedback applied
**Owner**: TBD
**Created**: 2026-05-21
**Builds on**: DataEnvelope, ConclusionContract `claims`, analysis result snapshots, agentv3 MCP data events
**Related rules**: `.claude/rules/product-surface.md`, `.claude/rules/prompts.md`, `.claude/rules/backend.md`, `.claude/rules/testing.md`

## 1. Summary

SmartPerfetto already carries evidence identity through several paths:

- `DataEnvelopeMeta` has `evidenceRefId`, `traceSide`, `traceId`, `queryHash`, and `sourceToolCallId`.
- agentv3 SQL and comparison paths emit stable evidence refs and trace
  provenance; ordinary `invoke_skill` still has a provenance gap that must be
  fixed before v1 can claim complete Skill coverage.
- `analysisResultSnapshotPipeline` converts DataEnvelope metadata and `claims.references` into persisted `EvidenceRef`.
- `ConclusionContract` can carry claim-level references with `row_index`, `row_selector`, `column`, and `value`.

The gap is that these pieces are still conventions, not one product contract.
Evidence Contract v1 standardizes what a trace-backed claim must be able to
point to, how unsupported statements are marked as inference, and how reports,
exports, comparison, verifier, and UI should consume the same structure.

This feature should be implemented before large verifier work. The deterministic
verifier can only be reliable if evidence has a stable shape.

## 2. Product Goal

For every high-risk analysis claim, SmartPerfetto can answer:

> Which trace, tool call, SQL or Skill step, row, column, value, time range,
> process/thread identity, and trace side support this statement?

High-risk means:

- numeric claims: duration, count, FPS, percentage, percentile, timestamp
- causal claims: A blocked B, A overlapped B, A woke B, A regressed vs baseline
- identity claims: this is the app process, main thread, RenderThread, peer process
- severity claims: critical/high root cause, "main bottleneck", "dominant"
- comparison claims: candidate is slower/faster than baseline by X

Low-risk narrative can stay uncited, but must not look like verified data. If a
sentence is an interpretation without backing evidence, it should be explicitly
marked as inference in the structured claim layer.

## 3. Current Code Grounding

### 3.1 Existing strengths

| Area | Current source | What already exists |
| --- | --- | --- |
| Data envelopes | `backend/src/types/dataContract.ts` | `DataEnvelopeMeta` stores evidence id, trace side/id, query hash, source tool call id, params hash, plan phase metadata. |
| MCP SQL/comparison producers | `backend/src/agentv3/claudeMcpServer.ts` | SQL and comparison outputs create stable evidence ids and attach trace provenance. Ordinary `invoke_skill` needs a trace provenance fix before it can be treated as complete. |
| Snapshot pipeline | `backend/src/services/analysisResultSnapshotPipeline.ts` | Reads claim pins, deduplicates evidence refs, persists trace/tool/query metadata into analysis result snapshots. |
| Conclusion contract | `backend/src/agent/core/conclusionGenerator.ts` | Parses and renders `claims[].references` with evidence id, source ref, tool call id, row selector, column, value. |
| Artifact store | `backend/src/agentv3/artifactStore.ts` | Large Skill results can be paged through `fetch_artifact`, but those rows are not yet persisted as DataEnvelope-backed claim sources. |
| Tests | `backend/src/types/__tests__/dataContract.test.ts`, `backend/src/agent/core/__tests__/conclusionGenerator.test.ts`, `backend/src/services/__tests__/analysisResultSnapshotPipeline.test.ts` | Coverage already protects basic metadata round-trip and claim reference preservation. |

### 3.2 Gaps to close

- SQL is mostly represented by `queryHash`; a verifier cannot always recover the
  SQL text or normalized SQL intent from a saved report.
- Ordinary `invoke_skill` can emit Skill evidence without trace provenance,
  producing `trace_unknown`-style anchors. v1 must fix this before declaring
  Skill evidence complete.
- `fetch_artifact` rows can support claims, but the current artifact path is not
  a durable DataEnvelope/report/snapshot source.
- CLI report export currently stores conclusion/transcript/config files, not a
  structured claim-support sidecar.
- Time range is not a first-class evidence field. It may appear in rows or
  params, but the contract does not require a normalized `ts/dur` range.
- Process/thread identity is not first-class in claim refs. Some rows include
  `upid`, `utid`, `pid`, `tid`, `process_name`, `thread_name`; the contract does
  not make them required for identity-sensitive claims.
- `claims.references` can point to a row/column/value, but claim type, evidence
  strength, and inference status are not explicit.
- There is no deterministic gate saying "this conclusion makes unsupported
  data claims" before report/export persistence.
- Evidence structures differ between DataEnvelope metadata, multi-trace
  `EvidenceRef`, conclusion claims, and UI source chips.
- Causal claims need explicit relation evidence. A list of anchors alone cannot
  prove overlap, wakeup, blocking, Binder peer, or baseline/candidate relation.

## 4. Contract Shape

Add a canonical contract under `backend/src/types/evidenceContract.ts`.

```ts
export type EvidenceContractVersion = 'evidence_contract@1';
export type TraceTimestampNs = string | number;

export type EvidenceProducerKind =
  | 'execute_sql'
  | 'execute_sql_on'
  | 'invoke_skill'
  | 'compare_skill'
  | 'fetch_artifact'
  | 'analysis_snapshot'
  | 'manual';

export interface EvidenceContextV1 {
  traceId: string;
  traceSide?: 'current' | 'reference' | 'unknown';
  toolCallId?: string;
  sourceToolCallId?: string;
  producerKind: EvidenceProducerKind;
  skillId?: string;
  stepId?: string;
  queryHash?: string;
  sqlTextRef?: string;
  paramsHash?: string;
  artifactId?: string;
  sourceArtifactId?: string;
  planPhaseId?: string;
}

export interface EvidenceTimeRangeV1 {
  startTs: TraceTimestampNs;
  endTs: TraceTimestampNs;
  unit: 'ns';
  source: 'row' | 'params' | 'selection' | 'derived';
}

export interface EvidenceIdentityV1 {
  packageName?: string;
  processName?: string;
  threadName?: string;
  upid?: number;
  utid?: number;
  pid?: number;
  tid?: number;
  role?: 'app_main' | 'render_thread' | 'binder_thread' | 'producer' | 'surfaceflinger' | 'hwc' | 'unknown';
  identityRefId?: string;
  confidence?: number;
}

export interface EvidenceCellV1 {
  sourceRef?: string;
  rowIndex?: number;
  rowSelector?: Record<string, string | number | boolean>;
  column: string;
  value?: string | number | boolean;
  isSqlNull?: boolean;
  displayValue?: string;
  unit?: string;
}

export interface EvidenceAnchorV1 {
  anchorId: string;
  version: EvidenceContractVersion;
  evidenceRefId: string;
  context: EvidenceContextV1;
  cells?: EvidenceCellV1[];
  timeRange?: EvidenceTimeRangeV1;
  identity?: EvidenceIdentityV1;
  confidence?: number;
}

export interface EvidenceRelationV1 {
  id: string;
  kind:
    | 'overlap'
    | 'wakeup'
    | 'blocking_state'
    | 'binder_peer'
    | 'lock_owner'
    | 'comparison_delta'
    | 'derived';
  subjectAnchorId: string;
  objectAnchorId?: string;
  relationAnchorId?: string;
  metricColumn?: string;
  value?: string | number | boolean;
  isSqlNull?: boolean;
  unit?: string;
  supportLevel: 'verified' | 'partial' | 'inference' | 'unsupported';
  reason?: string;
}

export type ClaimKindV1 =
  | 'numeric'
  | 'categorical'
  | 'identity'
  | 'time_range'
  | 'causal'
  | 'comparison'
  | 'inference'
  | 'recommendation';

export interface ClaimSupportV1 {
  claimId: string;
  kind: ClaimKindV1;
  text: string;
  anchors: EvidenceAnchorV1[];
  relations?: EvidenceRelationV1[];
  supportLevel: 'verified' | 'partial' | 'inference' | 'unsupported';
  inferenceReason?: string;
}
```

The exact names can change during implementation, but v1 needs these semantic
slots. The most important part is not type naming; it is that all downstream
surfaces receive the same normalized claim support.

Implementation note: v1 should extend the existing
`ConclusionContractClaimReference` and persisted `EvidenceRef` path first. The
`EvidenceAnchorV1` shape above is a normalized view; implementation should avoid
creating a parallel duplicate schema if the existing claim refs can be extended
with the missing fields.

Relation note: `EvidenceRelationV1` must reference stable `anchorId` values, not
only `evidenceRefId`, because one evidence table can contain multiple cells,
rows, ranges, or relation rows. The builder must generate deterministic anchor
ids from evidence id + row selector/index + column/range context.

Trace-side note: low-level trace evidence should stay aligned with the current
DataEnvelope vocabulary (`current` / `reference` plus `unknown` only for
degraded cases). `baseline` / `candidate` are comparison-layer aliases, not new
trace-processor sides.

DataEnvelope compatibility note: current `DataEnvelopeTraceSide` is only
`current | reference`. `unknown` is allowed in the Evidence Contract view for
degraded or legacy inputs, but it must not be written back into
`DataEnvelopeMeta.traceSide` unless the DataEnvelope type and all generated
frontend consumers are migrated in the same change.

Identity dependency note: this feature must not wait for Identity Contract M4.
Identity Contract M0/M1 must first publish a standalone
`IdentityResolutionV1 + identityRefId + status` sidecar. Evidence Contract then
links that sidecar. Verifier consumes both. This breaks the otherwise circular
dependency where Evidence waits for Identity-to-Evidence integration and
Identity waits for Evidence anchors.

Schema ownership note: `ConclusionContract` is the source-of-truth claim schema.
`ClaimSupportV1` is the evidence-support view derived from that claim schema,
and `ClaimVerificationResult` is the verifier verdict. Do not create three
competing claim schemas.

Artifact naming note: `artifactId` is the canonical Evidence Contract field.
`sourceArtifactId` is an ingest compatibility alias for current artifact rows
and should be normalized to `artifactId` before verifier/report/export
consumption. CLI sidecars and claim support JSON should write canonical
`artifactId` and may include `sourceArtifactId` only for debugging/backward
compatibility.

## 5. Claim Requirement Matrix

| Claim kind | Required support | If missing |
| --- | --- | --- |
| Numeric | at least one `EvidenceCellV1` with matching column/value and trace context | `unsupported` unless marked inference |
| Time range | `EvidenceTimeRangeV1` or row cells that can derive one | `partial` only if text avoids exact range |
| Identity | `EvidenceIdentityV1` with process/thread ids and stable identity contract output when available | `partial` for name-only or process-only support; `inference`/`unsupported` for ambiguous identity |
| Causal | two or more anchors plus explicit `EvidenceRelationV1` overlap/wakeup/blocking/Binder/comparison evidence | `inference` if relation is plausible but not proven |
| Comparison | baseline and candidate anchors with common metric key/unit | `unsupported` if only natural language reports are compared |
| Recommendation | at least one linked verified/partial root-cause claim | `inference` allowed |

## 6. Product Surfaces

| Surface | Contract behavior |
| --- | --- |
| Web UI / AI Assistant | Source chips should render from `ClaimSupportV1`; old source chips remain fallback. |
| Reports | HTML/Markdown/JSON exports should include claim support and inference markers. |
| CLI | `smp analyze` and `smp compare` reports should include the same support structure where available. |
| API/SSE | Data events may carry `evidenceAnchor`; `analysis_completed` should carry normalized claim support. |
| Multi-trace comparison | `EvidenceRef` should be derived from Evidence Contract, not a parallel schema. |
| Analysis-result comparison | `ComparisonResult`, `ComparisonConclusion`, `comparison_state`, and comparison report export must carry claim support/verifier/identity status instead of keeping `verifiedFacts` as a separate unverified narrative channel. |
| Verifier | Deterministic verifier reads Evidence Contract as its primary input. |
| Artifact paging | `fetch_artifact` rows that are used in final claims must have durable artifact/source ids that reports and snapshots can resolve. |
| Raw trace comparison appendix | `ComparisonEvidencePack` and `ComparisonReportSection` must either produce claim support/verifier inputs or be explicitly labeled debug evidence that cannot create verified claims. |
| Agent report API | `/api/agent/v1/:sessionId/report` JSON and `/api/reports/:reportId/export` HTML must carry the same compact support/verifier/identity state as generated reports. |
| CLI stdout/show | `smp analyze`, `smp compare`, machine JSON/NDJSON output, and `smp show` must include a compact support/verifier summary when sidecars exist. |

## 7. Implementation Plan

### M0. Contract inventory and golden fixtures

- Add `backend/src/types/evidenceContract.ts`.
- If the contract lives outside the current generated-type inputs, update
  `backend/scripts/generateFrontendTypes.ts`, generated frontend exports, and
  `backend/scripts/checkTypesSync.ts` in the same slice. Today those scripts are
  centered on `dataContract.ts` and `conclusionContract.ts`; a separate
  `evidenceContract.ts` must not silently become backend-only.
- Add the real SSE/API schema to the same type-sync slice:
  `/api/agent/v1/analyze` `analysis_completed` payload, generated
  `AnalysisCompletedEvent`, and the AI Assistant frontend parser must all expose
  the same `claimSupport` / verifier / identity fields. Do not rely only on
  backend TypeScript types if `sse_event_handlers.ts` still drops the fields.
- Add fixtures for SQL result, Skill result, comparison result, and conclusion
  claim references.
- Add a compatibility mapper from existing DataEnvelope/ConclusionContract to
  v1 contract without changing runtime behavior.
- Document the field mapping from existing `DataEnvelopeMeta` and
  `claims.references`.
- Mark current limitations explicitly in tests: ordinary `invoke_skill` without
  trace provenance must not be treated as fully verified Skill evidence.

Exit criteria:

- Existing tests still pass.
- New mapper tests prove current metadata can produce a minimal
  `EvidenceAnchorV1`.
- The mapper can represent causal relation requirements even when current
  sessions only produce `inference` for relation claims.

### M0.5. Fix Skill and artifact provenance blockers

- Ensure normal `invoke_skill` data envelopes carry trace provenance when the
  session has a current trace context.
- Preserve `sourceToolCallId`, `skillId`, `stepId`, and `traceId/traceSide`
  through Skill-generated DataEnvelopes.
- Give `fetch_artifact` rows a durable claim source path: either emit
  DataEnvelope-compatible artifact anchors or persist an artifact sidecar that
  snapshot/report/export can resolve.
- Add regression tests that fail if Skill evidence falls back to unknown trace
  provenance in normal single-trace analysis.
- Treat verified identity claims as blocked until the identity contract provides
  a stable `identityRefId` and status. Without that output, identity claims are
  at most `partial` or `inference`.

Exit criteria:

- SQL, ordinary Skill, comparison, and artifact-backed rows can all produce
  resolvable anchors with `traceId`, `traceSide`, `sourceToolCallId`, `skillId`
  where applicable, and `stepId` where applicable.

### M1. Evidence anchor builder

- Add `EvidenceContractBuilder` service.
- Normalize anchors from:
  - DataEnvelope metadata
  - artifact rows
  - Skill step output
  - comparison matrix metrics
  - raw trace comparison `ComparisonEvidencePack` /
    `ComparisonReportSection`
  - analysis result snapshots
- Store SQL text safely as a ref or redacted sidecar; avoid copying huge SQL
  bodies into every claim.
- Add stable derivation for time range and identity fields from known row
  column names (`ts`, `dur`, `start_ts`, `end_ts`, `upid`, `utid`, `pid`, `tid`,
  `process_name`, `thread_name`).
- Add relation builders for bounded causal forms: overlap, wakeup, blocking
  state, Binder peer, and comparison delta.
- Persist artifact-backed evidence with a durable row address, not only the
  session-scoped `art-N` handle. The address must survive LRU eviction, backend
  restart, pagination, and export.

Exit criteria:

- SQL/Skill/compare/artifact outputs generate anchors with trace, tool, row,
  column, value, and optional time/identity.
- Causal claims can reference explicit relations; without them they are
  downgraded to inference.

### M2. Conclusion claim support

- Extend `ConclusionContract` with normalized claim kind/support fields while
  keeping old `claims.references` readable.
- Update every conclusion contract entry point, not only strategy templates:
  `backend/strategies/*.template.md`,
  `backend/strategies/comparison-conclusion.template.md`, and the contract
  prompt/parser/sanitizer in `backend/src/agent/core/conclusionGenerator.ts`.
- Keep durable prompt content in `backend/strategies/`; TypeScript should parse,
  sanitize, validate, and render the contract, not grow new hardcoded prompt
  bodies beyond the existing transition path.
- Add sanitizer logic: unsupported high-risk claims must not be silently
  upgraded to verified.
- Keep Markdown rendering backward compatible.

Exit criteria:

- Current frontend still renders old claims.
- JSON contract has enough information for deterministic verifier.

### M3. Persistence, report, and export

- Persist normalized claim support in analysis result snapshots.
- Preserve the current list/detail API boundary: list endpoints should return
  compact claim-support summary/status only, while detail endpoints or explicit
  include flags can return full claim support. Do not inflate the default
  analysis-result list payload with every anchor/cell.
- Render inference markers and evidence anchors in HTML/Markdown/JSON reports.
- Add a CLI structured sidecar so `report export --format json|md|html` can
  carry normalized claim support instead of only conclusion/transcript/config
  files.
- Define the source of truth for CLI and report export before implementation:
  `SessionStateSnapshot` should carry claim support for Web/API sessions, while
  CLI per-turn persistence should write:
  - `turns/NNN.claim-support.json` for immutable turn snapshots
  - `claim-support.json` for the latest turn/session view
  - a `claimSupport` field in JSON report export
  Markdown/HTML export should embed or link the same data instead of deriving it
  from rendered conclusion text.
- Ensure CLI report export and comparison report export carry the same fields.
- Update legacy HTTP export surfaces as well: `/api/export/result`,
  `/api/export/session`, `/api/export/analysis`, and `/api/sessions/export`.
- Update report APIs as well: `/api/agent/v1/:sessionId/report` JSON and
  `/api/reports/:reportId/export` HTML must not drop claim support, verifier
  summary, or identity state.
- Update analysis-result comparison persistence and export:
  `ComparisonResult`, `ComparisonConclusion`, `comparison_state`,
  comparison report HTML/Markdown/JSON.
- For comparison, add canonical fields such as `claimSupport`,
  `claimVerificationResult`, and `identityResolutions` on `ComparisonResult` or
  an attached metadata object. Existing `ComparisonConclusion.verifiedFacts`
  may remain as a legacy display/source field during migration, but it must not
  be treated or labeled as deterministically verified unless backed by the new
  claim support and verifier result. Update
  `backend/strategies/comparison-conclusion.template.md`,
  `comparisonAiConclusionService`, and comparison HTML report labels in the same
  slice.
- Define comparison export format before tests are written. v1 should use a
  `format=html|md|json` parameter on the existing comparison export endpoint or
  explicit sibling endpoints; the chosen contract must be shared by Web/API and
  CLI instead of leaving "comparison Markdown/JSON export" as a doc-only goal.
- Add migration fallback for legacy sessions.

Exit criteria:

- Old snapshots load.
- New snapshots round-trip claim support.
- Report/export tests assert inference markers are preserved.

### M4. UI adoption

- Update AI Assistant source/citation rendering to prefer Evidence Contract.
- Keep old `source_ref` chips for sessions without v1 support.
- Add a compact "unsupported/inference" state for claims that are intentionally
  not verified.
- When generated types, SSE/API payloads, or AI Assistant parsing change, run
  `./scripts/update-frontend.sh` and keep the committed `frontend/` prebuild in
  sync for `./start.sh`, Docker, and portable users.

Exit criteria:

- UI never presents inference-only text as checked trace evidence.
- Generated frontend types and committed frontend prebuild stay in sync when
  API/SSE payloads change.

## 8. Non-Goals

- Do not require citation for every sentence in natural language output.
- Do not block all reports because one low-risk sentence lacks evidence.
- Do not expose raw prompt text or provider secrets in evidence payloads.
- Do not redesign the whole AI panel before the contract exists.
- Do not replace process/thread identity resolver; consume its output when
  available.

## 9. Testing And Acceptance

Minimum tests:

- `dataContract` mapper tests for existing SQL/Skill envelopes.
- `conclusionGenerator` tests for claim kind, inference, and legacy references.
- `analysisResultSnapshotPipeline` tests for persisted v1 claim support.
- report/export tests for HTML/Markdown/JSON inference markers.
- CLI compare/report fixture proving Evidence Contract appears in deterministic
  appendix output for latest and `--turn` exports across html/md/json.
- HTTP export tests for `/api/export/result`, `/api/export/session`,
  `/api/export/analysis`, and `/api/sessions/export`.
- Analysis-result comparison tests proving `ComparisonResult` and
  `ComparisonConclusion` carry claim support and do not bypass verifier status.
- Artifact durability tests for LRU eviction, backend restart, pagination, and
  row indexes beyond the compact 500-row fetch path.
- Type-sync gate: `npm --prefix backend run generate:frontend-types &&
  npm --prefix backend run check:types`, with `checkTypesSync.ts` extended to
  compare the new claim/evidence/meta fields.
- Focused tests must either be wired into `test:core` / root `verify:pr`, or
  each PR slice must document and run the exact focused `npx jest ... --runInBand`
  command before merge.
- CLI sidecar tests must assert all three legs: sidecar files are written,
  `report export` reads them for html/md/json, and latest plus `--turn` exports
  preserve `claimSupport`.
- API/report tests must cover `/api/agent/v1/:sessionId/report` JSON and
  `/api/reports/:reportId/export` HTML.
- Frontend prebuild gate: after generated type, SSE/API, or AI Assistant parser
  changes, run `./scripts/update-frontend.sh` and `npm run check:frontend-prebuild`.
- Real-trace smoke matrix after implementation:
  - single-trace SSE/report support state
  - raw Heavy/Light compare CLI/report/export support state
  - analysis-result comparison export support state
  - rendering identity fixture where host HWUI and producer chains stay separate
- Release-surface smoke for product-visible changes: at minimum npm packed CLI
  smoke; add Docker/portable Web UI smoke when API/UI/prebuild behavior changes.

Before implementation is called complete:

```bash
npm --prefix backend run build
npm run verify:pr
```

If the feature touches the Perfetto UI plugin, also verify dev mode and refresh
the committed `frontend/` prebuild according to the root agent rules.

## 10. Review Questions

- Is the contract strict enough for deterministic verifier without making every
  sentence citation-heavy?
- Should SQL text be persisted as a redacted sidecar, a hash plus lookup, or a
  short normalized SQL summary?
- Which claim kinds should be P0: numeric, identity, causal, comparison?
- Should `EvidenceIdentityV1` depend directly on the process/thread identity
  contract, or stay loosely coupled through `identityRefId`?
- Which UI surface should first expose `supportLevel`: AI panel, report, or
  both?
