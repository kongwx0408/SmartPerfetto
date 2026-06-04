# Deterministic Claim Verifier Feature Plan

**Status**: Draft v6, fourth cross-feature review feedback applied
**Owner**: TBD
**Created**: 2026-05-21
**Builds on**: `claudeVerifier`, ConclusionContract `claims`, Evidence Contract v1, DataEnvelope artifacts
**Related rules**: `.claude/rules/product-surface.md`, `.claude/rules/prompts.md`, `.claude/rules/backend.md`, `.claude/rules/testing.md`

## 1. Summary

SmartPerfetto already has a verifier pipeline in `backend/src/agentv3/claudeVerifier.ts`:

- heuristic checks for missing evidence, over-severity, incomplete output, and known bad patterns
- plan adherence and scene-completeness checks
- optional lightweight LLM verification through an independent `sdkQuery`

That verifier improves report quality, but it does not deterministically prove a
specific claim against specific evidence cells. For example, the current system
can warn that a CRITICAL finding has no evidence, but it cannot reliably prove:

> "The main thread was blocked by Binder for 120 ms" is backed by a main-thread
> slice, Binder transaction evidence, an overlap duration, and a peer thread.

This feature adds a deterministic claim verifier that checks structured claims
against Evidence Contract anchors before the optional LLM verifier runs. The
hook must be provider-neutral: Claude full mode, Claude quick/fast mode, OpenAI
runtime, reports, exports, and SSE completion payloads must not diverge.

## 2. Product Goal

Reduce unsupported or over-specific conclusions in normal AI analysis.

The verifier should catch:

- exact value mismatch: claim says 120 ms but referenced row value is 12 ms
- missing row/column: claim cites a table but not the actual cell
- identity mismatch: claim says main thread but cited evidence is another thread
- missing relation: claim says "blocked by Binder" but no overlap/wakeup/blocking relation exists
- unmarked inference: claim makes a causal statement from weak evidence without `inference`
- comparison mismatch: claim says candidate regressed but baseline/candidate metric directions do not support it

It should not try to solve every open-ended reasoning problem. Its job is to
reject or downgrade claims whose support can be mechanically checked.

## 3. Current Code Grounding

| Area | Current source | What exists |
| --- | --- | --- |
| Verifier pipeline | `backend/src/agentv3/claudeVerifier.ts` | `verifyConclusion()` combines heuristic, plan, hypothesis, scene completeness, and optional LLM checks. |
| LLM verifier | `backend/src/agentv3/claudeVerifier.ts` | `verifyWithLLM()` uses independent `sdkQuery` with lightweight model and graceful timeout/failure behavior. |
| Claim parsing | `backend/src/agent/core/conclusionGenerator.ts` | Parses claim references from JSON and Markdown into `ConclusionContract`. |
| Evidence metadata | `backend/src/types/dataContract.ts`, `backend/src/agentv3/artifactStore.ts` | Data envelopes and artifacts carry evidence/tool/phase metadata. |
| Runtime gap | `backend/src/agentOpenAI/openAiRuntime.ts`, `backend/src/agentv3/claudeRuntime.ts` | Claude full mode runs `verifyConclusion()`, but OpenAI runtime and Claude quick path can currently bypass verification. |
| Existing tests | `backend/src/agentv3/__tests__/claudeVerifier.test.ts` | Tests missing evidence, severity mismatch, scene completeness, and structured evidence-ending behavior. |

Current limitation: `verifyConclusion()` takes findings, conclusion text, plan,
hypotheses, and tool calls. It does not take a normalized evidence index, so it
cannot validate row/column/value/time/identity support.

## 4. Architecture

Add a deterministic verifier service:

```text
ConclusionContract
  + EvidenceContract anchors
  + DataEnvelope/artifact rows
  + tool call log
        |
        v
ClaimEvidenceIndex
        |
        v
DeterministicClaimVerifier
        |
        +--> ClaimVerificationResult
        +--> correction prompt input
        +--> snapshot/report metadata
```

Proposed files:

| File | Responsibility |
| --- | --- |
| `backend/src/services/verifier/claimEvidenceIndex.ts` | Index anchors, rows, columns, values, time ranges, identities by evidence id/tool id/source ref. |
| `backend/src/services/verifier/deterministicClaimVerifier.ts` | Run rule checks by claim kind and return structured failures. |
| `backend/src/services/verifier/claimRules/*.ts` | Small rule modules: numeric, identity, time range, overlap/blocking, comparison. |
| `backend/src/services/verifier/claimVerificationRunner.ts` | Provider-neutral orchestration hook used by Claude, OpenAI, SSE completion, reports, and CLI/export paths. |
| `backend/src/agent/core/orchestratorTypes.ts` | Extend `AnalysisResult` as the canonical runtime-to-route handoff for verifier metadata and conclusion contract data. |
| `backend/src/types/multiTraceComparison.ts` | Extend `ComparisonResult` / `ComparisonConclusion` as the canonical comparison-result carrier. |
| `backend/src/services/comparisonAiConclusionService.ts` | Route comparison conclusion generation through the same claim support/verifier path. |
| `backend/strategies/comparison-conclusion.template.md` | Stop asking the model for unstructured `verifiedFacts` as a final authority; require comparison claims/support or downgrade facts to inference/summary text. |
| `backend/src/services/comparisonHtmlReportService.ts` | Render backend verifier verdicts, not source-found or `verifiedFacts` labels, as the comparison proof state. |
| `backend/src/services/comparisonAppendixService.ts` | Treat raw trace `ComparisonEvidencePack` / `ComparisonReportSection` as verifier input, or label it debug-only so it cannot create verified claims. |
| `backend/src/agent/types.ts` | Extend `SubAgentResult` / `ConversationTurn` so restore/status/turn APIs keep verifier metadata. |
| `perfetto/ui/src/plugins/com.smartperfetto.AIAssistant/sse_event_handlers.ts` | Parse the same generated SSE fields emitted by backend `analysis_completed`. |
| `backend/src/agentv3/claudeVerifier.ts` | Consume deterministic result in the existing Claude heuristic/LLM verifier pipeline. |
| `backend/src/agentOpenAI/openAiRuntime.ts` | Run the same deterministic verifier before OpenAI conclusions are emitted or persisted. |
| `backend/src/agentv3/__tests__/deterministicClaimVerifier.test.ts` | Unit coverage for mechanical support checks. |

## 5. Required Claim Schema Upgrade

Claim kind is not optional implementation detail. The current
`ConclusionContractClaimItem` stores `id`, `conclusionId`, `text`, and
`references`; deterministic verification cannot infer the rule type from free
text and still remain deterministic.

Before rule work starts, extend the claim contract to include:

```ts
interface ConclusionContractClaimItemV2 {
  id: string;
  conclusionId?: string;
  text: string;
  kind: 'numeric' | 'categorical' | 'time_range' | 'identity' | 'causal' | 'comparison' | 'inference' | 'recommendation';
  references: ConclusionContractClaimReference[];
  artifactRefs?: Array<{ artifactId: string; rowIndex?: number; rowSelector?: Record<string, unknown> }>;
  relationRefs?: string[];
  supportLevel?: 'verified' | 'partial' | 'inference' | 'unsupported';
}
```

The exact shape should align with Evidence Contract v1, but three requirements
are non-negotiable:

- `kind` must be model-produced and parser-preserved; verifier should not guess.
- artifact-backed claims need a durable `artifactId` / `sourceArtifactId` path.
- causal claims need relation refs or they can only be verified as inference.
- generated frontend types, report renderer aliases, and backend data contract
  types must be regenerated/updated together so all surfaces understand the new
  claim fields.
- `relationRefs[]` points to `EvidenceRelationV1.id`. It must not point to a
  free-form anchor id or invent a second relation namespace.
- `supportLevel` is model-produced input metadata only. It can guide correction
  prompts and downgrade intent, but visible verdicts in UI/report/export must
  come from `ClaimVerificationResult.claimResults[]`, never from model-produced
  `supportLevel` alone.

## 6. Claim Rule Matrix

| Claim kind | Deterministic checks |
| --- | --- |
| `numeric` | referenced column exists; value matches raw value after deterministic unit conversion; trace side matches. v1 tolerance is exact for same-unit numeric values, exact after `ns`/`ms`/`s` conversion, and bounded display tolerance only for rounded text: <= 0.5 in the last displayed decimal place, or <= 0.1 percentage points for percent values. |
| `categorical` | referenced value exists and matches string/enum after safe normalization. |
| `time_range` | start/end/duration can be found or derived; claimed range overlaps cited event. |
| `identity` | process/thread fields support the claim; weak name-only matches are downgraded. |
| `causal` | requires relation-specific rule: overlap, wakeup, blocking state, binder peer, lock owner, or comparison delta. |
| `comparison` | baseline/candidate metrics share key/unit; direction and delta support the text. |
| `inference` | no hard evidence requirement, but must not contain exact unsupported numbers or identity assertions. |
| `recommendation` | must link to at least one verified/partial root-cause claim. |

## 7. Example: Binder Blocking Claim

A claim like:

```json
{
  "kind": "causal",
  "text": "主线程被 system_server Binder 回复阻塞约 120ms",
  "references": [
    {
      "evidence_ref_id": "data:skill:startup_main_thread_binder_blocking...",
      "row_selector": { "utid": 42, "peer_process": "system_server" },
      "column": "blocked_ms",
      "value": 120
    }
  ]
}
```

must verify:

- the referenced evidence id exists
- the row selector resolves to exactly one supported row or a bounded set
- `blocked_ms` exists and matches within tolerance
- referenced identity resolves to the target app main thread
- peer process/thread evidence exists if the text names `system_server`
- time ranges overlap the claimed blocking interval
- if overlap/peer evidence is absent, support is at most `inference`

## 8. Runtime Integration

### 8.1 Provider-neutral runner

The verifier should not live only inside `claudeVerifier.ts`. Add a small
runtime-neutral runner that accepts conclusion text/contract, evidence anchors,
tool/artifact indexes, and mode flags:

```text
ClaimVerificationRunner.run({
  runtimeKind,
  analysisMode,
  conclusionText,
  conclusionContract,
  evidenceIndex,
  policy
})
```

The runner returns structured verifier metadata. Runtime-specific layers can
decide whether to block, retry, warn, or only persist, but they all consume the
same deterministic result.

### 8.2 Full analysis path

Claude full mode currently runs verifier after conclusion generation. The new
provider-neutral path should be:

```text
generate conclusion
  -> parse ConclusionContract
  -> build EvidenceContract anchors/index
  -> run DeterministicClaimVerifier
  -> if blocking errors: correction prompt / reflection retry
  -> run existing heuristic/LLM verifier if needed
  -> persist final result with verifier metadata
```

The deterministic verifier should run before optional LLM verification. LLM
verification can add qualitative issues, but it must not override a deterministic
failure.

OpenAI runtime must call the same runner before emitting the conclusion and
before persisting the turn. It can use a different retry policy, but it must not
skip deterministic failures silently.

### 8.3 Quick analysis path

Quick/fast mode can use a lighter profile:

- enforce numeric/identity row-cell checks when claim refs exist
- warn, but do not block, if full causal relation evidence is missing
- still mark unsupported exact claims as inference or unsupported

Quick mode must be explicit about policy:

- `warn_only` is acceptable for latency-sensitive mode.
- unsupported exact numeric/identity claims still need visible verifier metadata.
- if quick mode has no structured claim contract, record `not_checked` rather
  than implying pass.

### 8.4 Report and snapshot

Persist a compact verifier result:

```ts
interface ClaimVerificationResult {
  schemaVersion: 'claim_verifier@1';
  status: 'passed' | 'failed' | 'partial' | 'not_checked';
  policy: 'block' | 'retry' | 'warn_only' | 'record_only';
  notCheckedReason?: string;
  passed: boolean;
  checkedClaimCount: number;
  unsupportedClaimCount: number;
  claimResults: Array<{
    claimId: string;
    status: 'verified' | 'partial' | 'inference' | 'unsupported' | 'not_checked';
    referenceResults?: Array<{
      evidenceRefId?: string;
      sourceRef?: string;
      status: 'matched' | 'missing' | 'ambiguous' | 'value_mismatch' | 'not_checked';
      message?: string;
    }>;
  }>;
  issues: Array<{
    claimId: string;
    severity: 'error' | 'warning';
    code: string;
    message: string;
    evidenceRefId?: string;
  }>;
}
```

Invariant: `passed` is a compatibility boolean for existing runtime gates and
must equal `status === 'passed'`. `failed`, `partial`, and `not_checked` all set
`passed: false`. If a slice can remove the boolean without breaking current
`claudeVerifier`/runtime callers, removing it is preferable to allowing boolean
and enum verdicts to drift.

Reports should expose the result in developer/debug sections first. End-user UI
can start with simple states: verified, partial, inference, unsupported.

`AnalysisResult` should be the canonical in-memory carrier from runtime to
route/persistence/export. Runtime-specific metadata should not be recomputed
independently in route code, because OpenAI needs verifier output before the
conclusion is emitted and persisted.

`ComparisonResult` is the equivalent canonical carrier for analysis-result
comparison. The existing `ComparisonConclusion.verifiedFacts` channel must be
converted into claim support + verifier metadata, or renamed/downgraded so it
does not imply deterministic verification. This requires updating the
comparison prompt template, AI conclusion service/parser, result type, store,
SSE `comparison_state`, and comparison HTML/Markdown/JSON export together.

Raw trace comparison note: raw trace comparison is a separate product path from
analysis-result comparison. `ComparisonEvidencePack` and
`ComparisonReportSection` must be indexed by the Evidence Contract and verifier,
or the appendix must be labeled debug-only and forbidden from producing
`verified` claim verdicts.

### 8.5 Analysis-result comparison path

Analysis-result comparison is not a normal `AnalysisResult` runtime path.
`comparisonAiConclusionService` can call providers directly and populate
`ComparisonConclusion`. This path must run through the same claim schema and
deterministic verifier:

```text
ComparisonMatrix / ComparisonResult
  -> comparison conclusion draft
  -> parse comparison ConclusionContract
  -> build EvidenceContract anchors from snapshot metrics/evidenceRefs
  -> ClaimVerificationRunner
  -> persist ComparisonConclusion + claimVerificationResult
  -> comparison report/export
```

Exit rule: comparison reports may not label facts as verified unless the
deterministic verifier result supports that label.

## 9. Implementation Plan

### M0. Input contract and fixtures

- Depend on or introduce the minimal Evidence Contract v1 mapper.
- Build fixtures from existing DataEnvelope and ConclusionContract tests.
- Define severity rules for blocking vs warning.
- Extend `ConclusionContract` parser/sanitizer/prompt to preserve `kind`,
  `supportLevel`, `artifactRefs`, and relation refs.
- Extend the verifier issue type or add a separate deterministic verifier result
  type so strict TypeScript does not force issue-shape hacks.
- Extend `AnalysisResult` or an attached conclusion metadata object so runtime,
  route, report, CLI, and snapshot all consume the same verifier result.
- Extend `ComparisonResult` / `ComparisonConclusion` or an attached comparison
  metadata object so comparison routes and exports consume the same verifier
  result.
- Update `backend/strategies/comparison-conclusion.template.md` in the same
  milestone so the provider no longer emits unstructured `verifiedFacts` as the
  final proof channel.

Exit criteria:

- Unit fixtures can represent SQL result, Skill result, and comparison metric
  claim support.
- Rule dispatch uses `claim.kind`, not text heuristics.

### M1. Evidence index

- Implement `ClaimEvidenceIndex`.
- Support lookup by `evidenceRefId`, `sourceToolCallId`, `sourceRef`,
  row index, row selector, and artifact id.
- Preserve raw value and display value separately.
- Index `sourceArtifactId` / `artifactId` rows returned by `fetch_artifact`, not
  only DataEnvelope rows.

Exit criteria:

- Row/column/value checks work without reading natural-language report text.

### M2. Numeric, categorical, and identity rules

- Add exact/tolerant numeric matching.
- Add unit normalization for common units (`ns`, `ms`, `s`, `%`, `count`, `fps`).
- Add identity checks using process/thread fields from Evidence Contract.
- Downgrade weak process-name-only support to partial where ambiguity exists.

Exit criteria:

- Tests fail on value mismatch, missing column, wrong trace side, wrong thread.

### M3. Causal and comparison rules

- Add bounded rules for:
  - overlap duration
  - thread state blocking
  - wakeup/waker relation
  - Binder peer relation
  - baseline/candidate metric delta
- Keep rules plugin-like; do not bury domain logic in one giant verifier file.

Exit criteria:

- Binder/blocking and regression fixture tests prove relation checks work.

### M4. Runtime integration

- Add `ClaimVerificationRunner` and wire it into Claude full mode, OpenAI
  runtime, and quick/fast mode with explicit policy.
- Feed deterministic results into `verifyConclusion()` for Claude full mode.
- Ensure runtime results return or carry `conclusionContract` and
  `claimVerificationResult` before route-level persistence.
- Ensure comparison conclusion generation returns or carries
  `conclusionContract` and `claimVerificationResult` before comparison report
  persistence.
- Extend correction prompt with deterministic issue codes.
- Persist verifier result in `SessionStateSnapshot` and analysis result
  snapshots.
- Emit safe SSE/debug metadata in `analysis_completed`.
- Update CLI turn persistence/report export so JSON/Markdown/HTML exports carry
  verifier metadata, not only HTML report debug sections.
- For CLI, persist verifier metadata at deterministic paths:
  - `turns/NNN.claim-verification.json`
  - `claim-verification.json` for the latest turn/session view
  - `claimVerificationResult` in JSON report export
  Resume/status/turn rendering must read these files or the equivalent stored
  metadata, not re-infer verifier state from rendered conclusion text.
- Extend the real Web session carriers, not only `AnalysisResult`:
  `SubAgentResult`, `ConversationTurn`, turn detail/status/recovery payloads,
  and session restore must retain `conclusionContract`, `claimSupport`,
  `claimVerificationResult`, and `identityResolutions`.
- Align the backend `analysis_completed` SSE payload, generated
  `AnalysisCompletedEvent`, and AI Assistant frontend parser. If the frontend
  parser allowlist is not updated, the feature is not complete.

Recommended implementation slices:

1. Runtime runner: Claude/OpenAI/quick policy plus correction retry.
2. Persistence/SSE: `AnalysisResult`, `SubAgentResult`, `ConversationTurn`,
   session restore/status/turn APIs, and `analysis_completed`.
3. CLI/export: per-turn/latest sidecars, report export, stdout JSON/NDJSON, and
   `smp show` compact summaries.
4. Report/UI: HTML/Markdown/JSON rendering, comparison report/export, and AI
   panel states.

Exit criteria:

- Existing `claudeVerifier` tests still pass.
- New tests show deterministic errors trigger correction/retry.
- OpenAI runtime tests prove deterministic verifier is not bypassed.
- Quick mode tests prove `warn_only` or `not_checked` status is explicit.
- Persistence/SSE tests prove restore/status/turn APIs and `analysis_completed`
  keep verifier metadata without re-deriving it from text.
- CLI tests prove sidecars are written, read by latest and `--turn` exports, and
  surfaced in JSON/NDJSON/show summaries.

### M5. Product surface adoption

- Report/export displays verifier summary.
- AI panel can show claim support states when available.
- CLI report includes verifier result in deterministic appendix/debug section.
- Migrate or mirror the current frontend checked-claims row/column/value logic
  into backend verifier fixtures so Web UI, report, and export do not disagree.
- HTML report should render backend verifier `claimResults[]` /
  `referenceResults[]`; it should not keep a separate source-found-only verdict.
- Session restore/status/turn APIs and CLI resume preambles must read the stored
  verifier metadata rather than re-deriving a contract from text.
- `smp analyze`, `smp compare`, CLI JSON/NDJSON renderers, and `smp show` must
  expose a compact verifier/support summary. Unsupported exact claims cannot be
  visible only in HTML or hidden sidecars.
- `/api/agent/v1/:sessionId/report` JSON and `/api/reports/:reportId/export`
  HTML must preserve verifier state.

Exit criteria:

- Web UI/report/CLI do not silently drop verifier failures.

## 10. Non-Goals

- Do not replace the existing LLM verifier. Keep it for qualitative review.
- Do not require every natural-language sentence to become a structured claim.
- Do not claim deterministic proof for open-ended recommendations.
- Do not make the verifier query trace_processor again by default; it should use
  already captured evidence first.
- Do not hide deterministic failures behind provider-specific model behavior.

## 11. Testing And Acceptance

Minimum tests:

- `deterministicClaimVerifier.test.ts`
  - numeric value exact match and mismatch
  - row selector resolution
  - missing column
  - wrong trace side
  - identity mismatch
  - causal claim with missing overlap evidence
  - comparison delta direction mismatch
- `claudeVerifier.test.ts`
  - deterministic issues join existing verifier output
  - correction prompt includes concrete claim issue
- OpenAI runtime tests
  - deterministic verifier runs before conclusion completion
  - verifier metadata appears in result/SSE payload
- quick mode tests
  - warn-only or not-checked status is explicit
- snapshot/report tests
  - verifier result persists
  - unsupported claims render as unsupported/inference
- CLI export tests
  - latest and `--turn` HTML/Markdown/JSON exports include verifier metadata
  - artifact-backed claim references survive export
- comparison tests
  - `ComparisonResult` / `ComparisonConclusion` persist verifier metadata
  - comparison report/export renders verifier state for the chosen
    `format=html|md|json` or explicit endpoint contract
  - unverified comparison facts are not labeled `verifiedFacts`
  - raw trace `ComparisonEvidencePack` / `ComparisonReportSection` either feeds
    verifier input or is labeled debug-only and cannot produce verified claims
- type-sync tests
  - backend `ConclusionContract`, frontend generated data contract types, and
    report renderer aliases all accept the same claim fields
- explicit gate before merge
  - add the new focused tests to `test:core` / `verify:pr`, or document the
    exact `npx jest ... --runInBand` command required for each PR slice
- CLI/release tests
  - sidecar file existence, latest and `--turn` html/md/json export reads,
    JSON/NDJSON renderer summary, and `smp show` summary
  - npm packed CLI smoke when CLI output/export behavior changes
  - Docker/portable Web UI smoke when API/UI/prebuild behavior changes
- frontend/prebuild tests
  - generated SSE/API types and frontend parser accept new fields
  - `./scripts/update-frontend.sh` and `npm run check:frontend-prebuild` after
    generated type, SSE/API, or AI Assistant parser changes
- real trace smoke matrix after implementation:
  - startup Binder or main-thread blocking claim in single-trace SSE/report
  - raw Heavy/Light compare CLI/report/export
  - analysis-result comparison export
  - rendering identity fixture covering host HWUI and producer chains

Before completion:

```bash
npm --prefix backend run build
npm --prefix backend run generate:frontend-types
npm --prefix backend run check:types
./scripts/update-frontend.sh  # when generated types, SSE/API, or AI Assistant parser changed
npm run check:frontend-prebuild
npm run verify:pr
```

## 12. Review Questions

- Which deterministic failures should block final answer vs only annotate report?
- Should causal rules be skill-specific first, or generic over evidence anchors?
- Should v2 add domain-specific numeric tolerance profiles beyond the v1 fixed
  unit-conversion/display-rounding rules?
- Should quick mode run the same verifier in warn-only mode?
- Where should verifier result appear first: report, AI panel, or admin/debug API?
