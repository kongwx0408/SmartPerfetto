# SmartPerfetto Documentation Center

[English](README.en.md) | [中文](README.md)

SmartPerfetto is an Android performance analysis platform built on Perfetto. This documentation center is organized for open-source users, contributors, and maintainers: first get the project running, then learn the architecture, then extend it.

## Recommended Reading Paths

| Reader | Start here | Continue with |
|---|---|---|
| First-time user | [Quick Start](getting-started/quick-start.en.md) | [Configuration Guide](getting-started/configuration.en.md), [Feature Overview](getting-started/features.en.md), [Basic Usage](getting-started/usage.en.md), [Portable Packaging](reference/portable-packaging.en.md) |
| User evaluating SmartPerfetto features | [Feature Overview](getting-started/features.en.md) | [Basic Usage](getting-started/usage.en.md), [Configuration Guide](getting-started/configuration.en.md) |
| Multi-trace result comparison user | [Multi-Trace Analysis Result Comparison](getting-started/multi-trace-result-comparison.en.md) | [Basic Usage](getting-started/usage.en.md), [API Reference](reference/api.en.md) |
| User who wants AI to reference local source code | [Code-Aware Analysis](getting-started/code-aware-analysis.en.md) | [CLI Reference](reference/cli.en.md), [MCP Tools Reference](reference/mcp-tools.en.md) |
| Backend API integrator | [API Reference](reference/api.en.md) | [MCP Tools Reference](reference/mcp-tools.en.md) |
| CLI or automation user | [CLI Reference](reference/cli.en.md) | [API Reference](reference/api.en.md) |
| Contributor | [Root AGENTS.md](../AGENTS.md) | [Product Surface Rules](../.claude/rules/product-surface.md), [Testing Rules](../.claude/rules/testing.md), [Contributing Guide](../CONTRIBUTING.md) |
| Skill author | [Skill System Guide](reference/skill-system.en.md) | [MCP Tools Reference](reference/mcp-tools.en.md), [Testing Rules](../.claude/rules/testing.md) |
| Architecture reader | [Architecture Overview](architecture/overview.en.md) | [Agent Runtime](architecture/agent-runtime.en.md), [Data Contract](../backend/docs/DATA_CONTRACT_DESIGN.en.md) |
| Release maintainer | [Release Runbook](reference/release.en.md) | [Portable Packaging](reference/portable-packaging.en.md), [Release Rules](../.claude/rules/release.md) |
| Feature plan reader | [Multi-trace comparison development plan](features/multi-trace-result-comparison/README.md) | [Enterprise multi-tenant plan](features/enterprise-multi-tenant/README.md) |
| Deployment troubleshooter | [Troubleshooting](operations/troubleshooting.en.md) | [Configuration Guide](getting-started/configuration.en.md) |

## Documentation Structure

```text
docs/
├── README.md                         # Chinese documentation entry
├── README.en.md                      # English documentation entry
├── getting-started/                  # Installation, configuration, usage
├── architecture/                     # Current architecture and authoritative design
├── features/                         # Feature-specific development docs
├── reference/                        # API, CLI, MCP, and Skill DSL references
├── operations/                       # Runtime operations and troubleshooting
├── rendering_pipelines/              # Runtime-read Android rendering pipeline knowledge
├── product/                          # External project positioning
├── archive/                          # Historical proposals, spikes, and decisions
└── images/                           # Documentation images
```

## Authoritative Docs

- Startup and runtime flow: [Quick Start](getting-started/quick-start.en.md), [CLI Reference](reference/cli.en.md), [Portable Packaging](reference/portable-packaging.en.md), and [Release Runbook](reference/release.en.md).
- Feature and bug work: use [Product Surface Rules](../.claude/rules/product-surface.md) to check Web UI, CLI, API, reports, Docker, portable packages, runtime/provider, Node version, and bundled-content impact.
- Release, npm, portable, and Docker work: [Release Runbook](reference/release.en.md) and [Release Rules](../.claude/rules/release.md).
- Provider and model configuration: [Configuration Guide](getting-started/configuration.en.md).
- Backend API: [API Reference](reference/api.en.md).
- CLI usage: [CLI Reference](reference/cli.en.md).
- MCP tools: [MCP Tools Reference](reference/mcp-tools.en.md) and the tool registry, not old static tool counts.
- Skill DSL and layered outputs: [Skill System Guide](reference/skill-system.en.md).
- DataEnvelope and frontend/backend contracts: [Data Contract](../backend/docs/DATA_CONTRACT_DESIGN.en.md).
- Final report, evidence/claim verification, identity resolution, and chat-vs-report boundaries: [Architecture Overview](architecture/overview.en.md) and [Agent Runtime](architecture/agent-runtime.en.md).
- Rendering pipeline summary: [Rendering Pipeline Overview](rendering_pipelines/index.en.md).

## Runtime-Read Documentation

`docs/rendering_pipelines/` is not only normal documentation. Teaching mode, pipeline detection, and some Skill results refer to these Markdown files through `doc_path: rendering_pipelines/*.md`. Moving or renaming those files requires synchronized updates to:

- `backend/skills/pipelines/*.skill.yaml`
- `backend/skills/atomic/rendering_pipeline_detection.skill.yaml`
- `backend/src/services/pipelineDocService.ts`
- `backend/src/config/teaching.config.ts`

After such a change, run at least:

```bash
cd backend
npm run validate:skills
npm run test:scene-trace-regression
```
