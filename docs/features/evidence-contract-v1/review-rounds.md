# Evidence Contract v1 Review Rounds

**Date**: 2026-05-21
**Scope**: `docs/features/evidence-contract-v1/README.md` Draft v1 -> v6
**Method**: sub-agent grounded review against current SmartPerfetto backend,
agentv3, report/export, frontend checked-claims, and snapshot code.

## Round 1 — Sub-Agent Review

Reviewer: Galileo

### P0 findings

1. Ordinary `invoke_skill` data does not consistently carry trace provenance.
   The draft claimed SQL/Skill producers already attach provenance, but current
   ordinary Skill emission can pass no `traceProvenance`, which means Skill
   evidence can become `trace_unknown`. This blocks any v1 claim that Skill
   evidence is complete.

2. The initial v1 schema could list anchors but could not express causal
   relations. Claims such as "A blocked B" or "A woke B" need relation evidence
   with subject/object anchors and relation kind; otherwise deterministic
   verifier can only downgrade them to inference.

### P1 findings

1. `fetch_artifact` / `ArtifactStore` is a key evidence path but is not a
   durable DataEnvelope-backed source today. Claim references based on artifact
   rows need artifact ids/source ids that snapshot/report/export can resolve.

2. CLI export does not currently carry structured claim support. It writes
   conclusion/transcript/config artifacts, so v1 needs a CLI sidecar or
   equivalent export path.

3. Updating only strategy templates would miss the actual conclusion contract
   generation path. The plan must include `conclusionGenerator.ts` and the
   comparison conclusion template.

4. `identityRefId` has no stable current source. Evidence v1 must either depend
   on the identity contract or treat identity evidence as partial-only until
   that contract exists.

### P2 findings

1. The initial `EvidenceAnchorV1` risked becoming a parallel schema. v2 now
   states that implementation should first extend existing
   `ConclusionContractClaimReference` and persisted `EvidenceRef` paths.

## Applied In Draft v2

- Corrected the existing-capability summary: SQL/comparison provenance is
  stronger than ordinary `invoke_skill` provenance.
- Added M0.5 to fix Skill trace provenance and artifact claim source blockers.
- Added `EvidenceRelationV1` and causal relation requirements.
- Added CLI structured sidecar/export work to M3.
- Added conclusion contract entry-point coverage beyond strategy templates.
- Added guidance to avoid duplicating the existing claim-reference schema.

## Expert Team Round 1 — Single-Feature Review

Reviewer: Zeno

### P0 findings

No remaining P0 blocker.

### P1 findings

1. Causal relation schema needed stable anchor ids. Draft v2 had relations that
   referenced anchors by id, but anchors had no `anchorId`.

2. Identity provenance needed an explicit dependency/degradation rule. Without
   a stable identity resolver output, identity claims cannot be `verified`.

3. CLI/report/export persistence needed a named source of truth. Draft v2
   required a sidecar but did not say whether CLI turn persistence, transcript,
   or session snapshot owns claim support.

### P2 findings

1. M0.5 exit criteria needed stronger ordinary Skill provenance requirements.
2. `traceSide` vocabulary should keep low-level DataEnvelope sides aligned with
   `current` / `reference`; baseline/candidate are comparison-layer aliases.
3. Prompt changes should live in strategy/template files; TypeScript should
   parse/sanitize/render.

### Applied in Draft v3

- Added `anchorId` to `EvidenceAnchorV1` and deterministic anchor id guidance.
- Added identity claim degradation rule until Identity Contract produces stable
  `identityRefId` and status.
- Added CLI/report source-of-truth guidance for `SessionStateSnapshot` and
  per-turn `claim-support.json`-style sidecar.
- Hardened M0.5 Skill provenance exit criteria.
- Added trace-side and prompt-boundary notes.

## Expert Team Round 3 — Single-Feature Re-Review

Reviewer: Noether

### P0 findings

No remaining P0 blocker.

### P1 findings

1. Analysis-result snapshots need an explicit list/detail payload boundary.
   Current list APIs intentionally avoid returning full conclusion contracts by
   default; Evidence v1 must not inflate list payloads with every anchor/cell.

2. Frontend type sync needed a concrete generator/check path for a new
   `evidenceContract.ts`. The current generated-type scripts are centered on
   `dataContract.ts` and `conclusionContract.ts`.

3. CLI sidecar wording was too abstract. The plan needed deterministic
   per-turn/latest file names and JSON export fields.

4. Comparison migration needed canonical fields and a legacy handling rule for
   `ComparisonConclusion.verifiedFacts`; otherwise comparison can keep a
   parallel unverified fact channel.

### P2 findings

1. `unknown` trace side must be scoped to the Evidence view unless
   `DataEnvelopeTraceSide` is migrated.
2. Draft v4 changes were not recorded in this review file.

### Applied in Draft v5

- Added list/detail snapshot boundary.
- Made generated type script/check updates mandatory for `evidenceContract.ts`.
- Replaced abstract CLI sidecar wording with `turns/NNN.claim-support.json`,
  latest `claim-support.json`, and JSON export field requirements.
- Hardened comparison migration around canonical claim support/verifier fields
  and legacy `verifiedFacts`.
- Clarified `unknown` trace-side compatibility with current DataEnvelope.
- Switched final validation commands to root-safe `npm --prefix backend ...`
  and root `npm run verify:pr`.

## Expert Team Round 4 — Cross-Feature Re-Review

Reviewers: Galileo, Copernicus, Hubble

### P0 findings

No remaining P0 blocker.

### P1/P2 findings applied to this feature

1. Artifact ids needed a canonical field. Draft v6 makes `artifactId`
   canonical and treats `sourceArtifactId` as an ingest compatibility alias.

2. Raw trace comparison appendix evidence was not an Evidence/Verifier input.
   Draft v6 adds `ComparisonEvidencePack` / `ComparisonReportSection` handling
   or debug-only labeling.

3. Real SSE payload, generated frontend types, and frontend parser needed to be
   named together. Draft v6 adds the `/api/agent/v1/analyze`
   `analysis_completed` schema/parser gate.

4. API/report/CLI surfaces were incomplete. Draft v6 adds
   `/api/agent/v1/:sessionId/report`, `/api/reports/:reportId/export`, CLI
   stdout/show/JSON/NDJSON, and comparison export format requirements.

5. Test and release gates were too abstract. Draft v6 adds focused-test wiring,
   sidecar write/read/export checks, frontend prebuild refresh, real-trace smoke
   matrix, and release-surface smoke.
