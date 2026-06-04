<!--
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2024-2026 Gracker (Chris)
This file is part of SmartPerfetto. See LICENSE for details.
-->

# SmartPerfetto CLI

[English](cli.en.md) | [中文](cli.md)

SmartPerfetto CLI 是正式的终端入口。用户只需要 `smp` 或
`smartperfetto`，不启动 Web UI，也能完成配置诊断、trace 分析、多轮追问、
SQL 查询、Skill 运行、报告导出和本地历史管理。

## 安装

```bash
npm install -g @gracker/smartperfetto
```

要求 Node.js 24 LTS。npm CLI 包内置 Linux x64、macOS arm64 和 Windows x64
的固定版本 `trace_processor_shell`。如果当前平台没有内置 binary，CLI 会下载
固定版本；下载不可用时可以配置 `TRACE_PROCESSOR_PATH` 指向本机已有可执行文件。
CLI 包是独立终端产品，不启动也不包含 Web UI launcher；需要浏览器体验时使用
Docker 或 GitHub 免安装包。

## 全局选项

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

## 核心工作流

```bash
smp run trace.perfetto-trace "分析启动慢的原因"
smp ask <sessionId> "为什么 RenderThread 慢？"
smp repl --resume <sessionId>
```

兼容旧入口仍然可用：

```bash
smp analyze trace.perfetto-trace --query "分析启动慢的原因"
smp resume <sessionId> --query "继续追问"
smp list
smp show <sessionId>
smp report <sessionId> --open
smp rm <sessionId>
```

分析类命令支持机器可读输出：

```bash
smp run trace.perfetto-trace "分析启动慢的原因" --format json
smp resume <sessionId> --query "继续追问" --format ndjson
```

`--format` 可选值：`text`、`json`、`ndjson`。

## 配置与 Provider

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

CLI 配置文件和 Web UI 配置不是同一个入口。第一次使用 CLI 时，推荐先运行
`smp config init`，然后编辑输出路径里的 env 文件，通常是
`~/.smartperfetto/env`。没有显式传 `--env-file` 时，CLI 读取顺序是：

1. 包内或源码目录的 `backend/.env`。
2. `~/.smartperfetto/env`，覆盖前面的值。

如果传了 `--env-file /path/to/env`，CLI 只读取这个文件。和 Web/Docker 一样，
首次配置只启用一个 provider 来源：本机 Claude 登录态、一个
Claude-compatible env block，或一个 OpenAI-compatible env block。

Runtime 判断按实际选择的 provider/runtime 执行：

- Claude Agent SDK：允许 API key、Anthropic-compatible proxy、Bedrock、
  Vertex，也允许本地 Claude 登录态 fallback。
- OpenAI Agents SDK：需要 `OPENAI_API_KEY`，或本地
  `localhost` / `127.0.0.1` / `0.0.0.0` OpenAI-compatible endpoint。
- Ollama provider 默认走 OpenAI-compatible runtime。

第一轮 CLI 不提供 `provider add/edit`，涉及密钥写入的交互配置仍由 env 文件
或后续安全交互设计处理。

## Trace 查询与 Skill

```bash
smp query trace.perfetto-trace --sql "select count(*) as cnt from slice"
smp query trace.perfetto-trace --sql "select count(*) from slice" --format json

smp skill trace.perfetto-trace startup_slow_reasons
smp skill trace.perfetto-trace startup_slow_reasons --params '{"package":"com.example"}' --format json
```

`query` 和 `skill` 不需要启动 Web UI。`skill` 会加载 SmartPerfetto 内置
YAML Skills 和 SQL fragments。

## Code-Aware Analysis

先注册并索引本机代码库，再在分析 session 中显式选择 code-aware 模式：

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
  "结合源码定位启动慢原因"
```

`metadata_only` 只把 `CodeRef` 元数据暴露给模型；源码正文不会进入 session、
报告或导出。`provider_send` 只有在注册 codebase 时使用 `--send-to-provider`
并且本次分析也选择 `--code-aware provider_send` 时才允许发送片段。不传
`--codebase-id` 时，即使本机已有注册代码库，本次分析也按 trace-only 路径运行。
完整说明见 [Code-Aware Analysis](../getting-started/code-aware-analysis.md)。

## 双 Trace 对比

```bash
smp compare current.perfetto-trace reference.perfetto-trace --query "对比启动阶段差异"
smp compare current.perfetto-trace reference.perfetto-trace --query "对比卡顿根因" --format ndjson
```

`compare` 会把第二个 trace 作为 reference trace 传给 AI runtime，启用双 trace
分析工具。CLI 和前端 Raw Trace Compare 共享同一套对比 identity、evidence pack、
报告 section 和 session snapshot 规则；不是 CLI 私有 Prompt。共享对比合约要求
报告包含指标矩阵、阶段/热点差异、阻塞与调度差异、系统因素排除、证据限制和
下一步建议，避免只输出耗时差值。共享确定性 SQL 证据至少覆盖 package、Perfetto
原始 startup_type、dur delta、启动窗口 top slices 和主线程状态分布。startup_type
是原始字段，不等同于二次判定；如果 cold/warm 口径与 trace 信号冲突，报告正文
必须列为证据限制。

## 报告与历史

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

CLI 文件存储在：

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

## Android 采集

`smp capture` 用于从已连接 Android 设备录制系统 trace。实现方式遵循
Perfetto 的 Android/Linux system tracing 路线：Android Q/API 29 及以上优先使用
设备内置 `perfetto`，更老设备或显式 `--sideload` 才使用已打包或手动指定的
`tracebox`。

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
smp capture android --preset game --app com.example.game --duration 20 --out game.perfetto-trace --analyze --query "分析启动和帧节奏问题" --mode fast
```

内置预设包括：`startup`、`scrolling`、`anr`、`game`、`memory`、`cpu`、
`power`、`overview`、`full`。`power` 会开启 `android.power` 的 battery
counters、power rails、suspend/wakeup 相关 ftrace 和 `android.network_packets`。
需要系统级 atrace category 而不是 app-scoped atrace tag
时，可以显式传 `--app '*'`。`--categories` 可以把额外 atrace tag 注入到生成
配置或已有 `ftrace_config` 中。生成配置会按 duration 自动放大主 buffer，规则约为
8 MB/s，并限制在 64 MB 到 512 MB 之间。`--config <pbtxt>` 保留旧
`record_android_trace -c ... -o ...` 的使用形态；普通配置原样传入，模板配置支持
`{duration_ms}` 和 `{buffer_size_kb}` 占位符，传 `--duration` 后会渲染。

抓取前会检查 stale `perfetto` / `simpleperf` / `traced` 进程和 SELinux
`Enforcing` 状态并给出提示。`--kill-stale` 会在抓取前清理残留 tracing 进程；它会杀
设备上的 tracing 服务，所以保持显式 opt-in。

源码 checkout 示例：

```bash
npm --prefix backend run cli:dev -- capture android \
  --config ~/tools/perfetto_shell/perfetto.config \
  --out ~/tools/perfetto_shell/trace/dut-game-launch.ptrace
```

传 `--analyze` 后会先录制 trace，再立即进入普通 CLI 分析 session。捕获到的
trace 路径、target、serial、preset/config、工具来源和 `--mode fast|full|auto`
会写入 session config，便于后续 resume 和审计。

抓取阶段不会现场下载工具。`adb` 按 `ADB_PATH`、已批准的包内 slot
`prebuilts/android-platform-tools/<host>/adb`、`PATH` 的顺序解析；Android SDK
Platform-Tools binary 不会被直接盲目再分发。需要 sideload 时，CLI 会按设备 ABI
查找 `prebuilts/perfetto-recording-tools/android-*/tracebox`，也可以通过
`--tracebox` 显式指定；缺失时会给出明确 override 提示。macOS、Windows、Linux
宿主机都可以抓 Android 设备；Linux 宿主机 system tracing 预留给后续
`smp capture linux` target。

当连接多个设备时必须传 `--serial`。

## REPL

```bash
smp repl
smp repl --resume <sessionId>
```

REPL 内部命令：

| 命令 | 作用 |
| --- | --- |
| `/load <trace>` | 加载 trace 并开始分析 |
| `/ask <query>` | 对当前 session 追问 |
| `/resume <sessionId>` | 切换到已有 session |
| `/report` | 打印最新 report 路径 |
| `/focus` | 显示当前 session 状态 |
| `/clear` | 清屏 |
| `/exit` | 退出 |
