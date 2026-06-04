# Codebase-Aware Analysis Feature Plan

**Status**: **v3.10 (release gates complete; source packaging resolved)**
**Owner**: TBD
**Created**: 2026-05-21
**Builds on**: Plan 55 RAG (lookup_blog_knowledge / lookup_aosp_source / lookup_oem_sdk, RagStore, ragAdminRoutes), Plan 44 (project_memory / world_memory), Plan 54 (case_library)
**Related**: `.claude/rules/prompts.md`, `.claude/rules/skills.md`, `.claude/rules/backend.md`, `.claude/rules/release.md`

## Revision history

| Ver | Date | 主要变化 |
|-----|------|----------|
| v1 | 2026-05-21 | 初稿 |
| v2 | 2026-05-21 | Codex round 1 全部吸收：RagChunk `snippet`、6 个既有 RagSourceKind、consent/redaction 移至共享 MCP handler、新增 §6.7/§6.8/§10.4、M2 拆 a/b/c、redaction 提前到 M1、budget token-based、Verifier 条件化、AnalysisOptions 传播矩阵 |
| v3 | 2026-05-21 | Codex round 2 全部吸收：(P0) 新增 §9.2 endpoint RBAC 矩阵；新增 §6.11 ToolResultProjectionFilter 把 LLM-visible payload 与 SSE/log/event/telemetry payload 双轨过滤；(P1) §6.9 拆出 SanitizedRagHit / SanitizedSymbolResolution / PatchProposalResponse 独立 schema；filter 区分 legacy knowledge vs user codebase chunks（旧 Plan 44/54/55 不回归）；明确 recall_project_memory / recall_similar_case 不接 code-aware filter；新增 §6.10 CodeLookupLedger（运行时）与 snapshot 分离；§6.8 build-id 缺失硬降级到 `symbol_only_low_confidence`；§6.5 patchStatus 三态，apply-check 失败不再返回 copyable diff；§10.4 PathSecurityGate 改 `path.relative()` 语义；§7.2 新增 `requires_codebase_permission` MCP exposure 等级；§10.5 dev env var 双开关；§15 隐私验收升级为多轴 canary fixture |
| v3.1 | 2026-05-21 | Codex round 3 全部吸收：(P0) **§6.12 新增 LLM-Echo Discipline**：默认 Option B —— 最终回答/报告/snapshot/export 只允许出现 `chunkId + file:line + symbol + lineRange`，**禁止出现源码文本**；UI 点击 "查看代码" 时走 RBAC 拉 excerpt 但不落任何持久化；strategy/code-aware.template.md 加 golden tests 锁定模型输出纪律；canary fixture 验收升级为 **LLM-echo 全链路 0 命中**（含 final answer / report / export / localStorage / analysisResultSnapshot）；(P0) **§6.9 legacy 判定改 fail-closed**：`kind ∈ {app_source, kernel_source}` 或 registry-origin 的 chunk 缺 codebaseId → `unsupportedReason='invalid_codebase_metadata'` + audit error；不再 fail-open；(P1) §6.10 ledger 改 **append-only 持久化 sidecar**（crash-safe）+ 缺 durable ledger 时拒绝 SDK session reuse；(P1) §7.2 mcpToolRegistry 新增 **request-scoped `listForRequest` / `buildAllowedTools` / `getAci`** 接口；runtime 禁止裸 list()；新增 capability probe；(P1) §6.11 改为 **dual-payload sidecar contract**：MCP handler 返回时同时写 sidecar，所有持久化路径只取 sidecar；(P1) propose_patch tool 层 fail-fast：跨多个 codebaseId 直接 rejected；(P1) §8 code-aware.template.md 增加 golden tests 锁定 symbol_only_low_confidence / sketch / unverified 三态对应的模型纪律；(P2) §15 canary fixture 规范化（nonce / JSON/Markdown/HTML 安全 / 跨行 / 短串长串）；§16 R18/R20 升级影响；§19 已结 Q1/Q3/Q4/Q6 |
| v3.2 | 2026-05-21 | Codex round 4 全部吸收（P0 已清零；本轮主要修 P1）：(P1) **§6.13 新增 LLMEchoOutputFilter** 服务端 streaming output gate —— 在 token 流出前用本 turn ephemeral snippet registry 做 exact/line/substr 匹配，命中替换为 `CodeRef` 或 redacted placeholder；strategy+Verifier 从此变成"事后兜底"，主防线是这个服务端 gate；(P1) §6.11 sidecar key 改为 **namespaced + fail-closed**：`{sessionId}:{runId}:{runtime}:{toolUseId\|callId}`，`getSidecar()` missing 对 code-aware tool 直接写 projected error 不降级；(P1) **全文清理 v3 残留 fail-open 表述**：§5.1 / §7.1 / §10.6 / §12 checklist 等多处统一改成"双因子 fail-closed"；(P1) §6.9 新增 `registryOrigin` migration/backfill 规则与回归验收；(P2) §15 补充 fsync p95 latency / UI excerpt cleanup hook / 额外 canary 路径（access logs / frontend console / metrics / Skill execution log / crash dump）；§19 已结 Q9（namespacing）；M0/M1/M3 checklist 补齐 v3.1+v3.2 新基础设施 |
| v3.3 | 2026-05-21 | Codex round 5 全部吸收（P0 已清零；本轮仅 2 P1）：(P1) **§6.13 升级为 stateful `LLMEchoOutputStream`**：rolling buffer + automaton 持续 state + 延迟释放安全窗口；解决跨 token chunk echo 漏拦（如 `__SP_CA` + `NARY_...` 切分）；`hits` 返回 hash/kind/codeRef/replacement，**绝不**返回 raw matched snippet；新增跨 2-5 token chunk 拆分场景 + 中文 token 边界单测；(P1) §6.11 新增 **sidecar correlation 机制**：runtime wrapper 在调用 handler 前显式注入 call context；OpenAI runtime 通过 `callId→invocationId` 映射闭环；新增 Claude/OpenAI 并行 tool call + multi-run + resume replay 测试；(P2) §6.9 backfill 加 `.bak` 备份 + dry-run + schemaVersion + 失败 readonly degraded fallback；§10.6 / §6.10 / R18 清理 v3 旧表述指向新设计；§15 14+ 路径加 "源码 grep 锚点 + 测试名" 列；§6.13 加 replacement stats 日志（不含 raw）方便 false-positive 调试；§12 M1 预算 5-6 天 → 6-7 天加 1 天 buffer |
| **v3.4** | **2026-05-21** | **Codex round 6 LGTM-with-followups（封版）**。0 P0 + 0 P1 + 6 P2 全部应用：(P2-1) §6.13 加 stream 异常生命周期 `try/finally destroy` + abort 丢 buffer + SSE reconnect 只 replay 已过滤事件；(P2-2) §6.11 显式标注 OpenAI Assistants API out-of-scope（Phase 1 仅 Responses / chat-completions），alias map 加 TTL + run end cleanup；(P2-3) §6.9 migration 补文件系统细节：`.tmp` 同目录 / rename 前后 fsync file+dir / 迁移前估算可用空间 / 跨设备 rename (EXDEV) 失败进入 readonly degraded；(P2-4) §15 锚点表区分"已存在" vs "新增 wrapper / N.A. current"；(P2-5) §10.6 新增 `no-raw-codeaware-payload` ESLint custom rule 强制约束；(P2-6) 清理 §6.10 "同步 fsync append" → "per-session fsync queue"、§6.13 writer 表 `scanOutgoing` → `LLMEchoOutputStream.write/flush`、§15 主防线表述指向 §6.13。封版可开工。 |
| **v3.5** | **2026-05-21** | Codex implementation-readiness review（5 轮）后修正：现有 `/api/rag/stats` / `/chunks/:id` / `/search` / `DELETE /chunks/:id` 纳入 RBAC + code-aware sanitized response；修正真实路径 `AnalysisOptions=backend/src/agent/core/orchestratorTypes.ts`、frontend types generator=`backend/scripts/generateFrontendTypes.ts`、export surfaces=`backend/src/routes/reportRoutes.ts` / `comparisonRoutes.ts` / `exportRoutes.ts` / `backend/src/cli-user/commands/report.ts`；清理 `scanOutgoing` 和同步 fsync 残留；新增 Heavy/Light + `/Users/chris/Code/HighPerformanceFriendsCircle` 固化 E2E 验收；详见 `review-rounds.md`。 |
| **v3.6** | **2026-05-21** | Phase 1 implementation pass：补齐 AOSP/native/kernel ingestion、symbol resolver、TraceSymbolContext、`lookup_kernel_source`、`propose_patch`、PatchProposer 三态、CLI `smp codebase --dry-run`、code-aware strategy/Skill、HTML report CodeRef/patchStatus 渲染、Perfetto UI Codebases panel/form/audit view、frontend in-memory excerpt cache、Heavy/Light + HighPerformance + synthetic AOSP/kernel E2E script、M4 docs/rules/release notes。 |
| **v3.7** | **2026-05-21** | Verification closeout：M0/M1/M2/M3/M4 checklist 与实现状态同步；通过 focused backend tests、frontend typecheck + unit tests、dev-mode browser smoke + `./scripts/update-frontend.sh`、`codebase:e2e` source/dist、scene trace regression 6/6、root `npm run verify:pr`。真实模型 5 次抽样仍作为 release-only gate。 |
| **v3.8** | **2026-05-21** | E2E tighten：`codebase:e2e` 不再只验证 fake conclusion；在无 session codebase 时断言 Light trace 正常完成且无 CodeRef，在配置 HighPerformanceFriendsCircle codebase 时通过真实 RAG/SymbolResolver 解析 `MainActivity.kt` / `LoadSimulator.kt` / `LaunchConfig.kt` / `LoadConfig.java` CodeRef，并断言 HTML/MD/JSON export 不含绝对 rootPath / raw source。同步 CLI session config 持久化 `codeAwareMode`/`codebaseIds` 与用户配置文档入口。 |
| **v3.9** | **2026-05-21** | Release-readiness loop：新增 `verify:codebase-aware` 作为本机 code-aware 发布门禁，串起 strategy/skill/typecheck、focused Codebase/CodeRef 单测、source+dist Heavy/Light E2E；`verifyAgentSseScrolling.ts` 支持 `--code-aware` / `--codebase-id` / conclusion text allow/deny assertions，用于真实模型 HTTP Agent SSE code-aware 抽样。 |
| **v3.10** | **2026-05-21** | Final release-readiness loop：真实模型 HTTP Agent SSE code-aware 抽样 5/5 通过（1 次完整 Heavy + 4 次 source-lookup smoke），均实际调用 `list_codebases` / `resolve_symbol` / `lookup_app_source`，并断言 SSE conclusion / analysis_completed 不含绝对 rootPath / raw source；report/export 泄露断言由 source+dist `verify:codebase-aware` 覆盖。修复两处发布前缺口：`verifyAgentSseScrolling.ts --require-code-ref` 从字面量检测升级为语义 CodeRef 检测并支持 `--require-tool`；code-aware MCP tools 统一规范化可选字符串参数中的 `"null"` / `"undefined"` / `"none"`，避免真实模型传参导致源码解析漏命中。源码发布 packaging 已闭环：Perfetto UI 子模块提交 `a83c9a78d9` 已推送到 fork，root gitlink 与 `frontend/v55.2-a83c9a78d` prebuild 对齐，并重新通过 `npm run verify:pr`。已知非阻塞残留：source-lookup smoke 可能被 generic teaching classifier 命中 waiver，但工具链与 CodeRef 输出已被独立断言覆盖。 |

---

## 1. 背景与目标

### 1.1 当前能力边界

SmartPerfetto 当前的 AI 分析能力链条：

```
trace.pftrace → trace_processor → Skill (SQL) → DataEnvelope → Agent → 自然语言结论
```

Plan 55 RAG 已索引 `androidperformance.com` / AOSP / OEM SDK；Plan 44 把 `project_memory` / `world_memory` 暴露为 RAG 源；Plan 54 暴露 `case_library`。**`RagSourceKind` 是 6 元 union**。

但根因结论与代码本体之间还隔一层：
- 结论指 `DrawFrameTask::run()` 但未给出 AOSP 哪一行代码
- App 调用栈被 ProGuard 混淆 `a.b.c.d()` 无法反查
- Native 帧只有 PC 偏移 / build-id，无 source file:line
- 修复建议是泛化文字，无具体 patch

### 1.2 目标（Phase 1）

让 SmartPerfetto 按需访问用户配置的代码库，把性能现象映射到 file:line + 源码摘录 + diff 修复建议。

四类一等公民代码库：

| 代码库 | 主要用途 | 典型符号源 |
|--------|----------|------------|
| App 源码（用户项目） | App 调用栈反查 / 业务热路径定位 | R8 mapping.txt（含 inline frame / line range） |
| AOSP framework + native | Framework 调度 / HWUI / SurfaceFlinger 根因 | AOSP build-id + symbols.zip / breakpad / DWARF |
| Linux kernel（含 vendor fork） | binder / scheduler / mm / io 根因 | kallsyms / System.map / vmlinux build-id |
| OEM/芯片厂商 SDK | MTK/Qualcomm/华为 BSP/HAL 策略 | 厂商提供的 symbols（可选） |

### 1.3 非目标

- 自动 apply patch / 创建 git 分支 / 推 PR
- 跨用户共享 RAG 索引（per-project local）
- 闭源 binary 反编译
- kernel patch 编译 / 启动验证
- 替换 Plan 55 RAG
- 远程代码仓库直连（GitHub/Gerrit API）

---

## 2. 用户故事

### 2.1 主故事：scrolling 卡顿 → 代码级根因

```
1. Codebase Config Panel 配置（每条都必经 dry-run preview）:
   - App: /Users/me/MyApp/  (mapping.txt + build-id auto-detect)
   - AOSP: /opt/aosp-15-r3/ (pinned commit abc123)
   - Kernel: /opt/kernel-mtk-6.6/ (vendor: MediaTek, pathFilter required)
2. 上传 trace.pftrace 提问"为什么这段滑动卡？"
3. Agent 跑 scrolling Skill → 拿到 RenderThread native frame
4. Agent 调 resolve_symbol(frame, build_id) → 通过 SymbolResolver 拿 file:line
5. Agent 调 lookup_aosp_source(symbol="DrawFrameTask::run") → 源码 chunk
6. Agent 调 lookup_app_source 反查 R8 mapping → 定位 HomeFragment.onScroll:88
7. 用户问"给个修复建议"
   → propose_patch({contextChunkIds:[chunkA,chunkB], problem:"..."})
   → 强约束链：prior-lookup 校验 + diff hunk vs chunk lineRange + target-root git apply --check
   → 通过 → patchStatus='verified'，UI 渲染 copyable diff
   → 失败 → patchStatus='sketch'，UI 仅显示 rationale，不给 Copy 按钮
8. 报告呈现：根因 → file:line + 源码 → diff（或 sketch）
```

### 2.2 副故事：kernel binder 长尾

```
1. trace 显示 binder transaction P99 > 12ms
2. Agent 调 resolve_symbol(addr=0xFFFFA0..., vendor=mtk) → vmlinux symbol
3. Agent 调 lookup_kernel_source({subsys:"drivers/android/binder", vendor:"mtk", symbolExact:"binder_wait_for_work"})
4. 返回 drivers/android/binder.c 源码
5. propose_patch（同上强约束）
```

### 2.3 副故事：App 启动慢 + ProGuard 混淆

```
1. trace 中 Application.onCreate → a.b.c.d()
2. Agent 检测 App codebase + mapping.txt 存在
3. resolve_symbol({obfuscated:"a.b.c.d", linenum:12, buildId:"..."})
   → R8 retrace → com.myapp.di.AppModule.provideRetrofit:34（含 inline）
4. lookup_app_source 拉 provideRetrofit 周围代码
5. 业务级根因 + diff
```

### 2.4 降级故事：trace 无 build_id（v3 新增）

```
1. 老设备 trace 帧只有 module name，无 build_id
2. resolve_symbol(frame_only_module) → SymbolResolver 返回
   { resolution: 'symbol_only_low_confidence', symbol?, file: undefined, line: undefined,
     unsupportedReason: 'build_id_missing_cannot_pin_codebase' }
3. Agent 必须告知用户"无 build_id，无法定位代码"，禁止后续 file:line / patch
4. Verifier 检测到此降级 → 不强制 code reference completeness
```

---

## 3. 与 Plan 55 / 44 / 54 RAG 的关系

### 3.1 严格扩展原则

| 现有资产 | 处理方式 |
|----------|----------|
| `RagChunk` (`backend/src/types/sparkContracts.ts:1359`) | 追加可选字段（filePath / lineRange / symbol / language / commitHash / vendor / buildId / codebaseId），不动既有字段 `snippet`/`kind`/`chunkId`/`uri`/`license`/`indexedAt`/`unsupportedReason` |
| `RagSourceKind` | 保留 6 个既有 + 新增 `'app_source'` / `'kernel_source'` |
| `RagStore` 接口 | 扩展 search options（§6.7），存储接口不动；旧 search 行为保留 |
| 三个 lookup_* MCP 工具 | 保留签名；内部 retrofit 走 LookupResponseFilter（legacy 分支不变行为） |
| ingester 三件套 | M0.5 重构（前置 golden tests） |
| ragAdminRoutes | 新增 codebases endpoints；旧端点 + RBAC（§9.2） |
| `recall_project_memory` / `recall_similar_case` (Plan 44/54) | **不接 code-aware filter**；走各自既有 redaction policy |
| License gate | 复用 `LICENSE_REQUIRED_KINDS`；`kernel_source` 必须 GPL/MIT/BSD |
| scopedKnowledgeStore | 复用 SQLite 分片 |

### 3.2 完全新增的子系统

| 子系统 | 文件 | 职责 |
|--------|------|------|
| `CodebaseRegistry` | `backend/src/services/codebase/codebaseRegistry.ts` | 用户配置代码库 CRUD；enterprise→scopedStore，legacy→JSON |
| `PathSecurityGate` | `backend/src/services/codebase/pathSecurityGate.ts` | allowlist / `path.relative()` 边界 / exclude / size cap / dry-run |
| `SymbolResolver` | `backend/src/services/symbol/symbolResolver.ts` | R8 retrace / kallsyms / DWARF / breakpad 符号解析（与 RAG 解耦） |
| `TraceSymbolContext` | `backend/src/services/symbol/traceSymbolContext.ts` | 从 Perfetto profile/stack 表取 build-id/module/PC，匹配 codebase |
| `IngesterBase` | `backend/src/services/rag/baseIngester.ts` | M0.5 重构 |
| `AppSourceIngester` | `backend/src/services/rag/appSourceIngester.ts` | App 源码索引 |
| `KernelSourceIngester` | `backend/src/services/rag/kernelSourceIngester.ts` | kernel 源码索引（含 vendor + SPDX） |
| `PatchProposer` | `backend/src/services/codebase/patchProposer.ts` | 强约束 diff 生成 + 三态 patchStatus |
| `LookupResponseFilter` | `backend/src/services/rag/lookupResponseFilter.ts` | **共享**，MCP handler 返回前对 LLM-visible payload 过 consent/license/redaction/budget |
| `ToolResultProjectionFilter` | `backend/src/services/rag/toolResultProjectionFilter.ts` | **v3 新增**，对 SSE / session log / event store / conversationSteps / telemetry 的 payload 投影过滤；与 LookupResponseFilter 独立 |
| `CodeLookupLedger` | `backend/src/services/codebase/codeLookupLedger.ts` | **v3 新增**，运行时 ledger（不是 snapshot）记录 lookup turn / chunkId / consent / budget；agentTurn 结束时投影摘要到 snapshot |

---

## 4. 架构总览

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          User / Plugin UI                                  │
│  ┌──────────────────────────┐   ┌──────────────────────────────────────┐  │
│  │ Codebase Config Panel    │   │ Report viewer w/ diff blocks         │  │
│  │ + dry-run preview        │   │  - 'verified' → copyable             │  │
│  │ + audit view             │   │  - 'sketch' → rationale only         │  │
│  │ (RBAC enforced)          │   │  - 'unverified' → hide patch         │  │
│  └──────────────────────────┘   └──────────────────────────────────────┘  │
└──────────────┬────────────────────────────────────┬───────────────────────┘
               │ require codebase:manage / rag:admin│ SSE
               ▼                                    │
┌─────────────────────────────┐                     │
│  ragAdminRoutes + RBAC      │                     │
│  + per-endpoint scope check │                     │
│  + tenant ownership         │                     │
└───────┬─────────────────────┘                     │
        │                                           │
        ▼                                           │
┌─────────────────────────────┐                     │
│  PathSecurityGate           │                     │
│  - allowlist                │                     │
│  - path.relative() boundary │                     │
│  - exclude + size cap       │                     │
│  - extension allowlist      │                     │
└──┬──────────────────────────┘                     │
   │                                                │
   ▼                                                │
┌─────────────────────────────┐                     │
│  CodebaseRegistry           │                     │
└──┬──────────────────────┬───┘                     │
   │                      │                         │
   │ ingest               │ session init            │
   ▼                      ▼                         │
┌──────────────┐  ┌─────────────────────────────┐  │
│  Ingesters   │  │  SessionStateSnapshot       │  │
│  (M0.5 base) │  │  + codeAwareMode            │  │
└───────┬──────┘  │  + configuredCodebases[]    │  │
        │         │  + codebaseConsentHashes    │  │
        ▼         │  + ragLookupBudgetSummary   │  │
┌──────────────┐  └─────────────┬───────────────┘  │
│  RagStore    │                │                  │
│ +新元数据    │                ▼                  │
│ +metafilter  │  ┌─────────────────────────────┐  │
└──────┬───────┘  │  CodeLookupLedger (运行时)  │  │
       │          │  - lookup turn 记录          │  │
       │          │  - consent / budget 状态     │  │
       │          │  - prior-lookup 验证依据    │  │
       │          │  - 完成后投影到 snapshot     │  │
       │          └─────────────┬───────────────┘  │
       │                        │                  │
       │          ┌─────────────▼───────────────┐  │
       │          │  ClaudeRuntime/OpenAIRuntime│  │
       │          │   + 共享 MCP handlers       │  │
       │          └─────────────┬───────────────┘  │
       │                        │                  │
       │                        ▼                  │
       │          ┌─────────────────────────────┐  │
       │          │  MCP handler return path    │  │
       │          │  ──────────────────────────  │  │
       │          │  LookupResponseFilter        │  │
       │          │  → SanitizedRagHit /         │  │
       │          │    SanitizedSymbolResolution │  │
       │          │    / PatchProposalResponse   │  │
       │          │  (LLM-visible payload only)  │  │
       │          └─────────┬─────────┬──────────┘  │
       │                    │         │             │
       └───────►            │         │             │
       SymbolResolver  ─────┘         │             │
       (R8/kallsyms/DWARF*M2c)        │             │
       ┌──────────────┐               │             │
       │ TraceSymbol  │               │             │
       │  Context     │ ──────────────┘             │
       └──────────────┘               │             │
                                      ▼             │
       ┌──────────────────────────────────────┐    │
       │  ToolResultProjectionFilter (v3)     │    │
       │  - 对 SSE / agent_response.result    │    │
       │  - 对 session jsonl                   │    │
       │  - 对 event store                     │    │
       │  - 对 conversationSteps               │    │
       │  - 对 telemetry / RAG audit log       │    │
       │  把 snippet 抹掉，只留 metadata + hash│    │
       └──────────────┬───────────────────────┘    │
                      │                             │
                      ▼                             │
       ┌──────────────────────────────────────┐    │
       │  PatchProposer                       │    │
       │  - prior chunkIds 校验（ledger 查）  │    │
       │  - diff hunk vs chunk lineRange      │    │
       │  - git apply --check @ target root   │    │
       │  - patchStatus: verified/sketch/     │    │
       │    unverified                        │    │
       └──────────────┬───────────────────────┘    │
                      │                             │
                      ▼                             │
       ┌──────────────────────────────────────┐    │
       │  Report generator                    │────┘
       │  + diff renderer (status-aware)      │
       └──────────────────────────────────────┘
```

### 4.1 关键数据流

**Ingest 路径**：
```
authenticate + codebase:manage 权限 → PathSecurityGate.preview()
  → dry-run 返回文件清单
  → user confirms
authenticate + codebase:manage → CodebaseRegistry.register()
  → 异步 Ingester.ingest()
  → 写 RagStore + SymbolResolver 索引
```

**Analyze 路径**：
```
POST /api/agent/v1/analyze { codeAwareMode: true }
  → agentRoutes whitelist → AnalysisOptions
  → AgentAnalyzeSessionService.prepareSession
    → 取 eligible codebases
    → 写 snapshot consent hashes / indexGen
    → 初始化 CodeLookupLedger
  → Runtime 注入 code-aware prompt
  → Agent: resolve_symbol → lookup_<kind> → propose_patch
  → 每个 MCP handler 返回前：LookupResponseFilter（LLM 可见）
  → 返回后进入 SSE / event / log 链路：ToolResultProjectionFilter（snippet 抹除）
  → 同时 CodeLookupLedger 记录本次 lookup
  → Resume 时 snapshot 携带 ledger 摘要 + consent hash + indexGen 验证
```

---

## 5. 数据模型扩展

### 5.1 `RagChunk` 扩展（追加可选字段）

```typescript
export interface RagChunk {
  // 既有（不动）
  chunkId: string;
  kind: RagSourceKind;          // 8 个值（6 既有 + 2 新增）
  uri: string;
  title?: string;
  snippet: string;              // 字段名严格匹配现契约
  embedding?: number[];
  tokenCount?: number;
  license?: string;
  indexedAt: number;
  author?: string;
  verifiedAt?: number;
  unsupportedReason?: string;

  // 新增（M0，可选，向后兼容）
  filePath?: string;
  lineRange?: { start: number; end: number };
  symbol?: string;
  language?: 'cpp' | 'c' | 'java' | 'kotlin' | 'rust' | 'unknown';
  commitHash?: string;
  vendor?: string;
  buildId?: string;
  codebaseId?: string;          // user codebase 注册产生的 chunk 必填；legacy 不写。**仅缺 codebaseId 不足以判定 legacy** —— 见 §6.9 双因子 fail-closed
  registryOrigin?: 'codebase_registry' | 'legacy_plan55' | 'plan44_memory' | 'plan54_cases';  // v3.2 新增；持久化时强制写入
}

export type RagSourceKind =
  | 'androidperformance.com' | 'aosp' | 'oem_sdk'
  | 'project_memory' | 'world_memory' | 'case_library'
  | 'app_source' | 'kernel_source';
```

**契约测试**（M0 验收）：
- 反序列化 v1 旧 chunk（无新字段、无 codebaseId）必须通过 + filter 不破坏其行为
- `ALL_RAG_SOURCE_KINDS` 同步扩展到 8 个
- `getStats()` 对 8 个 kind 全返回
- Plan 44/54/55 现有测试 100% pass

### 5.2 `CodebaseRef` / `CodebaseRefSummary`

```typescript
export interface CodebaseRef {
  codebaseId: string;
  kind: 'app_source' | 'aosp' | 'kernel_source' | 'oem_sdk';
  displayName: string;
  rootPath: string;             // **后端持有，绝不下发 agent / list_codebases**
  rootRealpath: string;
  commitHash?: string;
  vendor?: string;
  buildId?: string;
  pathFilters?: string[];
  excludeGlobs?: string[];
  symbolMapPaths?: string[];
  licenseTag?: string;
  consent: {
    sendToProvider: boolean;
    consentedAt: number;
    consentedBy: string;
    consentHash: string;
  };
  indexGeneration: number;
  lastIngestAt?: number;
  lastIngestStatus?: 'ok' | 'partial' | 'failed' | 'blocked_by_security';
  lastIngestError?: string;
  chunkCount?: number;
  blockedFileCount?: number;
  redactionHitCount?: number;
  createdAt: number;
  updatedAt: number;
}

// list_codebases / agent-visible
export interface CodebaseRefSummary {
  codebaseId: string;
  kind: CodebaseRef['kind'];
  displayName: string;
  commitHash?: string;
  vendor?: string;
  buildId?: string;
  indexGeneration: number;
  chunkCount: number;
  eligibleForSendToProvider: boolean;
}
```

### 5.3 `SessionStateSnapshot` 扩展

```typescript
export interface SessionStateSnapshot {
  // 既有...

  // 新增（仅 durable 摘要；运行时 ledger 见 §6.10）
  codeAwareMode?: boolean;
  configuredCodebases?: CodebaseRefSummary[];
  codebaseConsentHashes?: Record<string, string>;
  ragLookupBudgetSummary?: {
    capTokens: number;
    finalUsedTokens: number;
    capPatches: number;
    finalUsedPatches: number;
  };
  codeLookupSummary?: {                   // 完成后从 ledger 投影
    lookupCount: number;
    patchCount: number;
    referencedCodebaseIds: string[];      // 不存 chunkId（隐私）
  };
}
```

Resume invariant：consentHash / indexGeneration 不匹配 → 拒绝复用 SDK session。

### 5.4 AnalysisOptions 传播

新字段 `codeAwareMode` 必须沿以下路径全传（acceptance 矩阵）：

| 入口 | 解析点 | whitelist |
|------|--------|-----------|
| HTTP body | `agentRoutes.ts:~1045` 解构 | `~1093` 显式 destructure |
| AnalysisOptions interface | `backend/src/agent/core/orchestratorTypes.ts` | 新增 field |
| ClaudeRuntime.analyze | `agentRoutes.ts:~1249` | 显式传 |
| OpenAIRuntime.analyze | 同上 | 显式传 |
| CLI `smp ask` / `smp run` | `backend/src/cli/` | `--code-aware` flag |
| SSE / generated frontend types | `backend/scripts/generateFrontendTypes.ts` (`cd backend && npm run generate:frontend-types`) | 重生成 |
| SessionStateSnapshot resume | `sessionStateSnapshot.ts` | 持久化 + 校验 |

---

## 6. 子系统设计

### 6.1 `IngesterBase`（M0.5）

抽出共同行为；前置 golden test（M0）。byte-for-byte 一致后切换。

### 6.2 `AppSourceIngester`（M1）

- Java/Kotlin 方法级 chunker，回退 600 chars
- 默认 exclude：`build/` `*.gradle/` `node_modules/` `*.gen.*` `.git/` `out/` `**/secrets/**` `**/.env*`
- 自动检测 `proguard-rules.pro` / `mapping.txt` → 注册到 SymbolResolver
- 单文件 >200KB skip + warning
- 默认 `consent.sendToProvider=false`

### 6.3 `KernelSourceIngester`（M2b）

- vendor 必填；多 vendor 并存按 filter 隔离
- pathFilter 必填；默认拒绝空
- C 函数级 chunker，回退 1500 chars
- SPDX 解析失败 → `unsupportedReason: 'license_unknown'`，chunk 入库但 lookup 时 metadata-only

### 6.4 ~~`SymbolStore`~~ 见 §6.8

### 6.5 `PatchProposer`（M3，强约束 + 三态）

```typescript
export type PatchStatus = 'verified' | 'sketch' | 'unverified';

export interface PatchProposalResponse {
  patchStatus: PatchStatus;
  diff?: string;                 // 仅 verified 时返回；sketch/unverified 不返回 unified diff
  patchSketch?: string;          // sketch 状态下的伪代码或文字描述
  rationale: string;
  confidence: 'low' | 'medium' | 'high';
  targetFiles: { codebaseId: string; path: string; lineRange?: {start:number;end:number} }[];
  warnings: string[];
  applyCheck?: {
    ran: boolean;
    passed: boolean;
    workdir?: string;            // 目标 codebase rootRealpath（不下发 agent）
    error?: string;
  };
}
```

**约束链**：
1. 入参 `contextChunkIds≥1`，且**在 CodeLookupLedger 中有 prior successful lookup 记录**（不是只在 RagStore 命中）
2. 每个 chunk 必须 `kind ∈ {app_source, aosp, kernel_source}` 且 `consent.sendToProvider=true`
3. **跨 codebase fail-fast（v3.1 新增）**：`contextChunkIds` 必须全部属于**同一个 `codebaseId`**；跨多个 codebaseId（如 app+aosp 混合）→ tool 层直接 reject，`unsupportedReason: 'multi_codebase_not_supported_phase1'`，提示用户拆成多个 proposal
4. Haiku sub-agent prompt 强制限定 hunk 的 target file ∈ contextChunkIds 的 filePath 集合
5. **Diff 静态校验**（使用 unified diff parser）：
   - 每个 hunk 解析出 target file + line range
   - target file ∈ contextChunkIds.filePath
   - hunk context lines 与对应 chunk snippet 在 lineRange 内 ≥80% overlap
6. `git apply --check` 在 **目标 codebase rootRealpath** 跑（不是 SmartPerfetto repo root）
7. 状态机：
   - 步骤 5+6 全通过 → `patchStatus='verified'`，返回 diff，UI 可 Copy
   - 步骤 5 通过、6 失败 → `patchStatus='sketch'`，**不返回 unified diff**，仅 `patchSketch` + rationale；UI 无 Copy 按钮
   - 步骤 5 失败 → `patchStatus='unverified'`，仅 rationale；UI 隐藏 patch 区
8. 拒绝场景：contextChunkIds 空 / 全部 metadata-only / kind 不属于代码源 / 跨 codebase → fail-fast，`unsupportedReason`

**Agent 输出纪律（v3.1，配合 §6.12 LLM-Echo Discipline）**：
- 在 `patchStatus !== 'verified'` 时，agent 在最终回答中**不允许出现 unified diff 文本**（不论 PatchProposer 是否返回 diff）
- 引用 patch 时必须用结构化引用（`patchProposalId + targetFiles`），不在自然语言中复制源码或 diff 文本
- 由 §8 code-aware.template.md golden tests 锁定

### 6.6 `CodebaseRegistry`

enterprise → scopedKnowledgeStore；legacy → JSON。统一接口。

### 6.7 `RagStoreSearchOptions` 扩展（M0）

```typescript
export interface RagStoreSearchOptions {
  topK?: number;
  kinds?: RagSourceKind[];
  scope?: KnowledgeScope;

  // 新增
  codebaseIds?: string[];
  vendor?: string;
  buildId?: string;
  pathPrefix?: string;
  symbolExact?: string;
  filePathExact?: string;
  languages?: RagChunk['language'][];
}
```

**Ranking**：用 **rank tier**（不是直接 score=1.0），保持 token-overlap 稳定排序：
- Tier A：`symbolExact` 或 `filePathExact` 精确命中
- Tier B：`pathPrefix` 命中 + token overlap
- Tier C：纯 token overlap（兼容旧行为）
- Tier 内按 token-overlap 排，Tier 间 A > B > C

### 6.8 `SymbolResolver` + `TraceSymbolContext`（v3 加强降级）

```typescript
export type SymbolResolution<T> =
  | { resolution: 'full'; data: T; }
  | { resolution: 'symbol_only_low_confidence'; symbol?: string; unsupportedReason: string; }
  | { resolution: 'unresolved'; unsupportedReason: string; };

export class SymbolResolver {
  // M1
  resolveApp(input: {
    codebaseId: string;
    obfuscatedClass: string;
    obfuscatedMethod?: string;
    linenum?: number;
    buildId?: string;             // 缺则降级
  }): Promise<SymbolResolution<AppSymbolEntry>>;

  // M2c
  resolveKernel(input: {
    codebaseId: string;
    vendor: string;
    addr?: number;
    symbolName?: string;
    vmlinuxBuildId?: string;      // 缺则降级
  }): Promise<SymbolResolution<KernelSymbolEntry>>;

  // M2c
  resolveNative(input: {
    codebaseId: string;
    buildId: string;              // **必须传**，否则直接 'unresolved'
    rel_pc: number;
    moduleName?: string;
  }): Promise<SymbolResolution<NativeSymbolEntry>>;
}
```

**降级规则（v3 硬约束 + v3.1 输出纪律）**：
- `buildId` / `vmlinuxBuildId` / `commitHash` 缺失 → 不允许返回 `full`，最多 `symbol_only_low_confidence`
- `symbol_only_low_confidence` 状态下：
  - PatchProposer 拒绝以此为基础生成 diff
  - **Agent 在自然语言回答中不允许输出 file:line / line number / 源码摘录**（v3.1 加强，由 §6.12 + §8 golden tests 锁定）
  - 允许说明"可能相关符号是 X" / "建议方向"，但不出现具体行号
- `unresolved` → `unsupportedReason: 'symbols_missing'` 或 `'build_id_mismatch'`

**TraceSymbolContext**：从 `stack_profile_frame` / `stack_profile_mapping` 取 `build_id`/`rel_pc`/`function`/`file`/`line` 字段。

### 6.9 `LookupResponseFilter`（v3：分 schema + legacy 兼容）

不同入口不同函数签名，**避免 v2 把 resolve_symbol/propose_patch 硬塞进 RagRetrievalResult 的 schema 冲突**。

```typescript
// 共享 sanitized hit
export interface SanitizedRagHit {
  chunkId: string;
  score: number;
  metadata?: {
    codebaseId?: string;
    kind: RagSourceKind;
    filePath?: string;
    lineRange?: { start: number; end: number };
    symbol?: string;
    language?: string;
    commitHash?: string;
    vendor?: string;
    buildId?: string;
  };
  snippet?: string;               // 仅 consent + license + redaction 全通过时存在
  unsupportedReason?: string;     // 'no_send_to_provider_consent' / 'license_blocked' / 'budget_exceeded' / 'redacted_too_aggressively'
  redactedCount?: number;
}

export interface SanitizedRagResult {
  query: string;
  hits: SanitizedRagHit[];
  probed: RagSourceKind[];
  retrievedAt: number;
  unsupportedReason?: string;
  legacyPath: boolean;            // true = 走旧 Plan 55 path，未做 code-aware consent
}

export interface SanitizedSymbolResolution<T> { ... }
export interface SanitizedPatchProposal extends PatchProposalResponse { ... }

// 入口函数
export async function filterRagLookup(
  raw: RagRetrievalResult,
  ctx: FilterContext,
): Promise<SanitizedRagResult>;

export async function filterSymbolResolution<T>(
  raw: SymbolResolution<T>,
  ctx: FilterContext,
): Promise<SanitizedSymbolResolution<T>>;

export async function filterPatchProposal(
  raw: PatchProposalResponse,
  ctx: FilterContext,
): Promise<SanitizedPatchProposal>;
```

**Legacy vs user codebase 判定（v3.1 改 fail-closed）**：

v3 漏洞：v3 只用 `codebaseId == null` 当 legacy。如果新 App/kernel ingester 漏写 codebaseId（实际很容易发生），用户源码会被误判为 legacy → 绕过 code-aware 安全链路（**fail-open**）。

v3.1/v3.2 修正：**双因子判定 + fail-closed + migration 规则**：

```
for each hit:
  isUserCodebaseKind = hit.chunk.kind ∈ {'app_source', 'kernel_source'}
                        || (hit.chunk.kind ∈ {'aosp', 'oem_sdk'}
                             && registryOrigin(hit.chunk.chunkId) === 'codebase_registry')
  isLegacyKind = hit.chunk.kind ∈ {'androidperformance.com', 'project_memory',
                                    'world_memory', 'case_library'}
                  || (hit.chunk.kind ∈ {'aosp', 'oem_sdk'}
                       && registryOrigin(hit.chunk.chunkId) === 'legacy_plan55')

  if isUserCodebaseKind:
    if hit.chunk.codebaseId == null OR hit.chunk.codebaseId 不在 CodebaseRegistry:
      # FAIL CLOSED — 这是 user codebase kind 但 metadata 损坏
      hit.snippet = undefined
      hit.unsupportedReason = 'invalid_codebase_metadata'
      audit log error level
      ledger record outcome='rejected'
      continue  # 不进 four-gate，不算 success
    else:
      # 正常路径：完整 four-gate
      1. consent gate
      2. license gate
      3. redaction gate (snippet)
      4. budget gate (CodeLookupLedger.recordTokens)
      legacyPath = false
  elif isLegacyKind:
    # Plan 44/54/55 旧路径，行为完全保留
    legacyPath = true
    pass through unchanged (sanitize 仅 strip 既有 unsupportedReason 的 chunk text)
  else:
    # 未知 kind 组合 → fail closed
    hit.snippet = undefined
    hit.unsupportedReason = 'unknown_kind_origin'
```

`registryOrigin(chunkId)` 由 RagStore 持久化在 `RagChunk.registryOrigin` 字段（§5.1）：CodebaseRegistry 注册触发的写入必须 = `'codebase_registry'`；Plan 44/54 自身 ingester 写 `'plan44_memory'` / `'plan54_cases'`。

**Migration / backfill 规则（v3.2/v3.3 加强）**：

旧 `rag_store.json`（v3.2 前）的 chunk 没有 `registryOrigin` 字段。M0 启动时执行一次性 backfill。

**v3.3 加强：dry-run + 备份 + schemaVersion + 失败 readonly 降级**：

```
1. dry-run 模式（启动 flag `SMARTPERFETTO_RAG_MIGRATION=dry-run`）：
   - 模拟跑迁移，输出预期改动清单到 backend/logs/migration_report_<ts>.json
   - 不动 rag_store.json；用户手动跑过 dry-run 确认后再切实模式

2. 实际迁移：
   - 先 cp rag_store.json → rag_store.json.bak.<ts>（保留至少 7 天，user 可清理）
   - 写新版本时含 schemaVersion=2（v3.2 前是 1）
   - 写入完成 + 校验后才删 .tmp，atomic rename

3. 失败处理：
   - 任何步骤失败 → 保留 .bak + 启动 readonly degraded mode
   - 关键日志 "rag_store migration failed, running in readonly mode; restore from <bak>"
   - 在该模式下：lookup 仍可工作（用旧数据 + legacy path），但 codebase register/ingest 全部拒绝
   - operator 修复后启动可重试或手动 rollback 到 .bak

4. 一次性 backfill 内容：
```

```
for each chunk in legacy rag_store.json (registryOrigin == null):
  if chunk.kind ∈ {androidperformance.com, aosp, oem_sdk}:
    chunk.registryOrigin = 'legacy_plan55'
  elif chunk.kind ∈ {project_memory, world_memory}:
    chunk.registryOrigin = 'plan44_memory'
  elif chunk.kind == 'case_library':
    chunk.registryOrigin = 'plan54_cases'
  elif chunk.kind ∈ {app_source, kernel_source}:
    # 这种组合不可能存在于 v3.2 前的 store；若出现 → quarantine
    chunk.unsupportedReason = 'pre_v3_2_invalid_kind_origin_combo'
    audit log error
  else:
    # unknown kind → quarantine
    chunk.unsupportedReason = 'unknown_kind_origin_legacy_migration'
    audit log error
```

新写入路径（codebase_registry / Plan 44 / Plan 54 ingester）**必须**在 store 层强制写 `registryOrigin`；空 → 拒绝写入（assert）。

**验收（M0）**：
- 单测：`ragStoreBackfillMigration.test.ts` —— fixture 含 v3.2 前的 chunk，运行 backfill 后字段正确
- 单测：`ragStoreWriteAssertion.test.ts` —— 写入缺 registryOrigin 必抛
- 回归：旧 lookup_aosp_source / lookup_blog_knowledge / lookup_oem_sdk 结果在 backfill 前后**byte-for-byte 一致**

**Plan 44/54 recall 工具不接此 filter**：`recall_project_memory` / `recall_similar_case` 走各自既有 memory/case redaction policy；本 plan 不修改它们。但 audit / log projection（§6.11）建议对所有 chunk 来源**始终跑通用 secret redaction**（一行扫描即可，无业务复杂度）。

### 6.10 `CodeLookupLedger`（v3 新增，运行时 ≠ snapshot）

```typescript
export interface CodeLookupLedgerEntry {
  turn: number;
  ts: number;
  toolName: 'resolve_symbol' | 'lookup_app_source' | 'lookup_aosp_source' |
            'lookup_kernel_source' | 'lookup_oem_sdk' | 'lookup_blog_knowledge' |
            'propose_patch';
  codebaseId?: string;            // legacy 时空
  chunkIds: string[];             // 实际返回 LLM 的（filter 后）
  consentApplied: boolean;
  tokensSpent: number;
  outcome: 'success' | 'budget_exceeded' | 'consent_blocked' | 'license_blocked' |
           'symbol_low_confidence' | 'unresolved' | 'patch_verified' |
           'patch_sketch' | 'patch_unverified' | 'rejected';
  legacyPath: boolean;            // 用于 audit 区分
}

export class CodeLookupLedger {
  constructor(sessionId: string, capTokens: number, capPatches: number);

  record(entry: CodeLookupLedgerEntry): void;
  hasPriorLookupOf(chunkId: string): boolean;           // PatchProposer 校验依据
  remainingTokens(): number;
  remainingPatches(): number;
  toSnapshotSummary(): SessionStateSnapshot['codeLookupSummary'];
}
```

- 生命周期：session 创建时实例化；运行时所有 lookup/patch 行为都 record；session 结束时投影摘要到 snapshot
- **fsync 走 per-session append queue**（v3.2/v3.3）：单 session 内 append 顺序保证；多 session 并发不互相阻塞；event loop 不被 blocking IO 占满
- **PatchProposer 的 prior-lookup 校验从 ledger 查**，不是 RagStore（RagStore 命中但 filter 拦截 → 不算 prior lookup）
- Verifier 的"代码引用完整性"也从 ledger 查 `hasSuccessfulCodeLookup()`

**Crash-safe 持久化（v3.1 新增，配合 SDK session resume）**：

v3 漏洞：ledger 只在 session 完成时投影 snapshot。若 session crash 后，LLM 上下文（claudeSdkSessionId / openAiPreviousResponseId）可能已被 SDK 持久化 → resume 后模型上下文里仍有 snippet，但 ledger / budget / prior-lookup 已丢 → PatchProposer / Verifier 与真实上下文漂移。

v3.1 修正：**append-only sidecar 持久化**

```
backend/logs/sessions/<sessionId>.codeLookupLedger.jsonl   # 每条 entry 一行 JSON

每次 ledger.record(entry) → 进入 per-session append queue，按顺序 fsync；保证 crash 后可恢复且不阻塞其他 session
session 恢复时：
  1. 读 sidecar 重建 in-memory ledger
  2. 校验 sidecar 完整性（CRC / line-count vs snapshot.codeLookupSummary）
  3. 若 sidecar 缺失或损坏 → **拒绝 SDK session reuse**，强开新 session，向 user 报告 'code_aware_session_recovery_failed'
sidecar 文件遵守 §6.11 ProjectedPayload 同等隐私规则（不含 snippet）
```

**Resume 路径 acceptance**：
- 单测：crash-after-lookup-before-snapshot 场景：mock SDK 已持久化 session id，sidecar 完整 → resume 成功，ledger 恢复一致
- 单测：sidecar 缺失 + 有 SDK session id → 拒绝 reuse
- 单测：sidecar 损坏（截断 / JSON 解析失败）→ 拒绝 reuse

### 6.11 `ToolResultProjectionFilter`（v3 新增）

**关键认知**：LookupResponseFilter 只过滤 **发给 LLM** 的 payload。LLM 收到 snippet 之后，下游 SSE / agent_response.result / session jsonl / event store / conversationSteps / telemetry 仍会持久化 snippet。**必须独立投影一层**。

```typescript
export interface ProjectionInput {
  toolName: string;
  rawResponseSentToLLM: unknown;  // 含 snippet 的 LLM-visible payload
  ledger: CodeLookupLedger;
}

export interface ProjectedPayload {
  toolName: string;
  // 抹除 snippet，只留 metadata + hash + count
  chunkRefs: Array<{
    chunkId: string;
    codebaseId?: string;
    kind: RagSourceKind;
    snippetHash?: string;          // sha256(snippet).slice(0,12)
    snippetLength?: number;
    redactedCount?: number;
  }>;
  outcome: CodeLookupLedgerEntry['outcome'];
  legacyPath: boolean;
}

export function projectForSseAndLog(input: ProjectionInput): ProjectedPayload;
```

**Dual-payload sidecar contract（v3.2 强化 namespacing + fail-closed）**：

v3 漏洞：v3 说 "claudeMcpServer.ts 在推给 SSE / event store 之前调 projectForSseAndLog"，但 SSE/stringify 在多个 bridge/runtime/route 层都会触发；难以保证每个写入点都正确调用。

v3.1/v3.2 修正：**sidecar 模式 + namespaced key + fail-closed lookup**

```
sidecar key 命名空间（v3.2 默认）：
  `${sessionId}:${runId}:${runtime}:${toolUseId|callId}`

  - sessionId：本 session UUID
  - runId：本次 analyze 调用 ID（resume / multi-turn 用同 sessionId 不同 runId）
  - runtime：'claude' | 'openai'
  - toolUseId|callId：Claude SDK tool_use_id 或 OpenAI SDK call id

MCP handler 返回时：
  1. 计算 LLM-visible payload（含 snippet）
  2. 计算 projected sidecar payload（不含 snippet）
  3. SessionToolResultRegistry.put(key, {
       llmPayload: SanitizedRagHit/...,    // 仅 LLM 出站读
       sidecar: ProjectedPayload,           // 所有持久化路径必须取这个
     });
  4. 把 llmPayload stringify 后返回 MCP framework，进入 LLM 调用链

强制约定（lint / code review 强制）：
  - 任何向 SSE / event store / session jsonl / conversationSteps / telemetry /
    audit log / report generator / analysisResultSnapshot 写 tool result 的代码，
    必须通过 SessionToolResultRegistry.getSidecar(key) 取 ProjectedPayload，
    禁止直接读 MCP handler 返回值或 LLM message.toolResult

Fail-closed lookup（v3.2 关键）：
  getSidecar(key) returning undefined / null 时：
    - 对 code-aware tool（toolName ∈ {lookup_app_source, lookup_kernel_source,
      resolve_symbol, propose_patch}）→ writer 必须 **fail-closed**：
      写一条 projected error entry（含 toolName + outcome='sidecar_missing'），
      **绝不** 降级为 stringify 原 raw tool result
    - 对 legacy tool → fallback 行为允许（不破坏 Plan 44/54/55）
```

**OpenAI runtime 范围（v3.4 显式标注）**：
- Phase 1 仅支持 OpenAI **Responses API** 与 **Chat Completions compatible**（与本仓库现有 `agentOpenAI` 一致）
- **OpenAI Assistants API out-of-scope**：事件模型不同（thread/run/step），若未来要支持必须实现同一 `ToolCallContext` contract 才能接入
- alias map：**TTL = 单次 run 生命周期**；`run end` 显式 cleanup；防止跨 run / 跨 session 串扰

**Sidecar correlation 机制（v3.3 新增，关闭"MCP handler 怎么拿到 toolUseId/callId"漏洞）**：

v3.2 漏洞：v3.2 要求 MCP handler return 时调用 `put(key, ...)`，但 `toolUseId`（Claude SDK）和 `callId`（OpenAI SDK）通常在 **SDK tool-call event / tool-output event 层** 才可见，OpenAI `openAiToolAdapter.execute(args)` 当前没有把 callId 传进 handler。若 handler 无法构造同一 key → SSE bridge 首次读 sidecar miss → fail-closed projected error → 功能性失败。

v3.3 修正：**runtime wrapper 注入 call context + per-runtime invocationId 映射**

```typescript
// backend/src/agentv3/toolCallContext.ts (v3.3 新增)
export interface ToolCallContext {
  sessionId: string;
  runId: string;
  runtime: 'claude' | 'openai';
  invocationId: string;          // 每次工具调用唯一，由 runtime wrapper 生成
  sdkCallId?: string;            // toolUseId | callId；可能 init 时未知，tool-output 时回填
}

// Claude SDK wrapper（claudeMcpServer.ts 改）
// 在分发 handler 前生成 invocationId，写入 AsyncLocalStorage
// handler 内部 SessionToolResultRegistry.put({sessionId, runId, runtime:'claude', toolUseId: invocationId}, ...)
// SDK tool-output event 到来时：runtime wrapper 把 SDK 的 toolUseId 与 invocationId 建立映射
//   SessionToolResultRegistry.alias(`...:claude:${toolUseId}`, `...:claude:${invocationId}`);
// SSE bridge / writer 用 toolUseId 查 → 通过 alias 解析到 invocationId → 拿到 sidecar

// OpenAI runtime wrapper（openAiToolAdapter.ts 改）
// 同理：execute(args) 内分配 invocationId，AsyncLocalStorage 注入
// OpenAI tool-output event 到来时建立 callId → invocationId 映射
```

**关键不变量**：
- 所有 code-aware tool handler 都通过 wrapper 调用；wrapper 保证 `ToolCallContext` 一致可拿
- AsyncLocalStorage 在 handler 内部读 context → 同一 sessionId/runId/runtime/invocationId 写 sidecar
- runtime tool-output event 触发时建立 callId/toolUseId → invocationId alias
- writer 用 callId/toolUseId 查 → 透过 alias 拿正确 sidecar

**测试要求（M1 验收新增）**：
- **并行 tool call**：同 session 同时调两个 lookup_app_source → 各自拿到正确 sidecar
- **多 run resume**：runId 切换时 sidecar 不串
- **resume replay**：sessionResume 后旧 sidecar 仍可查（持久化 + 内存合并）
- **missing sidecar fail-closed**：删除 alias 后 writer 写 projected error，不降级
- **OpenAI callId 延迟到达**：在 tool-output event 之前先到达 writer 时，writer 等 alias 或 fail-closed

**强制接入点（必须改造）**：
- `claudeMcpServer.ts` MCP handler return 处：put sidecar
- Claude SSE bridge / `claudeRuntime` event emit：read sidecar
- OpenAI `openAiToolAdapter.execute` 返回后：put sidecar
- OpenAI runtime tool output handling / token streaming：read sidecar
- `agentRoutes.ts` conversationSteps writer：read sidecar
- session jsonl writer (`backend/src/services/sessionLogger.ts` 或类似)：read sidecar
- agent event store (Plan 44 已有的存储)：read sidecar
- `ragAdmin/audit` log writer：read sidecar
- Report generator + export：read sidecar
- analysisResultSnapshot writer：read sidecar
- Frontend SSE event payload：sidecar 已经投影，可安全推送

**Legacy 路径**：`legacyPath=true` 时 sidecar 字段保持兼容（不破坏 Plan 44/54/55 既有日志格式），但 secret redaction 始终跑（v3.1 加强）。

### 6.12 LLM-Echo Discipline（v3.1 新增，**最关键的隐私边界**）

**Codex round 3 发现的盲点**：
LookupResponseFilter / ToolResultProjectionFilter 都只过滤 **tool result payload**。但 LLM 收到 snippet 进入上下文后，可以在以下位置 **echo 出来**，绕过双轨过滤：
- `answer_token` / 流式 conclusion
- 最终 message.content
- report HTML / Markdown 渲染
- analysisResultSnapshot
- export 文件（PDF / .md / .json）
- 前端 `localStorage` / `sessionStorage`
- Verifier warning 文本
- 后续 turn 的 conversation history

**这是产品级架构决策**，v3.1 默认走 **Option B：最严格 chunkId+file:line 引用模式**。

#### Option B（v3.1 默认）：结构化引用，源码摘录不持久化

**模型输出规则**（由 strategy 强制 + Verifier 检查 + 测试锁定）：

| 输出场景 | 允许 | 禁止 |
|----------|------|------|
| 最终回答 / conclusion | `chunkId` 引用、`file:line` 范围、`symbol` 名、`lineRange` | **源码文本 snippet**、unified diff（除非 `patchStatus='verified'` 且独立结构化字段）|
| report HTML / Markdown | 同上 + 结构化 patch block（仅 verified） | 自然语言中复述源码 |
| Verifier warning | chunkId 引用 | 源码片段 |
| symbol_only_low_confidence / sketch / unverified | 仅说"方向"，无 file:line / 无 diff | 任何 file:line 或 diff |

**结构化引用 schema（agent 输出 + report 输入）**：

```typescript
export interface CodeRef {
  chunkId: string;
  codebaseId: string;
  filePath: string;        // 相对仓库根
  lineRange?: { start: number; end: number };
  symbol?: string;
  // **不含 snippet**
}

// agent 在最终回答中引用代码时必须用此结构（strategy 强制）
// report 渲染时：
//   - 显示 displayName / filePath / lineRange / symbol
//   - "查看代码" 按钮 → 前端走 RBAC 拉 excerpt → 仅 DOM 渲染，不写 localStorage
```

**前端 excerpt 拉取协议**：

```
GET /api/rag/chunks/:chunkId   # 既有 endpoint，扩展 RBAC
  - 需要 codebase:read scope
  - 返回 SanitizedRagHit（含 snippet）
  - HTTP 头标记 Cache-Control: no-store
  - 前端 DOM 渲染后**不写 localStorage / sessionStorage / IndexedDB**
  - export PDF 时：UI 询问用户"是否包含源码摘录"，默认不含；含时另起独立加密 export
```

**Acceptance（§15 多轴 canary 升级）**：

注入 canary 字符串作为 RAG chunk snippet，强制模型把 canary echo 到回答（用提示工程引导 + 监控）；grep 验证：

| 持久化路径 | 期望 canary 命中 |
|------------|------------------|
| session jsonl | 0 |
| event store payload | 0 |
| SSE replay buffer | 0（前端推送的 SSE payload 已经是 sidecar） |
| conversationSteps | 0 |
| telemetry / audit log | 0 |
| **最终 conclusion 文本（agent answer message）** | **0**（v3.1 关键新增） |
| **report HTML/Markdown source** | **0**（v3.1 关键新增） |
| **analysisResultSnapshot** | **0**（v3.1 关键新增） |
| **export .pdf / .md / .json** | **0**（除非用户显式 opt-in） |
| **frontend localStorage / sessionStorage / IndexedDB** | **0** |
| **Verifier warning 文本** | **0** |
| LLM-visible mock payload（filter 后，仅 LLM 上下文用） | ≥1（确认 filter 没误杀） |

强制 model echo 失败时 → 测试通过（说明 strategy 纪律奏效）；模型偶尔 echo 时 → Verifier 拦截 + 报告生成阶段 secret-redact + 测试预期"echo 出现在 LLM 上下文但不进 persisted layers"。

**Option A 备选**（仅当用户明确要求 excerpt 可视化时启用）：

允许"用户可见源码摘录"持久化，但需：
- 长度上限（每 hit 最多 N 行，N 由 codebase consent.maxExcerptLines 配置，默认 0）
- 每条 excerpt 标记 redactionMetadata（哪些 secret pattern 被 mask）
- export 时强制脱敏处理
- 设独立 audit log
- Q7 已开放给用户决策（§19）

#### Strategy / Skill 层 enforcement

`backend/strategies/code-aware.template.md` 必须含以下 golden test 锁定的硬约束（§8.4 acceptance）：

```
[golden test 1] symbol_only_low_confidence
  输入：resolve_symbol 返回 'symbol_only_low_confidence'
  期望 agent 输出：无 file:line / 无 line number / 无源码摘录；仅"可能相关符号"

[golden test 2] patchStatus='sketch'
  输入：propose_patch 返回 'sketch'
  期望 agent 输出：无 unified diff 文本；仅 patchSketch 描述

[golden test 3] patchStatus='unverified'
  期望 agent 输出：无 unified diff；仅 rationale 概述

[golden test 4] LLM echo discipline
  输入：lookup_app_source 返回 chunks（含 canary）
  期望 agent 最终回答：用 CodeRef 引用，不复制 snippet 文本
  ↑ 即使有 Option A 启用，也只在 verified diff 块中显示，自然语言不复制
```

**注意**：§6.12 strategy 纪律 + Verifier 是**事后兜底**；主防线是 §6.13 服务端 LLMEchoOutputFilter（v3.2 新增）。模型若违纪，会被服务端 gate 在 token emit 前拦截。

### 6.13 `LLMEchoOutputFilter`（v3.2 新增，**服务端 streaming output gate**）

**Codex round 4 发现的盲点**：§6.12 的 strategy + Verifier 都是**事后**检查。模型在 `answer_token` 流式 emit 阶段就已经把 snippet/canary 发到 SSE → frontend → event store → 持久化。等到 Verifier 跑完时，已经晚了。

**v3.2 加强**：在 **token 流出前** 拦截，把 LLM-echo 从"模型纪律"升级为"服务端输出门禁"。

```typescript
// backend/src/services/security/llmEchoOutputFilter.ts (v3.3 stateful)

/**
 * **Stateful** streaming filter — 必须按 LLM 流的顺序送入 chunk，
 * 内部维护 Aho-Corasick automaton state + rolling buffer，
 * 跨 token chunk 的模式仍能命中。
 */
export class LLMEchoOutputStream {
  // 本 turn ephemeral snippet registry（不持久化）
  private patterns: AhoCorasickAutomaton;
  // rolling buffer 容纳最长 pattern 的安全窗口；release 时只 emit 安全前缀
  private buffer: Buffer = Buffer.alloc(0);
  private maxPatternLength: number;

  constructor(maxPatternLength: number = 2048);

  registerSnippet(snippet: string, ref: CodeRef): void {
    // 分层入 automaton：完整 snippet + 每行 + 80 字符滑窗
    // 同时入 canary nonce 模式（强制 audit）
    // key 用 SHA256 短哈希（registry 不存 raw snippet）
  }

  /** 流式写入：每次喂入一段 token chunk；返回此次可安全 emit 的前缀（已 redact） */
  write(tokenChunk: string | Buffer): string;

  /** 刷出 buffer 剩余内容（turn / message 结束时）；返回最后一段 redacted text */
  flush(): string;

  /** 取累计统计（不含 raw matched snippet） */
  stats(): {
    bytesProcessed: number;
    hits: Array<{
      patternHash: string;           // sha256(snippet).slice(0,12)，绝不返回 raw
      patternKind: 'exact' | 'line' | 'sliding' | 'canary';
      codeRef?: CodeRef;             // 对外引用（chunkId/file/line/symbol，无源码）
      replacement: string;           // 替换后的 placeholder（用于 audit 计数）
      atOffset: number;              // chunk 内偏移
    }>;
    redactedBytes: number;
  };

  /** 销毁；turn 结束必须显式调用 */
  destroy(): void;
}
```

**Stateful streaming 规则（v3.3 关键）**：
- automaton 不在单 chunk 内立即输出后 N-1 字节（N = `maxPatternLength`），而是放进 rolling buffer 等下一个 chunk
- 命中 pattern → 整段 match 区间替换为 `[Code: ${codeRef.symbol} @ ${filePath}:${lineRange}]` 或 `[REDACTED_CODE_ECHO]`（canary）
- canary 命中 → audit log error level（仍不含 raw snippet）+ Verifier warning

**匹配策略（多层）**：
1. **Exact substring**：完整 snippet 入 automaton；命中替换为 `[Code: ${codeRef.symbol} @ ${filePath}:${lineRange}]`
2. **Per-line match**：snippet 拆行（≥ 8 字符的代码行）→ 命中替换
3. **Sliding window**：长 snippet 滑 80 字符窗口；匹配 ≥ 4 个连续 token → 替换
4. **Canary substring**：本 turn 注入的 canary nonce 命中 → 强制 `[REDACTED_CODE_ECHO]` + audit log

**hits 不返回 raw matched snippet**（v3.3 修正）：`stats()` 返回 `patternHash + patternKind + codeRef + replacement` 即可定位 + 调试；audit log / debug log 即使被持久化也无法反向泄露源码。

**中文 + 多字节字符边界**：write/flush 输入按 UTF-8 解析；automaton 在 byte 层匹配；rolling buffer 不在 multi-byte 字符中间截断（保留不完整字符到下一 chunk）。

**Replacement stats 日志**（v3.3 P2 优化）：
- 每 1000 次 scan 或每 turn 结束时，写一条 `{ replacementsByKind, redactedBytes, bytesProcessed, p95Latency }` 到 telemetry（不含 raw）
- 便于调试 false positive（如 Skill DataEnvelope 表格里的 code-like 字符串误命中）

**用法（writer 侧）**：

```typescript
// 错的（v3.2，单 chunk stateless scan）：
// scan one token chunk independently → output

// 对的（v3.3，stateful stream + v3.4 异常生命周期）：
const stream = new LLMEchoOutputStream(maxPatternLength);
try {
  for (const snippet of session.registeredSnippets) stream.registerSnippet(snippet, ref);
  for await (const chunk of tokenStream) {
    const safe = stream.write(chunk);
    if (safe.length) sseEmit(safe);
  }
  sseEmit(stream.flush());
} finally {
  stream.destroy();        // **必经 finally**，确保异常路径也清理
}
```

**Stream 异常生命周期（v3.4 新增）**：
- `try/finally destroy()` —— 所有 writer 必须用 try/finally 模式，保证异常路径清理
- **abort / SDK error / retry**：丢弃 stream 当前实例的 rolling buffer（未 flush 的安全窗口），**不**复用旧 buffer 到 retry 新 stream（避免半段残留拼接）；SDK retry 必须用新 `LLMEchoOutputStream`
- **SSE reconnect**：仅 replay 已经过 stream 处理并 emit 出去的事件（已过滤），不重跑 stream
- **测试**：`llmEchoOutputStream.abort.test.ts` / `.retry.test.ts` / `.replayReconnect.test.ts`

**Writer 表（v3.4 与表述对齐：从 `scanOutgoing` 改为 `write/flush`）**：

| 写入点 | 调用 |
|--------|------|
| Claude SSE `answer_token` emit | `stream.write(tokenChunk)` 后 emit；`stream.flush()` 收尾 |
| Claude `conclusion` message | `stream.write(message.content)`；`stream.flush()` |
| OpenAI streaming token output | 同 Claude |
| OpenAI final response | 同 |
| `report` generator markdown/HTML 输出 | `stream.write(rendered)`；`stream.flush()` |
| `analysisResultSnapshot` writer | 同 |
| `Verifier warning` 文本输出 | 同 |
| `propose_patch.rationale` 字段 | 同 |
| `export` (.pdf / .md / .json) | 同 |
| SSE replay buffer 回放路径 | 只 replay 已 emit 的 safe text，不重跑 stream |

**强制接入点（writer-side enforcement，v3.4 与 stateful stream 表述对齐）**：

参见上方"Writer 表"小节（已用 `stream.write/flush` 表述）。**注意**：v3.2 旧 `scanOutgoing(tokenChunk)` API 在 v3.3+ 已不存在；所有 writer 必须用 `LLMEchoOutputStream` 实例。

**Streaming 性能**：

- token 增量 chunk size ~10-50 字符 → 单次 scan O(M) M=registry 大小
- 单 session 注册 snippet 数量上限 = top_k × lookup 次数 ≤ 3 × 12 = 36 个 snippet
- 每个 snippet 平均 ≤ 2000 字符 → 总扫描成本可控
- 用 Aho-Corasick 多模式匹配预编译（registry 变化时增量更新）

**Performance acceptance**：
- token streaming 端到端延迟增量 < 5ms per token chunk
- 不阻塞 event loop（async-friendly 实现）

**测试**：
- 单测：`llmEchoOutputFilter.exact.test.ts` / `.perline.test.ts` / `.slidingwindow.test.ts` / `.canary.test.ts`
- 单测：`llmEchoOutputFilter.streaming.test.ts`（mock token stream，验证不阻塞 + 增量延迟）
- 集成：M3 E2E 故事中，强制 LLM 复述 canary → SSE / report / export 中应全 0 命中

**关系**：

```
       LLM 上下文（含 snippet）  ──┐
                            │
                            ▼ token / message 写出
       ┌──────────────────────────────────────┐
       │  LLMEchoOutputStream.write/flush()   │  ← 服务端硬门禁（v3.2+）
       └─────────────┬────────────────────────┘
                     ▼
       ┌──────────────────────────────────────┐
       │  SSE / event store / conversationSteps│
       │  / report / snapshot / export         │
       │  （这些 writer 已经收到 redacted text） │
       └──────────────────────────────────────┘

       Verifier（事后）→ warning + audit；仅兜底
       Strategy + golden tests（M3）→ 软纪律
```

**与 §6.11 ProjectionFilter 的分工**：

| Filter | 作用对象 | 时机 |
|--------|----------|------|
| LookupResponseFilter (§6.9) | tool result payload | MCP handler 返回前（LLM 可见） |
| ToolResultProjectionFilter (§6.11) | tool result payload | MCP handler 返回后（writer 取 sidecar） |
| **LLMEchoOutputFilter (§6.13)** | **model-generated token / message / rationale** | **token / message 写出前** |

三层 filter 各管不同 payload 来源，构成完整的 outbound 边界。

---

## 7. MCP 工具扩展

### 7.1 既有工具

`lookup_blog_knowledge` / `lookup_aosp_source` / `lookup_oem_sdk` 保留签名。内部 handler 改造（v3.2 与 §6.9 双因子判定对齐）：
- **legacy chunk**（kind ∈ {blog / project_memory / world_memory / case_library}，**或** kind ∈ {aosp / oem_sdk} 且 `registryOrigin='legacy_plan55'`）→ 透传，不触发 code-aware filter（行为保留）
- **user codebase chunk**（kind ∈ {app_source / kernel_source}，**或** kind ∈ {aosp / oem_sdk} 且 `registryOrigin='codebase_registry'`）→ 走 LookupResponseFilter + ToolResultProjectionFilter + LLMEchoOutputFilter
- **不符合任一组合**（kind 与 registryOrigin 矛盾 / codebaseId 缺失 / 未知组合）→ fail-closed `unsupportedReason='invalid_codebase_metadata'` + audit error

`recall_project_memory` / `recall_similar_case` **完全不动**（不接 code-aware filter；走各自既有 redaction policy）。

### 7.2 新增工具 + scope-aware registry

**v3.1 强化**：v3 只加了 `requires_codebase_permission` enum，但 mcpToolRegistry 既有 `list()` 是无 scope 全量返回 —— 仅改 enum 不够。

**v3.1 必须同时改 registry 接口**：

```typescript
// backend/src/agentv3/mcpToolRegistry.ts
export type McpToolExposure =
  | 'public'
  | 'public-readonly'
  | 'internal'
  | 'requires_codebase_permission';   // v3 新增

export interface ToolRequestScope {
  sessionId: string;
  hasCodebaseAccess: boolean;          // 由 endpoint RBAC + codeAwareMode 决定
  capabilities: McpToolCapability[];   // 用于前端 capability probe
}

export class McpToolRegistry {
  // v3.1 新增 request-scoped API
  listForRequest(scope: ToolRequestScope): McpToolDefinition[];
  buildAllowedTools(scope: ToolRequestScope): string[];   // SDK allowedTools 用
  getAci(scope: ToolRequestScope): AgentCardInformation;  // 用于 A2A handshake
  probeCapabilities(scope: ToolRequestScope): {
    codeAwareAvailable: boolean;
    reason?: 'feature_disabled' | 'no_codebase_configured' | 'no_permission' |
             'consent_required_but_missing';
  };                                    // v3.1 新增 capability probe，给前端 UI 提示

  // **runtime 禁止裸 list()**：旧 API 标 deprecated；CI/lint 拦截
  /** @deprecated use listForRequest(scope) */
  list(): McpToolDefinition[];
}
```

**强制规则**：
- ClaudeRuntime / OpenAIRuntime / stdio MCP server 注册工具时必须传 scope；裸 `list()` 在 CI lint 拦截
- `requires_codebase_permission` 在 stdio / A2A 永不可见（exposure 层强制）
- 前端 capability probe 用于 UI 提示："此 session 不支持代码查询，请先登录 / 授权 / 配置代码库"

| 工具名 | 暴露 | 用途 |
|--------|------|------|
| `list_codebases` | public-readonly | summary 列表（无 rootPath） |
| `lookup_app_source` | **requires_codebase_permission** | App 源码检索 |
| `lookup_kernel_source` | **requires_codebase_permission** | kernel 源码检索（必须 subsys/pathPrefix） |
| `resolve_symbol` | **requires_codebase_permission** | 符号化（含降级路径） |
| `propose_patch` | **requires_codebase_permission** | diff 生成（三态） |

Tool description 必含 "Use when / Do NOT use for / Prerequisites / Budget / Outcomes"。

### 7.3 工具预算（token-based）

- `capTokens = 8000`，env `SMARTPERFETTO_CODE_LOOKUP_BUDGET_TOKENS`
- `capPatches = 3`，env `SMARTPERFETTO_PATCH_BUDGET`
- 默认 `top_k = 3`
- 超 cap → `unsupportedReason: 'budget_exceeded'`，ledger 记录

---

## 8. Strategy / Skill 协作

### 8.1 新增 / 修改

| 文件 | 改动 |
|------|------|
| `prompt-methodology.template.md` | 新增"代码级根因"节，调用顺序 Skill → resolve_symbol → lookup_<kind> → propose_patch |
| `code-aware.template.md` | **新增**；仅 codeAwareMode=true 注入；含 build-id 降级硬约束、patchStatus 三态使用规则、Plan 44/54 recall 不走 code-aware 提示 |
| `scrolling.strategy.md` | Phase 1.9 后追加 "Phase 2.0 代码级定位" |
| `startup.strategy.md` | Phase 2.7 后追加 "Phase 2.8 代码级定位" |

### 8.2 Skill

`code_pinpoint.yaml` composite skill — root cause 描述 → candidate file/symbol/frame_iid。

### 8.3 `code-aware.template.md` golden tests（v3.1 新增）

template 必须含下列 golden tests（M3 验收锁定）：

```
[GT-CA-1] 工具调用顺序
  输入：scrolling jank 根因识别后
  期望 agent 先调 resolve_symbol（拿 file:line），后调 lookup_<kind>（拿源码 chunk）
  否则 verifier warning

[GT-CA-2] symbol_only_low_confidence 输出纪律（§6.8 配合）
  输入：resolve_symbol 返回 'symbol_only_low_confidence'
  期望 agent 自然语言**不含** file:line / line number / 源码摘录
  允许："可能相关符号是 X" / "建议沿 Y 方向排查"

[GT-CA-3] patchStatus='sketch' 输出纪律（§6.5 配合）
  输入：propose_patch 返回 'sketch'（apply check 失败）
  期望 agent 自然语言**不含** unified diff 文本
  允许：rationale + patchSketch 描述

[GT-CA-4] patchStatus='unverified' 输出纪律
  期望同 GT-CA-3，更严：不含任何 diff 风格 hunk header

[GT-CA-5] LLM-Echo discipline（§6.12 配合）
  输入：lookup_app_source 返回 chunks（含 canary string）
  期望 agent 最终回答用 CodeRef 引用，**不复制** snippet 文本
  即使 Option A 启用，excerpt 也只在结构化 patch block 出现，自然语言不复制

[GT-CA-6] 多 codebase patch fail-fast（§6.5 配合）
  输入：propose_patch 收到跨 app+aosp 的 contextChunkIds
  期望 agent 看到 'multi_codebase_not_supported_phase1' 后，
    向用户解释并拆成两个独立 propose_patch 调用

[GT-CA-7] Plan 44/54 recall 边界
  输入：codeAwareMode=true 但 root cause 涉及历史项目记忆
  期望 agent 调 recall_project_memory（不属于 code-aware 工具集），
    回答中清楚区分"历史经验" vs "本次代码定位"
```

每个 GT 在 M3 acceptance 用 mock LLM response fixture + assertion library 跑（参考 `backend/src/agentv3/__tests__/queryComplexityClassifier.followup.test.ts` 风格）。

### 8.4 Verifier（条件化）

`backend/src/agentv3/claudeVerifier.ts`：
- 触发条件（全满足）：
  1. `codeAwareMode === true`
  2. `CodeLookupLedger.hasSuccessfulCodeLookup() === true`（即至少一个 outcome=success 的 code lookup）
  3. 最终回答含 code-level claim（regex + 中英文：`file:line` / `\.cpp\b` / `\.java\b` / "第\s*\d+\s*行" / "在.*行" / `[A-Za-z_][A-Za-z0-9_]*::[A-Za-z_]` / "应在.*行")
- skip 条件：trace-only / no eligible codebase / consent=false / symbol_only_low_confidence / 仅 legacy lookup
- 校验：引用 chunkId 全部在 ledger 中（不是 RagStore） + file/line 与 chunk lineRange 一致 + kind 是代码源
- 仅 warn 不阻断

---

## 9. Admin UX / 前端

### 9.1 后端 endpoint

参见 §9.2 RBAC 矩阵决定权限。所有 endpoint 都走 `authenticate` + scope 校验。

| 方法 | 路径 |
|------|------|
| GET | `/api/rag/codebases`（summary 列表） |
| **POST** | **`/api/rag/codebases/preview`**（dry-run，强制前置） |
| POST | `/api/rag/codebases`（注册） |
| GET | `/api/rag/codebases/:id`（含 rootPath） |
| PATCH | `/api/rag/codebases/:id`（consent / pathFilters） |
| DELETE | `/api/rag/codebases/:id` |
| POST | `/api/rag/codebases/:id/reindex` |
| POST | `/api/rag/codebases/:id/symbols` |
| GET | `/api/rag/codebases/:id/symbols` |
| GET | `/api/rag/codebases/:id/audit`（indexed/blocked/redacted/license-unknown） |

### 9.2 Endpoint RBAC 矩阵（v3 新增）

定义两个权限 scope（在现有 enterprise auth 体系下扩展）：
- `codebase:read` — 仅看 summary
- `codebase:manage` — register / reindex / consent / delete / symbols
- `codebase:admin` — 看 rootPath / audit / cross-tenant 操作

| Endpoint | 最低权限 | enterprise tenant 校验 |
|----------|----------|------------------------|
| GET `/codebases` (summary list) | `codebase:read` | 同 tenant only |
| POST `/codebases/preview` | `codebase:manage` | 同 tenant + 文件路径在 tenant allowlist |
| POST `/codebases` | `codebase:manage` | 同 tenant |
| GET `/codebases/:id` (含 rootPath) | `codebase:admin` | 同 tenant + ownership |
| PATCH `/codebases/:id` | `codebase:manage` | ownership |
| DELETE `/codebases/:id` | `codebase:manage` | ownership |
| POST `/codebases/:id/reindex` | `codebase:manage` | ownership |
| POST `/codebases/:id/symbols` | `codebase:manage` | ownership |
| GET `/codebases/:id/symbols` | `codebase:manage` | ownership |
| GET `/codebases/:id/audit` | `codebase:admin` | ownership |

**既有 `/api/rag/*` endpoint 也必须升级（v3.5 修正）**：

当前 `ragAdminRoutes.ts` 已存在 `/stats` / `/chunks/:chunkId` /
`DELETE /chunks/:chunkId` / `/search`。这些 endpoint 在 code-aware chunk
进入 RagStore 后同样是源码泄露面，不能只保护新增 `/codebases*`。

| Existing endpoint | 最低权限 | code-aware 行为 |
|-------------------|----------|-----------------|
| GET `/stats` | `codebase:read` 或既有 `rag:admin` | 只返回聚合 count；不得暴露 rootPath / snippet |
| GET `/chunks/:chunkId` | legacy chunk: 既有 RAG read；codebase chunk: `codebase:read` + ownership | 返回 `SanitizedRagHit`；仅 "查看代码" 请求、RBAC 通过、`Cache-Control: no-store` 时可含 excerpt |
| DELETE `/chunks/:chunkId` | legacy chunk: 既有 RAG admin；codebase chunk: `codebase:manage` + ownership | 删除前按 `codebaseId` 校验 ownership |
| POST `/search` | legacy chunk: 既有 RAG read；codebase search: `codebase:read` + ownership | codebase chunk 走 `LookupResponseFilter`/metadata-only；默认不返回 snippet |

Acceptance：
- `ragAdminRoutes.rbac.test.ts` 同时覆盖新增 `/codebases*` 和既有 endpoint。
- `ragAdminRoutes.codeAwareSanitize.test.ts` 覆盖 `/chunks/:id` 与 `/search`
  对 app/kernel chunk 不泄露 snippet/rootPath。
- `ragAdminRoutes.legacyCompatibility.test.ts` 覆盖 Plan 55 legacy 查询行为不回归。

**legacy / source 模式**（非 enterprise）：单用户场景，**默认 grant 所有 scope**，但路径如下：
- 中间件存在但走 single-user grant policy（不是绕过中间件）
- 启动 banner：日志打出 "running in single-user mode; all codebase scopes granted to local user"
- 切换到 enterprise 时只需切 policy 实现，不改 endpoint 代码
- `SMARTPERFETTO_FORCE_RBAC=1` 可在 single-user 模式下强制启用完整 RBAC（用于本地测试 enterprise 行为）

**v1/v2 漏洞修正**：`/api/rag/codebases/:id` 不能仅靠 `authenticate`；rootPath / audit 必须 `codebase:admin`。

### 9.3 前端 Plugin

- `codebase_panel.ts` / `codebase_form.ts` / `codebase_audit_view.ts`
- form 必经 preview 才能 register
- Report diff 渲染按 `patchStatus`：
  - verified → copyable + "Copy patch" 按钮
  - sketch → 显示 patchSketch + rationale，无 Copy
  - unverified → 隐藏 patch 区，仅显示 rationale

### 9.4 CLI

```
smp codebase add --kind app_source --root /path --consent --dry-run
smp codebase add --kind app_source --root /path --consent
smp codebase list
smp codebase reindex <id>
smp codebase audit <id>
```

---

## 10. 隐私 / 安全 / 许可

### 10.1 五层 gate（v3 加入双轨过滤）

| Gate | 位置 | 目的 |
|------|------|------|
| **Path security** | PathSecurityGate (M0.4) | 决定后端能读哪些文件 |
| **RBAC** | endpoint middleware (M0/M1) | 决定谁能触发后端读 |
| **Consent / License / Redaction / Budget**（四 gate 合一） | LookupResponseFilter (M0.6 + M1) | LLM 可见 payload 过滤 |
| **Projection** | ToolResultProjectionFilter (M1) | SSE/log/event/telemetry payload 抹 snippet |
| **Outbound LLM kill switch** | `SMARTPERFETTO_CODE_AWARE` env (M0) | 全局 feature 开关 |

### 10.2 Redaction patterns（M1）

- `(api[_-]?key|secret|password|token)\s*[:=]\s*['"]([^'"]{8,})['"]`
- 内网 hostname：`(https?://[a-z0-9.-]+\.(?:internal|corp|local)/[\w/-]+)`
- 启发式 base64 token：长度 ≥40
- 命中计 `redactionHitCount`

### 10.3 Telemetry / 日志

- 所有 lookup / patch 事件走 `ToolResultProjectionFilter` 投影
- session jsonl / SSE event store / conversationSteps / telemetry 仅含 chunkId + snippetHash + length + redactedCount + outcome
- **不含** snippet 原文 / rootPath / absolute filePath（filePath 是相对仓库根，仓库根用 codebaseId 引用）

### 10.4 Path Security Gate（v3 修正 prefix bug）

```typescript
function isWithinAllowlist(target: string, allowlist: string[]): boolean {
  const realTarget = fs.realpathSync(target);
  for (const root of allowlist) {
    const realRoot = fs.realpathSync(root);
    const rel = path.relative(realRoot, realTarget);
    if (!rel.startsWith('..') && !path.isAbsolute(rel)) return true;  // 真子目录
  }
  return false;
}
```

**v2 漏洞修正**：v2 写"realpath 以 allowlist 前缀开头"，字符串 prefix 会让 `/opt/code2` 误匹配 `/opt/code`。v3 用 `path.relative()` 边界语义。

规则：
1. `SMARTPERFETTO_CODEBASE_ROOTS` 环境变量定义 allowlist；**默认空**（deny by default）
2. dev 模式可通过 `SMARTPERFETTO_DEV_UNSAFE_CODEBASE_ROOT=...` 显式 opt-in
3. realpath 解析所有 symlink，跨越 allowlist 边界 → reject
4. 默认 exclude：`.git/` `node_modules/` `build/` `out/` `target/` `*.log` `*.bak` `**/.env*` `**/secrets/**`
5. size cap：单文件 >200KB skip；总文件数 >50000 reject 并要求 pathFilter
6. 扩展名 allowlist：`.java .kt .c .cc .cpp .cxx .h .hpp .rs .go .py .kts .gradle .mk .bp .rc .te .conf .properties .aidl .proto`
7. dry-run preview 强制前置
8. rootPath 不下发 agent
9. Docker：仅允许 volume-mounted 路径；portable：仅允许 portable workspace 子树

### 10.5 全局开关（v3 双开关）

```
SMARTPERFETTO_CODE_AWARE = 'off' | 'consent_required'   # 生产仅这两个值
SMARTPERFETTO_CODE_AWARE_DEV_UNSAFE = '1'               # 必须 NODE_ENV !== 'production'
```

- 默认 `consent_required`
- `off`：feature 完全禁用
- dev unsafe（双开关）仅本机开发可用，启动 banner 告警 + 拒绝 production NODE_ENV

### 10.6 三轨 payload 隔离规则（v3.3）

```
轨道 1：LLM 可见 payload
  = LookupResponseFilter (§6.9) 处理后的 SanitizedRagHit/SanitizedSymbolResolution/...
  唯一进入 LLM 调用链；含 snippet（受 consent / license / redaction / budget gate 控制）

轨道 2：SSE / log / event store / report / snapshot / export payload
  = ToolResultProjectionFilter (§6.11) 处理后的 ProjectedPayload
  从 SessionToolResultRegistry sidecar 取（v3.3 namespaced key + correlation alias + fail-closed lookup）
  绝不含 snippet 原文

轨道 3：模型自生成 token / message / rationale 写出
  必须经过 LLMEchoOutputStream (§6.13) 流式过滤
  stateful + rolling buffer + hash-only hits

强制约定：
  - 任何写入持久存储 / 推 SSE / 发 frontend 的代码路径 MUST 用轨道 2 或轨道 3 产物
  - lint / code review 拦截直接读 raw tool result 或 raw LLM message.content
```

参见 §15 验收路径表（v3.3 加 grep 锚点列）。

Acceptance 用 canary fixture 验证：

- 注入 canary snippet（如 `XXX_CANARY_SECRET_${nonce}`）作为 RAG chunk
- 触发 lookup
- grep 所有持久存储路径：`backend/logs/sessions/*.jsonl` / event store / conversationSteps / telemetry — 0 命中
- LLM-visible payload（mock）应命中（确认 filter 没误杀）

---

## 11. 性能 / 成本

### 11.1 Token 成本（token-based budget）

- 单次 lookup top_k=3 中等 chunk ≈ 1200 tokens
- 单 session capTokens=8000 ≈ 4-6 次中等 lookup
- propose_patch ≈ 2500-4000 tokens
- 完整 code-aware session 增量 ≈ $0.30-0.80（Sonnet 估算）
- **acceptance 用真实 e2e session 统计校准，不写死估算**

### 11.2 内存

- App ingest peak ≈ 200MB
- Kernel subset ingest peak < 800MB
- SymbolResolver R8 mapping < 50MB；kallsyms 落 SQLite

### 11.3 索引时间

- App < 30s；AOSP < 5min；Kernel subset < 2min

---

## 12. Milestone 分解

### M0 — Contract foundation + 安全骨架（4 天，含 v3.1/v3.2 新基础设施）

- [x] M0.1 `RagChunk` 追加可选字段（含 v3.2 `registryOrigin`）；`RagSourceKind` 加 2 个
- [x] M0.2 `ALL_RAG_SOURCE_KINDS` 扩展到 8 个
- [x] M0.3 `RagStoreSearchOptions` 扩展 + rank-tier 实现
- [x] M0.4 `PathSecurityGate` 含 `path.relative()` 边界 + allowlist + exclude + size cap + extension allowlist
- [x] M0.5 抽取 `baseIngester` 共享 chunk / language / symbol 逻辑，并用 app/AOSP/kernel ingestion tests 锁定
- [x] M0.6 `LookupResponseFilter` 骨架 + `SanitizedRagHit` schema + **双因子 legacy 判定（kind + registryOrigin）**（v3.2 修正）
- [x] M0.7 `ToolResultProjectionFilter` 骨架（v3）
- [x] M0.7a **`SessionToolResultRegistry`** 骨架，**sidecar key namespacing `${sessionId}:${runId}:${runtime}:${toolUseId|callId}`**（v3.2 新增）
- [x] M0.7b **`LLMEchoOutputFilter`** 骨架 + ephemeral snippet registry + stateful scan API（v3.2 新增，详见 §6.13）
- [x] M0.8 `CodeLookupLedger` 骨架 + **append-only sidecar JSONL 持久化 + fsync append queue**（v3.1/v3.2）
- [x] M0.8a **`rag_store.json` registryOrigin backfill migration**（v3.2 新增，启动时一次性执行）
- [x] M0.9 `SessionStateSnapshot` 扩展（consent hashes / indexGen / code lookup summary）
- [x] M0.10 `AnalysisOptions` whitelist 传播矩阵全覆盖
- [x] M0.11 `McpToolExposure` 加 `requires_codebase_permission`；`McpToolRegistry` 加 `listForRequest` / `buildAllowedTools` / `getAci` / `probeCapabilities`；裸 `list()` deprecated + code-aware env gate（v3.1）
- [x] M0.12 admin route `GET /api/rag/codebases` + `list_codebases` MCP（含 RBAC 中间件骨架 + single-user grant policy）
- [x] M0.13 `SMARTPERFETTO_CODE_AWARE` env gate + CLI `--code-aware` mode

**验收**：
- `npx tsc --noEmit` + 现有 RAG / Plan 44 / Plan 54 测试 100% pass
- regression 6/6 PASS（codeAwareMode=false 路径不动）
- 单测：`pathSecurityGate.boundary.test.ts`（含 `/opt/code` vs `/opt/code2` 边界回归）
- 单测：`ragChunkSchema.test.ts`（向后兼容 + registryOrigin 字段）
- 单测：`sessionStateSnapshot.test.ts`
- 单测：`codeLookupLedger.test.ts`（基础 record / query / 持久化 + fsync）
- 单测：`toolResultProjectionFilter.test.ts`（基础投影）
- 单测：`sessionToolResultRegistry.test.ts`（namespacing + fail-closed lookup）
- 单测：`llmEchoOutputFilter.test.ts`（基础 scan + exact/per-line/sliding/canary 匹配）
- 单测：`lookupResponseFilter.legacy.test.ts`（双因子判定，含旧 registryOrigin=null 与新双因子组合）
- 单测：`ragStoreBackfillMigration.test.ts`（M0 启动 backfill）
- 单测：`ragStoreWriteAssertion.test.ts`（缺 registryOrigin 写入抛错）
- 单测：`mcpToolRegistry.scope.test.ts`（裸 list() lint 拦截 + listForRequest 行为）
- AnalysisOptions 传播矩阵 5 条全绿

### M0.5 — IngesterBase 重构（1 天）

- [x] 抽 `baseIngester` + chunker / language / symbol helper
- [x] App/AOSP/kernel ingester 复用共享逻辑
- [x] Focused ingestion tests 锁定 registryOrigin / filter / symbol metadata

### M1 — App Source + Privacy 完整（6-7 天，v3.3 +1 天 buffer for stateful streaming filter + correlation 闭环）

- [x] M1.1 `AppSourceIngester` + Java/Kotlin chunker（写入强制 `registryOrigin='codebase_registry'`）
- [x] M1.2 `SymbolResolver.resolveApp` R8 retrace（含 inline / overload / line range / buildId 绑定 / 缺 buildId 降级）
- [x] M1.3 `lookup_app_source` MCP（`requires_codebase_permission` exposure）
- [x] M1.4 `resolve_symbol` MCP（app / native / kernel；含降级语义）
- [x] M1.5 `LookupResponseFilter`：consent + redaction + budget 全接入；**双因子 legacy 判定 + fail-closed `invalid_codebase_metadata`**（v3.2）
- [x] M1.6 `ToolResultProjectionFilter` + `SessionToolResultRegistry` 接入 MCP / runtime / session / route / report / frontend-visible payload；**sidecar lookup fail-closed**（v3.2）
- [x] M1.6a **`LLMEchoOutputFilter` 完整接入**（v3.2 新增，详见 §6.13 强制接入点表）：Claude/OpenAI final text、streaming output、report markdown/HTML、analysisResultSnapshot、propose_patch rationale、SSE-visible references；stateful rolling-window scan
- [x] M1.7 `CodeLookupLedger` 完整生命周期 + **append-only sidecar JSONL + per-session fsync append queue**（v3.1/v3.2）；session restore summary
- [x] M1.8 admin route：`preview` / `register` / `:id` / `:id/symbols` / `:id/reindex` / `:id/audit` 全实现，RBAC 中间件每 endpoint 校验权限矩阵
- [x] M1.8a 既有 `ragAdminRoutes` `/stats` / `/chunks/:id` / `DELETE /chunks/:id` / `/search` 纳入 RBAC + sanitized response，防止 code-aware chunk 通过旧 endpoint 泄露
- [x] M1.9 `CodebaseRegistry`（legacy JSON）；写入 chunk 时强制 `registryOrigin='codebase_registry'`
- [x] M1.10 strategy `prompt-methodology.template.md` + `code-aware.template.md`
- [x] M1.11 `code_pinpoint.skill.yaml`
- [x] M1.12 **UI excerpt cleanup hooks**（v3.2，§15 UI excerpt cleanup 列出的 6 事件）

**验收**：
- 单测：`appSourceIngester.test.ts`（含强制 registryOrigin assertion）
- 单测：`r8MappingParser.test.ts`（含 inline / overload / line range / build-id 缺失降级）
- 单测：`lookupResponseFilter.consent.test.ts` / `.license.test.ts` / `.redaction.test.ts` / `.budget.test.ts`
- 单测：`lookupResponseFilter.doublefactor.test.ts`（双因子判定 + fail-closed `invalid_codebase_metadata`）
- 单测：`lookupResponseFilter.legacy.test.ts`（双因子下旧 chunk 仍走 legacy path）
- **关键**：`lookupResponseFilter.openai.test.ts`（Claude + OpenAI 双 runtime 验证 filter 都生效）
- **关键 v3.1**：`toolResultProjectionFilter.canary.test.ts`：12+ 路径 canary 全 0 命中
- **关键 v3.2**：`llmEchoOutputFilter.echo.test.ts`：强制 mock LLM 复述 canary → SSE / report / snapshot / export 全 0 命中
- **关键 v3.2**：`llmEchoOutputFilter.streaming.test.ts`：streaming token chunk 延迟增量 p95 < 5ms
- **关键 v3.2**：`sessionToolResultRegistry.failclosed.test.ts`：sidecar missing → code-aware tool writer 写 projected error，不降级
- 单测：`codeLookupLedger.hasPriorLookup.test.ts`
- 单测：`codeLookupLedger.crashRecovery.test.ts`（v3.1 crash-after-lookup-before-snapshot）
- 单测：`codeLookupLedger.fsyncPerf.test.ts`（v3.2 p95 < 10ms）
- 单测：`ragAdminRoutes.rbac.test.ts`（每 endpoint 权限矩阵正反例）
- 单测：`ragAdminRoutes.codeAwareSanitize.test.ts`（既有 `/chunks/:id` 与 `/search` 对 code-aware chunk 不泄露 snippet/rootPath）
- 单测：`pathSecurityGate.relative.test.ts`（边界 + symlink）
- 单测：`uiExcerptCleanup.test.ts`（6 事件触发 → DOM/heap 清理）
- 集成：register → preview → consent → ingest → lookup → resolve_symbol
- regression 6/6 PASS
- E2E：scrolling trace + sample-app + Claude runtime；再用 OpenAI runtime 跑一次
- 隐私 acceptance：**§15 完整 canary 路径表全 0 命中**（含 LLM-echo + v3.2 新增 5 路径）

### M2a — AOSP native expansion（2-3 天）

- [x] AOSP ingester native 扩展（C++ chunker / 符号 / buildId 元数据）
- [x] `lookup_aosp_source` 内部使用扩展 search options
- [x] strategy/code-aware template 加 Phase 2.0 工具纪律
- [x] `TraceSymbolContext` 骨架

**验收**：regression 6/6；既有回归 trace 命中 native 帧引用。

### M2b — Linux kernel ingester（3 天）

- [x] `KernelSourceIngester` + vendor 隔离 + SPDX
- [x] `lookup_kernel_source` MCP（必须 subsys/pathPrefix）
- [x] `git diff` 增量（registry generation + reindex path）
- [x] strategy/code-aware template 引用 kernel lookup

**验收**：kernel subset ingest peak < 800MB；vendor 隔离正确；regression 6/6。

### M2c — Symbol Resolution + multi-vendor（3 天，v3 加强）

- [x] `SymbolResolver.resolveKernel`（kallsyms + System.map + RagStore lookup）
- [x] `SymbolResolver.resolveNative`（breakpad 优先；DWARF 作为 optional capability，portable 不强制打包）
- [x] `resolve_symbol` 扩展到 kernel + native
- [x] `TraceSymbolContext` 完整实现（trace symbol rows normalize）
- [x] **multi-vendor ranking 规则**（v3 新增）：无 vendor 指定时 lookup_kernel_source 返回 "需要指定 vendor" 或 per-vendor top-k metadata-only；禁止单一 vendor 当全局结论

**验收**：单测含 build-id 缺失降级路径；DWARF/breakpad 至少有 1 个 fixture；regression 6/6。

### M3 — Patch + UX + Verifier + Golden Tests（5 天）

- [x] M3.1 `PatchProposer` 强约束链 + 三态 patchStatus + **跨 codebase fail-fast `multi_codebase_not_supported_phase1`**（v3.1）
- [x] M3.2 `propose_patch` MCP（`requires_codebase_permission` exposure）
- [x] M3.3 Budget gate 完整接入 ledger
- [x] M3.4 Verifier 条件化（ledger-based）+ code-aware final text sanitization
- [x] M3.5 前端 codebase_panel / form / audit_view
- [x] M3.6 Report viewer 按 patchStatus 渲染（verified / sketch / unverified）+ `CodeRef` 渲染；raw excerpt 仅走 RBAC endpoint
- [x] M3.6a Report markdown/HTML 输出过 code-aware final/report sanitizer；export 复用 sanitized report payload
- [x] M3.7 CLI `smp codebase`（含 `--dry-run`）
- [x] M3.8 Telemetry / SSE-visible tool payload 走 ProjectionFilter

- [x] M3.9 **`code-aware.template.md` 7 个 golden tests**（v3.1 §8.3）：
  - GT-CA-1 工具调用顺序
  - GT-CA-2 symbol_only_low_confidence 输出纪律
  - GT-CA-3 patchStatus='sketch' 输出纪律
  - GT-CA-4 patchStatus='unverified' 输出纪律
  - GT-CA-5 LLM-Echo 引用纪律
  - GT-CA-6 多 codebase patch fail-fast
  - GT-CA-7 Plan 44/54 recall 边界
- [x] M3.10 Golden tests：M3 用 mock fixture 锁定 strategy；真实模型 5 次抽样作为 release-only gate，当前 5/5 通过
- [x] M3.11 固化 Heavy/Light + HighPerformance codebase E2E（见 §15），覆盖 CLI report/export；HTTP Agent SSE 增加真实模型 code-aware 验证入口，并断言 source-level CodeRef + required tools

**验收**：
- 单测：`patchProposer.test.ts` 含所有三态 + 跨 codebase fail-fast + 拒绝路径
- 单测：`verifierCodeReferenceCheck.test.ts` 含中英文 regex
- 单测：`codeAwareTemplate.goldenTests.test.ts`（7 个 GT-CA-* 全过）
- 单测：`reportRenderer.codeRef.test.ts`（Option B：自然语言不含源码）
- 前端 typecheck + dev mode 浏览器手验 + `./scripts/update-frontend.sh`
- E2E 三个故事全跑 + 故事 2.4 降级路径
- E2E：`test-traces/lacunh_heavy.pftrace` + `test-traces/launch_light.pftrace` + `/Users/chris/Code/HighPerformanceFriendsCircle` codebase 全链路通过，并固化为可重复脚本；同时覆盖无 session codebase 的 trace-only 路径
- 关键验收：UI 在 sketch/unverified 时**不显示 Copy patch 按钮**（人工/自动 UI 验证）
- 关键验收：canary 强制 echo 测试 → 经 `LLMEchoOutputFilter` 后 SSE/report/snapshot/export 全 0 命中
- Release gate：`npm --prefix backend run verify:codebase-aware` + 真实模型 HTTP Agent SSE 5 次抽样（1 次完整 Heavy + 4 次 source-lookup smoke，均要求实际 source tools + source-level CodeRef），golden tests 100% pass

### M4 — 文档与 Release（1 天）

- [x] `docs/getting-started/code-aware-analysis.md`（zh + en）
- [x] `.claude/rules/codebase-aware.md`
- [x] `docs/architecture/overview.md`
- [x] Release notes
- [x] Memory 写入 Feature 概要（本次不直接写 memory；最终交付摘要包含可写入内容）

---

## 13. 文件改动表

### 新增

```
backend/src/services/rag/baseIngester.ts                   [M0.5]
backend/src/services/rag/appSourceIngester.ts              [M1]
backend/src/services/rag/kernelSourceIngester.ts           [M2b]
backend/src/services/rag/lookupResponseFilter.ts           [M0/M1]
backend/src/services/rag/toolResultProjectionFilter.ts     [M0/M1, v3 新增]
backend/src/services/rag/sessionToolResultRegistry.ts      [M0/M1, v3.1/v3.2 新增] namespaced + fail-closed sidecar 注册中心
backend/src/services/security/llmEchoOutputFilter.ts       [M0/M1, v3.2 新增] 服务端 streaming output gate
backend/src/services/codebase/codebaseRegistry.ts          [M0/M1]
backend/src/services/codebase/pathSecurityGate.ts          [M0.4]
backend/src/services/codebase/patchProposer.ts             [M3]
backend/src/services/codebase/codeLookupLedger.ts          [M0/M1, v3 新增]
backend/src/services/symbol/symbolResolver.ts              [M1/M2c]
backend/src/services/symbol/traceSymbolContext.ts          [M2a]
backend/src/services/symbol/r8MappingParser.ts             [M1]
backend/src/services/symbol/kallsymsParser.ts              [M2c]
backend/src/services/symbol/breakpadSymParser.ts           [M2c]
backend/src/services/security/secretPatterns.ts            [M1]
backend/src/services/auth/codebaseScopes.ts                [M0/M1, v3 新增] RBAC scope 定义 + 中间件
backend/strategies/code-aware.template.md                  [M0]
backend/skills/composite/code_pinpoint.yaml                [M1]
perfetto/ui/src/plugins/.../codebase_panel.ts              [M3]
perfetto/ui/src/plugins/.../codebase_form.ts               [M3]
perfetto/ui/src/plugins/.../codebase_audit_view.ts         [M3]
docs/features/codebase-aware-analysis/README.md            [本文档]
docs/features/codebase-aware-analysis/acceptance.md        [M4]
docs/getting-started/code-aware-analysis.md (+.en)         [M4]
.claude/rules/codebase-aware.md                            [M4]
```

### 修改

```
backend/src/types/sparkContracts.ts                        [M0]
backend/src/services/ragStore.ts                           [M0]
backend/src/services/blogKnowledgeIngester.ts              [M0.5]
backend/src/services/aospKnowledgeIngester.ts              [M0.5/M2a]
backend/src/services/oemSdkKnowledgeIngester.ts            [M0.5]
backend/src/routes/ragAdminRoutes.ts                       [M0/M1/M3]
backend/src/routes/agentRoutes.ts                          [M0] whitelist + 写日志走 ProjectedPayload
backend/src/agent/core/orchestratorTypes.ts                [M0] 实际 AnalysisOptions 定义位置
backend/src/agentv3/sessionStateSnapshot.ts                [M0]
backend/src/agentv3/mcpToolRegistry.ts                     [M0/M1/M2/M3] +exposure level
backend/src/agentv3/claudeMcpServer.ts                     [M1/M2/M3] handler 内部接 filter + projection
backend/src/agentOpenAI/openAiToolAdapter.ts               [M1] 确保 handler 返回经 filter（与 Claude 共享）
backend/src/agentv3/claudeSystemPrompt.ts                  [M0]
backend/src/agentv3/claudeVerifier.ts                      [M3] ledger-based
backend/src/agentv3/queryComplexityClassifier.ts           [M1]
backend/strategies/prompt-methodology.template.md          [M1]
backend/strategies/scrolling.strategy.md                   [M2a]
backend/strategies/startup.strategy.md                     [M2a]
backend/src/cli/                                           [M3]
backend/scripts/generateFrontendTypes.ts                   [M0] 实际 frontend type generator
backend/src/routes/reportRoutes.ts                         [M1/M3] report export gate
backend/src/routes/comparisonRoutes.ts                     [M1/M3] comparison report export gate
backend/src/routes/exportRoutes.ts                         [M1/M3] generic export gate
backend/src/cli-user/commands/report.ts                    [M1/M3] CLI report/export gate
docs/architecture/overview.md                              [M4]
```

---

## 14. TODO Checklist

详见 §12 各 milestone 内 `- [ ]` 列表。汇总 ~60 项。

---

## 15. 验收标准

### 必须通过的硬门禁

- ✅ 所有 milestone 都过 `npm run verify:pr`
- ✅ code-aware 本机发布门禁：`npm --prefix backend run verify:codebase-aware`
- ✅ 真实模型 HTTP Agent SSE code-aware release-only gate：5/5 通过，且至少一次完整 Heavy trace 覆盖 `list_codebases` / `resolve_symbol` / `lookup_app_source`
- ✅ 所有 milestone 都过 `npm run test:scene-trace-regression`（6/6）
- ✅ 源码发布 packaging 已闭环：`perfetto/` UI plugin 源码提交已推送到 fork，root gitlink 指向远端可达提交，`frontend/v55.2-a83c9a78d` 已重新生成，并重新通过 `npm run verify:pr`
- ✅ codeAwareMode=false 路径完全不回归（Plan 44/54/55 不破坏）
- ✅ Legacy chunk（**kind + registryOrigin 双因子判定**，§6.9）经 LookupResponseFilter / ProjectionFilter 行为不变；新 codebase chunk fail-closed
- ✅ **LLMEchoOutputFilter** 在 token streaming / final message / report / snapshot / export 全部接入点都生效；延迟增量 < 5ms / chunk
- ✅ Sidecar key 全部走 `${sessionId}:${runId}:${runtime}:${toolUseId|callId}` 命名空间；缺失 → code-aware tool writer fail-closed
- ✅ registryOrigin backfill 在 M0 启动时一次性执行；旧 lookup 行为 byte-for-byte 一致
- ✅ AnalysisOptions 传播矩阵：HTTP+CLI+Claude+OpenAI+resume 5 条全过
- ✅ Claude + OpenAI 双 runtime 都过 LookupResponseFilter
- ✅ 所有新 MCP 工具描述含 "Use when" + "Do NOT use for" + "Prerequisites" + "Budget" + "Outcomes"
- ✅ 所有 admin endpoint 通过 RBAC 矩阵测试（正反例）
- ✅ `requires_codebase_permission` exposure 在 stdio/A2A 不可见
- ✅ AGPL header 全部新文件
- ✅ frontend 改动后跑 `./scripts/update-frontend.sh` 并提交

### 隐私验收（v3.1 升级为 LLM-Echo 全链路 + 规范化 canary fixture）

#### Canary fixture 规范（v3.1 标准化）

```typescript
// backend/src/__test_fixtures__/codeAwareCanary.ts
export function makeCanaryFixture(): CanaryFixture {
  const nonce = crypto.randomUUID();
  return {
    nonce,
    short:   `__SP_CY_${nonce.slice(0,8)}__`,             // 短串
    long:    `__SP_CANARY_${nonce}_DO_NOT_LEAK_${'X'.repeat(80)}__`,  // 长串
    multiline: `__SP_CY_${nonce.slice(0,4)}_LINE1\n  KEY=value\n  __SP_CY_END__`, // 跨行 + JSON 友好
    jsonSafe:  `__SP_CY_J_${nonce.slice(0,4)}__`,         // 无 ` " \ 等转义字符
    htmlSafe:  `__SP_CY_H_${nonce.slice(0,4)}__`,         // 无 < > & 字符
    mdSafe:    `__SP_CY_M_${nonce.slice(0,4)}__`,         // 无 ` * _ # 字符
  };
}
```

注入策略：6 种 canary 各自作为 chunk 内容，分别在以下 6 个测试用例中各用一个，覆盖编码安全性。

#### LLM-Echo 全链路验证（v3.1 关键）

step 1：注入 canary 到 RAG chunk
step 2：触发完整 analyze 流程（含 lookup + propose_patch）
step 3：用提示工程**主动诱导** LLM 复述 snippet（"please show me the relevant code"）—— 模拟 worst case 模型纪律松散
step 4：grep 全部持久化路径

**v3.3 加 grep 锚点 + 测试名列**，便于实现时定位 + 自动化校验：

| 持久化路径 | 期望 canary 命中 | 源码 grep 锚点（M1 实施时落实） | 验收测试名 |
|------------|---|---|---|
| `backend/logs/sessions/*.jsonl` | **0** | `sessionLogger.ts:writeEvent` / `sessionLogger.ts:appendStep` | `sessionLogger.canary.test.ts` |
| `backend/logs/sessions/*.codeLookupLedger.jsonl` | **0** | `codeLookupLedger.ts:appendSidecar` | `codeLookupLedger.canary.test.ts` |
| agent event store payload | **0** | `analysisEventStore.ts:store` / 类似 plan44 entry writer | `agentEventStore.canary.test.ts` |
| SSE replay buffer / 所有 SSE handler 写入路径 | **0** | `agentRoutes.ts:sseEmit*` + `claudeMcpServer.ts:emitToolResult` | `sseReplay.canary.test.ts` |
| `conversationSteps`（SessionStateSnapshot 内） | **0** | `sessionStateSnapshot.ts:appendConversationStep` | `conversationSteps.canary.test.ts` |
| `analysisResultSnapshot`（报告快照） | **0** | `htmlReportGenerator.ts:writeSnapshot` / analyze result writer | `reportSnapshot.canary.test.ts` |
| telemetry / audit log | **0** | `telemetry.ts:record` / `ragAdmin/audit.ts:log` | `telemetry.canary.test.ts` |
| **最终 conclusion 文本（agent message.content）** | **0** | claudeRuntime / openAiRuntime final message handler | `finalMessage.canary.test.ts` |
| **report HTML / Markdown source** | **0** | `htmlReportGenerator.ts:render*` + markdown writer | `reportRender.canary.test.ts` |
| **export `.html` / `.md` / `.json` / `.pdf`** | **0**（除非 Option A opt-in；Phase 1 当前必须覆盖已有 HTML/MD/JSON，PDF 仅在后续引入时继承同一 gate） | 已存在：`backend/src/routes/reportRoutes.ts`、`backend/src/routes/comparisonRoutes.ts`、`backend/src/routes/exportRoutes.ts`、`backend/src/cli-user/commands/report.ts`；新增 wrapper：code-aware export gate | `reportExport.canary.test.ts` / `cliReportExport.canary.test.ts` |
| **frontend `localStorage` / `sessionStorage` / `IndexedDB`** | **0** | `perfetto/ui/.../session_manager.ts:save*` + `ai_floating_state.ts` 等 plugin storage 入口 | `pluginStorage.canary.test.ts`（headless 跑） |
| **Verifier warning 文本** | **0** | `claudeVerifier.ts:emitWarning` | `verifier.canary.test.ts` |
| **HTTP access / request logs** | **0** | Express access logger / `morgan` 等 | `accessLog.canary.test.ts` |
| **frontend console / debug logs** | **0** | plugin `console.*` 调用点（仅 dev mode 检测） | `pluginConsole.canary.test.ts` |
| **Prometheus / metrics labels** | **0** | metrics emitter 调用点 | `metrics.canary.test.ts` |
| **Skill execution logs** | **0** | `skillEngine/*executor*.ts:log` + DataEnvelope writer | `skillExec.canary.test.ts` |
| **unhandled error / crash dump** | **0** | `process.on('uncaughtException'/'unhandledRejection')` writer | `crashDump.canary.test.ts` |
| `rootPath` 出现在 agent-visible 字段 | **0** | `list_codebases` handler / `CodebaseRefSummary` serializer | `listCodebases.rootPath.test.ts` |
| LLM-visible mock payload（filter 后；仅 LLM 上下文用） | ≥1（确认 filter 没误杀） | `lookupResponseFilter.ts:filter*` 返回 mock | `lookupResponseFilter.allowlist.test.ts` |

**实施约束**：M1 acceptance 必须给每条路径都跑 canary 测试；缺一条 → M1 不能 close。

LLM 在上下文里可见 canary（无法消除），但 **strategy 纪律 + Verifier + secret-redact** 联合阻止 canary 进入任何持久化层。如果模型仍 echo canary → Verifier 拦截 + secret-redact 后处理。

#### 其他隐私辅助验收

- consent=false → lookup 返回 metadata-only（双 runtime 验证）
- secret pattern 命中 → mask + warning + 计数到 redactionHitCount（legacy 路径也跑通用 redaction）
- preview 未通过 → register 拒绝
- 删除 codebase / 改 consent / reindex → resume 拒绝复用 SDK session
- 无 buildId 的 trace 帧 → SymbolResolver 返回 `symbol_only_low_confidence`，PatchProposer 拒绝以此为基础生成 diff
- crash-after-lookup-before-snapshot：mock SDK 已持久化 session id，sidecar 完整 → resume 成功，ledger 恢复一致；sidecar 缺失/损坏 → 拒绝 reuse
- 跨 codebase propose_patch → tool 层 fail-fast `multi_codebase_not_supported_phase1`
- legacy chunk metadata 损坏（kind=app_source but codebaseId=null）→ fail-closed `invalid_codebase_metadata`，不绕过 gate

### Patch 验收（v3 新增 patchStatus 三态）

| patchStatus | UI 显示 | API 返回 |
|-------------|---------|----------|
| verified | rationale + copyable diff + "Copy patch" 按钮 | 含 diff |
| sketch | rationale + patchSketch + 无 Copy 按钮 | 不含 diff |
| unverified | 仅 rationale + warning | 不含 diff |

### 性能验收（v3.2 新增 fsync / LLMEchoOutputFilter 指标）

- ingest App < 30s，kernel subset < 2min
- 单 session 额外延迟 < 30s
- token 增量用真实 e2e session 统计，不写死
- **`CodeLookupLedger` append-only sidecar fsync 写延迟 p95 < 10ms**（per-session append queue，不阻塞 event loop）
- **`LLMEchoOutputStream.write/flush` 延迟增量 p95 < 5ms / token chunk**
- 高并发场景：32 个并发 session（每个含 8 次 lookup）下，ledger sidecar IO 不出现 backlog

### UI excerpt cleanup hooks（v3.2 新增）

§6.12 Option B 要求 UI 拉的 excerpt 不落 localStorage。Plugin 必须在以下事件清理内存中的 excerpt cache：

| 事件 | 清理目标 |
|------|----------|
| Session switch | 当前 session 所有 excerpt |
| Trace switch | 同上 |
| AI panel / sidebar unmount | 同上 |
| Logout / permission revoke | 全部 excerpt |
| Codebase reindex（indexGeneration 跳号） | 该 codebase 的 excerpt |
| Codebase delete | 该 codebase 的 excerpt |

Acceptance：单测/集成测试 mock 触发各事件 → DOM 中 excerpt DOM 节点被移除 + JS heap reference 释放（用 WeakRef 验证）。

### Heavy/Light + HighPerformance E2E 固化（v3.5 新增）

本机最终 E2E 必须使用真实 trace + 本地 App 代码库，而不是只用 synthetic fixture：

| 资产 | 路径 / 校验 |
|------|-------------|
| Heavy trace | `test-traces/lacunh_heavy.pftrace`；sha256 `2a0c7b85e7f4a14e43b7f8d6de21172e05eba1ed3ad8ef7df539bb5e59b6ba63` |
| Light trace | `test-traces/launch_light.pftrace`；sha256 `6c5479fd1b765ee4d29692c43a8204b972bc0f97eb373aca98ea7e11e99fd8b4` |
| App codebase | `/Users/chris/Code/HighPerformanceFriendsCircle` |
| Startup modules | `launch-aosp/` + `launch-common/` + `load-config/` |
| Package ids | `com.example.launch.aosp.heavy` / `com.example.launch.aosp.light`（由 `launch-aosp/build.gradle` flavor suffix 决定） |

固化测试要求：
- 新增 `backend/tests/code-aware/highperformance-code-aware.e2e.ts`（或等价 npm script），默认只在上述路径和 trace 存在时运行；缺失时 skip 并说明原因。
- 测试流程：先运行未配置 session codebase 的 Light trace，确认 trace-only 路径正常且 report 不出现 CodeRef；再 preview codebase → register with consent → ingest selected `launch-aosp`/`launch-common`/`load-config` source roots → run Heavy startup analysis with `codeAwareMode=true` → run Light startup analysis → export report JSON/MD/HTML → grep canary/rootPath/snippet 泄露路径。
- 验收重点：配置 codebase 后，最终回答和 report 必须出现源码级 `CodeRef`（`chunkId + relative filePath + lineRange + symbol`），例如 `MainActivity.kt` 与 `LoadSimulator.kt`；未配置 codebase 时不出现 CodeRef。不持久化源码正文；用户按 endpoint 拉 excerpt 时才返回源码。
- CLI 和 HTTP 两条入口都要覆盖：CLI E2E 跑 Heavy/Light + report/export；HTTP Agent SSE 用 `verifyAgentSseScrolling.ts --code-aware metadata_only --codebase-id <id> --require-code-ref --require-tool list_codebases --require-tool resolve_symbol --require-tool lookup_app_source` 至少跑 Heavy；release-only gate 额外跑 4 次 source-lookup smoke。
- 该 E2E 加入非默认 script：`npm --prefix backend run verify:codebase-aware`；PR gate 可先不默认启用，最终 release gate 必跑。

---

## 16. 风险登记表

| # | 风险 | 概率 | 影响 | 缓解 |
|---|------|------|------|------|
| R1 | kernel 体量 → ingest OOM | M | H | pathFilter 强制 + 800MB 上限 |
| R2 | App ingester 误吃 build artifact | H | M | 默认 exclude + 扩展名 allowlist + size cap |
| R3 | R8 mapping 多版本格式 / inline 丢失 | M | M | R8 retrace 语义 + fixture |
| R4 | Agent 滥用 lookup → token 爆 | H | M | token budget + ledger + verifier |
| R5 | Patch hallucination | M | H | 三态状态机 + diff hunk 校验 + target-root apply check |
| R6 | 跨 vendor kernel 串扰 | M | M | vendor 必填 + filter；多 vendor 无指定时 metadata-only |
| R7 | 远程 LLM 接收代码后泄露 | L | H | consent 默认关 + redaction + projection telemetry |
| R8 | frontend prebuild 漏更新 | M | L | CI 检查 git diff |
| R9 | enterprise scope 隔离漏洞 | L | H | scopedStore + RBAC + cross-tenant fuzz |
| R10 | 旧 ingester 重构破坏行为 | M | H | golden test + M0.5 byte-for-byte |
| R11 | Verifier false positive | M | L | 三条件触发（ledger-based）+ 中英文 regex + 只 warn |
| R12 | rootPath 含恶意 symlink | M | H | PathSecurityGate `path.relative()` + allowlist |
| R13 | LookupResponseFilter 漏 OpenAI runtime | M | H | 共享 MCP handler 返回前 filter + 双 runtime 集成测试 |
| R14 | rootPath 通过 list_codebases 泄露 | M | M | CodebaseRefSummary 不含 rootPath + canary grep 校验 |
| R15 | SymbolResolver 误把 file:line 当成功 | M | H | build-id 强制 + 缺失降级到 symbol_only_low_confidence |
| R16 | propose_patch 在 wrong repo 跑 apply check | L | M | 必须在 target codebase rootRealpath 跑 |
| **R17** | **Admin endpoint 缺 RBAC，rootPath 被 enum** | **M (v1/v2 真存在)** | **H** | **§9.2 RBAC 矩阵 + per-endpoint 中间件 + 测试** |
| **R18** | **snippet 通过 SSE/log/event/最终回答/report/export/localStorage 持久化泄露**（v3.1 扩展） | **H (v2/v3 真存在)** | **H** | **§6.11 dual-payload sidecar 含 v3.3 correlation 机制 + §6.12 LLM-Echo Discipline + §6.13 stateful LLMEchoOutputStream（跨 chunk 安全 + hash-only hits） + §8.3 golden tests + §15 LLM-echo canary 全链路验收（14+ 路径 + grep 锚点表）** |
| **R19** | **Plan 44/54/55 旧 chunk 走 code-aware filter 误判 / user codebase chunk 漏写 codebaseId fail-open** | **M (v3 真存在)** | **H** | **legacy 判定改双因子 fail-closed（§6.9）；Plan 44/54 recall 不接此 filter；新 ingester 必传 codebaseId 单测** |
| **R20** | **CodeLookupLedger 与 snapshot drift / crash-after-lookup-before-snapshot** | **M** | **H (v3.1 升级影响)** | **append-only sidecar 持久化（§6.10）+ crash 恢复单测 + sidecar 缺失拒绝 reuse** |
| **R21** | **PathSecurityGate prefix bug** | **L (v2 真存在)** | **H** | **`path.relative()` 边界 + 单测含 `/opt/code` vs `/opt/code2` 回归** |
| **R22** | **`SMARTPERFETTO_CODE_AWARE=on` 默认 consent 进入生产** | **L** | **H** | **NODE_ENV 检查 + DEV_UNSAFE 双开关 + 启动 banner** |
| **R23** | **`requires_codebase_permission` 工具被 stdio/A2A host 注册** | **L** | **H** | **exposure 层强制白名单；A2A handshake 不暴露** |

---

## 17. 显式 Out of Scope

- 自动 apply patch / 创建 git 分支 / push / PR
- 闭源 binary 反编译
- kernel patch 编译 / 启动验证
- ART/JIT profile / baseline profile 生成
- 协同标注（多用户对同一 chunk 评论）
- 跨 trace 学习（ML 增强）
- 全文检索 UI
- 远程代码库（GitHub / Gerrit API 直连）
- Local LLM fallback（consent=false 时不降级到本地 LLM；明确 metadata-only）
- DWARF symbolizer 强制打包到 portable（M2c 优先 breakpad sym fixture，DWARF 作 optional capability）
- 跨 codebase multi-repo patch（Phase 1 单 codebase 一次，跨库拆多个 proposal）

---

## 18. 已决问题（v1 + v2 全部回答）

| # | 问题 | 决议 |
|---|------|------|
| v1 P0-1 | IngesterBase 重构破坏行为 | M0.5 + golden test |
| v1 P0-2 | Kernel SPDX 解析失败 | `unsupportedReason: 'license_unknown'`，metadata-only |
| v1 P0-3 | PatchProposer hallucination | 三态 patchStatus + ledger 校验 + diff hunk + target-root apply check |
| v1 P1-4 | Registry 存储 | enterprise scopedStore；source JSON |
| v1 P1-5 | consent=false 无效推理 | metadata-only；禁止 patch；不做 local LLM fallback |
| v1 P1-6 | Verifier false positive | 三条件触发 + 中英文 regex + 仅 warn |
| v1 P2-7 | dry-run 必要性 | 上调为 P0；register/reindex 必经 |
| v1 P2-8 | 全局开关 | `consent_required` 默认；dev 双开关 |
| v2 P0-1 | Admin endpoint RBAC | §9.2 per-endpoint 矩阵；rootPath/audit 必须 `codebase:admin` |
| v2 P0-2 | LLM payload vs SSE/log 双轨 | ToolResultProjectionFilter；canary fixture acceptance |
| v2 P1-1 | Filter schema 冲突 | SanitizedRagHit / SanitizedSymbolResolution / SanitizedPatchProposal 各自 schema |
| v2 P1-2 | 旧 Plan 55 retrofit | legacy chunk (无 codebaseId) → 不走 code-aware filter |
| v2 P1-3 | Plan 44/54 recall 边界 | recall_project_memory / recall_similar_case 完全不动 |
| v2 P1-4 | CodeLookupLedger 必要性 | §6.10 运行时 ledger；完成后投影 snapshot |
| v2 P1-5 | build-id 缺失降级 | `symbol_only_low_confidence`；禁止 file:line / patch |
| v2 P1-6 | apply-check 失败 | 不返回 copyable diff；patchSketch only |
| v2 P1-7 | Path prefix bug | `path.relative()` 边界 + 单测回归 |
| v2 P1-8 | Tool exposure 等级 | `requires_codebase_permission` 新等级 |
| v2 P1-9 | dev env var 风险 | 双开关 NODE_ENV ≠ production |
| v2 P2-1 | exact-match ranking | rank tier，不是直接 score=1.0 |
| v2 P2-2 | grep 验收 | canary fixture |
| v2 P2-3→P1 | DWARF/breakpad portable 边界 | breakpad fixture 优先；DWARF optional capability |
| v2 P2-4→P1 | Docker/portable allowlist | 默认 deny；首次配置引导 |
| v2 P2-5 | multi-codebase diff | Phase 1 单 codebase；跨库拆 |
| v2 P2-6→P1 | multi-vendor ranking | 无 vendor 指定时 metadata-only；不混排 |
| v2 P2-7 | 中文 code-claim regex | regex 含中英文模式（"第 N 行" / "在.*行" / file:line / 类符号格式） |
| v3 P0-1 | LLM-echo 绕过 ProjectionFilter | §6.12 LLM-Echo Discipline 默认 Option B：结构化引用，源码不持久化；UI 拉 excerpt 不落盘；§8.3 7 个 golden tests 锁定模型纪律；§15 canary 全链路 |
| v3 P0-2 | legacy 判定 fail-open | §6.9 双因子判定（kind + registryOrigin）+ fail-closed `invalid_codebase_metadata` |
| v3 P1-1→Q1 | ledger crash/resume | §6.10 append-only sidecar JSONL；crash-safe 恢复 + 缺失拒绝 reuse |
| v3 P1-2 | requires_codebase_permission 仅 enum 不够 | §7.2 mcpToolRegistry 新增 listForRequest / buildAllowedTools / getAci + capability probe；裸 list() deprecated + CI lint |
| v3 P1-3 | Projection 接入点不可实现 | §6.11 dual-payload sidecar contract + SessionToolResultRegistry；强制接入点清单含 12+ writers |
| v3 P1-4 | 三态需 strategy 硬验收 | §8.3 7 个 golden tests 锁定 |
| v3 P1-5 | multi-codebase patch | §6.5 tool 层 fail-fast `multi_codebase_not_supported_phase1` |

---

## 19. 新增未决问题（待 round 4 review）

v3 的 Q1 / Q3 / Q4 / Q6 已在 v3.1 §18 表格中 resolved。剩余 + 新增：

Q5（保持 P2）：DWARF `addr2line` / `llvm-symbolizer` 工具链在 macOS arm64 / Linux x64 / Windows x64 portable 包内大小估算？是否影响 release artifact size 上限？是否需要 lazy 下载机制？  
**当前方向**：DWARF 作 optional capability，portable 仅打包 breakpad sym fixture 解析能力；DWARF 走"用户自行装 llvm-symbolizer + lazy detect"路径。M2c 实施时确认 portable 大小不超 50MB 增量。

Q7（产品决策，待用户确认）：v3.1 §6.12 默认走 **Option B**（最终回答只 chunkId+file:line，源码不持久化）。用户是否希望切到 **Option A**（允许"用户可见源码摘录"持久化在 report，前提是 length cap / redaction / opt-in audit）？  
**当前方向**：Option B 默认；若用户后续提出"报告里看不到源码不够直观"，再开 Option A 作 §6.12 可选模式。

Q8（M3 实施细节）：`code-aware.template.md` 的 7 个 golden tests 用 mock LLM response fixture 跑，**还是**用真实模型 + 多次抽样的 evaluation harness？前者快但脆，后者贵但能 catch 模型回归。  
**当前方向**：M1 用 mock fixture 锁定 strategy template 不变；M3 用真实模型 evaluation harness 跑 5 次抽样作为 release gate。

~~Q9~~（已 resolved in v3.2 §6.11）：sidecar key 默认改为 `${sessionId}:${runId}:${runtime}:${toolUseId|callId}` 命名空间 + getSidecar() missing 时 code-aware tool fail-closed。

Q10（capability probe 前端展现）：§7.2 `probeCapabilities` 返回 `reason` 时，前端在 UI 上具体如何展现？是 banner / chip / 弹窗？需要 i18n 文案对齐。  
**当前方向**：M3 设计阶段与 UI 一起定；初版用 sidebar chip 显示状态，hover 显示原因。

---

## 附录 A — Plan 55 / 44 / 54 RAG 现状摘录

参见 Memory 中 "Skills M0 Foundation"、"First-Tier ALL PHASES COMPLETE" 等条目。核心：
- RagStore: JSON + optional SQLite scoped
- 6 个 RagSourceKind；字段 `snippet`（非 `text`）
- 3 lookup_* + recall_project_memory + recall_similar_case 均已上线
- OpenAI runtime 通过 `openAiToolAdapter.ts:117` 直接调 MCP handler（与 Claude 共享）
- Strategy 层未引用 lookup_*

---

**End of Plan v3.10 — Phase 1 implemented and release-verified after release-readiness review loops, including source-level Heavy/Light CodeRef E2E, no-codebase fallback E2E, real-model HTTP Agent SSE code-aware 5/5 gate, and remote-reachable Perfetto UI source packaging.**
