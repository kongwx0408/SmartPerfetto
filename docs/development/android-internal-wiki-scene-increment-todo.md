# Android Internal Wiki Scene Increment TODO

## Goal

Turn the completed Android Internal Wiki reading record into scene-by-scene,
verifiable SmartPerfetto Skill and Strategy increments.

This TODO is the execution ledger for the second phase after
`android-internal-wiki-skill-strategy-review.md`. The earlier batch shipped
global evidence guardrails and a few overclaim fixes. This phase must not stay
at generic prompt policy. Each increment must improve a concrete scene contract,
Skill output, or testable routing/report behavior.

## Current Result Review

### Already Strong Enough To Avoid Rewriting

- `backend/strategies/anr.strategy.md`
  - Current coverage already includes ANR type/timeouts, `freeze_verdict`,
    event-window clipping, direct blocker classification, nativePollOnce
    caveats, Binder/lock/IO/GC/scheduler boundaries, multi-ANR isolation,
    `logcat_event_context`, and system-vs-app attribution.
  - Wiki material still has value, but the next ANR increment should first
    improve the user-facing output contract and tests, not duplicate the
    strategy body.

- `backend/strategies/startup.strategy.md`
  - Current coverage already includes startup type correction, TTID/TTFD,
    startup detail artifacts, Binder/IO/GC/JIT/thermal/memory pressure,
    content provider, WebView/Flutter, slow-reason taxonomy, and final report
    contract.
  - Remaining wiki work should be small and evidence-specific, such as
    external diagnostic API/version caveats or 16 KB/native-loading checks when
    directly testable.

- `backend/strategies/scrolling.strategy.md` and
  `backend/strategies/pipeline.strategy.md`
  - Current coverage is strong for mixed rendering, host-vs-producer-vs-SF
    attribution, architecture-specific jank, and FrameTimeline boundaries.
  - Remaining work should target missing deterministic evidence around
    BufferQueue/fence/graphic-memory or refresh-rate policy, with trace tests.

- `backend/strategies/power.strategy.md`
  - Current coverage already has data gates, Wattson/rail vs fallback, battery
    drain chain, wakelock thresholds, Doze, thermal, and confidence levels.
  - Remaining wiki work is narrower: JobScheduler/WorkManager/FGS pending-vs-
    stop reasons, Android 16/17 background limits, and explicit validation
    paths when rail data is missing.

- `backend/strategies/network.strategy.md`
  - Current coverage already guards packet-level evidence from DNS/connect/TLS/
    TTFB overclaims.
  - Future network work should only add request-stage logic if the repo has a
    deterministic Skill, trace, or user-provided telemetry input to validate it.

### Thin Or Under-Tested Areas

- `backend/strategies/memory.strategy.md`
  - Current strategy is much thinner than the wiki evidence model. It does not
    yet force Java Heap, Native Heap, Graphics/dma-buf, SO mappings, anonymous
    mmap, RSS/PSS, GC churn, LMK, freezer, and modern MemoryLimiter/API
    boundaries into the report contract.

- `backend/skills/config/conclusion_scene_templates.base.yaml`
  - ANR and memory scene output requirements are weaker than their strategies
    and wiki-derived evidence contracts. This is a high-leverage surface because
    it shapes final user-facing conclusions.

- Storage and SQLite
  - There is an `io` conclusion scene and generic strategy coverage, but no
    dedicated scene strategy for file/SP/fsync vs SQLite/Room/provider
    attribution. Wiki articles contain enough material to split this later.

- Input and interaction
  - `interaction.strategy.md` and `scroll-response.strategy.md` cover the happy
    interaction path. Wiki material adds InputDispatcher stale events,
    no-focused-window ANR, focus/window metadata, and `FINISHED` ack semantics
    that need focused validation before broad prompt expansion.

- Graphics memory and BufferQueue/fence
  - Pipeline skills contain many architecture modules, but wiki review points
    to a testable gap around GraphicBuffer/dma-buf memory vs BufferQueue state
    vs fence waits.

## Definition Of Done For Each Increment

Each TODO item can be marked done only when all applicable gates pass:

- Architecture review: the change uses existing strategy, template, Skill YAML,
  and test surfaces rather than TypeScript hardcoding.
- Evidence contract: the output names evidence source, subsystem/stage,
  confidence, and missing data when applicable.
- Focused tests: add or update the owning unit/eval tests for changed behavior.
- Validation: run `cd backend && npm run validate:strategies` for strategy or
  strategy-template changes, and `cd backend && npm run validate:skills` for
  `.skill.yaml` Skill changes.
- Scene template config changes require focused Jest coverage because
  `validate:skills` does not currently validate
  `backend/skills/config/conclusion_scene_templates.base.yaml`.
- Required project gates: run `cd backend && npm run build` and
  `cd backend && npm run test:scene-trace-regression`.
- Landing gate: run `npm run verify:pr` from repo root before final commit/push.
- Review gate: run independent read-only plan review before non-trivial
  implementation, and read-only post-diff review before commit.

## Execution Order

### Batch 1 - Output Contract Hardening For Already-Covered ANR And Thin Memory

- [x] TODO-001: ANR conclusion output contract
  - Target files:
    - `backend/skills/config/conclusion_scene_templates.base.yaml`
    - `backend/src/agent/core/__tests__/conclusionSceneTemplates.test.ts`
  - Current strategy coverage:
    - `anr.strategy.md` already has strong typed-window and evidence-boundary
      rules.
  - Gap:
    - The conclusion scene template only asks for one blocking evidence item and
      broad categories. It does not force ANR type, timeout source,
      system-confirmed vs watchdog/suspected, subject-vs-root-cause process,
      direct blocker, evidence gap, or nativePollOnce caveat into concise final
      output.
  - Implementation:
    - Add concise output requirements to the `anr` scene template.
    - Add focused tests asserting the template includes the ANR evidence
      contract and does not regress generic scene loading.
    - Phrase "system-confirmed vs watchdog/suspected" as a provenance and
      missing-data requirement: the report must state the confirmation source
      or say that confirmation evidence is absent.
  - Verification:
    - `cd backend && npx jest src/agent/core/__tests__/conclusionSceneTemplates.test.ts --runInBand`.
    - Do not rely on `validate:skills` for this config file; it does not scan
      conclusion scene templates today.
  - Completed in Batch 1:
    - Added ANR final-output requirements for timeout provenance, confirmation
      source or evidence gap, victim process vs root-cause process/component,
      binder/lock peer evidence, nativePollOnce caveats, and resource
      categories including GC/memory pressure.
    - Covered by focused scene-template tests.

- [x] TODO-002: Memory strategy and conclusion contract
  - Target files:
    - `backend/strategies/memory.strategy.md`
    - `backend/skills/config/conclusion_scene_templates.base.yaml`
    - Strategy loader / conclusion template tests as needed.
  - Current strategy coverage:
    - Memory strategy calls `memory_analysis`, `lmk_analysis`, heap/bitmap/GC/
      dmabuf helper skills, but it is mostly a high-level checklist.
  - Gap:
    - Wiki review requires memory reports to separate Java Heap, Native Heap,
      Graphics/dma-buf, SO/ELF mappings, anonymous mmap, thread stacks,
      RSS/PSS, LMK, freezer, GC pause/churn, heap graph, and external
      ApplicationExitInfo or MemoryLimiter evidence.
  - Implementation:
    - Add a memory `final_report_contract` and phase hints.
    - Add output requirements that prevent "high memory == leak" and
      "LMK/freezer/OOM are interchangeable" conclusions.
    - Keep the first slice to evidence classification, non-mixing rules, and
      missing-evidence wording. Do not imply that every trace can provide
      Native/SO/anonymous-mmap/thread-stack/ApplicationExitInfo/MemoryLimiter
      proof.
  - Verification:
    - Strategy validation.
    - Focused conclusion template tests.
    - Update `activePhaseReminder.test.ts`: the fallback test must move to a
      scene that still has no `phase_hints` after memory gains hints.
    - Update `strategyLoader.spdxHeader.test.ts`: assert memory phase hints and
      memory final report contract section ids.
    - Add/extend final-report contract gate coverage: incomplete memory reports
      should be detected, complete memory reports should pass.
    - Add/extend OpenAI continuation coverage so memory contract gaps trigger
      final-report continuation when the report omits required memory sections.
    - Existing `memory_analysis` eval if runnable with current fixtures; if not,
      document the fixture gap and rely on loader/gate/template tests for this
      narrow prompt/contract slice.
  - Completed in Batch 1:
    - Added memory final-report contract sections for evidence scope, memory
      type breakdown, and confidence/missing-evidence boundaries.
    - Added phase hints for evidence classification, LMK/freezer/OOM boundary
      handling, and GC-churn attribution.
    - Tightened scene-template wording so memory reports separate Java Heap,
      Native Heap, Graphics/dma-buf, RSS/PSS, GC, LMK/freezer, and external
      diagnostics without equating high memory with a leak.
    - Covered by loader, active-phase reminder, final-result gate, OpenAI
      continuation, and scene-template tests.

### Batch 2 - Storage, SQLite, Provider, And I/O

- [x] TODO-003: Storage/SQLite scene split
  - Target files:
    - Existing `general.strategy.md` or a new dedicated storage/IO strategy only
      if routing supports it cleanly.
    - `backend/skills/config/conclusion_scene_templates.base.yaml`
    - Existing I/O, Binder, ANR, and startup strategy references.
  - Wiki input:
    - File I/O vs SharedPreferences/QueuedWork/fsync, SQLite connection pool,
      WAL/checkpoint, CursorWindow, Room migration, ContentProvider caller vs
      provider-side blocking, and storage capacity/corruption are separate
      proof paths.
  - Implementation:
    - Define the staged evidence contract before adding any new SQL.
    - Avoid treating D-state or a long fsync as database root cause without
      SQLite/provider evidence.
  - Verification:
    - Add focused tests near routing/template surfaces first; defer deep Skill
      SQL until a trace fixture proves it.
  - Completed in Batch 2:
    - Added a dedicated `io` strategy with frontmatter routing, final-report
      contract sections, phase hints, and a plan template for I/O evidence
      classification and app API boundary review.
    - Split final-output requirements across File I/O, SharedPreferences/
      QueuedWork/fsync, SQLite/Room/connection pool/WAL/checkpoint/
      CursorWindow, ContentProvider, MediaProvider, and scoped storage.
    - Guarded against D-state or long fsync being treated as a database root
      cause without SQLite/provider/path/stack evidence.
    - Updated plan-template discovery so frontmatter-only scene plan templates
      are covered without hardcoding the new `io` scene in TypeScript.
    - Covered routing boundaries with mocked and real strategy-registry tests:
      pure storage/SQLite/provider queries route to `io`, while ANR, startup,
      media, and network keep precedence for their own evidence.

### Batch 3 - Input, Focus, And Interaction Latency

- [x] TODO-004: InputDispatcher and focus-window evidence
  - Target files:
    - `backend/strategies/interaction.strategy.md`
    - `backend/strategies/scroll-response.strategy.md`
    - `backend/strategies/anr.strategy.md` only if a real gap remains after
      TODO-001.
  - Wiki input:
    - Stale events, no-focused-window ANR, InputChannel lifecycle, async
      dispatch/FINISHED ack, WindowInfosListener, and target-window choice are
      separate from app main-thread execution.
  - Implementation:
    - Add concise stage boundaries and output requirements.
    - Do not expand this until tests can validate prompt/routing behavior.
  - Verification:
    - Focused prompt/strategy tests plus trace regression.
  - Completed in Batch 3:
    - Added `interaction` final-report contract, phase hints, and plan template
      for dispatch/handling/ACK/display stage separation plus stale,
      InputChannel, `iq`/`oq`/`wq`, FINISHED, focus/window, and
      FrameTimeline evidence boundaries.
    - Added `scroll_response` final-report contract and phase hints for
      response-latency scope, input target/queue evidence, and
      FrameTimeline/present confidence.
    - Narrowly strengthened `anr` wording so no-focused-window, stale drops,
      InputChannel failures, and `wq`/FINISHED timeout are not conflated.
    - Wired `click_response` conclusion metadata to the `interaction`
      final-report contract and moved `interaction` out of the plan-template
      opt-out set.
    - Updated click/input/scroll-response Skill labels so dispatch-to-ACK is
      not presented as true input-to-present latency.
    - Added focused tests for strategy loader contracts, plan-template
      migration, final-result quality gate behavior, conclusion template
      output requirements, and real strategy-registry routing.

### Batch 4 - Graphics Memory, BufferQueue, Fence, And Refresh Policy

- [x] TODO-005: Graphics-memory and BufferQueue/fence contract
  - Target files:
    - `backend/strategies/scrolling.strategy.md`
    - `backend/strategies/pipeline.strategy.md`
    - Pipeline Skill YAML only after SQL/test feasibility review.
  - Wiki input:
    - BufferQueue state machine, BLAST, GraphicBuffer/dma-buf physical memory,
      fence wait semantics, HWC/SF release path, refresh-rate votes, and
      FrameTimeline confidence boundaries.
  - Implementation:
    - First add report-stage distinctions: BufferQueue logic vs dma-buf memory
      vs fence wait vs SF/HWC policy.
    - Add deterministic Skill SQL only with fixture coverage.
  - Verification:
    - Existing scrolling trace regression plus focused tests for prompt text.
  - Completed in Batch 4:
    - Added pipeline strategy routing, phase hints, and final-report contract
      support for rendering-stage split plus conditionally-triggered
      BufferQueue/Fence boundaries, with graphics-memory/refresh-policy as an
      explicit evidence boundary.
    - Added data-driven `trigger_patterns` support so optional evidence
      surfaces can be verified when relevant without turning generic pipeline
      identification into a BufferQueue/refresh-policy hard gate.
    - Added scrolling display-pipeline boundary guidance for SF/BufferQueue/Fence,
      hidden jank, Buffer Stuffing, and refresh-rate budget cases without making
      every CPU-only scrolling report pass a new global gate.
    - Clarified `fence_wait_decomposition` fixed-threshold output as heuristic
      evidence that must be paired with actual VSync/present timing.
    - Added focused tests for strategy loading, phase-hint matching,
      plan-template frontmatter, real classifier routing, and final-result
      quality gating.

### Batch 5 - Power Background Execution

- [x] TODO-006: JobScheduler/WorkManager/FGS power governance
  - Target files:
    - `backend/strategies/power.strategy.md`
    - Power Skill YAML only if existing Skills expose the required fields.
  - Wiki input:
    - Job pending reason vs stop reason, WorkManager constraints, FGS timeout,
      Android 16/17 quotas and excessive CPU triggers, wakelock Vitals windows,
      alarm and listener allow-while-idle boundaries.
  - Implementation:
    - Add a concise background-execution evidence section.
    - Keep Android version/policy claims as version-sensitive unless verified
      against current official docs in the implementing turn.
  - Verification:
    - Strategy validation and focused tests. Power Skill smoke if fixture data
      exists.
  - Completed in Batch 5:
    - Verified version-sensitive Android behavior against current official docs
      on 2026-05-30 before encoding it: Android 15 FGS timeouts, Android 16
      JobScheduler quota behavior, JobScheduler pending reasons,
      JobParameters/WorkInfo stop reasons, UIDT, Android vitals wakelock
      windows, and AlarmManager allow-while-idle/exact-alarm boundaries.
    - Added `power` routing for concrete background governance surfaces such as
      JobScheduler, WorkManager, Foreground Service/FGS, UIDT, exact alarm,
      allow-while-idle, wakeup alarm, partial wakelock, and Android vitals
      without adding generic `job`/`alarm`/`quota` keywords that would steal
      unrelated scenes.
    - Added conditional `power` final-report contracts split into
      Job/Work/FGS governance and Alarm/Wakeup/Vitals boundaries. Job quota
      reports do not have to include alarm sections, and wakelock/alarm reports
      do not have to include Job/FGS sections.
    - Added power phase hints and strategy body guidance that separate trace
      evidence from app/API logs, pending reason from stop reason, FGS timeout
      from Job quota, UIDT from generic transfer jobs, and local trace windows
      from Play/Vitals 24h aggregate judgments.
    - Did not modify Power Skill YAML because existing trace Skills expose
      JobScheduler execution windows and wakelock/wakeup events, but not
      JobScheduler pending reason history or JobParameters/WorkInfo stop reason
      fields.
    - Added focused tests for loader contracts, phase hints, real classifier
      routing, final-result contract gating, and OpenAI final-report
      continuation behavior.

### Batch 6 - Request-Stage Network And Online Diagnostics

- [x] TODO-007: Request-stage network evidence contract
  - Target files:
    - `backend/strategies/network.strategy.md`
    - Optional new Skill only if request-stage telemetry has a real input
      source.
  - Wiki input:
    - DNS/connect/TLS/TTFB/body/decode, HTTPDNS cache/source/TTL, ECH, satellite
      or constrained networks, connectivity selection, client/server logs, and
      APM signals.
  - Implementation:
    - Keep packet trace, request telemetry, access-layer logs, and external APM
      as separate evidence classes.
    - Do not infer request stages from `android_network_packets` alone.
  - Verification:
    - Strategy/template tests first; Skill work only with deterministic inputs.
  - Completed in Batch 6:
    - Verified version-sensitive Android network behavior against current
      official docs on 2026-05-30 before encoding it: Cronet/HttpEngine stack
      boundaries, `NetworkCallback` / `NetworkCapabilities` state semantics,
      Android 16/17 local-network permission behavior, and Android 17 ECH
      capability boundaries.
    - Added pure `network` scene routing for concrete request-stage and
      stack-policy terms: DNS/TLS/TTFB, HTTPDNS, OkHttp EventListener, Cronet,
      HttpEngine, HTTP/3, QUIC, ECH, Certificate Transparency,
      `NetworkCallback`, `NetworkCapabilities`, and local-network permission.
      Generic startup/ANR/interaction/media routing remains protected by
      focused regression tests.
    - Added conditional `network` final-report contracts split into request
      stage evidence boundaries and network stack/version policy boundaries.
      Generic packet-traffic reports do not have to include request-stage or
      policy sections.
    - Added `knowledge-network-evidence.template.md` so
      `lookup_knowledge("network-evidence")` has a concrete asset for packet vs
      request telemetry, logs/snapshots, APM, NetworkCallback, ECH/CT, and local
      network permission boundaries.
    - Updated `network_analysis` evidence scope without adding a fake
      request-stage Skill: the Skill still reports deterministic packet
      evidence, while explicitly naming request-stage/policy evidence it cannot
      prove.
    - Added focused tests for loader contracts, phase hints, knowledge loading,
      real classifier routing, final-result contract gating, OpenAI final-report
      continuation behavior, and Skill evidence boundary text.

### Batch 7 - Observability And Diagnostic APIs

- [x] TODO-008: Versioned diagnostic API caveats
  - Target files:
    - Shared strategy templates or knowledge templates, not TypeScript.
  - Wiki input:
    - ApplicationExitInfo, ApplicationStartInfo, ProfilingManager,
      ProfilingTrigger, Play Vitals, App Performance Score, online telemetry,
      and A/B statistics.
  - Implementation:
    - Add only reusable caveats that keep trace proof separate from external
      aggregate evidence.
    - Verify current official docs before adding date-sensitive API or policy
      thresholds.
  - Verification:
    - Prompt/loader tests and `validate:strategies`.
  - Completed in Batch 7:
    - Verified version-sensitive Android diagnostic API behavior against
      current official docs on 2026-05-30 before encoding it:
      `ApplicationExitInfo`, `ApplicationStartInfo`, `ProfilingManager`,
      `ProfilingTrigger`, Android/Play Vitals, and App Performance Score.
    - Added `knowledge-observability-diagnostics.template.md` so
      `lookup_knowledge("observability-diagnostics")` has a concrete asset for
      trace-direct evidence, diagnostic APIs, profiling artifacts, external
      aggregates, A/B experiments, and missing-evidence wording.
    - Added conditional final-report contracts and phase hints for startup,
      memory, and ANR diagnostic API boundaries. These deliberately remain out
      of `plan_template.mandatory_aspects` so ordinary startup/memory/ANR plans
      are not hard-gated by external diagnostic surfaces.
    - Added routing coverage for `ApplicationStartInfo`, `ApplicationExitInfo`,
      `ProfilingManager`, and `ProfilingTrigger`, plus negative cases so
      unrelated crash, power, network, scrolling, startup, and ANR questions
      keep their stronger owning scenes.
    - Added final-result quality gate and OpenAI continuation coverage so
      reports that mention diagnostic APIs or external aggregates must separate
      trace proof from API records, profiling artifacts, online aggregates, and
      experiment context.
    - Addressed independent post-diff review findings by removing diagnostic
      API hard plan gates and by tightening ANR triggers so generic `system
      trace` / `stack trace` wording does not require a diagnostic API section
      unless the user mentions `ProfilingManager`, `ProfilingTrigger`,
      `TRIGGER_TYPE_ANR`, `ApplicationExitInfo`, Vitals, or watchdog evidence.

## Current Next Step

All listed batches are implemented. Batch 7 passed independent review and the
repository landing gates:

- Focused Jest passed for strategy loading, phase-hint matching, plan-template
  regression, real registry routing, final-result contract behavior, and OpenAI
  final-report continuation behavior.
- `validate:strategies`, backend build, scene trace regression,
  `npm run verify:pr`, and `git diff --check` passed.
- Manual simplification review kept the scope to conditional
  startup/memory/ANR diagnostic evidence contracts, a reusable knowledge topic,
  and tests. The `/simplify` command was not available in this shell
  (`simplify not found`), so this was a manual simplification pass.

Next: commit and push Batch 7 to `main`.
