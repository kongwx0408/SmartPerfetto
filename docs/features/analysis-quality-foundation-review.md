# Analysis Quality Foundation Cross-Feature Review

**Date**: 2026-05-21
**Scope**: Cross-feature review for:

- `docs/features/evidence-contract-v1/README.md`
- `docs/features/deterministic-claim-verifier/README.md`
- `docs/features/process-thread-identity-contract/README.md`

This file records the expert review rounds requested by the maintainer. The
features were reviewed independently, then reviewed together for shared
contracts, product surfaces, implementation order, and test gates. A later
third round re-reviewed each feature from current Draft v4 and was applied back
to Draft v5 before the next cross-feature pass.

## Recommended Implementation Order

Do not start the three features as parallel implementation streams. Use this
order:

1. Identity core sidecar:
   `IdentityResolutionV1 + identityRefId + status mapping + warnings`.
2. Evidence Contract foundations:
   anchors, Skill provenance, artifact durable links, comparison evidence.
3. Unified claim schema:
   `ConclusionContract` parser/sanitizer/codegen plus generated frontend types.
4. Deterministic verifier:
   rule index, claim/reference verdicts, provider-neutral runner.
5. Product adoption:
   Claude/OpenAI, quick/full, SSE/status/restore, reports, CLI/export, UI.

## Round 2 Findings

### P0

1. Analysis-result comparison was still a bypass.
   `ComparisonResult`, `ComparisonConclusion`, `comparison_state`, and
   `comparisonAiConclusionService` must carry Evidence/Verifier/Identity state.
   Otherwise `fact_check` can keep producing `verifiedFacts` without the new
   verifier.

2. Identity and Evidence had a potential circular dependency.
   The fix is to make Identity M0/M1 publish a standalone sidecar first.
   Evidence links to it later; Identity must not wait for Evidence anchors to
   create `identityRefId`.

3. Shared enums were inconsistent.
   Low-level `traceSide` must align on `current` / `reference` / `unknown`.
   Baseline/candidate are comparison-layer aliases. Thread roles must use the
   same vocabulary across Evidence, Identity, and Verifier.

4. Claim schema ownership was split across three documents.
   `ConclusionContract` owns the claim schema; Evidence derives claim support;
   Verifier owns verdict/result state.

5. Raw SQL identity warnings were not durable.
   Tool JSON/text is not enough; warning/status must enter DataEnvelope or
   Evidence sidecar so reports, exports, and verifier can see it.

### P1

1. Artifact-backed claims need durable row addresses that survive LRU eviction,
   backend restart, pagination, and export.

2. `queryHash` should remain canonical. `sqlHash` should not become a second
   field name except as compatibility alias.

3. `AnalysisResult` and `ComparisonResult` must be named carriers for verifier
   metadata before route/persistence/export code runs.

4. Session restore/status/turn APIs and CLI resume need explicit metadata paths.

5. Legacy HTTP export surfaces must be covered:
   `/api/export/result`, `/api/export/session`, `/api/export/analysis`,
   `/api/sessions/export`.

6. Focused tests must be wired into merge gates. `verify:pr` does not
   automatically cover every new test listed in the plans.

7. Generated frontend type sync needs a real gate for new claim/evidence/meta
   fields, not only the existing narrow checks.

8. CLI export acceptance must cover latest and `--turn` outputs across
   HTML/Markdown/JSON.

## Applied Back To Draft v4

- Evidence Contract:
  - narrowed low-level `traceSide`
  - renamed `sqlHash` to canonical `queryHash`
  - aligned thread role vocabulary
  - added Identity sidecar dependency boundary
  - added analysis-result comparison, legacy export, artifact durability, and
    type-sync gates

- Deterministic Claim Verifier:
  - added `ComparisonResult` / `ComparisonConclusion` carrier requirements
  - added analysis-result comparison verification path
  - clarified `relationRefs[]` references `EvidenceRelationV1.id`
  - expanded CLI/export/comparison/type-sync test gates

- Process/Thread Identity:
  - aligned low-level `traceSide`
  - added standalone Identity sidecar boundary
  - split M0 into contract/inventory and resolver-output slices
  - added comparison and type-sync coverage

## Round 3 Single-Feature Review

No new P0 was found. The following P1/P2 items were applied back to Draft v5:

- Evidence Contract:
  - preserved analysis-result list/detail payload boundary
  - made frontend type generation/check updates mandatory when adding
    `evidenceContract.ts`
  - replaced abstract CLI sidecar wording with deterministic
    `turns/NNN.claim-support.json`, latest `claim-support.json`, and JSON export
    fields
  - clarified `unknown` trace side stays in the Evidence view unless
    DataEnvelope is migrated
  - hardened `ComparisonResult` migration away from unstructured
    `verifiedFacts`

- Deterministic Claim Verifier:
  - added `passed === (status === 'passed')` invariant
  - made model-produced `supportLevel` non-authoritative for visible verdicts
  - added deterministic v1 numeric tolerance rules
  - added comparison prompt/report/service migration requirements
  - replaced abstract CLI metadata wording with deterministic
    `turns/NNN.claim-verification.json`, latest `claim-verification.json`, and
    JSON export fields

- Process/Thread Identity:
  - added raw trace comparison appendix as an explicit product surface
  - made `verified` require uniqueness and runner-up handling
  - changed time ranges to `TraceTimestampNs = string | number`
  - clarified `partial` belongs to claim support, not identity status
  - made identity type generation/check updates mandatory when adding the
    sidecar type
  - corrected final validation commands to run backend build/type checks and
    root `verify:pr`

## Round 4 Cross-Feature Review

No new P0 was found. The remaining issues were P1/P2 execution and contract
hardening items. They were applied back to Draft v6.

### Round 4 P1/P2 Findings

1. Timestamp precision was still inconsistent. Identity target time ranges used
   `TraceTimestampNs`, but resolver output fields still used `number`.

2. Artifact reference naming could drift between `artifactId` and
   `sourceArtifactId`.

3. Raw trace comparison appendix evidence was still not a first-class
   Evidence/Verifier input. Identity covered SQL identity warnings, but
   Evidence/Verifier did not define whether `ComparisonEvidencePack` /
   `ComparisonReportSection` can produce verified claims.

4. Real SSE/API payload, generated type output, and frontend parser were not
   explicitly tied together.

5. Web restore/status/turn persistence needs `SubAgentResult` /
   `ConversationTurn` updates, not only `AnalysisResult` /
   `SessionStateSnapshot`.

6. CLI sidecars needed write/read/export/show/stdout/JSON/NDJSON coverage, not
   just report export coverage.

7. Comparison Markdown/JSON export tests lacked a concrete API/CLI contract.

8. `/api/agent/v1/:sessionId/report` JSON and `/api/reports/:reportId/export`
   HTML were not named acceptance surfaces.

9. Focused tests need to be wired into `test:core` / root `verify:pr`, or each
   PR slice must run named focused commands.

10. Generated frontend types are not enough when committed `frontend/` is the
    source/Docker/portable runtime path. Prebuild refresh and check are required
    when generated types, SSE/API, or AI Assistant parser changes.

11. Real-trace smoke should be a matrix: single-trace SSE/report, raw
    Heavy/Light compare CLI/report/export, analysis-result comparison export,
    and rendering identity fixture.

12. Product-visible changes need release-surface smoke: npm packed CLI at
    minimum for CLI changes, Docker/portable Web UI when API/UI/prebuild changes.

### Applied Back To Draft v6

- Evidence Contract:
  - made `artifactId` canonical and `sourceArtifactId` an ingest alias
  - added raw trace comparison appendix evidence handling
  - added real SSE schema/generated type/frontend parser contract
  - added report API/export, CLI stdout/show, comparison export format, focused
    gate, frontend prebuild, real-trace matrix, and release-surface smoke

- Deterministic Claim Verifier:
  - added raw trace comparison appendix verifier handling
  - added `SubAgentResult` / `ConversationTurn` / restore/status/turn carrier
    requirements
  - split M4 into runtime, persistence/SSE, CLI/export, and report/UI slices
  - added CLI JSON/NDJSON/show, report API/export, frontend prebuild, release,
    and real-trace matrix gates

- Process/Thread Identity:
  - changed all resolver trace ns fields to `TraceTimestampNs`
  - moved claim/verifier-triggered thread gating from M2 to M4
  - added report/API/export identity status gates
  - added focused test, frontend prebuild, and release-surface smoke gates
