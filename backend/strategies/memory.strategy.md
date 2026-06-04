<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2024-2026 Gracker (Chris) | SmartPerfetto -->

---
scene: memory
priority: 4
effort: medium
required_capabilities:
  - gc_memory
  - memory_pressure
optional_capabilities:
  - cpu_scheduling
  - binder_ipc
  - battery_counters
keywords:
  - 内存
  - memory
  - oom
  - 泄漏
  - leak
  - lmk
  - 内存压力
  - 内存不足
  - low memory
  - out of memory
  - dmabuf
  - 内存占用
compound_patterns:
  - "内存.*泄漏"
  - "内存.*压力"
  - "内存.*不足"
  - "memory.*leak"
  - "memory.*pressure"
  - "(ApplicationExitInfo|getHistoricalProcessExitReasons|REASON_LOW_MEMORY|REASON_FREEZER|REASON_EXCESSIVE_RESOURCE_USAGE).*(OOM|LMK|freezer|memory|low memory|kill|内存|杀进程)"
  - "(OOM|LMK|freezer|memory|low memory|kill|内存|杀进程).*(ApplicationExitInfo|getHistoricalProcessExitReasons|REASON_LOW_MEMORY|REASON_FREEZER|REASON_EXCESSIVE_RESOURCE_USAGE)"
  - "(ProfilingManager|ProfilingTrigger|heap dump|heap profile|Java heap dump).*(OOM|memory|heap|leak|内存|泄漏)"
  - "(OOM|memory|heap|leak|内存|泄漏).*(ProfilingManager|ProfilingTrigger|heap dump|heap profile|Java heap dump)"

final_report_contract:
  required_sections:
    - id: memory_evidence_scope
      label: 内存证据范围
      description: '说明当前结论基于哪些内存证据源，并列出缺失或不可证明的证据。'
      pattern_groups:
        - ['证据范围', '证据来源', '数据来源', 'evidence\s+scope', 'evidence\s+source']
        - ['PSS', 'RSS', 'Java\s+Heap', 'Native\s+Heap', 'Graphics', 'dma[-_ ]?buf', 'GC', 'LMK', 'heap\s+graph', '缺失', 'missing']
    - id: memory_type_breakdown
      label: 内存类型拆分
      description: '把 Java、Native、Graphics/dma-buf、RSS/PSS、GC、LMK/freezer 等口径分开。'
      pattern_groups:
        - ['内存类型', '类型拆分', '分类', 'breakdown', 'Java\s+Heap', 'Native\s+Heap', 'Graphics', 'dma[-_ ]?buf']
        - ['泄漏', 'leak', '增长', 'churn', '分配', '回收', 'GC', 'LMK', 'freezer', 'OOM', '压力', 'pressure']
    - id: memory_confidence_boundary
      label: 置信度与缺失证据
      description: '明确高内存、泄漏、GC、LMK/freezer/OOM、外部诊断 API 之间的证据边界。'
      pattern_groups:
        - ['证据不足', '缺失', 'missing', 'limitation', '限制', '置信', 'confidence', '需补', '建议采集']
        - ['不等于', '不能', '不得', '区分', '边界', 'separate', 'not']
    - id: memory_diagnostic_api_boundary
      label: 内存诊断 API/剖析产物边界
      description: '当用户主动提到 ApplicationExitInfo、ProfilingManager、ProfilingTrigger、heap dump/profile、KOOM 或 APM 时，区分当前 trace 内存证据、退出记录、剖析产物、外部聚合和缺失证据。'
      trigger_patterns:
        - 'ApplicationExitInfo|getHistoricalProcessExitReasons|REASON_LOW_MEMORY|REASON_FREEZER|REASON_EXCESSIVE_RESOURCE_USAGE'
        - 'ProfilingManager|ProfilingTrigger|heap dump|heap profile|Java heap dump|KOOM|APM'
      pattern_groups:
        - ['内存诊断 API/剖析产物边界', 'memory diagnostic API', 'profiling artifact', 'ApplicationExitInfo', 'ProfilingManager', 'ProfilingTrigger', 'heap dump', 'heap profile']
        - ['diagnostic_api', 'profiling_artifact', 'external_aggregate', 'ApplicationExitInfo', 'getHistoricalProcessExitReasons', 'REASON_LOW_MEMORY', 'REASON_FREEZER', 'REASON_EXCESSIVE_RESOURCE_USAGE', 'ProfilingManager', 'ProfilingTrigger', 'KOOM', 'APM']
        - ['API\s*3[0567]', 'Android\s*1[1567]', 'version', '版本', 'reason', 'process', 'pid', 'upid', 'timestamp', 'result file', 'artifact', 'record']
        - ['trace window', 'current trace', 'align', '对齐', 'missing', '缺失', 'confidence', '置信', '不能', '不可', 'not prove', 'not equal']

phase_hints:
  - id: memory_evidence_gate
    keywords: ['memory', '内存', 'heap', 'rss', 'pss', 'gc', 'lmk', 'memory_analysis', '证据']
    constraints: '先确认 memory_analysis/lmk/GC/heap graph/dmabuf 等证据哪些存在。结论必须按证据类型分层；缺失 Native/SO/匿名 mmap/thread stack/ApplicationExitInfo/MemoryLimiter 等来源时只写数据缺口，不能当成已证明。'
    critical_tools: ['memory_analysis']
    critical: true
  - id: lmk_freezer_oom_boundary
    keywords: ['lmk', 'oom', 'freezer', 'kill', '杀进程', '低内存', '内存压力']
    constraints: 'LMK、freezer、Java OOM、Native OOM、Android 17 MemoryLimiter 是不同机制。只有对应事件、ApplicationExitInfo 或进程状态证据存在时才能命名；否则写成候选或采集建议。'
    critical_tools: ['lmk_analysis', 'lmk_kill_attribution', 'oom_adjuster_score_timeline']
    critical: false
  - id: gc_churn_boundary
    keywords: ['gc', 'churn', 'allocation', '分配', '回收', '抖动', 'pause']
    constraints: 'GC 与卡顿/ANR 重叠只能说明相关性。必须结合 GC pause、allocation churn、线程状态或帧/ANR窗口证据，避免把后台 GC 或普通回收直接写成根因。'
    critical_tools: ['memory_analysis', 'gc_analysis']
    critical: false
  - id: memory_diagnostic_api_boundary
    keywords: ['ApplicationExitInfo', 'getHistoricalProcessExitReasons', 'REASON_LOW_MEMORY', 'REASON_FREEZER', 'REASON_EXCESSIVE_RESOURCE_USAGE', 'ProfilingManager', 'ProfilingTrigger', 'heap dump', 'heap profile', 'KOOM', 'APM']
    constraints: 'ApplicationExitInfo、ProfilingManager/ProfilingTrigger、heap dump/profile、KOOM/APM 都是补充证据。必须说明 API/Android 版本、record/artifact 时间、进程身份、reason/result file、与当前 trace 的对齐关系；不得把高内存直接等同泄漏，也不得把缺少退出记录写成没有 OOM/LMK。'
    critical_tools: ['memory_analysis', 'lmk_analysis', 'lookup_knowledge']
    critical: false

plan_template:
  mandatory_aspects:
    - id: memory_trend_and_gc
      match_keywords: ['memory', 'oom', 'gc', '内存', 'heap', 'lmk', 'memory_analysis']
      suggestion: '内存场景建议包含内存使用趋势和 GC 分析阶段 (memory_analysis)'
---

#### 内存分析（用户提到 内存、memory、OOM、泄漏、LMK）

**核心原则：**
1. **先分证据源**：PSS/RSS、Java Heap、Native Heap、Graphics/dma-buf、GC、LMK/freezer、heap graph、ApplicationExitInfo/MemoryLimiter 等是不同口径。
2. **高内存不是泄漏**：必须先判断趋势、对象/类型归属、GC 后是否回落、缓存策略和进程角色，不能只凭峰值下结论。
3. **LMK/freezer/OOM 不能混用**：LMK 是系统低内存杀进程，freezer 是 cached process 冻结机制，Java/Native OOM 是进程内分配失败，MemoryLimiter 是版本敏感的系统退出原因。
4. **外部诊断是补充证据**：ApplicationExitInfo、ProfilingManager/ProfilingTrigger 产物、线上 OOM/KOOM、heap dump、APM 指标可以补上下文，但必须标明来源、版本/API 边界、record/artifact 时间、进程身份和与当前 trace 的对应关系。需要机制背景时调用 `lookup_knowledge("observability-diagnostics")`。
5. **缺失证据要进入结论**：trace 没有 heap graph、dmabuf、smaps、ApplicationExitInfo 或长窗口趋势时，只能输出候选和下一步采集建议。

#### 内存场景关键 Stdlib 表

写 execute_sql 时优先使用（完整列表见方法论模板）：`android_garbage_collection_events`、`android_oom_adj_intervals`、`android_screen_state`

**Phase 1 — 内存概览（1 次调用）：**
```
invoke_skill("memory_analysis")
```
返回：内存使用趋势、RSS/PSS 分布、内存分类统计。

**Phase 2 — LMK 分析（如果有 LMK 事件）：**
```
invoke_skill("lmk_analysis")
```
返回：LMK 事件列表、被杀进程、OOM-adj 分布、重启循环检测。

如果需要更轻量的事件/分数视图，或 `lmk_analysis` 结果为空但用户明确问 OOM/adj：
```
invoke_skill("lmk_kill_attribution")
invoke_skill("oom_adjuster_score_timeline")
invoke_skill("memory_rss_high_watermark")
```
- `lmk_kill_attribution`：LMK 事件、被杀进程、adj、oom_score_adj
- `oom_adjuster_score_timeline`：进程 OOM adj 分数时间线
- `memory_rss_high_watermark`：RSS high watermark，辅助识别增长型内存压力

**Phase 3 — 深度分析（按需选择）：**

| 信号 | 工具 | 何时使用 |
|------|------|---------|
| GPU 内存 / DMA-BUF | `invoke_skill("dmabuf_analysis")` | 图形密集应用的 GPU 内存分析 |
| Java Heap Graph | `invoke_skill("android_heap_graph_summary")` | trace 含 Java heap dump 时，先确认 sample/process，再按 retained/cumulative size 找主要 class retainer |
| Bitmap 内存 | `invoke_skill("android_bitmap_memory_per_process")` | 图片/纹理密集应用的 Bitmap footprint；有 heap graph 时同时看 width/height/density/storage/source attribution |
| GC 压力 | `invoke_skill("gc_analysis")` | Java 堆内存问题、频繁 GC |
| 页缺失 | `execute_sql` 查询 `page_fault` | 内存映射文件访问延迟 |
| 系统内存压力 | `invoke_skill("memory_pressure_in_range", { start_ts, end_ts })` | 特定时间段的内存压力事件 |

**Phase 4 — 交叉分析：**
- 内存压力 + LMK → 检查是否有进程被反复杀死重启（thrashing）
- GC 频繁 + 内存增长 → 可能存在 Java 对象泄漏
- Heap graph 可用 + retained class 集中 → 按 `android_heap_graph_summary` 的 top retainer 继续查 dominator/reference path；不要只按 raw object id 下结论
- DMA-BUF 增长 → GPU 内存泄漏（纹理/Buffer 未释放）
- 内存压力 + ANR → 系统内存不足导致的 ANR（非 App 代码 Bug）

**输出结构：**

1. **证据范围**：列出当前可用证据（PSS/RSS、Java Heap、Native Heap、Graphics/dma-buf、GC、LMK/freezer、heap graph、外部 API）和缺失证据
2. **内存概览**：总内存、已用内存、可用内存、趋势（增长/稳定/下降）
3. **内存类型拆分**：Java Heap / Native Heap / Graphics-dma-buf / RSS-PSS / mmap-SO / thread stack 中哪些有证据，哪些不可见
4. **LMK/freezer/OOM 事件**（如有）：被杀/冻结/退出次数、受影响进程、OOM-adj 或 ApplicationExitInfo 来源；没有直接事件时不能命名
5. **诊断 API/剖析产物边界**（如用户提供或询问）：ApplicationExitInfo / ProfilingManager / ProfilingTrigger / heap dump / KOOM / APM 的 API level、reason/result file、record/artifact 时间、进程身份、与 trace 窗口的对齐关系，以及缺失证据
6. **根因分析**：泄漏、分配突增、缓存、GC churn、图形/Native 占用、系统压力之间的证据边界和置信度
7. **优化建议**：按内存类型和证据强度分类；把缺失证据转化为具体采集建议
