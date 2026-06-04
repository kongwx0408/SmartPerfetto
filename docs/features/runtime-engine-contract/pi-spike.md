# Runtime Engine Contract M8 Pi / Third-Party API Spike

Date: 2026-05-31
Status: completed evidence spike
Production behavior: unchanged

## Summary

The unscoped npm packages named `pi-ai` and `pi-agent-core` are not usable
runtime dependencies today. They are `0.0.1` placeholder package-name
reservations with no real API surface.

The currently usable Pi packages found on npm are scoped under
`@earendil-works`:

- `@earendil-works/pi-ai@0.78.0`
- `@earendil-works/pi-agent-core@0.78.0`
- `@earendil-works/pi-coding-agent@0.78.0`

Recommendation:

- Use `@earendil-works/pi-agent-core` as the only plausible future thin-engine
  candidate.
- Do not embed `@earendil-works/pi-coding-agent` as a production orchestrator.
  It is a full coding-agent CLI/SDK with sessions, resource discovery, built-in
  file/shell tools, extensions, packages, prompt templates, and TUI concerns.
- Do not use the unscoped `pi-ai` or `pi-agent-core` packages.
- Do not enter M9 until a hidden adapter plan explicitly handles TypeBox tool
  schema adaptation, dependency footprint, resource-discovery suppression, and
  runtime state mapping.

## Evidence Commands

All commands were run outside production runtime paths. No package was added to
root or backend manifests.

Registry metadata:

```bash
npm view pi-ai name version description homepage repository license dependencies peerDependencies bin exports main types dist.tarball dist.integrity --json
npm view pi-agent-core name version description homepage repository license dependencies peerDependencies bin exports main types dist.tarball dist.integrity --json
npm view @earendil-works/pi-ai name version description homepage repository license dependencies peerDependencies optionalDependencies bin exports main module types files engines dist.tarball dist.integrity --json
npm view @earendil-works/pi-agent-core name version description homepage repository license dependencies peerDependencies optionalDependencies bin exports main module types files engines dist.tarball dist.integrity --json
npm view @earendil-works/pi-coding-agent name version description homepage repository license dependencies peerDependencies optionalDependencies bin exports main module types files engines dist.tarball dist.integrity --json
npm search pi-agent --json
npm search pi ai agent core --json
```

Tarball inspection:

```bash
npm pack pi-ai@0.0.1 --pack-destination /tmp/smartperfetto-pi-spike/pi-ai
npm pack pi-agent-core@0.0.1 --pack-destination /tmp/smartperfetto-pi-spike/pi-agent-core
npm pack @earendil-works/pi-ai@0.78.0 --pack-destination /tmp/smartperfetto-pi-spike/earendil-ai
npm pack @earendil-works/pi-agent-core@0.78.0 --pack-destination /tmp/smartperfetto-pi-spike/earendil-agent
npm pack @earendil-works/pi-coding-agent@0.78.0 --pack-destination /tmp/smartperfetto-pi-spike/earendil-coding
```

Safe smoke:

```bash
npm install --prefix /tmp/smartperfetto-pi-smoke --ignore-scripts --no-audit --no-fund \
  @earendil-works/pi-agent-core@0.78.0 \
  @earendil-works/pi-ai@0.78.0 \
  typebox@1.1.38

PI_OFFLINE=1 HOME=/tmp/smartperfetto-pi-smoke/home node --input-type=module -e '
import { Agent } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
const tool = {
  name: "noop",
  label: "Noop",
  description: "No-op tool for import smoke",
  parameters: Type.Object({ input: Type.String() }),
  execute: async (_toolCallId, params) => ({
    content: [{ type: "text", text: params.input }],
    details: { ok: true },
  }),
};
const agent = new Agent({
  initialState: { systemPrompt: "smoke", tools: [tool], messages: [] },
});
const unsubscribe = agent.subscribe(() => undefined);
unsubscribe();
console.log(JSON.stringify({
  agentClass: typeof Agent,
  tools: agent.state.tools.map((t) => t.name),
  hasAbort: typeof agent.abort,
  hasPrompt: typeof agent.prompt,
  isStreaming: agent.state.isStreaming,
}, null, 2));
'
```

Smoke output:

```json
{
  "agentClass": "function",
  "tools": ["noop"],
  "hasAbort": "function",
  "hasPrompt": "function",
  "isStreaming": false
}
```

## Package Findings

### Unscoped Packages

`pi-ai@0.0.1`:

- Description: placeholder package name reservation.
- Tarball contents: `README.md`, `index.js`, `package.json`.
- Runtime export from `index.js`: `{ name: "pi-ai", placeholder: true }`.
- No dependencies, exports map, type declarations, CLI, stream API, or tool API.

`pi-agent-core@0.0.1`:

- Description: placeholder package name reservation.
- Tarball contents: `README.md`, `index.js`, `package.json`.
- Runtime export from `index.js`:
  `{ name: "pi-agent-core", placeholder: true }`.
- No dependencies, exports map, type declarations, CLI, stream API, or tool API.

Decision: these packages are no-go for SmartPerfetto.

### `@earendil-works/pi-ai@0.78.0`

Purpose:

- Unified LLM API with provider/model discovery, tool calling, streaming,
  usage/cost accounting, image support, OAuth helpers, and provider
  compatibility options.

Package metadata:

- Node engine: `>=22.19.0`.
- Main/type export: `./dist/index.js`, `./dist/index.d.ts`.
- CLI binary: `pi-ai`.
- Direct dependencies include OpenAI, Anthropic, Google GenAI, Mistral, AWS
  Bedrock, proxy agents, `partial-json`, and `typebox`.

Relevant API shape from `dist/types.d.ts`:

- Tool schema source is TypeBox:
  `Tool<TParameters extends TSchema> { name; description; parameters }`.
- Context shape is `systemPrompt`, `messages`, and optional `tools`.
- Stream options include `signal`, `apiKey`, `transport`, `sessionId`,
  `headers`, `timeoutMs`, `maxRetries`, `maxRetryDelayMs`, and payload/response
  inspection hooks.
- Stream event union:
  `start`, `text_start`, `text_delta`, `text_end`, `thinking_start`,
  `thinking_delta`, `thinking_end`, `toolcall_start`, `toolcall_delta`,
  `toolcall_end`, `done`, `error`.
- `AssistantMessage` includes provider/API/model identifiers, optional
  `responseId`, diagnostics, usage/cost, stop reason, and timestamp.
- `EventStream` is async-iterable and exposes `result()`.

Implication:

- `@earendil-works/pi-ai` is lower-level than SmartPerfetto needs for a full
  agent loop. It is useful as the LLM/model substrate under
  `@earendil-works/pi-agent-core`, not as a direct replacement for the current
  Claude/OpenAI orchestrators.

### `@earendil-works/pi-agent-core@0.78.0`

Purpose:

- Stateful agent loop with tool execution, event streaming, message state,
  steering/follow-up queues, compaction/session harness utilities, and optional
  persistence abstractions.

Package metadata:

- Node engine: `>=22.19.0`.
- Main/type export: `./dist/index.js`, `./dist/index.d.ts`.
- Direct dependencies:
  `@earendil-works/pi-ai`, `ignore`, `typebox`, and `yaml`.
- Tarball size: about 208 KB. Unpacked size: about 1.1 MB.

Relevant API shape:

- `Agent` owns transcript state, emits lifecycle events, executes tools, and
  has `prompt`, `continue`, `abort`, `waitForIdle`, `reset`, `steer`,
  `followUp`, `subscribe`, and queue-management methods.
- Low-level `agentLoop` and `agentLoopContinue` expose async event streams.
- `AgentTool` extends the TypeBox-backed `Tool` and adds:
  `label`, optional `prepareArguments`, `execute(toolCallId, params, signal,
  onUpdate)`, and optional per-tool `executionMode`.
- Tool execution mode is `parallel` by default or `sequential`.
- Hooks exist before and after tool execution:
  `beforeToolCall` can block; `afterToolCall` can patch results or set a
  terminate hint.
- `AgentEvent` includes:
  `agent_start`, `agent_end`, `turn_start`, `turn_end`, `message_start`,
  `message_update`, `message_end`, `tool_execution_start`,
  `tool_execution_update`, and `tool_execution_end`.
- `AgentState` contains `systemPrompt`, `model`, `thinkingLevel`, `tools`,
  `messages`, `isStreaming`, `streamingMessage`, `pendingToolCalls`, and
  `errorMessage`.
- State/session primitives exist in core:
  `Session`, `SessionStorage`, `InMemorySessionStorage`, and JSONL storage.
- `AgentHarness` is a higher-level harness with resources, active tools,
  prompt templates, skills, session navigation, compaction, provider hooks,
  `abort`, and `waitForIdle`.

Implication:

- This package can fit SmartPerfetto's "SDK owns inner loop + native tool
  execution" direction.
- It is not a drop-in replacement for current runtime adapters because:
  SmartPerfetto currently uses Zod raw shapes as the shared tool schema source,
  while Pi uses TypeBox `TSchema`.
- A future adapter should target `Agent` or low-level `agentLoop`, not the
  full `AgentHarness`, unless we deliberately want Pi's own harness semantics.

### `@earendil-works/pi-coding-agent@0.78.0`

Purpose:

- Full terminal coding agent CLI/SDK with sessions, built-in tools, resource
  discovery, packages, extensions, skills, prompt templates, settings, TUI,
  RPC, and SDK integration.

Package metadata:

- Node engine: `>=22.19.0`.
- CLI binary: `pi`.
- Direct dependencies include `@earendil-works/pi-agent-core`,
  `@earendil-works/pi-ai`, `@earendil-works/pi-tui`, `cross-spawn`, `glob`,
  `jiti`, `proper-lockfile`, `undici`, `typebox`, and other CLI/TUI packages.
- Optional dependency: `@mariozechner/clipboard`.
- Tarball size: about 4.5 MB. Unpacked size: about 11.7 MB.

Relevant controls:

- CLI has `--tools`, `--exclude-tools`, `--no-builtin-tools`, and `--no-tools`.
- CLI has `--no-extensions`, `--no-skills`, `--no-prompt-templates`,
  `--no-themes`, and `--no-context-files`.
- Built-in tools are `read`, `bash`, `edit`, `write`, `grep`, `find`, and
  `ls`; default built-ins are `read`, `bash`, `edit`, and `write`.
- SDK `createAgentSession()` exposes `noTools`, `tools`, `excludeTools`,
  `customTools`, `resourceLoader`, and `SessionManager`.
- `DefaultResourceLoader` discovers project/global extensions, skills, prompts,
  themes, context files, settings, credentials, models, and sessions. Passing a
  custom `ResourceLoader` bypasses the standard discovery mechanism.
- `DefaultResourceLoaderOptions` includes `noExtensions`, `noSkills`,
  `noPromptTemplates`, `noThemes`, `noContextFiles`, and override hooks.
- `SessionManager.inMemory()` and `InMemorySessionStorage` are available for
  non-persistent smoke paths.

Implication:

- The coding-agent package proves there are switches to disable built-in tools
  and resource discovery, but using it as SmartPerfetto's production runtime
  would import a large external product harness.
- It should not be embedded as the primary production orchestrator.
- If M9 explores it at all, it should be hidden, optional, and treated as an
  external-orchestrator experiment with explicit `--no-*`, tool allowlist,
  in-memory/custom resource loading, and no Provider Manager UI.

## Contract Fit

### Stream Events

Pi offers two event layers:

- `@earendil-works/pi-ai` provider stream events:
  `text_*`, `thinking_*`, `toolcall_*`, `done`, `error`.
- `@earendil-works/pi-agent-core` loop events:
  agent lifecycle, turn lifecycle, message lifecycle, and tool execution
  lifecycle.

Fit:

- These events can be projected into SmartPerfetto `StreamingUpdate` without
  changing the public SSE/CLI event names.
- `done` / `agent_end` should be treated as one engine run ending, not as
  route-level `analysis_completed`.
- Tool progress can map through `tool_execution_update`.
- Thinking/text separation is available from the provider event layer.

Gap:

- SmartPerfetto needs an adapter-level event projector and tests before a
  hidden runtime can be trusted.

### Tool Schema And Execution

Fit:

- Pi supports native tool execution through `AgentTool.execute(...)`.
- Per-tool `executionMode` and global sequential/parallel execution are
  explicit.
- `beforeToolCall` / `afterToolCall` give a security/policy interception point.

Gap:

- Pi uses TypeBox `TSchema`; SmartPerfetto's shared tool body currently uses
  Zod raw shapes.
- M9 would need an adapter from `SharedToolSpec` to TypeBox or a new neutral
  JSON-schema intermediate that can emit TypeBox-compatible schemas.
- Shell/file tools must come only from SmartPerfetto's shared tool registry,
  not from Pi coding-agent built-ins.

### State And Resume

Fit:

- `Agent` state can be serialized in an adapter-owned engine state:
  messages, active model, thinking level, active tool names, and possibly
  session id.
- `@earendil-works/pi-agent-core` exposes session abstractions and in-memory or
  JSONL storage.
- `pi-ai` stream options include `sessionId` for provider-side cache/session
  affinity where supported.

Gap:

- SmartPerfetto must decide whether future Pi engine state stores only a
  compact opaque Pi transcript/state payload or maps each entry into
  `SessionStateSnapshot.engineState`.
- The product report/snapshot state must remain outside Pi state, following M7.
- Provider Manager pinning still needs SmartPerfetto-owned provider id and
  snapshot hash, not Pi's session file identity.

### Security And Discovery Controls

Safe future shape:

- Prefer `@earendil-works/pi-agent-core` `Agent` or `agentLoop`.
- Provide only SmartPerfetto shared tools.
- Use `toolExecution: "sequential"` initially to match current OpenAI
  conservative behavior unless a separate review approves parallel execution.
- Use `beforeToolCall` to enforce request-scoped allowlists and block unknown
  tools.
- Use an adapter-owned `AbortSignal` and call `agent.abort()` on cancellation.
- Keep resource discovery out of the adapter by avoiding
  `DefaultResourceLoader`.

If the coding-agent SDK is ever used:

- Use `noTools: "all"` or an explicit `tools` allowlist.
- Disable discovery through a custom `ResourceLoader`, or use
  `DefaultResourceLoader` with `noExtensions`, `noSkills`,
  `noPromptTemplates`, `noThemes`, and `noContextFiles`.
- Use `SessionManager.inMemory()` or a SmartPerfetto-owned temp/session path.
- Do not allow project-local `.pi` packages, extensions, skills, prompts, or
  themes in a production SmartPerfetto analysis path.

## Packaging Impact

Measured from the spike:

- `@earendil-works/pi-agent-core@0.78.0` tarball: about 208 KB.
- `@earendil-works/pi-ai@0.78.0` tarball: about 500 KB.
- `@earendil-works/pi-coding-agent@0.78.0` tarball: about 4.5-4.7 MB.
- Temp install of `@earendil-works/pi-agent-core`, `@earendil-works/pi-ai`,
  and `typebox` with `--ignore-scripts`: 102 packages, about 109 MB
  `node_modules`.

Implication:

- Any future Pi dependency should be optional/dynamic and excluded from default
  npm/Docker/portable paths until packaging smoke tests pass.
- The full coding-agent package has much larger packaging and security surface
  than the core package.

## Recommendation For M9

Proceed only if M9 remains hidden and experimental.

Recommended M9 adapter target:

- `@earendil-works/pi-agent-core` `Agent` or `agentLoop`.

Do not target:

- unscoped `pi-ai`
- unscoped `pi-agent-core`
- `@earendil-works/pi-coding-agent` as a production orchestrator

Required M9 design tasks:

- Add a TypeBox adapter for `SharedToolSpec` without changing the canonical M2
  Zod source unless a separate architecture decision approves that change.
- Add `EngineCapabilities` fields or values for:
  TypeBox schema dialect, native agent-core loop, agent-core event kinds,
  explicit abort support, sequential/parallel tool behavior, state payload
  shape, and provider session-id/cache-affinity behavior.
- Implement event projection tests from Pi event names to `StreamingUpdate`.
- Implement fake Pi-like adapter tests before real hidden runtime code.
- Gate all real package imports behind an explicit hidden experiment flag and
  dynamic import.
- Keep Provider Manager UI and public `AgentRuntimeKind` unchanged.
- Run root `npm run verify:pr` plus npm pack/install and Docker/portable
  packaging smoke before any public exposure.

## M8 Verdict

M8 clears the evidence question:

- There is a plausible thin-engine path through
  `@earendil-works/pi-agent-core`.
- The unscoped package names are placeholders and should not be used.
- The full coding-agent package is an external-orchestrator surface, not the
  right first production adapter.
- No production SmartPerfetto dependency, runtime selection, Provider Manager,
  UI, CLI/report/snapshot/SSE contract, or packaging path changed during this
  spike.
