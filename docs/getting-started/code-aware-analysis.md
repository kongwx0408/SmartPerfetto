# Code-Aware Analysis

[English](code-aware-analysis.en.md) | [中文](code-aware-analysis.md)

Code-Aware Analysis 让 SmartPerfetto 在分析 trace 时按需引用本机代码库，把调用栈、native frame 或 kernel symbol 映射到 `CodeRef`。默认输出只展示 `chunkId`、相对路径、行号和 symbol；源码正文只通过受 RBAC 保护的 excerpt endpoint 临时读取，不写入 session、报告或导出。

## 启用方式

1. 启动后端：`./start.sh`。
2. 在 Perfetto UI 打开 AI Assistant settings，进入 `Codebases`。
3. 添加代码库并先运行 preview。
4. 注册后执行 reindex。
5. 分析时使用 code-aware 模式，或在 CLI 传入 `--code-aware metadata_only|provider_send` 和 `--codebase-id <id>`。

CLI 示例：

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
  "结合源码定位启动慢原因"
```

如果不传 `--code-aware` 或不传 `--codebase-id`，分析会按普通 trace-only 路径运行；已注册的 codebase 不会自动暴露给某个 session。`provider_send` 只在注册时带 `--send-to-provider` 且本次分析也选择 `--code-aware provider_send` 时允许发送片段。

## 支持的代码库

| kind | 用途 | 必要信息 |
|---|---|---|
| `app_source` | App Java/Kotlin/R8 反查 | root path，可选 build-id / commit / path-filter |
| `aosp` | AOSP framework/native 热路径 | `licenseTag`，推荐 build-id 和 commit |
| `kernel_source` | binder/scheduler/mm/io 等 kernel 根因 | `vendor`，`path-filter` 或 `pathPrefix`，SPDX 或 license tag |
| `oem_sdk` | OEM / chipset SDK 资料 | vendor，license，受相同安全 gate 约束 |

## 安全边界

- `metadata_only`：模型只看到 `CodeRef` 元数据，不看到源码片段。
- `provider_send`：只有注册时同意 `sendToProvider` 的代码库才允许把筛选后的片段发给模型。
- 旧 RAG chunk 不受 code-aware 规则破坏；`app_source`、`kernel_source` 或 `registryOrigin=codebase_registry` 的 chunk 缺少 codebase metadata 时会 fail-closed。
- 旧 `/api/rag/chunks/:id` 和 `/api/rag/search` 对 code-aware chunk 返回 hash/长度等 sanitized 信息，不返回源码正文。
- Patch 只分三态：`verified`、`sketch`、`unverified`。`sketch` 和 `unverified` 不给 copyable diff。

## 验证

常用验证命令：

```bash
cd backend
npm run verify:codebase-aware
```

本机完整 E2E 会使用：

- `test-traces/lacunh_heavy.pftrace`
- `test-traces/launch_light.pftrace`
- `/Users/chris/Code/HighPerformanceFriendsCircle`

E2E 覆盖两条路径：

- 未给 session 配置 codebase：Light trace 正常完成，报告不出现 `CodeRef` / code-aware section。
- 给 session 配置 HighPerformanceFriendsCircle：Heavy/Light trace 正常完成，报告和导出里出现 `CodeRef`，例如 `MainActivity.kt`、`LoadSimulator.kt` 的相对路径与行号；报告不得出现绝对 root path 或源码正文。

缺少本机资产时可用环境变量覆盖：

```bash
SMARTPERFETTO_E2E_HEAVY_TRACE=/path/heavy.pftrace \
SMARTPERFETTO_E2E_LIGHT_TRACE=/path/light.pftrace \
SMARTPERFETTO_E2E_APP_REPO=/path/HighPerformanceFriendsCircle \
npm --prefix backend run verify:codebase-aware
```
