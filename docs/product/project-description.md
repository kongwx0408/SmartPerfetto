# SmartPerfetto Project Description

## Overview

**SmartPerfetto** is an AI-powered Android performance analysis platform built on Google's Perfetto trace viewer. It supports a Web UI, standalone npm CLI, Docker, source checkout, and GitHub portable packages. The backend can use Claude Agent SDK, OpenAI Agents SDK, Pi Agent Core, or OpenCode to analyze traces, identify root causes of jank/ANR/startup issues, and provide actionable optimization suggestions with evidence-backed reasoning.

## Target Users

- **Android App Developers** - Diagnose jank, slow startup, ANR in their apps
- **Framework Engineers** - Analyze system-level performance (SurfaceFlinger, Binder, WMS)
- **Performance Optimization Specialists** - Deep dive into CPU scheduling, memory pressure, thermal throttling
- **Linux Kernel Engineers** - Investigate scheduler behavior, lock contention, I/O pressure

## Problem Statement

Perfetto traces contain millions of data points across dozens of subsystems. Manual analysis requires:
- Deep knowledge of Android internals
- Expertise in SQL query writing
- Understanding of what to look for in different scenarios
- Time-consuming correlation across multiple tracks

LLMs alone cannot solve this because:
1. **Data scale** — Traces are 50-500MB binary protobuf; far exceeds any context window
2. **Precision** — LLMs hallucinate numbers; performance analysis requires exact P50/P90/P99 statistics
3. **Structured methodology** — Root cause analysis requires multi-phase, cross-subsystem reasoning
4. **Reliability** — Same trace should produce consistent conclusions

SmartPerfetto solves this by giving the selected runtime precise "instruments" (SQL queries and YAML Skills via trace_processor), structured "methodology" (scene-specific strategies and final-report contracts), and evidence contracts that keep final claims tied to trace data. The LLM focuses on reasoning and synthesis while deterministic services preserve auditability.

## Architecture

```
Frontend (Perfetto UI @ :10000) ◄─SSE/HTTP─► Backend (Express @ :3000)
        │                                            │
        └──────── HTTP RPC (9100-9900) ──────────────┘
                           │
             trace_processor_shell (Shared)

CLI (smp / smartperfetto) ───────────► same backend runtime/services
```

### Core Components

| Component | Purpose |
|-----------|---------|
| **Runtime Selector** | Chooses Claude Agent SDK, OpenAI Agents SDK, Pi Agent Core, or OpenCode per session/provider |
| **Runtime Adapters** | Claude/OpenAI/Pi/OpenCode orchestrators: scene classification → dynamic system prompt → tool loop → verification/report contract |
| **MCP / Tool Registry** | Registry-driven tools bridging the runtime to trace data (SQL, Skills, schema lookup, planning, hypothesis, memory, code-aware lookup, comparison) |
| **Skill Engine** | YAML-defined analysis pipelines producing layered results (L1 overview → L4 deep root cause); inventory is discovered from `backend/skills/` |
| **Scene Classifier** | Strategy-frontmatter-driven routing to scene-specific strategies |
| **Result Quality Pipeline** | Final-report contract, evidence contract, claim verification, identity resolution, report generation, CLI artifacts, and analysis-result snapshots |
| **Artifact Store** | Caches skill results as compact references (~3000 tokens saved per invocation) |
| **SQL Summarizer** | Compresses SQL results to stats + samples (~85% token savings) |

### Data Flow

```
User Query: "分析滑动卡顿"
    │
    ├─ Scene Classification → "scrolling" (<1ms, keyword-based)
    ├─ System Prompt Assembly → role + methodology + scrolling strategy + output format
    │
    ├─ Selected runtime (autonomous tool calls)
    │   ├─ submit_plan → structured 3-phase analysis plan
    │   ├─ invoke_skill("scrolling_analysis") → L1 overview + L2 frame list
    │   ├─ invoke_skill("jank_frame_detail") → L3 per-frame diagnosis
    │   ├─ execute_sql → supplementary queries
    │   ├─ lookup_knowledge("cpu-scheduler") → background knowledge
    │   └─ submit_hypothesis → resolve_hypothesis → evidence-driven conclusions
    │
    ├─ Result quality pipeline → final-report contract + claim/evidence verification
    │
    └─ Structured output → chat projection + HTML report + CLI artifacts + snapshot
        └─ SSE streaming → Frontend real-time display
```

### Skill Inventory

Skill inventory is discovered from `backend/skills/**/*.skill.yaml`. The durable categories are atomic, composite, comparison, deep, pipeline, module, and authoring templates. Use this command when a precise local count is needed:

```bash
rg --files backend/skills | rg '\.skill\.yaml$' | wc -l
```

### MCP Tools

The tool surface is registry-driven and request-shaped. Quick analysis exposes a small evidence-oriented subset; full analysis adds planning, hypothesis, knowledge, memory, baseline, and artifact tools; code-aware requests add source lookup and patch proposal tools; comparison requests add current/reference trace tools. See [MCP Tools Reference](../reference/mcp-tools.en.md).

## Technology Stack

- **Backend:** Node.js 24 LTS, Express, TypeScript (strict)
- **Frontend:** Mithril.js (Perfetto UI framework)
- **AI Runtime:** Claude Agent SDK, OpenAI Agents SDK, Pi Agent Core, and OpenCode through one assistant contract
- **Trace Processing:** trace_processor_shell (Perfetto, WASM + HTTP RPC)
- **CLI:** npm package `@gracker/smartperfetto`, commands `smp` and `smartperfetto`
- **Testing:** Jest, ts-jest, trace regression, E2E, build/typecheck, and PR verification gates
- **Build:** esbuild, npm scripts

## Key Design Decisions

1. **Content-driven, not code-driven** — Analysis strategies in `.strategy.md`, skills in `.skill.yaml`; new scenarios = new files, zero code changes
2. **Runtime as autonomous orchestrator** — The selected SDK runtime decides which tools to call, not hardcoded pipelines
3. **Evidence-first verification** — final claims are tied to evidence contracts, claim verification, identity resolution, or explicit uncertainty
4. **Layered results (L1-L4)** — Progressive detail from overview to per-frame root cause
5. **DataEnvelope v2.0** — Schema-driven rendering; frontend auto-renders Skill output without per-skill UI code
6. **Token engineering** — Artifact store + SQL summarizer + progressive prompt dropping keeps context efficient
7. **Surface separation** — Live chat stays readable while HTML reports, CLI artifacts, and snapshots keep provenance

## Getting Started

```bash
# Configure
cp backend/.env.example backend/.env
# Configure a Provider Manager profile or edit env provider credentials

# Start for normal use
./start.sh
# Backend @ :3000, Frontend @ :10000

# Or install the standalone CLI
npm install -g @gracker/smartperfetto
smp doctor
smp capture presets
```

For current architecture and release boundaries, see [Architecture Overview](../architecture/overview.en.md), [Agent Runtime](../architecture/agent-runtime.en.md), and [Release Runbook](../reference/release.en.md).
