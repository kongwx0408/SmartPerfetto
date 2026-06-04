<!--
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2024-2026 Gracker (Chris)
This file is part of SmartPerfetto. See LICENSE for details.
-->

# SmartPerfetto CLI

[English](cli.en.md) | [中文](cli.md)

SmartPerfetto CLI is the official terminal entry point. Use `smp` or
`smartperfetto` to configure, diagnose, analyze traces, ask follow-up questions,
run SQL, run Skills, export reports, and manage local history without starting
the Web UI.

## Install

```bash
npm install -g @gracker/smartperfetto
```

Node.js 24 LTS is required. The npm CLI package bundles pinned
`trace_processor_shell` prebuilts for Linux x64, macOS arm64, and Windows x64.
On unsupported platforms the CLI downloads the pinned binary; if automatic
download is unavailable, set `TRACE_PROCESSOR_PATH` to an existing local
executable.
The CLI package is the standalone terminal product; it does not start or bundle
the Web UI launcher. Use Docker or a GitHub portable package for the browser
experience.

## Global Options

```text
Usage: smp [options] [command]

Options:
  -V, --version             output the version number
  -f, --file <trace>        trace file to analyze (shortcut for `analyze <trace>`)
  -p, --prompt <question>   analysis prompt (shortcut for --query)
  -q, --query <question>    analysis question (alias for --prompt)
  --session-dir <path>      override session storage root (default: ~/.smartperfetto)
  --env-file <path>         path to explicit .env file (skips default env chain)
  --verbose                 show verbose event stream
  --no-color                disable ANSI colors
  --resume <sessionId>      start the REPL with this session already loaded
  -h, --help                display help for command
```

## Core Workflow

```bash
smp run trace.perfetto-trace "Analyze why startup is slow"
smp ask <sessionId> "Why is RenderThread slow?"
smp repl --resume <sessionId>
```

Compatibility commands remain available:

```bash
smp analyze trace.perfetto-trace --query "Analyze why startup is slow"
smp resume <sessionId> --query "Follow up"
smp list
smp show <sessionId>
smp report <sessionId> --open
smp rm <sessionId>
```

Analysis commands support machine-readable output:

```bash
smp run trace.perfetto-trace "Analyze why startup is slow" --format json
smp resume <sessionId> --query "Follow up" --format ndjson
```

Supported `--format` values: `text`, `json`, `ndjson`.

## Config And Providers

```bash
smp doctor --format text
smp doctor --format json
smp config init
smp config init --force
smp provider list
smp provider list --format json
smp provider test system
smp provider test <providerId> --format json
```

CLI configuration and Web UI configuration are separate entry points. For
first-time CLI setup, run `smp config init`, then edit the printed env file,
usually `~/.smartperfetto/env`. When `--env-file` is not passed, the CLI loads:

1. `backend/.env` from the package or source backend directory.
2. `~/.smartperfetto/env`, which overrides earlier values.

If you pass `--env-file /path/to/env`, the CLI reads only that file. As with
Web/Docker setup, enable only one provider source for first setup: local Claude
login, one Claude-compatible env block, or one OpenAI-compatible env block.

Runtime checks follow the actually selected provider/runtime:

- Claude Agent SDK accepts API keys, Anthropic-compatible proxies, Bedrock,
  Vertex, and local Claude login fallback.
- OpenAI Agents SDK requires `OPENAI_API_KEY` or a local
  `localhost` / `127.0.0.1` / `0.0.0.0` OpenAI-compatible endpoint.
- Ollama providers use the OpenAI-compatible runtime.

The first CLI productization pass does not include `provider add/edit`; key
writing still goes through env files or a later secure interaction design.

## Trace Query And Skills

```bash
smp query trace.perfetto-trace --sql "select count(*) as cnt from slice"
smp query trace.perfetto-trace --sql "select count(*) from slice" --format json

smp skill trace.perfetto-trace startup_slow_reasons
smp skill trace.perfetto-trace startup_slow_reasons --params '{"package":"com.example"}' --format json
```

`query` and `skill` do not start the Web UI. `skill` loads SmartPerfetto's YAML
Skills and SQL fragments.

## Code-Aware Analysis

Register and index a local codebase first, then explicitly expose it to an
analysis session:

```bash
smp codebase preview /path/to/app
smp codebase register /path/to/app --kind app_source --name MyApp --path-filter app/src/main/ --dry-run
smp codebase register /path/to/app --kind app_source --name MyApp --path-filter app/src/main/
smp codebase list
smp codebase reindex cb_xxx
smp codebase symbols MainActivity --codebase-id cb_xxx

smp run trace.perfetto-trace \
  --code-aware metadata_only \
  --codebase-id cb_xxx \
  "Find the startup bottleneck and map it to source code"
```

`metadata_only` exposes only `CodeRef` metadata to the model; raw source text is
not persisted into sessions, reports, or exports. `provider_send` can send
snippets only when the codebase was registered with `--send-to-provider` and the
current analysis also uses `--code-aware provider_send`. If `--codebase-id` is
omitted, the run stays on the trace-only path even when local codebases are
registered. See [Code-Aware Analysis](../getting-started/code-aware-analysis.en.md).

## Trace Comparison

```bash
smp compare current.perfetto-trace reference.perfetto-trace --query "Compare startup differences"
smp compare current.perfetto-trace reference.perfetto-trace --query "Compare jank root causes" --format ndjson
```

`compare` passes the second trace as the reference trace and enables dual-trace
analysis tools in the AI runtime. CLI compare and frontend Raw Trace Compare
share the same comparison identity, evidence pack, report section, and session
snapshot rules; this is not a private CLI prompt. The shared comparison
contract requires metric matrices, phase/hotspot deltas, blocking and scheduling
differences, ruled-out system factors, evidence limits, and next steps instead
of only a duration delta. The shared deterministic SQL evidence covers package,
Perfetto's raw startup_type, duration delta, startup-window top slices, and
main-thread state distribution. Treat startup_type as a raw Perfetto field, not
a second classification; cold/warm conflicts must be called out as evidence
limits in the report body.

## Reports And History

```bash
smp list
smp list --json
smp list --format json
smp show <sessionId>
smp report <sessionId>
smp report <sessionId> --turn 1
smp report <sessionId> --open
smp report export <sessionId> --format html --out report.html
smp report export <sessionId> --turn 1 --format html --out turn-001.html
smp report export <sessionId> --format md --out report.md
smp report export <sessionId> --format json --out report.json
```

CLI files are stored under:

```text
~/.smartperfetto/
├── index.json
├── traces/
└── sessions/<sessionId>/
    ├── config.json
    ├── conclusion.md
    ├── report.html
    ├── transcript.jsonl
    ├── stream.jsonl
    └── turns/
        ├── 001.md
        └── 001.html
```

## Android Capture

`smp capture` records Android system traces from a connected device. It follows
Perfetto's Android/Linux system-tracing model: use the device `perfetto` binary
on Android Q/API 29 and newer, and use a packaged or explicitly supplied
`tracebox` only for older devices or `--sideload`.

```bash
smp capture presets
smp capture config --preset startup --app com.example.app --duration 10 --out startup.pbtxt
smp capture config --preset cpu --app '*' --duration 30 --categories dalvikviktime my_custom_tag --out cpu-custom.pbtxt
smp capture config --preset power --app com.example.app --duration 60 --out power.pbtxt

smp capture android --preset startup --app com.example.app --duration 10 --out launch.perfetto-trace
smp capture android --preset scrolling --app com.example.app --duration 15 --serial <adbSerial> --out scroll.perfetto-trace
smp capture android --preset power --app com.example.app --duration 60 --out power.perfetto-trace
smp capture android --config startup.pbtxt --out launch.perfetto-trace
smp capture android --config template.pbtxt --duration 10 --categories my_custom_tag --out custom.perfetto-trace
smp capture android --preset overview --app com.example.app --duration 10 --kill-stale --out retry.perfetto-trace
smp capture android --preset game --app com.example.game --duration 20 --out game.perfetto-trace --analyze --query "Find launch and frame pacing issues" --mode fast
```

Available presets: `startup`, `scrolling`, `anr`, `game`, `memory`, `cpu`,
`power`, `overview`, and `full`. `power` enables `android.power` battery
counters, power rails, suspend/wakeup ftrace, and `android.network_packets`.
Use `--app '*'` when you intentionally want system-wide
atrace categories instead of app-scoped atrace tags. `--categories` injects
additional atrace tags into generated configs or an existing `ftrace_config`.
Generated configs scale the primary buffer with duration, roughly 8 MB/s clamped
between 64 MB and 512 MB. `--config <pbtxt>` keeps the old
`record_android_trace -c ... -o ...` workflow shape; plain configs pass through,
and templates may contain `{duration_ms}` and `{buffer_size_kb}` placeholders
that are rendered when `--duration` is provided.

Capture preflight checks warn when stale `perfetto` / `simpleperf` / `traced`
processes or SELinux `Enforcing` are detected. `--kill-stale` applies the stale
process cleanup before capture; it is opt-in because it kills tracing services
on the device.

Source checkout example:

```bash
npm --prefix backend run cli:dev -- capture android \
  --config ~/tools/perfetto_shell/perfetto.config \
  --out ~/tools/perfetto_shell/trace/dut-game-launch.ptrace
```

`--analyze` records the trace and immediately starts the normal CLI analysis
session. The captured trace path, target, serial, preset/config, tools, and
`--mode fast|full|auto` metadata are persisted in the session config so the
result can be resumed and audited.

Tool resolution is intentionally offline during capture. `adb` is resolved from
`ADB_PATH`, then an approved bundled slot
`prebuilts/android-platform-tools/<host>/adb`, then `PATH`. Android SDK
Platform-Tools binaries are not blindly redistributed. Sideload capture resolves
device-ABI `tracebox` from `prebuilts/perfetto-recording-tools/android-*/` or
`--tracebox`; missing tools produce explicit override guidance. macOS, Windows,
and Linux hosts can capture Android devices. Linux host system tracing is
reserved for a future `smp capture linux` target.

Pass `--serial` when multiple devices are connected.

## REPL

```bash
smp repl
smp repl --resume <sessionId>
```

REPL commands:

| Command | Purpose |
| --- | --- |
| `/load <trace>` | Load a trace and start analysis |
| `/ask <query>` | Ask against the current session |
| `/resume <sessionId>` | Switch to an existing session |
| `/report` | Print the latest report path |
| `/focus` | Show current session state |
| `/clear` | Clear the terminal |
| `/exit` | Exit |
