# Runtime Engine Contract Verification Log

Status: active
Created: 2026-05-31
Last updated: 2026-06-01 21:09:18 CST

## Gate Summary

| Milestone | Focused unit tests | Integration tests | Scene trace regression | E2E tests | Typecheck/build | Post-diff self-check | Next phase allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bootstrap | n/a | n/a | n/a | n/a | n/a | pass | yes |
| M1 | pass | pass | pass | scene regression | pass | pass | yes |
| M2 | pass | pass | pass | scene regression | pass | pass | yes |
| M3 | pass | pass | pass | scene regression | pass | pass | yes |
| M4 | pass | pass | pass | pass | pass | pass | yes |
| M5 | pass | pass | pass | scene regression | pass | pass | yes |
| M6 | pass | pass | pass | scene regression | pass | pass | yes |
| Harness default/parity | pass | pass | pass | pass | pass | pass | yes for M7 planning |
| M7 | pass | pass | pass | root `verify:pr` | pass | pass | yes |
| M8 | n/a | n/a | n/a | spike smoke pass | n/a | pass | maintainer go required for M9 |
| M9 | pass | pass | pass | hidden smoke pass | pass | pass | maintainer go required for M10 |
| M10 | pass | pass | pass | public smoke + root `verify:pr` | pass | pass | complete |
| M11 | pass | pass | pass | Pi real startup/scrolling pass | pass | pass | yes for final matrix |
| M12 OpenCode spike | n/a | n/a | n/a | spike smoke pass | n/a | pass | yes for M13 hidden |
| M13 OpenCode hidden runtime | pass | pass | pass | hidden smoke pass | pass | pass | no for public M14 |
| Final three-agent E2E | pass | pass | pass | Claude/OpenAI/Pi startup+scrolling pass | pass | pass | yes for M14 planning |
| M14 OpenCode public fourth runtime | pass | pass | pass | Claude/OpenAI/Pi/OpenCode startup+scrolling pass | pass | pass | complete |

## Entries

### 2026-05-31 19:05:47 CST - Bootstrap

Commands:
- `git diff --check`
- `git diff --no-index --check /dev/null docs/features/runtime-engine-contract/README.md`
- `git diff --no-index --check /dev/null docs/features/runtime-engine-contract/review-rounds.md`
- `git diff --no-index --check /dev/null docs/features/runtime-engine-contract/implementation-todo.md`
- `git diff --no-index --check /dev/null docs/features/runtime-engine-contract/progress.md`
- `git diff --no-index --check /dev/null docs/features/runtime-engine-contract/decision-log.md`
- `git diff --no-index --check /dev/null docs/features/runtime-engine-contract/verification-log.md`

Results:
- `git diff --check` passed.
- No-index checks produced no whitespace errors. Exit code 1 is expected because
  each new file differs from `/dev/null`.

Post-diff self-check:
- Pass for bootstrap docs-only setup. No runtime, Provider Manager, prompt,
  tool, scene, output, SSE, CLI, report, snapshot, Pi dependency, or UI changes
  were made.

Allowed to enter next phase:
- Yes. Start M1 characterization / inventory tests.

### 2026-05-31 19:12:10 CST - M1

Commands:
- `cd backend && npx jest src/agentRuntime/__tests__/runtimeSelection.test.ts src/assistant/application/__tests__/agentAnalyzeSessionService.test.ts src/agentv3/__tests__/mcpToolRegistry.test.ts src/agentOpenAI/__tests__/openAiToolAdapter.test.ts src/agentv3/__tests__/standaloneMcpServer.test.ts src/assistant/stream/__tests__/streamProjector.contract.test.ts src/agentRuntime/__tests__/orchestratorContractInventory.test.ts src/agentRuntime/__tests__/streamingUpdateInventory.test.ts src/agentRuntime/__tests__/snapshotRuntimeStateInventory.test.ts`
- `cd backend && npx tsc --noEmit`
- `cd backend && node -v`
- `cd backend && npm run test:scene-trace-regression`
- `git diff --check`
- `git diff --no-index --check /dev/null <new-or-untracked-file>`

Results:
- Initial focused Jest failed due to over-strict new inventory tests.
- Focused Jest passed after test fixes: 9 suites, 75 tests.
- `npx tsc --noEmit` passed.
- Node version: v24.15.0.
- Scene trace regression passed all 6 canonical traces:
  - Heavy launch: pass.
  - Light launch: pass.
  - Standard scrolling: pass.
  - Customer scrolling: pass.
  - Flutter TextureView: pass.
  - Flutter SurfaceView: pass.
- `git diff --check` passed.
- No-index checks for new/untracked files produced no whitespace errors.

Post-diff self-check:
- Pass. M1 is characterization-only and does not modify production runtime,
  Provider Manager, routes, CLI, reports, snapshot code, generated files, Pi
  dependencies, public runtime values, packaging, or UI.

Allowed to enter next phase:
- Yes. M2 may begin.

### 2026-05-31 19:23:36 CST - M2

Commands:
- `cd backend && npx jest src/agentRuntime/__tests__/runtimeToolSpec.test.ts src/agentv3/__tests__/mcpToolRegistry.test.ts src/agentOpenAI/__tests__/openAiToolAdapter.test.ts src/agentv3/__tests__/standaloneMcpServer.test.ts`
- `cd backend && npx tsc --noEmit`
- `cd backend && npm run test:scene-trace-regression`
- `git diff --check`
- `git diff --no-index --check /dev/null <new-or-untracked-file>`
- `rg -n "pi-|pi_|pi-coding|Provider Manager UI|SMARTPERFETTO_AGENT_RUNTIME=.*pi|agentRuntime.*third|third-party" backend/src docs/features/runtime-engine-contract`
- `rg -n "prompt|scene list|Skill count|output contract|Provider Manager" backend/src/agentRuntime backend/src/agentv3/mcpToolRegistry.ts backend/src/agentOpenAI/openAiToolAdapter.ts backend/src/agentv3/standaloneMcpServer.ts`

Results:
- Initial M2 focused Jest attempt failed during helper extraction. Fixes:
  import MCP result/annotation types from the MCP SDK package, update mock
  handlers to accept the SDK extra argument, attach `inputSchema` /
  `annotations` to generated Claude SDK descriptors, and keep direct JSON
  Schema helper semantics aligned with current OpenAI adapter behavior.
- Focused Jest passed after fixes: 4 suites, 40 tests.
- `npx tsc --noEmit` passed.
- Scene trace regression passed all 6 canonical traces:
  - Heavy launch: pass.
  - Light launch: pass.
  - Standard scrolling: pass.
  - Customer scrolling: pass.
  - Flutter TextureView: pass.
  - Flutter SurfaceView: pass.
- `git diff --check` passed.
- No-index checks for new/untracked files produced no whitespace errors.
- Tool exposure parity:
  - Claude registry keeps registration order, allowed-tool prefixing, public /
    internal / deprecated filtering, and code-aware request gating.
  - OpenAI adapter now reads shared specs but keeps strict JSON Schema,
    argument normalization, result stringification, and error formatting.
  - Standalone MCP still lists/calls only public tools and refuses internal or
    code-aware tools.
  - A fake third-party adapter test consumes shared specs without a production
    runtime value.

Post-diff self-check:
- Pass. M2 keeps SDK-native invocation, does not alter Provider Manager/runtime
  pinning, does not hardcode prompts/tool lists/scene lists/output contracts,
  does not change public `IOrchestrator`, `StreamingUpdate`, report, CLI,
  snapshot, or SSE contracts, and does not introduce Pi dependency, public Pi
  env values, packaging exposure, or UI.
- Rollback remains scoped to removing `runtimeToolSpec.ts` and restoring the
  OpenAI/standalone adapters to the previous Claude SDK descriptor extraction
  path.

Allowed to enter next phase:
- Yes. M3 may begin.

### 2026-05-31 19:29:31 CST - M3

Commands:
- `cd backend && npx jest src/agentRuntime/__tests__/analysisRunSpec.test.ts src/agentRuntime/__tests__/runtimeSelection.test.ts src/agentv3/__tests__/queryComplexityClassifier.followup.test.ts`
- `cd backend && npx tsc --noEmit`
- `cd backend && npm run test:scene-trace-regression`
- `cd backend && npm run build`
- `git diff --check`
- `git diff --no-index --check /dev/null <new-or-untracked-file>`
- `rg -n "pi-|pi_|pi-coding|Provider Manager UI|SMARTPERFETTO_AGENT_RUNTIME=.*pi|agentRuntime.*third|third-party" backend/src docs/features/runtime-engine-contract`
- `rg -n "buildSystemPrompt|prompt|scene list|Skill count|output contract|Provider Manager" backend/src/agentRuntime/analysisRunSpec.ts backend/src/agentRuntime/index.ts backend/src/agentRuntime/__tests__/analysisRunSpec.test.ts`

Results:
- Focused Jest passed: 3 suites, 44 tests.
- `npx tsc --noEmit` passed.
- Scene trace regression passed all 6 canonical traces:
  - Heavy launch: pass.
  - Light launch: pass.
  - Standard scrolling: pass.
  - Customer scrolling: pass.
  - Flutter TextureView: pass.
  - Flutter SurfaceView: pass.
- `npm run build` passed.
- `git diff --check` passed.
- No-index checks for new/untracked files produced no whitespace errors.
- Classifier preservation:
  - Claude policy remains local-rules plus Claude light-model classifier.
  - OpenAI policy remains local-rules plus OpenAI light-model classifier.
  - The shadow spec records policy data only; it does not run or unify
    classifiers.

Post-diff self-check:
- Pass. M3 adds a shadow run-spec helper and tests only. It does not alter
  Provider Manager/runtime pinning, does not hardcode prompt/tool/scene/output
  contracts, does not change public `IOrchestrator`, `StreamingUpdate`, report,
  CLI, snapshot, or SSE contracts, and does not introduce Pi dependency,
  public Pi env values, packaging exposure, or UI.
- Rollback remains scoped to removing `analysisRunSpec.ts`, its tests, and the
  export from `agentRuntime/index.ts`.

Allowed to enter next phase:
- Yes. M4 may begin.

### 2026-05-31 19:36:18 CST - M4

Commands:
- `cd backend && npx jest src/agentRuntime/__tests__/runtimeSelection.test.ts src/agentRuntime/__tests__/analysisRunSpec.test.ts src/assistant/application/__tests__/agentAnalyzeSessionService.test.ts src/agentOpenAI/__tests__/openAiConfig.test.ts src/agentOpenAI/__tests__/openAiRuntime.test.ts src/agentOpenAI/__tests__/openAiToolAdapter.test.ts src/services/providerManager/__tests__/providerService.test.ts src/services/providerManager/__tests__/providerRoutes.test.ts`
- `cd backend && npm run typecheck`
- `cd backend && npm run build`
- `cd backend && npm run test:scene-trace-regression`
- `cd backend && npm run verify:e2e:openai-startup`
- `git diff --check`
- `rg -n "pi-|pi_|pi-coding|Provider Manager UI|SMARTPERFETTO_AGENT_RUNTIME=.*pi|agentRuntime.*third|third-party" backend/src docs/features/runtime-engine-contract`
- `rg -n "buildSystemPrompt|prompt|scene list|Skill count|output contract|Provider Manager|SessionStateSnapshot|analysis_completed|answer_token|conclusion" backend/src/agentRuntime/analysisRunSpec.ts backend/src/agentRuntime/runtimeSelection.ts backend/src/agentv3/claudeRuntime.ts backend/src/agentv3/index.ts backend/src/agentOpenAI/openAiRuntime.ts backend/src/agentRuntime/__tests__/runtimeSelection.test.ts`

Results:
- Focused Jest passed: 8 suites, 126 tests.
- `npm run typecheck` passed.
- `npm run build` passed.
- Scene trace regression passed all 6 canonical traces:
  - Heavy launch: pass.
  - Light launch: pass.
  - Standard scrolling: pass.
  - Customer scrolling: pass.
  - Flutter TextureView: pass.
  - Flutter SurfaceView: pass.
- `git diff --check` passed.
- OpenAI startup E2E failed after reaching the OpenAI-compatible runtime/model:
  `AI analysis failed: 429 Insufficient balance or no resource package. Please
  recharge.`
- E2E evidence:
  - `backend/test-output/e2e-openai-startup-real.json`
  - `backend/logs/sessions/session_agent-1780227249017-33z7sc93_2026-05-31T11-34-09-018Z.jsonl`
- The failed report shows `hasNoSseErrors: false`, no agent responses, no data
  envelopes, no claim-verifier result, and missing required startup text because
  the provider rejected the model call.
- No existing project script was found that provides a mock/offline replacement
  for `verify:e2e:openai-startup`.

Post-diff self-check:
- Pass for architecture and local contracts. M4 consumes shared preparation
  inside existing Claude/OpenAI runtimes and keeps native SDK loops.
- Provider Manager/runtime provider pinning is preserved by passing the resolved
  runtime selection snapshot into the runtime instance.
- No prompt/tool list/scene list/Skill count/output contract was hardcoded.
- Public `IOrchestrator`, `StreamingUpdate`, report, CLI, snapshot, and SSE
  contracts were not changed.
- No Pi dependency, public Pi env value, packaging exposure, or Provider
  Manager UI change was introduced.
- Rollback remains scoped to reverting M4 adoption sites in
  `runtimeSelection.ts`, `agentv3/index.ts`, `claudeRuntime.ts`, and
  `openAiRuntime.ts`.

Allowed to enter next phase:
- No. M4 is blocked until OpenAI startup E2E is rerun with a working provider,
  an explicit maintainer waiver/alternate E2E gate is recorded, or the M4 code
  is reverted/guarded.

### 2026-05-31 19:38:54 CST - M4 OpenAI startup E2E retry

Commands:
- `cd backend && npm run verify:e2e:openai-startup`

Results:
- Failed again with the same external provider quota error:
  `AI analysis failed: 429 Insufficient balance or no resource package. Please
  recharge.`
- The retry reached trace loading, architecture detection, skill loading,
  system prompt construction, and OpenAI-compatible model invocation for
  `glm-5.1`.
- The output report was rewritten at
  `backend/test-output/e2e-openai-startup-real.json`.
- The new session log is
  `backend/logs/sessions/session_agent-1780227512422-7tqihngf_2026-05-31T11-38-32-422Z.jsonl`.
- The report still shows `hasNoSseErrors: false`, no agent responses, no data
  envelopes, no claim-verifier result, no final-report heading, and missing
  required startup evidence text because the model request was rejected.

Allowed to enter next phase:
- No. M4 remains blocked on the required OpenAI startup E2E gate.

### 2026-05-31 19:40:22 CST - M4 OpenAI startup E2E third attempt

Commands:
- `cd backend && npm run verify:e2e:openai-startup`

Results:
- Failed again with the same external provider quota error:
  `AI analysis failed: 429 Insufficient balance or no resource package. Please
  recharge.`
- The attempt reached trace loading, architecture detection, skill loading,
  system prompt construction, and OpenAI-compatible model invocation for
  `glm-5.1`.
- The output report was rewritten at
  `backend/test-output/e2e-openai-startup-real.json`.
- The new session log is
  `backend/logs/sessions/session_agent-1780227611192-rcnw9ppq_2026-05-31T11-40-11-192Z.jsonl`.
- The report still shows `hasNoSseErrors: false`, no agent responses, no data
  envelopes, no claim-verifier result, no final-report heading, and missing
  required startup evidence text because the model request was rejected.

Allowed to enter next phase:
- No. This is the third consecutive goal turn with the same M4 external E2E
  blocker.

### 2026-05-31 19:53:08 CST - M4 OpenAI startup E2E gate cleared

Commands:
- `cd backend && npm run verify:e2e:openai-startup`

Results:
- Passed after the OpenAI-compatible provider was recharged.
- Output report:
  `backend/test-output/e2e-openai-startup-real.json`.
- Session log:
  `backend/logs/sessions/session_agent-1780227841062-d0jqh9ms_2026-05-31T11-44-01-062Z.jsonl`.
- Report URL:
  `/api/reports/agent-report-agent-1780227841062-d0jqh9ms-1780228369773-siw8m3`.
- Required E2E checks passed:
  `hasNoSseErrors`, `hasDataEnvelopes`, `hasPlanSubmitted`,
  `hasArchitectureDetected`, `fullModeHonored`,
  `hasAnalysisCompletedConclusionEvidence`, `claimVerifierPassed`,
  `claimVerifierHasNoUnsupportedClaims`, `analysisCompletedNotPartial`,
  `analysisCompletedHasFinalReportHeading`,
  `analysisCompletedHasNoProcessNarration`, required text `冷启动` and
  `ChaosTask`, and all configured forbidden text checks.
- Summary: 270 total events, 38 data-envelope items, 12 checked claims, 0
  unsupported claims, 4116 final-report chars.

Post-diff self-check:
- Pass. M4 remains within Draft v2: shared preparation is adopted
  conservatively inside Claude/OpenAI runtimes, native SDK loops remain native,
  Provider Manager/runtime provider pinning is preserved, public runtime values
  remain unchanged, public route/SSE/CLI/report/snapshot contracts remain
  unchanged, no output contract or prompt/tool/scene list was hardcoded, and no
  Pi dependency/UI/public runtime option was introduced.

Allowed to enter next phase:
- Yes. M5 may begin.

### 2026-05-31 19:58:53 CST - M5

Commands:
- `cd backend && npx jest src/agentRuntime/__tests__/runtimeSelection.test.ts src/agentRuntime/__tests__/runtimeRegistry.test.ts src/agentRuntime/__tests__/fakeThirdPartyRuntime.test.ts src/services/providerManager/__tests__/providerService.test.ts`
- `cd backend && npx jest src/agentRuntime/__tests__/analysisRunSpec.test.ts`
- `cd backend && npx tsc --noEmit`
- `cd backend && npm run build`
- `cd backend && npm run test:scene-trace-regression`
- `git diff --check`
- `git diff --no-index --check /dev/null <new-or-untracked-file>`
- `rg -n "pi-|pi_|pi-coding|Provider Manager UI|SMARTPERFETTO_AGENT_RUNTIME=.*pi|agentRuntime.*third|third-party" backend/src docs/features/runtime-engine-contract`
- `rg -n "buildSystemPrompt|prompt|scene list|Skill count|output contract|Provider Manager|AgentRuntimeKind|SessionStateSnapshot|analysis_completed|answer_token|conclusion" backend/src/agentRuntime/runtimeCapabilities.ts backend/src/agentRuntime/runtimeRegistry.ts backend/src/agentRuntime/runtimeSelection.ts backend/src/agentRuntime/analysisRunSpec.ts backend/src/agentRuntime/__tests__/runtimeRegistry.test.ts backend/src/agentRuntime/__tests__/fakeThirdPartyRuntime.test.ts backend/src/agentRuntime/__tests__/runtimeSelection.test.ts`

Results:
- Focused M5 Jest passed: 4 suites, 45 tests.
- Additional `AnalysisRunSpec` Jest passed: 1 suite, 3 tests.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- Scene trace regression passed all 6 canonical traces:
  - Heavy launch: pass.
  - Light launch: pass.
  - Standard scrolling: pass.
  - Customer scrolling: pass.
  - Flutter TextureView: pass.
  - Flutter SurfaceView: pass.
- `git diff --check` passed.
- No-index checks for new/untracked M5 files produced no whitespace errors.
- Fake third-party verification:
  - Public `AgentRuntimeKind` remains exactly Claude/OpenAI.
  - `SMARTPERFETTO_AGENT_RUNTIME=fake-third-party-runtime` is rejected.
  - Fake runtime is registered only in a test-local registry.
  - `AnalysisRunSpec` can consume fake `EngineCapabilities` without
    Claude/OpenAI policy branches.

Post-diff self-check:
- Pass. M5 adds internal runtime registry/capabilities only; native SDK loops,
  Provider Manager pinning, public runtime values, `IOrchestrator`,
  `StreamingUpdate`, report, CLI, snapshot, and SSE contracts remain unchanged.
  No prompt/tool list/scene list/Skill count/output contract was hardcoded, and
  no Pi dependency, public Pi env value, packaging exposure, or Provider
  Manager UI change was introduced.

Allowed to enter next phase:
- Yes. M6 may begin.

### 2026-05-31 20:02:43 CST - M6

Commands:
- `cd backend && npx jest src/agentRuntime/__tests__/analysisHarness.test.ts src/agentRuntime/__tests__/orchestratorContractInventory.test.ts src/agentRuntime/__tests__/runtimeSelection.test.ts src/agentRuntime/__tests__/analysisRunSpec.test.ts src/agentRuntime/__tests__/runtimeRegistry.test.ts`
- `cd backend && npx jest src/agentRuntime/__tests__/runtimeSelection.test.ts src/agentRuntime/__tests__/analysisRunSpec.test.ts src/agentRuntime/__tests__/runtimeRegistry.test.ts src/agentRuntime/__tests__/analysisHarness.test.ts src/assistant/application/__tests__/agentAnalyzeSessionService.test.ts src/agentOpenAI/__tests__/openAiRuntime.test.ts src/services/__tests__/agentResultNormalizer.test.ts src/services/__tests__/finalResultQualityGate.test.ts src/services/verifier/__tests__/claimVerificationRunner.test.ts src/services/__tests__/analysisResultSnapshotStore.test.ts src/cli-user/services/__tests__/cliAnalyzeService.runTurn.test.ts src/cli-user/services/__tests__/cliAnalyzeService.test.ts`
- `cd backend && npx tsc --noEmit`
- `cd backend && npm run build`
- `cd backend && npm run test:scene-trace-regression`
- `git diff --check`
- `git diff --no-index --check /dev/null <new-or-untracked-file>`
- `rg -n "AnalysisHarness|createAnalysisHarness|analysis-harness" backend/src docs/features/runtime-engine-contract`
- `rg -n "pi-|pi_|pi-coding|Provider Manager UI|SMARTPERFETTO_AGENT_RUNTIME=.*pi|agentRuntime.*third|third-party" backend/src docs/features/runtime-engine-contract`
- `rg -n "buildSystemPrompt|prompt|scene list|Skill count|output contract|Provider Manager|SessionStateSnapshot|analysis_completed|answer_token|conclusion|getFocusStore|recordUserInteraction|getSdkSessionId|restoreFromSnapshot|takeSnapshot" backend/src/agentRuntime/analysisHarness.ts backend/src/agentRuntime/__tests__/analysisHarness.test.ts backend/src/agentRuntime/runtimeRegistry.ts backend/src/agentRuntime/runtimeSelection.ts`

Results:
- Harness-focused Jest passed: 5 suites, 27 tests.
- M6 wider focused Jest passed: 12 suites, 179 tests.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- Scene trace regression passed all 6 canonical traces:
  - Heavy launch: pass.
  - Light launch: pass.
  - Standard scrolling: pass.
  - Customer scrolling: pass.
  - Flutter TextureView: pass.
  - Flutter SurfaceView: pass.
- `git diff --check` passed.
- No-index checks for new/untracked M6 files produced no whitespace errors.
- Root `npm run verify:pr` was not required because no harness default-path
  switch was made.

Post-diff self-check:
- Pass. The harness remains hidden/test-only and is not registered in the
  production runtime registry. It forwards required methods, bridges `update`
  events, keeps optional-hook presence aligned with the wrapped engine, and
  does not synthesize route-owned `analysis_completed`. Provider Manager
  pinning, public runtime values, report/CLI/snapshot/SSE contracts, native SDK
  loops, and Pi/UI/public runtime surfaces remain unchanged.

Allowed to enter next phase:
- Yes. M7 may begin only after confirming the harness stability decision from
  the driver files.

### 2026-05-31 20:04:04 CST - M7 go/no-go

Commands:
- `sed -n '850,930p' docs/features/runtime-engine-contract/README.md`
- `sed -n '430,540p' docs/features/runtime-engine-contract/implementation-todo.md`

Results:
- M7 was not started.
- `README.md` says snapshot state split should happen only if the harness has
  become the default path.
- M6 deliberately kept the harness hidden/test-only and did not switch
  `createAgentOrchestrator`, routes, CLI, reports, or snapshots to the harness.

Post-diff self-check:
- Pass for no-go decision. No snapshot, persistence, route, CLI, report, SSE,
  Provider Manager, public runtime, Pi, or UI code was changed for M7.

Allowed to enter next phase:
- No. M7 is blocked on maintainer decision about the harness default/stability
  prerequisite.

### 2026-05-31 20:52:34 CST - Harness default/parity prerequisite

Commands:
- `cd backend && npx jest src/agentRuntime/__tests__/runtimeSelection.test.ts`
- `cd backend && npx jest src/agentRuntime/__tests__/runtimeSelection.test.ts src/agentRuntime/__tests__/analysisHarness.test.ts src/agentRuntime/__tests__/orchestratorContractInventory.test.ts src/agentRuntime/__tests__/analysisRunSpec.test.ts src/agentRuntime/__tests__/runtimeRegistry.test.ts src/assistant/application/__tests__/agentAnalyzeSessionService.test.ts src/agentOpenAI/__tests__/openAiRuntime.test.ts src/services/__tests__/agentResultNormalizer.test.ts src/services/__tests__/finalResultQualityGate.test.ts src/services/verifier/__tests__/claimVerificationRunner.test.ts src/services/__tests__/analysisResultSnapshotStore.test.ts src/cli-user/services/__tests__/cliAnalyzeService.runTurn.test.ts src/cli-user/services/__tests__/cliAnalyzeService.test.ts`
- `cd backend && npx tsc --noEmit`
- `cd backend && npm run build`
- `cd backend && npm run test:scene-trace-regression`
- `cd backend && npm run verify:e2e:openai-startup`
- `git diff --check`
- `rg -n "@modelcontextprotocol/sdk" backend/src docs/features/runtime-engine-contract`
- `cd backend && npx jest src/agentRuntime/__tests__/runtimeToolSpec.test.ts src/agentv3/__tests__/mcpToolRegistry.test.ts src/agentOpenAI/__tests__/openAiToolAdapter.test.ts src/agentv3/__tests__/standaloneMcpServer.test.ts src/agentRuntime/__tests__/runtimeSelection.test.ts src/agentRuntime/__tests__/analysisHarness.test.ts`
- `cd backend && npx jest src/agentv3/__tests__/claudeRuntimeRuntimeSnapshots.test.ts src/agentv3/__tests__/claudeMcpServer.test.ts src/agentRuntime/__tests__/runtimeToolSpec.test.ts src/agentv3/__tests__/mcpToolRegistry.test.ts`
- `cd backend && npm run test:core`
- `npm run verify:pr`

Results:
- Runtime selection focused Jest passed: 1 suite, 14 tests.
- Wider harness/default focused Jest passed: 13 suites, 184 tests.
- Tool/runtime/harness focused Jest passed after the transitive MCP type import
  was removed: 6 suites, 59 tests.
- Claude runtime/mock focused Jest passed after aligning the SDK mock with the
  real `tool(...)` descriptor shape: 4 suites, 130 tests.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- OpenAI startup E2E passed with the default harness wrapping the OpenAI path.
  Required checks included no SSE errors, data envelopes, submitted plan,
  architecture detection, full mode honored, analysis-completed conclusion
  evidence, claim verifier pass with 0 unsupported claims, non-partial final
  analysis, final-report heading, required startup text `冷启动` and
  `ChaosTask`, and no forbidden fallback/process text.
- `npm run test:core` passed: 62 suites, 703 tests.
- Final root `npm run verify:pr` passed:
  - quality passed (`lint`, `format:check`, `deadcode`, `shellcheck`);
  - frontend prebuild check passed;
  - Rust fmt/check/test passed, 5 tests;
  - backend skill validation passed, 202 files, 0 failures;
  - backend strategy validation passed, 20 strategy files, 0 missing skills;
  - backend typecheck/build/CLI pack passed;
  - backend `test:core` passed, 62 suites, 703 tests;
  - backend scene trace regression passed all 6 canonical traces.
- One intermediate root run failed on
  `enterpriseTraceMetadataRoutes.test.ts` expecting 410 but receiving 404; the
  test passed standalone, with neighboring suites, with broader route/provider
  subsets, and in the subsequent full `test:core` and final root `verify:pr`.
  No code change was made for that one-off failure.

Post-diff self-check:
- Pass. The default route-facing runtime path now wraps the selected
  Claude/OpenAI engine with `AnalysisHarness`, but native SDK loops and native
  tool execution remain engine-owned.
- Provider Manager/runtime provider pinning is preserved because runtime
  selection still resolves before registry creation and harness wrapping.
- Public `AgentRuntimeKind` and accepted `SMARTPERFETTO_AGENT_RUNTIME` values
  remain Claude/OpenAI only.
- Public `StreamingUpdate`, route-owned `analysis_completed`, report, CLI,
  snapshot, and SSE contracts were not changed.
- No prompt/tool list/scene list/Skill count/output contract was hardcoded.
- No Pi production dependency, public Pi env value, packaging exposure, or
  Provider Manager UI change was introduced.
- Rollback path is explicit: `SMARTPERFETTO_ANALYSIS_HARNESS=0` restores the
  direct engine path.

Allowed to enter next phase:
- Yes for M7 planning. Snapshot split is not yet started and still requires
  its own focused tests, snapshot/report/CLI/SSE coverage, scene regression,
  root `npm run verify:pr`, and post-diff self-check.

### 2026-05-31 21:07:08 CST - M7

Commands:
- `cd backend && npx jest src/agentRuntime/__tests__/snapshotRuntimeStateInventory.test.ts src/agentv3/__tests__/claudeRuntimeRuntimeSnapshots.test.ts src/agentOpenAI/__tests__/openAiRuntime.test.ts src/assistant/application/__tests__/agentAnalyzeSessionService.test.ts src/cli-user/services/__tests__/cliAnalyzeService.runTurn.test.ts src/cli-user/services/__tests__/cliAnalyzeService.test.ts src/services/__tests__/persistAgentSession.test.ts src/services/__tests__/analysisResultSnapshotStore.test.ts`
- `cd backend && npx jest src/routes/__tests__/agentRoutesRbac.test.ts --runInBand --forceExit`
- `cd backend && npx tsc --noEmit`
- `cd backend && npm run build`
- `cd backend && npm run test:scene-trace-regression`
- `npm run verify:pr`
- `git diff --check`
- `git diff --no-index --check /dev/null <new-or-untracked-file>`
- `rg -n "pi-|pi_|pi-coding|Provider Manager UI|SMARTPERFETTO_AGENT_RUNTIME=.*pi|agentRuntime.*third|third-party" backend/src docs/features/runtime-engine-contract`
- `rg -n "buildSystemPrompt|prompt|scene list|Skill count|output contract|Provider Manager|analysis_completed|answer_token|conclusion" <M7 files>`
- `rg -n "AgentRuntimeKind|SMARTPERFETTO_AGENT_RUNTIME|engineState|openAIHistory|openAILastResponseId|openAIRunState|sdkSessionId|sdkSessionMode|agentRuntimeProvider" <M7 files>`
- `ps -axo pid,ppid,stat,command | rg "jest|node.*jest|trace_processor_shell"`

Results:
- Focused non-route Jest passed: 8 suites, 97 tests.
- Route/resume/SSE Jest passed: 1 suite, 10 tests. It was run with
  `--forceExit` because an earlier combined route run passed assertions but
  hung on open handles; `npm run test:core` already uses this force-exit
  pattern for the same test family.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- Scene trace regression passed all 6 canonical traces:
  - Heavy launch: pass.
  - Light launch: pass.
  - Standard scrolling: pass.
  - Customer scrolling: pass.
  - Flutter TextureView: pass.
  - Flutter SurfaceView: pass.
- Root `npm run verify:pr` passed:
  - root quality passed (`lint`, `format:check`, `deadcode`, `shellcheck`);
  - frontend prebuild check passed;
  - Rust fmt/check/test passed, 5 tests;
  - backend skill validation passed, 202 files, 0 failures;
  - backend strategy validation passed, 20 strategy files, 0 missing skills;
  - backend typecheck/build/CLI pack passed;
  - backend `test:core` passed, 62 suites, 704 tests;
  - backend scene trace regression passed all 6 canonical traces.
- `git diff --check` passed.
- No-index whitespace checks for new/untracked files produced no whitespace
  errors.
- No lingering Jest or trace processor process remained after verification.

Snapshot/report/CLI/SSE coverage:
- Canonical `engineState` and legacy v1 mirror normalization are covered by
  `snapshotRuntimeStateInventory.test.ts`.
- Claude snapshot write/restore from canonical engine state is covered by
  `claudeRuntimeRuntimeSnapshots.test.ts`.
- OpenAI snapshot write/restore from canonical engine state is covered by
  `openAiRuntime.test.ts`.
- HTTP analyze restore/provider hash mismatch behavior is covered by
  `agentAnalyzeSessionService.test.ts`.
- CLI artifact runtime metadata from canonical engine state is covered by
  `cliAnalyzeService.runTurn.test.ts`.
- Report/snapshot store persistence is covered by
  `analysisResultSnapshotStore.test.ts` and `persistAgentSession.test.ts`.
- Resume/SSE route behavior is covered by `agentRoutesRbac.test.ts` plus root
  `verify:pr`.

Post-diff self-check:
- Pass. M7 adds a canonical `engineState` boundary while keeping legacy mirrors
  writable/readable for rollback and old-session compatibility.
- Provider Manager/runtime provider pinning is preserved: helper reads prefer
  `engineState.provider` and fall back to legacy provider id/snapshot hash
  fields.
- Product/report state remains outside engine-local state.
- Public `AgentRuntimeKind`, accepted `SMARTPERFETTO_AGENT_RUNTIME` values,
  `IOrchestrator`, `StreamingUpdate`, route-owned `analysis_completed`,
  report, CLI, and SSE contracts remain unchanged.
- No prompt/tool list/scene list/Skill count/output contract was hardcoded.
- No Pi production dependency, public Pi env value, packaging exposure, or
  Provider Manager UI change was introduced.
- Rollback remains scoped: disable/remove `engineState` writes and keep using
  the legacy mirrors that are still emitted in M7 snapshots.

Allowed to enter next phase:
- Yes. M8 may begin as an evidence-only Pi/third-party API spike.

### 2026-05-31 21:17:11 CST - M8

Commands:
- `npm view pi-ai name version description homepage repository license dependencies peerDependencies bin exports main types dist.tarball dist.integrity --json`
- `npm view pi-agent-core name version description homepage repository license dependencies peerDependencies bin exports main types dist.tarball dist.integrity --json`
- `npm view @earendil-works/pi-ai name version description homepage repository license dependencies peerDependencies optionalDependencies bin exports main module types files engines dist.tarball dist.integrity --json`
- `npm view @earendil-works/pi-agent-core name version description homepage repository license dependencies peerDependencies optionalDependencies bin exports main module types files engines dist.tarball dist.integrity --json`
- `npm view @earendil-works/pi-coding-agent name version description homepage repository license dependencies peerDependencies optionalDependencies bin exports main module types files engines dist.tarball dist.integrity --json`
- `npm search pi-agent --json`
- `npm search pi ai agent core --json`
- `npm pack pi-ai@0.0.1 --pack-destination /tmp/smartperfetto-pi-spike/pi-ai`
- `npm pack pi-agent-core@0.0.1 --pack-destination /tmp/smartperfetto-pi-spike/pi-agent-core`
- `npm pack @earendil-works/pi-ai@0.78.0 --pack-destination /tmp/smartperfetto-pi-spike/earendil-ai`
- `npm pack @earendil-works/pi-agent-core@0.78.0 --pack-destination /tmp/smartperfetto-pi-spike/earendil-agent`
- `npm pack @earendil-works/pi-coding-agent@0.78.0 --pack-destination /tmp/smartperfetto-pi-spike/earendil-coding`
- `npm install --prefix /tmp/smartperfetto-pi-smoke --ignore-scripts --no-audit --no-fund @earendil-works/pi-agent-core@0.78.0 @earendil-works/pi-ai@0.78.0 typebox@1.1.38`
- `PI_OFFLINE=1 HOME=/tmp/smartperfetto-pi-smoke/home node --input-type=module -e '<agent-core import smoke>'`
- `git diff --check`
- `git diff --no-index --check /dev/null <runtime-engine-contract-doc-file>`
- `rg -n "pi-|pi_|pi-coding|Provider Manager UI|SMARTPERFETTO_AGENT_RUNTIME=.*pi|agentRuntime.*third|third-party|@earendil-works" backend/src docs/features/runtime-engine-contract`

Results:
- M8 was docs/spike-only; no production runtime tests were required because no
  production code changed.
- Unscoped `pi-ai@0.0.1` and `pi-agent-core@0.0.1` are placeholders and no-go.
- `@earendil-works/pi-agent-core@0.78.0` exposes a plausible thin native agent
  loop with `Agent`, `agentLoop`, TypeBox-backed tools, lifecycle/tool
  execution events, abort support, and in-memory/session storage primitives.
- `@earendil-works/pi-coding-agent@0.78.0` exposes controls for disabling
  built-in tools and discovery, but remains too broad for a first production
  adapter because it includes a full coding-agent harness, file/shell tools,
  resource discovery, packages, extensions, prompts, sessions, and TUI/CLI
  concerns.
- Safe import smoke for `@earendil-works/pi-agent-core` passed outside the
  repo with isolated `HOME` and no SmartPerfetto manifest changes.
- `git diff --check` passed.
- No-index whitespace checks for runtime-engine-contract docs produced no
  whitespace errors.
- Pi/public-third-party scan found only expected docs/test references plus
  existing unrelated API-key/third-party-provider text; no production Pi
  runtime value, Provider Manager UI change, package manifest change, or
  production Pi import was introduced.

Post-diff self-check:
- Pass. M8 changed only feature documentation and evidence logs.
- Provider Manager/runtime provider pinning was not touched.
- Public `AgentRuntimeKind` and accepted `SMARTPERFETTO_AGENT_RUNTIME` values
  remain Claude/OpenAI only.
- Public `IOrchestrator`, `StreamingUpdate`, route-owned
  `analysis_completed`, report, CLI, snapshot, and SSE contracts remain
  unchanged.
- No prompt/tool list/scene list/Skill count/output contract was hardcoded.
- No Pi production dependency, runtime import, public Pi env value, packaging
  exposure, or Provider Manager UI change was introduced.
- Rollback is removing the M8 evidence doc/log entries; no production rollback
  is needed.

Allowed to enter next phase:
- Not automatically. M9 requires an explicit maintainer go decision before any
  hidden third-party runtime code is written.

### 2026-05-31 22:48:21 CST - M9

Commands:
- `cd backend && npx jest src/agentRuntime/__tests__/runtimeSelection.test.ts src/agentRuntime/__tests__/runtimeRegistry.test.ts src/agentRuntime/__tests__/fakeThirdPartyRuntime.test.ts src/agentRuntime/__tests__/runtimeToolSpec.test.ts src/agentRuntime/__tests__/piAgentCoreRuntime.test.ts src/cli-user/services/__tests__/runtimeGuard.test.ts --runInBand`
- `cd backend && HOME=/tmp/smartperfetto-pi-smoke/home PI_OFFLINE=1 SMARTPERFETTO_PI_AGENT_CORE_FAKE_STREAM=1 SMARTPERFETTO_PI_AGENT_CORE_MODULE_PATH=/tmp/smartperfetto-pi-smoke/node_modules/@earendil-works/pi-agent-core/dist/index.js npx tsx -e '<PiAgentCoreRuntime smoke>'`
- `cd backend && npx tsc --noEmit`
- `cd backend && npm run test:scene-trace-regression`
- `npm run verify:pr`
- `git diff --check`
- `git diff --no-index --check /dev/null <untracked-file>` loop
- `rg -n "@earendil-works|pi-agent-core|experimental-pi-agent-core|SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME|SMARTPERFETTO_AGENT_RUNTIME=.*pi|Provider Manager UI" package.json backend/package.json backend/src docs/features/runtime-engine-contract`
- `rg -n "buildSystemPrompt|scene list|Skill count|analysis_completed|SMARTPERFETTO_AGENT_RUNTIME=.*pi|Provider Manager UI|@earendil-works|pi-coding-agent|shell|file tool|file tools" <M9 files>`
- `ps -axo pid,ppid,stat,command | rg "jest|node.*jest|trace_processor_shell|scene_trace_regression" || true`

Results:
- M9 focused Jest passed after local fixes: 6 suites, 44 tests.
- Hidden real-package smoke passed using the M8 temp install and an isolated
  `HOME`: `success=true`, `partial=true`,
  `terminationReason=plan_incomplete`.
- `npx tsc --noEmit` passed.
- Standalone scene trace regression passed all 6 canonical traces:
  - Heavy launch: pass.
  - Light launch: pass.
  - Standard scrolling: pass.
  - Customer scrolling: pass.
  - Flutter TextureView: pass.
  - Flutter SurfaceView: pass.
- Root `npm run verify:pr` passed:
  - quality passed (`lint`, `format:check`, `deadcode`, `shellcheck`);
  - frontend prebuild check passed;
  - Rust fmt/check/test passed, 5 tests;
  - backend skill validation passed, 202 files, 0 failures;
  - backend strategy validation passed, 20 strategy files, 0 missing skills;
  - backend typecheck/build/CLI package check passed;
  - backend `test:core` passed, 62 suites, 709 tests;
  - backend trace processor ensure passed;
  - backend scene trace regression passed all 6 canonical traces.
- `git diff --check` passed.
- No-index whitespace checks for untracked files passed.
- Package scan found no root/backend manifest dependency on
  `@earendil-works/*`. Expected references are limited to docs, tests, hidden
  runtime diagnostics, and dynamic import in the hidden adapter.
- No lingering Jest or trace processor process remained after verification.

Post-diff self-check:
- Pass. M9 keeps the runtime Pi-ready but not Pi-driven: the third-party path
  is hidden, opt-in, dynamically loaded, and not exposed through Provider
  Manager or public `SMARTPERFETTO_AGENT_RUNTIME`.
- Provider Manager/runtime pinning is preserved. Active provider and snapshot
  selections still win over hidden experimental env selection.
- Public `AgentRuntimeKind`, `IOrchestrator`, `StreamingUpdate`,
  route-owned `analysis_completed`, report, CLI, snapshot, and SSE contracts
  remain unchanged.
- No prompt/tool list/scene list/Skill count/output contract was hardcoded.
- No production Pi dependency, Provider Manager UI, `.pi` discovery, project
  extensions, built-in shell tools, or built-in file tools were introduced.
- Rollback is scoped to disabling/removing the hidden registry definition and
  adapter; Claude/OpenAI default imports and packaging remain independent.

Allowed to enter next phase:
- Not automatically. M10 requires explicit maintainer go because it changes
  public runtime option and Provider Manager/UI surface.

### 2026-05-31 23:18:59 CST - M10

Commands:
- `cd backend && npx jest src/agentRuntime/__tests__/runtimeSelection.test.ts src/agentRuntime/__tests__/runtimeRegistry.test.ts src/agentRuntime/__tests__/fakeThirdPartyRuntime.test.ts src/agentRuntime/__tests__/snapshotRuntimeStateInventory.test.ts src/agentRuntime/__tests__/piAgentCoreRuntime.test.ts src/services/providerManager/__tests__/providerService.test.ts src/services/providerManager/__tests__/providerRoutes.test.ts src/services/providerManager/__tests__/connectionTester.test.ts src/cli-user/services/__tests__/runtimeGuard.test.ts src/agentRuntime/__tests__/runtimeHealth.test.ts --runInBand`
- `cd backend && npx tsc --noEmit`
- `cd backend && npm run build`
- `cd backend && npm run cli:pack-check`
- `cd backend && npm run test:scene-trace-regression`
- `cd backend && HOME=/tmp/smartperfetto-pi-public-smoke/home PI_OFFLINE=1 SMARTPERFETTO_AGENT_RUNTIME=pi-agent-core SMARTPERFETTO_PI_AGENT_CORE_FAKE_STREAM=1 SMARTPERFETTO_PI_AGENT_CORE_MODULE_PATH=/tmp/smartperfetto-m10-install/node_modules/@earendil-works/pi-agent-core/dist/index.js npx tsx -e '<public Pi createAgentOrchestrator smoke>'`
- `cd backend && npm pack --ignore-scripts --pack-destination /tmp/smartperfetto-m10-pack --json`
- `npm install --prefix /tmp/smartperfetto-m10-install --ignore-scripts --no-audit --no-fund /tmp/smartperfetto-m10-pack/gracker-smartperfetto-1.0.27.tgz`
- `npm install --prefix /tmp/smartperfetto-m10-install-omit --omit=optional --ignore-scripts --no-audit --no-fund /tmp/smartperfetto-m10-pack/gracker-smartperfetto-1.0.27.tgz`
- `./scripts/update-frontend.sh`
- `npm run check:frontend-prebuild`
- `npm run verify:pr`
- `git diff --check`
- `git diff --no-index --check /dev/null <untracked-file>` loop
- `rg` post-diff scans for `analysis_completed`, public runtime values,
  Provider Manager pinning, optional package exposure, hardcoded prompt/tool/
  scene/output contracts, `.pi` discovery, shell tools, and file tools.

Results:
- M10 focused Jest passed: 10 suites, 103 tests.
- `npx tsc --noEmit`, `npm run build`, and `npm run cli:pack-check` passed.
- Standalone scene trace regression passed all 6 canonical traces.
- Public Pi runtime smoke through `createAgentOrchestrator` passed:
  `success=true`, `partial=true`,
  `terminationReason=plan_incomplete`, conclusion
  `Pi agent-core smoke completed for trace trace-public-pi-smoke.`, and
  public-preview termination metadata.
- Package smoke passed:
  - `npm pack` produced `gracker-smartperfetto-1.0.27.tgz` with 2520 files and
    58046388 unpacked bytes.
  - Default tarball install added 277 packages and installed
    `@earendil-works/pi-agent-core`.
  - `--omit=optional` tarball install added 186 packages and did not install
    `@earendil-works/pi-agent-core`.
  - Installed package metadata still declares Pi only under
    `optionalDependencies`.
- Frontend prebuild update and check passed.
- Root `npm run verify:pr` passed:
  - root quality passed (`lint`, `format:check`, `deadcode`, `shellcheck`);
  - frontend prebuild check passed;
  - Rust fmt/check/test passed, 5 tests;
  - backend skill validation passed, 202 files, 0 failures;
  - backend strategy validation passed, 20 strategy files, 0 missing skills;
  - backend typecheck/build/CLI pack passed;
  - backend `test:core` passed, 62 suites, 712 tests;
  - backend trace processor ensure passed;
  - backend scene trace regression passed all 6 canonical traces.
- `git diff --check` passed.
- No-index whitespace checks for untracked files passed.
- Post-diff scans confirmed `piAgentCoreRuntime.ts` does not emit
  `analysis_completed`; docs/UI describe capability limits; Provider Manager
  support is custom-only; no `.pi` discovery, project extensions, built-in shell
  tools, or built-in file tools are enabled.

Post-diff self-check:
- Pass. M10 is the planned public-surface expansion after M9. Runtime
  ownership remains native, the route-facing harness remains the outer
  `IOrchestrator`, and `EngineCapabilities` describes the capability-limited
  Pi path.
- Provider Manager/runtime pinning is preserved: explicit provider and
  snapshot choices still win, and `pi-agent-core` is allowed only for custom
  providers.
- Public `AgentRuntimeKind` intentionally expands to include `pi-agent-core`.
  Existing Claude/OpenAI values, provider presets, and runtime env behavior
  remain covered by tests.
- Public `StreamingUpdate`, route-owned `analysis_completed`, report, CLI, and
  SSE contracts are unchanged. Snapshot state adds only the typed public Pi
  engine-local state.
- No prompt/tool list/scene list/Skill count/output contract was hardcoded.
- Pi package exposure is optional and reversible. Package smokes prove both
  default optional install and `--omit=optional` install paths.
- Rollback is scoped to reverting public Provider Manager/UI/docs/package
  exposure and returning Pi to the M9 hidden gate.

Allowed to enter next phase:
- Complete. M1-M10 are finished; no next milestone remains in this goal.

### 2026-06-01 02:08:02 CST - Post-M10 Three-Agent E2E Fix Loop

Scope:
- User-added gate after M10: run startup and scrolling E2E for
  `claude-agent-sdk`, `openai-agents-sdk`, and `pi-agent-core`, monitor output,
  fix abnormalities, and rerun until clean.

Focused unit tests:
- Passed:
  `cd backend && npx jest src/agentv3/__tests__/claudeSseBridge.test.ts src/agentv3/__tests__/claudeVerifier.test.ts src/agentv3/__tests__/claudeRuntimeRuntimeSnapshots.test.ts src/agentv3/__tests__/claudeMcpServer.test.ts src/agentRuntime/__tests__/piAgentCoreRuntime.test.ts --runInBand --no-cache`
- Result: 5 suites, 206 tests passed.

Integration tests:
- Passed: `cd backend && npx tsc --noEmit`.
- Passed: `cd backend && npm run test:scene-trace-regression`.
- Scene trace regression passed all 6 canonical traces.

E2E tests:
- OpenAI startup strict E2E: passed.
- OpenAI scrolling strict E2E: passed.
- Pi startup public-preview smoke: passed with capability-limited mode and
  `claimVerifierStatus=not_checked`.
- Pi scrolling public-preview smoke: passed with capability-limited mode and
  `claimVerifierStatus=not_checked`.
- Claude startup strict E2E:
  - Earlier strict runs passed JSON gates but exposed correction timeout,
    verifier JSON-repair warning, correction-time data gathering, and later
    correction session-limit noise.
  - Code fixes were added for those issues.
  - Latest rerun after the skip guard is blocked before agent work by external
    Claude SDK quota:
    `You've hit your session limit · resets 6am (Asia/Shanghai)`.
- Claude scrolling strict E2E: pending until Claude SDK quota is restored.

Typecheck/build:
- `npx tsc --noEmit`: passed.
- Full root `npm run verify:pr`: pending because final Claude E2E matrix is not
  complete.

Post-diff self-check:
- Architecture still matches Draft v2: SDK-native main loops own execution;
  SmartPerfetto owns harness, verifier, event/report/snapshot contracts.
- Provider Manager/runtime provider pinning remains unchanged.
- Public `AgentRuntimeKind` is unchanged after M10; no new runtime values were
  added in the Post-M10 fixes.
- No prompt/tool/scene/output contract was hardcoded. The verifier continues to
  use the strategy-loaded Final Report Contract.
- No additional Pi production dependency or UI surface was introduced.
- Rollback remains scoped to the Post-M10 Claude correction/verifier/SSE/MCP
  attribution changes and Pi smoke/script preview metadata changes.

Allowed to enter next phase:
- No. The Post-M10 three-agent E2E gate remains blocked until Claude startup
  and scrolling E2E can run after quota reset/restoration.

### 2026-06-01 02:16:19 CST - M11 Pi Parity Gate Started

Scope:
- Implement Pi Agent Core as a real SmartPerfetto analysis runtime aligned with
  Claude/OpenAI product semantics, while keeping fake-stream as explicit smoke
  mode only.

Focused unit tests:
- Pending:
  `cd backend && npx jest src/agentRuntime/__tests__/piAgentCoreRuntime.test.ts --runInBand --no-cache`

Integration tests:
- Pending: `cd backend && npx tsc --noEmit`.
- Pending: `cd backend && npm run test:scene-trace-regression`.

Scene trace regression:
- Pending after M11 code changes.

E2E tests:
- Pi strict startup/scrolling E2E pending real Pi model/API configuration.
- Fake-stream startup/scrolling smoke remains useful only as smoke coverage and
  must not satisfy the real Pi parity gate.

Typecheck/build:
- Pending after M11 code changes.

Post-diff self-check:
- Pending. Required checks:
  - architecture still follows Draft v2 SDK-owned native loop + shared
    SmartPerfetto product contract;
  - Provider Manager/runtime pinning unchanged;
  - no hardcoded prompt/tool/scene/output contract;
  - no `.pi` discovery, shell/file tools, package extensions, or unplanned
    dependency exposure;
  - fake-stream is not represented as real analysis;
  - rollback path remains the M10 preview adapter.

Allowed to enter next phase:
- No. M11 is in progress.

### 2026-06-01 03:09:28 CST - M11 Pi Parity Gate Completed

Commands:
- `cd backend && npx jest src/agentRuntime/__tests__/piAgentCoreRuntime.test.ts --runInBand --no-cache`
- `cd backend && npx jest src/agentv3/__tests__/claudeSseBridge.test.ts src/agentv3/__tests__/claudeVerifier.test.ts src/agentv3/__tests__/claudeRuntimeRuntimeSnapshots.test.ts src/agentv3/__tests__/claudeMcpServer.test.ts src/agentRuntime/__tests__/piAgentCoreRuntime.test.ts --runInBand --no-cache`
- `cd backend && npx tsc --noEmit`
- `cd backend && npm run test:scene-trace-regression`
- `git diff --check`
- Pi startup strict real-model E2E through
  `src/scripts/verifyAgentSseScrolling.ts` with
  `SMARTPERFETTO_AGENT_RUNTIME=pi-agent-core`,
  `SMARTPERFETTO_PI_AGENT_CORE_MODULE_PATH=/tmp/smartperfetto-m10-install/node_modules/@earendil-works/pi-agent-core/dist/index.js`,
  and `SMARTPERFETTO_PI_AGENT_CORE_MODEL_JSON` configured for `glm-5.1`.
- Pi scrolling strict real-model E2E with the same runtime/model config.

Results:
- Focused Pi Jest passed: 1 suite, 12 tests.
- Combined focused runtime suites passed: 5 suites, 210 tests.
- `npx tsc --noEmit` passed.
- Scene trace regression passed all 6 canonical traces.
- `git diff --check` passed before final driver-doc updates.
- Pi startup strict real-model E2E passed:
  - Output: `backend/test-output/e2e-pi-m11-startup-real.json`.
  - Session log:
    `backend/logs/sessions/session_agent-1780253749932-hflzvqfz_2026-05-31T18-55-49-933Z.jsonl`.
  - `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues.
  - `agentTaskDispatchedCount=35`, `agentResponseCount=35`.
  - `dataEnvelopeItemCount=37`, no missing/ambiguous/unexpected phases.
  - `architectureDetectedCount=1`,
    `analysisCompletedConclusionChars=11860`.
- Pi scrolling strict real-model E2E passed:
  - Output: `backend/test-output/e2e-pi-m11-scrolling-real.json`.
  - Session log:
    `backend/logs/sessions/session_agent-1780254180546-l4iydbhl_2026-05-31T19-03-00-546Z.jsonl`.
  - `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues.
  - `agentTaskDispatchedCount=25`, `agentResponseCount=25`.
  - `dataEnvelopeItemCount=28`, no missing/ambiguous/unexpected phases.
  - `architectureDetectedCount=1`, `analysisCompletedConclusionChars=8504`.

Post-diff self-check:
- Pass. M11 keeps SDK-native loop ownership and shared SmartPerfetto product
  contract ownership separate.
- Provider Manager/runtime provider pinning is preserved.
- No prompt/tool/scene/output contract was hardcoded; Pi uses shared prompt
  builders and shared MCP tool specs.
- Public `IOrchestrator`, `StreamingUpdate`, route-owned
  `analysis_completed`, report, CLI, and SSE contracts remain unchanged.
- Fake-stream remains explicitly capability-limited and separate from real
  model-backed Pi analysis.
- No `.pi` discovery, Pi coding-agent harness, shell/file tools, package
  extensions, unplanned dependency exposure, or Provider Manager UI changes
  were introduced.
- Rollback remains restoring the M10 preview adapter and fake-stream smoke
  mode.

Allowed to enter next phase:
- Yes for the final three-agent E2E matrix. M11 itself is complete.

### 2026-06-01 03:22:49 CST - Final Three-Agent E2E Matrix Status

Commands:
- `cd backend && npm run verify:e2e:openai-startup`
- `cd backend && SMARTPERFETTO_AGENT_RUNTIME=openai-agents-sdk npx tsx src/scripts/verifyAgentSseScrolling.ts --mode full --timeout-ms 900000 --trace ../test-traces/scroll-demo-customer-scroll.pftrace --query "分析滑动性能" --output test-output/e2e-openai-scrolling-real.json --keep-session --require-conclusion-evidence --require-claim-verifier-ok --require-non-partial --require-final-report-heading --forbid-process-narration --forbid-degraded-fallback completed_plan_summary_fallback --require-text "滑动" --forbid-text "完成综合结论输出" --forbid-text "分阶段证据摘要" --forbid-text "完整结构化报告已生成"`
- `cd backend && SMARTPERFETTO_AGENT_RUNTIME=claude-agent-sdk npx tsx src/scripts/verifyAgentSseScrolling.ts --mode full --timeout-ms 1200000 --trace ../test-traces/lacunh_heavy.pftrace --query "分析启动性能" --output test-output/e2e-claude-startup-real.json --keep-session --require-conclusion-evidence --require-claim-verifier-ok --require-non-partial --require-final-report-heading --forbid-process-narration --forbid-degraded-fallback completed_plan_summary_fallback --require-text "冷启动" --require-text "ChaosTask" --forbid-text "完成综合结论输出" --forbid-text "分阶段证据摘要" --forbid-text "完整结构化报告已生成" --forbid-text "应维持温启动" --forbid-text "bindApplication 不存在"`
- `cd backend && SMARTPERFETTO_AGENT_RUNTIME=claude-agent-sdk npx tsx src/scripts/verifyAgentSseScrolling.ts --mode full --timeout-ms 1200000 --trace ../test-traces/scroll-demo-customer-scroll.pftrace --query "分析滑动性能" --output test-output/e2e-claude-scrolling-real.json --keep-session --require-conclusion-evidence --require-claim-verifier-ok --require-non-partial --require-final-report-heading --forbid-process-narration --forbid-degraded-fallback completed_plan_summary_fallback --require-text "滑动" --forbid-text "完成综合结论输出" --forbid-text "分阶段证据摘要" --forbid-text "完整结构化报告已生成"`

Results:
- `git diff --check` and no-index whitespace checks for the runtime-engine
  driver files passed after the final driver-doc update.
- OpenAI startup strict E2E passed:
  `backend/test-output/e2e-openai-startup-real.json`,
  `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues,
  `dataEnvelopeItemCount=36`, `analysisCompletedConclusionChars=4695`.
- OpenAI scrolling strict E2E passed:
  `backend/test-output/e2e-openai-scrolling-real.json`,
  `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues,
  `dataEnvelopeItemCount=27`, `analysisCompletedConclusionChars=4553`.
- Pi startup and scrolling strict real-model E2E passed in the M11 gate above.
- Claude startup final retry failed before agent work:
  `backend/test-output/e2e-claude-startup-real.json`,
  `agentTaskDispatchedCount=0`, `dataEnvelopeItemCount=0`,
  `hasNoSseErrors=false`, error
  `You've hit your session limit · resets 6am (Asia/Shanghai)`.
- Claude scrolling final retry failed before agent work:
  `backend/test-output/e2e-claude-scrolling-real.json`,
  `agentTaskDispatchedCount=0`, `dataEnvelopeItemCount=0`,
  `hasNoSseErrors=false`, error
  `You've hit your session limit · resets 6am (Asia/Shanghai)`.

Post-diff self-check:
- Partial. OpenAI and Pi runtime behavior gates are clean; Claude cannot be
  evaluated until the external SDK quota resets/restores.
- No code rollback is indicated by the Claude results because both failures
  occur before agent tasks, tool calls, data envelopes, claim verification, or
  report generation.
- Final root `npm run verify:pr` remains pending until Claude startup and
  scrolling strict E2E pass.

Allowed to enter next phase:
- No. The final three-agent E2E matrix is still blocked by external Claude SDK
  quota.

### 2026-06-01 12:21:02 CST - Claude Correction Scaffold Fix Gate

Commands:
- `cd backend && npx jest src/agentv3/__tests__/claudeVerifier.test.ts src/agentv3/__tests__/claudeRuntimeRuntimeSnapshots.test.ts --runInBand --no-cache`
- `cd backend && npx tsc --noEmit`
- `cd backend && SMARTPERFETTO_AGENT_RUNTIME=claude-agent-sdk npx tsx src/scripts/verifyAgentSseScrolling.ts --mode full --timeout-ms 1200000 --trace ../test-traces/scroll-demo-customer-scroll.pftrace --query "分析滑动性能" --output test-output/e2e-claude-scrolling-real.json --keep-session --require-conclusion-evidence --require-claim-verifier-ok --require-non-partial --require-final-report-heading --forbid-process-narration --forbid-degraded-fallback completed_plan_summary_fallback --require-text "滑动" --forbid-text "完成综合结论输出" --forbid-text "分阶段证据摘要" --forbid-text "完整结构化报告已生成"`
- `cd backend && npx jest src/agentv3/__tests__/claudeSseBridge.test.ts src/agentv3/__tests__/claudeVerifier.test.ts src/agentv3/__tests__/claudeRuntimeRuntimeSnapshots.test.ts src/agentv3/__tests__/claudeMcpServer.test.ts src/agentRuntime/__tests__/piAgentCoreRuntime.test.ts --runInBand --no-cache`
- `cd backend && npm run test:scene-trace-regression`
- `cd backend && SMARTPERFETTO_AGENT_RUNTIME=claude-agent-sdk npx tsx src/scripts/verifyAgentSseScrolling.ts --mode full --timeout-ms 1200000 --trace ../test-traces/lacunh_heavy.pftrace --query "分析启动性能" --output test-output/e2e-claude-startup-real.json --keep-session --require-conclusion-evidence --require-claim-verifier-ok --require-non-partial --require-final-report-heading --forbid-process-narration --forbid-degraded-fallback completed_plan_summary_fallback --require-text "冷启动" --require-text "ChaosTask" --forbid-text "完成综合结论输出" --forbid-text "分阶段证据摘要" --forbid-text "完整结构化报告已生成" --forbid-text "应维持温启动" --forbid-text "bindApplication 不存在"`
- `git diff --check`
- No-index whitespace check for `docs/features/runtime-engine-contract/*.md`

Focused unit tests:
- Passed: Claude verifier/runtime snapshot focused Jest, 2 suites, 108 tests.
- Passed: combined runtime-focused Jest, 5 suites, 216 tests.

Integration tests:
- Passed: `cd backend && npx tsc --noEmit`.

Scene trace regression:
- Passed: all 6 canonical traces.

Whitespace checks:
- `git diff --check`: passed.
- No-index whitespace check for runtime-engine-contract docs: passed.

E2E tests:
- Claude scrolling strict E2E after the correction-scaffold sanitizer did not
  reach model/tool work. It failed before any agent task with
  `You've hit your session limit · resets 4pm (Asia/Shanghai)`.
  Evidence: `backend/test-output/e2e-claude-scrolling-real.json`,
  `backend/logs/sessions/session_agent-1780287590640-9tw0f7rr_2026-06-01T04-19-50-641Z.jsonl`.
  Counts: `agentTaskDispatchedCount=0`, `dataEnvelopeItemCount=0`.
- Claude startup strict E2E after the correction-scaffold sanitizer failed the
  same way before model/tool work. Evidence:
  `backend/test-output/e2e-claude-startup-real.json`,
  `backend/logs/sessions/session_agent-1780287653649-b6dd9x7a_2026-06-01T04-20-53-650Z.jsonl`.
  Counts: `agentTaskDispatchedCount=0`, `dataEnvelopeItemCount=0`.

Typecheck/build:
- `npx tsc --noEmit`: passed.
- Root `npm run verify:pr`: not run as final completion gate because the
  latest Claude startup/scrolling E2E cannot execute past the external SDK
  session limit.

Post-diff self-check:
- Partial. Local code gates pass, but the final three-agent E2E matrix remains
  blocked by external Claude SDK quota.
- The latest code changes preserve Draft v2 ownership boundaries, Provider
  Manager/runtime pinning, public event/report/CLI/snapshot contracts, and Pi
  optionality.
- No prompt/tool/scene/output contract was hardcoded; correction wording only
  constrains how verifier feedback is converted back into a clean report.
- Rollback is scoped to the Claude correction prompt/sanitizer and tests.

Allowed to enter next phase:
- No. Final matrix still requires Claude startup and scrolling strict E2E to
  pass after quota resets/restores, followed by output scans and root
  `npm run verify:pr`.

### 2026-06-01 13:11:15 CST - M12 OpenCode Spike Gate Started

Scope:
- Source-grounded OpenCode evaluation for a possible fourth runtime.

Focused unit tests:
- Pending. M12 starts as docs/spike evidence only; focused tests become
  mandatory if M13 introduces adapter code.

Integration tests:
- Pending. No production code has been changed for M12 yet.

Scene trace regression:
- Not required until runtime/provider/session/tool code changes.

E2E tests:
- Pending spike smoke only. No OpenCode product E2E can count until the spike
  proves a safe runtime boundary.

Typecheck/build:
- Pending only if code changes are introduced. M12 docs-only gate requires
  `git diff --check`.

Post-diff self-check:
- Pending after `opencode-spike.md` and any spike artifacts are written.

Allowed to enter next phase:
- No. M13 hidden runtime requires M12 evidence and a go/no-go decision.

### 2026-06-01 13:16:24 CST - M12 OpenCode Spike Gate Completed

Commands:
- `npm view @opencode-ai/sdk version dist.tarball dependencies peerDependencies bin exports type --json`
- `npm view opencode-ai version dist.tarball dependencies peerDependencies bin exports type --json`
- `npm view @opencode-ai/plugin version dist.tarball dependencies peerDependencies exports type --json`
- `npm view opencode version dist.tarball dependencies peerDependencies bin exports type --json`
- `npm pack @opencode-ai/sdk@1.15.13 @opencode-ai/plugin@1.15.13 opencode-ai@1.15.13 --ignore-scripts --json`
- `npm install --prefix /tmp/smartperfetto-opencode-install --no-audit --no-fund opencode-ai@1.15.13 @opencode-ai/sdk@1.15.13 @opencode-ai/plugin@1.15.13`
- `PATH=/tmp/smartperfetto-opencode-install/node_modules/.bin:$PATH opencode --version`
- SDK/server/no-reply session smokes documented in `opencode-spike.md`.
- `git diff --check`
- `git diff --no-index --check /dev/null docs/features/runtime-engine-contract/opencode-spike.md`

Results:
- Official docs and package declarations inspected.
- `opencode` package name does not exist on npm; the CLI package is
  `opencode-ai`.
- OpenCode temp install passed.
- CLI version smoke returned `1.15.13`.
- SDK export smokes passed.
- Server health smoke returned `healthy: true`, version `1.15.13`.
- No-reply session smoke created one user message without invoking a model.
- `git diff --check` passed.
- No-index whitespace check for `opencode-spike.md` produced no whitespace
  errors. Exit code 1 is expected against `/dev/null`.

Post-diff self-check:
- Pass. M12 changed docs only and added spike evidence.
- Provider Manager/runtime provider pinning is unchanged.
- Public `AgentRuntimeKind`, Provider Manager UI, generated frontend,
  package manifests, runtime selection, route/SSE/CLI/report/snapshot
  contracts, and production runtime imports remain unchanged.
- No prompt/tool/scene/output contract was hardcoded.
- Rollback is removing or ignoring `opencode-spike.md`; no product rollback is
  needed.

Allowed to enter next phase:
- Yes for M13 hidden runtime. Public M14 remains blocked until hidden smoke,
  full verification, frontend checks, report inspection, and four-agent E2E.

### 2026-06-01 13:28:50 CST - M13 Hidden OpenCode Runtime Gate Completed

Commands:
- `cd backend && npx jest src/agentRuntime/__tests__/openCodeRuntime.test.ts src/agentRuntime/__tests__/runtimeSelection.test.ts src/agentRuntime/__tests__/piAgentCoreRuntime.test.ts src/agentRuntime/__tests__/runtimeRegistry.test.ts --runInBand --no-cache`
- `cd backend && npx tsc --noEmit`
- `cd backend && npm run build`
- `cd backend && npm run test:scene-trace-regression`
- Hidden runtime smoke through `createAgentOrchestrator` with
  `SMARTPERFETTO_ENABLE_EXPERIMENTAL_AGENT_RUNTIME=1`,
  `SMARTPERFETTO_EXPERIMENTAL_AGENT_RUNTIME=experimental-opencode`,
  `SMARTPERFETTO_OPENCODE_SDK_MODULE_PATH=/tmp/smartperfetto-opencode-install/node_modules/@opencode-ai/sdk/dist/index.js`,
  `SMARTPERFETTO_OPENCODE_PROJECT_DIR=/tmp/smartperfetto-opencode-empty`,
  and OpenCode CLI on `PATH`.
- Hidden standalone MCP status smoke with
  `SMARTPERFETTO_OPENCODE_ENABLE_STANDALONE_MCP=1` and explicit
  `SMARTPERFETTO_OPENCODE_MCP_COMMAND_JSON`.

Focused unit tests:
- Passed: 4 suites, 49 tests.

Integration tests:
- Passed: `cd backend && npx tsc --noEmit`.

Scene trace regression:
- Passed: all 6 canonical traces.

E2E tests:
- Hidden OpenCode no-reply smoke passed: `OpenCodeRuntime` selected behind the
  experiment gate, server/session/config isolation succeeded, result is marked
  `partial=true` and `terminationReason=plan_incomplete`.
- Hidden standalone MCP status smoke passed: OpenCode reported
  `smartperfetto` MCP status `connected`.
- No OpenCode real startup/scrolling E2E was run or claimed in M13 because the
  runtime does not yet expose session-scoped trace tools or real model/provider
  mapping.

Typecheck/build:
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.

Post-diff self-check:
- Pass for hidden M13. Architecture still follows Draft v2 and the OpenCode
  adapter is explicitly external-orchestrator/hidden.
- Provider Manager/runtime pinning, public runtime values, UI, generated
  frontend, package manifests, route/SSE/CLI/report/snapshot contracts, and
  Claude/OpenAI/Pi production behavior remain unchanged.
- No prompt/scene/Skill/output contract was hardcoded.
- OpenCode built-in file/shell/web/edit tools are disabled and dangerous
  permissions are denied by adapter-owned config.
- Rollback remains unsetting hidden env vars or removing the hidden registry
  registration/adapter.

Allowed to enter next phase:
- No for public M14. M14 requires session-scoped SmartPerfetto tools, real
  OpenCode model/provider mapping, OpenCode startup/scrolling E2E, frontend
  Provider Manager checks, generated HTML report inspection in Chrome, and root
  `npm run verify:pr`.

### 2026-06-01 13:33:49 CST - Claude Startup Final E2E Retry Still Quota-Blocked

Commands:
- `cd backend && SMARTPERFETTO_AGENT_RUNTIME=claude-agent-sdk npx tsx src/scripts/verifyAgentSseScrolling.ts --mode full --timeout-ms 1200000 --trace ../test-traces/lacunh_heavy.pftrace --query "分析启动性能" --output test-output/e2e-claude-startup-real.json --keep-session --require-conclusion-evidence --require-claim-verifier-ok --require-non-partial --require-final-report-heading --forbid-process-narration --forbid-degraded-fallback completed_plan_summary_fallback --require-text "冷启动" --require-text "ChaosTask" --forbid-text "完成综合结论输出" --forbid-text "分阶段证据摘要" --forbid-text "完整结构化报告已生成" --forbid-text "应维持温启动" --forbid-text "bindApplication 不存在"`

E2E tests:
- Claude startup strict E2E failed before model/tool work with:
  `You've hit your session limit · resets 4pm (Asia/Shanghai)`.
- Evidence: `backend/test-output/e2e-claude-startup-real.json`,
  `backend/logs/sessions/session_agent-1780292021048-hr47itrt_2026-06-01T05-33-41-049Z.jsonl`.
- Counts: `agentTaskDispatchedCount=0`, `dataEnvelopeItemCount=0`,
  `hasNoSseErrors=false`, no claim verifier result.

Post-diff self-check:
- No new code issue found. The run loaded the trace and initialized the Claude
  SDK path, then failed on the external session-limit response before
  SmartPerfetto tool execution.

Allowed to enter next phase:
- No. Claude startup and scrolling strict E2E must pass after quota reset, then
  the final root `npm run verify:pr` gate must run.

### 2026-06-01 16:32:50 CST - Final Three-Agent E2E Matrix Completed

Commands:
- Claude startup strict E2E:
  `cd backend && SMARTPERFETTO_AGENT_RUNTIME=claude-agent-sdk npx tsx src/scripts/verifyAgentSseScrolling.ts --mode full --timeout-ms 1200000 --trace ../test-traces/lacunh_heavy.pftrace --query "分析启动性能" --output test-output/e2e-claude-startup-real.json --keep-session --require-conclusion-evidence --require-claim-verifier-ok --require-non-partial --require-final-report-heading --forbid-process-narration --forbid-degraded-fallback completed_plan_summary_fallback --require-text "冷启动" --require-text "ChaosTask" --forbid-text "完成综合结论输出" --forbid-text "分阶段证据摘要" --forbid-text "完整结构化报告已生成" --forbid-text "应维持温启动" --forbid-text "bindApplication 不存在"`.
- Claude scrolling strict E2E:
  `cd backend && SMARTPERFETTO_AGENT_RUNTIME=claude-agent-sdk npx tsx src/scripts/verifyAgentSseScrolling.ts --mode full --timeout-ms 1200000 --trace ../test-traces/scroll-demo-customer-scroll.pftrace --query "分析滑动性能" --output test-output/e2e-claude-scrolling-real.json --keep-session --require-conclusion-evidence --require-claim-verifier-ok --require-non-partial --require-final-report-heading --forbid-process-narration --forbid-degraded-fallback completed_plan_summary_fallback --require-text "滑动" --forbid-text "完成综合结论输出" --forbid-text "分阶段证据摘要" --forbid-text "完整结构化报告已生成"`.
- Structured JSON summary read for all six public-runtime E2E outputs.
- `npm run verify:pr`.

Focused unit tests:
- Passed through the root `npm run verify:pr` `test:core` gate.
- Previously passed focused Post-M10/M11 runtime Jest remains the focused
  coverage for the code changes in this final gate.

Integration tests:
- Passed through root `npm run verify:pr`: backend validation, typecheck,
  build, CLI package check, and frontend prebuild check.

Scene trace regression:
- Passed through root `npm run verify:pr`: all 6 canonical traces.

E2E tests:
- Claude startup strict E2E passed:
  `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues,
  28 task dispatches, 28 agent responses, 36 data envelopes,
  `analysisCompletedConclusionChars=12702`.
- Claude scrolling strict E2E passed:
  `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues,
  20 task dispatches, 20 agent responses, 26 data envelopes,
  `analysisCompletedConclusionChars=9096`.
- OpenAI startup strict E2E passed:
  `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues,
  36 data envelopes, `analysisCompletedConclusionChars=4695`.
- OpenAI scrolling strict E2E passed:
  `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues,
  27 data envelopes, `analysisCompletedConclusionChars=4553`.
- Pi startup strict real-model E2E passed:
  `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues,
  35 task dispatches, 37 data envelopes,
  `analysisCompletedConclusionChars=11860`.
- Pi scrolling strict real-model E2E passed:
  `claimVerifierStatus=passed`, 12 checked claims, 0 unsupported/issues,
  25 task dispatches, 28 data envelopes,
  `analysisCompletedConclusionChars=8504`.

Typecheck/build:
- Passed through root `npm run verify:pr`.

Post-diff self-check:
- Pass. The final gate preserves Draft v2 ownership boundaries, Provider
  Manager/runtime provider pinning, public event/report/CLI/snapshot/SSE
  contracts, and optional Pi/OpenCode dependency discipline.
- No prompt/tool list/scene list/Skill count/output contract was hardcoded.
- No unplanned runtime UI/package/public-env exposure was introduced by this
  final gate.
- The generated Claude HTML report text scan found no correction scaffold
  leakage; the report was also opened in Google Chrome for visual inspection.
- The remaining Claude correction timeout is a non-user-facing optional retry
  diagnostic and did not affect strict E2E, report text, or root PR gates.

Allowed to enter next phase:
- Yes for M14 planning only. OpenCode public exposure is still blocked on
  request-scoped trace-tool parity, real model/provider mapping, OpenCode
  startup/scrolling E2E, frontend Provider Manager checks, HTML report
  inspection, and root `verify:pr`.

### 2026-06-01 21:09:18 CST - M14 Four-Agent Public Runtime Gate Completed

Commands:
- M14 focused Jest:
  `cd backend && npx jest src/services/providerManager/__tests__/providerSnapshot.test.ts src/services/providerManager/__tests__/enterpriseProviderStore.test.ts src/services/providerManager/__tests__/providerService.test.ts src/services/providerManager/__tests__/providerRoutes.test.ts src/services/providerManager/__tests__/connectionTester.test.ts src/agentRuntime/__tests__/piAgentCoreRuntime.test.ts src/agentRuntime/__tests__/openCodeRuntime.test.ts src/agentv3/__tests__/claudeRuntimeRuntimeSnapshots.test.ts src/agentv3/__tests__/claudeVerifier.test.ts --runInBand --no-cache`.
- `cd backend && npx tsc --noEmit`.
- `cd backend && npm run test:scene-trace-regression`.
- `./scripts/update-frontend.sh`.
- `npm run check:frontend-prebuild`.
- Strict startup/scrolling E2E commands for `claude-agent-sdk`,
  `openai-agents-sdk`, `pi-agent-core`, and `opencode`.
- Structured Node.js scans for all eight E2E JSON outputs, generated HTML
  reports, and session logs.
- Computer Use visual checks in Google Chrome for the latest Claude scrolling
  report and OpenCode scrolling report.
- `npm run verify:pr`.
- `/simplify` runnable-entry search in `package.json`, `backend/package.json`,
  and top-level scripts.

Focused unit tests:
- M14 focused Jest passed: 9 suites, 204 tests.
- Root `npm run verify:pr` core tests passed: 62 suites, 727 tests.

Integration tests:
- `cd backend && npx tsc --noEmit`: passed.
- `npm run check:frontend-prebuild`: passed.
- Root `npm run verify:pr` backend validation/typecheck/build/CLI pack passed.

Scene trace regression:
- Standalone scene trace regression passed all 6 canonical traces.
- Root `npm run verify:pr` scene trace regression passed all 6 canonical
  traces.

E2E tests:
- Claude startup strict E2E passed: claim verifier passed, 12 checked claims,
  0 unsupported/issues, 27 task dispatches, 33 data envelopes,
  non-partial final report.
- Claude scrolling strict E2E passed: claim verifier passed, 12 checked claims,
  0 unsupported/issues, 20 task dispatches, 26 data envelopes,
  non-partial final report.
- OpenAI startup strict E2E passed: claim verifier passed, 12 checked claims,
  0 unsupported/issues, 42 task dispatches, 37 data envelopes,
  non-partial final report.
- OpenAI scrolling strict E2E passed: claim verifier passed, 12 checked claims,
  0 unsupported/issues, 39 task dispatches, 41 data envelopes,
  non-partial final report.
- Pi startup strict E2E passed: claim verifier passed, 12 checked claims,
  0 unsupported/issues, 34 task dispatches, 37 data envelopes,
  non-partial final report.
- Pi scrolling strict E2E passed: claim verifier passed, 12 checked claims,
  0 unsupported/issues, 29 task dispatches, 32 data envelopes,
  non-partial final report.
- OpenCode startup strict E2E passed: claim verifier passed, 12 checked claims,
  0 unsupported/issues, 35 task dispatches, 36 data envelopes,
  non-partial final report.
- OpenCode scrolling strict E2E passed: claim verifier passed, 12 checked
  claims, 0 unsupported/issues, 28 task dispatches, 28 data envelopes,
  non-partial final report.

Report/session scans:
- All eight generated HTML reports exist.
- Final report sections have no forbidden correction scaffold, process
  narration, fallback text, tool-not-executed claims, quota/session-limit text,
  or startup false-claim text.
- All eight session logs have 0 error-level entries and no quota/session-limit
  or fallback text hits.

Typecheck/build:
- `cd backend && npx tsc --noEmit`: passed.
- Root `npm run verify:pr`: passed.

Post-diff self-check:
- Pass. M14 is the intentional public runtime expansion for OpenCode. Existing
  Claude/OpenAI/Pi paths remain green.
- Provider Manager/runtime pinning remains intact.
- Public `IOrchestrator`, `StreamingUpdate`, report, CLI, snapshot, and SSE
  contracts remain protected by focused tests, root tests, trace regression,
  and final E2E.
- No prompt/tool/scene/output contract was hardcoded.
- OpenCode is source-grounded, request-scoped, and keeps built-in file/shell/
  project-discovery behavior disabled or bypassed in SmartPerfetto product
  paths.
- Rollback remains reverting public OpenCode Provider Manager/UI/docs/package
  exposure and falling back to the hidden disabled adapter.
- `/simplify` gap: no runnable shell/npm entry found in this workspace.

Allowed to enter next phase:
- Complete. M1-M14 are done.

### 2026-06-02 16:56:44 CST - Post-M14 Public Docs Sync Gate Completed

Scope:
- Documentation/env-template synchronization after the public OpenCode fourth
  runtime work.

Focused unit tests:
- Not run; docs-only change.

Integration tests:
- Not run; docs-only change.

Scene trace regression:
- Not run; docs-only change. The M14 runtime behavior gate already passed with
  the four-agent startup/scrolling matrix and root `npm run verify:pr`.

E2E tests:
- Not run; docs-only change.

Typecheck/build:
- Not run; docs-only change.

Docs/checks:
- `git diff --check`: passed.
- Stale runtime wording scan: passed for public docs/env templates.
- Hardcoded Skill/test count scan: passed after replacing fixed-count wording
  with registry/file-tree language.

Post-diff self-check:
- Pass. Public English/Chinese docs, architecture docs, configuration docs, and
  env examples now list `opencode` with the existing Claude/OpenAI/Pi runtime
  values.
- Pass. OpenCode documentation preserves the isolated server/request-scoped MCP
  bridge/no personal OpenCode login boundary.
- Pass. Pi/OpenCode remain custom-only and optional in public docs.
- Pass. No public Provider Manager/runtime pinning contract change beyond
  documentation alignment.

Allowed to enter next phase:
- Yes. Docs sync is complete; no runtime retest required for this docs-only
  patch.

### 2026-06-02 19:05:09 CST - Post-M14 Release Gate Rerun

Scope:
- Release-readiness verification before push and publish.

Focused unit tests:
- `cd backend && npx jest src/agentv3/__tests__/claudeRuntimeRuntimeSnapshots.test.ts --runInBand --no-cache`: passed, 1 suite, 28 tests.

Integration tests:
- Covered by root `npm run verify:pr`, including backend validation,
  typecheck/build, CLI pack check, core tests, trace processor ensure, and
  scene trace regression.

Scene trace regression:
- `cd backend && npm run test:scene-trace-regression`: passed all 6 canonical
  traces.
- Root `npm run verify:pr` reran scene trace regression and passed all 6
  canonical traces again.

E2E tests:
- Claude startup strict E2E: passed, 12 checked claims, 0 unsupported/issues.
- Claude scrolling strict E2E: passed, 12 checked claims, 0 unsupported/issues.
- OpenAI startup strict E2E: passed, 12 checked claims, 0 unsupported/issues.
- OpenAI scrolling strict E2E: passed, 12 checked claims, 0 unsupported/issues.
- Pi startup strict real-model E2E: passed, 12 checked claims, 0
  unsupported/issues.
- Pi scrolling strict real-model E2E: passed, 12 checked claims, 0
  unsupported/issues.
- OpenCode startup strict E2E: passed, 12 checked claims, 0 unsupported/issues.
- OpenCode scrolling strict E2E: passed, 12 checked claims, 0
  unsupported/issues.

Generated report/session checks:
- Unified JSON/session/report scan passed for all eight E2E outputs.
- Browser render/scroll scan passed for all eight generated HTML reports.
- No non-favicon browser console errors.
- No context-pressure warning, correction scaffold, process narration,
  fallback text, or error-level session entry in report/session scans.

Typecheck/build:
- `cd backend && npx tsc --noEmit`: passed.
- Root `npm run verify:pr`: passed.

Post-diff self-check:
- Pass. Draft v2 ownership boundaries are preserved.
- Pass. Provider Manager/runtime pinning remains intact.
- Pass. Public report/SSE/snapshot/CLI contracts are covered by focused tests,
  root tests, E2E, and generated report checks.
- Pass. No prompt/tool/scene/output contract hardcoding was added.
- Pass. Pi/OpenCode remain optional custom-provider runtimes with explicit
  config.
- `/simplify` gap recorded: no runnable shell/npm entry found in this
  workspace.

Allowed to enter next phase:
- Yes, after `git diff --check` passes on these docs/log updates.

### 2026-06-02 19:41:00 CST - v1.0.28 Publish Verification

Scope:
- Post-publish verification for npm, GitHub portable assets, Docker workflow,
  Docker Hub manifests, and repository cleanliness.

Focused unit tests:
- Covered before publish by release gate and version-state root
  `npm run verify:pr`.

Integration tests:
- Version-state root `npm run verify:pr`: passed after the `1.0.28` version
  bump.
- Docker workflow `quality-gate`: passed root quality, Rust verify, backend PR
  verification, Docker runtime image smoke, and Docker Hub compose config.

Scene trace regression:
- Local version-state root `npm run verify:pr`: passed all 6 canonical traces.
- Docker workflow `quality-gate`: passed backend PR verification, including
  scene trace regression.

E2E tests:
- Four-agent startup/scrolling strict E2E matrix passed before publish; no E2E
  rerun was needed after the version-only release commit.

Publish checks:
- `cd backend && npm publish --access public`: succeeded.
- `npm view @gracker/smartperfetto version --json`: returned `"1.0.28"`.
- Fresh npm install smoke on Node `v24.15.0`: passed.
- `smp --version`: returned `1.0.28`.
- `smp doctor --format json`: returned `ok:true`.

Portable/GitHub checks:
- `npm run package:portable`: passed for Windows x64, macOS arm64, and Linux
  x64.
- `npm run release:portable -- 1.0.28 --skip-build --no-draft`: uploaded all
  three portable assets.
- GitHub Release `v1.0.28`: draft false, prerelease false, target commit
  `e275f2b0af6b9af3e758d9383bbf6dfb9ab1425d`.

Docker checks:
- Docker Build and Publish run `26816581871`: success.
- `docker.io/w553000664/smartperfetto:1.0.28`: OCI index digest
  `sha256:004c015ee05e47de08ebe66d61fd6cdd770b800aa291ec386b6f7b49f7448276`.
- `docker.io/w553000664/smartperfetto:latest`: same OCI index digest.
- Manifest includes linux/amd64 and linux/arm64 images.

Post-diff self-check:
- Pass. Release artifacts match the pushed release commit.
- Pass. Docker latest and version tag point at the same digest.
- Pass. npm and portable artifacts are public and verified.

Allowed to enter next phase:
- Complete. Runtime-engine-contract M1-M14 and the v1.0.28 publish gate are
  done.
