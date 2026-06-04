<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2024-2026 Gracker (Chris) | SmartPerfetto -->

# Changelog

All notable changes to SmartPerfetto are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Commit prefixes follow [Conventional Commits](https://www.conventionalcommits.org/).
Detailed commit-level history is available via `git log`.

## [Unreleased]

## [1.0.21] - 2026-05-25

### Added
- Smart Analysis Mode now starts with a scene-inventory preview for mixed-action
  traces, then lets users deep-dive all scenes or only startup, scrolling,
  click, navigation, device-state, or ANR ranges.
- Smart scene reconstruction now carries eligibility, confidence, context,
  verification, and report ids into the main AI chat so the frontend can render
  scoped analysis buttons before spending deep-dive tokens.
- Smart selected-scope E2E coverage now verifies startup and scrolling
  conclusions against the direct single-scene analysis path.

### Changed
- Smart deep dives reuse the dedicated scene strategies and full analysis mode
  for the selected scope, keeping Smart output close to explicit startup or
  scrolling analysis.
- Smart job evidence is projected into bounded report payloads, with omitted
  rows kept as out-of-band scene-job artifacts.
- The committed Perfetto UI prebuild was refreshed from the updated AI
  Assistant plugin bundle.

### Fixed
- Smart scrolling conclusions now preserve corrected deep-dive root causes when
  batch reason codes are superseded by stronger evidence such as shader
  pipeline or `postAndWait` signals.

### Added
- Fast / Full / Auto three-tier analysis mode routing via `options.analysisMode`
  (env-configurable per-turn timeouts, classifier fast-path via keyword rules).
- Scene reconstruction pipeline with independent `sceneStoryService`
  (JobRunner concurrency=3, Haiku-summarized `SceneReport`).
- State Timeline V1: four swim-lane track overlays (device/input/app/system).
- Trace comparison prototype: three conditional MCP tools, orthogonal
  comparison mode.
- Perfetto stdlib integration: 22 critical-preload tables, `list_stdlib_modules`
  MCP tool, `lookup_knowledge` for on-demand background knowledge.
- Deep root-cause analysis skills: `blocking_chain_analysis`,
  `binder_root_cause`, `startup_slow_reasons`, `frame_blocking_calls`.
- Android version diff analysis (system-behavior vs app-adaptation root causes).
- Scrolling jank taxonomy: 21 reason codes, 2 new skills.
- Trace data completeness: capability registry + session-init probing.

### Changed
- agentv3 is now the primary runtime (Claude Agent SDK orchestrator, 20 MCP tools).
- Six shell scripts under `scripts/`; typecheck + test:core covered by `/health`
  dashboard.

### Fixed
- `claudeRuntime.ts` SDK `query()` close-handle convention to prevent zombie
  trace_processor_shell subprocesses.
- Verifier tightened around shallow root causes (critical-severity findings
  must include a quantitative claim and ≥ 2 causal chains).

## [0.1.0] - 2025-12-14

### Added
- Initial public repository structure.
- Perfetto fork submodule (`perfetto/`) with custom UI plugin
  `com.smartperfetto.AIAssistant`.
- Backend Express service with SSE streaming, in-memory session management,
  and trace_processor_shell integration.
- YAML skill system (`backend/skills/`) with L1–L4 layered results and
  `DataEnvelope` v2.0 contract.
- Scene classifier (12 scenes: scrolling / startup / anr / pipeline / memory /
  game / teaching / interaction / touch-tracking / overview / scroll-response /
  general) driven by strategy front-matter.
- Strategy + template system under `backend/strategies/` (`*.strategy.md`,
  `*.template.md`) with hot reload in dev mode.
- HTML report generation and CSV / JSON export.
- AGPL v3.0 licensing throughout.

[Unreleased]: https://github.com/Gracker/SmartPerfetto/compare/v1.0.21...HEAD
[1.0.21]: https://github.com/Gracker/SmartPerfetto/compare/v1.0.20...v1.0.21
[0.1.0]: https://github.com/Gracker/SmartPerfetto/releases/tag/v0.1.0
