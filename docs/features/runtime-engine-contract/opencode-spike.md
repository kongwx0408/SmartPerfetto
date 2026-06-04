# OpenCode Source/API Spike

Status: M12 evidence note
Date: 2026-06-01
Package versions inspected: `@opencode-ai/sdk@1.15.13`,
`opencode-ai@1.15.13`, `@opencode-ai/plugin@1.15.13`

## Goal

Evaluate whether OpenCode can become a fourth SmartPerfetto agent runtime after
Claude Agent SDK, OpenAI Agents SDK, and Pi Agent Core.

This spike is evidence-only. It does not add a production dependency, public
runtime value, Provider Manager UI, generated frontend contract, or product
runtime path.

## Sources

- Official SDK docs: `https://opencode.ai/docs/sdk/`
- Official server docs: `https://opencode.ai/docs/server/`
- Official tools docs: `https://dev.opencode.ai/docs/tools/`
- Official config docs: `https://opencode.ai/docs/config/`
- Official permissions docs: `https://opencode.ai/docs/permissions/`
- Official MCP docs: `https://opencode.ai/docs/mcp-servers`
- Official custom tools docs: `https://opencode.ai/docs/custom-tools/`
- NPM package metadata and tarballs for:
  - `@opencode-ai/sdk@1.15.13`
  - `opencode-ai@1.15.13`
  - `@opencode-ai/plugin@1.15.13`

## Official Surface Summary

OpenCode is not a thin in-process model SDK. The documented integration surface
is a headless HTTP server plus generated JS/TS SDK client:

- `opencode serve` starts a local HTTP server.
- `@opencode-ai/sdk` can start a server with `createOpencode()` /
  `createOpencodeServer()` and then use a generated client.
- The server exposes OpenAPI endpoints for health, project/path/config,
  sessions, events, MCP, tools, providers, and TUI control.
- Session prompt APIs accept model, agent, system, per-request `tools`, and
  message parts.
- Event APIs expose SSE streams. The v2 generated types include rich
  `session.next.*` events for text, reasoning, tool input, tool calls, tool
  progress, tool success/failure, retries, compaction, shell start/end, and
  session status.

The documented product surface is a coding agent with project and file-system
awareness:

- Built-in tools include `bash`, `read`, `grep`, `glob`, `edit`, `write`,
  `apply_patch`, `skill`, `todowrite`, `webfetch`, `websearch`, and
  `question`.
- By default, tools are enabled and do not require approval. Permissions can
  allow, ask, or deny actions.
- Config is merged from remote, global, custom path, project `opencode.json`,
  `.opencode` directories, inline config, and managed settings.
- Custom tools are file/plugin based under `.opencode/tools/` or
  `~/.config/opencode/tools/`.
- MCP servers can be configured or added dynamically and then become tools
  alongside built-ins.

## Package Evidence

Commands:

```bash
npm view @opencode-ai/sdk version dist.tarball dependencies peerDependencies bin exports type --json
npm view opencode-ai version dist.tarball dependencies peerDependencies bin exports type --json
npm view @opencode-ai/plugin version dist.tarball dependencies peerDependencies exports type --json
npm pack @opencode-ai/sdk@1.15.13 @opencode-ai/plugin@1.15.13 opencode-ai@1.15.13 --ignore-scripts --json
```

Findings:

- `@opencode-ai/sdk@1.15.13` is ESM and depends only on `cross-spawn`.
- SDK exports include `createOpencode`, `createOpencodeServer`,
  `createOpencodeClient`, and v2 equivalents.
- `createOpencodeServer()` shells out to `opencode serve` and injects inline
  config through `OPENCODE_CONFIG_CONTENT`.
- `opencode-ai@1.15.13` provides the `opencode` binary wrapper and installs
  platform binary packages through optional dependencies.
- `@opencode-ai/plugin@1.15.13` exposes `tool()` with Zod raw-shape args, but
  official custom-tool discovery is file/plugin based. That is not the right
  first SmartPerfetto adapter surface because it would require generating or
  mounting OpenCode tool files.

Important type evidence from the SDK tarball:

- v1 `SessionPromptData.body` supports `messageID`, `model`, `agent`,
  `noReply`, `system`, per-request `tools`, and text/file/agent/subtask parts.
- v2 `session.prompt()` supports `sessionID`, `directory`, `workspace`, `model`,
  `agent`, per-request `tools`, `format`, `system`, `variant`, and parts.
- v2 event types include `session.next.text.delta.1`,
  `session.next.tool.called.1`, `session.next.tool.progress.1`,
  `session.next.tool.success.1`, and `session.next.tool.failed.1`.
- MCP types support local and remote server config plus dynamic `mcp.add()`,
  `mcp.connect()`, and `mcp.disconnect()`.

## Safe Smoke Evidence

Installed into a temp directory only:

```bash
npm install --prefix /tmp/smartperfetto-opencode-install \
  --no-audit --no-fund \
  opencode-ai@1.15.13 @opencode-ai/sdk@1.15.13 @opencode-ai/plugin@1.15.13
```

Binary smoke:

```bash
PATH=/tmp/smartperfetto-opencode-install/node_modules/.bin:$PATH opencode --version
```

Result: `1.15.13`.

Server/config smoke used isolated `HOME`, isolated `OPENCODE_CONFIG_DIR`, temp
workdir, and inline config:

```ts
const opencode = await createOpencode({
  hostname: '127.0.0.1',
  port: 4106,
  timeout: 15000,
  config: {
    autoupdate: false,
    share: 'disabled',
    snapshot: false,
    instructions: [],
    plugin: [],
    mcp: {},
    tools: {
      bash: false,
      edit: false,
      write: false,
      read: false,
      grep: false,
      glob: false,
      apply_patch: false,
      webfetch: false,
      websearch: false,
      skill: false,
      todowrite: false,
      question: false,
    },
    permission: {
      edit: 'deny',
      bash: 'deny',
      webfetch: 'deny',
      external_directory: 'deny',
    },
  },
});
```

Observed:

- Server started and `/global/health` returned `healthy: true`, version
  `1.15.13`.
- `client.config.get()` reflected inline config keys.
- `/experimental/tool/ids` still listed built-in tool IDs even when config
  disabled them. This means a SmartPerfetto adapter must not rely on tool list
  absence as a safety proof. It must pass deny config, per-request allowlists,
  and focused tests proving denied built-ins cannot execute.

No-reply session smoke:

- `session.create()` succeeded.
- `session.prompt(... noReply: true, system, tools: all built-ins false, parts)`
  created a user message without invoking a model.
- `session.messages()` returned one message.

This proves SDK/server lifecycle and session APIs are usable without a model
call, but it does not prove real analysis quality.

## Fit Against SmartPerfetto Runtime Contract

OpenCode should not be modeled as a Claude/OpenAI/Pi-style in-process native
engine. It should be modeled as a server-backed external-orchestrator adapter:

- Native loop owner: OpenCode server.
- SmartPerfetto owner: analysis setup, provider/runtime pinning, shared system
  prompt, trace context, SmartPerfetto MCP tools, event projection, final
  result normalization, claim verification, report, snapshot, and route-owned
  `analysis_completed`.
- Tool transport: standalone/local MCP server is the best first bridge because
  OpenCode's documented custom tools are file/plugin discovered, while MCP can
  be configured or added dynamically.
- Tool schema: MCP JSON Schema from `SharedToolSpec` should be sufficient.
- State/resume: store opaque OpenCode `sessionID` under engine-local snapshot
  state if hidden runtime proceeds.
- Event projection: v2 `session.next.*` events can map to SmartPerfetto
  `progress`, `answer_token`, `tool_call`, `degraded`, and internal diagnostics;
  OpenCode must not emit route-owned `analysis_completed`.

## Required Safety Design For M13

M13 must implement all of these or stop:

- Dynamic optional loading only:
  - explicit SDK module path and CLI path envs, or optional dependencies behind
    hidden gate;
  - no public package dependency in M13.
- Isolated process environment:
  - isolated `HOME`;
  - isolated `OPENCODE_CONFIG_DIR`;
  - controlled temp workdir not equal to the SmartPerfetto repo;
  - inline `OPENCODE_CONFIG_CONTENT` generated by the adapter.
- Deny dangerous built-ins:
  - `permission.edit = deny`;
  - `permission.bash = deny`;
  - `permission.webfetch = deny` unless separately reviewed;
  - `permission.external_directory = deny`;
  - all built-in coding tools disabled in `tools`.
- Disable product-surface drift:
  - `autoupdate: false`;
  - `share: disabled`;
  - `snapshot: false` unless snapshot behavior is explicitly reviewed;
  - `plugin: []`;
  - `instructions: []`;
  - `mcp: {}` initially, then only the SmartPerfetto request-scoped MCP server.
- Per-session restrictions:
  - pass `system` from SmartPerfetto shared prompt builders;
  - pass `tools` with only SmartPerfetto MCP tool names enabled;
  - pass `model` from Provider Manager, not from OpenCode defaults.
- Tests:
  - focused fake SDK tests for config hardening;
  - focused event projection tests;
  - denied built-in tool regression;
  - hidden no-model smoke using `noReply`;
  - scene trace regression for existing runtimes.

## Recommendation

Proceed to M13 hidden runtime, but treat OpenCode as an external-orchestrator
adapter, not a thin in-process SDK runtime.

Public M14 is plausible only if M13 proves:

- built-in file/shell/project-discovery surfaces are blocked;
- only SmartPerfetto request-scoped MCP tools execute;
- startup and scrolling E2E pass with real model configuration;
- HTML reports render cleanly;
- Provider Manager and frontend runtime selection remain clear and reversible;
- root `npm run verify:pr` passes.

If any of those fail, OpenCode should remain hidden or no-go. It should not be
presented as the fourth public agent merely because the SDK/server can start.
