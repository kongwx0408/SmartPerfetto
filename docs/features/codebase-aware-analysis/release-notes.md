# Codebase-Aware Analysis Release Notes

## 2026-05-21

Codebase-Aware Analysis adds a local-codebase layer for SmartPerfetto analysis:

- Codebase registry, path preview, RBAC-protected admin endpoints, audit endpoint, and sanitized legacy RAG reads.
- App, AOSP/native, and kernel source ingestion with codebase metadata, license/vendor/build-id handling, and registry-origin fail-closed behavior.
- R8, kallsyms/System.map, and breakpad symbol resolution paths.
- MCP tools: `lookup_app_source`, extended `lookup_aosp_source` / `lookup_oem_sdk`, `lookup_kernel_source`, `resolve_symbol`, and `propose_patch`.
- `PatchProposer` with prior lookup validation, single-codebase guard, target-file guard, `git apply --check`, and `verified` / `sketch` / `unverified` states.
- Code-aware strategy template, code-pinpoint Skill, and golden tests for model output discipline.
- CLI `smp codebase` commands, including `register --dry-run`, `reindex`, and `symbols`.
- Report and frontend rendering for `CodeRef` / patch status metadata without persisting source snippets or raw diffs.
- Codified Heavy/Light + HighPerformance E2E plus synthetic AOSP/kernel coverage.

Security defaults:

- `metadata_only` exposes only metadata to model providers.
- `provider_send` requires explicit per-codebase consent.
- Raw source excerpts are fetched only through RBAC-protected excerpt endpoints and remain out of persisted reports/exports.

Verification:

- Focused backend service, route, MCP, report, CLI, prompt, and safety tests passed.
- Perfetto UI typecheck, targeted frontend unit tests, dev-mode browser smoke, and prebuild regeneration passed.
- `verify:codebase-aware` covers focused code-aware unit checks plus source/dist E2E: no-codebase trace-only analysis, codebase-configured Heavy/Light analysis with source-level `CodeRef` assertions for `/Users/chris/Code/HighPerformanceFriendsCircle`, and synthetic AOSP/kernel codebases.
- Real-model HTTP Agent SSE code-aware release gate passed 5/5: one full Heavy trace plus four source-lookup smoke runs, each requiring actual `list_codebases` / `resolve_symbol` / `lookup_app_source` calls and source-level `CodeRef` output.
- The source/dist E2E asserts reports and exported outputs do not contain the absolute local codebase root path or raw source body text; the real-model gate asserts the same privacy boundary for SSE conclusion / analysis_completed text.
- Scene trace regression passed for all 6 traces.
- Root `npm run verify:pr` passed under Node 24.

Release-readiness fixes:

- `verifyAgentSseScrolling.ts --require-code-ref` now checks semantic source-level references instead of only the literal string `CodeRef`, and can require specific MCP tools.
- Code-aware MCP tool handlers normalize optional string parameters such as `"null"`, `"undefined"`, and `"none"` before registry/source lookup, matching real model tool-call behavior.

Source publishing:

- Perfetto UI submodule source changes for the Codebases panel and CodeRef rendering were committed as `a83c9a78d9`, pushed to the fork, wired through the root gitlink, regenerated into `frontend/v55.2-a83c9a78d`, and revalidated with `npm run verify:pr`.
