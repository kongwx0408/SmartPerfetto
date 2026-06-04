# Codebase-Aware Analysis Rules

Use these rules before touching code-aware analysis, codebase registry, source ingestion, symbol resolution, patch proposal, or code-aware report/UI surfaces.

## Product Boundary

- Treat source code as user-owned local material. Do not persist raw source snippets in sessions, reports, exports, telemetry, access logs, or frontend storage.
- LLM-visible output should prefer `CodeRef` metadata: `chunkId`, relative `filePath`, `lineRange`, `symbol`, `codebaseId`, `buildId`, `vendor`.
- Raw excerpts are only for explicit user inspection through RBAC-protected endpoints. Frontend excerpt caches must remain in memory and clear on session switch, trace switch, panel unmount, permission revoke, codebase reindex, and codebase delete.
- `metadata_only` must never send source snippets to providers. `provider_send` still requires per-codebase `sendToProvider` consent.

## Backend

- Register and preview paths through `PathSecurityGate`; never trust a client-supplied root directly.
- Code-aware chunks must carry `codebaseId` and `registryOrigin='codebase_registry'`.
- `app_source`, `kernel_source`, or registry-origin chunks missing codebase metadata must fail closed with `invalid_codebase_metadata`.
- Shared lookup handlers must pass through `LookupResponseFilter` before the model sees results.
- SSE/log/snapshot/report/export paths must use projected/sanitized payloads, not raw MCP tool results.
- Keep prompt content in `backend/strategies/` and Skills in `backend/skills/`; do not hardcode code-aware prompting in TypeScript.

## Patch Proposals

- `propose_patch` requires prior successful code lookup in `CodeLookupLedger`.
- Reject context from multiple codebases in Phase 1.
- Verify target files are inside previously looked-up context.
- Run `git apply --check` in the target codebase root before returning a `verified` patch.
- `sketch` and `unverified` responses must not expose copyable unified diff text.

## Verification

After backend changes:

```bash
cd backend
npm run typecheck
npm run validate:strategies
npm run validate:skills
npm run test:scene-trace-regression
```

After plugin UI changes:

```bash
./scripts/start-dev.sh
./scripts/update-frontend.sh
```

Before landing:

```bash
npm run verify:pr
```

For full code-aware validation:

```bash
npm --prefix backend run verify:codebase-aware
```

This gate depends on local Heavy/Light traces plus a local
`HighPerformanceFriendsCircle` checkout. It verifies both no-codebase
trace-only behavior and configured-codebase reports/exports with source-level
`CodeRef` assertions.
