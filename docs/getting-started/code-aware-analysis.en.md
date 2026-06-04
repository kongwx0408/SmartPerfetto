# Code-Aware Analysis

[English](code-aware-analysis.en.md) | [中文](code-aware-analysis.md)

Code-Aware Analysis lets SmartPerfetto reference local source trees while analyzing a trace. It maps app frames, native frames, and kernel symbols to `CodeRef` metadata. By default, outputs include only `chunkId`, relative file path, line range, and symbol. Raw source excerpts are fetched only through the RBAC-protected excerpt endpoint and are not persisted into sessions, reports, or exports.

## Enable It

1. Start the backend with `./start.sh`.
2. Open AI Assistant settings in Perfetto UI and select `Codebases`.
3. Add a codebase and run preview first.
4. Register it and run reindex.
5. Use code-aware mode in analysis, or pass `--code-aware metadata_only|provider_send` and `--codebase-id <id>` in the CLI.

CLI example:

```bash
cd backend
npm run cli -- codebase register /path/to/app \
  --name MyApp \
  --kind app_source \
  --path-filter app/src/main/ \
  --dry-run

npm run cli -- codebase register /path/to/app \
  --name MyApp \
  --kind app_source \
  --path-filter app/src/main/

npm run cli -- codebase reindex cb_xxx
npm run cli -- codebase symbols MainActivity --codebase-id cb_xxx

npm run cli -- run --format json \
  --code-aware metadata_only \
  --codebase-id cb_xxx \
  ../test-traces/lacunh_heavy.pftrace \
  "Find the startup bottleneck and map it to source code"
```

If `--code-aware` or `--codebase-id` is omitted, analysis runs on the normal trace-only path; registered codebases are not automatically exposed to a session. `provider_send` sends snippets only when the codebase was registered with `--send-to-provider` and the current analysis also uses `--code-aware provider_send`.

## Supported Codebases

| kind | Use | Required metadata |
|---|---|---|
| `app_source` | App Java/Kotlin/R8 lookup | root path, optional build-id / commit / path-filter |
| `aosp` | AOSP framework/native hot paths | `licenseTag`, recommended build-id and commit |
| `kernel_source` | kernel binder/scheduler/mm/io causes | `vendor`, `path-filter` or `pathPrefix`, SPDX or license tag |
| `oem_sdk` | OEM / chipset SDK material | vendor and license, behind the same security gates |

## Security Boundary

- `metadata_only`: the model sees only `CodeRef` metadata, not source snippets.
- `provider_send`: snippets can be sent only for codebases registered with `sendToProvider` consent.
- Legacy RAG chunks keep their existing behavior; `app_source`, `kernel_source`, or `registryOrigin=codebase_registry` chunks without codebase metadata fail closed.
- Legacy `/api/rag/chunks/:id` and `/api/rag/search` return sanitized hash/length data for code-aware chunks, not source text.
- Patch proposals have three states: `verified`, `sketch`, and `unverified`. `sketch` and `unverified` never expose a copyable diff.

## Verification

Common checks:

```bash
cd backend
npm run verify:codebase-aware
```

The local full E2E uses:

- `test-traces/lacunh_heavy.pftrace`
- `test-traces/launch_light.pftrace`
- `/Users/chris/Code/HighPerformanceFriendsCircle`

The E2E covers both paths:

- No codebase configured for the session: Light trace completes normally and the report has no `CodeRef` / code-aware section.
- HighPerformanceFriendsCircle configured for the session: Heavy/Light traces complete normally and reports/exports contain `CodeRef` entries such as relative `MainActivity.kt` and `LoadSimulator.kt` file paths with line ranges; reports must not contain the absolute root path or raw source text.

Override paths when needed:

```bash
SMARTPERFETTO_E2E_HEAVY_TRACE=/path/heavy.pftrace \
SMARTPERFETTO_E2E_LIGHT_TRACE=/path/light.pftrace \
SMARTPERFETTO_E2E_APP_REPO=/path/HighPerformanceFriendsCircle \
npm --prefix backend run verify:codebase-aware
```
