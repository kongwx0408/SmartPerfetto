# SmartPerfetto 文档中心

[English](README.en.md) | [中文](README.md)

SmartPerfetto 是基于 Perfetto 的 Android 性能分析平台。本文档中心面向开源使用者、贡献者和维护者，按“先跑起来、再理解、再扩展”的顺序组织。

## 推荐阅读路径

| 读者 | 从这里开始 | 继续阅读 |
|---|---|---|
| 第一次运行项目 | [快速开始](getting-started/quick-start.md) | [配置指南](getting-started/configuration.md), [功能总览](getting-started/features.md), [基本使用](getting-started/usage.md), [免安装包打包](reference/portable-packaging.md) |
| 想了解 SmartPerfetto 能做什么 | [功能总览](getting-started/features.md) | [基本使用](getting-started/usage.md), [配置指南](getting-started/configuration.md) |
| 想对比多个 Trace 的分析结果 | [多 Trace 分析结果对比](getting-started/multi-trace-result-comparison.md) | [基本使用](getting-started/usage.md), [API 参考](reference/api.md) |
| 想让 AI 分析引用本机源码 | [Code-Aware Analysis](getting-started/code-aware-analysis.md) | [CLI 参考](reference/cli.md), [MCP 工具参考](reference/mcp-tools.md) |
| 想接入后端 API | [API 参考](reference/api.md) | [MCP 工具参考](reference/mcp-tools.md) |
| 想用命令行或脚本分析 trace | [CLI 参考](reference/cli.md) | [API 参考](reference/api.md) |
| 想贡献代码 | [根目录 AGENTS.md](../AGENTS.md) | [产品面规则](../.claude/rules/product-surface.md), [测试规则](../.claude/rules/testing.md), [贡献指南](../CONTRIBUTING.md) |
| 想新增 Skill | [Skill 系统指南](reference/skill-system.md) | [MCP 工具参考](reference/mcp-tools.md), [测试规则](../.claude/rules/testing.md) |
| 想理解架构 | [架构总览](architecture/overview.md) | [Agent Runtime](architecture/agent-runtime.md), [技术架构深潜](architecture/technical-architecture.md) |
| 想发布新版本 | [发布手册](reference/release.md) | [免安装包打包](reference/portable-packaging.md), [发布规则](../.claude/rules/release.md) |
| 想看独立 feature 计划 | [多 Trace 分析结果对比开发计划](features/multi-trace-result-comparison/README.md) | [出图教学重构计划](features/rendering-pipeline-teaching-refactor/README.md), [企业级多用户与多租户](features/enterprise-multi-tenant/README.md) |
| 想排查部署问题 | [故障排查](operations/troubleshooting.md) | [配置指南](getting-started/configuration.md) |

## 文档结构

```text
docs/
├── README.md                         # 文档入口
├── getting-started/                  # 安装、配置、使用
├── architecture/                     # 当前架构与权威设计
├── features/                         # 独立 feature 开发文档
├── reference/                        # API、CLI、MCP、Skill DSL
├── operations/                       # 运行与故障排查
├── rendering_pipelines/              # Android 渲染管线知识库，运行时会读取
├── product/                          # 项目定位与外部介绍
├── archive/                          # 历史方案、spike、决策记录
└── images/                           # 文档图片资源
```

## 权威文档

- 当前系统入口与运行方式以 [快速开始](getting-started/quick-start.md)、[CLI 参考](reference/cli.md)、[免安装包打包](reference/portable-packaging.md) 和 [发布手册](reference/release.md) 为准。
- Feature/Bug 修改前需要按 [产品面规则](../.claude/rules/product-surface.md) 检查 Web UI、CLI、API、报告、Docker、免安装包、runtime/provider、Node 版本和预置内容影响面。
- 发布/npm/portable/Docker 相关工作以 [发布手册](reference/release.md) 和 [发布规则](../.claude/rules/release.md) 为准。
- 当前后端 API 以 [API 参考](reference/api.md) 为准。
- agentv3 与分析模式以 [agentv3 运行时](architecture/agent-runtime.md) 为准。
- MCP 工具面以 [MCP 工具参考](reference/mcp-tools.md) 和 tool registry 为准，不以旧的静态工具数量为准。
- Skill DSL 与分层结果以 [Skill 系统指南](reference/skill-system.md) 为准。
- DataEnvelope 与前后端数据 contract 以 [Data Contract](../backend/docs/DATA_CONTRACT_DESIGN.md) 为准。
- final report、evidence/claim verification、identity resolution、chat-vs-report 边界以 [架构总览](architecture/overview.md) 和 [Agent Runtime](architecture/agent-runtime.md) 为准。
- 自改进系统以 [Self-Improving 设计](architecture/self-improving-design.md) 为准。
- `archive/` 下文档只保留历史背景，不代表当前推荐实现。

## 运行时依赖的文档

`docs/rendering_pipelines/` 不只是普通说明文档。渲染管线检测、教学模式和部分 Skill 结果会通过 `doc_path: rendering_pipelines/*.md` 引用这些 Markdown。移动或重命名这里的文件时，需要同步更新：

- `backend/skills/pipelines/*.skill.yaml`
- `backend/skills/atomic/rendering_pipeline_detection.skill.yaml`
- `backend/src/services/pipelineDocService.ts`
- `backend/src/config/teaching.config.ts`

改动后至少运行：

```bash
cd backend
npm run validate:skills
npm run test:scene-trace-regression
```
