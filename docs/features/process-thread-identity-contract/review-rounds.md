# Process And Thread Identity Contract Review Rounds

**Date**: 2026-05-21
**Scope**: `docs/features/process-thread-identity-contract/README.md` Draft v1 -> v6
**Method**: sub-agent grounded review against `process_identity_resolver`,
`identityGate`, `SkillExecutor`, raw SQL warning paths, Skill DSL types,
validator, and current Skill SQL usage.

## Round 1 — Sub-Agent Review

Reviewer: Banach

### P0 findings

No P0 blocker found.

### P1 findings

1. Raw SQL/thread detector had a false-positive risk. Current tests explicitly
   keep `thread.name = 'RenderThread'` from being treated as a process identity
   filter, and many Skills use thread names for role classification rather than
   target identity. The plan must distinguish target identity from role
   classification.

2. Draft v1 DSL wording did not match current schema. Existing Skill identity
   config is `identity.policy` with process-only `identity.scope`; adding
   `thread_identity.required` would be ignored unless `types.ts`, validator,
   `identityGate`, `SkillExecutor`, and Skill docs change together.

3. Raw SQL identity warning currently stays in tool JSON/text and is not
   persisted into DataEnvelope/Evidence/report paths. v1 must make warnings and
   status durable.

### P2 findings

1. Legacy `backend/src/agent/tools/sqlExecutor.ts` contains another
   `execute_sql` path. Implementation must migrate it or explicitly classify it
   as non-product/legacy.

2. Evidence integration needs more than `identityRefId`; verifier/report need
   status, warnings, and recommended params.

## Applied In Draft v2

- Added detector taxonomy:
  `process_identity_filter`, `thread_target_filter`,
  `thread_role_classification`, and `non_identity_name_filter`.
- Rewrote Skill DSL section to align with current `SkillIdentityConfig` and
  list required code/validator/doc updates.
- Made raw SQL warning/status persistence a milestone exit criterion.
- Added legacy SQL executor migration/non-goal decision.
- Added status/warnings/recommendedParams to Evidence/verifier integration.

## Expert Team Round 1 — Single-Feature Review

Reviewer: Dalton

### P0 findings

No P0 blocker.

### P1 findings

1. Skill identity type updates missed the runtime type source
   `backend/src/services/processIdentity/types.ts`, and there are duplicated
   `SkillIdentityConfig` definitions that can drift.

2. Detector taxonomy needs a structured context-aware API, not another boolean
   regex helper. The detector needs tool, user target/selection, claim/phase
   context, trace side, and Skill identity config.

3. Evidence/verifier integration needs concrete `DataEnvelopeMeta`,
   `createDataEnvelope`, Evidence builder, snapshot/report/export, and generated
   frontend type changes.

4. Current process identity statuses need a migration table into v1 statuses.

### P2 findings

1. Process lifetime (`startTs` / `endTs`) needs to reach resolver output and
   parser code for restart/time-window checks.
2. `execute_sql_on` should be covered alongside `execute_sql`.

### Applied in Draft v3

- Added `processIdentity/types.ts` and canonical type-source requirement.
- Added `analyzeIdentityFilters(sql, context)` style API requirement.
- Added status migration table.
- Added process lifetime, `execute_sql_on`, DataEnvelope/Evidence/report/export,
  and generated type requirements.

## Expert Team Round 3 — Single-Feature Re-Review

Reviewer: Raman

### P0 findings

No remaining P0 blocker.

### P1 findings

1. Raw trace comparison appendix was a missing product surface. Fixed SQL
   appendix builders directly query traces and can bypass `execute_sql_on`
   identity warning semantics.

2. Process `verified` needed a uniqueness rule. Highest-scoring candidate alone
   is not enough when same-name processes, shared UID, provider processes, or
   restarts exist.

3. `timeRange` should preserve Perfetto ns timestamp precision as
   `string | number`, not force JavaScript `number`.

4. Standalone identity type sync needed a concrete generator/check path if the
   new contract is not part of existing generated-type inputs.

### P2 findings

1. `partial` should not be an identity status; it belongs to claim/evidence
   support.
2. `unknown` trace side must not be persisted into current DataEnvelope meta
   unless DataEnvelope and generated consumers are migrated.
3. Final validation commands could accidentally run backend-only `verify:pr`.

### Applied in Draft v5

- Added raw trace comparison appendix to product surfaces and raw SQL detector
  acceptance.
- Added `verified` uniqueness and runner-up handling rules.
- Introduced `TraceTimestampNs = string | number` for identity time ranges.
- Clarified `partial` as claim/evidence support, not identity status.
- Made generated type script/check updates mandatory for sidecar identity types.
- Switched final validation commands to root-safe `npm --prefix backend ...`
  and root `npm run verify:pr`.

## Expert Team Round 4 — Cross-Feature Re-Review

Reviewers: Galileo, Copernicus, Hubble

### P0 findings

No remaining P0 blocker.

### P1/P2 findings applied to this feature

1. Resolver output timestamp fields still used `number`. Draft v6 changes
   process lifetime and thread active ranges to `TraceTimestampNs`.

2. M2 referenced final claim/verifier signals too early. Draft v6 keeps M2
   limited to Skill-declared thread targets and moves claim/verifier-triggered
   checks to M4.

3. Report/API/export identity status surfaces were incomplete. Draft v6 adds
   `/api/agent/v1/:sessionId/report`, `/api/reports/:reportId/export`, SSE, and
   restore/status/turn requirements.

4. Test and release gates were too abstract. Draft v6 adds focused-test wiring,
   frontend prebuild, CLI compact warning surfaces, and release-surface smoke.
