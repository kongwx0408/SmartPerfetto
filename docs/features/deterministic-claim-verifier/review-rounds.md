# Deterministic Claim Verifier Review Rounds

**Date**: 2026-05-21
**Scope**: `docs/features/deterministic-claim-verifier/README.md` Draft v1 -> v6
**Method**: sub-agent grounded review against `claudeVerifier`,
`ClaudeRuntime`, `OpenAIRuntime`, `ConclusionContract`, `ArtifactStore`,
session snapshots, report/export, and frontend checked-claims logic.

## Round 1 — Sub-Agent Review

Reviewer: Hooke

### P0 findings

1. Draft v1 only covered Claude full path. Current Claude full mode calls
   `verifyConclusion()`, but OpenAI runtime and Claude quick path can bypass
   verifier. Deterministic verification must be provider-neutral or failures
   will be hidden by runtime choice.

### P1 findings

1. `claim.kind` is core input, but current `ConclusionContract` does not store
   it. Rule dispatch cannot be deterministic if the verifier guesses claim type
   from free text.

2. Artifact-backed claims lack a durable claim reference. `fetch_artifact`
   exposes `sourceArtifactId`, but current claim parser ignores artifact refs.

3. Report/export/snapshot surfaces were too generic. Session snapshot,
   analysis-result snapshot, `analysis_completed` SSE payload, CLI transcript,
   config, and JSON/Markdown export all need explicit verifier metadata paths.

### P2 findings

1. Frontend checked-claims already performs row/column/value validation. Backend
   verifier should migrate or mirror those checks so Web UI, report, and export
   do not disagree.

## Applied In Draft v2

- Added provider-neutral `ClaimVerificationRunner`.
- Added explicit OpenAI runtime and quick/fast mode policies.
- Added required claim schema upgrade for `kind`, `artifactRefs`,
  `relationRefs`, and `supportLevel`.
- Added artifact indexing as M1 requirement.
- Added session snapshot, analysis snapshot, SSE, CLI export, and report
  persistence requirements.
- Added frontend checked-claims migration requirement.

## Expert Team Round 1 — Single-Feature Review

Reviewer: Fermat

### P0 findings

No remaining P0 blocker.

### P1 findings

1. `ClaimVerificationResult` needed to express `not_checked`, policy, and
   per-claim/per-reference status. A boolean `passed` plus issues cannot
   distinguish "nothing checked" from "verified".

2. The verifier metadata carrier was not named. The cross-runtime handoff should
   be `AnalysisResult` or a clearly attached contract metadata object, otherwise
   route/CLI/report code can recompute or lose verifier state.

### P2 findings

1. Type sync needs explicit files: backend contract, data contract, generated
   frontend types, and report aliases.
2. HTML report should render backend verifier results instead of keeping a
   separate source-found-only verdict.

### Applied in Draft v3

- Expanded `ClaimVerificationResult` with `status`, `policy`,
  `notCheckedReason`, `claimResults[]`, and `referenceResults[]`.
- Added `AnalysisResult` as the canonical in-memory runtime-to-route carrier.
- Added type-sync and report-renderer acceptance requirements.

## Expert Team Round 3 — Single-Feature Re-Review

Reviewer: Anscombe

### P0 findings

No remaining P0 blocker.

### P1 findings

1. `ClaimVerificationResult.passed` and `status/not_checked` needed an
   invariant. Existing runtime code still branches on boolean `passed`, so
   `not_checked` must not be interpreted as pass.

2. Analysis-result comparison still had an unstructured `verifiedFacts` escape
   path through the comparison prompt, AI conclusion service, and HTML report.

3. CLI resume/export verifier metadata needed concrete per-turn/latest sidecar
   paths and JSON export fields.

4. Final validation commands could accidentally run backend-only `verify:pr`
   after `cd backend`; they needed root-safe command wording.

### P2 findings

1. Model-produced `supportLevel` needed a non-authoritative verdict rule.
2. Numeric tolerance needed a deterministic v1 rule instead of staying an open
   review question.

### Applied in Draft v5

- Added `passed === (status === 'passed')` invariant.
- Made model-produced `supportLevel` an input hint only; visible verdicts come
  from `claimResults[]`.
- Added deterministic v1 numeric tolerance rules.
- Added comparison template/service/report migration requirements.
- Replaced abstract CLI verifier metadata with
  `turns/NNN.claim-verification.json`, latest `claim-verification.json`, and
  JSON export field requirements.
- Added frontend type generation/check commands before root `verify:pr`.

## Expert Team Round 4 — Cross-Feature Re-Review

Reviewers: Galileo, Copernicus, Hubble

### P0 findings

No remaining P0 blocker.

### P1/P2 findings applied to this feature

1. Raw trace comparison appendix evidence was outside verifier scope. Draft v6
   adds `ComparisonEvidencePack` / `ComparisonReportSection` as verifier input
   or debug-only evidence.

2. Restore/status/turn persistence needed concrete carriers. Draft v6 adds
   `SubAgentResult` / `ConversationTurn` / turn detail/status/recovery
   requirements.

3. SSE/API payload, generated frontend type, and frontend parser needed one
   contract. Draft v6 adds the `analysis_completed` schema/parser gate.

4. CLI visibility needed more than sidecars. Draft v6 adds JSON/NDJSON renderer
   and `smp show` compact verifier/support summaries.

5. M4 was too broad. Draft v6 splits it into runtime, persistence/SSE,
   CLI/export, and report/UI slices.

6. Acceptance now covers report API/export, comparison export format, frontend
   prebuild, release-surface smoke, and real-trace smoke matrix.
