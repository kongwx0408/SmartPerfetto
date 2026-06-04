# Codebase-Aware Analysis Review Rounds

**Date**: 2026-05-21
**Scope**: `docs/features/codebase-aware-analysis/README.md` v3.4 -> v3.5
**Method**: read the plan against current SmartPerfetto code, product-surface rules, backend/frontend/prompt/skill/testing/git/release rules, Claude/OpenAI runtime paths, CLI/report/export paths, and local Heavy/Light assets.

## Round 1 — Data Contracts And Existing RAG Reality

Code read:
- `backend/src/types/sparkContracts.ts`
- `backend/src/services/ragStore.ts`
- `backend/src/services/blogKnowledgeIngester.ts`
- `backend/src/services/aospKnowledgeIngester.ts`
- `backend/src/services/oemSdkKnowledgeIngester.ts`

Findings:
- `RagChunk.snippet` and the 6-kind `RagSourceKind` baseline in the plan match the current contract.
- `RagStore` is still schemaVersion 1 JSON with `ALL_RAG_SOURCE_KINDS` hardcoded to 6 kinds. The v3.4 plan correctly requires M0 schema/backfill tests before adding code-aware chunks.
- v3.4 referenced the wrong `AnalysisOptions` file. Current source defines it in `backend/src/agent/core/orchestratorTypes.ts`, not `backend/src/agentRuntime/types.ts`.
- v3.4 referenced the wrong frontend type generator path. Current script is `backend/scripts/generateFrontendTypes.ts`.

Applied in v3.5:
- Corrected implementation paths in §5.4 and file change table.
- Kept M0 as contract-first before implementation.

Verdict: ready after path corrections.

## Round 2 — RBAC, Privacy, And Legacy Endpoint Backdoors

Code read:
- `backend/src/routes/ragAdminRoutes.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/services/rbac.ts`
- `backend/src/services/__tests__/rbac.test.ts`

Findings:
- v3.4 protected new `/api/rag/codebases*` endpoints but missed existing `/api/rag/stats`, `/api/rag/chunks/:chunkId`, `DELETE /api/rag/chunks/:chunkId`, and `/api/rag/search`.
- Current `/chunks/:chunkId` returns the raw `chunk`, including `snippet`. Current `/search` returns raw `RagStore.search()` results, including chunks with snippets. Once app/kernel source chunks enter RagStore, these are direct bypasses around `CodeRef`, excerpt RBAC, and projection filters.
- Existing RBAC already has role/scope plumbing and `*` dev-mode semantics; codebase scopes should extend that system instead of adding a parallel permission model.

Applied in v3.5:
- Added existing `/api/rag/*` endpoint upgrade matrix to §9.2.
- Added M1.8a and tests for code-aware sanitization on legacy RAG admin routes.

Verdict: ready after requiring old endpoint hardening in M1.

## Round 3 — Runtime, SDK, And Tool Registration

Code read:
- `backend/src/agentv3/mcpToolRegistry.ts`
- `backend/src/agentv3/claudeMcpServer.ts`
- `backend/src/agentv3/standaloneMcpServer.ts`
- `backend/src/agentOpenAI/openAiRuntime.ts`
- `backend/src/agentOpenAI/openAiToolAdapter.ts`
- `.claude/rules/backend.md`

Findings:
- The v3.4 concern about request-scoped registry is valid. Current `McpToolRegistry.list()`, `buildAllowedTools()`, and `getAci()` are scope-free, and `standaloneMcpServer.ts` calls `registry.list()` directly.
- Current `McpToolExposure` is only `public | internal | deprecated`; v3.4's `public-readonly` and `requires_codebase_permission` require contract/test updates.
- OpenAI currently adapts Claude-shaped MCP handlers in `openAiToolAdapter.ts`, so the shared handler/filter plan is implementable. The sidecar correlation requirement remains necessary because `execute(args)` currently has no tool-call id context.

Applied in v3.5:
- No architecture change needed beyond v3.4, but the review confirms M0.11 and M1.6 are non-optional blockers.

Verdict: ready, with M0.11/M1.6 treated as hard gates.

## Round 4 — Product Surfaces, Reports, Exports, Frontend, CLI

Code/rules read:
- `.claude/rules/product-surface.md`
- `.claude/rules/frontend.md`
- `.claude/rules/prompts.md`
- `.claude/rules/skills.md`
- `backend/src/routes/reportRoutes.ts`
- `backend/src/routes/comparisonRoutes.ts`
- `backend/src/routes/exportRoutes.ts`
- `backend/src/cli-user/commands/report.ts`
- `backend/src/cli-user/services/cliAnalyzeService.ts`

Findings:
- v3.4's export canary row pointed at `reportExport.ts`, but current export surfaces are split across HTTP report export, comparison report export, generic export, and CLI report export.
- CLI `runTurn()` currently passes only provider/reference options to `orchestrator.analyze()`. `codeAwareMode` must be added to CLI input and forwarded explicitly.
- Plugin source changes require dev-mode verification plus `./scripts/update-frontend.sh`; backend generated types are under `backend/scripts/generateFrontendTypes.ts`.
- Prompt behavior must stay in strategy/template files, not TypeScript. `code-aware.template.md` is the right location for durable model rules.

Applied in v3.5:
- Corrected export paths and canary coverage.
- Added CLI/export surfaces to the file change table.

Verdict: ready after export surface correction.

## Round 5 — E2E Assets, Multi-Platform Rules, And Release Gates

Code/assets/rules read:
- `.claude/rules/testing.md`
- `.claude/rules/git.md`
- `.claude/rules/release.md`
- `backend/package.json`
- `test-traces/lacunh_heavy.pftrace`
- `test-traces/launch_light.pftrace`
- `/Users/chris/Code/HighPerformanceFriendsCircle`

Verified local assets:
- Heavy trace: `test-traces/lacunh_heavy.pftrace`, sha256 `2a0c7b85e7f4a14e43b7f8d6de21172e05eba1ed3ad8ef7df539bb5e59b6ba63`
- Light trace: `test-traces/launch_light.pftrace`, sha256 `6c5479fd1b765ee4d29692c43a8204b972bc0f97eb373aca98ea7e11e99fd8b4`
- App codebase: `/Users/chris/Code/HighPerformanceFriendsCircle`
- Relevant modules: `launch-aosp`, `launch-common`, `load-config`
- Package ids from Gradle flavors: `com.example.launch.aosp.light` and `com.example.launch.aosp.heavy`

Findings:
- The final acceptance cannot stop at fake-LLM or unit coverage. This feature must prove the HTTP Agent SSE path and CLI report/export path with the real local app source and real Heavy/Light traces.
- Because this feature affects MCP, session snapshots, report/export, CLI, Skills/Strategies, and frontend surfaces, final verification must include focused tests, scene regression, and a codified optional E2E script.
- Public release packaging is not part of Phase 1 implementation, but Node 24 and CLI package boundaries must not regress.

Applied in v3.5:
- Added Heavy/Light + HighPerformance E2E section to §15.
- Added M3.11 and acceptance requirements for codified E2E.

Verdict: ready for implementation. No P0/P1 plan blockers remain after v3.5 edits.

