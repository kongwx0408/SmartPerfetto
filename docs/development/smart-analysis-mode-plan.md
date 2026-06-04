# Smart Analysis Mode (智能预设) — Implementation Plan v3.1

> **Document role**: 项目文档版本（设计 plan，非 runtime 读取）。源 plan 工作区在 `~/.claude/plans/app-app-distributed-seal.md`，未来修订请同步两处。
>
> **Status**: v3.1 — Codex Round 3 判定"**没有 P1**，可进入执行"，仅 2 条 P2 minor 已 fold（见 §4.4 / §4.5 / §4.7 / §6 / §8 验收口径精确化）。2026-05-24 已进入本地实现与验证阶段；执行进度见 `docs/development/smart-analysis-mode-todo.md` 和 `docs/development/smart-analysis-mode-completion-audit.md`。
>
> **Codex session**: Round 1+2+3 同 session `019e5958-3d33-7c93-87a2-6590c61304fa`（可续接更深问题）
>
> **执行授权**：本 plan 已通过三轮 Codex review；2026-05-24 用户已授权按本 plan 完整实现 Smart Analysis Mode。

## 1. Context

厂商性能测试常用一条连续 trace 覆盖完整脚本（冷启动 → 热启动 → 滑动 → Back/Home → 点击 → 亮灭屏 → 再启动……）。主分析 `/analyze` 的 sceneClassifier 单场景路由无法处理；`/scene-reconstruct` Stage 2 自动深钻只覆盖 startup + non_startup 两条路由。

目标：新增"智能"preset，主面板一键自动识别混合 trace 场景 + 6 类深钻 + 跨场景叙述，与"场景还原"并行，零行为污染。

## 2. Current State (Codex R1+R2 校正版)

| 组件 | 文件 | 位点 |
|---|---|---|
| Preset 配置 | `perfetto/.../types.ts` | 951-965 PRESET_QUESTIONS |
| Preset handler | `perfetto/.../ai_panel.ts` | 3916 sendPresetQuestion → 5749 handleChatMessage（body 仅 query/traceId/analysisMode） |
| Slash command | `perfetto/.../ai_panel.ts` | **3850** command 拦截点，4277 当前无 /smart |
| Scene 检测 skill | `backend/skills/composite/scene_reconstruction.skill.yaml` | 25+ scene types 纯 SQL |
| sceneStoryService | `backend/src/agent/scene/sceneStoryService.ts` | 140-673；cancel 374；report_ready 473 |
| sceneIntervalBuilder | `backend/src/agent/scene/sceneIntervalBuilder.ts` | 245 buildAnalysisIntervals 无 profile；**268 数组 first-match 匹配，priority 不参与** |
| Stage 2 路由 | `backend/src/agent/config/domainManifest.ts` | 33 SceneReconstructionRouteRule 无 profile |
| Job Runner | `backend/src/agent/scene/sceneAnalysisJobRunner.ts` | 12（TP 内部串行 SQL 注释）/ 148（cancel 仅队列）/ 267 dataEnvelopes 置空 |
| SceneReport types | `backend/src/agent/scene/types.ts` | **199** 已含 jobs.displayResults + cachedDataEnvelopes |
| SceneReportStore | `backend/src/services/sceneReport/sceneReportStore.ts` | **78** byHash: hash→reportId；193 pendingByHash 也按 hash |
| SceneReportMemoryCache | `backend/.../sceneReportMemoryCache.ts` | **40** 按 traceId（非 hash） |
| /scene Routes | `backend/src/routes/agentSceneReconstructRoutes.ts` | 236-355 |
| 主 chat /analyze | `backend/src/routes/agentRoutes.ts` | options.analysisMode 4 处；同 handler 服务 `/sessions/:id/runs` (1670)；runAgentDrivenAnalysis 显式构造 runtime options (3192)；**cancel 处理** (2304)；**sendAgentDrivenResult 仅写已完成事件** (5510)；broadcastToAgentDrivenClients (3839) |
| Snapshot Schema | `backend/src/types/multiTraceComparison.ts` | **181 — AnalysisResultSnapshot 当前无 metadata 字段，无 kind 槽位**；11 sceneType fixed enum |
| Snapshot Pipeline | `backend/src/services/analysisResultSnapshotPipeline.ts` | 44 sceneType 推断 |
| Final Report Gate | `backend/src/services/finalReportContractGate.ts` | **43** 按 sceneType / conclusionContract.metadata.sceneId / classifyScene(query) 找 contract |
| Strategy loader | `backend/src/agentv3/strategyLoader.ts` | 195 全部 .strategy.md 注册为 scene |
| 候选深钻 skills | `backend/skills/composite/` | anr_analysis ✓ / click_response_analysis ✓ / navigation_analysis ✓；**device_state_snapshot 不存在**；SCENE_TYPE_GROUPS 无 device_state |

## 3. Goals & Non-Goals (Codex R2 #8 修正)

### Goals
- 主 AI 面板 preset 行新增"🧠 智能"按钮（紧邻"场景还原"）
- 点击后混合 trace 自动 Stage1 检测 → Stage2 按 sceneType 路由 6 类深钻 → Stage3 跨场景 Haiku 摘要
- 双投射：主 chat 对话气泡 + Story Sidebar 详细 timeline
- 输出契约三 surface：chat / HTML report（沿用主 chat 既有 report artifact 链路）/ CLI artifact
- 与"场景还原"preset 并行不互斥；`/scene` 命令**语义等价不变**（语义而非 byte-equal）

### Non-Goals (v1 不做)
- multi-scene sceneClassifier 重写
- HTML report 模板深度改造
- Comparison + Smart 组合（v1 显式禁用，handler 入口拒绝 400）
- CLI `smp ask` 接入智能 preset
- 多 trace 多结果智能对比
- **AnalysisResultSnapshot 集成（Codex R2 #8 修正）**：snapshot schema 当前无 metadata 字段，硬塞会破 store/API/comparison/workspaceWindow。v1 智能模式**不持久化 smart snapshot**；report artifact 沿用主 chat 既有链路落 HTML，足以满足 chat / report 两 surface。Snapshot 集成留给独立 plan（schema 扩展 + comparison/UI/window 同步改）

## 4. Architecture (v3.1)

### 4.1 数据流总览

```
[FE] 用户点 🧠 智能
  → ai_panel.handleCommand("/smart")    // 在 ai_panel.ts:3850 command 拦截点新增分支
  → handler 直接构造 fetch，不回 handleChatMessage
  → POST /api/agent/v1/analyze
     body: { query:"/smart", traceId,
             options:{ analysisMode, preset:"smart" } }

[BE] agentRoutes /analyze 和 /sessions/:id/runs handler 入口
  → normalizeAnalyzeOptions(rawOptions, ctx)    // 必须在 referenceTrace validation
                                                // / prepareSession / lease decision
                                                // / blockedStrategyIds 之前执行
     - 互斥：smart + referenceTraceId → 400
     - 互斥：smart + /sessions/:id/runs → 400
  → if normalized.preset==="smart" → dispatch SmartAnalysisOrchestrator
  → else 现有 orchestrator.analyze() 不变

[SmartAnalysisOrchestrator] (new)
  ├─ prepareSession (主 chat) — 复用现有 prepareSession helper
  ├─ const reportPromise = sceneStoryService.start({
  │       traceId, sessionId,
  │       routeProfile:"smart",
  │       projectionMode:"dual",
  │       cancelToken                  // NEW: 见 §4.8
  │     })
  ├─ projector 仅翻译进度类 scene_story_detected/completed → 主 chat 进度气泡
  │   （不发任何 conclusion / terminal）
  ├─ await reportPromise → finalized SceneReport (barrier)
  ├─ buildSmartChatReport(report) → AgentRuntimeAnalysisResult
  │   - conclusionContract.metadata.sceneId = 'smart'   // Codex R2 #9 关键
  ├─ finalizeAgentDrivenSession(session, result)         // NEW helper 见 §4.5
  │   - 设 session.result / 质量门禁 / persist turn / status='completed'
  │   - 发主 chat conclusion → reportUrl → analysis_completed → end
  │   - 关 SSE clients
  └─ (v1 不调 persistSmartAnalysisSnapshot — Codex R2 #8)
```

### 4.2 routeProfile 显式化（Codex R2 #1 修正）

去掉 'both' 默认。`SceneReconstructionRouteRule` 加 `routeProfile: 'legacy' | 'smart'` **必填字段**：

| 改动 | 详情 |
|---|---|
| Manifest schema | 旧 `startup_scene` / `non_startup_scene` 显式标 `routeProfile:'legacy'`；新 6 条显式标 `'smart'` |
| Loader 校验 | 未指定 profile 的 route **加载时抛错**（不静默默认） |
| `getSceneReconstructionRoutes(profile)` | 按 profile 严格过滤，不返回 'both' 跨界条目 |
| `buildAnalysisIntervals(scenes, profile)` (sceneIntervalBuilder.ts:245) | 加 profile 参数；first-match 在 profile-filtered 子集内 |
| `sceneStoryService.start({ routeProfile })` | 接收并下传；默认 'legacy' 保持 /scene 调用方零改动 |
| `/scene-reconstruct` preview/start | 不传 profile → 默认 'legacy' |

### 4.3 SceneReport cache 隔离（Codex R2 #2 修正）

**不动 `report.traceHash`**（保持元数据语义）。新增 `cacheLookupKey` 维度：

| 位点 | 改动 |
|---|---|
| `SceneReportStore.loadByHash(hash, profile)` (sceneReportStore.ts:78) | 签名加 profile；内部 index 键扩为 `${hash}::${profile}` 但 value 仍是 reportId；老 index 条目兼容读（认为是 'legacy'） |
| `SceneReportStore.pendingByHash` | key 同步扩 profile |
| `SceneReportMemoryCache` (cache:40) | key 扩为 `${traceId}::${profile}` |
| `pipelineVersion` | **不全局 bump**（Codex R2 第二组 P2 修正）。只在真改 SceneReport schema 字段时 bump。本 plan v3 SceneReport 字段不变（dataEnvelope 投影走 §4.4 不进 SceneReport），所以 v2→v2 保持 |
| `report.routeProfile` 字段 | **不加进 SceneReport JSON**（保持 byte 不变）；profile 仅活在 cache index 维度 |

### 4.4 JobRunner 不持久化全 envelope，只做 projection（Codex R2 #10 + R3 P2-2 修正）

不在 SceneReport / 持久化层存全 dataEnvelopes（避免体积爆炸）。

**Projection 持久化契约（R3 P2-2）**——`SceneJobProjection` 类型固定字段：

```typescript
interface SceneJobProjection {
  sceneId: string;
  skillId: string;
  routeId: string;             // e.g. 'click_scene_smart'
  metrics: Record<string, number>;     // 核心数值指标
  evidenceRefs: string[];              // claim 验证用
  topRowsSample: DataEnvelope[];       // ≤3 行，buildSmartChatReport 直接渲染
  omittedRowCount: number;             // 透明度：被截断行数
  artifactRef?: {                       // 大数据进 ArtifactStore（artifactStore.ts:79）
    artifactId: string;
    artifactType: 'scene_job_envelopes';
    sizeBytes: number;
    checksum: string;
  };
}
```

每个 projection ≤ 50KB；超出部分推 ArtifactStore 存 artifactRef。

约束：
- JobRunner 内存 result 保留全 envelope（供 buildSmartChatReport 当下使用）
- **smart profile 持久化前**：projection 写入 SceneReport.jobs[]；全 envelope 写 ArtifactStore（保留 artifactRef 解析路径，不会悬空）
- `buildSmartChatReport` **仅依赖 projection**（不直接展开 artifact），保证 HTML report / chat 渲染稳定可重放；ArtifactStore 只供调试 / 详细展开页签使用
- legacy profile 不变：dataEnvelopes 仍置空
- SceneReport schema 字段不变，无需 bump pipelineVersion（projection 走 jobs[].projection 子对象，向后兼容写入）

### 4.5 主 chat 收口复用（Codex R2 #5 + R3 P2-1 修正）

不直接调 `sendAgentDrivenResult`（它只写已完成事件，缺持久化与状态机收口）。

**抽出新 helper** `backend/src/routes/agent/finalizeAgentDrivenSession.ts`：
- 从现有 `runAgentDrivenAnalysis()` 的结尾段提炼通用逻辑：设 session.result / 质量门禁 / snapshot 写入（**smart 跳过**）/ persist turn / status='completed' / 调 sendAgentDrivenResult 发 SSE / close clients
- 主路径 runAgentDrivenAnalysis 末尾改调 finalizeAgentDrivenSession（**纯重构 PR，零行为变化**）
- SmartAnalysisOrchestrator 在 await reportPromise 后调同一 helper

**PR-A 验收口径精确化（R3 P2-1）**：SSE payload 含 `timestamp:Date.now()` / run id / snapshot id 等 volatile 字段（`agentRoutes.ts:5408`），literal byte-equal 不可执行。验收改为 **"normalized byte-equal"**：
- 显式 volatile 字段白名单：`timestamp`、`runId`、`snapshotId`、`reportId`、任何 `*_at` 时间戳
- 测试用 normalize 函数把白名单字段替换为 `<volatile>` token 后做 deep-equal
- 替代方案：fake timers + 稳定 UUID seed（更严格但更脆弱，作为补充而非主验收）

**注意**：smart 模式 finalizeAgentDrivenSession **跳过 snapshot 写入分支**（v3 Non-Goal），但保持 report artifact 写入（HTML report 沿用主 chat 链路）。

buildSmartChatReport Markdown 结构：H1 智能分析报告 / H2 测试脚本阶段还原 / H2 每场景子报告（折叠 + Story Sidebar 锚点） / H2 跨场景结论 / 底部 Story Sidebar 跳转按钮。

`AgentRuntimeAnalysisResult.conclusionContract.metadata.sceneId='smart'` — 让 finalReportContractGate 命中 smart 的 final_report_contract（Codex R2 #9）。

### 4.6 Strategy contract_only + gate 路径补齐（Codex R2 #9 修正）

新文件 `backend/strategies/smart.strategy.md`：
- frontmatter `strategy_kind: contract_only`（新字段）
- final_report_contract.required_sections: scene_timeline / per_scene_summary / cross_scene_narrative / bottleneck_ranking
- keywords/priority/phase_hints 留空

`strategyLoader.ts` 改动：
- 解析 `strategy_kind`
- contract_only **不进** classifier 注册表 / system prompt 注入候选
- 仅 `getFinalReportContract('smart')` 能读

`finalReportContractGate.ts` (line 43) **不改**（已支持 `conclusionContract.metadata.sceneId='smart'` 路径）。新单测覆盖：
- `classifyScene('/smart')` 返回值 ≠ 'smart'（contract_only 阻挡）
- `buildSystemPrompt('smart')` fallback 'general'
- gate 看到 metadata.sceneId='smart' 能找到 smart 的 final_report_contract

### 4.7 normalizeAnalyzeOptions 时机严格化（Codex R2 #4 + R3 落点修正）

新文件 `backend/src/routes/agent/normalizeAnalyzeOptions.ts`：

```typescript
export interface NormalizedAnalyzeOptions {
  analysisMode: 'fast' | 'full' | 'auto';
  preset?: 'smart';
  codeAwareMode?: ...;
  codebaseIds?: string[];
  generateTracks?: boolean;
  selectionContext?: SelectionContext;
}

export function normalizeAnalyzeOptions(
  rawOptions: unknown,
  ctx: { endpoint: '/analyze' | '/sessions/:id/runs'; hasReferenceTraceId: boolean }
): NormalizedAnalyzeOptions {
  // 白名单 + 校验 + 互斥规则:
  // - preset='smart' && hasReferenceTraceId → throw 400 'smart 不支持对比'
  // - preset='smart' && endpoint='/sessions/:id/runs' → throw 400 'smart 仅新会话'
}
```

**时机强约束（R3 精确落点）**：在 `handleAnalyzeRequest` 完成下列步骤 **之后** 立即执行：
1. body 解构 / 权限 / tenant 校验
2. traceId / query 校验
3. `isDedicatedSceneReplayRequest()` 判定

具体落点：`agentRoutes.ts:1275` **之后**，且必须先于：
- `requestedSessionId` visibility 处理
- selectionContext 解析
- trace load
- referenceTrace validation
- prepareSession
- lease decision (`agentRoutes.ts:1448/1498`)
- blockedStrategyIds 计算

调用点 2 个（共享 handler）：
- `agentRoutes.ts` /analyze 入口
- `agentRoutes.ts` /sessions/:id/runs 入口（同 handler，1670）

第 3 处 `runAgentDrivenAnalysis()` (3192) **接 normalized**（不再 raw）。

新单测覆盖 6 矩阵：preset×endpoint×referenceTrace 互斥组合 + 老 raw options 兼容回归。

### 4.8 Cancel token + terminal latch（Codex R2 #6 修正）

仅"bridge"概念不够，因为 Stage1 / hash 计算 / Stage3 summary / finalize **当前都不可取消**。

新 `backend/src/agent/scene/smartCancelBridge.ts`：
- 维护 `parentSessionId → sceneSessionId` 映射
- `CancelToken` 对象（含 abort signal），传给 sceneStoryService.start()
- sceneStoryService 在 Stage1/Stage2/Stage3 SQL 启动前 check token；finalize 前 final check
- **Terminal latch**：smart orchestrator 在三态（完成/失败/取消）任一触发后立即上锁，后续任何尝试发主 chat terminal 事件被拒绝（throw + log）
- 反向：scene story 失败 / cancel → 调主 chat session.abort()，防 late conclusion

agentRoutes 主 cancel (2304) 改动：若 session 关联 smart orchestrator → 同时 fire token + bridge

sceneStoryService.start() 内部：Stage1/Stage3 SQL/Haiku call 之前 abort check（小改动但必要）。

单测：
- Stage2 中点 cancel → 主 chat 不发 late conclusion / running SQL 即使完成结果被丢弃 / Story Sidebar 收 scene_story_cancelled 终态
- Stage1 SQL 执行时点 cancel → orchestrator 不进入 Stage2

### 4.9 SQL semaphore 仅 smart + cost preview 分两段（Codex R2 #7 修正）

`backend/src/services/traceProcessor/sqlSemaphore.ts`：per-traceId async semaphore。

**关键约束（避免破坏 legacy）**：
- semaphore **只在 routeProfile='smart' 启用**
- legacy profile 跑 JobRunner 的 concurrency=3 行为不变
- 实现：JobRunner 通过 hook `beforeJobSql(traceId, profile)` 调 semaphore，profile='legacy' 时 hook 是 no-op

**Cost preview 分两段**：
- Cheap preview（同现状）：仅 duration 公式，<1s 返回，confidence='low'
- Smart 模式触发后 Stage1 完成时发 SSE 事件 `scene_story_smart_eta_refined { etaSec, etaConfidence:'medium', expectedDeepDives }`，前端 modal 升级显示
- PR-D 前端 cost preview modal 先用 cheap 数字 + spinner，再听 refined 事件升级

### 4.10 Stage 2 6 类路由（PR-B 启用）

routeProfile='smart' 时启用 6 条（旧 2 条保留 'legacy'）：

```typescript
// routeProfile='smart' 严格匹配
{ id:'startup_scene_smart',     routeProfile:'smart', sceneTypeFilter:['cold_start','warm_start','hot_start'],         skillId:'startup_detail' },
{ id:'scroll_scene_smart',      routeProfile:'smart', sceneTypeFilter:['scroll','scroll_start','inertial_scroll'],     skillId:'scrolling_analysis' },
{ id:'click_scene_smart',       routeProfile:'smart', sceneTypeFilter:['tap','long_press','screen_unlock'],            skillId:'click_response_analysis' },
{ id:'navigation_scene_smart',  routeProfile:'smart', sceneTypeFilter:['back_key','home_key','recents_key','window_transition'], skillId:'navigation_analysis' },
{ id:'anr_scene_smart',         routeProfile:'smart', sceneTypeFilter:['anr','jank_region'],                           skillId:'anr_analysis' },
{ id:'device_state_scene_smart',routeProfile:'smart', sceneTypeFilter:['screen_on','screen_off','idle'],               skillId:'device_state_snapshot' },
```

PR-B 第一步 grep 验证 `device_state_snapshot` 不存在 → 新建 composite skill 包装 `screen_state` atomic + idle 检测。`SCENE_TYPE_GROUPS` 同步加 `device_state` 组（screen_on/off/idle/unlock）。

## 5. File Changes

### 5.1 New files (12)
| 路径 | 用途 |
|---|---|
| `docs/development/smart-analysis-mode-plan.md` | 本文档（已落地）|
| `backend/strategies/smart.strategy.md` | contract_only strategy |
| `backend/src/routes/agent/normalizeAnalyzeOptions.ts` | 集中化 options + 互斥 |
| `backend/src/routes/agent/finalizeAgentDrivenSession.ts` | 抽出主 chat 完成收口（重构主路径 + smart 共享） |
| `backend/src/agent/scene/smartAnalysisOrchestrator.ts` | smart 主 orchestrator |
| `backend/src/agent/scene/smartMainChatProjector.ts` | 进度气泡翻译（不发 terminal） |
| `backend/src/agent/scene/buildSmartChatReport.ts` | SceneReport → AgentRuntimeAnalysisResult（含 conclusionContract.metadata.sceneId='smart'） |
| `backend/src/agent/scene/smartCancelBridge.ts` | cancel token + terminal latch + 双向 |
| `backend/src/services/traceProcessor/sqlSemaphore.ts` | per-trace SQL semaphore（仅 smart） |
| `backend/skills/composite/device_state_snapshot.skill.yaml` | 包装 screen_state + idle |
| `backend/src/routes/agent/__tests__/normalizeAnalyzeOptions.test.ts` | 6 矩阵互斥 + 老 raw 兼容 |
| `perfetto/.../smart_chat_renderer.ts` | 主 chat 智能报告渲染（折叠 cards） |

### 5.2 Modified files (15)
| 路径 | 改动摘要 |
|---|---|
| `backend/src/agent/config/domainManifest.ts` | `SceneReconstructionRouteRule.routeProfile` 必填；旧路由显式 'legacy'；loader 校验 |
| `backend/src/agent/scene/sceneIntervalBuilder.ts` | `buildAnalysisIntervals(scenes, profile)` 加参数；first-match 在 profile-filtered 子集 |
| `backend/src/agent/scene/sceneStoryService.ts` | 新参 routeProfile/projectionMode/cancelToken；Stage1/Stage3 abort check；finalize 返 Promise |
| `backend/src/agent/scene/sceneAnalysisJobRunner.ts` | result 内存对象保留 envelope；smart profile 抽 projection（≤50KB/job）；SQL 前调 sqlSemaphore（仅 smart） |
| `backend/src/agent/scene/types.ts` | SceneAnalysisRoute.routeProfile/sceneTypeFilter；JobResult 增 projection 字段（仅内存，不入 SceneReport） |
| `backend/src/services/sceneReport/sceneReportStore.ts` | `loadByHash(hash, profile)` 签名 + index key + pendingByHash key |
| `backend/src/services/sceneReport/sceneReportMemoryCache.ts` | key 含 profile |
| `backend/src/agent/scene/sceneCostEstimator.ts` | 6 类校准（仅 smart 触发后）+ 输出 refined ETA SSE 事件路径 |
| `backend/src/agent/core/orchestratorTypes.ts` | AnalysisOptions.preset?: 'smart' |
| `backend/src/routes/agentRoutes.ts` | 入口最早调 normalizeAnalyzeOptions；smart 分支 dispatch；末尾改调 finalizeAgentDrivenSession 替换 inline 收口 |
| `backend/src/agentv3/strategyLoader.ts` | 解析 strategy_kind；contract_only 跳过 classifier/prompt 注册 |
| `backend/src/routes/multiTraceComparisonRoutes.ts` | normalize 阶段已禁 smart+comparison；comparison route 不需特判 |
| `perfetto/.../types.ts` | PRESET_QUESTIONS 加 `{label:'🧠 智能', question:'/smart', icon:'auto_awesome', isSmart:true}`；COMPARISON_PRESET_QUESTIONS 不含 smart |
| `perfetto/.../ai_panel.ts` | handleCommand 加 /smart 分支（直接构造 fetch + body{preset:'smart'}，跳过 handleChatMessage）；SSE listener 接进度类 scene_story_*；自动展开 Story Sidebar；cost preview modal（cheap → refined 两段） |
| `perfetto/.../generated/*.ts` | regen |

## 6. Phasing (v3，4 PR)

| PR | 范围 | Deliverable | 验证 |
|---|---|---|---|
| **PR-A Infrastructure (零行为变化)** | routeProfile 必填字段引入（旧路由显式 legacy）+ sceneIntervalBuilder profile 参数 + cache key（store/memory/pending）扩 profile + sqlSemaphore（仅 smart hook，legacy 不启用）+ finalizeAgentDrivenSession **重构抽出**（主路径调它替换 inline 收口，**normalized byte-equal** 验收）+ 老 manifest 加载兼容（旧 entry 默认 legacy） | infrastructure pieces in place；legacy 在 6 个 canonical trace 上 **semantic-equal**（intervals/jobs/sceneCounts/SSE terminal 顺序一致） | typecheck + validate:skills + scene_trace_regression + 新加 legacy semantic-equal invariant 测试 + finalizeAgentDrivenSession 主路径 **normalized byte-equal**（volatile 字段白名单替换为 `<volatile>` token 后 deep-equal）单测 |
| **PR-B Smart Dispatch + 路由扩展** | normalizeAnalyzeOptions（入口最早调）+ AnalysisOptions.preset + agentRoutes 分支 + SmartAnalysisOrchestrator + Stage 2 6 类路由（routeProfile='smart'）+ device_state_snapshot skill 新建 + SCENE_TYPE_GROUPS 加 device_state + smartCancelBridge + cancel token 贯穿 Stage1/2/3 + comparison/continue-run 互斥 400 | smart 模式 backend 跑通 6 类深钻；cancel 路径完整；legacy 不受 sqlSemaphore 影响 | typecheck + validate:skills + validate:strategies + scene_trace_regression + smart e2e（混合 trace 路由完整性）+ cancel 单测 + normalize 6 矩阵 |
| **PR-C 主 chat 投射 + 收口复用** | smartMainChatProjector（进度气泡，不发 terminal）+ buildSmartChatReport（含 conclusionContract.metadata.sceneId='smart'）+ smart.strategy.md（contract_only）+ strategyLoader 白名单 + finalReportContractGate 路径验证（gate 不改）+ JobRunner per-job projection（≤50KB） | smart 结果走主 chat 收口；conclusion/reportUrl/analysis_completed/end 顺序正确；HTML report artifact 生成；contract gate 命中 smart sections | typecheck + 单测 + scene_trace_regression + 完整 e2e（含 final artifact） |
| **PR-D Frontend Preset + 渲染** | PRESET_QUESTIONS 加 smart（COMPARISON_PRESET 不加）+ handleCommand /smart 分支（直接构造 fetch + body preset）+ smart_chat_renderer + Story Sidebar 联动 + cost preview modal（cheap → refined 两段）+ generate:frontend-types | UI 一键智能 + 双 surface 投射 + cost preview + onboarding tooltip | start-dev 浏览器 + update-frontend.sh + SSE 顺序浏览器验证 |

PR 间串行。每 PR 内部走 Plan → Codex review → Revise → Execute → 单测 → 回归 → commit。

## 7. Risks Register (v3 共 16 条)

| # | 风险 | 严重 | 对策 | 来源 |
|---|---|---|---|---|
| R1 | trace_processor 单线程 + 并发 SQL 大 trace hang | 高 | PR-A sqlSemaphore（仅 smart 启用） | Codex R1 #7 / R2 #7 |
| R2 | device_state_snapshot 缺 + JobRunner 置空 | 高 | PR-B 新建 skill；JobRunner 仅 smart 内存保留 envelope + 持久化前 projection | Codex R1 #10 / R2 #10 |
| R3 | Manifest 不向后兼容 | 中 | loader 兼容老 entry 默认 legacy；不全局 bump pipelineVersion | Codex R1 #1 / R2 第二组 P2 |
| R4 | SSE 双 session 无全序 | 高 | Promise barrier + finalizeAgentDrivenSession helper + terminal latch | Codex R1 #5 / R2 #5 |
| R5 | strategyLoader 注册 smart 进 classifier | 中 | strategy_kind: contract_only + 白名单单测；gate 走 conclusionContract.metadata.sceneId 路径 | Codex R1 #9 / R2 #9 |
| R6 | Snapshot kind 路线行不通 | 高 | **v1 不做 snapshot 集成**（Non-Goal）；待 schema 扩展 plan | Codex R2 #8 (重大修正) |
| R7 | 6 类总耗时超时 | 中 | Cost preview 两段：cheap → smart 模式触发后 refined（Stage1 后发 SSE 事件） | Codex R1 #7 / R2 #7 |
| R8 | OpenAI runtime 假设 system prompt | 中 | smart 不调 orchestrator.analyze，独立路径 | v1 |
| R9 | /smart vs /scene 用户困惑 | 低 | preset onboarding tooltip + 不同 icon | v1 |
| R10 | 拆 non_startup 破坏 /scene | 高 | routeProfile 必填且 legacy 显式标注；不拆老路由；semantic-equal 回归 | Codex R1 #1 / R2 #1 |
| R11 | Cache 串味 | 高 | loadByHash(hash, profile) 签名 + memory cache key 含 profile；不动 report.traceHash 元数据 | Codex R1 #2 / R2 #2 |
| R12 | FE /smart handler 不通 | 高 | PR-D handler 直接构造 fetch（绕过 handleChatMessage）+ body 注入 preset；新单测断言 | Codex R1 #3 / R2 #3 |
| R13 | Cancel 多阶段漏 | 高 | CancelToken 贯穿 Stage1/2/3；terminal latch 拒绝 late terminal | Codex R1 #6 / R2 #6 |
| R14 | normalize 时机晚 | 高 | 入口最早执行（先于 referenceTrace validation/prepareSession/lease） | Codex R2 #4 |
| R15 | SCENE_TYPE_GROUPS 缺 device_state | 中 | PR-B 同步加 group | Codex R1 #10 |
| **R16** | routeProfile='both' 默认会污染 smart 匹配 | 高 | 去掉 'both'；强制必填；loader 校验未指定即错 | Codex R2 #1 / 第二组 |

## 8. Verification

每 PR 跑：
```bash
cd backend
npm run typecheck
npm run validate:strategies
npm run validate:skills
npm run test:scene-trace-regression
```

测试矩阵（v3.1）：
- **PR-A**：legacy semantic-equal 不变（intervals / jobs / sceneCounts / SSE terminal 顺序 6 trace × 2 quick/full 12 case）；finalizeAgentDrivenSession 重构 **normalized byte-equal**（volatile 字段白名单 token 替换后 deep-equal）；sqlSemaphore 不影响 legacy 完成顺序
- **PR-B**：smart 6 类映射至少各 1 次（混合 trace）；normalize 6 矩阵 + 老 raw 兼容；cancel 三阶段（Stage1/2/3）皆有效；terminal latch 拒绝 late terminal；comparison/continue-run + smart 互斥 400
- **PR-C**：smart 模式 e2e 含 conclusion/reportUrl/analysis_completed/end **顺序正确**；contract gate 命中 smart sections（buildSmartChatReport metadata 路径）；strategy contract_only loader 不污染 classifier；JobRunner per-job projection ≤50KB；HTML report artifact 生成可读
- **PR-D**：浏览器双投射；cost preview 两段升级 SSE 事件可见；comparison preset 列表不含 smart

PR-C 后 e2e：
```bash
npx tsx src/scripts/verifyAgentSseScrolling.ts \
  --mode smart --trace ../test-traces/lacunh_heavy.pftrace \
  --query "/smart" --output test-output/e2e-smart.json --keep-session
```
人工检查：SSE event sequence；session jsonl 含 6 类 invoke_skill；HTML report artifact 落地。

落地前：`npm run verify:pr`

Frontend：`./scripts/start-dev.sh` → 混合 trace 浏览器走通 → `./scripts/update-frontend.sh`

新 fixture 录制留 PR-C：先用 lacunh_heavy + scroll-demo-customer-scroll 两条 trace 模拟混合事件 SSE 序列；后续真实录一条"启动+滑动+点击+亮灭屏"作 smart regression fixture。

## 9. Codex Review History

- **Round 1** (10 P1 critique，全部 fold)
- **Round 2** (8 P1 + 2 P2 + 第二/三组结构性 risk，全部 fold)
- **Round 3** (无 P1，仅 2 P2 minor 验收门精化 — 已 fold)

按 CLAUDE.md "Codex review 不超过 3 轮"规则，v3.1 达到收敛节点。

## 10. Open Questions (v3 收敛)

- [x] device_state_snapshot 不存在 → PR-B 新建
- [x] cost 预览 → 两段：cheap (复用) + refined SSE 事件 (smart 触发后)
- [x] 不拆 non_startup_scene → legacy 显式标注保留
- [x] Snapshot 集成 → **v1 不做**（Non-Goal）
- [x] routeProfile 默认值 → **去掉，必填**
- [x] pipelineVersion bump → **不全局 bump**，只在 schema 真改时；v3 SceneReport schema 不变
- [ ] 真混合 trace 专用 fixture 录制 → PR-C 决策
- [ ] Cost modal 文案 i18n → PR-D 决策

## 11. v1 → v2 → v3 → v3.1 决策回溯

v3 关键架构调整：
1. snapshot 集成移到 Non-Goal（schema 没 metadata 字段，硬塞会破多个 surface）
2. routeProfile 必填且 'both' 删除（防数组 first-match 污染 smart）
3. cache key 改为 lookup 维度而非 report 字段（保 report.traceHash 元数据语义）
4. finalizeAgentDrivenSession 重构抽出（主路径同步重构，smart 复用）
5. JobRunner envelope 仅内存保留 + 持久化前 projection（防体积爆炸）
6. sqlSemaphore 仅 smart profile（防影响 legacy 完成顺序）
7. cancel token 贯穿 Stage1/2/3 + terminal latch（防 late terminal）
8. legacy 验收口径 byte-equal → semantic-equal（更工程化）

v3.1 验收门精化：
- §4.4 `SceneJobProjection` 显式契约 + ArtifactStore artifactRef 不悬空
- §4.5 SSE "normalized byte-equal" 用 volatile 字段白名单
- §4.7 normalize 精确落点 `agentRoutes.ts:1275` 之后

未来 plan（不在 v3.1 范围）：
- AnalysisResultSnapshot schema 扩 metadata 字段 → 智能 snapshot 持久化 + comparison + UI 集成
- 真混合 trace fixture 录制
- multi-scene sceneClassifier 重写
- CLI smp ask 接入 smart preset
