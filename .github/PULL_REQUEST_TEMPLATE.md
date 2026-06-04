<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2024-2026 Gracker (Chris) | SmartPerfetto -->

## Summary

<!-- 1-3 bullet points: what changed and why. -->

-
-

## Linked Issue

<!-- Link a GitHub issue if applicable, e.g., Fixes #123 -->

## Change Type

<!-- Check all that apply -->

- [ ] feat (new capability)
- [ ] fix (bug fix, no API change)
- [ ] refactor (internal cleanup, no behavior change)
- [ ] docs (documentation only)
- [ ] chore (build, CI, tooling, dependency updates)
- [ ] skill / strategy (YAML skill or `.strategy.md` / `.template.md`)

## Contributor / AI Context

<!-- This project is often edited with AI agents. Keep review context explicit. -->

- [ ] I read `AGENTS.md` before making this change
- [ ] I read the relevant `.claude/rules/*` file(s) for the affected area
- [ ] For non-trivial changes, I used an independent read-only review pass or documented why it was unavailable

## Affected Areas

<!-- Check all that apply. This helps reviewers route attention. -->

- [ ] Web UI / committed `frontend/`
- [ ] CLI / `smp`
- [ ] Docker / portable package
- [ ] HTTP/SSE API
- [ ] Reports / exports / analysis-result snapshots
- [ ] `backend/src/agentv3/` or `backend/src/agentOpenAI/` (agent runtime)
- [ ] MCP tool registry / tool adapters
- [ ] Provider Manager / runtime selection / session resume
- [ ] `backend/skills/` (YAML skills)
- [ ] `backend/strategies/` (`*.strategy.md`, `.template.md`, `knowledge-*`)
- [ ] Code-aware analysis / CodeRef / source lookup
- [ ] `perfetto/ui/src/plugins/com.smartperfetto.AIAssistant/` (frontend)
- [ ] `scripts/` / `backend/scripts/` (tooling, generators)
- [ ] `.github/workflows/` (CI)
- [ ] Docs only
- [ ] Tests only

## Done Conditions

<!-- All code changes must satisfy these. Check after running. -->

- [ ] I preserved unrelated local changes
- [ ] I did not hardcode prompt content, MCP tool lists, Skill counts, or scene lists
- [ ] I kept chat/report/CLI/snapshot evidence boundaries intact where AI output is affected
- [ ] I included any extra targeted test command needed for this change in the test plan below
- [ ] New `.ts` / `.yaml` / `.sh` / `.strategy.md` files carry SPDX AGPL v3 header

## Test Plan

<!-- How did you verify this change? What would a reviewer run? Use `.claude/rules/testing.md`. -->

-

<!-- Examples:
- Docs-only, not runtime-read: `git diff --check`
- Skill YAML: `cd backend && npm run validate:skills` plus scene trace regression
- Strategy/template: `cd backend && npm run validate:strategies` plus scene trace regression
- Runtime/MCP/provider/session/report: `cd backend && npm run test:scene-trace-regression`
- Before landing: `npm run verify:pr`
-->

## Risk / Rollback

<!-- What could break? How do we back this out if it ships wrong? -->

-

## Notes for Reviewers

<!-- Anything else: design decisions, tradeoffs considered, follow-up work -->

-
