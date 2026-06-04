# Android Internal Wiki Skill/Strategy Review

## Purpose

This file records a full reading pass over the markdown corpus under
`/Users/chris/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian/Android-Internal-Wiki/src`
and converts the useful parts into a SmartPerfetto Skill/Strategy optimization
plan.

The record is intentionally source-driven. Each article entry should state
whether it produces an actionable SmartPerfetto change, and if so whether the
change belongs in deterministic YAML Skills, strategy/template methodology,
runtime-read docs, tests, or another surface.

## Corpus

- Root: `/Users/chris/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian/Android-Internal-Wiki/src`
- Article definition: every markdown file under the root.
- Count: 424 markdown files.
- Included: `SUMMARY.md`, chapter `README.md` files, appendix markdown, and
  `graphify-out/GRAPH_REPORT.md`.
- Excluded: non-markdown generated graph files.
- Inventory command:

```bash
find '/Users/chris/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian/Android-Internal-Wiki/src' -type f -name '*.md' | sort
```

## SmartPerfetto Architecture Boundaries

- Deterministic evidence belongs in `backend/skills/**/*.skill.yaml`.
- Durable prompt methodology belongs in `backend/strategies/*.md`.
- Runtime-read teaching or reference docs must be committed and linked through
  the relevant Skill or strategy surface.
- TypeScript may load, validate, route, and assemble content, but should not
  hardcode durable prompt content, scene lists, Skill counts, or tool lists.
- Any change that affects Skills or strategies must run the relevant validation
  plus trace regression before landing.

## Reading Log

Entries are appended in sorted corpus order.

### 001. `SUMMARY.md`

- Type: corpus index.
- Useful information:
  - The wiki covers system architecture, rendering, input, memory, CPU/power,
    storage, smoothness, startup, ANR, Perfetto, methodology, APM, AOSP/OEM
    system changes, and app-layer practice chapters.
  - Several chapter clusters map directly to existing SmartPerfetto scenes:
    scrolling/jank, startup, ANR, memory, power, network, rendering pipelines,
    selection/workflow, and observability.
- SmartPerfetto impact:
  - Use this as the high-level taxonomy for later synthesis, not as a direct
    Skill change.
  - It confirms that ingestion should not become a monolithic prompt dump. The
    corpus naturally splits into targeted Skill/strategy buckets.
- Candidate target:
  - Synthesis taxonomy in this document.
- Status: read, no direct implementation yet.

### 002. `appendix/analysis-checklist.md`

- Type: scenario checklist.
- Useful information:
  - Jank checklist emphasizes scope definition, rendering pipeline
    identification, MainThread/RenderThread/SF evidence, CPU frequency,
    background contention, memory reclaim, and thermal context.
  - Startup checklist emphasizes launch type, metric source, zygote/process
    creation, `Application#onCreate`, implicit ContentProvider work,
    Activity lifecycle, first-frame work, Baseline Profiles, 16 KB pages, and
    startup thread contention.
  - ANR checklist emphasizes trigger type, system snapshot, main-thread state,
    lock owner/deadlock chain, runnable CPU starvation, native/epoll ambiguity,
    logcat timing drift, Binder pool exhaustion, focus anomalies, and
    `am_freeze`.
  - Memory and power checklists emphasize distinguishing OOM vs GC/reclaim
    slowdown, native/graphics memory, leak vs churn, wakelock/alarm/network
    wakeups, HWC overlay fallback, GPS/sensor/Bluetooth lifecycle, ROM policy,
    and FGS timeout behavior.
- SmartPerfetto impact:
  - Existing scene strategies already cover many of these gates, but this file
    is a useful coverage matrix for later gap analysis.
  - Potential missing or underweighted areas to verify later: `gfxinfo`
    fallback framing, HWC overlay power impact, 16 KB page-size startup/native
    loading, focus-window ANR routing, ROM policy/FGS timeout power framing.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`,
    `backend/strategies/startup.strategy.md`,
    `backend/strategies/anr.strategy.md`,
    `backend/strategies/memory.strategy.md`, and
    `backend/strategies/power.strategy.md`.
- Status: read, keep as checklist source for synthesis.

### 003. `appendix/commands-cheatsheet.md`

- Type: command reference.
- Useful information:
  - Lists common `adb`, `dumpsys`, `am`, `pm`, `logcat`, `atrace`, and
    `perfetto` commands for external reproduction and pre-trace context.
  - Relevant external signals include Activity/window state, process OOM
    priority, meminfo, `gfxinfo framestats`, SurfaceFlinger layers, batterystats,
    power/alarm state, `am start -W`, `am kill`, `pm compile`, ANR/crash logcat,
    bugreport, and trace capture commands.
- SmartPerfetto impact:
  - Most commands are outside post-hoc `.pftrace` analysis, so they should not
    become YAML Skills unless the data is present in trace tables.
  - They can improve strategy wording for "evidence unavailable in trace" and
    CLI capture guidance, especially when SmartPerfetto should recommend
    additional device-side collection.
- Candidate target:
  - Capture/docs lane, strategy data-gap recommendations, possibly CLI capture
    presets if later articles give concrete Perfetto config requirements.
- Status: read, no direct Skill change yet.

### 004. `appendix/glossary.md`

- Type: terminology glossary.
- Useful information:
  - Standardizes bilingual terms for jank, smoothness, responsiveness, cold/
    warm/hot launch, dropped frame, overdraw, big.LITTLE, power, frame rate,
    refresh rate, rendering pipeline, composition, process priority, LMK, and
    chained wakeup.
  - Keeps proper nouns like Choreographer, SurfaceFlinger, Binder, VSync,
    Perfetto, and Systrace in English.
- SmartPerfetto impact:
  - Useful for output consistency in Chinese strategies and reports.
  - Could feed a small terminology note in shared output methodology if later
    reading reveals inconsistent terms in current strategies.
- Candidate target:
  - `backend/strategies/prompt-output-format.template.md` or scene strategy
    wording, only if a concrete inconsistency is found.
- Status: read, no direct implementation yet.

### 005. `appendix/perfetto-templates.md`

- Type: Perfetto capture config templates.
- Useful information:
  - UI jank capture should include process stats, sys stats, sched switch,
    CPU frequency/idle, task creation/rename, and atrace categories `am`, `wm`,
    `view`, `gfx`, `hal`, `input`, `res`, `bionic`.
  - Startup/I/O capture should add sched wakeup, block request issue/complete,
    F2FS sync enter/exit, RSS, ion heap, page faults, disk and dalvik atrace,
    and process stats.
  - Power/thermal capture intentionally avoids high-frequency sched events for
    long capture windows, and focuses on `android.power`, power rails, battery
    counters, cpufreq polling, suspend/resume, thermal tracepoints, and power/
    idle atrace categories.
- SmartPerfetto impact:
  - This is stronger input for capture presets and "missing data" advice than
    for post-hoc Skill SQL.
  - Later synthesis should compare these templates against existing CLI capture
    presets. If gaps exist, update presets/docs rather than adding prompt prose.
- Candidate target:
  - CLI capture presets/configs and strategy data-gap recommendations.
- Status: read, candidate for capture-preset audit.

### 006. `appendix/recommended-reading.md`

- Type: external resource index.
- Useful information:
  - Lists Gracker/androidperformance.com source articles grouped by Android
    architecture, rendering, input, memory, CPU states, jank, startup, ANR, and
    Perfetto.
  - The source groups align with SmartPerfetto strategy/Skill areas: Binder,
    VSync, Choreographer, MainThread/RenderThread, SurfaceFlinger, Triple
    Buffer, Input, CPU state, App/System jank, app launch, ANR, and Perfetto.
- SmartPerfetto impact:
  - Useful provenance and future reading map, but it does not itself contain
    trace-analysis logic.
  - Do not encode external-link claims into runtime behavior from this index
    alone; use the actual article content or committed docs.
- Candidate target:
  - Documentation/source reference only.
- Status: read, no direct implementation.

### 007. `appendix/version-changelog.md`

- Type: Android version performance-change matrix.
- Useful information:
  - Local article claims include Android 12 FrameTimeline/BlastBQ, Android 15
    16 KB pages, Android 16 16 KB support/AutoFDO/adaptive refresh rate, and
    Android 17 lock-free MessageQueue, ART generational GC, ProfilingManager
    triggers, AlarmManager wake-lock changes, local-network permission changes,
    and native DCL protection.
- SmartPerfetto impact:
  - Potential strategy value: version-aware caveats for FrameTimeline
    availability, 16 KB page-size startup/native loading, MessageQueue lock
    contention interpretation, ART GC interpretation, and ProfilingManager
    capture guidance.
  - Because these are current/future platform claims, verify against official
    Android sources before turning them into durable runtime rules.
- Candidate target:
  - `backend/strategies/startup.strategy.md`,
    `backend/strategies/scrolling.strategy.md`,
    `backend/strategies/memory.strategy.md`, and capture guidance, after
    external verification if implementation depends on the facts.
- Status: read, keep as verify-before-encoding candidate.

### 008. `graphify-out/GRAPH_REPORT.md`

- Type: generated corpus graph report.
- Useful information:
  - Report was generated over 206 files, while the current markdown corpus is
    424 files, so it is stale or partial relative to this task.
  - It identifies major communities that map to SmartPerfetto targets:
    Binder, AMS/PMS/ContentProvider, Zygote/startup, MessageQueue/lock
    contention, rendering/VSync/Choreographer/SF/BufferQueue/fences, input,
    memory/LMK/GC, CPU/EAS/DVFS/thermal, storage/I/O, jank, Compose,
    RecyclerView, WebView, ANR, SQLite, power/wakelock, network/TLS, rendering
    pipelines, Perfetto SQL, and system-vs-app methodology.
  - It also reports many isolated nodes and thin communities, so it is not
    reliable as a sole knowledge graph.
- SmartPerfetto impact:
  - Useful as a coarse prioritization map only. Article content remains the
    authority.
- Candidate target:
  - Synthesis taxonomy and gap-checking.
- Status: read, no direct implementation.

### 009. `part1-arch/ch14-other-tools/ch14-other-tools.md`

- Type: incomplete/legacy chapter stub.
- Useful information:
  - Contains a placeholder chapter introduction and loosely related external
    article/news snippets, including Layout Inspector and unrelated AI/security
    news.
- SmartPerfetto impact:
  - No reliable SmartPerfetto Skill/Strategy input. Treat as noisy source.
- Candidate target:
  - None.
- Status: read, no action.

### 010. `part1-fundamentals/ch01-architecture/01-layered-architecture.md`

- Type: architecture and Perfetto mapping.
- Useful information:
  - Maps Android layers to Perfetto data sources: ftrace for kernel scheduling,
    Binder, I/O and frequency; atrace categories for Framework/HAL markers;
    `/proc` and `/sys` polling for process, memory, battery, and other counters.
  - Clarifies SurfaceFlinger is an independent native process, not part of
    `system_server`, and its trace slice names vary by Android version:
    Android 13+ `commit`/`composite`/`postComposition`, Android 11-12
    `onMessageInvalidate`/`onMessageRefresh`/`CompositionEngine::present`,
    Android 10- `onMessageReceived`/`handleMessageRefresh`/`doComposition`.
  - Distinguishes binderized HAL from passthrough HAL. Binderized HAL should be
    followed across Binder into a separate service process; passthrough HAL
    remains in the caller process as native slices/locks.
  - Warns against App-only attribution: Binder waits, SystemServer queues,
    SurfaceFlinger composition, HAL service delays, SELinux/Binder boundaries,
    JNI overhead, VNDK/version boundaries, and kernel states can own root cause.
- SmartPerfetto impact:
  - Strong candidate to improve cross-layer root-cause language in general,
    scrolling, startup, ANR, Binder, and rendering-pipeline strategies.
  - Possible deterministic gap to audit: whether SurfaceFlinger Skills and
    pipeline detection already account for version-specific SF slice names and
    binderized vs passthrough HAL routing.
  - Do not hardcode version claims in TypeScript; if implemented, express in
    strategy/template methodology or Skill SQL patterns.
- Candidate target:
  - `backend/strategies/general.strategy.md`,
    `backend/strategies/scrolling.strategy.md`,
    `backend/strategies/startup.strategy.md`,
    `backend/strategies/anr.strategy.md`,
    `backend/skills/composite/surfaceflinger_analysis.skill.yaml`,
    rendering pipeline Skills/docs.
- Status: read, high-value candidate.

### 011. `part1-fundamentals/ch01-architecture/02-boot-process.md`

- Type: system boot process and measurement methodology.
- Useful information:
  - Separates boot timeline into Boot ROM, Bootloader, Kernel, first-stage init,
    second-stage init, `zygote-start`, Zygote, SystemServer, Home first frame,
    `LOCKED_BOOT_COMPLETED`, and `BOOT_COMPLETED`.
  - Explains that `boot_completed` is not Home first frame and that `adb shell`
    Perfetto capture only covers the userspace portion after the adb session is
    available unless boot tracing is configured ahead of reboot.
  - Identifies Zygote preload slices (`PreloadClasses`, `PreloadResources`,
    shared libraries), SystemServer phases (`startBootstrapServices`,
    `startCoreServices`, `startOtherServices`, `startApexServices`), lazy HAL
    service mechanics, task_profiles, early mount/SELinux/APEX/odsign/dexpreopt
    costs, and Home/broadcast tail work.
  - Corrects Zygote SystemServer fork semantics: SystemServer fork is driven by
    `--start-system-server` in `ZygoteInit.main()`, while app fork requests are
    later handled through the Zygote socket loop.
- SmartPerfetto impact:
  - This is directly useful for startup strategy and any future boot-analysis
    scene. Current `startup` scene is app launch oriented; do not silently
    merge full system boot analysis into app startup without scene/routing
    review.
  - Candidate strategy gap: distinguish app launch, system boot, Home first
    frame, and boot broadcast tail in classifier/strategy prompts.
  - Capture guidance should state when a trace cannot prove early boot phases.
- Candidate target:
  - `backend/strategies/startup.strategy.md`,
    `backend/strategies/prompt-complexity-classifier.template.md`, possible
    future boot strategy/Skill only after architectural review.
- Status: read, high-value candidate but likely needs separate scene boundary.

### 012. `part1-fundamentals/ch01-architecture/03-process-model.md`

- Type: process lifecycle, OOM priority, lmkd, scheduling groups, freezer.
- Useful information:
  - Relates component state to process priority: foreground/top, visible,
    perceptible/foreground service, service, home/previous, cached.
  - Distinguishes `adj`, `procState`, and `schedGroup`; `OomAdjuster` computes
    all three, and `ProcessList.setOomAdj()` sends priority to `lmkd`.
  - `lmkd` uses PSI, `oom_score_adj`, swap/cgroup statistics, and device
    policy, not RSS alone.
  - `task_profiles` map top-app/foreground/background process state to cpuset,
    uclamp, I/O priority, timer slack, and other kernel controls.
  - Multi-process apps pay startup, memory, Binder, state sync, and debugging
    costs; remote processes should not be treated as free isolation.
  - CachedAppOptimizer/freezer means a cached process can remain visible as a
    process while thread slices disappear; LMK kill makes the process track
    disappear.
- SmartPerfetto impact:
  - Candidate improvements for memory, power, startup, ANR, and process
    identity explanations: avoid "large RSS got killed" simplification, and
    distinguish freezer vs LMK in trace evidence when available.
  - Potential deterministic audit: existing Skills around `lmk_kill_attribution`,
    `oom_adjuster_score_timeline`, `device_state_timeline`, and process
    identity may already cover some of this; compare before adding anything.
- Candidate target:
  - `backend/strategies/memory.strategy.md`,
    `backend/strategies/anr.strategy.md`,
    `backend/strategies/startup.strategy.md`,
    `backend/skills/atomic/lmk_kill_attribution.skill.yaml`,
    `backend/skills/atomic/oom_adjuster_score_timeline.skill.yaml`,
    `backend/skills/atomic/device_state_timeline.skill.yaml`.
- Status: read, high-value candidate.

### 013. `part1-fundamentals/ch01-architecture/04-binder.md`

- Type: Binder IPC performance and Perfetto analysis.
- Useful information:
  - Binder latency diagnosis should split client wait, server execution, driver/
    scheduling/queueing, lock contention, thread-pool pressure, and oneway
    queue behavior.
  - `android.binder` Perfetto stdlib exposes `android_binder_txns` with fields
    such as `aidl_name`, `interface`, `method_name`, `client_dur`,
    `server_dur`, and `is_sync`; current field names matter.
  - Fallback analysis should use ftrace slice names: `binder transaction`,
    `binder reply`, `binder transaction async`, and `binder async rcv`.
  - Binder pool pressure is not proven by thread count alone. Evidence needs
    near-limit worker count plus non-idle worker states plus rising client
    latency/reply wait.
  - oneway is serial per Binder node, has async buffer limits, frozen-callee
    semantics, and spam-detection diagnostics. It is not a generic "faster"
    replacement for sync Binder.
  - Binder-freezer, `RemoteCallbackList` frozen-callee policy, and 16 KB page
    size can affect interpretation, but some claims require device/version
    verification before encoding.
- SmartPerfetto impact:
  - Strong candidate for improving Binder root-cause Skills and ANR/scrolling/
    startup strategies.
  - Existing Skills likely already cover `binder_in_range`,
    `startup_binder_in_range`, `startup_main_thread_sync_binder_in_range`,
    `binder_root_cause`, `binder_storm_detection`, and `lock_binder_wait`; audit
    before adding new SQL.
  - If adopting `android_binder_txns`, guard for stdlib availability and field
    drift; provide ftrace fallback.
- Candidate target:
  - Binder-related atomic/composite Skills,
    `backend/strategies/anr.strategy.md`,
    `backend/strategies/startup.strategy.md`,
    `backend/strategies/scrolling.strategy.md`.
- Status: read, high-value candidate.

### 014. `part1-fundamentals/ch01-architecture/05-threading-model.md`

- Type: Android thread model, Looper/MessageQueue, RenderThread, priorities.
- Useful information:
  - Main thread is the Zygote-forked Linux thread initialized by
    `ActivityThread.main()`, not an `ActivityThread` Java Thread object.
  - `nativePollOnce` uses native Looper/epoll for MessageQueue, input/VSync fd,
    and registered fds; Binder pool waits through Binder driver ioctl, not the
    main Looper epoll path.
  - Android 16 source contains legacy/combined/concurrent MessageQueue
    implementations; default app behavior remains legacy until later target/
    compat boundaries. Do not rely on private `mMessages` as a stable signal.
  - RenderThread is lazily created, single-threaded, and `syncAndDrawFrame`
    includes a synchronous `syncFrameState` handoff before RenderThread
    continues the later draw/GPU/queueBuffer work.
  - RenderThread usually raises nice/display priority under `SCHED_OTHER`, not
    `SCHED_FIFO`. Real-time scheduling should only be inferred from explicit
    evidence.
  - ADPF `PerformanceHintManager` affects workload/frequency feedback, not
    direct core placement; manual `sched_setaffinity` can conflict with EAS.
  - Non-main-thread `Choreographer#doFrame` can be legitimate if a Looper thread
    creates its own Choreographer.
- SmartPerfetto impact:
  - Good candidate to sharpen scrolling strategy conclusions: separate
    main-thread traversal, sync handoff, RenderThread draw, GPU/SF delays, and
    scheduler pressure.
  - Candidate deterministic audit: Skills that classify `nativePollOnce`,
    `syncFrameState`, RenderThread delay, MessageQueue lock contention, and
    thread affinity should not overstate unavailable evidence.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`,
    `backend/strategies/anr.strategy.md`,
    `backend/skills/atomic/render_thread_slices.skill.yaml`,
    `backend/skills/atomic/thread_affinity_violation.skill.yaml`,
    `backend/skills/atomic/main_thread_states_in_range.skill.yaml`.
- Status: read, high-value candidate.

### 015. `part1-fundamentals/ch01-architecture/06-version-evolution.md`

- Type: Android architecture/version evolution.
- Useful information:
  - Version boundaries relevant to trace analysis include ART/Dalvik changes,
    Treble and hwbinder, Mainline/APEX, GKI, ART as Mainline from Android 12,
    16 KB page size, privacy/package visibility, background execution limits,
    FGS/job quotas, and ProfilingManager.
  - Perfetto interpretation should not treat Android 8-11 ART behavior as the
    default for Android 12+ because ART can update through Mainline.
  - Background constraints affect capture and online observability tools:
    package visibility, foreground-service types/quotas, exact alarms, stopped
    app network behavior, and WorkManager/FGS boundaries.
- SmartPerfetto impact:
  - Useful as a version-boundary checklist for strategy caveats and capture
    recommendations.
  - Some current/future Android 16/17 claims must be verified against official
    sources before becoming durable runtime instructions.
- Candidate target:
  - Shared methodology templates and scene strategy caveats, not TypeScript
    hardcoding.
- Status: read, medium-value candidate with verification requirement.

### 016. `part1-fundamentals/ch01-architecture/07-art-compilation.md`

- Type: ART JIT/AOT/dex2oat/Profile analysis.
- Useful information:
  - Startup performance depends on whether hot code is interpreted, JITed, or
    AOT compiled via `speed-profile`/profiles.
  - JIT evidence includes `art::jit::*`, `Jit compilation`, `Jit method
    compilation`, `Jit code cache`, and `Jit trampoline`; capture requires
    `atrace_categories: "dalvik"`, not an `art` category.
  - `dex2oat` is visible as its own process during install/background/OTA
    compilation; Android 14+ ART Service changes compile scheduling paths.
  - Baseline Profiles optimize Day-0 execution, Startup Profiles optimize DEX
    layout/class-loading I/O, and Cloud Profiles/Cloud Compilation are separate
    distribution signals. Do not merge their benefits into one fixed number.
  - Practical checks include `cmd package art dump`, `dumpsys package dexopt`,
    `oatdump`, and `profman`.
  - Version/claim caveats: Android 16 Cloud Compilation and Android 17 static
    final/GC claims need verification before being made hard requirements.
- SmartPerfetto impact:
  - Direct candidate for startup strategy and possibly a new/expanded ART
    compilation evidence Skill if trace tables contain enough `dalvik`/process
    evidence.
  - Also useful for data-gap advice when traces lack dalvik/ART slices.
- Candidate target:
  - `backend/strategies/startup.strategy.md`,
    `backend/strategies/memory.strategy.md`, potential startup/ART Skill audit.
- Status: read, high-value candidate.

### 017. `part1-fundamentals/ch01-architecture/08-activity-manager.md`

- Type: ActivityManager/ActivityTaskManager, process priority, launch, and ANR
  framework internals.
- Useful information:
  - Modern AMS/ATMS/WMS split matters for attribution. Launch and ANR analysis
    should avoid old single-AMS or `TaskStack` mental models when newer traces
    expose `RootWindowContainer`, `DisplayContent`, `TaskDisplayArea`, `Task`,
    and `ActivityRecord`.
  - EventLog anchors include `am_proc_start`, `am_proc_bound`, `am_anr`,
    `am_crash`, and `am_kill`; the article explicitly warns not to rely on a
    non-existent `am_activity_launch` anchor.
  - OOM adjustment has subtle foreground-service states: non-short FGS is often
    perceptible, a recent top-to-FGS grace can remain visible-adj, and
    top-sleeping is an `adjType` rather than a distinct `adj` value.
  - ANR timeout interpretation must be typed: input window timeout/no-focused
    window, broadcast foreground vs ordinary, service foreground/background,
    service-start-foreground, provider publish/ready/remote-provider, and
    caller-component timeout for provider CRUD.
  - Modern ANR traces are timestamped files under `/data/anr/`, not a fixed
    `/data/anr/traces.txt`; dump orchestration goes through `AnrHelper` and
    `StackTracesDumpHelper`.
  - `ApplicationStartInfo.getStartComponent()` on API 36 can distinguish
    Activity/Service/Receiver/Provider starts when that external app artifact
    is available, but it is not ordinary Perfetto trace evidence.
  - The article includes a monitor-contention query using
    `android.monitor_contention` for AMS `mServices` lock contention.
- SmartPerfetto impact:
  - High-value ANR/startup methodology input. The most important implementation
    risk is avoiding single-timeout ANR explanations and avoiding stale
    framework names in reports.
  - Candidate for Skill audit where existing ANR or lock-contention Skills can
    expose typed timeout evidence, EventLog anchors, and `mServices` contention
    without hardcoding framework prose in TypeScript.
- Candidate target:
  - `backend/strategies/anr.strategy.md`,
    `backend/strategies/startup.strategy.md`,
    `backend/skills/atomic/lock_contention.skill.yaml`, and ANR/startup
    evidence Skills after inventory.
- Status: read, high-value candidate.

### 018. `part1-fundamentals/ch01-architecture/09-package-manager.md`

- Type: PackageManager, PackageInstaller, dexopt/ART Service, install and
  background compilation pipeline.
- Useful information:
  - Package install attribution should follow the modern pipeline:
    `PackageInstallerSession`, `InstallPackageHelper`, `DexOptHelper`, ART
    Service, `artd`, `dex2oat`, and `installd`.
  - `installd` handles filesystem/data/native-library/SELinux-oriented work;
    ART Service and `artd` own modern compile orchestration. The article warns
    against treating this as a recent Android 16-only split.
  - PMS read/write snapshotting through `Computer` on Android 13/14 reduces
    lock contention and should be considered before blaming PMS global locks on
    modern devices.
  - Install traces can contain session write, file placement, package scan,
    signature/APK v4/incremental verification, app data prep, native library
    prep, dexopt, and package-changed broadcast stages.
  - Android 14+ background dexopt is ART Service `BackgroundDexoptJob` gated by
    idle/charging/battery-not-low style constraints, not a fixed nightly window.
  - Baseline Profiles, Startup Profiles, Cloud Profiles, SDM artifacts, and
    Cloud Compilation are distinct signals. App Archiving on Android 15+ keeps
    data and is not an LMK event.
- SmartPerfetto impact:
  - Useful for startup and install-trace diagnosis, especially when `dex2oat`,
    `artd`, or package scanning competes with app launch CPU/I/O.
  - Likely a strategy/capture-data-gap improvement first; direct Skills depend
    on whether existing traces contain package/dexopt slices and process
    tracks with stable names.
- Candidate target:
  - `backend/strategies/startup.strategy.md`, possible ART/package install
    evidence Skill audit, and capture guidance docs.
- Status: read, medium/high-value candidate.

### 019. `part1-fundamentals/ch01-architecture/10-content-provider.md`

- Type: ContentProvider startup, remote provider IPC, CursorWindow, and
  provider-related ANR patterns.
- Useful information:
  - Same-process providers are installed before `Application.onCreate` through
    `handleBindApplication -> installContentProviders -> attachInfo/onCreate ->
    Application.onCreate`; remote-process providers do not initialize during
    the main process cold start unless their own process is started or accessed.
  - Cross-process provider access uses Binder for control and CursorWindow
    shared memory for row data. `SQLiteCursor.fillWindow` deep-position costs
    usually come from cursor-window filling, not necessarily SQL
    `LIMIT/OFFSET`.
  - Provider timeout interpretation should keep publish timeout, ready-wait
    timeout, asynchronous getType/canonicalize timeout, and caller component
    timeout separate. Provider CRUD has no independent provider-specific ANR
    timer.
  - Remote-provider binder-pool exhaustion has a recognizable topology: caller
    main thread waiting in `IContentProvider$Stub$Proxy.query`, provider Binder
    threads in `ContentProvider$Transport.query`, and provider-side DB/lock
    contention or cold-start provider initialization.
  - `applyBatch` is sequential by default; transactionality or rollback
    depends on provider override, not framework magic.
  - App Startup can consolidate manifest ContentProviders into one initializer
    provider but does not eliminate the underlying initialization work.
- SmartPerfetto impact:
  - Strong candidate for startup and ANR report improvements. It gives concrete
    evidence boundaries for "provider slowed startup" vs "remote provider IPC
    blocked caller" vs "provider CRUD inherited caller ANR".
  - Potential deterministic Skill value if current slice/binder Skills can be
    composed to surface `installContentProviders`, `ContentProvider$Transport`,
    caller proxy waits, and provider-side locks.
- Candidate target:
  - `backend/strategies/startup.strategy.md`,
    `backend/strategies/anr.strategy.md`, binder/lock/thread-state Skills, and
    potential ContentProvider evidence Skill audit.
- Status: read, high-value candidate.

### 020. `part1-fundamentals/ch01-architecture/11-zygote-startup.md`

- Type: Zygote preload, app fork/specialization, USAP, child zygotes, and
  startup observability.
- Useful information:
  - App start path uses Binder from app/launcher to system_server, then the
    zygote socket/LocalSocket from system_server to zygote.
  - Zygote preload includes classes, resources, graphics driver/EGL
    preheating, HALs, shared libraries, WebView, JCA, and optional HttpEngine;
    graphics-driver preload is not per-app GPU context creation.
  - `PostFork` should be interpreted as post-fork/post-specialize work, not
    proof of a native `fork()` slice by itself. PID/process identity and USAP
    evidence are needed for precise attribution.
  - Stable startup anchors include `am_proc_start`, `am_proc_bound`,
    `launching:<pkg>`, `PostFork`, `bindApplication`, and first
    `Choreographer#doFrame`.
  - App Zygote and WebViewZygote are child zygotes with independent sockets and
    no USAP pool; USAP pool behavior is often OEM/property dependent and may be
    disabled in AOSP defaults.
- SmartPerfetto impact:
  - Useful startup strategy guardrail: avoid overclaiming zygote/USAP behavior
    from a single slice name, and keep system_server-to-zygote transport
    distinct from app-to-system_server Binder.
  - Candidate for startup Skill/report wording if existing evidence surfaces
    zygote process tracks, `PostFork`, launch markers, and bind/application
    milestones.
- Candidate target:
  - `backend/strategies/startup.strategy.md`, startup evidence Skills, and
    startup trace regression expectations after inventory.
- Status: read, high-value candidate.

### 021. `part1-fundamentals/ch01-architecture/12-autofdo-optimization.md`

- Type: AutoFDO, kernel/userspace native PGO, simpleperf ETM/ETE collection,
  and system-level optimization evidence.
- Useful information:
  - AutoFDO and Baseline Profiles live on different layers: Baseline Profiles
    select Java/Kotlin methods for ART AOT compilation, while AutoFDO optimizes
    native system binaries, libraries, and kernel code through LLVM profile
    feedback.
  - Kernel AutoFDO evidence should not be inferred from a Perfetto-only trace.
    Perfetto can show system symptoms such as cold-start duration, Binder
    latency, scheduler delay, runnable-to-running wait, and kernel CPU share,
    while function-level evidence needs simpleperf, Coresight ETM/ETE, branch
    lists, or tracepoints.
  - AutoFDO validation needs same-branch/same-config A/B builds. Comparing
    different Android kernel branches confounds the result.
  - Public kernel profile paths differ by branch:
    `android15-6.6` uses `android/gki/aarch64/afdo/`, while `android16-6.12`
    uses `gki/aarch64/afdo/`.
  - The article separates official benchmark buckets: boot, cold launch,
    Binder RPC/addints, HWBinder, and `syscall_mmap`; those numbers should not
    be projected onto arbitrary devices or app workloads.
- SmartPerfetto impact:
  - Mostly a methodology and caveat input. It can help startup/Binder reports
    explain when system-level native/kernel optimization might affect observed
    latency, but SmartPerfetto should not claim AutoFDO causality without
    external A/B or simpleperf evidence.
  - Useful for data-gap recommendations when trace symptoms suggest kernel or
    native hot paths beyond Perfetto's deterministic evidence.
- Candidate target:
  - `backend/strategies/startup.strategy.md`, Binder/system latency strategy
    wording, and capture/data-gap guidance rather than new TypeScript logic.
- Status: read, medium-value candidate.

### 022. `part1-fundamentals/ch01-architecture/13-messagequeue-deliqueue.md`

- Type: Looper/MessageQueue internals, Android 17 lock-free MessageQueue
  rollout, and jank observability.
- Useful information:
  - Main-thread analysis must split message queue operation from message
    dispatch. `MessageQueue.next()` gets a message; business work happens later
    in `dispatchMessage()`. Long layout/draw/Binder work does not make the
    current queue lock hold longer, but can delay the next queue entry.
  - Traditional `MessageQueue` uses a sorted linked list protected by a single
    monitor for enqueue, next, remove, and barrier operations. Contention is
    most relevant when many background producers post to a busy main thread.
  - `nativePollOnce`, synchronization barriers, asynchronous messages, and
    IdleHandler must be separated. IdleHandler is API 1; Choreographer's
    barrier/async behavior is an API 16-era concept.
  - Android 16 public sources contain Combined/Concurrent/Legacy variants with
    controlled rollout for system processes/SystemUI; Android 17 enables the
    new lock-free behavior for targetSdk 37 apps. Do not treat Android 16 as
    app-wide default.
  - New behavior reduces queue-operation contention; it does not make layout,
    draw, Binder, database, or business code faster. When contention disappears
    but frames remain slow, follow the later path.
  - Compatibility caveat: `MessageQueue.mMessages` remains for binary
    compatibility but no longer reflects real queue contents under the new
    implementation.
- SmartPerfetto impact:
  - Directly useful for scrolling/jank and ANR strategy language. Reports
    should distinguish queue-entry monitor contention from dispatch slow paths
    and version/targetSdk-dependent DeliQueue behavior.
  - Potential Skill improvement if existing thread-state/monitor-contention
    evidence can surface `enqueueMessage`, `next`, `dispatchMessage`,
    `nativePollOnce`, barrier-related waits, and main-thread monitor contention.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`,
    `backend/strategies/anr.strategy.md`, main-thread/lock contention Skills,
    and trace regression expectations for queue-vs-dispatch wording.
- Status: read, high-value candidate.

### 023. `part1-fundamentals/ch01-architecture/14-lock-contention.md`

- Type: Java monitor, native mutex/futex, Binder wait queues, priority
  inversion, and Perfetto lock analysis.
- Useful information:
  - Waiting must be classified before attribution: Java monitor, native
    mutex/condition variable, Binder driver wait queue, and MessageQueue
    producer/consumer serialization are different mechanisms with different
    owners and evidence.
  - Java monitor evidence should use the Perfetto stdlib module
    `android.monitor_contention` and the output table
    `android_monitor_contention`; it gives blocked thread, blocking thread,
    blocked method, owner method, and duration.
  - `futex_*` alone is not proof of Java monitor contention. Native mutexes and
    condition variables also sleep through futex paths, and PI-futex support is
    optional per mutex/subsystem.
  - Binder waits should be analyzed as caller wait, target process Binder
    worker state, service-side object locks, and owner-thread dependency chain.
    The article explicitly rejects stale "Android 8 changed Binder worker
    default from 8 to 16" folklore; cited tags still define 15.
  - AMS/system_server contention often needs both Binder worker and service
    lock views, including `mGlobalLock`/`mProcLock` style split and
    `updateOomAdjLocked`/`attachApplicationLocked` call paths.
  - Optimization order should be shorten critical sections, reduce sharing,
    then consider different locks or lock-free structures. CAS retry and cache
    line bouncing can still be costly.
- SmartPerfetto impact:
  - Very high-value for ANR, scrolling, startup, and Binder strategies. It
    provides concrete evidence boundaries that can prevent reports from
    flattening every blocked thread into "lock contention" or every Binder wait
    into "remote service slow".
  - Existing lock-contention Skills should be audited for stdlib module name,
    Java monitor vs native futex vs Binder wait separation, owner-chain output,
    and system_server-specific query coverage.
- Candidate target:
  - `backend/strategies/anr.strategy.md`,
    `backend/strategies/scrolling.strategy.md`,
    `backend/strategies/startup.strategy.md`,
    `backend/skills/atomic/lock_contention.skill.yaml`, native wait/Binder
    thread-state Skills after inventory.
- Status: read, very high-value candidate.

### 024. `part1-fundamentals/ch01-architecture/15-jni-ndk-performance.md`

- Type: JNI/NDK transition cost, FastNative/CriticalNative, native memory
  transfer, tracing, and 16 KB page-size compatibility.
- Useful information:
  - Default Perfetto traces do not automatically expose a universal JNI
    transition slice. Evidence usually comes from manual `android.os.Trace` or
    NDK `ATrace` slices, callstack/native-symbol sampling, or simpleperf
    samples imported into Perfetto.
  - Sampling evidence shows hotspot distribution, not precise per-call JNI
    duration. Reports must not convert a sampled native hotspot into exact JNI
    transition latency.
  - Interface granularity usually matters more than chasing nanoseconds per
    transition: cache `FindClass`/`GetMethodID`/`GetFieldID`, batch data, and
    avoid per-element JNI loops.
  - `@FastNative` and `@CriticalNative` have different contracts. Critical
    native methods should be treated as static primitive-only boundaries in
    app-facing guidance; object, array, blocking I/O, lock waits, and long work
    invalidate the intended benefit.
  - `JNIEnv*` is thread-local. Native-created threads should attach once at
    thread lifetime boundaries, detach before exit, and manage local references
    explicitly.
  - DirectByteBuffer can reduce repeated copying for large reused buffers, but
    allocation/reclamation is heavier and should be pooled.
  - 16 KB page-size requirements affect native-library loadability and segment
    alignment for Android 15+ targeting 64-bit submissions.
- SmartPerfetto impact:
  - Useful for native/JNI hotspot caveats in startup, scrolling, and general
    report strategy. SmartPerfetto can recommend instrumentation or simpleperf
    when traces lack JNI slices, but should avoid claiming exact JNI overhead
    from Perfetto sampling alone.
  - Direct Skill value depends on existing support for native symbols,
    callstacks, and custom ATrace slices; likely a strategy/data-gap candidate
    before deterministic YAML expansion.
- Candidate target:
  - `backend/strategies/startup.strategy.md`,
    `backend/strategies/scrolling.strategy.md`, native hotspot/data-gap
    wording, and possible future callstack/native-symbol Skill audit.
- Status: read, medium/high-value candidate.

### 025. `part1-fundamentals/ch01-architecture/16-audio-pipeline-performance.md`

- Type: AudioFlinger, AudioPolicyService, FAST Mixer, AAudio/MMAP/offload,
  scheduling, and Android 17 audio behavior.
- Useful information:
  - Audio latency analysis should split app write/callback, AudioFlinger
    mixer thread, HAL/DSP, and output path. Output latency and round-trip
    latency are different; round-trip requires input path, app processing, and
    output path evidence.
  - `PERFORMANCE_MODE_LOW_LATENCY` and `AAUDIO_PERFORMANCE_MODE_LOW_LATENCY`
    are requests, not guarantees. Fast path requires policy output profile,
    sample rate/format/channel compatibility, callback behavior, frame count,
    and available fast-track slots.
  - MMAP reduces data-plane movement but still uses audioserver/AAudioService
    for control, routing, timing, and recovery; EXCLUSIVE data path must not be
    generalized to all MMAP behavior.
  - Power-saving offload and low-latency MMAP are separate goals. Offload is
    for long playback power reduction, not low-latency interaction.
  - Perfetto evidence includes `audio` atrace, AudioFlinger/FAST Mixer thread
    scheduling, app-side `AudioTrack` writes/callbacks, underrun-like slices,
    CPU frequency/idle, and `dumpsys audio` correlation.
  - Android 17 background audio hardening is primarily lifecycle/API gating, not
    AudioFlinger freezing. Trace often shows app write/callback stopping before
    track inactive/teardown.
- SmartPerfetto impact:
  - No immediate direct target unless current scene routing supports audio
    traces, but it is useful future material for capture presets and data-gap
    guidance.
  - For existing jank/startup reports, it can prevent misclassifying audio
    callback/thread scheduling as generic CPU or Binder delay when audio tracks
    are visible in trace.
- Candidate target:
  - Future audio strategy/Skill set, capture guidance, and possible generic
    thread-scheduling/data-gap wording.
- Status: read, medium-value future candidate.

### 026. `part1-fundamentals/ch01-architecture/17-ipc-panorama.md`

- Type: Android IPC taxonomy, Binder/socket/shared-memory/FM Q/control-plane
  vs data-plane analysis.
- Useful information:
  - Android IPC should be modeled as control plane plus data plane. Binder or
    HwBinder often negotiates permissions, lifecycle, metadata, and fd
    transfer, while CursorWindow, GraphicBuffer, SharedMemory, dmabuf, FMQ, or
    socket carries high-throughput data.
  - Binder transaction buffer is process-level and shared by concurrent
    transactions; the rough 1 MB limit is reduced by page-size-dependent guard
    pages. Large payload issues are not only single-call size problems.
  - InputDispatcher uses `InputChannel` backed by socketpair; the channel fd is
    delivered through Binder, but event data moves through the socket.
  - Modern Looper wakeup in the covered Android versions uses `eventfd + epoll`,
    not a pipe.
  - SharedMemory/MemoryFile/CursorWindow, dmabuf/GraphicBuffer, and FMQ are
    separate routes, not one replacement chain. Android 12 memfd transition
    applies to anonymous shared memory compatibility, not dmabuf graphics.
  - HAL control calls can use HIDL `/dev/hwbinder` or Stable AIDL `/dev/binder`;
    trace analysis must distinguish the binder domain instead of assuming all
    HAL calls are hwbinder.
  - AVF uses RpcBinder over AF_VSOCK in host/VM scenarios, so VM traces need a
    vsock lens rather than ordinary binder-driver attribution.
- SmartPerfetto impact:
  - High-value cross-cutting strategy input for Binder, ContentProvider,
    graphics/buffer, startup, and ANR reports. It helps prevent "Binder did
    everything" over-attribution when Binder only passed a fd or control call.
  - Existing Binder/ContentProvider Skills should be audited for large-payload,
    fd-transfer, CursorWindow, socket, and shared-memory distinctions.
- Candidate target:
  - `backend/strategies/anr.strategy.md`,
    `backend/strategies/startup.strategy.md`,
    `backend/strategies/scrolling.strategy.md`, Binder/ContentProvider/shared
    memory evidence Skills after inventory.
- Status: read, high-value candidate.

### 027. `part1-fundamentals/ch01-architecture/18-binder-freezer-cached-process.md`

- Type: Cached app freezer, cgroup v2 freezer, Binder freezer, process exit
  attribution, and Perfetto/log observability.
- Useful information:
  - Cached app freezer is distinct from LMK, Doze, and foreground-service
    restrictions. It stops cached process CPU scheduling while preserving
    process state and memory; it is not a memory reclamation mechanism.
  - Freeze eligibility flows from oom_adj/cached state plus capability and
    exemption checks; `CachedAppOptimizer` performs actual Binder/process
    freezing and uses debounce to avoid immediate churn.
  - Binder freezer is the key cross-process boundary: synchronous transactions
    to frozen targets can return frozen reply and lead to target kill, while
    oneway transactions can queue until unfreeze and may overflow async buffer.
  - `ApplicationExitInfo.REASON_FREEZER` and freezer subreasons must not be
    merged with OOM, ANR, or user kill. API/version visibility matters.
  - Perfetto/log evidence includes ActivityManager `Freezer` track, `Freeze` /
    `Unfreeze` / `Reschedule freeze` events, `am_freeze` / `am_unfreeze`,
    sched inactivity for frozen process threads, Binder latency, and
    `dumpsys activity processes` / exit-info.
  - Frozen cached process diagnosis should include whether sender continued
    synchronous Binder calls, whether oneway callbacks stormed, and whether
    freeze/unfreeze churn aligned with outstanding Binder transactions.
- SmartPerfetto impact:
  - Very useful for process-state/Binder/ANR reports. It can prevent wrong
    conclusions such as "background app randomly killed", "LMK killed it", or
    "remote service ANR" when the actual evidence is freezer/Binder interaction.
  - Candidate for device-state or Binder Skill expansion if traces contain
    Freezer track/EventLog and Binder transaction timing.
- Candidate target:
  - `backend/strategies/anr.strategy.md`, possible memory/process-state
    strategy surfaces, Binder/device-state Skills, and capture/data-gap
    guidance for exit-info/events logs.
- Status: read, high-value candidate.

### 028. `part1-fundamentals/ch01-architecture/19-zygote-graphics-driver-preload.md`

- Type: Zygote graphics HAL/driver preload, GraphicsEnvironment driver
  selection, and first-frame startup attribution.
- Useful information:
  - Zygote graphics preload is not per-app context creation. It preloads common
    graphics HAL/driver entry points before fork to reduce first-use cold costs,
    while app-specific driver selection still happens inside the app process.
  - `ZygoteInit.preload()` exposes two boot-stage anchors:
    `PreloadAppProcessHALs` for graphics mapper/gralloc mapper preload and
    `PreloadGraphicsDriver` for GPU driver preload.
  - App process graphics setup exposes `setupGpuLayers`, `setupAngle`, and
    `chooseDriver` slices. These belong to app startup and can affect first
    frame even if zygote preload completed.
  - Startup trace analysis should split four segments: zygote preload, app
    driver selection, first EGL/Vulkan call, and first buffer submission /
    SurfaceFlinger/HWC/fence composition.
  - `ro.zygote.disable_gl_preload` is an OEM fallback for driver compatibility
    issues; disabling it on one device does not imply a platform-wide
    recommendation.
  - Updatable driver, ANGLE, system driver, driver package, `sphal_libraries`,
    SELinux/vendor load failures, and GraphicsEnvironment logs are all part of
    app-specific evidence.
- SmartPerfetto impact:
  - High-value startup strategy input. It helps separate system boot/zygote
    preload cost from app startup driver-selection cost and later RenderThread
    or SurfaceFlinger first-frame bottlenecks.
  - Candidate for startup Skill audit if current evidence collection can
    surface these named trace slices and graphics-related startup intervals.
- Candidate target:
  - `backend/strategies/startup.strategy.md`, startup evidence Skills, and
    graphics/first-frame trace regression expectations after inventory.
- Status: read, high-value candidate.

### 029. `part1-fundamentals/ch01-architecture/20-app-archiving-performance.md`

- Type: Android App Archiving, PackageArchiver, ActivityStarter restore path,
  storage recovery, install, dexopt, and first-launch performance.
- Useful information:
  - App Archiving is a storage/package-state mechanism, not LMK or memory
    reclaim. It removes APK/splits/cache, keeps user data, preserves launcher
    restore state, and delegates recovery to the responsible installer.
  - `requestArchive()` requires installer/permission/state checks; not every
    app with delete permission can archive any package. System apps, opt-out
    packages, missing installer, or missing launcher entry can block archiving.
  - Launcher click on archived entry enters `ActivityStarter`, sees
    `START_CLASS_NOT_FOUND`, then only converts to unarchive if
    `PackageArchiver` confirms the intent matches an archived original
    component.
  - Restore performance must be split into framework classification, installer
    confirmation, network/package retrieval, PackageInstaller session,
    compile/profile handling, and restored app cold start. Unarchive accepted
    does not equal first frame ready.
  - Suggested metrics: `T_restore_accepted` and
    `T_first_frame_after_restore`. Trace/log correlation should include
    system_server, installer process, PackageInstaller/PMS, target process, and
    first-frame evidence.
- SmartPerfetto impact:
  - Mostly a startup/install-trace caveat. It helps avoid blaming
    `PackageArchiver` for user-visible restore delay when the evidence points
    to installer download, PackageInstaller, dexopt, or restored app cold start.
  - Direct Skill value depends on whether SmartPerfetto targets install/restore
    traces; otherwise keep as startup data-gap guidance.
- Candidate target:
  - `backend/strategies/startup.strategy.md`, potential install/restore
    capture guidance, and ART/PMS evidence audit.
- Status: read, medium-value candidate.

### 030. `part1-fundamentals/ch01-architecture/21-developer-verification-install-boundary.md`

- Type: Android Developer Verification, PackageInstaller callbacks, install
  failure attribution, SDM/dexopt boundary, and release/distribution telemetry.
- Useful information:
  - Developer Verification is an installation policy layer for developer
    identity and package-name registration. It does not replace APK signature
    validation, installer permission checks, user authorization, dexopt, SDM
    verification, or device policy.
  - `Session.commit()` success means the session was committed/sealed, not that
    all install policy checks passed. Installers must handle
    `STATUS_PENDING_USER_ACTION`, `STATUS_FAILURE_ABORTED`,
    `STATUS_FAILURE_BLOCKED`, `STATUS_FAILURE_INVALID`, and related extras.
  - Developer Verification failures should be attributed only when
    `EXTRA_DEVELOPER_VERIFICATION_FAILURE_REASON` or matching logs indicate
    that path. `STATUS_FAILURE_BLOCKED` alone can also mean device policy,
    package verifier, system package protection, or installer permissions.
  - Install latency should be split into package retrieval, session write,
    commit-to-first-callback, pending user action, Developer Verification,
    package/ART processing, and final callback.
  - SDM signature failure is closer to invalid APK / ART metadata failure, not
    Developer Verification. `.sdm`, `.dm`, profile, dexopt, and ART status
    should remain separate telemetry dimensions.
  - Timeline/region/policy details are volatile and must be rechecked against
    official sources before encoding as durable SmartPerfetto behavior.
- SmartPerfetto impact:
  - Limited direct value unless analyzing install traces or package install
    failures. It is useful as data-gap/report caveat material for "install
    slow" and "install failed" scenarios.
  - Do not bake policy timelines into runtime code. If ever used, route through
    documentation/capture guidance with source verification.
- Candidate target:
  - Potential future install strategy, `backend/strategies/startup.strategy.md`
    caveats around install-to-first-launch, and release/install telemetry docs.
- Status: read, low/medium-value candidate with official-verification
  requirement.

### 031. `part1-fundamentals/ch01-architecture/22-art-verifier-quickening-dexopt-filters.md`

- Type: ART verifier, VDEX/ODEX/ART files, dex2oat compiler filters,
  quickening, ART Service, class-loader context, and startup/install
  performance evidence.
- Useful information:
  - Verifier output is safety/validation metadata, not machine code. VDEX,
    ODEX, and ART files answer different questions; presence of cache files
    does not prove startup hot paths are AOT compiled.
  - Compiler filters are strategies, not a linear "higher is always better"
    optimization ladder. `verify`, `quicken`, `speed-profile`, and `speed`
    trade install/boot cost, storage, profile coverage, and runtime behavior.
  - `quicken` is mainly an Android 8-11 interpreter optimization boundary; AOSP
    main no longer has `kQuicken`, so Android 12+ analysis should focus on
    `verify`, `speed-profile`, `speed`, ART Service, profiles, and dexopt
    reasons.
  - Android 14+ ART Service defaults are conservative for boot/OTA/mainline
    paths (`verify`) and use `speed-profile` mainly in background dexopt. First
    launch after install/OTA can still be slow while background dexopt has not
    run.
  - VDEX reuse requires checksum, bootclasspath, class-loader context, and
    dependency compatibility. `<uses-library>` mismatch can reject build-time
    preopt artifacts and force device-side dexopt or unoptimized execution.
  - Evidence collection: `getprop pm.dexopt/dalvik.vm.*`, `cmd package art
    dump`, `dumpsys package dexopt`, `pm compile -m speed-profile -f`,
    `pm bg-dexopt-job`, ART/dex2oat logs, `artd`/`dex2oat` processes, and
    `art::jit::*` in startup traces.
- SmartPerfetto impact:
  - High-value startup strategy input. It provides a clear diagnostic path for
    install-fast-but-first-launch-slow, OTA-after-first-launch-slow,
    profile-missing, profile-present-but-not-compiled, and CLC mismatch cases.
  - Potential Skill value if current startup Skills can surface ART/JIT slices,
    `dex2oat`/`artd` processes, package compile status from external artifacts,
    or data-gap recommendations.
- Candidate target:
  - `backend/strategies/startup.strategy.md`,
    `backend/strategies/memory.strategy.md`, ART/startup evidence Skills, and
    capture guidance for package ART status.
- Status: read, high-value candidate.

### 032. `part1-fundamentals/ch01-architecture/README.md`

- Type: Chapter overview and reading guide.
- Useful information:
  - Reinforces the chapter taxonomy: app/framework/native/HAL/kernel layering,
    Binder, Zygote, ART, PMS, AMS, MessageQueue, locks, JNI, audio, and IPC as
    shared architecture anchors.
  - The README lists Android 15/16/17 changes such as 16 KB page size, ADPF,
    Cloud Compilation, parallel module loading, DeliQueue, ProfilingManager,
    sched_ext, ART CMC, and Energy Limiter, but several are explicitly scoped
    by maturity or verification caveats.
- SmartPerfetto impact:
  - No direct implementation change; useful as a taxonomy check that the
    reading record is covering architecture surfaces likely to map to current
    SmartPerfetto scenes.
- Candidate target:
  - Synthesis index only.
- Status: read, low-value index material.

### 033. `part1-fundamentals/ch01-architecture/ch01-architecture.md`

- Type: Raw/reference intake list.
- Useful information:
  - Contains short external article intake snippets for Android 17, Android AI
    development benchmarks, and unrelated architecture material. It is not a
    coherent technical chapter.
- SmartPerfetto impact:
  - No reliable implementation value. Treat as noisy source inventory only.
- Candidate target:
  - None.
- Status: read, no-action material.

### 034. `part1-fundamentals/ch02-rendering/01-rendering-overview.md`

- Type: Android rendering architecture overview: View traversal, HWUI,
  RenderThread, BufferQueue/fence, SurfaceFlinger, HWC, RenderEngine, and
  Perfetto mapping.
- Useful information:
  - Rendering reports should split the pipeline into main-thread
    Measure/Layout/Draw, DisplayList/RenderNode sync, RenderThread GPU command
    issue, BufferQueue queue/acquire/release, SurfaceFlinger
    commit/composite/present, HWC/display, and GPU activity.
  - `invalidate()` and `requestLayout()` have different cost surfaces:
    invalidate records visual changes; requestLayout can force the full
    Measure/Layout/Draw path.
  - Modern VSync references should use SurfaceFlinger Scheduler /
    `VSyncPredictor` / `VSyncDispatchTimerQueue` / `VsyncSchedule` on Android
    12+ and especially Android 14-16. Older DispSync names are historical.
  - BufferQueue analysis must include slot availability and fence timing:
    producer-side `dequeueBuffer` waits, `queueBuffer`, SF acquire/latch, acquire
    fence, present fence, and release fence.
  - HWC is not a BufferQueue consumer. SurfaceFlinger consumes buffers, then HWC
    participates in composition through validate/accept/present.
  - RenderNode has staging/current separation; UI thread records into staging
    DisplayList, then RenderThread consumes synchronized current DisplayList.
  - App RenderThread/HWUI and SurfaceFlinger RenderEngine are different GPU
    users: the former renders one app buffer, the latter composes layers when
    HWC cannot.
  - The article metadata says this chapter still had a Task9 version-boundary
    rework item around RenderNode/RenderThread history, so version-history
    statements should be checked before encoding.
- SmartPerfetto impact:
  - Very high-value for scrolling/jank strategies and rendering Skill audit.
    It gives a clean evidence taxonomy for avoiding generic "main thread slow"
    or "GPU slow" conclusions.
  - Startup first-frame reports can also use the stage split when first-frame
    latency comes from driver selection, RenderThread, BufferQueue, SF, HWC, or
    fence waits.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`,
    `backend/strategies/startup.strategy.md`,
    `backend/skills/atomic/render_thread_slices.skill.yaml`,
    FrameTimeline/SurfaceFlinger/BufferQueue/fence evidence Skills after
    inventory.
- Status: read, very high-value candidate with version-history caveat.

### 035. `part1-fundamentals/ch02-rendering/02-framerate.md`

- Type: Frame rate, refresh rate, FrameTimeline, FrameMetrics, ARR/VRR,
  RefreshRateSelector, frame pacing, and jank measurement.
- Useful information:
  - FPS is insufficient for smoothness. Frame time and frame-interval
    consistency are closer to user perception.
  - `Choreographer#doFrame` duration only covers main-thread frame callback
    work. Full frame duration and presentation/jank classification should use
    FrameTimeline / FrameMetrics fields such as total duration, deadline,
    GPU duration, and jank type.
  - High refresh rate changes the budget: 120 Hz means 8.3 ms per frame. A page
    that is fine at 60 Hz can be constantly late at 120 Hz.
  - SurfaceFlinger refresh-rate choice is a policy/ranking problem over layer
    votes, content detection, touch, DisplayManager policy, battery saver,
    thermal, seamless switch, and ARR. `setFrameRate()` and
    `View.setRequestedFrameRate()` are hints, not commands.
  - Android 15+ View/Window hints, Android 14+ frame-rate override, Android 15+
    ARR, and Android 16 APIs such as ARR suggestions require version-aware
    wording.
  - FrameTimeline colors/categories and jank types should guide attribution:
    app-side jank, system-side jank, dropped frame, and high-latency frame are
    not interchangeable.
  - OEM VSync modifications can create regular long/short callback intervals;
    such claims need trace evidence and should be caveated.
- SmartPerfetto impact:
  - Directly valuable for scrolling reports and any trace regression that
    classifies jank. It sharpens metric selection: use FrameTimeline for actual
    frame results, not only `doFrame` intervals.
  - Candidate for strategy text that explains refresh-rate budget and avoids
    misattributing jank under ARR/high-refresh displays.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`,
    FrameTimeline/jank classification Skills, refresh-rate/data-gap guidance,
    and trace regression expectations.
- Status: read, high-value candidate.

### 036. `part1-fundamentals/ch02-rendering/03-vsync.md`

- Type: VSync architecture, SurfaceFlinger Scheduler, VSyncPredictor/Reactor,
  phase offset, EventThread/BitTube/Choreographer, ARR, and Perfetto
  observability.
- Useful information:
  - Modern Android VSync should be described as hardware VSync/present-fence
    samples feeding `VSyncReactor`/`VSyncPredictor`, then
    `VSyncDispatchTimerQueue` delivering app, appSf, and SF callbacks.
  - App path: `VsyncSchedule`/dispatch -> app EventThread -> BitTube ->
    `DisplayEventReceiver` -> `Choreographer#doFrame`. It is demand-driven:
    an idle app without scheduled frames does not continuously receive app
    VSync.
  - SurfaceFlinger path: dispatch queue -> SF MessageQueue -> SF composition
    message. Android 13+ separates `vsync-appSf` from `vsync-sf`.
  - Phase offset / work-duration configuration is a latency/correctness tradeoff.
    Bad offsets can make App/SF miss each other and increase latency.
  - Perfetto observations: stable `VSYNC-app`/`VSYNC-sf` intervals, phase
    distance, occasional HW_VSYNC sampling during model correction, frequent
    HW_VSYNC as possible model/driver instability, and SF delayed response.
  - ARR and refresh-rate changes can temporarily switch phase configuration and
    alter VSync period; analysis must not assume a fixed 16.6 ms budget.
  - Android 17 MessageQueue changes affect app-side queueing after VSync
    delivery, not VSync generation itself.
  - VSyncPredictor uses sample validation and regression-style prediction;
    rejected/outlier samples and re-learning explain temporary hardware sampling
    behavior.
- SmartPerfetto impact:
  - Very high-value for scrolling/jank strategy and rendering evidence Skills.
    It separates VSync delivery, main-thread scheduling, RenderThread work, SF
    composition, and display/fence delay.
  - Useful for data-gap advice: when VSync tracks, refresh-rate tracks, or
    FrameTimeline are absent, conclusions about pacing and phase should be
    weaker.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, FrameTimeline/VSync/refresh-rate
    evidence Skills, and trace regression expected reasoning.
- Status: read, very high-value candidate.

### 037. `part1-fundamentals/ch02-rendering/04-choreographer.md`

- Type: Choreographer frame scheduling, callback ordering, FrameTimeline,
  FrameMetrics, Compose frame clocks, and Perfetto attribution.
- Useful information:
  - Choreographer callback order is INPUT -> ANIMATION -> INSETS_ANIMATION ->
    TRAVERSAL -> COMMIT. `ViewRootImpl.scheduleTraversals()` uses a sync
    barrier before posting traversal work.
  - Modern `Choreographer#doFrame` slices carry a VSync id in their name. That
    id can connect app main-thread callbacks, RenderThread `DrawFrame`,
    SurfaceFlinger, and FrameTimeline rows.
  - `FrameCallback` only gives callback timing and jitter. FrameTimeline and
    FrameMetrics are needed for GPU duration, deadline misses, present delay,
    and user-visible jank classification.
  - `actual_frame_timeline_slice` / `expected_frame_timeline_slice` and
    jank/present types such as `AppDeadlineMissed`, `BufferStuffing`,
    `SfCpuDeadlineMissed`, `SfGpuDeadlineMissed`, on-time, and late present are
    better attribution anchors than raw `doFrame` duration.
  - Compose still runs under Choreographer traversal, but Compose slices and
    `AndroidUiDispatcher` / frame-clock behavior need separate interpretation.
    Compose 1.10 PausableComposition and Android 16 buffer-stuffing details are
    promising but should be verified against current official/source evidence
    before becoming durable rules.
  - A long `doFrame` is a strong app-side signal but not final proof of a
    user-visible delayed present; FrameTimeline should confirm the display
    result.
- SmartPerfetto impact:
  - Very high-value for scrolling/jank strategy and FrameTimeline Skills. It
    sharpens the separation between scheduling callbacks, app work, GPU work,
    SF/HWC work, and actual presentation.
  - Useful for data-gap wording: when FrameTimeline or VSync-id joins are
    absent, SmartPerfetto should downgrade confidence rather than overclaim
    from `doFrame` slices alone.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, FrameTimeline/jank evidence
    Skills, Compose-specific caveats after inventory, and trace regression
    expected reasoning.
- Status: read, very high-value candidate with Compose/version caveats.

### 038. `part1-fundamentals/ch02-rendering/05-main-render-thread.md`

- Type: Main-thread traversal, RenderThread synchronization, HWUI,
  BufferQueue/fence waits, texture upload, and RenderNode behavior.
- Useful information:
  - Main thread records or updates the display list; RenderThread synchronizes
    state, prepares the tree, draws, submits GPU work, and queues the buffer.
  - `syncFrameState` means UI-to-RenderThread state synchronization and
    `prepareTree` work. It should not be treated as proof that the previous GPU
    frame has not finished.
  - GPU and BufferQueue backpressure often appears later in `CanvasContext`
    draw/dequeue/submit paths. `queueBuffer` being quick does not prove the GPU
    is done; release-fence waits can block a later `dequeueBuffer`.
  - Texture upload can be a critical-path source: repeated "Upload WxH Texture"
    or `buildLayer` work during scrolling/animation points to bitmap/layer
    churn, while idle preupload or hardware bitmaps change the interpretation.
  - One process can share a RenderThread across multiple windows, so per-window
    jank attribution should account for shared RenderThread contention.
  - BLAST should be treated as an Android 11+ main-window path. Article claims
    around DeliQueue, future ADPF behavior, and device/vendor specifics need
    source verification before implementation.
- SmartPerfetto impact:
  - Very high-value for scrolling/startup attribution. It prevents common
    mistakes such as equating `syncFrameState` with GPU completion or blaming
    app code when display/fence backpressure is the real issue.
  - Strong input for deterministic evidence around RenderThread slices, texture
    upload, `dequeueBuffer`, fence waits, and first-frame latency.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`,
    `backend/strategies/startup.strategy.md`,
    RenderThread/bitmap-upload/BufferQueue/fence Skills after inventory, and
    trace regression assertions.
- Status: read, very high-value candidate with future-version caveats.

### 039. `part1-fundamentals/ch02-rendering/06-surfaceflinger.md`

- Type: SurfaceFlinger composition, Scheduler/VSync, BufferQueue, HWC,
  BLAST, Layer/z-order, and display-side jank attribution.
- Useful information:
  - Android version matters for naming: Android 12-era SF traces often show
    INVALIDATE/REFRESH-style paths, while Android 13+ should be interpreted
    through `commit()` / `composite()` and Android 14+ scheduler frame signals.
  - `queueBuffer()` only proves producer submission. SurfaceFlinger still needs
    to acquire, latch, commit, composite, submit to HWC/RenderEngine, and wait
    for present/release fences.
  - Display-side jank can occur even when the app produced frames on time. Long
    SF commit/composite work, HWC present delay, or late release fences can
    delay actual presentation and later cause app `dequeueBuffer()` blocking.
  - Layer count, z-order, visible-region work, Client-vs-Device composition,
    GPU contention, and transaction storms are distinct root-cause classes.
  - BLAST combines BufferQueue submission with same-frame
    `SurfaceControl.Transaction` state. Resize/rotation/relayout analysis
    should check buffer frame number, geometry transaction, and VSync id
    alignment.
  - `dumpsys SurfaceFlinger` is useful for snapshots of layer tree, composition
    type, buffer state, and refresh-rate configuration; Perfetto remains the
    source for timing, fences, present delay, and transaction storms.
  - The article includes vendor/deep-research overlay-plane details. Those are
    useful hypotheses but should be treated as device-specific unless verified
    against current device/source evidence.
- SmartPerfetto impact:
  - Very high-value for scrolling/jank strategy and evidence Skills. It gives a
    causal chain for app-ready but display-late frames, SF global jank, HWC
    fallback, BLAST geometry/content sync, and BufferQueue backpressure.
  - Useful for improving report language so SmartPerfetto can distinguish app
    deadline misses from display/SF/HWC misses instead of collapsing everything
    into "app rendering slow."
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, SurfaceFlinger/FrameTimeline/
    BufferQueue/HWC evidence Skills, data-gap recommendations for
    `dumpsys SurfaceFlinger`, and trace regression expected reasoning.
- Status: read, very high-value candidate with vendor-specific caveat.

### 040. `part1-fundamentals/ch02-rendering/07-hardware-layer.md`

- Type: View hardware/software layers, RenderNode compositing layer,
  Compose `graphicsLayer`, RenderEffect, and layer-cache diagnostics.
- Useful information:
  - Hardware acceleration and Hardware Layer are different concepts. A Hardware
    Layer caches a View subtree or RenderNode output as an offscreen GPU layer;
    it does not by itself remove measure/layout work.
  - Caching helps when content is stable and only transform/alpha-like
    properties change. If content changes every frame, `buildLayer` or
    `buildDrawingCache` repeats and the layer can make jank worse.
  - `buildDrawingCache` on the main thread points to Software Layer work;
    `buildLayer` on RenderThread points to Hardware Layer rebuilds.
  - Modern HWUI automatically promotes some RenderNodes to composition layers
    for cases like functor isolation, image filters, stretch effect, and
    alpha-plus-overlap with size constraints. Manual `setLayerType` should be
    justified by trace evidence, not used as blanket advice.
  - Compose `graphicsLayer` is a draw-layer/compositing abstraction. It does
    not always mean offscreen rasterization; `CompositingStrategy`, alpha,
    RenderEffect, and content invalidation decide the cost.
  - View-level Hardware Layer is not the same as a SurfaceFlinger window Layer.
    The former is composed into the app buffer before SF/HWC sees the window.
- SmartPerfetto impact:
  - High-value for scrolling strategy wording and potential render-layer
    evidence Skills. It can help reports identify layer-cache miss patterns
    without recommending obsolete or harmful blanket `setLayerType` fixes.
  - Useful for Compose and RenderEffect caveats if trace evidence exposes
    `buildLayer`, offscreen effects, or graphics-layer churn.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, RenderThread slice evidence
    Skills, potential runtime docs for layer-cache diagnostics, and trace
    regression expected reasoning.
- Status: read, high-value candidate.

### 041. `part1-fundamentals/ch02-rendering/08-overdraw.md`

- Type: GPU overdraw, fill-rate pressure, toolchain workflow, Canvas clipping,
  Compose drawing caveats, and historical-tool cleanup.
- Useful information:
  - Perfetto does not directly say "3x overdraw." A practical workflow is:
    Debug GPU Overdraw to localize visual regions, Profile GPU Rendering to
    check frame-budget pressure, Perfetto/FrameTimeline to confirm whether it
    becomes visible jank, and AGI for draw-call/counter-level proof.
  - GPU counters can sometimes estimate pixel/fragment pressure, but counter
    names and semantics are driver-specific. There is no portable
    `pixels_drawn` counter that SmartPerfetto can assume.
  - TBR/TBDR mobile GPUs make the cost model non-linear: overdraw does not
    always equal proportional external-memory writes, but fragment shading,
    texture sampling, alpha blending, tile memory pressure, and tile spills can
    still make it a serious bottleneck.
  - Current tools should be Layout Inspector, Debug GPU Overdraw, Profile GPU
    Rendering, Perfetto, and AGI. Hierarchy Viewer, Tracer for OpenGL ES, and
    Android Device Monitor are historical references rather than current
    recommendations.
  - Common causes and fixes: redundant Window/root/item backgrounds, selector
    normal-state backgrounds, semi-transparent overlays, layout depth, and
    custom View work that should use `clipRect()` / `quickReject()` carefully.
  - Compose overdraw is not the same as recomposition. Multiple backgrounds,
    `graphicsLayer` alpha/effects, and offscreen compositing can increase
    pixel work, while `drawWithCache` or `derivedStateOf` may reduce CPU work
    without reducing overdraw.
- SmartPerfetto impact:
  - High-value for scrolling strategy and data-gap wording. SmartPerfetto
    should avoid claiming exact overdraw from a trace alone unless GPU counters
    or external visual/AGI evidence support it.
  - Useful for recommending next capture steps when RenderThread/GPU evidence
    suggests fill-rate pressure but Perfetto lacks pixel-level counters.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, GPU/fill-rate data-gap guidance,
    potential docs referenced from Skills, and trace regression expected
    language around "suspected overdraw" vs "proven overdraw."
- Status: read, high-value candidate with counter-portability caveat.

### 042. `part1-fundamentals/ch02-rendering/09-rendering-evolution.md`

- Type: Android rendering version timeline: HWUI, Choreographer, RenderThread,
  SkiaGL/Vulkan, BLAST, FrameMetrics, FrameTimeline, ARR, and AGSL.
- Useful information:
  - Version is part of the evidence model. Android 4.x traces do not have
    RenderThread; Android 5+ separates UI thread and RenderThread; Android 11+
    main-window paths can involve BLAST; Android 12+ adds FrameTimeline; Android
    13+ separates `vsync-appSf`; Android 15+ ARR changes VSync interval
    assumptions.
  - FrameTimeline terms are useful for report precision: `SurfaceFrame`,
    `DisplayFrame`, token/vsyncId prediction windows, present states, and
    jank-type bitmask values distinguish app deadline misses, SF scheduling,
    display HAL, SF CPU/GPU, buffer stuffing, unknown, SF stuffing, and dropped
    frames.
  - FrameMetrics is app/window-scoped. It cannot prove SurfaceFlinger/HWC system
    delays by itself; Perfetto and FrameTimeline are needed for system-level
    attribution.
  - BLAST should be treated as Android 11+ main-window migration, with Android
    12 improving FrameTimeline/VSyncId/window-sync observability rather than
    being the initial BLAST introduction.
  - ARR means irregular `VSYNC-app` periods may be normal. Frame budget must be
    derived from the active refresh/content rate instead of a fixed 16.67 ms.
  - Some Android 16/Vulkan/ANGLE and release-date claims should be checked
    against official sources before becoming durable SmartPerfetto rules.
- SmartPerfetto impact:
  - Very high-value for version-aware strategy text and trace interpretation.
    It reduces false positives caused by applying modern rendering assumptions
    to old traces or fixed-refresh assumptions to ARR devices.
  - Useful for shared report language around FrameTimeline jank categories and
    BLAST/FrameMetrics boundaries.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`,
    `backend/strategies/startup.strategy.md`, version-gated evidence docs, and
    trace regression expectations for high-refresh/ARR/BLAST traces.
- Status: read, very high-value candidate with official-source verification
  required before encoding newer Android-version claims.

### 043. `part1-fundamentals/ch02-rendering/10-gpu-rendering.md`

- Type: GPU rendering pipeline, shader compilation, Vulkan/OpenGL/ANGLE,
  bottleneck taxonomy, GPU memory/Gralloc/BufferQueue, counters, and GPU tools.
- Useful information:
  - GPU bottlenecks should be classified before optimizing: fill-rate/fragment,
    vertex/geometry, bandwidth, CPU-GPU backpressure, and shader/pipeline
    compilation have different evidence and fixes.
  - Perfetto can show GPU tracks, RenderThread wait/backpressure, SF timing,
    VSync boundaries, some GPU counters, and sometimes render stages. AGI or
    vendor tools are needed for draw-call, shader, and richer counter analysis.
  - `gpu_render_stages` and GPU counters are device/driver dependent. If tracks
    are absent or coarse, SmartPerfetto should surface a data gap instead of
    pretending to know fragment/vertex percentages.
  - BufferQueue/GraphicBuffer/Gralloc memory is not Java heap. Hardware Bitmaps,
    surfaces, dmabuf/GraphicBuffer mappings, and BufferQueue slot accumulation
    need graphics-memory specific evidence such as `gpu_memory`,
    `dumpsys meminfo`, `dumpsys SurfaceFlinger`, or vendor tooling.
  - Backpressure chain: slow GPU/SF/HWC release can leave no free BufferQueue
    slots, causing later `dequeueBuffer` waits. This is separate from main
    thread traversal work and should be attributed through fences/slots/timing.
  - Shader compilation jank often appears as an isolated long Raster/GPU frame
    after a new effect/page/animation, but exact behavior depends on Skia,
    Vulkan, ANGLE, driver, and cache state.
  - The article itself is marked `needs-rework`; claims about Android 16
    standard `gpu_busy`, Vulkan/ANGLE defaults, Host Image Copy, Gralloc
    suballocation, and benchmark numbers should be treated as hypotheses until
    official/current evidence is checked.
- SmartPerfetto impact:
  - Very high-value for scrolling/jank strategy, GPU data-gap handling, and
    future Skills that extract GPU tracks/counters, RenderThread waits,
    BufferQueue stalls, and graphics-memory evidence.
  - Useful for avoiding generic "GPU slow" conclusions: reports should explain
    whether evidence points to fragment/fill-rate, bandwidth, shader compile,
    backpressure, SF/GPU composition contention, or insufficient counters.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, possible GPU/counter/
    BufferQueue/memory Skills after inventory, data-gap recommendations for AGI
    or `dumpsys`, and trace regression expected language.
- Status: read, very high-value candidate, but implementation must verify
  rework-marked claims first.

### 044. `part1-fundamentals/ch02-rendering/11-flutter-rendering.md`

- Type: Flutter rendering architecture, Android embedder, thread model,
  PlatformView, DevTools/Perfetto workflow, Impeller, and Flutter-specific
  jank patterns.
- Useful information:
  - Flutter self-rendered UI uses Android Choreographer for VSync but does not
    use the native ViewRootImpl traversal/HWUI RenderThread path for widgets.
    It still submits to an Android Surface/BufferQueue and SurfaceFlinger still
    composes the final layer.
  - Flutter 3.29+ mainline thread model is Main(UI+Platform) / Raster / IO.
    Flutter 3.28- or custom embedders may still show Platform / UI / Raster /
    IO. Trace logic must search for `io.flutter`, `flutter`, `BeginFrame`,
    `DrawFrame`, and `GPURasterizer::DrawToSurface`, not only `1.ui`.
  - Flutter jank branches differ: Main/UI-side Build/Layout/Paint, Dart CPU,
    plugin/Platform Channel work, PlatformView layout/sync, Raster
    shader/pipeline/texture upload, IO image decode/resource preparation, or
    system/SF/GPU composition.
  - PlatformView has multiple paths: Virtual Display, Hybrid Composition /
    PlatformViewLayer, and TextureLayer Hybrid Composition. Costs can appear on
    Main(UI+Platform), Raster, render-target resize/acquire, fence waits, and
    SurfaceFlinger transaction/composition.
  - Impeller reduces a class of runtime shader compilation jank but does not
    remove Widget rebuild, PlatformView, texture upload, or system-level
    bottlenecks. Use `--no-enable-impeller` A/B only as a diagnostic.
  - Flutter performance must be measured in Profile/Release mode. Debug-mode
    data is not representative.
  - ADPF/PerformanceHint claims are explicitly marked not supported by current
    Flutter engine source; treat future ADPF linkage as a caveat.
- SmartPerfetto impact:
  - Very high-value for scene routing and scrolling strategy. SmartPerfetto
    should recognize Flutter traces and avoid interpreting missing
    ViewRootImpl/RenderThread slices as missing data for Flutter self-rendered
    UI.
  - Candidate for a Flutter-specific branch in scrolling/jank analysis that
    inspects Main(UI+Platform), Raster, IO, PlatformView, SurfaceFlinger, and
    FrameTimeline evidence separately.
- Candidate target:
  - Scene classifier/routing inventory, `backend/strategies/scrolling.strategy.md`,
    possible Flutter evidence Skill(s), and trace regression using a Flutter
    trace if the repo has one or if a fixture can be added.
- Status: read, very high-value candidate for Flutter-specific trace handling.

### 045. `part1-fundamentals/ch02-rendering/12-window-manager.md`

- Type: WindowManagerService, relayout, StartingWindow, Shell transitions,
  multi-window/desktop resize, Insets, and WMS/Input/SF coordination.
- Useful information:
  - WMS performance should be read as a multi-threaded system_server problem:
    Binder threads, DisplayThread, UiThread/policy, AnimationThread, Shell, and
    `mGlobalLock` can all contribute. It is not simply "WMS main thread slow."
  - Window, SurfaceControl, app `Surface`, SurfaceFlinger layer, and
    BLASTBufferQueue are separate boundaries. WMS manages window metadata and
    `SurfaceControl`; app code draws into `Surface`; SurfaceFlinger composes.
  - StartingWindow on Android 12+ is split across ATMS/WMS starting-surface
    decisions, WM Shell creation/drawing, app `reportDrawFinished`, Shell
    removal, and SF transaction/present. `reportDrawFinished` alone does not
    mean the user has seen the real app content.
  - `performTraversals()` does not always call WMS. Sync `relayout()` happens
    on first display, resize, Insets changes, visibility/new surface, params,
    or forced relayout. `invalidate()` and many `requestLayout()` cases remain
    app-local.
  - `relayoutAsync()` only applies to narrow property-change cases and still
    does WMS work server-side. The app's current traversal just avoids waiting
    for returned frames/Insets/SurfaceControl.
  - Modern window animation should be read through TransitionController,
    Transition, WM Shell/remote transitions, leash transactions, and
    SurfaceFlinger, not only legacy `AppTransition` or `android.anim`.
  - Desktop windowing, foldables, caption bars, Insets animations, and Android
    16/17 large-screen behavior can increase relayout/resize/configuration
    traffic and App re-measure cost.
- SmartPerfetto impact:
  - Very high-value for startup and response/transition analysis. It gives the
    exact boundaries needed to separate app first-frame work, starting-surface
    lifetime, WMS relayout/surface placement, Shell animation, and SF present.
  - Useful for strategy guidance that enumerates actual slice names first,
    because WMS/transition slice names vary by version, config, and OEM.
- Candidate target:
  - `backend/strategies/startup.strategy.md`, scrolling/response strategy if
    transition jank is in scope, potential WMS/relayout evidence Skills, and
    data-gap guidance for missing `wm`/`view`/`surfaceflinger` categories.
- Status: read, very high-value candidate.

### 046. `part1-fundamentals/ch02-rendering/13-buffer-queue.md`

- Type: BufferQueue, BLASTBufferQueue, GraphicBuffer slots, fences, producer /
  consumer state, backpressure, and Perfetto interpretation.
- Useful information:
  - BufferQueue shares slot-backed `GraphicBuffer`s; it does not copy full
    frame pixels per frame. Steady-state `queueBuffer()` sends slot, metadata,
    and fence, while `requestBuffer()` / new handles are low-frequency
    allocation or reallocation events.
  - `BufferSlot::BufferState` is counter-based. Normal paths often look
    mutually exclusive, but shared-buffer modes can combine states. Use
    `isFree()` / `isDequeued()` / `isQueued()` / `isAcquired()` semantics rather
    than old enum assumptions.
  - Slot state and fence readiness are different. A slot returning to producer
    ownership does not prove the buffer is safe to overwrite until the release
    fence signals.
  - BLAST binds buffer and geometry transaction to the same frame number. Its
    main value is not just speed; it prevents content/geometry frame mismatch.
  - Legacy and BLAST differ in consumer location: legacy consumer is in
    SurfaceFlinger; Android 12+ common BLAST window paths have the consumer in
    the app process. That changes where to look for acquire/release delays.
  - `dequeueBuffer()` waits can be symptoms of SF/HWC/GPU downstream delay:
    slow present/release -> no free slots -> `waitForFreeSlotThenRelock()` or
    non-blocking `WOULD_BLOCK` -> producer cannot start the next frame.
  - Absolute millisecond thresholds are unsafe without a same-device,
    same-refresh-rate, same-surface-type baseline.
  - BLAST/FrameTimeline vsyncId and `QueuedBuffer - ...BLAST#...` slices can
    help align app submission, consumer acquisition, SF composition, and actual
    presentation.
- SmartPerfetto impact:
  - Very high-value for scrolling/jank and first-frame analysis. It enables
    reports to identify buffer backpressure, downstream release delay,
    geometry/content sync, or slot pressure instead of blaming "GPU" or "main
    thread" generically.
  - Strong candidate for deterministic SQL Skills around BufferQueue slices,
    BLAST queued-buffer slices, counters, `dequeueBuffer` waits, and
    FrameTimeline alignment.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`,
    `backend/strategies/startup.strategy.md`, BufferQueue/BLAST/fence evidence
    Skills, and trace regression expected reasoning.
- Status: read, very high-value candidate.

### 047. `part1-fundamentals/ch02-rendering/14-graphics-api-evolution.md`

- Type: OpenGL ES, Vulkan, ANGLE, WebGPU/Dawn, driver selection, Perfetto/API
  identification, migration and validation strategy.
- Useful information:
  - Vulkan platform availability, new-device launch requirements, and Android
    Vulkan Profiles are different concepts. Upgrading an old device to a newer
    Android release does not imply the same Vulkan version/profile support as a
    new launch device.
  - ANGLE is a GLES translation layer, not a new app API. Whether a specific
    app process uses native GLES or ANGLE depends on global settings, per-app
    overrides, allowlists/rules, ANGLE package/system availability, and EGL
    loader fallback.
  - Android 15+ does not mean every GLES app automatically runs through ANGLE.
    Android 17 ANGLE-default claims are marked pending public CDD evidence and
    should not be encoded as fact yet.
  - WebView/WebGL/WebGPU should be analyzed through Chromium/Skia/Dawn backend
    choices first; system GLES/ANGLE policy only applies when the stack uses
    the system GLES path.
  - Perfetto GPU activity and counters show load and frame results, not API
    selection by themselves. Combine app self-report, driver-selection config,
    process maps, loaded libraries, GPU tracks, and FrameTimeline.
  - `gpu.counters` can answer "how busy was the GPU" but not "native Vulkan vs
    native GLES vs GLES-over-ANGLE" without other evidence.
  - Validation layers are development-only; performance measured with Vulkan
    validation enabled should not be treated as release performance.
  - ANGLE/Vulkan sync changes trace naming: `eglSwapBuffers`-style paths may
    become `vkQueuePresentKHR`, `vkWaitForFences`, or `vkAcquireNextImageKHR`
    style slices.
- SmartPerfetto impact:
  - High-value for GPU data-gap language and API-route caveats. SmartPerfetto
    should not infer the graphics API route from one GPU slice or loaded library.
  - Useful if future reports discuss ANGLE/Vulkan/WebView/engine behavior; they
    should recommend runtime confirmation before attributing jank to a graphics
    API migration.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, GPU data-gap docs, potential
    graphics-API environment/evidence Skill if traces include process maps or
    loaded-library data, and report caveats for ANGLE/Vulkan.
- Status: read, high-value candidate with Android 17/route-verification caveat.

### 048. `part1-fundamentals/ch02-rendering/15-dmabuf-gralloc.md`

- Type: DMA-BUF, Gralloc, GraphicBuffer, zero-copy transport, allocator/mapper
  interface boundaries, 16 KB pages, fd leaks, allocation latency, and bandwidth
  competition.
- Useful information:
  - GraphicBuffer carries native handle transport metadata and fd references;
    pixels remain in shared physical memory. Binder transfers fd references, not
    copied pixel arrays.
  - Steady-state BufferQueue traffic submits slot, fence, and metadata. New
    GraphicBuffer handles are imported on first allocation/reallocation,
    `attachBuffer()`, or cache miss.
  - BufferQueue is the logical state machine; DMA-BUF/Gralloc are the physical
    memory-sharing layer. These must not be conflated in reports.
  - Android 12 moved from ION toward DMA-BUF Heaps. Standard heaps such as
    `/dev/dma_heap/system` differ from vendor/board-specific heaps and secure
    heaps. Heap names alone do not prove physical isolation.
  - Android 16 still has interface layering: allocator Stable AIDL, modern
    stable-C mapper, and HIDL mapper/allocator compatibility paths. Do not say
    the entire stack is simply "AIDL-only."
  - 16 KB page-size environments can inflate small buffer, metadata, plane, and
    `reservedSize` costs. Need to consider payload, stride/plane layout,
    reserved regions, and number of importing processes.
  - Useful observability: `gpu_memory`, meminfo Graphics/EGL mtrack,
    `dumpsys SurfaceFlinger`, `/proc/<pid>/fd`, `/sys/kernel/dmabuf/buffers`,
    ftrace `dmabuf_heap/dma_heap_stat`, and Perfetto
    `android_dmabuf_allocs` when captured.
  - Gralloc allocation delays can hurt startup/first-frame or resize paths,
    while Camera/Video/Display DMA-BUF usage can create memory-bandwidth
    contention with app rendering.
- SmartPerfetto impact:
  - High-value for graphics-memory and first-frame/resize/camera coexistence
    attribution. It helps separate Java heap from GPU/dmabuf memory and
    BufferQueue logic from physical memory leaks.
  - Useful for data-gap recommendations when a trace lacks dmabuf/memory
    sources but BufferQueue or GPU-memory symptoms suggest graphics allocation
    or fd-lifecycle issues.
- Candidate target:
  - `backend/strategies/startup.strategy.md`,
    `backend/strategies/scrolling.strategy.md`, possible graphics-memory data
    source guidance, and future Skills around dmabuf allocation tables if the
    trace processor schema supports them in fixtures.
- Status: read, high-value candidate.

### 049. `part1-fundamentals/ch02-rendering/16-sync-fence.md`

- Type: Android explicit sync, acquire/release/present fences, fence merge,
  GL/Vulkan HWUI fence paths, Binary Semaphore sync-fd interop, and Perfetto
  fence-wait interpretation.
- Useful information:
  - Fence waits are synchronization evidence, not a root cause by themselves.
    Reports need to ask which producer/consumer/display side failed to finish
    on time.
  - Producer `queueBuffer()` passes a fence that the consumer observes as an
    acquire fence. Consumer `releaseBuffer()` returns a release fence that the
    producer waits before reusing the buffer. Present fence is the closer proxy
    for when a frame actually appears.
  - `Fence::merge()` / `sync_merge()` explains multi-layer waits: a merged
    fence signals only when all input fences have signaled.
  - App `dequeueBuffer()` waits often mean release-fence delay from
    SurfaceFlinger/HWC/display, while SurfaceFlinger `latchBuffer` waits often
    mean producer/GPU acquire-fence delay.
  - Absolute queue/fence heuristics such as "queued=2 is abnormal" are unsafe.
    Interpret waits in the same trace with BufferQueue state, GPU busy,
    refresh rate, surface type, and SF/HWC timing.
  - HWUI GL and Vulkan backends create/release fences differently: GL/EGL paths
    use `EglManager::createReleaseFence()`, while Vulkan paths export a sync fd
    through a Binary Semaphore bridge. Native fence boundaries are still
    sync-fd/Binary Semaphore, not Timeline Semaphore direct export.
  - Pure Vulkan Timeline Semaphore waits may not show up in native fence tracks;
    they need GPU counters, Vulkan-layer traces, or app markers.
  - 16 KB page/fence latency and future Timeline-Semaphore fd replacement
    claims are explicitly speculative and should not be encoded as facts.
- SmartPerfetto impact:
  - Very high-value for scrolling/jank attribution. It can make reports explain
    whether a wait is producer-side rendering, consumer-side release, display
    present, or only a synchronization handoff.
  - Strong input for BufferQueue/fence evidence Skills and report confidence
    rules around fence waits.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`,
    `backend/strategies/startup.strategy.md`, BufferQueue/fence SQL Skills,
    and trace regression expected reasoning.
- Status: read, very high-value candidate with speculative future claims
  excluded.

### 050. `part1-fundamentals/ch02-rendering/17-frame-pacing.md`

- Type: Android Frame Pacing Library / Swappy, game SurfaceView pacing,
  Choreographer integration, swap/present timing, FrameTimeline/SurfaceView
  verification, and SwappyStats.
- Useful information:
  - Average FPS can hide pacing problems. A game can report 60 FPS but stutter
    on a 90/120 Hz display if frame presentation alternates unevenly or queue
    depth grows.
  - Swappy controls submit timing, presentation time, sync fences, queue depth,
    and frame-rate votes around `eglSwapBuffers()` / `vkQueuePresentKHR()`.
  - Public initialization requirements and internal Choreographer fallback are
    separate. Swappy public GL/Vulkan entry points still require JNI env and
    Activity; internal paths choose NDK Choreographer, Java Choreographer, or
    no-Choreographer fallback by API/context.
  - Auto swap interval is dynamically computed from frame time and refresh
    period, not a hardcoded FPS table.
  - `SwappyGL_setWindow()` / `SwappyVk_setWindow()` matter because the
    `ANativeWindow` path is used for display timing and frame-rate voting.
  - Verification should combine SurfaceView buffered frames, SwappyStats /
    `FrameStatistics`, Perfetto FrameTimeline where supported, and GPU/render
    evidence. FrameTimeline is Android 12+ and still has SurfaceView support
    limitations.
  - FrameTimeline SQL can distinguish interval irregularity from actual missed
    deadlines via `actual_dur`, `expected_dur`, `on_time_finish`,
    `present_type`, and `jank_type`.
  - Android 17 DeliQueue benefits are targetSdk-gated for Java MessageQueue.
    Whether NDK AChoreographer/Swappy native callbacks benefit remains
    unverified.
- SmartPerfetto impact:
  - Medium/high-value for game, SurfaceView, and frame-pacing scenes. It adds a
    distinct class where "FPS is fine" but pacing/queue depth/present timing is
    the problem.
  - Useful for data-gap language: if the trace is SurfaceView/game-heavy and
    FrameTimeline is unsupported or absent, SmartPerfetto should look for
    SurfaceView buffered frames, Swappy stats, GPU render stages, and app
    markers instead of forcing normal app-frame logic.
- Candidate target:
  - Scene routing inventory, `backend/strategies/scrolling.strategy.md` if it
    handles SurfaceView/game traces, future SurfaceView/frame-pacing evidence
    Skills, and trace regression expected reasoning.
- Status: read, high-value candidate for SurfaceView/game pacing.

### 051. `part1-fundamentals/ch02-rendering/18-adaptive-refresh-rate.md`

- Type: Adaptive Refresh Rate, DisplayManager policy, SurfaceFlinger
  RefreshRateSelector, View/RecyclerView/Compose APIs, Choreographer
  FrameData, VSync/FrameTimeline analysis, and ARR caveats.
- Useful information:
  - Android 11-14 multi-refresh-rate support and Android 15-QPR1+ ARR should be
    separated. Android 16 adds public Display query APIs, but system ARR
    support starts earlier on capable devices.
  - DisplayManager narrows allowed display specs first; SurfaceFlinger
    Scheduler then chooses refresh rate for visible content inside those
    policy ranges.
  - Ordinary UI apps should primarily express preferences via View /
    RecyclerView / Compose APIs such as `setRequestedFrameRate()`,
    `setFrameContentVelocity()`, and Compose `preferredFrameRate()`.
    `Surface.setFrameRate()` is lower-level and better suited to specific
    surfaces such as video/game/camera.
  - `Display.getSuggestedFrameRate(int)` takes categories
    `FRAME_RATE_CATEGORY_NORMAL/HIGH`; it is not an arbitrary fps-to-Hz mapper.
  - Choreographer public `FrameData` exposes frame time and frame timelines; it
    does not expose a public `refreshRate` field.
  - Perfetto ARR analysis should treat VSync interval changes as possibly
    normal. Look at `expected_frame_timeline_slice` /
    `actual_frame_timeline_slice`, expected duration changes, jank/present
    types, SurfaceFlinger refresh-rate selection, and VSYNC-app/SF intervals.
  - `display_frame_token` gaps are auxiliary signals only. They can come from
    lower content frame rate, surfaces that do not produce every VSync, or trace
    clipping; they do not alone prove scheduler failure.
- SmartPerfetto impact:
  - Very high-value for high-refresh/ARR jank strategy. It prevents false
    positives from fixed 16.67 ms assumptions and clarifies when changing
    expected frame duration is normal behavior.
  - Useful for report language around confidence and data gaps when refresh-rate
    tracks, FrameTimeline, or Display/SF selection slices are absent.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, refresh-rate/ARR evidence
    Skills or docs, FrameTimeline SQL expectations, and trace regression
    scenarios for high-refresh-rate traces.
- Status: read, very high-value candidate.

### 052. `part1-fundamentals/ch02-rendering/19-refresh-rate-switching.md`

- Type: Refresh-rate mode switching, SurfaceFlinger layer voting,
  Display HAL/PLL transition, VsyncModulator offsets, Camera/game scenarios,
  and Perfetto identification.
- Useful information:
  - App-side work can look normal while the user sees jank if the problem is in
    SurfaceFlinger / Display HAL refresh-rate transition. This is common in
    camera -> recents -> launcher style flows.
  - SurfaceFlinger arbitrates visible layers through vote types, content
    detection, explicit `setFrameRate()` requests, touch boost, GameManager,
    Battery Saver, thermal policy, and DisplayManager policy ranges. Requests
    are hints, not commands.
  - Display HAL hardware transition cost comes from mode switching, PLL
    reconfiguration, seamless/non-seamless boundaries, and ARR/VRR capability.
    Device-specific implementation matters.
  - FrameTimeline can separate app-rendering slowdowns from SF/display-side
    misses. Refresh switching is more plausible when app doFrame/RenderThread
    are normal, VSync interval changes align with mode/selection slices, and
    jank types point to SF/display rather than `AppDeadlineMissed`.
  - ARR can reduce hard mode-switch cost, but software arbitration,
    Choreographer timing, and VsyncModulator offset changes can still create
    transitional irregularity.
  - Use stable public APIs carefully: `Display.getSuggestedFrameRate()` is
    category-based; `Surface.FrameRateParams` / range APIs are flagged or
    system-oriented and should not be presented as normal third-party APIs.
  - The article is `ready-for-review` with Task9 pending, so implementation
    should prefer verified boundaries and avoid vendor/OEM performance claims
    without trace or official evidence.
- SmartPerfetto impact:
  - High-value for distinguishing app jank from display-mode-switch jank,
    especially on camera, launcher, game, and high-refresh devices.
  - Useful for strategy text that directs analysis toward VSync intervals,
    FrameTimeline jank types, refresh-rate selection slices, SurfaceFlinger, and
    Display HAL evidence before blaming app code.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, possible refresh-switch
    evidence Skill/docs, data-gap recommendations for SurfaceFlinger logs or
    display-mode traces, and trace regression expected reasoning.
- Status: read, high-value candidate, but Task9-pending claims require
  verification before implementation.

### 053. `part1-fundamentals/ch02-rendering/20-multiwindow-desktop-rendering.md`

- Type: Multi-window, PiP, desktop windowing, connected displays, large-screen
  configuration changes, multi-resume, SurfaceFlinger layer/display pressure,
  and Perfetto layer/jank analysis.
- Useful information:
  - Multi-window scenarios should be separated by display/session shape:
    split-screen, PiP, freeform/desktop windowing, phone + connected display,
    and desktop-windowing device + external display have different layer and
    display-pipeline implications.
  - SurfaceFlinger pressure grows through visible layer count, composition
    decision complexity, HWC overlay limits, CLIENT composition fallback, and
    multiple display pipelines. Multi-display traces need display-specific
    frame budgets and layer filters.
  - Android 10+ multi-resume means visible activities can remain `RESUMED`
    without being top resumed. High-frequency rendering and exclusive resources
    should track `onTopResumedActivityChanged()` and real visibility, not only
    `onStop()`.
  - Large-screen Android 16/17 behavior increases resize/configuration-change
    frequency. `recreateOnConfigChanges` is not a general foldable/window-size
    switch and should not be used as a broad explanation for resize handling.
  - Perfetto analysis should first enumerate actual SurfaceFlinger slice names,
    use real layer snapshot tables (`surfaceflinger_layers_snapshot`,
    `surfaceflinger_layer`), filter by `display_id`, and distinguish
    `AppDeadlineMissed` from `SurfaceFlingerCpuDeadlineMissed` and
    `SurfaceFlingerGpuDeadlineMissed`.
  - The article is not fully final (`needs-rework` markers exist). Claims about
    Android 17 multi-display lock isolation, exact jank-percentage reductions,
    Android 16 cached-state slices, and 16 KB page PSS percentages need current
    official/source/trace evidence before implementation.
- SmartPerfetto impact:
  - High-value for transition, desktop, foldable, and multi-display jank. It
    adds routing/strategy boundaries for cases where SF/HWC/display pressure is
    more important than the foreground app's own UI thread.
  - Useful for data-gap guidance around missing layer snapshots, display IDs,
    and SurfaceFlinger frame/jank surfaces.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, transition/response strategy if
    in scope, possible SurfaceFlinger layer/display evidence Skills, and trace
    regression expectations for multi-window traces.
- Status: read, high-value candidate with needs-rework caveats.

### 054. `part1-fundamentals/ch02-rendering/21-text-rendering-performance.md`

- Type: TextView/StaticLayout/Minikin/Skia text rendering, emoji,
  PrecomputedText, text measure and glyph upload diagnostics.
- Useful information:
  - Text rendering can dominate list/chat jank through CPU-side shaping,
    measurement, line breaking, Span handling, and layout, especially at 120 Hz.
  - Main-thread `performTraversals -> measure -> TextView.onMeasure()` is the
    most stable Perfetto observation point. RenderThread/HWUI glyph upload or
    TextBlob details require extra trace categories and are less portable by
    slice name.
  - BoringLayout, StaticLayout, and DynamicLayout have very different cost
    profiles. Multi-line text, CJK/complex scripts, spans, emoji spans, and
    hyphenation can push work into expensive StaticLayout/Minikin paths.
  - `PrecomputedText` moves shaping/measurement work earlier but does not
    completely replace StaticLayout. It still depends on stable text metrics,
    width/layout constraints, break strategy, hyphenation, and line-break config.
  - AndroidX `PrecomputedTextCompat.getTextFuture()` /
    `AppCompatTextView.setTextFuture()` can shift list-item text work to a
    caller-provided executor, useful for RecyclerView bind/precompute flows.
  - Hyphenation is already `NONE` by default in modern TextView; optimization is
    mainly about preventing styles/components from turning it on for short text.
  - EmojiCompat uses spans and emoji typefaces, not a blanket bitmap-decode path;
    cost can be span/run inflation, first font load, and text shaping/draw work.
  - Android 15/16KB page effects matter mainly for native text engines, glyph
    caches, mmap/ashmem, or hardcoded 4 KB assumptions, not Java TextView API
    semantics.
- SmartPerfetto impact:
  - High-value for scrolling/list strategy and potential RecyclerView text-jank
    diagnosis. It gives a clear branch when app jank is main-thread measure
    bound rather than RenderThread/GPU/SF bound.
  - Useful for report recommendations that are evidence-based: identify
    TextView measure, complex spans/text, and suggest PrecomputedText or
    parameter trimming only when the trace supports it.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, possible TextView/measure
    evidence Skill, RecyclerView/list regression expectations, and report
    wording for text-heavy frames.
- Status: read, high-value candidate.

### 055. `part1-fundamentals/ch02-rendering/22-surfaceflinger-frontend-requestedlayerstate.md`

- Type: SurfaceFlinger FrontEnd, transaction queue/readiness, requested layer
  state, layer lifecycle, hierarchy/mirror/relative paths, snapshots, and
  commit-stage transaction pressure.
- Useful information:
  - Android 15+ SurfaceFlinger FrontEnd separates client requested state
    (`RequestedLayerState`) from composition input (`LayerSnapshot`). Transaction
    requests are not the same as final composition state.
  - `Changes` bitmasks, changed-layer sets, hierarchy builders, and snapshots
    let SurfaceFlinger update state incrementally rather than recomputing every
    layer every frame.
  - Layer hierarchy is a graph, not just a tree: relative parent, mirror,
    detached, and traversal path differences matter for transition and display
    mirror analysis.
  - `TransactionHandler` queues transactions by `applyToken`, filters readiness,
    and handles present time, barriers, unsignaled buffers, and auto-single-layer
    cases before transactions enter a frame.
  - FrontEnd output is layer snapshots and traversal results, not HWC commands
    or RenderEngine draws. Slow `commit` / transaction queue pressure points
    back to FrontEnd; slow `composite`, HWC validate/present, or fence waits
    point downstream.
  - Observability: Perfetto `TransactionQueue`, SF `commit`/`composite`/present
    slices, Winscope layer hierarchy/transactions, and `dumpsys
    SurfaceFlinger` layer/composition state should be kept separate by source.
  - The article is `ready-for-review` / task6 pending, so architecture
    boundaries are useful but exact class/field claims should be rechecked
    before code or durable prompt changes.
- SmartPerfetto impact:
  - Very high-value for SurfaceFlinger transaction/transition jank. It creates a
    distinct "SF commit/front-end transaction pressure" branch instead of
    collapsing all SF delay into composition or HWC.
  - Useful for future Skills around transaction queue, commit duration, layer
    hierarchy churn, and distinguishing request-state pressure from downstream
    composition/fence pressure.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, WMS/transition analysis docs,
    possible SurfaceFlinger transaction evidence Skills, and trace regression
    expected reasoning.
- Status: read, very high-value candidate with review-status caveat.

### 056. `part1-fundamentals/ch02-rendering/23-vsync-scheduler-displayframerate.md`

- Type: SurfaceFlinger VSync Scheduler, VSyncPredictor/Dispatch, offset
  budgeting, display frame-rate voting, ARR, GameManager intervention, and
  Perfetto scheduler diagnosis.
- Useful information:
  - Current analysis should use Scheduler-era concepts:
    `VsyncSchedule`, `VSyncPredictor`, `VSyncDispatchTimerQueue`, `Scheduler`,
    and `RefreshRateSelector`, not only old `DispSync` terminology.
  - Dispatch converts target VSync into wakeup time by subtracting work and ready
    durations. App and SF offsets split the frame budget; they do not create
    extra CPU/GPU capacity.
  - VSyncPredictor validates samples, rejects outliers, relearns after mode
    changes, and can produce short transition irregularity without that being a
    bug.
  - Display frame-rate requests are hints. Surface/View/Window APIs, layer vote
    types, touch signals, power signals, game interventions, pacesetter display,
    active mode, and policy ranges are all inputs.
  - ARR introduces separate content frame rate, render target frame rate, and
    display refresh rate. These must not be treated as one value.
  - GameManager FPS interventions can hold frames until app frame rate aligns
    with VSync timestamps, which can look like pacing behavior rather than raw
    rendering slowness.
  - Perfetto diagnosis should link VSYNC-app/SF offsets, Choreographer start,
    RenderThread/GPU submit, SF commit/latch/compose/present, HWC/present fence,
    and FrameTimeline expected/actual/present.
- SmartPerfetto impact:
  - Very high-value for refresh-rate and scheduler-aware jank reports. It
    provides the common framework behind ARR, refresh switching, frame pacing,
    and VSync phase analysis.
  - Useful for data-gap confidence: missing FrameTimeline, refresh tracks,
    present fence, or SF scheduler slices should downgrade scheduler claims.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, FrameTimeline/VSync/refresh-rate
    evidence Skills/docs, and regression expectations for high-refresh traces.
- Status: read, very high-value candidate.

### 057. `part1-fundamentals/ch02-rendering/24-graphic-memory-dmabuf-gralloc-16kb-boundary.md`

- Type: Graphic memory boundary, DMA-BUF heap, Gralloc allocator/mapper,
  BufferQueue metadata, native handle transfer, and 16 KB page-size attribution.
- Useful information:
  - `libdmabufheap` is a migration/compatibility layer, not a graphics buffer
    strategy or pooling layer. Its `Alloc()` path tries DMA-BUF heap first and
    falls back to legacy ION where needed; `legacy_align` belongs to the old ION
    branch.
  - `IAllocator.allocate2(BufferDescriptorInfo, count)` and
    `additionalOptions` are descriptor/HAL-level mechanisms. They should not be
    treated as a public Android graphics-buffer "16 KB alignment" API.
  - BufferQueue steady state is mostly slot and fence movement. `requestBuffer`
    returns a `GraphicBuffer` for a slot when the consumer needs it;
    `queueBuffer` carries the buffer, acquire fence, frame number, transform,
    and dataspace. It is not proof of a fresh allocation on every frame.
  - `GraphicBuffer::flatten()` transfers metadata plus native handle fds, not
    pixel contents.
  - 16 KB page-size impact on graphics buffers is mediated by kernel page
    granularity, DMA-BUF heaps, Gralloc/vendor allocator policy, stride/padding,
    compression, and memory pressure. Missing allocator/page-size evidence
    should downgrade deterministic 16 KB claims.
  - Useful observability: `getconf PAGE_SIZE`, `/dev/dma_heap`,
    `/proc/<pid>/fd`, SurfaceFlinger/Winscope state, Perfetto FrameTimeline,
    fence waits, BufferQueue slices, and allocation/import signals.
- SmartPerfetto impact:
  - High-value for graphics-memory data-gap handling. It helps prevent reports
    from over-attributing jank or memory growth to Android 15/16 KB page size
    when allocator and buffer evidence is absent.
  - Useful for startup/scrolling strategy caveats where graphics memory,
    BufferQueue slots, fd growth, allocation delay, or vendor allocator behavior
    is part of the suspected root cause.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, startup/graphics-memory runtime
    docs, possible DMA-BUF/Gralloc data-gap wording, and trace regression
    expected reasoning.
- Status: read, high-value candidate.

### 058. `part1-fundamentals/ch02-rendering/25-choreographer-buffer-stuffing-recovery.md`

- Type: Android 16 Choreographer buffer-stuffing recovery, wait-for-buffer
  release signal, frame delay/offset recovery, and BufferQueue backpressure
  interpretation.
- Useful information:
  - Android 16 adds Choreographer-side `BufferStuffingState` and
    `onWaitForBufferRelease(durationNanos)` behavior for waits longer than half
    of the previous frame interval. The article notes Android 17/source-caller
    details still need verification.
  - Buffer stuffing recovery distinguishes buffer availability/cadence drift
    from slow traversal. It does not release buffers, increase slot count, or
    shorten GPU/HWC/SurfaceFlinger work.
  - Recovery can first `DELAY_FRAME`, scheduling the next VSync and skipping
    callbacks, then use `OFFSET` with a negative frame-time offset so animation
    time catches up while the system recovers.
  - The trace signal should be interpreted as "cadence recovery after buffer
    backpressure", not root-cause proof by itself.
  - Useful evidence chain: `Choreographer#doFrame <vsyncId>`,
    `Buffer stuffing recovery` async/instant slices, FrameTimeline expected vs
    actual timestamps, producer `dequeueBuffer` or fence wait, SurfaceFlinger
    latch/present, and BufferQueue/SF context.
- SmartPerfetto impact:
  - Very high-value for Android 16+ scrolling/rendering reports. It provides a
    separate branch for cadence-recovery signals after buffer backpressure,
    avoiding false conclusions that app traversal alone caused the jank.
  - Useful for data-gap confidence: if only the recovery marker is present,
    SmartPerfetto should ask for producer/consumer/fence/SF evidence before
    naming the root cause.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, FrameTimeline/Choreographer
    evidence docs, possible BufferQueue backpressure Skill tests.
- Status: read, very high-value candidate with version/source-caller caveat.

### 059. `part1-fundamentals/ch02-rendering/README.md`

- Type: chapter index and rendering-domain navigation.
- Useful information:
  - Confirms the chapter-level rendering taxonomy: Choreographer, RenderThread,
    SurfaceFlinger, BufferQueue/BLAST, Sync Fence, Display HAL, GPU/graphics API,
    Flutter, multi-window, text rendering, VSync scheduler, and related caveats.
  - No new implementation detail beyond the articles already read in the same
    chapter.
- SmartPerfetto impact:
  - Low direct implementation value. It is useful as a coverage checklist for
    synthesis, ensuring rendering strategy changes do not focus only on app
    main-thread and HWUI while missing display-side or framework-side surfaces.
- Candidate target:
  - Synthesis coverage checklist only.
- Status: read, no direct change candidate.

### 060. `part1-fundamentals/ch03-input/01-input-dispatch.md`

- Type: Android input pipeline, InputReader/InputDispatcher, InputChannel,
  App-side InputStage chain, input ANR, stale events, WindowInfosListener,
  version boundaries, and Perfetto diagnosis.
- Useful information:
  - The end-to-end path is Hardware/Kernel/EventHub -> InputReader ->
    InputClassifier/InputProcessor -> InputDispatcher -> InputChannel/socketpair
    -> ViewRootImpl/InputStage -> View tree. `deliverInputEvent` marks app-side
    receive/process work, but prior queueing and channel setup can already have
    consumed latency budget.
  - Touch events use touched-window hit testing; key events use focused-window
    resolution. Predictive back is Framework window-layer behavior, not
    `InputDispatcher` semantics.
  - `iq`, `oq:{windowName}`, and `wq:{windowName}` map to inbound, outbound, and
    wait queues. Sustained `wq` growth means the app has not sent `FINISHED`;
    sustained `iq`/`oq` points to different dispatcher/connection bottlenecks.
  - Input uses `socketpair`, not Binder, because it needs per-window channels,
    asynchronous send/finish acknowledgement, and ANR tracking.
  - InputChannel creation failure is a separate failure class. fd exhaustion
    (`EMFILE`/`ENFILE`) or `ENOMEM` can prevent a window from getting a working
    channel and may surface as window-add failure, no-focus-window ANR, or
    missing focus rather than ordinary `wq` buildup.
  - App-side dispatch goes through ViewRootImpl's `InputStage` chain before
    Activity/View dispatch. An Input ANR can include time waiting in the app
    main-thread MessageQueue before `deliverInputEvent` begins; a short
    `deliverInputEvent` slice does not rule out input-latency blame.
  - Stale events are distinct from Input ANR: stale drops discard old queued
    events, while ANR is driven by dispatched events that lack `FINISHED`.
    Version boundaries differ from Android 12 through 16.
  - Android 13+ WindowInfosListener updates InputDispatcher with SF/window
    topology; Android 12 still uses the older `setInputWindows` path. This
    affects target-window choice and ANR/focus judgment, not App processing
    duration.
  - Android 16 Rust input work is limited to InputFilter/accessibility filters;
    InputReader and InputDispatcher core remain C++. Android 17 DeliQueue input
    acceleration remains speculative until source/trace proof exists.
- SmartPerfetto impact:
  - Very high-value for ANR, interaction latency, startup no-focus ANR, and
    scrolling/touch response strategies. SmartPerfetto should avoid collapsing
    every input problem into "main thread blocked"; it needs a queue/channel/
    focus/stale/window-topology decision tree.
  - Strong candidate for deterministic evidence Skills around input queue
    counters, `deliverInputEvent`, focus/window state, InputChannel failures,
    and ANR type separation.
  - Useful report guidance: when `wq` grows but `deliverInputEvent` is short,
    attribute to app main-thread queue wait or prior message work; when channel
    creation fails, ask for fd/memory/logcat/WMS evidence instead of treating it
    as dispatched-event ANR.
- Candidate target:
  - `backend/strategies/anr.strategy.md`,
    `backend/strategies/scrolling.strategy.md`, possible input-latency Skill
    docs/SQL, ANR regression expectations, and Agent SSE e2e traces that
    include input response.
- Status: read, very high-value candidate.

### 061. `part1-fundamentals/ch03-input/02-touch-performance.md`

- Type: touch-response latency decomposition, sampling rate, batching,
  resampling, Choreographer input stage, Input Boost, MotionPredictor, and
  Perfetto touch-latency diagnosis.
- Useful information:
  - Touch response is a full path from hardware sample to display present:
    sampling, kernel/EventHub, InputReader, InputDispatcher, socketpair,
    App-side dispatch, rendering, SurfaceFlinger/HWC, and panel output.
  - Touch sampling rate and display refresh rate are different. High sampling
    rate only helps when App/render/display can consume the extra information,
    or when stylus/prediction/unbuffered paths use historical samples.
  - Batching merges MOVE samples into a `MotionEvent` with history; it does not
    simply discard intermediate points. Resampling happens in the App process
    `InputConsumer`, aligned to frame time, and API 35+ exposes
    `PointerCoords.isResampled()`.
  - `Choreographer#doFrame()` handles `CALLBACK_INPUT` before animation,
    insets animation, traversal, and commit. Ordinary MOVE events usually align
    with this input stage unless unbuffered dispatch is requested.
  - InputDispatcher `wq` measures dispatch/ACK backpressure; App-side
    batching evidence is `consumeBatchedInputEvents`, `deliverInputEvent`, and
    MotionEvent history. These must not be conflated.
  - Touch jank root causes include main-thread blocking, deep View dispatch,
    gesture conflicts, CPU frequency/scheduling/Input Boost failures, GPU/SF
    bottlenecks, and low-memory side effects.
  - MotionPredictor is mainly for stylus/drawing/signature paths. Native Android
    16 implementation details support TFLite model loading and stylus-source
    availability checks, but non-stylus support, fixed prediction windows, and
    NPU claims remain unverified.
- SmartPerfetto impact:
  - Very high-value for scrolling and touch-response reports. It supports an
    evidence chain that separates input queue backpressure, App input handling,
    scheduling/frequency, and display pipeline delay.
  - Useful for avoiding generic recommendations: unbuffered dispatch and
    MotionPredictor should only be suggested for stylus/drawing-like continuous
    trajectories, not ordinary list scrolling or taps.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, possible input-latency Skill
    docs/SQL, touch-response report wording, and trace regression expectations
    for batching/resampling evidence.
- Status: read, very high-value candidate.

### 062. `part1-fundamentals/ch03-input/03-gesture-navigation.md`

- Type: Android gesture navigation, SystemUI edge back, InputMonitor spy
  windows, `pilferPointers`, system gesture exclusion, Predictive Back, and
  Perfetto diagnosis.
- Useful information:
  - SystemUI's edge-back path uses an `InputMonitorCompat("edge-swipe")`
    monitor channel. Before threshold, App and monitor may both observe the
    pointer stream; after legacy back threshold, `pilferPointers()` can cause
    the App to receive `ACTION_CANCEL`.
  - Legacy back and Predictive Back must be separated. Legacy path can inject
    `KEYCODE_BACK`; predictive/ahead-of-time back uses WM Shell back animation
    and `OnBackInvokedCallback` / `OnBackAnimationCallback` / AndroidX progress
    callbacks.
  - `setSystemGestureExclusionRects()` is a limited side-edge opt-out, not a
    universal system-gesture exemption. Left/right back edge and bottom
    mandatory gesture areas use different WindowInsets surfaces.
  - Android version boundaries matter: API 33 commit callback, API 34 progress
    callback, Android 15 opted-in system animations beyond developer option,
    API 36 observer-only priority.
  - Perfetto analysis should compare edge monitor, App pointer stream/cancel,
    SystemUI/WM Shell animation, current/target surfaces, and FrameTimeline,
    rather than relying on a single device-specific slice name.
- SmartPerfetto impact:
  - High-value for touch/scrolling false positives and interaction reports: a
    missing App event may be a system gesture takeover, not App jank or
    InputDispatcher loss.
  - Useful for future strategy wording around edge-swipe conflicts,
    Predictive Back animation jank, SystemUI main-thread load, and exclusion
    rect/data-gap handling.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, input-latency docs, possible
    SystemUI/back-gesture analysis branch, and e2e expectations for App cancel
    vs system takeover.
- Status: read, high-value candidate.

### 063. `part1-fundamentals/ch03-input/04-input-latency-prediction.md`

- Type: input-latency model, VSync/batching/resampling, MotionPredictor,
  front-buffer rendering, Perfetto `android.input` stdlib metrics, and
  scheduling/frequency attribution.
- Useful information:
  - The article explicitly separates sampling latency, system dispatch latency,
    App handling latency, and display latency. Each metric covers only its own
    segment.
  - `android.input` stdlib fields are directly actionable:
    `dispatch_latency_dur`, `handling_latency_dur`, `ack_latency_dur`,
    `total_latency_dur`, and `end_to_end_latency_dur`.
  - `total_latency_dur` is dispatch-to-ACK, not touch-to-display. End-to-end
    claims require `end_to_end_latency_dur` or a separate link to FrameTimeline,
    RenderThread, SurfaceFlinger, and present.
  - Dispatch latency points to system_server scheduling, InputChannel, target
    process wakeup, or socket congestion. Handling latency points to
    `deliverInputEvent`, View dispatch, and App main-thread work. ACK latency
    is post-handling callback/writeback/scheduling and should not be counted as
    View dispatch time.
  - Front-buffer/low-latency graphics are narrow tools for stylus, signature,
    whiteboard, or local incremental drawing. They are not general solutions
    for lists, buttons, or whole-screen UI.
  - The Android 16/17 ADPF input feedback, actual-present timeline, and dynamic
    report-rate directions are explicitly marked as pending verification.
- SmartPerfetto impact:
  - Very high-value because it maps directly to deterministic SQL and report
    claims. SmartPerfetto can use these stdlib fields to produce segmented
    input latency conclusions instead of a single generic "input slow" verdict.
  - Good guardrail for recommendations: MotionPredictor/front-buffer/unbuffered
    dispatch require continuous-trajectory evidence and should not be suggested
    for ordinary scroll/tap latency.
- Candidate target:
  - New or revised input-latency Skill using Perfetto `android.input` stdlib,
    `backend/strategies/scrolling.strategy.md`, ANR/input report wording, and
    regression tests covering missing stdlib/FrameTimeline data gaps.
- Status: read, very high-value candidate.

### 064. `part1-fundamentals/ch03-input/05-input-interception-security.md`

- Type: InputFilter, InputMonitor spy windows, accessibility event filtering,
  event injection paths, security boundaries, and interception-performance
  analysis.
- Useful information:
  - `InputFilter` is a global system-level filter registered through WMS/IMS.
    Native `InputDispatcher` does not hold the Java filter object; it calls
    policy `filterInputEvent(...)` when filtering is enabled.
  - `InputMonitor` is different from `InputFilter`: spy windows receive a copy
    and can `pilferPointers()` in privileged cases, but they are not ordinary
    event-rewrite filters.
  - Accessibility key filtering is asynchronous through
    `KeyboardInterceptor`/`KeyEventDispatcher` with a 500 ms timeout. It is not
    InputDispatcher synchronously waiting on remote `onKeyEvent()`.
  - Accessibility touch handling can directly process `MotionEvent` through
    `AccessibilityInputFilter` handlers such as `TouchExplorer` and
    `MotionEventInjector`; it is not only indirect UI-tree interaction.
  - Injection paths differ: Instrumentation self-target injection,
    UiAutomation standard injection, UiAutomation-to-input-filter testing,
    `adb shell input`, and `AccessibilityService.dispatchGesture()` have
    different permission, filter, and public-flag behavior.
  - App-visible injected/accessibility indicators are limited. `source` is not
    an injected-event marker; accessibility-specific public flags are different
    from internal InputDispatcher policy flags.
  - The article is still `ready-for-review` with Task9 caveats around Android 17
    password/InputMonitor and call-time permission blocking. Those claims need
    external verification before durable SmartPerfetto prompts depend on them.
- SmartPerfetto impact:
  - High-value for explaining touch/input anomalies where events are consumed,
    cancelled, delayed, or injected by system/accessibility paths rather than by
    the target App.
  - Useful as a data-gap and attribution guardrail: distinguish system_server
    filter work, accessibility pending-key wait, service-process work, App
    `onInterceptTouchEvent`, and system gesture pilfer/cancel.
- Candidate target:
  - ANR/input-latency strategy caveats, possible docs for event interception
    and accessibility-induced latency, but avoid Android 17-specific claims
    until verified.
- Status: read, high-value candidate with review caveats.

### 065. `part1-fundamentals/ch03-input/06-gesture-recognition-performance.md`

- Type: VelocityTracker/GestureDetector, touch slop, fling thresholds,
  nested-scroll conflict handling, custom gesture performance, vendor caveats,
  and Compose gesture architecture.
- Useful information:
  - VelocityTracker Java API is a wrapper over JNI/native strategy selection.
    X/Y axes default to LSQ2 while scroll/differential axes use IMPULSE; explicit
    strategy selection is mainly for testing/comparison.
  - VelocityTracker uses object pooling. Normal `addMovement()` / native buffer
    writes are lightweight; repeated `computeCurrentVelocity()` on every MOVE
    can still waste frame budget and should be evidence-based before called out.
  - GestureDetector separates immediate `onSingleTapUp()` from delayed
    `onSingleTapConfirmed()` and double-tap callbacks. Misunderstanding these
    callbacks can create perceived tap-delay behavior that is not InputDispatcher
    latency.
  - TouchSlop is a layered threshold: framework fallback constant, platform
    resource, and possible device overlay. Device differences should not be
    described as Android-version changes without specific evidence.
  - Nested scrolling and `requestDisallowInterceptTouchEvent()` can add
    per-MOVE parent-chain work and change which view receives the stream. Gesture
    conflict symptoms can look like poor responsiveness even when frames are
    not late.
  - Custom gesture pitfalls include per-MOVE allocation, over-computation, deep
    View dispatch paths, and premature parent interception.
  - The article is still `ready-for-review` / Task2B pending with Task9
    rework history, so exact performance numbers and vendor/Compose claims
    should be verified before being encoded as durable rules.
- SmartPerfetto impact:
  - Medium-to-high value for App-side interaction reports: it adds a
    "gesture-recognition/dispatch conflict" branch when traces show normal
    InputDispatcher and rendering but user-visible scroll/fling/tap behavior is
    wrong.
  - Useful for recommendation wording, especially avoiding unsupported claims
    that every slow gesture is a system input or rendering problem.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, future docs for App-side
    gesture conflict evidence, but only limited Skill changes unless traces can
    expose stable slices/markers for these app-level APIs.
- Status: read, medium/high-value candidate with review caveats.

### 066. `part1-fundamentals/ch03-input/07-inputdispatcher-backpressure.md`

- Type: InputDispatcher backpressure, InputChannel `WOULD_BLOCK`, queue
  boundaries, ANR tracker, unresponsive connection isolation, inbound queue
  pruning, and Perfetto/dumpsys observation.
- Useful information:
  - InputChannel is the data path for events; Binder participates in window and
    channel setup but not per-event MotionEvent/KeyEvent delivery.
  - `WOULD_BLOCK` has two meanings depending on state: with empty `waitQueue`,
    the channel may be broken and the dispatch cycle is aborted; with non-empty
    `waitQueue`, App-side consumption/ACK is behind and dispatch stops writing
    more events to that connection.
  - Input ANR timing starts after an event has been written to the target
    connection and moved into `waitQueue`, not when it first enters
    `inboundQueue`.
  - ACK removal path is explicit: callback receives the finished signal,
    dispatch finish command erases the matching `seq` from `waitQueue`, and
    removes tracker entries.
  - Unresponsive connections are isolated via `responsive=false`; monitors and
    foreground touch delivery can skip them, and recovery is based on remaining
    `waitQueue` state.
  - `shouldPruneInboundQueueLocked()` helps a new pointer down for another app
    or responsive spy window advance while an old focus path is blocked.
  - `iq`, `oq:<channel>`, and `wq:<channel>` are Perfetto counters; dumpsys
    adds focused window/app, connection status, queue age, and last-ANR state.
  - The article explicitly narrowed version scope to Android 13-16; Android 10
    uses a different wait model and Android 17 remains unverified.
- SmartPerfetto impact:
  - Very high-value for ANR and input-latency Skills. It gives a precise
    decision tree for `iq` vs `oq` vs `wq`, broken channels, unresponsive
    isolation, recovery, and cross-app pruning.
  - Useful for report quality: `waitQueue` is a symptom and timing basis, not
    by itself proof of Binder, App code, or InputDispatcher as root cause.
- Candidate target:
  - `backend/strategies/anr.strategy.md`,
    `backend/strategies/scrolling.strategy.md`, input/backpressure Skill SQL,
    docs for dumpsys/Perfetto evidence, and regression expectations.
- Status: read, very high-value candidate.

### 067. `part1-fundamentals/ch03-input/08-inputflinger-rust-arr.md`

- Type: InputFlinger Rust InputFilter boundary, bounce/slow/sticky keys,
  C++/Rust FFI, touch-driven ARR/interaction boost path, RefreshRatePolicy, and
  observability boundaries.
- Useful information:
  - Rust in InputFlinger is an InputFilter/accessibility-key-filter
    implementation boundary, not a rewrite of InputReader or InputDispatcher.
  - Current Rust filters target key events: Bounce Keys drops repeated downs,
    Slow Keys intentionally delays key down until threshold, Sticky Keys manages
    modifier state. Touch `MotionEvent` paths are not sent through these Rust
    filters.
  - Slow Keys delay is accessibility semantics, not performance regression. It
    should match configured thresholds and may use InputFilterThread timing.
  - Touch-related ARR does not go through Rust InputFilter. Touch becomes user
    activity/interaction boost, reaches SurfaceFlinger Scheduler touch hint,
    and participates in RefreshRateSelector / frame-rate vote decisions.
  - RefreshRatePolicy is a WindowManager/window vote component, not InputFlinger
    or Rust filter downstream.
  - Debugging should route by event type: KeyEvent/accessibility delays check
    Rust InputFilter and settings; Touch/MotionEvent issues check
    InputDispatcher, PowerManager, SurfaceFlinger Scheduler, App frame budget,
    and ARR device capability.
  - The article is `ready-for-review` / Task2B pending with Task9 needs-rework
    and specific Sticky Keys scope caveats. Use as guardrail, not as final
    authoritative source for all version claims.
- SmartPerfetto impact:
  - High-value as a false-attribution guardrail. SmartPerfetto reports should
    not blame Rust InputFlinger for touch scrolling latency without KeyEvent or
    accessibility-filter evidence.
  - Useful for refresh-rate/ARR conclusions: touch hints, frame-rate votes, and
    Scheduler/SurfaceFlinger evidence are the right path, not InputFilter.
- Candidate target:
  - `backend/strategies/scrolling.strategy.md`, refresh-rate/ARR caveats, and
    input-latency data-gap wording. Avoid durable Android 17 or task-pending
    assertions.
- Status: read, high-value guardrail with review caveats.

### 068. `part1-fundamentals/ch03-input/09-input-latency-budget-perception.md`

- Type: end-to-end input latency budget, HCI perception thresholds, Perfetto
  input-to-frame linkage, refresh-rate budget, low-latency mode validation, and
  scenario-specific thresholds.
- Useful information:
  - User-visible latency is not just InputDispatcher or main-thread time. It
    spans input delivery plus App rendering, SurfaceFlinger/HWC composition, and
    display present.
  - Budget table separates touch sample/driver, EventHub/InputReader,
    InputDispatcher, App main-thread consumption, render submit, and
    SurfaceFlinger/present. Values are references, not universal SLOs.
  - HCI perception and Android engineering metrics must be kept separate. ANR's
    seconds-level threshold is a fault tolerance boundary, not an interaction
    quality threshold.
  - `total_latency_dur` is input dispatch-to-ACK; `end_to_end_latency_dur`
    requires frame/present linkage. Input events without frame association
    should not be used to claim touch-to-display latency.
  - FrameTimeline high-latency states and BufferQueue/SF present lateness can
    produce steady FPS with poor input feedback.
  - Higher refresh rate shortens one-frame present cost but cannot reduce App
    main-thread work, GPU work, or SurfaceFlinger composition by itself.
  - Low-latency/game modes require before/after trace comparison and percentile
    analysis; AOSP GameMode has no public generic "input priority boost" API.
- SmartPerfetto impact:
  - Very high-value for report conclusion quality and scoring. It gives a
    scenario-aware budget model for tap, drag/list, stylus, and game traces.
  - Directly supports data-gap language: if FrameTimeline or input-frame linkage
    is absent, SmartPerfetto can only discuss input dispatch/ACK, not true
    input-to-present.
- Candidate target:
  - Input-latency Skill/report docs, `backend/strategies/scrolling.strategy.md`,
    response/perception conclusion templates, trace regression expectations for
    `total_latency_dur` vs `end_to_end_latency_dur`.
- Status: read, very high-value candidate.

### 069. `part1-fundamentals/ch03-input/10-inputdispatcher-stale-event.md`

- Type: InputDispatcher stale-event detection, drop reasons, stale vs ANR,
  touch gesture protection, window state, and debug workflow.
- Useful information:
  - Stale event handling is a protective drop for old events still pending in
    dispatcher/inbound paths. It is not App consumption, not a business callback
    loss, and not automatically an ANR.
  - Current AOSP main describes stale timeout as a base 10 seconds multiplied by
    `HwTimeoutMultiplier()`, with policy deciding based on event time.
  - Key and motion differ: stale keys can be dropped directly; motion stale
    handling protects active touch/hover gestures so current strokes are not
    blindly cut in the middle.
  - `DropReason::STALE` and the stale log only say an inbound event was
    dropped. Root cause still requires the preceding queue/window/thread
    timeline.
  - Stale timeout, connection ANR, no-focused-window ANR, and blocked drop have
    different observed objects and system actions.
  - Window focus, visibility, touchable regions, pointer capture, touched-window
    state, and stale/drop ordering all matter before blaming app `onClick`.
  - Debug flow: stale log timestamp -> `dumpsys input` queue/focus/connection
    state -> Perfetto input/sched/freq/binder/view/wm/am/gfx/frametimeline ->
    App main-thread or window-state evidence.
  - The article is `ready-for-review` and AOSP-main oriented; version-specific
    `DropReason`/function names and OEM timeout multiplier behavior should be
    verified before hardcoding.
- SmartPerfetto impact:
  - Very high-value for ANR/input reports. SmartPerfetto should treat stale
    events as an input-unresponsive symptom and separate them from true ANR,
    blocked drops, and App callback loss.
  - Useful for report confidence: stale logs without queue/window/thread
    evidence should produce a data-gap caveat rather than a root-cause verdict.
- Candidate target:
  - `backend/strategies/anr.strategy.md`, input/backpressure docs, possible
    stale-event evidence Skill or data-gap branch, and regression expectations
    if traces/log artifacts include stale drops.
- Status: read, very high-value candidate with version caveats.

### 070. `part1-fundamentals/ch03-input/README.md`

- Type: input-chapter index and taxonomy.
- Useful information:
  - Confirms chapter coverage across event dispatch, touch response, gesture
    navigation, prediction/ARR, interception/security, gesture recognition,
    backpressure, Rust/ARR boundaries, latency budgets, and stale events.
  - Several index statements are broader or older than later chapter details
    refine, especially around InputClassifier/InputProcessor, Rust InputFlinger,
    Android 16/17 changes, and gesture-exclusion claims. Use the child articles
    rather than this README as the source of truth.
- SmartPerfetto impact:
  - Low direct implementation value, but useful as an input-domain coverage
    checklist for synthesis.
- Candidate target:
  - Synthesis checklist only.
- Status: read, no direct change candidate; follow child-section caveats.

### 071. `part1-fundamentals/ch04-memory/01-memory-overview.md`

- Type: Android memory model, PSS/RSS/USS/VSS, Java/native/graphics memory,
  procfs, dumpsys meminfo, cgroup, ZRAM, Perfetto memory sources, and common
  memory-analysis pitfalls.
- Useful information:
  - PSS is the best human-facing approximation for per-process system pressure,
    but Perfetto `linux.process_stats` provides RSS/swap counters, not PSS.
    PSS time series require `dumpsys meminfo` snapshots or other explicit PSS
    sources.
  - `lmkd` does not simply sort by PSS; it uses pressure signals such as PSI or
    vmpressure, file cache/thrashing signals, `oom_score_adj`, and optional
    heaviest-task RSS behavior.
  - `onTrimMemory()` and `lmkd` kills are separate paths. Modern Android no
    longer sends several older trim levels to apps.
  - Java Heap, Native Heap, Code mmap, Stack, Graphics/EGL/GL mtrack, Ashmem,
    Unknown, and Dalvik Other need separate interpretation. Bitmap pixel memory
    moved across Java/native boundaries by Android version.
  - Stack virtual reservation should not be confused with resident stack pages.
  - 16 KB pages affect `smaps` page-size fields, RSS/PSS granularity, page
    faults, and baseline memory. A 16 KB baseline increase is not automatically
    a leak.
  - ZRAM metrics have different denominators: physical used, in-swap
    uncompressed amount, and total swap capacity. Capacity pressure should not
    compare physical used directly to total swap.
  - Memory pressure in Perfetto should use `linux.process_stats` for per-process
    RSS/swap, `linux.sys_stats` for system memory, and explicit Java/native heap
    profiling sources where enabled.
- SmartPerfetto impact:
  - High-value for memory-related startup/scrolling analysis and data-gap
    handling. Reports must not call RSS curves PSS, and must distinguish Java,
    native, graphics, ZRAM, and 16 KB baseline effects.
  - Useful for future memory-pressure Skills and report recommendations around
    GC, native heap, graphics buffers, and LMKD.
- Candidate target:
  - Startup/scrolling strategy memory caveats, future memory-pressure Skill
    docs/SQL, and trace regression expectations for Perfetto memory-source
    availability.
- Status: read, high-value candidate.

### 072. `part1-fundamentals/ch04-memory/02-linux-memory.md`

- Type: Linux virtual memory, TLB/page faults, Buddy/SLUB allocation, page
  reclaim, kswapd/direct reclaim, MGLRU, compaction/CMA, DMA-BUF, 16 KB pages,
  and memory safety/large-page caveats.
- Useful information:
  - Page faults are not inherently bugs. Startup and first-touch paths naturally
    trigger faults; refaults after reclaim or ZRAM swap-in can explain latency
    without obvious App code.
  - Perfetto page-fault observation should use `exceptions/page_fault_user` and
    `exceptions/page_fault_kernel` ftrace events, not a generic `mm_page_fault`
    name.
  - kswapd activity, direct reclaim, and direct compaction can affect foreground
    performance even when App main-thread slices look innocent. Direct reclaim
    or direct compaction may show up as D-state waits and allocation-path stack
    frames.
  - MGLRU availability depends on kernel branch, config, and sysfs state. It can
    reduce kswapd/LMK pressure, but enablement is not guaranteed across devices.
  - The article explicitly flags Android 17 ART -> `MADV_COLD` as pending
    verification; do not use that as a confirmed SmartPerfetto rule.
  - Graphics memory uses DMA-BUF/Gralloc/BufferQueue handles, and not every heap
    is physically contiguous. CMA/physical-contiguous requirements depend on
    hardware and IOMMU capability.
  - DMA-BUF allocation delay, GPU memory pressure, buffer cache reclaim, and
    compaction can impact RenderThread or SurfaceFlinger latency.
  - 16 KB page-size changes page fault frequency, TLB coverage, RSS/PSS
    granularity, ELF alignment requirements, and internal fragmentation.
- SmartPerfetto impact:
  - Very high-value for diagnosing jank/startup where memory pressure or
    graphics allocation is the hidden cause: kswapd, direct reclaim,
    compaction, page faults, DMA-BUF, and 16 KB baseline should be separate
    evidence branches.
  - Useful for avoiding false positives: a memory-pressure conclusion needs
    kernel/thread/memory-source evidence, not only a late frame.
- Candidate target:
  - `backend/strategies/startup.strategy.md`,
    `backend/strategies/scrolling.strategy.md`, future memory-pressure and
    graphics-memory Skills/docs, and data-gap language for missing kernel
    ftrace/memory counters.
- Status: read, very high-value candidate with pending MADV_COLD caveat.

### 073. `part1-fundamentals/ch04-memory/03-art-memory.md`

- Type: ART heap spaces, GC collector evolution, Generational CMC boundaries,
  allocation stalls, finalizer/reference queues, TLAB/LOS allocation,
  Baseline/Profile compilation, 16 KB page effects, and Perfetto GC diagnosis.
- Useful information:
  - ART heap analysis must separate Image Space, Zygote Space, Allocation Space,
    Large Object Space, Non-moving Space, and the low-4GB compressed-reference
    window. Each space has different GC and memory-pressure behavior.
  - Android 8-13 mostly map to CC/RegionSpace; Android 14/15 have UFFD Mark
    Compact / CMC paths in AOSP; Android 16 QPR2+ is where official materials
    explicitly describe Generational CMC.
  - Large Object Space routing is not just page-size based. Android 15 uses a
    12 KB threshold for primitive arrays / `String`, with LOS implementation
    selected by allocator/build constraints rather than a simple architecture
    rule.
  - Allocation Stall is distinct from GC pause: it means an application thread
    waits for allocation/GC progress. This can affect frames even when GC slices
    look short.
  - FinalizerDaemon / ReferenceQueue pressure is a separate lock/wait path.
    `ConcurrentMessageQueue` optimizations do not automatically remove
    ReferenceQueue synchronization.
  - Perfetto GC interpretation should use actual slice names and thread tracks:
    `HeapTaskDaemon` for background GC, triggering app thread for foreground
    GC/allocation stall, `AllocObject` for allocation waits, and trace-specific
    GC names such as `ConcurrentCopying` or `MarkCompact`.
  - Baseline/Profile compilation and JIT Code Cache affect startup/runtime
    behavior and memory, but need version-specific interpretation.
  - The appended 2026-05-28 Generational CMC notes include path claims from
    source-index extraction with limited source content; use the reviewed main
    chapter conclusions first.
- SmartPerfetto impact:
  - Very high-value for startup and scrolling reports involving GC, allocation
    stalls, object churn, LOS, finalizers, or ART collector version differences.
  - Strong candidate for deterministic GC/Allocation Stall evidence and report
    guidance so SmartPerfetto can avoid generic "GC caused jank" claims.
- Candidate target:
  - `backend/strategies/startup.strategy.md`,
    `backend/strategies/scrolling.strategy.md`, future ART GC/Allocation Stall
    Skill SQL/docs, and regression expectations for GC slice naming.
- Status: read, very high-value candidate.

### 074. `part1-fundamentals/ch04-memory/04-lmk.md`

- Type: Low Memory Killer evolution, `oom_score_adj`, PSI-driven lmkd,
  kill/reaper path, Go-device behavior, Perfetto/logcat observation, cached app
  freezer, and low-memory UX loops.
- Useful information:
  - Early in-kernel LMK used minfree/adj thresholds; modern Android uses
    userspace `lmkd`, with Android 10+ PSI monitoring as the default pressure
    signal path.
  - `oom_score_adj` maps Android process importance to Linux OOM priority. LMK
    normally targets high-adj cached/service/previous processes before more
    user-visible ones.
  - PSI is about time stalled on memory pressure (`memory.some`/`full`), not
    just free-memory quantity. lmkd also considers watermarks, file cache,
    workingset refault/thrashing, swap, and reclaimable state.
  - Android 16 userspace lmkd kill path can include `reaper.kill()`,
    `pidfd_send_signal()`, and `process_mrelease()`. Kill timestamp and memory
    actually returning to the system may be separated.
  - Frequent LMK kills degrade UX through cold-start loops, not only by freeing
    memory. The evidence chain should include lmkd/logcat/statsd, system memory
    counters, process death, and subsequent cold startup.
  - Modern `onTrimMemory` is not reliable proof of impending kill, especially
    API 34+ where many older levels are no longer delivered.
  - Cached app freezer is distinct from LMK: frozen process track remains but
    threads stop; LMK removes the process and later causes cold start.
  - Several Android 16/17 visibility/MemoryLimiter claims remain marked
    pending verification and should not be used as confirmed behavior.
- SmartPerfetto impact:
  - Very high-value for startup reports where slow launch follows process death,
    and for memory-pressure jank where LMK/reclaim/freezer/cold-start loops
    explain user pain.
  - Useful for distinguishing process killed vs frozen vs app cold start vs
    GC/memory pressure.
- Candidate target:
  - `backend/strategies/startup.strategy.md`, memory-pressure docs/Skills,
    possible process-death/cold-start evidence branch, and trace regression
    expectations for lmkd/meminfo availability.
- Status: read, very high-value candidate with Android 16/17 caveats.

### 075. `part1-fundamentals/ch04-memory/05-app-memory-optimization.md`

- Type: App memory optimization framework, memory churn, Bitmap memory,
  leaks, native memory debugging, `onTrimMemory`, 16 KB page migration, memory
  budgets, and common myths.
- Useful information:
  - Stable strategy hierarchy: reduce allocation, release promptly, avoid
    leaks, and monitor/guardrail. For performance analysis, the most traceable
    part is allocation churn -> frequent GC -> frame-budget pressure.
  - High-refresh devices make GC pauses more visible because the frame budget
    is smaller. A few milliseconds of GC can be enough to miss 120 Hz frames.
  - Object pools can reduce churn for hot paths but can also pin old-generation
    objects; recommendations should be conditional on trace evidence.
  - Bitmap pixels are native from API 26+; Java heap alone is insufficient for
    image-heavy memory diagnosis. Hardware Bitmap shifts pixels into graphics
    memory and still contributes to system pressure.
  - Native memory leaks need `malloc debug`, ASan/HWASan-style tools, or
    `heapprofd`; Java heap tools alone will miss JNI/native allocations.
  - `onTrimMemory` delivery changed substantially in API 34+. Use system-level
    PSI/lmkd/meminfo signals for modern memory pressure instead of relying on
    deprecated trim levels.
  - The article has Task9 P0/P1 pending issues (Coil/BitmapPool version,
    sample code, trim-level/API34+ wording, and 16 KB Bitmap claims). Use only
    stable general principles until the article is reworked.
- SmartPerfetto impact:
  - Medium/high-value for recommendations after deterministic evidence has
    already identified churn, Bitmap/native/graphics memory, or `onTrimMemory`
    limitations. It should not become a source of unsupported app-code advice.
  - Useful for report wording: avoid recommending `System.gc()` or blanket
    object pooling; prefer evidence-backed reduction of hot-path allocations,
    image memory, native allocations, or cache policy.
- Candidate target:
  - Recommendation sections in startup/scrolling/memory reports, possible docs
    for interpreting GC churn and Bitmap/native/graphics memory. Defer direct
    prompt changes until caveats are resolved.
- Status: read, useful but high review-caveat burden.

### 076. `part1-fundamentals/ch04-memory/06-memory-evolution.md`

- Type: Android memory-version evolution across ART/Dalvik, Bitmap storage,
  CC/CMC GC, Scudo, heap limits, MTE, Graphics/memtrack, 16 KB page size, and
  MGLRU.
- Useful information:
  - Version context matters: Android 5 ART/CMS/RosAlloc, Android 8 CC GC and
    Bitmap native-pixel migration, Android 10 generational CC maturity,
    Android 11+ Scudo on many 64-bit/non-svelte paths, Android 15 16 KB page
    support, Android 16 QPR2+ official Generational CMC language.
  - Bitmap/native/graphics accounting changed over time. Android 8+ reduced
    Java heap pressure but not total process/system memory pressure.
  - `largeHeap` only changes Java heap limits. It does not solve native,
    graphics, Bitmap, LMK, or leak problems and can worsen GC costs.
  - Scudo improves native memory error detection but is not a substitute for
    native leak profiling; quarantine behavior and coverage vary.
  - MTE app-facing stable modes are `sync`/`async`; ASYMM is hardware/vendor
    policy, not an app-controlled manifest mode.
  - 16 KB page support changes ELF alignment requirements, page-fault/TLB
    behavior, internal fragmentation, and PSS/RSS granularity; device default
    enablement must be verified.
  - PSS formula is unchanged by page size, but minimum allocation granularity
    changes the memory counted.
  - Task9 has a P1 caveat: CMC/Mark Compact version boundary was written too
    late in places; Android 14 already has relevant AOSP paths. Use the more
    precise 073 entry for collector boundary decisions.
- SmartPerfetto impact:
  - High-value as a version-aware interpretation guardrail. Reports should not
    apply one memory/GC/Bitmap/allocator rule across all Android versions.
  - Useful for data-gap confidence: page size, Android version, collector type,
    Bitmap configuration, and memtrack source need to be part of memory-related
    conclusions.
- Candidate target:
  - Startup/scrolling strategy version caveats, memory report docs, and
    regression expectations for version/page-size metadata.
- Status: read, high-value guardrail with CMC version caveat.

### 077. `part1-fundamentals/ch04-memory/07-16kb-page-size.md`

- Type: 16 KB base page-size compatibility and performance boundary across
  TLB reach, page faults, ELF alignment, linker compatibility, THP/mTHP/contpte,
  and observability.
- Useful information:
  - 16 KB page size can reduce page-fault count and expand TLB reach, but the
    article treats official startup/camera/boot improvements as directional.
    SmartPerfetto should require same-device/build/workload evidence before
    attributing a win or regression to page size.
  - TLB refill and page-table-walk evidence usually needs simpleperf/perf PMU
    counters. Perfetto can show page faults, mmap, scheduling, startup windows,
    and memory pressure, but should not infer TLB behavior from generic iowait
    or CPU slices.
  - Runtime page size should be read from `sysconf(_SC_PAGESIZE)`,
    `getpagesize`, or environment evidence. Avoid hardcoded 4096/16384
    assumptions in report text or analysis rules.
  - Native library compatibility depends on ELF segment alignment. NDK r28 is
    the newer default path; older NDK/library setups may need explicit
    `-Wl,-z,max-page-size=16384` and `-Wl,-z,common-page-size=16384`.
  - Bionic 16 KB compatibility mode lets some 4 KB-aligned ELF binaries run on
    16 KB systems, but it uses anonymous mappings, can increase Private/PSS,
    and does not provide the intended 16 KB performance benefit. Treat compat
    mode as a validation bridge, not a release-performance solution.
  - THP, mTHP, contpte, and 16 KB base pages are separate mechanisms. Their
    availability and effect are kernel/config/device dependent.
  - Task9 caveats remain around `llvm-objcopy` repair advice, Android 17
    tagging, and Android 16 prebuilt alignment test boundaries.
- SmartPerfetto impact:
  - High-value for startup and memory reports. Page-size conclusions need
    explicit page-size, page-fault, mmap, smaps/meminfo, and version evidence.
  - Useful for data-gap handling: do not blame 16 KB page size for a startup or
    memory regression unless trace/device metadata supports that route.
- Candidate target:
  - Startup strategy caveats, memory/system-pressure docs or Skill output
    wording, and future page-size metadata collection checks.
- Status: read, high-value guardrail with review caveats.

### 078. `part1-fundamentals/ch04-memory/08-art-generational-gc.md`

- Type: ART generational GC, WriteBarrier/Card Table mechanics, CMC/
  YoungMarkCompact boundaries, allocation churn, and Perfetto GC-to-frame
  correlation.
- Useful information:
  - Short GC pauses can still matter at 120 Hz or 240 Hz. Concurrent GC CPU
    time can also compete with main/RenderThread even when the stop-the-world
    pause is short.
  - Android collector boundaries are version and flag dependent: concurrent
    copying is the Android 8+ baseline; generational CC/CMC and Android 16/17
    CMC language need device/build evidence before strong version claims.
  - Write barriers mark dirty cards on field/array writes. Young collection
    scans young/mid generations plus dirty or aged old cards, not the entire
    old generation.
  - Large Java arrays/Strings above roughly 12 KB are LOS candidates, while
    Android 8+ Bitmap pixel storage is native/graphics rather than Java LOS.
  - Perfetto stdlib `android.garbage_collection` and
    `android_garbage_collection_events` expose fields such as
    `process_name`, `thread_name`, `gc_ts`, `gc_dur`, `gc_running_dur`,
    `gc_runnable_dur`, and `reclaimed_mb`.
  - Joining GC events with `actual_frame_timeline_slice` by `upid` and time
    overlap can distinguish GC pause overlap, GC CPU contention, and unrelated
    frame jank. High `gc_runnable_dur` means the GC thread was waiting for CPU.
  - Allocation churn proof needs heap profiling or allocation traces; Java heap
    dumps answer retention/leaks, not high-frequency allocation rate by
    themselves.
- SmartPerfetto impact:
  - Very high-value for scrolling/startup analysis and report quality. This is
    a strong candidate for deterministic SQL that links GC slices to Frame
    Timeline and separates pause, runnable delay, reclaimed memory, LOS/big
    Java objects, and Bitmap native/graphics caveats.
- Candidate target:
  - Scrolling/startup strategies plus a GC/frame-overlap Skill or module that
    uses Perfetto stdlib tables when available and falls back cleanly when not.
- Status: read, very high-value Skill candidate.

### 079. `part1-fundamentals/ch04-memory/09-finalizer-referencequeue.md`

- Type: ART ReferenceQueue, FinalizerDaemon, Cleaner, CloseGuard, StrictMode,
  and native-resource lifecycle boundaries.
- Useful information:
  - `ReferenceQueue` and `FinalizerDaemon` are separate stages. GC determines
    reachability and pending references; `ReferenceQueueDaemon` transfers
    references; `FinalizerDaemon` executes `finalize`; application code remains
    responsible for deterministic resource release.
  - Android 16 `ReferenceQueue` still uses an instance lock and FIFO semantics.
    `enqueuePending()` batches references for the same queue with a bounded
    loop, reducing repeated locking but not removing same-queue serialization.
  - Finalizer backlog often looks like "GC did not reclaim memory", but the
    more precise issue is delayed release of FD, native handles, graphics
    buffers, or other external resources held by small Java wrappers.
  - Useful evidence includes FD count slope, `dumpsys meminfo`, native/graphics
    memory, daemon thread stacks, Perfetto daemon-thread CPU overlap, CloseGuard
    and StrictMode logs, and finalizer watchdog messages.
  - Cleaner paths differ by API and implementation: `sun.misc.Cleaner` can run
    in `ReferenceQueueDaemon`, public `java.lang.ref.Cleaner` uses a Cleaner
    daemon thread, and Android system cleaner can route through
    `FinalizerDaemon#doClean`.
  - `CloseGuard` and StrictMode are detection tools, not release mechanisms.
    Reports should recommend `AutoCloseable`/`Closeable`, lifecycle ownership,
    and native-release ownership only when resource-growth evidence exists.
  - Task9 still flags a P0 issue in an extended Cleaner summary. Prefer the
    main verified source-path distinctions over the flawed extension wording.
- SmartPerfetto impact:
  - High-value for memory/leak reports and ANR/jank attribution where
    `FinalizerDaemon` activity overlaps user-facing latency. It should prevent
    simplistic "GC caused leak" or "FinalizerDaemon busy caused jank" claims.
- Candidate target:
  - Memory and scrolling/startup recommendation wording, possible diagnostic
    Skill that reports FinalizerDaemon/ReferenceQueueDaemon CPU windows,
    finalizer watchdog logs if available, and resource-growth data gaps.
- Status: read, high-value resource-lifecycle guardrail with a known extension
  caveat.

### 080. `part1-fundamentals/ch04-memory/10-memory-compaction-direct-reclaim.md`

- Type: Linux memory compaction, page reclaim, ZRAM, high-order allocation,
  PSI/lmkd pressure propagation, and Perfetto/bugreport observability.
- Useful information:
  - Memory compaction, page reclaim, and ZRAM compression solve different
    problems: physical contiguity, available-page quantity, and anonymous-page
    preservation. Reports should not collapse all three into "memory pressure".
  - High-order allocation is about contiguous physical pages, not only total
    free memory. `MemAvailable` alone cannot prove or disprove fragmentation.
  - `kswapd`/`kcompactd` are background maintenance paths; direct reclaim and
    direct compaction run in the allocating thread and can directly add wall
    time to UI/startup/input paths.
  - Direct compaction is not the normal path for order-0 small allocations; it
    is tied to high-order allocation and includes PSI memory-stall accounting.
  - Evidence should combine thread state, ftrace events such as
    `mm_vmscan_direct_reclaim_begin/end` and `mm_compaction_begin/end`,
    `kswapd0`/`kcompactd0` running windows, memory PSI, page faults, ZRAM I/O,
    and optional bugreport files like `buddyinfo`, `pagetypeinfo`, `zoneinfo`,
    `meminfo`, and `pressure/memory`.
  - lmkd decisions are separate from compaction failure. PSI, swap/thrashing,
    file cache, RSS, and `oom_score_adj` determine kill behavior; direct
    compaction failure alone does not prove a process kill cause.
  - App-side recommendations should focus on lowering peaks, releasing native/
    graphics memory, responding to modern memory-pressure signals, and moving
    large allocations out of critical windows. Apps cannot tune kernel
    watermarks, compaction policy, ZRAM algorithm, or lmkd thresholds.
- SmartPerfetto impact:
  - Very high-value for startup/scrolling/ANR cases where the app thread has
    little Java work but waits in kernel memory paths. Deterministic analysis
    should separate background pressure from allocating-thread stalls and avoid
    unsupported fragmentation claims when only `MemAvailable` is present.
- Candidate target:
  - Memory-pressure/low-memory Skill or strategy expansion that detects direct
    reclaim/compaction windows, PSI overlap, daemon CPU windows, and bugreport
    data gaps; report wording for lmkd and system-memory attribution.
- Status: read, very high-value system-memory attribution candidate.

### 081. `part1-fundamentals/ch04-memory/11-cached-app-freezer-gc-boundary.md`

- Type: Cached App Freezer, Binder freezer, GC trigger boundary, lmkd, 16 KB
  page-size interaction, and relaunch/freezer attribution.
- Useful information:
  - Freezer pauses cached-process scheduling to reduce CPU/power. It does not
    release Java heap, native heap, file descriptors, anonymous pages, or mmap
    state.
  - OOM adj is a freezer entry condition, not the same as lmkd kill policy.
    Freezer pauses execution; lmkd kills processes to release memory.
  - Framework may schedule `TRIM_MEMORY_BACKGROUND` and request a runtime GC
    before freeze, but once the process is actually frozen, ART mutator and GC
    threads cannot run. GC slices near a background transition must be placed
    relative to freeze/unfreeze time before claiming causality.
  - Binder freezer affects IPC behavior, not memory release. Synchronous Binder
    into a frozen process can produce `ApplicationExitInfo.REASON_FREEZER`;
    `oneway` calls can queue and later burst or overflow.
  - 16 KB page size changes memory-observation granularity, TLB/page fault
    behavior, and native alignment concerns, but there is no verified AOSP
    branch showing page size changes freezer semantics.
  - Useful evidence includes Perfetto `system_server` `Freezer` track slices,
    `dumpsys activity` frozen state, `ApplicationExitInfo` reasons, GC logs or
    ART GC slices, lmkd/PSI evidence, and Activity launch/relaunch slices.
  - Version boundaries matter: Android 11+ supports cached app freezer;
    Android 14+ improves freezer behavior; `IBinder.addFrozenStateChangeCallback`
    is API 36 and should not be backported conceptually to Android 14.
- SmartPerfetto impact:
  - Very high-value for relaunch, process-death, background, and memory-pressure
    reports. It should prevent unsupported claims such as "freezer triggered
    GC", "freezer released memory", or "slow foreground return equals cold
    start".
- Candidate target:
  - Startup/relaunch strategy and memory/process-death diagnostics. Add a
    freezer/GC/LMK timeline checklist and consider deterministic extraction of
    `system_server` Freezer slices plus `ApplicationExitInfo`/lmkd data gaps
    when available.
- Status: read, very high-value attribution guardrail.

### 082. `part1-fundamentals/ch04-memory/12-zram-compressed-swap-relaunch.md`

- Type: ZRAM compressed swap, kswapd/direct reclaim/lmkd split, relaunch
  latency, swap-in observability, MGLRU/recompression/page-size version
  caveats.
- Useful information:
  - ZRAM is an anonymous-page pressure buffer. It is not lmkd and does not
    decide which process to kill.
  - A process can survive in memory but still relaunch slowly because hot
    anonymous pages were swapped into compressed RAM and must be faulted back
    when the user returns.
  - Split three pressure paths: `kswapd` background reclaim, direct reclaim in
    the allocating thread, and lmkd process kill decisions.
  - ZRAM tradeoffs are compression ratio, decompression latency, and CPU cost.
    Ariadne/hotness-aware swap is research evidence, not an AOSP or SDK
    capability.
  - Useful Perfetto signals include `mem.mm.maj_flt`, `mem.mm.swp_flt`,
    `mem.mm.reclaim`, `kmem/rss_stat`, `linux.process_stats`, `linux.sys_stats`,
    target-thread state, and RenderThread/main-thread overlap.
  - Useful device/API signals include `/proc/pressure/memory`, `/proc/meminfo`,
    `/proc/vmstat` counters such as `pgmajfault`, `pswpin`, `pswpout`,
    `pgscan_kswapd`, and `ApplicationExitInfo` with
    `isLowMemoryKillReportSupported()`.
  - MGLRU, ZRAM writeback/recompression, and 16 KB page size can change results,
    but device kernel/config/vendor policy must be verified.
- SmartPerfetto impact:
  - Very high-value for startup/relaunch analysis and memory-pressure reports.
    SmartPerfetto should distinguish hot/warm/cold/relaunch with swap-in cost,
    and avoid treating "not killed" as "unaffected by memory pressure".
- Candidate target:
  - Startup/relaunch strategy, low-memory Skill or docs, and data-gap handling
    for swap fault/reclaim counters and exit-reason availability.
- Status: read, very high-value relaunch-memory candidate.

### 083. `part1-fundamentals/ch04-memory/README.md`

- Type: Memory chapter overview and reading guide.
- Useful information:
  - Reiterates the memory chain: App allocation, ART GC, trim callbacks, kswapd,
    ZRAM, and lmkd.
  - Broadly points readers to memory model, Linux memory, ART memory, LMK, app
    optimization, and version evolution.
- SmartPerfetto impact:
  - Low direct implementation value; child articles carry the authoritative
    evidence and caveats.
- Candidate target:
  - None beyond preserving the chapter taxonomy in synthesis.
- Status: read, taxonomy only.

### 084. `part1-fundamentals/ch05-cpu-power/01-linux-scheduling.md`

- Type: Linux scheduling, CFS/EEVDF, scheduler classes, nice/priority, affinity,
  cpuset/task profiles, UClamp/SchedTune, Perfetto scheduling diagnostics.
- Useful information:
  - Runnable time is the direct Perfetto signal for scheduling latency. It must
    be separated from Sleep, uninterruptible sleep, lock wait, I/O, and Binder
    reply wait.
  - Compare wall time vs CPU time before calling something a scheduling issue:
    `Wall ~= CPU` points to compute; `Wall >> CPU` points to Runnable or Sleep
    gaps.
  - Perfetto `thread_state` can quantify Runnable waits; `sched` grouped by CPU
    can show big/little placement; CPU frequency tracks show whether power/
    frequency response matched the workload.
  - Scheduler policy classes differ: deadline and RT can preempt fair tasks;
    ordinary Android app threads mostly use fair scheduling with nice/weight
    and task-profile/cgroup effects.
  - On Android, thread affinity and cpuset/task profiles intersect. A thread
    may run on a subset of cores because the process is in background,
    foreground, or top-app cgroups, not because the thread called
    `sched_setaffinity()`.
  - SchedTune is an older vendor-kernel path; Android 12+ GKI paths use UClamp
    and cpu controller profiles. Treat `/dev/stune` and `/dev/cgroot/cpu`
    presence as device evidence.
  - EEVDF is Linux 6.6+; Android 16 mainstream is still generally GKI 6.1/CFS.
    EEVDF fields such as vlag are not exposed by stock Perfetto, so use
    Runnable-duration distribution unless vendor tracepoints/BPF exist.
  - The article's decision framework is directly useful: confirm scheduling
    layer, split Runnable vs Sleep, inspect CPU load, inspect cpuset/UClamp,
    then choose an optimization class.
- SmartPerfetto impact:
  - Very high-value for scrolling, startup, input, and frame-jank strategies.
    SmartPerfetto should report scheduling latency only when thread-state
    evidence supports it and should distinguish CPU saturation, cpuset limits,
    frequency ramp, and app-side lock/Binder/Sleep waits.
- Candidate target:
  - CPU scheduling diagnostic Skill or strategy refinements for startup/
    scrolling/input; add deterministic queries for key-thread Runnable waits,
    CPU distribution, and CPU utilization windows.
- Status: read, very high-value scheduling analysis candidate.

### 085. `part1-fundamentals/ch05-cpu-power/02-eas.md`

- Type: Energy Aware Scheduling, Energy Model, PELT, wake-up placement,
  UClamp/SchedTune inputs, overutilized behavior, and Perfetto observation.
- Useful information:
  - EAS is wake-up placement over fair scheduling: it evaluates capacity,
    task util, Energy Model, and schedutil assumptions to choose an
    energy-efficient CPU. It is not a blanket "use small cores" policy.
  - EAS needs asymmetric CPU topology, an Energy Model, schedutil, and
    frequency/CPU-invariant utilization signals.
  - PELT `util_avg` is normalized to capacity, but vendor devices may use or
    mix WALT/boost hooks. Device kernel evidence matters.
  - `find_energy_efficient_cpu()` handles wake-up placement. Load balancing,
    new-idle balance, and misfit migration have separate paths and should not
    be conflated with EAS energy estimation.
  - Overutilized systems skip energy-aware wake-up placement and fall back to
    performance/normal placement. Linux 6.6 and GKI 6.12 differ in where the
    check lives, but the short-circuit behavior remains.
  - UClamp/SchedTune modifies EAS inputs, not the whole decision. Android
    10/11 often mix schedtune/cpuset/uclamp; Android 12+ default task profiles
    use cpu/uclamp more directly.
  - Perfetto evidence should combine CPU frequency, CPU scheduling, CPU idle,
    key-thread CPU distribution, frequency residency, idle residency, and
    device-specific core topology.
- SmartPerfetto impact:
  - Very high-value for CPU/scheduling attribution. Reports should avoid saying
    "EAS failed" unless the thread was runnable/running on a capacity-limited
    CPU with supporting topology, utilization, frequency, thermal, and cgroup
    evidence.
- Candidate target:
  - CPU scheduling Skill expansion and scrolling/startup/input strategy
    wording: add EAS-specific data gaps for topology, overutilized state,
    cpuset/uclamp profile, frequency residency, and thermal constraints.
- Status: read, very high-value scheduling/power guardrail.

### 086. `part1-fundamentals/ch05-cpu-power/03-big-little.md`

- Type: big.LITTLE/DynamIQ topology, core capacity, migration costs, cpufreq/
  schedutil interaction, RTG/vendor caveats, and Perfetto core-type inference.
- Useful information:
  - Core numbering is device-specific. Use observed/max frequency, sysfs
    `cpuinfo_max_freq`, `related_cpus`, and `cpu_capacity` when available;
    do not assume CPU 0-3 are always little and CPU 7 is always prime.
  - DynamIQ/shared L3 reduces migration cost compared with older cross-cluster
    designs, but migration still has cache and frequency-ramp costs.
  - A thread running on a small core at high frequency can still be slow because
    absolute capacity/IPC/cache differ from larger cores. "High frequency" is
    not enough to prove enough performance.
  - RTG is a vendor-kernel concept, not AOSP/GKI. Similar top-app behavior on
    GKI should be explained through task profiles, cpuset, UClamp, and Power
    HAL unless vendor symbols/evidence are present.
  - Full-big or 2+6 designs reduce the penalty of "wrong core" placement; on
    those devices, frequency and thermal constraints may matter more than
    classic little-vs-big placement.
  - The article still has Task9/Task6 rework notes around GPU/NPU placeholder
    content and some android16-6.12 schedutil/capacity details. Use stable
    topology and analysis principles only.
- SmartPerfetto impact:
  - High-value for report wording and data-gap handling, especially for
    avoiding hardcoded core buckets and for distinguishing core capacity,
    frequency, and thermal ceiling.
- Candidate target:
  - CPU-topology Skill/report docs, strategy data gaps for core topology and
    vendor-kernel caveats. Avoid direct use of the unresolved RTG/GPU/NPU parts
    until independently verified.
- Status: read, useful with active review caveats.

### 087. `part1-fundamentals/ch05-cpu-power/04-dvfs.md`

- Type: DVFS, OPP/cpufreq/schedutil, UClamp/iowait boost, SCMI/CPPC,
  frequency-ramp latency, ADPF, CPU/GPU/memory frequency observation.
- Useful information:
  - DVFS determines how fast a chosen CPU runs; scheduling determines who runs
    where. A frame can miss because frequency was too low even when scheduling
    placement was reasonable.
  - schedutil uses effective utilization, not raw PELT: CFS utilization,
    UClamp, iowait boost, RT/DL bandwidth, IRQ and rate limiting can all shape
    target frequency.
  - Android 15 GKI 6.6 and Android 16 GKI 6.12 differ in `sugov_get_util()`
    paths; avoid hardcoded source-line assumptions in product text.
  - RT/DL tasks do not universally force max frequency on modern uclamp-enabled
    Android kernels. Frequency depends on effective utilization, UClamp, and
    bandwidth constraints.
  - Frequency ramp latency is often dominated by upstream signal formation
    (PELT, rate limit, firmware/governor path), not just PLL/regulator switch
    time.
  - On SCMI/CPPC platforms, Perfetto CPU frequency can represent kernel request
    or mapped outcome, while firmware performance levels may need SCMI ftrace
    events to diagnose request/actual mismatch.
  - ADPF is the app-facing mitigation for governor lag; busy-loop frequency
    hacks should not be recommended.
  - Perfetto stdlib frequency analysis should use
    `linux.cpu.frequency`/`cpu_frequency_counters`; `cpu_frequency_slices` is
    not a standard table.
- SmartPerfetto impact:
  - Very high-value for startup/scrolling/frame analysis. SmartPerfetto should
    separate low frequency, slow ramp, thermal cap, CPU placement, and code
    compute cost instead of reporting generic "CPU slow".
- Candidate target:
  - CPU/DVFS Skill module or strategy refinements that correlate frame/startup
    critical windows with CPU frequency residency, key-thread running cores,
    Runnable/Sleep gaps, and thermal/frequency-cap data gaps.
- Status: read, very high-value DVFS attribution candidate.

### 088. `part1-fundamentals/ch05-cpu-power/05-thermal.md`

- Type: Android thermal management, Thermal HAL/API, cpufreq cooling, vendor
  thermal engines, Perfetto thermal evidence, test methodology, sustained/fixed
  performance modes, and headroom APIs.
- Useful information:
  - Thermal throttling is a frequency/capacity ceiling, not normal utilization-
    driven DVFS. High CPU utilization with falling or capped frequency is the
    key trace pattern.
  - Mitigation and reporting are separate planes: kernel/vendor thermal engine
    may execute cpufreq cooling, hotplug, brightness/charging limits, while
    Thermal HAL/ThermalManagerService reports severity to framework/apps.
  - Perfetto capture should include CPU frequency, `linux.sys_stats`
    `thermal_period_ms`, and ftrace events such as
    `thermal/thermal_temperature`, `thermal/thermal_zone_trip`, and
    `power/cpu_frequency`.
  - `PowerManager.getThermalHeadroom()` is a trend signal toward SEVERE and can
    return `NaN`; Android 16 `SystemHealthManager` CPU/GPU headroom APIs have
    support/interval/NaN caveats and should not be polled blindly on the main
    thread.
  - ProfilingManager in android16-qpr2 does not provide a thermal trigger;
    thermal traces still need manual capture configuration.
  - 16 KB page-size thermal benefits are only a research hypothesis without
    same-device 4 KB/16 KB A/B thermal-zone/frequency/power evidence.
  - Benchmark comparability requires cold/thermal metadata, sustained or fixed
    performance mode awareness, and consistent physical cooling conditions.
- SmartPerfetto impact:
  - Very high-value for long-scroll, game, sustained startup loops, and
    benchmark reports. SmartPerfetto should tag possible thermal interference
    and avoid treating sustained frequency collapse as app-code regression
    without thermal evidence.
- Candidate target:
  - Thermal data-gap/report section in scrolling/startup strategies and a
    trace-capture/template reminder for `thermal_period_ms` and thermal ftrace
    events when sustained performance degradation is suspected.
- Status: read, very high-value thermal attribution guardrail.

### 089. `part1-fundamentals/ch05-cpu-power/06-android-power.md`

- Type: Android power management, PowerManagerService, WakeLock, suspend,
  Doze/App Standby, Battery Historian, JobScheduler/WorkManager, background
  restrictions, and headroom API notes.
- Useful information:
  - WakeLock, suspend blocker, autosuspend, and Power HAL mode are separate
    layers. An app WakeLock is only the framework-level input; system suspend
    depends on native blockers, wake sources, display state, and autosuspend.
  - BatteryStats receives WakeLock events through PowerManagerService/Notifier/
    IBatteryStats; Battery Historian userspace wakelock rows come from this
    accounting path.
  - HWC `onVsyncIdle` is a display idle/resync signal to SurfaceFlinger, not a
    direct PowerManagerService suspend trigger.
  - Doze and App Standby should be checked together. Doze is device-state
    gating; buckets are app-usage/resource gating.
  - Excessive partial WakeLock risk should be framed by Android vitals and
    long-window batterystats/Battery Historian evidence, not a made-up
    one-minute threshold.
  - WorkManager/JobScheduler should replace manual WakeLock for deferrable
    work; expedited work still has quota and bucket interactions.
  - Android 16 headroom API evidence goes through SystemHealthManager/
    HintManager/Power HAL, not PSI/lmkd, and there is no public memory headroom
    equivalent in this material.
  - Task9 has a pending JobScheduler quota wording issue. Android 17
    "Energy Limiter" material is explicitly unverified and should not drive
    product behavior.
- SmartPerfetto impact:
  - Medium/high-value for background power and process-liveness reports, plus
    guardrails against confusing wake locks, display idle, Doze, lmkd, and
    headroom APIs.
- Candidate target:
  - Background/power report wording and data-gap handling. Defer any direct
    Android 16/17 quota or energy-limiter claims until verified from current
    official docs/AOSP.
- Status: read, useful with active version-boundary caveats.

### 090. `part1-fundamentals/ch05-cpu-power/07-cpu-evolution.md`

- Type: Android CPU/power version evolution: JobScheduler, Doze, standby
  buckets, EAS, task profiles/UClamp, exact alarms, FGS, GKI/vendor hooks,
  sched_ext, MTE/SVE2, and Android 16/17 behavior notes.
- Useful information:
  - The stable trend is useful: Android increasingly moves CPU/background
    resource decisions from app-controlled loops/services into system-mediated
    JobScheduler, Doze, buckets, FGS types, exact-alarm permissions, task
    profiles, ADPF, and GKI-controlled scheduler interfaces.
  - EAS adoption should not be written as "Android 10 universally enables EAS".
    Energy Model/kernel/vendor bringup must be verified per device.
  - task profiles and `libprocessgroup` are the bridge between high-level
    process state/hints and cgroup, cpuset, timer slack, and UClamp operations.
  - ADPF/PerformanceHint work-duration hints are not themselves scheduler
    parameters; system/OEM policy maps hints to thread grouping, UClamp,
    cpuset, or Power HAL behavior.
  - Exact alarm version boundaries are subtle: listener-form exact alarms,
    `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, and Android 14 default-deny
    behavior must be kept separate.
  - Perfetto JobScheduler interpretation should separate
    `android_job_scheduler_states` (statsd constraints/bucket/pending) from
    `android_job_scheduler_events` (system_server atrace schedule/execute).
  - GKI does not remove vendor scheduling policy; vendor hooks, UClamp, cpuset,
    task profiles, and future sched_ext can all create device differences.
  - The article has Task9 rework notes around App Standby/Restricted version
    boundaries, exact alarms, sched_ext anchors, and Android 17 idle-alarm
    wording. Treat it as a map of topics, not a source for final version claims.
- SmartPerfetto impact:
  - Medium/high-value as a version-aware guardrail and data-gap checklist.
    Strong SmartPerfetto conclusions still need current AOSP/official-source
    verification for the exact Android version under analysis.
- Candidate target:
  - Strategy/report version-caveat language for background jobs, EAS/UClamp,
    ADPF, and GKI/vendor scheduling differences.
- Status: read, useful timeline with significant review caveats.

### 091. `part1-fundamentals/ch05-cpu-power/08-background-execution.md`

- Type: Background execution limits, Doze/App Standby, FGS types/timeouts,
  WorkManager/JobScheduler/AlarmManager selection, CachedAppOptimizer/Binder
  freezer, and background impact on foreground performance.
- Useful information:
  - Background limits are a framework/API permission and quota layer, not a
    direct scheduler priority layer. Once a background thread is runnable,
    actual CPU placement still depends on process state, cgroups, UClamp,
    thread policy, and device scheduler behavior.
  - `dumpsys deviceidle`, `dumpsys usagestats appstandby`,
    `am get-standby-bucket`, `dumpsys jobscheduler`, Battery Historian, and
    Perfetto serve different purposes. Use dumpsys/Historian for "why did the
    system delay it", and Perfetto for "did it consume CPU or hurt foreground".
  - App Standby buckets and device states interact. Charging and screen state
    can change bucket quota impact; Doze can add maintenance-window constraints.
  - FGS type and timeout rules are user-visible and version-specific:
    `shortService`, `dataSync`, `mediaProcessing`, `Service.onTimeout(...)`,
    while-in-use permission, and background-start exemptions must be separated.
  - Android 16 public JobScheduler pending reason APIs are
    `getPendingJobReason`, `getPendingJobReasons`, and
    `getPendingJobReasonsHistory`; avoid inventing `JobDebugInfo` unless
    current API docs prove it.
  - CachedAppOptimizer/freezer material overlaps with entries 081 and 027:
    freeze/unfreeze, Binder `FrozenStateChangeCallback`, and frozen callback
    policies can explain background process stalls and stale callback handling.
  - The "16KB page GC linked compaction" section is explicitly marked suspect.
    Use entry 081's freezer/GC timing boundary instead of this stale claim.
- SmartPerfetto impact:
  - High-value for background-vs-foreground interference reports and process
    lifecycle attribution, but only after filtering stale freezer/GC claims.
  - Useful to keep background CPU, memory pressure, and thermal throttling as
    indirect foreground-performance causes rather than unrelated power topics.
- Candidate target:
  - Background/process-state strategy notes, report data gaps for Doze/bucket/
    job/FGS/freezer evidence, and foreground-jank interference wording.
- Status: read, high-value with specific stale section to ignore.

### 092. `part1-fundamentals/ch05-cpu-power/09-adpf.md`

- Type: ADPF, PerformanceHintManager sessions, thermal/headroom APIs,
  GameManager/GameState, non-game usage, coroutine/TID binding, and Perfetto
  observation.
- Useful information:
  - Performance hints are a feedback contract: session thread IDs plus target
    duration, then repeated actual-duration reports. Empty sessions or wrong
    target durations can make performance worse.
  - `createHintSession()` binds Linux TIDs. Coroutine thread migration or
    dynamic worker pools require session thread updates (`setThreads()` on
    newer APIs) or constrained execution contexts.
  - System response path is app API to HintManagerService to OEM power hint
    HAL/AIDL; device-specific OEM behavior must be expected.
  - Android 15 adds richer WorkDuration/GPU-bound expression and
    `setPreferPowerEfficiency`; Android 16 adds CPU/GPU headroom APIs and NDK
    workload hints. Public API boundaries and feature flags matter.
  - `SystemHealthManager` CPU/GPU headroom calls are synchronous Binder and can
    take over 1 ms. They belong on worker threads at low frequency, not in a
    frame loop.
  - Thermal headroom (`PowerManager`) and capacity headroom
    (`SystemHealthManager`) are different signals and should not be merged.
  - Game State is for games; non-game workloads should use
    PerformanceHintManager, power-efficiency mode, and headroom APIs directly.
  - Perfetto has no stable public `power.hint_session` trace contract. Prefer
    FrameTimeline, CPU frequency, scheduling, thermal counters/status, and app
    custom trace marks around hint reporting and quality/FPS changes.
- SmartPerfetto impact:
  - High-value for recommendation quality. SmartPerfetto can suggest ADPF only
    after evidence points to governor lag, frame-budget pressure, or sustained
    CPU/GPU capacity management, and should include API/version/device caveats.
- Candidate target:
  - Recommendation sections for scrolling/game/camera/high-FPS reports, plus
    strategy guardrails for distinguishing ADPF from ARR and thermal APIs.
- Status: read, high-value recommendation and caveat source.

### 093. `part1-fundamentals/ch05-cpu-power/10-jobscheduler-workmanager-performance.md`

- Type: JobScheduler/WorkManager scheduling architecture, quotas, expedited
  jobs, UIDT, Perfetto/Battery Historian analysis, Android 16/17 pending-reason
  APIs, and background policy.
- Useful information:
  - JobScheduler evidence splits into constraints/state and execution events.
    Perfetto `android_job_scheduler_states` comes from statsd
    `ScheduledJobStateChanged`; `android_job_scheduler_events` comes from
    system_server atrace `ss`. Do not collapse them into one generic job table.
  - JobScheduler automatically holds a WakeLock between `onStartJob()` and
    `jobFinished()`. App code should not add manual WakeLock unless there is a
    separate justified reason; missing `jobFinished()` is a power bug pattern.
  - Job priority is intra-caller/namespace sorting, not cross-app global
    priority. Quota, constraints, bucket, retry history, and system state still
    gate execution.
  - Restricted Bucket was not part of Android 9's initial bucket model.
    `UsageStatsManager.STANDBY_BUCKET_RESTRICTED` appears later and version
    boundaries must be kept precise.
  - WorkManager scheduler path depends on device API/runtime path: API 23+
    usually `SystemJobScheduler`, older devices `SystemAlarmScheduler`, and
    process-live work can use `GreedyScheduler`.
  - Expedited Work must use `OutOfQuotaPolicy`; UIDT is the right path for
    user-initiated network data transfer, not every urgent task.
  - Android 16 pending reason APIs and Android 17 pending reason stats are
    useful for "why did not run" diagnostics, but API-level boundaries matter.
  - Play/Android vitals excessive partial WakeLock policy is relevant for
    report recommendations: non-exempt partial WakeLocks over 2 hours in 24h
    and bad-session thresholds affect distribution/visibility.
  - The article still has Task9 P1/P2 caveats for WorkManager source version,
    Android 17 Power Check/ProfilingTrace thresholds, chain/periodic overhead,
    and WakeLock policy source details. Treat specific threshold claims as
    data gaps.
- SmartPerfetto impact:
  - High-value for background-power and foreground-interference reports. It can
    guide deterministic extraction/interpretation of JobScheduler state/event
    tables and guard against overconfident "system bug" conclusions.
- Candidate target:
  - Background task diagnostic strategy or docs; add data-gap wording for
    missing statsd/atrace job sources, bucket/quota, and pending reason APIs.
- Status: read, high-value with unresolved Android 17/WorkManager caveats.

### 094. `part1-fundamentals/ch05-cpu-power/11-ondevice-ml-inference-performance.md`

- Type: On-device ML inference, CPU/GPU/NPU/DSP delegates, NNAPI deprecation,
  LiteRT/TFLite pipeline, AICore, model memory/thermal, and Perfetto
  observability.
- Useful information:
  - Default Perfetto usually exposes scheduling, CPU/GPU frequency, memory, and
    thermal symptoms, not model-internal stages. Reliable ML phase attribution
    needs app/native trace instrumentation around preprocessing, inference,
    and postprocessing, plus delegate logs when available.
  - NPU has no universal Android trace track. Vendor tracepoints, delegate logs,
    or PowerStats rails are needed before claiming NPU execution.
  - GPU delegate shares GPU/bandwidth/thermal budget with rendering; apparent
    ML speedups can still cause frame jank if rendering is concurrent.
  - NNAPI is deprecated from Android 15 for direct performance-sensitive
    workloads; migration direction is LiteRT/TFLite in Play Services or higher
    level AICore/SDK paths depending on the use case.
  - XNNPACK CPU baseline is valuable because it is stable and repeatable; do
    not compare delegates without fixed model, input size, quantization, batch,
    thread count, device, and temperature conditions.
  - ML cold-start cost includes model mapping, interpreter initialization,
    delegate binding, NPU firmware/runtime negotiation, and warm-up. It can
    affect startup/page-switch timing if done on the main path.
  - Memory analysis must include native heap, tensors, delegate workspace,
    model mapping, and AICore/private compute service processes; Java heap
    alone misses most ML cost.
  - The article contains conflicting or late-added claims around LiteRT
    CompiledModel V2, AOT, Android 17 NPU feature requirements, AICore routing,
    and benchmark numbers. Use them only after independent source verification.
- SmartPerfetto impact:
  - Medium/high-value for AI-heavy app traces, recommendation sections, and
    data-gap handling. SmartPerfetto should mark ML inference as a possible
    hidden CPU/GPU/memory/thermal source only when trace/log/instrumentation
    evidence supports it.
- Candidate target:
  - Future AI workload diagnostic docs/strategy caveats; do not add direct
    Product behavior from unverified NPU/AOT claims yet.
- Status: read, useful with substantial verification caveats.

### 095. `part1-fundamentals/ch05-cpu-power/12-thermal-management-deep-dive.md`

- Type: Thermal kernel internals, thermal zones/trips/cooling devices,
  `step_wise` and `power_allocator`, Thermal HAL AIDL, ADPF/headroom,
  JobScheduler thermal restrictions, and Perfetto SQL workflow.
- Useful information:
  - Thermal analysis should distinguish thermal zone, trip point, thermal
    governor, cooling device, HAL severity, and framework thermal status. There
    is no simple one-to-one "severity means hotplug" mapping.
  - `step_wise` adjusts cooling state gradually; `power_allocator` computes a
    power budget using PID-style control around sustainable power and current
    temperature error.
  - cpufreq cooling constrains CPU frequency through cooling states/freq QoS;
    devfreq cooling covers GPU/NPU-like devices when supported. Device mapping
    from state to actual frequency is SoC/vendor-specific.
  - Android 14 moved Thermal HAL to AIDL. `IThermal` returns arrays for
    temperatures, cooling devices, thresholds, and callbacks; threshold arrays
    are not a single scalar.
  - `PowerManager.getThermalHeadroom()` is skin-temperature/headroom logic in
    framework and should be sampled slowly; API 35 thresholds and API 36
    CPU/GPU headroom are separate signals.
  - Perfetto thermal attribution should first verify CPU/GPU frequency collapse
    under high utilization, then look for thermal status/trip evidence and
    frame-time correlation.
  - JobScheduler `ThermalStatusRestriction` can restrict lower-priority jobs as
    thermal status rises; this matters for "job did not run" diagnosis.
  - Task9 notes a P1 caveat: Thermal HAL AIDL/headroom API version boundaries
    and Linux thermal source-branch claims are mixed in places. Keep version
    claims conservative.
- SmartPerfetto impact:
  - Very high-value for thermal attribution quality. It reinforces that thermal
    conclusions need frequency/utilization/thermal-source correlation and that
    OEM/vendor paths may bypass clean framework-visible events.
- Candidate target:
  - Thermal report/data-gap wording in startup/scrolling/game/long-run
    strategies; possible deterministic query checklist for frequency, frame
    timing, and thermal counters.
- Status: read, high-value with version-boundary caveats.

### 096. `part1-fundamentals/ch05-cpu-power/13-mobile-llm-dvfs-energy.md`

- Type: Mobile LLM inference DVFS/energy boundary, prefill/decode split, TTFT,
  TPOT, energy-per-token, ADPF/Power HAL limits, and Perfetto/power validation.
- Useful information:
  - LLM prefill and decode have different performance signatures. Prefill is
    more parallel and often GPU/NPU/bandwidth-heavy; decode is token-serial and
    can be sensitive to CPU command submission, KV cache access, short GPU
    kernel latency, and cross-hardware handoff.
  - A low GPU or CPU utilization number during decode does not prove that
    frequency is irrelevant. Governor local signals can miss cross-hardware
    dependency and token latency.
  - The FUSE paper data is useful as an example of governor mismatch on Pixel
    7/Tensor G2, but must not be generalized to other SoCs/delegates without
    reproducing the method.
  - Optimization goals must include TTFT, TPOT, energy-per-token, thermal
    status/headroom, and sustained behavior over time windows, not only average
    tokens/s.
  - Ordinary apps can use ADPF hints, delegate/thread settings, thermal
    headroom, and workload shaping. They cannot directly set CPU/GPU frequency;
    sysfs frequency control belongs to root/system/OEM or lab experiments.
  - Validation should log business token events and system events together:
    prompt/output token count, token completion timestamps, model/delegate/
    thread count, CPU/GPU/memory frequencies, power rails if available,
    temperature, and background interference.
  - Perfetto CPU frequency should combine ftrace `power/cpu_frequency` and
    sys_stats polling where possible, because ftrace events may miss initial
    frequency state.
- SmartPerfetto impact:
  - Medium/high-value for future AI/LLM trace analysis and recommendations. It
    gives a strong guardrail: token-level business instrumentation is required
    before attributing LLM latency to DVFS or thermal behavior.
- Candidate target:
  - Future AI workload report docs or a data-gap section; likely defer direct
    Skill changes unless SmartPerfetto has LLM-specific traces/tests.
- Status: read, useful future-facing AI/DVFS guardrail.

### 097. `part1-fundamentals/ch05-cpu-power/14-android17-ml-runtime-npu-boundary.md`

- Type: Android ML runtime, LiteRT, AOT compilation, NNAPI/NN HAL, and Android
  17 NPU-access boundary notes.
- Useful information:
  - Direct NPU access, high-level LiteRT delegation, vendor SDK paths, and
    framework/HAL capability are separate layers. A feature declaration or
    capability probe is not proof that a specific model executed on NPU.
  - AI workload validation needs stage timing: model load, compile/delegate
    preparation, warm-up, first inference, steady inference, fallback, and
    error paths.
  - LiteRT `CompiledModel` and AOT/AI Pack ideas are useful for explaining
    compile-time and first-inference behavior, but artifacts can be SoC/runtime
    specific and should not be assumed portable.
  - NNAPI NDK deprecation does not mean the lower HAL/driver ecosystem vanished;
    reports should keep API/runtime/delegate/vendor-driver layers separate.
- SmartPerfetto impact:
  - Medium-value future guardrail for AI/ML diagnostics. It can prevent false
    certainty around "NPU available" vs "NPU used" vs "NPU caused latency".
- Candidate target:
  - Future AI inference data-gap wording: request model-stage custom slices,
    LiteRT/delegate logs, fallback evidence, and vendor/runtime traces before
    assigning CPU, GPU, or NPU responsibility.
- Risks/caveats:
  - The article itself records unresolved review issues around the final Android
    17 NPU feature string/SDK constant, NN HAL wording, and vendor
    Tensor/EdgeTPU naming. Cross-check current official Android/LiteRT docs
    before turning any version-specific NPU statement into product guidance.
- Status: read, useful with active verification caveats.

### 098. `part1-fundamentals/ch05-cpu-power/15-sensorservice-batching-power.md`

- Type: SensorService batching, sensor FIFO, wake-up sensor, and AP wakeup power
  behavior.
- Useful information:
  - Sensor power has three distinct costs: physical sampling, sensor
    hub/HAL/FIFO buffering, and AP wakeup plus app callback processing.
  - `samplingPeriodUs` and `maxReportLatencyUs` are different controls. The
    first changes event-generation pressure; the second changes batching and
    delivery pressure when hardware FIFO supports it.
  - SensorService aggregates clients for the same sensor handle. A single
    low-latency client can defeat batching for all clients.
  - Wake-up and non-wake-up sensors have different suspend behavior; batching
    expectations need sensor type, FIFO depth, wakeup behavior, and app lifecycle
    evidence.
- SmartPerfetto impact:
  - Medium/high-value for future power and background-task analysis. This is
    not a current startup/scrolling change, but it gives a precise way to avoid
    blaming the visible app without client-level sensor evidence.
- Candidate target:
  - Future sensor/power diagnostics should ask for `dumpsys sensorservice`,
    Battery Historian or batterystats, Perfetto CPU idle/wakeup evidence, CPU
    frequency, and app callback slices.
- Risks/caveats:
  - Direct Channel is a lower-overhead high-frequency transfer path, not a
    generic power-saving fix. `maxFifoEventCount() = 0` means batching
    expectations are unsupported.
- Status: read, high-confidence guardrail for a future sensor/power surface.

### 099. `part1-fundamentals/ch05-cpu-power/16-gpu-npu-heterogeneous-scheduling.md`

- Type: GPU/NPU heterogeneous offload, ADPF limits, accelerator observation
  layers, and sustained inference power/thermal tradeoffs.
- Useful information:
  - Offload does not make CPU work disappear. Input prep, tensor layout/copy,
    delegate scheduling, synchronization waits, post-processing, and UI submit
    still need to be placed on the same timeline.
  - ADPF expresses app thread workload hints. It should not be described as
    directly forcing GPU or NPU frequency/scheduling.
  - Android-common evidence (`sched`, CPU frequency, FrameTimeline, battery,
    thermal), GPU counters/AGI extensions, and vendor/runtime NPU evidence are
    different observation layers and should not be collapsed into one claim.
  - Sustained inference can compete with interaction and thermal budget, so
    analysis should preserve p90/p99 latency, failure samples, thermal state,
    fallback, and foreground interaction context.
- SmartPerfetto impact:
  - Medium/high-value future guardrail for AI-heavy and heterogeneous-compute
    traces. Without delegate logs, custom slices, or vendor counters,
    accelerator attribution should be classified as a data gap.
- Candidate target:
  - Future AI/accelerator strategy or report data-gap wording, not an immediate
    generic-report change.
- Risks/caveats:
  - The article records unresolved review issues around ADPF Android 15/16 GPU
    duration and workload-hint boundaries. Its Android 17 NPU feature discussion
    conflicts with entry 097, so that fact needs fresh official verification
    before use.
- Status: read, useful with Task9 caveats.

### 100. `part1-fundamentals/ch05-cpu-power/README.md`

- Type: CPU and power chapter overview.
- Useful information:
  - Frames scheduling, EAS, DVFS, thermal, background work, ADPF, and
    heterogeneous compute as an interacting feedback loop.
- SmartPerfetto impact:
  - Low direct implementation value. The child articles contain the actionable
    evidence rules.
- Candidate target:
  - None directly; use only as taxonomy support.
- Status: read.

### 101. `part1-fundamentals/ch06-storage/01-storage-architecture.md`

- Type: Android storage stack overview: UFS/eMMC, block layer, device-mapper,
  partitions, ext4/f2fs, Scoped Storage/FUSE, FBE, Dynamic Partitions, Virtual
  A/B, and write amplification.
- Useful information:
  - Storage-caused startup or interaction latency must be located by layer:
    physical device baseline, block scheduler/queueing, filesystem behavior,
    encryption/mount state, FUSE/MediaProvider path, or OTA merge/background
    writes.
  - For `fsync`/`read` stalls, useful Perfetto evidence includes thread D
    state, `block_rq_issue` to `block_rq_complete`, ext4/f2fs sync events,
    writeback/GC workers, MediaProvider/FUSE activity, `vold`/init mount timing,
    and `update_engine`/`snapuserd` merge work.
  - Scoped Storage needs a version-aware access-path split: MediaStore API,
    Android 11 direct file paths, and Android 12+ FUSE passthrough are related
    but not identical.
  - FBE, metadata encryption, and `/metadata` are separate layers; inline
    encryption usually means encryption is not the primary CPU cost unless the
    device falls back to software paths.
- SmartPerfetto impact:
  - Very high-value for startup and general performance-report data gaps. It
    can improve reports that currently stop at "I/O wait" by requiring evidence
    for the specific storage layer responsible.
- Candidate target:
  - `startup.strategy.md`, possibly `scrolling.strategy.md` and shared report
    guidance: add a storage evidence ladder for main-thread D-state, fsync,
    block queue, filesystem, FUSE/MediaProvider, mount/encryption, and OTA merge.
- Risks/caveats:
  - The article frontmatter records a Task9 needs-rework note around older FBE
    path text and cgroup-v2 I/O wording. The body appears revised, but any exact
    Android version/cgroup claim should still be verified before implementation.
- Status: read, high-value storage architecture source.

### 102. `part1-fundamentals/ch06-storage/02-filesystem.md`

- Type: VFS, ext4, f2fs, EROFS, fsync/fdatasync, f2fs GC/SSR, project quota,
  casefolding, fscrypt/inline encryption, and 16KB page-size filesystem
  constraints.
- Useful information:
  - ext4 `fsync` latency on Android is tied to ordered-mode data-before-metadata
    constraints, delayed allocation, jbd2 commit waits, and background writeback,
    not a generic "filesystem slow" claim.
  - f2fs reduces random-write/fsync pain via log-structured writes, NAT/SIT
    indirection, hot/warm/cold separation, and optional SQLite batch atomic
    write, but foreground GC can still create 50-500ms write stalls when free
    sections are tight.
  - Perfetto should distinguish per-file `*_sync_file` events from superblock
    sync, combine them with D-state waits and block I/O, and treat f2fs GC
    events or kernel logs as stronger evidence than filename-level inference.
  - 16KB page-size devices constrain f2fs format compatibility because f2fs
    block size follows `PAGE_SIZE`; migration/format context matters.
  - EROFS/dm-verity usually has no clean standalone Perfetto slice; attribute
    only with block-layer/device/kernel support and keep dm-verity hash costs
    conservative.
- SmartPerfetto impact:
  - Very high-value for storage-heavy startup reports and any trace where main
    thread stalls in `fsync`, `fdatasync`, `pwrite`, or file reads.
- Candidate target:
  - Strategy guidance for startup/storage sections; possible deterministic Skill
    query for iowait thread ranking and `*_sync_file` evidence if the trace has
    ftrace filesystem events.
- Risks/caveats:
  - The article is finalized and passed tech review, but EROFS/dm-verity
    percentage claims and device-specific file-system adoption still need
    current/device evidence before being used as thresholds.
- Status: read, high-value filesystem evidence source.

### 103. `part1-fundamentals/ch06-storage/03-io-scheduling.md`

- Type: Linux I/O schedulers, ionice/blkio/cgroup controls, Android task
  profiles, page cache, memcg, writeback ownership, Perfetto I/O queries, and
  Android 16/17 storage-stack claims.
- Useful information:
  - Do not infer Android I/O behavior from OS version alone. Check actual block
    device, `/sys/block/<device>/queue/scheduler`, task profile/cgroup, and
    enabled controllers.
  - Foreground I/O latency can come from three distinct places: block scheduler
    dispatch, page cache/memcg reclaim, or cgroup writeback ownership. Treating
    all three as "background I/O stole the disk" is too coarse.
  - Stable Perfetto evidence includes thread D-state with `io_wait = 1`,
    `block_rq_issue`/`complete`, `linux.block_io` queue depth when available,
    filesystem sync events, `writeback:*`, `kswapd`, major faults, and cgroup
    `io.stat`/`io.pressure` from side evidence.
  - The included SQL for top iowait threads is directly reusable as a
    deterministic evidence extractor if SmartPerfetto does not already have an
    equivalent.
- SmartPerfetto impact:
  - Very high-value for preventing over-attribution in startup/scrolling reports:
    identify whether the symptom is storage, memory reclaim, writeback, or
    missing trace instrumentation.
- Candidate target:
  - Add or improve storage/iowait Skill queries and strategy language around
    block queue vs page-cache/writeback boundaries.
- Risks/caveats:
  - Task9 marked this article needs-rework for Android 16/17 io_uring/FUSE,
    dm-verity, and cgroup-v2 details. Use its diagnostic method now, but do not
    import those version claims without fresh official/source verification.
- Status: read, high-value diagnostic method with version-caveat sections.

### 104. `part1-fundamentals/ch06-storage/04-storage-evolution.md`

- Type: Storage subsystem version evolution: FUSE, SDCardFS, Scoped Storage,
  MediaStore/SAF/Photo Picker, EROFS, UFS generations, IncFS, and Android 16/17
  storage claims.
- Useful information:
  - External-storage performance must be interpreted by access path and Android
    version: pre-Android 11 SDCardFS behavior differs from Android 11 improved
    FUSE, Android 12+ FUSE passthrough, MediaStore, SAF, and Photo Picker.
  - Scoped Storage changes are performance-relevant, not just permission
    changes. Provider queries, permission checks, and FUSE/MediaProvider paths
    can explain regressions relative to raw file paths.
  - UFS generation helps set a hardware baseline, but UFS 4.0 does not remove
    software-stack causes such as f2fs GC, fsync patterns, or I/O scheduling.
  - IncFS can explain demand-loaded large-app/game behavior where reads block on
    missing chunks rather than ordinary storage latency.
- SmartPerfetto impact:
  - Medium/high-value as version-aware context for reports, especially when a
    trace includes external storage, media scanning, installs, games, or large
    asset loading.
- Candidate target:
  - Strategy data-gap prompts should ask for Android version, target SDK/storage
    permission path, filesystem/mount info, and device storage generation before
    comparing I/O latency across devices or releases.
- Risks/caveats:
  - Task9 marked Android 17 FUSE-over-io_uring, Android 16 SDM/cloud compile,
    and some 16KB page-size data as needs-rework. Keep those as future research
    notes until independently verified.
- Status: read, useful version-context source.

### 105. `part1-fundamentals/ch06-storage/05-sharedpreferences-datastore.md`

- Type: SharedPreferences/DataStore performance, `QueuedWork`, lifecycle waits,
  ANR stacks, and migration strategy.
- Useful information:
  - SharedPreferences ANRs have two main paths: first-load blocking in
    `awaitLoadedLocked()` and `apply()` writes that are later forced through
    `QueuedWork.waitToFinish()` during Activity/Service/BroadcastReceiver
    lifecycle completion.
  - `apply()` is only asynchronous for the caller. Modern Activity waiting is
    usually in `handleStopActivity()`, not `handlePauseActivity()` except for
    pre-Honeycomb Activity paths. Service and BroadcastReceiver have different
    finish paths.
  - `waitToFinish()` can make the main thread either execute pending
    `writeToDiskRunnable` work itself or wait on `CountDownLatch.await()` for a
    background write. These stack shapes should be distinguished in reports.
  - SP writes are full XML rewrites followed by fsync; risk scales with file
    size, write frequency, queue depth, and storage pressure, not just the
    number of changed keys.
  - DataStore removes `QueuedWork` lifecycle waits and gives better migration
    semantics, but migration is not complete until old SP reads/writes stop.
- SmartPerfetto impact:
  - Very high-value for ANR/startup reports. This can turn generic main-thread
    I/O conclusions into precise SharedPreferences lifecycle-wait diagnoses.
- Candidate target:
  - ANR/startup strategy guidance and possible stack-pattern skill/query for
    `QueuedWork`, `SharedPreferencesImpl.awaitLoadedLocked`, `writeToFile`,
    `CountDownLatch.await`, and `queued-work-looper`.
- Risks/caveats:
  - The article is finalized and passed tech review. Keep exact stack examples
    as pattern guidance, not line-number-dependent claims.
- Status: read, high-value direct diagnostic source.

### 106. `part1-fundamentals/ch06-storage/06-vold-fuse-scoped-storage-io.md`

- Type: `vold`, FUSE, MediaProvider, Scoped Storage, FUSE passthrough, external
  storage I/O path, and app-side optimization boundaries.
- Useful information:
  - `/storage/emulated/0` is not an ordinary filesystem path. `vold` owns mount
    lifecycle; MediaProvider owns shared-file visibility, permissions,
    redaction/transcode policy, indexing, and FUSE decisions.
  - FUSE overhead has four layers: kernel/user FUSE switching, MediaProvider
    policy checks, metadata/cache behavior, and lower filesystem/block I/O.
    Reports should identify which layer is actually slow.
  - FUSE passthrough optimizes file-content read/write transfer after policy
    checks; it does not remove directory enumeration, metadata, permission,
    media index, redaction, transcode, or provider costs.
  - Random read/write and large directory enumeration are high-risk through
    shared external paths. Private app directories or MediaStore/SAF/Photo
    Picker should be selected by data ownership and access pattern.
  - Observability should combine App thread waits, Binder, MediaProvider CPU/DB
    slices, FUSE activity, `vold` only for mount/user-switch/volume issues, block
    I/O, and device configuration including passthrough support.
- SmartPerfetto impact:
  - High-value for traces involving media scanning, file managers, downloads,
    chat media migration, log export, or external-storage regressions.
- Candidate target:
  - Strategy data-gap wording for external storage: require path type,
    Android/kernel/MediaProvider version, filesystem, FUSE passthrough flag,
    access pattern, and MediaProvider/FUSE/block evidence before attribution.
- Risks/caveats:
  - The article is ready-for-review, not finalized. Its Android 15-17 table is
    conservative; any OEM-specific `dumpsys media_provider` fields or 16KB page
    effects need device validation.
- Status: read, high-value external-storage boundary source.

### 107. `part1-fundamentals/ch06-storage/README.md`

- Type: Chapter overview for storage and I/O.
- Useful information:
  - Reframes Android I/O problems as hidden causes of startup latency, D-state
    stalls, low-end device degradation, block I/O waits, and external-storage
    overhead.
- SmartPerfetto impact:
  - Low direct value. Child articles provide the actionable evidence rules.
- Candidate target:
  - None directly.
- Risks/caveats:
  - The overview says FBE can have non-negligible impact; use the more precise
    FBE/inline-encryption caveats from entries 101-102 instead.
- Status: read.

### 108. `part1-fundamentals/ch06-storage/ch06-storage.md`

- Type: Supplemental reference stub for chapter 6.
- Useful information:
  - Points to installation optimization research and Embedded Photo Picker
    material.
- SmartPerfetto impact:
  - Low direct value for current storage strategy work, though installation
    pipeline material may become relevant if install-time traces enter scope.
- Candidate target:
  - None for now.
- Status: read.

### 109. `part2-performance/ch07-smoothness/01-jank-definition.md`

- Type: Jank definitions, FrameTimeline/JankType taxonomy, FPS vs frame pacing,
  user-perceived latency, JankStats, and Binder-to-frame causality.
- Useful information:
  - On Android 12+, start with FrameTimeline `Expected Timeline` / `Actual
    Timeline` and details-panel fields such as `Jank Type`, `Present Type`,
    `On time finish`, `GPU Composition`, and `Layer Name`; only then trace back
    to App `doFrame`, RenderThread, SurfaceFlinger, or Display HAL.
  - `AppDeadlineMissed` can be MainThread, RenderThread, or GPU completion; it
    should not be collapsed to "main thread slow".
  - Binder latency is only causal when constrained to a janky frame window,
    relevant UI/RenderThread client threads, and interval overlap. Global slow
    Binder calls must not be used to infer a frame root cause.
  - FrameTimeline colors are hints, not a stable one-to-one mapping to
    `JankType`; reports should preserve actual type and high-latency state.
  - JankStats is useful for online "where it happens" telemetry; Perfetto /
    FrameTimeline remains the offline "why this frame janked" tool.
- SmartPerfetto impact:
  - Very high-value for scrolling/frame reports and Binder-attribution safety.
    It directly matches SmartPerfetto's need to keep final conclusions evidence
    bounded.
- Candidate target:
  - Strengthen scrolling strategy and any Binder/FrameTimeline skills: require
    janky-frame first, then thread/process evidence, then Binder breakdown.
- Risks/caveats:
  - Finalized and passed tech review after SQL fixes. Still keep Android
    version-specific extended JankType claims tied to observed Perfetto output.
- Status: read, high-value FrameTimeline contract source.

### 110. `part2-performance/ch07-smoothness/02-jank-causes.md`

- Type: Jank root-cause taxonomy across MainThread, RenderThread, SurfaceFlinger,
  system scheduling, GC, thermal, Binder, HWC, and scenario-level analysis tree.
- Useful information:
  - Root cause should be selected by pipeline stage, not by the first long slice:
    MainThread layout/bind/I/O/lock, RenderThread GPU/draw/fence, SF CPU/GPU
    composition, Display HAL, CPU scheduling, GC, thermal, or Binder.
  - HWC composition fallback requires SurfaceFlinger composition trace or
    `dumpsys SurfaceFlinger` evidence; FrameTimeline alone does not expose
    DEVICE vs CLIENT assignment.
  - Runnable delays, core placement, CPU frequency, memory pressure, kswapd/LMK,
    GC, and thermal throttling are system-level causes that can make App code
    appear slow without a direct code hotspot.
  - Binder thread-pool/lock/server-side delays need Flow/Binder evidence and
    target process context, not just a long client slice.
- SmartPerfetto impact:
  - Very high-value as a decision tree for jank reports. It can improve report
    structure: classification first, evidence for selected stage second,
    recommendations last.
- Candidate target:
  - `scrolling.strategy.md` and report contract wording; possible Skill checks
    for SF/HWC caveats, runnable delays, GC/LMK, thermal, and Binder patterns.
- Risks/caveats:
  - The article is finalized, but DeliQueue Android 17 and 16KB page-size
    quantitative claims should remain caveated unless current source/device
    evidence is available.
- Status: read, high-value jank taxonomy source.

### 111. `part2-performance/ch07-smoothness/03-jank-methodology.md`

- Type: Step-by-step jank analysis workflow, trace data-source requirements,
  FrameTimeline method, CPU scheduling analysis, standardized checklist,
  FrameMetrics/JankStats, Perfetto SDK, and SQL recipes.
- Useful information:
  - Analysis starts before the trace: distinguish smoothness vs response vs ANR,
    capture reproduction context, and verify trace contains `sched`, `gfx`,
    `view`, `input`, `wm`, `am`, `dalvik`, and `android.surfaceflinger.
    frametimeline` when needed.
  - Android 12+ should use FrameTimeline Expected/Actual and expected slice width
    rather than fixed 16.67ms/8.33ms thresholds, especially under VRR/ARR.
  - SurfaceView/game/video traces may not be fully covered by App FrameTimeline;
    use BufferQueue, render stages, engine stats, and SF paths.
  - The checklist structure is directly reusable: environment, frame-level
    location, thread-level analysis, scheduling-level analysis, conclusion.
  - SQL examples cover FrameTimeline overrun, CPU time, runnable wakeup latency,
    Binder transaction diagnosis, and large-trace query hygiene.
- SmartPerfetto impact:
  - Very high-value for report quality and skill orchestration. It gives a
    defensible order for evidence collection and data-gap messaging.
- Candidate target:
  - Add strategy guidance to verify data source coverage before using specific
    SQL modules; update scrolling reports to present findings in the five-stage
    checklist order.
- Risks/caveats:
  - Finalized and tech-reviewed. Keep SQL guarded by trace schema/module
    availability; never assume every trace has FrameTimeline or Binder ftrace.
- Status: read, high-value methodology source.

### 112. `part2-performance/ch07-smoothness/04-typical-scenarios.md`

- Type: Scenario playbooks for list scrolling, page transitions, window
  animations, notifications, Launcher/Recents, SurfaceView/video/WebView/map
  cases.
- Useful information:
  - List jank frequently comes from `onBindViewHolder`, ViewHolder inflation,
    image callbacks triggering relayout, GC, RenderThread core placement, or
    SurfaceView BufferQueue issues rather than "RecyclerView" as a single cause.
  - Page transitions require looking at source and target processes plus WMS/SF
    coordination; optimizing only the target layout can miss source-exit or SF
    causes.
  - Dialog/Popup and notification shade jank often combines first inflate/measure,
    object allocation/GC, RemoteViews reinflation, SystemUI main thread, and SF
    composition.
  - Recents thumbnail paths use TaskSnapshot/HardwareBuffer rather than ordinary
    bitmap decode; root cause is often buffer lifetime, GPU sampling, layer count,
    or SF composition.
  - SurfaceView/video/map/WebView cases can bypass normal View traversal and need
    BufferQueue, engine, Chromium, GPU, or MediaCodec-specific evidence.
- SmartPerfetto impact:
  - High-value for scene-specific scrolling and UI jank recommendations. It can
    make SmartPerfetto ask for the right scene context before issuing fixes.
- Candidate target:
  - Scenario-specific sections in scrolling strategy; possible future scene
    classifier hints for list, transition, SystemUI, Launcher/Recents, WebView,
    SurfaceView/video.
- Risks/caveats:
  - The article is ready-for-review with Task9 needs-rework around Predictive
    Back and Fragment timing details. Use stable scenarios now; defer those
    disputed details until verified.
- Status: read, useful scenario playbook with active caveats.

### 113. `part2-performance/ch07-smoothness/05-optimization.md`

- Type: Optimization strategy catalog for layout, RecyclerView, rendering,
  RenderEffect, Binder/threading, task splitting, Compose, prefetch, and
  precomputation.
- Useful information:
  - Optimization recommendations should be tied to the observed bottleneck:
    layout flattening for measure/layout stalls, cache/prefetch/bind changes for
    RecyclerView, RenderEffect/Hardware Layer decisions for rendering, and
    thread/Binder changes for scheduling or IPC stalls.
  - Binder calls are unpredictable enough that sliding, animation, startup, and
    bind paths should use cached/background data and not synchronous per-frame
    calls.
  - Thread-pool cleanup is not only about moving work off main thread; excessive
    background threads can steal CPU time and increase runnable latency for UI
    and RenderThread.
  - RenderEffect and Hardware Layer need target-device validation. Layer size,
    invalidate frequency, blur radius, filter-chain fusion, snapshot creation,
    and GPU memory are the relevant variables.
  - Prefetch/precompute is only helpful when it uses idle time without stealing
    the next frame's budget.
- SmartPerfetto impact:
  - Medium/high-value for recommendations, but less for deterministic diagnosis.
    It should inform suggested fixes only after SmartPerfetto has a proven
    bottleneck.
- Candidate target:
  - Recommendation phrasing in scrolling/report strategies: map diagnosis to
    targeted mitigation and explicitly require before/after validation.
- Risks/caveats:
  - Frontmatter still records Task9 needs-rework with P0/P1/P2 around RenderEffect
    conclusions, RecyclerView API, Hardware Layer, RenderThread priority, Compose
    1.10, AGSL, and Binder API wording. Use only stable principles unless these
    details are re-verified.
- Status: read, useful but implementation details need caution.

### 114. `part2-performance/ch07-smoothness/06-case-studies.md`

- Type: Jank case-study patterns: layout, Binder in bind, GC/memory, RenderThread
  sync, low-memory, SurfaceFlinger/HWC fallback, thermal throttling, and OEM
  optimizations.
- Useful information:
  - Case studies are strongest as evidence-chain templates: symptom -> trace
    location -> root-cause stage -> fix -> before/after validation.
  - Example numeric values are intentionally non-authoritative because original
    traces are not archived; reports should not copy them as thresholds.
  - HWC fallback conclusions require real layer/composition evidence, not a count
    of visible layers. App-clean + SF CLIENT composition + RenderEngine time +
    missed SF frames is the defensible chain.
  - Low-memory jank should combine meminfo/zram, kswapd/lmkd, GC, page fault, and
    process-lifecycle evidence. `onTrimMemory` work must be short and cannot be
    the only cleanup window on cached-process-freezing devices.
  - AnimatedVectorDrawable vs Lottie have different trace signatures; AVD RT
    backlog and UI fallback should not be conflated.
- SmartPerfetto impact:
  - High-value for report narrative and caveat discipline. It reinforces that
    SmartPerfetto should avoid universal thresholds unless tied to trace/device
    evidence.
- Candidate target:
  - Add case-style evidence-chain examples to strategy docs or report guidance,
    especially for Binder-in-bind, RenderThread sync, SF/HWC, and thermal.
- Risks/caveats:
  - The article is finalized and passed review, but its sample metrics remain
    illustrative only.
- Status: read, high-value case-pattern source.

### 115. `part2-performance/ch07-smoothness/07-compose-performance.md`

- Type: Jetpack Compose rendering model, recomposition mechanics, stability,
  `remember`, `derivedStateOf`, SnapshotStateObserver, tooling, Baseline
  Profiles, interop, and animation performance.
- Useful information:
  - Default system trace does not show individual composable functions. Compose
    function-level visibility needs composition tracing (`runtime-tracing`,
    compatible Studio/Compose/API versions); otherwise use FrameTimeline,
    Choreographer, Layout Inspector recomposition counts, Compiler Metrics, and
    Macrobenchmark.
  - State-read scope determines invalidation scope. Delaying reads to layout or
    draw can avoid composition work for high-frequency scroll/animation state.
  - Strong Skipping changes the failure mode: unstable mutable collections may
    either over-recompose when new references are created or fail to refresh when
    mutated in place.
  - Baseline Profiles are a separate first-run/cold-path optimization axis and
    should not be mistaken for recomposition fixes.
  - Compose/View interop can introduce first-creation and lifecycle/disposal
    costs, especially in RecyclerView item scenarios.
- SmartPerfetto impact:
  - Medium/high-value for future Compose-aware jank reports, mainly as a data-gap
    source. Current generic scrolling reports should not claim composable-level
    root cause unless trace/tooling evidence exists.
- Candidate target:
  - Add Compose data-gap guidance: ask whether runtime tracing, Layout Inspector
    recomposition counts, Compiler Metrics, or Macrobenchmark evidence exists
    before making recomposition claims.
- Risks/caveats:
  - Despite `status: finalized`, Task9 notes still mark needs-rework around
    Pausable Composition platform boundaries and RecyclerView/ComposeView
    disposal advice. Verify before using those specifics.
- Status: read, useful with active caveats.

### 116. `part2-performance/ch07-smoothness/08-recyclerview-performance.md`

- Type: RecyclerView internals: dispatch layout phases, ViewHolder caches,
  GapWorker prefetch/deadline logic, DiffUtil, shared pools, nested scrolling,
  ARR velocity reporting, Perfetto slices, SQL, and common pitfalls.
- Useful information:
  - Perfetto does not expose a dedicated RecyclerView track or
    `dispatchLayoutStep1/2/3` slices. Use `RV FullInvalidate`, `RV
    PartialInvalidate`, `RV OnLayout`, `RV Prefetch`, `RV Nested Prefetch`, `RV
    onCreateViewHolder type=...`, and `RV onBindViewHolder type=...`.
  - CachedViews can reuse without bind; RecycledViewPool reuse requires rebind.
    Frequent create slices suggest cache misses; frequent bind slices do not
    automatically mean pool miss.
  - GapWorker follows scroll traversal via `postFromTraversal()` and has create/
    bind deadline checks. `RV Prefetch` without create/bind can mean attached or
    cache hit, or a deadline-based early exit.
  - GapWorker budget does not cover the next frame's item measure/layout. A
    trace can show normal prefetch/bind followed by a long `RV OnLayout`.
  - `setHasFixedSize(true)` concerns RecyclerView's own measured size, not item
    equality or fixed item height.
  - RecyclerView 1.4 reports content velocity for ARR through
    `View.setFrameContentVelocity()` on supported platform paths; it does not
    decide refresh rate by itself.
- SmartPerfetto impact:
  - Very high-value for scrolling analysis. It provides stable slice names,
    cache/prefetch interpretation, and SQL candidates.
- Candidate target:
  - Update scrolling strategy and/or skills to query actual RV slices, interpret
    create/bind/prefetch/onLayout separately, and avoid nonexistent track/slice
    assumptions.
- Risks/caveats:
  - Finalized and passed tech review. Android 17 DeliQueue impact should still be
    framed as MessageQueue/monitor-contention-specific, not a blanket RV fix.
- Status: read, high-value direct scrolling source.

### 117. `part2-performance/ch07-smoothness/09-perceived-smoothness.md`

- Type: perceived smoothness beyond missed-frame/jank metrics.
- Useful information:
  - FrameTimeline green states and stable frame rate do not prove visually smooth
    motion. Users can perceive stutter from uneven displacement step sizes even
    when every frame meets its deadline.
  - `OverScroller` samples animation time in milliseconds through
    `AnimationUtils.currentAnimationTimeMillis()`. On 120 Hz devices, 8.33 ms
    frame periods can become 8/9 ms progress steps, which can create uneven
    scroll displacement in spline-based fling motion.
  - `Choreographer` exposes animation time to app code as
    `frameTimeNanos / NANOS_PER_MS`, so app animation clocks also lose
    sub-millisecond precision.
  - Perfetto can classify frame timing, present fences, SurfaceFlinger, ARR, and
    display-side issues, but it generally does not contain app-specific
    displacement values such as `scrollY` or translation.
  - `AppJankStats` and `RelativeFrameTimeHistogram` are active app-reporting APIs
    and frame-time/deadline histograms, not passive displacement smoothness
    evidence.
  - Input resampling and Android 16 Buffer Stuffing Recovery are separate
    smoothness mechanisms: input resampling affects touch-following prediction;
    buffer-stuffing recovery addresses producer-side buffer dequeue obstruction.
- SmartPerfetto impact:
  - High-value for scrolling reports. When trace evidence shows no missed frames
    but the complaint is visible stutter, reports should avoid overclaiming and
    explicitly ask for app-side displacement sampling or custom trace marks.
  - Useful as a future "perceived smoothness" data-gap strategy: distinguish app
    physics/timing jitter from present/display instability.
- Candidate target:
  - Add scrolling report caveats that separate deadline compliance from
    displacement uniformity.
  - Consider a future instrumentation guide for displacement samples aligned with
    frame timestamps.
- Risks/caveats:
  - Thresholds and perception boundaries are device/workload specific. ARR or
    buffer-stuffing hypotheses still need trace plus app-side evidence.
- Status: read, high-value caveat and future instrumentation source.

### 118. `part2-performance/ch07-smoothness/10-image-bitmap-performance.md`

- Type: bitmap decode, upload, memory placement, and image-library behavior.
- Useful information:
  - Image decode can cause main-thread or background-thread long work, but
    Perfetto only proves decode when there is a custom trace section, a relevant
    callstack such as `BitmapFactory.nativeDecode*`/`ImageDecoder`, or other
    direct evidence.
  - `inSampleSize` is not a precise arbitrary scaler. API docs recommend powers
    of two, while underlying codec behavior is implementation-specific. Use
    `ImageDecoder.setTargetSize()` when exact target size matters.
  - Resource density can silently multiply decoded bitmap dimensions, for
    example mdpi resources displayed on xxhdpi devices.
  - Pixel memory placement varies by Android generation. On API 26+, bitmap pixel
    memory is native again and tracked through `NativeAllocationRegistry`, so a
    lower Java heap number does not mean the process is safe from PSS or LMK
    pressure.
  - Hardware Bitmap moves pixel storage to GPU/AHardwareBuffer and can avoid a
    software-bitmap first-draw upload, but it still goes through DisplayList,
    RenderThread, BufferQueue, SurfaceFlinger, and display composition. It does
    not create an independent SurfaceFlinger layer.
  - `inBitmap` reuse usually returns the same Java object after native reinit,
    but callers must use the returned bitmap and must not assume old dimensions
    or content are still valid.
  - Glide and Coil have different cache/pool models. Glide has
    `LruBitmapPool`, active resources, and memory cache; Coil 2/3 intentionally
    has no bitmap pool and optimizes through sizing and cache behavior.
- SmartPerfetto impact:
  - High-value for image-heavy scrolling/startup analysis. The report should
    separate decode cost, first-upload cost, GPU/HWUI cost, and memory/fd
    pressure instead of collapsing them into a generic "image issue".
  - Helps avoid false positives: a slow frame with an ImageView is not decode
    proof unless the trace/callstack/custom section supports it.
- Candidate target:
  - Add image evidence guidance to scrolling/startup strategies: require decode
    slices/callstacks for decode claims and RenderThread/GPU evidence for
    first-upload claims.
- Risks/caveats:
  - AVIF, Ultra HDR gainmap, hardware bitmap, and library internals have
    device/version-specific behavior. Keep those as conditional hypotheses unless
    the trace or app config proves them.
- Status: read, high-value evidence-boundary source.

### 119. `part2-performance/ch07-smoothness/11-webview-performance.md`

- Type: WebView architecture, rendering, JavaScript bridge, renderer process,
  memory, tracing, and Perfetto interpretation.
- Useful information:
  - Android WebView is Chromium-based but not equivalent to standalone Chrome.
    Browser-side code, GPU service, and Network Service commonly run in the host
    app process, while renderer execution may be in-process on older/low-memory
    cases or out-of-process on modern Android versions.
  - Perfetto analysis needs to separate host app MainThread/RenderThread,
    WebView browser-side threads, renderer threads such as `CrRendererMain`,
    compositor/Viz threads, `CrGpuMain`, SurfaceFlinger, and child-process
    management threads.
  - WebView cold initialization can include provider loading, browser-side
    service setup, and renderer creation. There is no fixed universal ms/MB
    number; compare cold and warm runs.
  - `@JavascriptInterface` methods run on a private background thread, but bridge
    IPC and browser-side synchronization can still affect UI responsiveness.
    `evaluateJavascript()` must be called on the UI thread and returns
    asynchronously; blocking the UI thread waiting for the callback is the ANR
    pattern.
  - The WebView rendering path is conditional. GLFunctor keeps frames in the
    host window path through App RenderThread; SurfaceControl child-surface mode
    can expose an independent child layer when several runtime gates are met.
  - `CrGpuMain` should be treated as a GPU service thread, usually in the host
    process, not as a guaranteed independent GPU process.
  - Renderer crash recovery depends on `WebViewClient.onRenderProcessGone()`.
    The old WebView is unusable after renderer death and must be removed,
    destroyed, and rebuilt. `WebViewRenderProcessClient` adds unresponsive
    renderer callbacks on API 29+.
  - Useful tracing categories include Android `webview` atrace and Chromium
    categories such as `blink`, `blink.user_timing`, `cc`, `gpu`, `v8`,
    `navigation`, and `loading`.
- SmartPerfetto impact:
  - High-value for WebView-heavy traces. Reports need a WebView-specific
    attribution model instead of treating everything as ordinary View traversal
    or standalone Chrome behavior.
  - Useful for classifying JS long tasks, layout/paint, compositor pressure,
    GPU/raster pressure, BufferQueue waits, SurfaceFlinger composition, and
    renderer-process disappearance with explicit evidence requirements.
- Candidate target:
  - Add WebView caveats/evidence requirements to scrolling and responsiveness
    strategies, especially around `CrRendererMain`, `CrGpuMain`, GLFunctor versus
    SurfaceControl, and JS bridge blocking.
  - Consider a WebView-specific scene/skill only if existing traces expose enough
    WebView categories and thread names.
- Risks/caveats:
  - The article itself marks `render_process_gone` trace visibility as
    provider/config dependent and needing real-device validation. Do not hardcode
    that event as always present.
- Status: read, high-value direct source for future WebView-aware analysis.

### 120. `part2-performance/ch07-smoothness/12-view-layout-performance.md`

- Type: View hierarchy, inflate, measure/layout, requestLayout/invalidate,
  ConstraintLayout, ViewStub/merge/include, AsyncLayoutInflater, and View debug
  tooling.
- Useful information:
  - A traversal only runs measure/layout when layout is requested or window/inset
    state requires it. Ordinary invalidation often leaves the expensive work in
    draw.
  - `LayoutInflater.inflate()` cost comes from binary XML parsing, class loading
    and reflection/constructor creation, recursive child inflation, attribute
    setup, and optional `Factory2` interception. Android 15 changed
    `LayoutInflater` constructor caching from a static cache to per-instance
    behavior.
  - `requestLayout()` marks layout-needed state and propagates upward to
    `ViewRootImpl`, schedules traversal through `Choreographer`, and commonly
    triggers measure + layout + draw. `invalidate()` marks dirty drawing state and
    is usually the correct primitive for visual-only changes.
  - Repeated `requestLayout()` in `RecyclerView.Adapter.onBindViewHolder()` or
    custom `onDraw()` is a strong jank smell.
  - ConstraintLayout can reduce nested repeated measure/layout, but it is not
    always faster than simple FrameLayout/LinearLayout; the value depends on
    actual tree depth, constraints, and repeated pass counts.
  - ViewStub avoids initial inflate for rarely shown UI; `<merge>` removes a
    redundant container; `<include>` aids reuse but does not avoid runtime
    inflate unless paired with `<merge>` or replaced with `ViewStub` for rare
    content.
  - `AsyncLayoutInflater` can move XML parsing and View creation off the main
    thread only when the view tree and parent layout params generation are safe.
    Runtime exceptions or `<fragment>` tags commonly cause fallback to UI-thread
    inflate.
  - Perfetto exposes View traversal through `performTraversals`, `measure`,
    `layout`, `draw`, and `Choreographer#doFrame`. It does not identify every
    individual View unless the app adds custom trace or external tools are used.
- SmartPerfetto impact:
  - High-value for generic jank and scrolling reports. It gives precise evidence
    boundaries for layout-root-cause claims: trace-level `measure`/`layout`
    slices prove traversal cost, not necessarily which exact View caused it.
  - Helps define data gaps: ask for custom View trace, Layout Inspector,
    ViewCapture, `gfxinfo`, or business timing when system slices are too coarse.
- Candidate target:
  - Add layout evidence requirements to scrolling/responsiveness strategies and
    avoid naming specific View classes without app-side trace or tooling.
  - Consider SQL snippets for long `measure`/`layout` slices.
- Risks/caveats:
  - Frontmatter is `ready-for-review` and Task9 says `needs-rework`. Use stable
    AOSP-backed mechanics but verify Android 15/17 optimization claims before
    making them report guidance.
- Status: read, high-value with review-state caveats.

### 121. `part2-performance/ch07-smoothness/13-systemui-performance.md`

- Type: SystemUI, notification shade, navigation, launcher/overview boundaries,
  notification binding, Web/Compose-era SystemUI caveats, and Perfetto tracks.
- Useful information:
  - Android 12-17 SystemUI responsibility should be separated from Launcher3
    Quickstep and WM Shell. Notification shade, status bar, navigation bar, and
    lockscreen-related windows are SystemUI; Overview/Recents belongs to
    Launcher3 Quickstep.
  - Window topology should be discovered from WindowManager/SurfaceFlinger
    layers instead of assuming fixed StatusBar/NavigationBar/Shade surfaces.
    `NotificationShadeWindowView` and `NavigationBar` are more reliable anchors.
  - Notification content binding is often async through
    `NotificationContentInflater.AsyncInflationTask` and `applyAsync()` /
    `reapplyAsync()`. Jank may occur after async completion when the main thread
    attaches, measures, lays out, or animates rows.
  - Status-bar notification icon paths differ by Android generation. Android
    12-14 and Android 15+ use different source anchors, but the common evidence
    is bulk icon changes followed by container traversal.
  - Gesture navigation and three-button navigation have different input paths.
    Three-button starts at `NavigationBarView`; gesture back starts at
    `EdgeBackGestureHandler` and `InputMonitorCompat("edge-swipe")`.
  - App launch/overview transitions require combined Launcher3, WM Shell,
    StartingWindow, target app, SystemUI, and SurfaceFlinger timelines.
- SmartPerfetto impact:
  - High-value for reports involving system bars, notification shade, launcher
    transitions, and navigation latency. It reinforces multi-process attribution
    and discourages blaming SystemUI from a single long slice.
- Candidate target:
  - Add SystemUI/Launcher/WM Shell boundary guidance to scenario strategies.
  - Add evidence requirements for notification shade, notification binding,
    navigation gesture, and overview transition findings.
- Risks/caveats:
  - Task9 marks source-anchor issues around multi-display/desktop-mode sections.
    Keep those sections as pending and avoid importing fixed memory/percentage
    claims or foldable desktop details without fresh source validation.
- Status: read, high-value boundary source with source-anchor caveats.

### 122. `part2-performance/ch07-smoothness/14-gaps-dynamic-analysis.md`

- Type: targeted dynamic analysis, static path reconstruction, GUI operation
  generation, Frida hooks, and trace-triggering workflow.
- Useful information:
  - GAPS is a target-method reachability toolchain, not a Perfetto performance
    framework. It reconstructs a path to a target method, translates that path
    into entry/activity/widget actions, and drives the app dynamically.
  - Static reachability and dynamic method execution are separate metrics. The
    paper's static path-generation rate and GUI tester dynamic reachability
    comparisons should not be mixed.
  - Perfetto can be attached as a downstream observer after GAPS drives the app
    near a target method. Frida can inject custom trace markers when the target
    method is reached.
  - The current repository and paper baseline differ. The paper uses
    AndroidViewClient with optional Guardian/Frida; the repo has a built-in LLM
    agent path.
- SmartPerfetto impact:
  - Medium-value for future automated trace reproduction, especially for
    method-specific jank/ANR or scene reachability workflows. It is not an
    immediate skill/strategy content source for trace interpretation.
- Candidate target:
  - Consider future e2e tooling ideas: deterministic GUI path replay plus trace
    marker injection for hard-to-reach scenes.
  - Keep current strategy language explicit that target reachability and
    performance attribution are separate phases.
- Risks/caveats:
  - Task9 notes the reflection/DI/dynamic proxy penetration table is not
    supported by the paper/repo. Do not import those numeric estimates.
- Status: read, useful future tooling reference, not direct report guidance.

### 123. `part2-performance/ch07-smoothness/15-scenario-playbooks.md`

- Type: scenario-based performance troubleshooting playbook covering startup,
  scrolling, page transitions, input latency, surfaces/video, hybrid stacks,
  foreground return, ANR-like hangs, and SQL triage.
- Useful information:
  - Start by classifying the complaint, then define the time window, then choose
    a responsibility chain, then inspect code/tool evidence. This matches
    SmartPerfetto's need to avoid direct root-cause leaps.
  - Android 12+ FrameTimeline is the strong jank entry point. Older Android
    versions need gfx/view/sched slices, FrameMetrics/JankStats, and
    SurfaceFlinger evidence.
  - TTID and TTFD split is central for startup/page-ready reports.
  - Input latency should be separated from missed-frame jank. BufferStuffing and
    high-latency states can feel like "tap no response" even if frame production
    looks smooth.
  - SurfaceView/TextureView/video cases require independent surface, Layer,
    BufferQueue, HWC, SurfaceFlinger, and media-thread evidence, not only UI
    thread evidence.
  - WebView/Flutter/hybrid stacks need host thread and engine/thread evidence.
  - ANR-like reports require system ANR confirmation, `ApplicationExitInfo`,
    `traces.txt`, and pre-ANR timeline reconstruction.
- SmartPerfetto impact:
  - Very high-value for strategy organization. It can drive a top-level report
    decision tree that maps user symptoms to required evidence and next
    analysis branch.
- Candidate target:
  - Use as synthesis input for a scenario triage strategy: classify complaint,
    window, responsibility chain, data sources, and confidence level before
    detailed findings.
  - Consider adding or tightening SQL snippets only after checking current trace
    schema compatibility.
- Risks/caveats:
  - Task9 and Task6 both mark needs-rework. The Android 8-11 fallback atrace
    tags, SurfaceFlinger anchors, BufferStuffing heuristic, and some SQL examples
    need verification before they become shipped guidance.
- Status: read, high-value structure source with technical-caveat filter.

### 124. `part2-performance/ch07-smoothness/16-power-thermal-jank-playbook.md`

- Type: combined jank, power, and thermal troubleshooting entry point.
- Useful information:
  - "Jank", "hot", and "battery drain" map to different time scales and signals.
    Single-frame evidence cannot explain one-hour battery drain, and long-window
    battery stats cannot explain a specific red frame without timeline evidence.
  - Short foreground windows should align FrameTimeline, sched, CPU/GPU
    frequency, thermal status/zones, power rails when available, network, and
    app markers. Long background windows should use BatteryStats/Historian,
    bugreport, jobscheduler, and power dumps.
  - Thermal-caused jank requires evidence that high load persists while CPU/GPU
    frequency ceilings drop or thermal status/trips rise in the same window.
  - WakeLock, WorkManager/JobScheduler, foreground services, location, and
    network retries are background-power paths and should not be conflated with
    foreground rendering root cause unless they overlap the same trace window.
  - Power rail names and availability are device-specific; cross-device reports
    need device, OS, brightness, refresh rate, network, temperature start, and
    scenario duration metadata.
- SmartPerfetto impact:
  - High-value for mixed performance/power reports and confidence grading. It
    gives a clear evidence ladder from user feedback to trace-level proof.
- Candidate target:
  - Add power/thermal caveats to scenario strategies: explicitly grade evidence
    when rails, GPU counters, or thermal data are missing.
  - Consider report wording that separates foreground jank root cause from
    background energy-drain findings.
- Risks/caveats:
  - Medium-high confidence article, but device capability variance is large.
    Treat power rail and GPU conclusions as conditional on actual data-source
    presence.
- Status: read, high-value evidence-grading source.

### 125. `part2-performance/ch07-smoothness/17-fragmenttransaction-commit-jank.md`

- Type: FragmentTransaction timing, FragmentManager queue execution, lifecycle
  side effects, view creation, and page-transition jank.
- Useful information:
  - `commit()` is usually cheap at the call site because it enqueues work through
    FragmentManager and the host main-thread Handler. Jank commonly appears later
    when `mExecCommit` runs, lifecycle moves forward, views inflate/attach, and
    subsequent traversal happens.
  - `commitNow()` and `executePendingTransactions()` move cost to the current
    call site. `executePendingTransactions()` may execute unrelated pending
    transactions, while `commitNow()` is constrained by back-stack rules.
  - `allowStateLoss` changes saved-state semantics, not performance cost. It
    should not be framed as an optimization.
  - Fragment jank should be split into transaction queue handling, `onCreateView`
    inflate, `onViewCreated` side effects, initial RecyclerView binding,
    image/decode work, transitions/shared elements, and queued multi-transaction
    amplification.
  - Custom trace sections are needed to separate `commit()`, destination
    Fragment lifecycle, first bind, and images. FrameTimeline only identifies the
    slow frame, not the Fragment-level root cause.
- SmartPerfetto impact:
  - High-value for page-transition and responsiveness reports. It gives a clear
    evidence boundary: do not blame FragmentTransaction just because a route
    transition janked.
- Candidate target:
  - Add page-transition strategy guidance to inspect queued transaction timing,
    lifecycle/inflate/bind sections, and Navigation/DialogFragment variants.
  - Recommend app-side trace markers for route transitions before making
    Fragment-level root-cause claims.
- Risks/caveats:
  - High-confidence article, but project-specific AndroidX Fragment and
    Navigation versions still matter for detailed behavior.
- Status: read, high-value direct page-transition source.

### 126. `part2-performance/ch07-smoothness/18-hwc-overlay-composition-downgrade.md`

- Type: HWC overlay plane limits, SurfaceFlinger client composition, FrameTimeline
  SF/display jank, layer composition evidence, and device-specific validation.
- Useful information:
  - HWC overlay analysis applies when App MainThread/RenderThread look healthy
    but SurfaceFlinger, HWC, Display HAL, present fences, or power/display paths
    miss deadlines.
  - `DEVICE` composition means hardware/display handles the layer; `CLIENT`
    means SurfaceFlinger/RenderEngine must pre-compose into a client target.
    `CLIENT` is not inherently wrong, but sudden increases can explain jank or
    power regressions.
  - Overlay capacity cannot be reduced to "too many layers". Pixel format,
    dataspace, alpha/blending, crop, transform, scaling, protected content,
    refresh rate, resolution, bandwidth, and vendor policy all matter.
  - Strong evidence combines FrameTimeline jank type, SurfaceFlinger slices,
    Layer trace or Winscope/dumpsys composition type changes, and fence timing.
  - SurfaceView/video/camera/PIP/multi-window/external-display cases need
    SurfaceFlinger and layer evidence because app-side FrameTimeline may be
    incomplete.
- SmartPerfetto impact:
  - Very high-value for SurfaceFlinger/HWC-side findings. It supports a strict
    distinction between App jank and display/composition jank.
- Candidate target:
  - Add HWC/client-composition evidence requirements and caveats to scenarios
    involving video, camera, map, WebView, SurfaceView, PIP, and multiple layers.
  - Consider skills/SQL only if existing trace schema exposes the relevant
    FrameTimeline and SurfaceFlinger/layer data.
- Risks/caveats:
  - Medium confidence and Android 17 pending tag review. Vendor HWC policy and
    overlay plane counts require same-device trace/dumpsys validation; no generic
    app API can prove them.
- Status: read, very high-value display-composition source.

### 127. `part2-performance/ch07-smoothness/README.md`

- Type: chapter index and reading guide.
- Useful information:
  - Confirms chapter 7's core framing: user "lag" can mean dropped frames, input
    latency, blocked rendering, system load, or near-ANR conditions.
  - The index currently lists up to 7.15 and does not include the later 7.16-7.18
    files that are present in the corpus.
- SmartPerfetto impact:
  - Low direct implementation value, but it reinforces the same top-level
    classification model that SmartPerfetto reports should use.
- Candidate target:
  - No direct Skill/Strategy change from this file alone.
- Risks/caveats:
  - Index appears stale relative to the actual directory contents.
- Status: read, index-only.

### 128. `part2-performance/ch07-smoothness/ch07-smoothness.md`

- Type: short reference-material stub.
- Useful information:
  - Contains a pointer to Android 17 DeliQueue/MessageQueue research: lock-free
    producer path, min-heap consumer, tombstones for cancellation, possible
    lock-contention wins, and breaking changes around `mMessages`.
- SmartPerfetto impact:
  - Low direct value because detailed scheduling and MessageQueue treatment has
    already appeared in earlier entries. Use only as a reminder to handle
    Android 17 MessageQueue/DeliQueue claims as version-specific.
- Candidate target:
  - No direct change from this stub.
- Risks/caveats:
  - Source is a technical article summary, not primary AOSP verification.
- Status: read, reference-only.

### 129. `part2-performance/ch08-responsiveness/01-responsiveness-principles.md`

- Type: responsiveness principles, RAIL, input-to-pixel path, Android Vitals,
  perceived speed, MotionPredictor, and end-to-end latency.
- Useful information:
  - Responsiveness is the full user-action-to-visual-feedback path, not only
    main-thread health. The path spans InputReader/InputDispatcher/InputChannel,
    app main-thread handling, Choreographer/doFrame, RenderThread,
    SurfaceFlinger, HWC, and display.
  - Input event delivery uses InputChannel/socket transport for motion events.
    Binder is involved in window/InputChannel setup, not every MotionEvent.
  - RAIL's 100 ms response target is useful as perception guidance, while
    animation budgets should follow actual expected deadlines under dynamic
    refresh/ARR rather than fixed 16.67 ms or 8.33 ms constants.
  - TTID and TTFD are launch-specific response metrics; TTFD depends on
    `reportFullyDrawn()`.
  - MotionPredictor is a public API from Android 14. It compensates rendering
    position, not actual input dispatch latency.
  - UIL/INP-style P99 targets can be internal engineering goals, but should not
    be stated as official Android Vitals or Play ranking signals.
- SmartPerfetto impact:
  - High-value for response-latency reports. It reinforces an end-to-end latency
    chain and prevents reducing "slow response" to UI-thread work only.
- Candidate target:
  - Add response-latency strategy wording that decomposes input delay,
    app-processing/rendering, and composition/display before root-cause claims.
- Risks/caveats:
  - Task9 notes TTID/TTFD Android 12 attribution and RAIL Load threshold issues.
    Use the corrected version boundaries, not older Android 12 claims.
- Status: read, high-value response-chain source with version caveats.

### 130. `part2-performance/ch08-responsiveness/02-app-launch.md`

- Type: Android app launch pipeline, cold/warm/hot starts, TTID/TTFD,
  ApplicationStartInfo, `am start -W`, Perfetto startup tracing, application
  initialization, first-frame rendering, and startup profiles.
- Useful information:
  - Cold, warm, and hot starts have different process/Activity reuse states and
    different optimization surfaces. `BindApplication` is a key cold-start
    signal; warm/hot paths need different interpretation.
  - TTID ends at first-frame completion, while physical display can still lag
    SurfaceFlinger/HWC. TTFD ends at `reportFullyDrawn()` and should represent
    content actually ready for use.
  - Android 15 `ApplicationStartInfo` exposes start type, reason, startup state,
    and timestamp keys such as launch, fork, bind application, application
    onCreate, first frame, fully drawn, and SurfaceFlinger composition complete.
  - ApplicationStartInfo timestamps are uptime-like, while Perfetto commonly uses
    boottime. Cross-clock conversion or internal timestamp deltas are required.
  - `atrace_categories` and `atrace_apps` need to be configured deliberately:
    system_server AM slices and app-side view/gfx/dalvik slices have different
    enablement requirements.
  - ContentProvider initialization runs before Application.onCreate and can hide
    startup cost.
  - Baseline Profile, Cloud Profile, and Startup Profile/DEX layout are separate
    mechanisms with different distribution and verification paths.
- SmartPerfetto impact:
  - Very high-value for existing startup analysis. It directly supports clearer
    phase boundaries, timestamp caveats, Android 15 structured-startup evidence,
    and trace collection requirements.
- Candidate target:
  - Update startup strategy guidance to account for ApplicationStartInfo clock
    domains and timestamp keys when available.
  - Add data-gap wording for missing `reportFullyDrawn()`, missing app atrace
    slices, and hidden ContentProvider initialization.
- Risks/caveats:
  - Task9 flags a P1 around Android 11+ first-frame Surface creation and
    BLASTBufferQueue, plus P2 around ApplicationStartInfo keys and 16 KB page
    size data. Verify those before importing exact first-surface mechanics.
- Status: read, very high-value direct startup source.

### 131. `part2-performance/ch08-responsiveness/03-launch-optimization.md`

- Type: startup optimization strategies: lazy/async initialization, SplashScreen,
  DAG task scheduling, ContentProvider/App Startup, layout, AsyncLayoutInflater,
  Baseline/ProfileInstaller/Startup Profile, monitoring, and version evolution.
- Useful information:
  - Optimize TTID and TTFD separately. TTID focuses on first-frame synchronous
    startup path; TTFD includes content/data readiness and correct
    `reportFullyDrawn()` timing.
  - Delay or lazy-load non-critical SDKs and modules, but only after dependency,
    thread-safety, UI-thread use, and failure/fallback behavior are understood.
  - App Startup consolidates initializer discovery and dependency ordering, but
    does not automatically parallelize independent initializers. Custom DAG
    schedulers must manage thread pools, main-thread nodes, timeouts, and
    monitoring.
  - ContentProvider auto-init must be found in the merged manifest. Removing or
    delaying providers can reduce pre-Application startup work.
  - SplashScreen improves perceived startup but does not reduce actual
    BindApplication-to-first-frame time.
  - Baseline Profile, Cloud Profile, and Startup Profile are distinct: AOT
    compilation, Play cloud distribution, and DEX layout/page-fault reduction.
    Verify release packaging and device-side compilation state rather than only
    checking files exist.
  - Online monitoring should track percentiles, seconds-open rate, phase timing,
    and regression detection instead of averages.
- SmartPerfetto impact:
  - High-value for recommendations after startup root cause is proven. It helps
    map trace evidence to safe, evidence-bound fixes without generic advice.
- Candidate target:
  - Use as recommendation vocabulary in startup reports: delay/lazy init,
    provider cleanup, layout reduction, SplashScreen perception, profile
    verification, and CI/online regression monitoring.
- Risks/caveats:
  - Despite finalized/pass-tech-review state, many optimization benefits are
    workload-specific. Report recommendations must remain conditional on the
    trace phase proven slow.
- Status: read, high-value startup recommendation source.

### 132. `part2-performance/ch08-responsiveness/04-other-scenarios.md`

- Type: non-launch responsiveness scenarios: Activity/Fragment navigation, Tab
  switching/ViewPager2, click response, search debounce/cache, and Perfetto
  instrumentation.
- Useful information:
  - Activity navigation crosses app, system_server, and target process; Android
    10+ uses ActivityTaskManager, Android 9+ target launch uses ClientTransaction,
    and Android 8.x has older scheduling paths.
  - Fragment navigation is cheaper than Activity at the system boundary but can
    be slower if inflate, lifecycle work, first bind, data loading, or transition
    work is heavy. FragmentManager does not guarantee built-in Perfetto slices;
    business trace markers are needed.
  - ViewPager2 uses RecyclerView and `FragmentStateAdapter`. Default
    `offscreenPageLimit` is -1; 0 is invalid; custom LayoutManager replacement is
    not public API. Lazy loading should use lifecycle/visibility, not legacy
    `setUserVisibleHint()`.
  - Click response includes hardware, InputDispatcher/InputChannel, main-thread
    queueing, view dispatch, and visual feedback. Ripple begins on ACTION_DOWN
    and can improve perceived response even if later click work continues.
  - Search-as-you-type should use debounce, distinct, latest-cancel semantics,
    cache, preloading, and pinyin/indexing where applicable.
- SmartPerfetto impact:
  - High-value for response/page-transition reports. It gives scenario-specific
    evidence requirements and prevents overgeneralizing launch analysis to every
    interaction.
- Candidate target:
  - Add response scenario guidance: Activity vs Fragment vs Tab vs click vs
    search have different required markers and evidence chains.
- Risks/caveats:
  - Finalized/pass-tech-review. Still keep specific version/API details tied to
    AndroidX/platform versions in report text.
- Status: read, high-value direct response-scenario source.

### 133. `part2-performance/ch08-responsiveness/05-case-studies.md`

- Type: response/startup case studies covering Baseline Profiles, R8 full mode,
  large-app startup task scheduling, page-transition optimization, AutoFDO,
  16 KB pages, and ProfilingManager.
- Useful information:
  - Strong case-study format: problem background, measurement baseline, trace or
    benchmark analysis, staged fixes, result, caveats, and transfer lesson.
  - Public optimization numbers should remain tied to their original measurement
    context. Do not reuse Reddit, Disney+, AutoFDO, or 16 KB page-size numbers as
    SmartPerfetto thresholds.
  - R8 migration needs both optimized rules and full-mode/compat-mode property
    checks; file name alone does not prove behavior.
  - Page-transition case reinforces phased attribution: click handler, Binder,
    Activity/Fragment creation, lifecycle work, layout, draw, and first frame.
  - Android 15+ `ProfilingManager` can request system traces, heap dumps, heap
    profiles, or stack sampling, but system-triggered traces are sampling and
    policy constrained.
- SmartPerfetto impact:
  - Medium/high-value as report-writing and recommendation structure. It helps
    avoid unsupported universal benchmarks while preserving evidence-chain
    storytelling.
- Candidate target:
  - Use the case-study structure for final report templates: baseline, evidence,
    fix candidate, validation, residual risk.
  - Consider ProfilingManager as future data-collection guidance, not current
    trace-analysis proof.
- Risks/caveats:
  - Many figures come from public talks/blogs or illustrative app composites. Use
    them only as source-specific examples, never as general thresholds.
- Status: read, useful structure and startup/response examples.

### 134. `part2-performance/ch08-responsiveness/06-coroutine-performance.md`

- Type: Kotlin coroutine performance, dispatcher behavior, structured
  concurrency, Flow backpressure, Perfetto tracing, ADPF boundaries, and custom
  dispatcher scenarios.
- Useful information:
  - `Dispatchers.Main` posts to the main Looper; `Default` is a CPU-oriented
    work-stealing scheduler; `IO` shares the scheduler with Default but allows
    blocking compensation up to its parallelism limit; `Unconfined` has
    unpredictable resume threads.
  - Coroutine dispatch overhead is usually smaller than queueing and actual
    work. Pathologies are frame-internal high-frequency dispatch, many tiny
    short-lived coroutines, and dispatcher saturation.
  - Structured concurrency prevents lifecycle leaks; `GlobalScope` can create
    persistent CPU/network/memory work.
  - Flow backpressure choices should match semantics: default suspend for full
    delivery, `conflate` for latest-only UI state, `buffer` for throughput with
    bounded memory, `collectLatest` for cancel-replace work such as search.
  - Android-side coroutine attribution in Perfetto needs app trace markers,
    async sections across suspend boundaries, debugger coroutine state, and CPU
    profiler/simpleperf. `kotlinx-coroutines-debug` is not an Android device
    tracing solution.
  - ADPF sessions bind to thread IDs, not coroutine IDs. Thread migration on
    shared dispatchers can make static TID binding stale. ADPF Binder reporting
    should not be called per-frame in high-frequency paths.
- SmartPerfetto impact:
  - Medium/high-value for responsiveness reports where background workers,
    coroutine dispatch storms, or leaked jobs compete with UI work. It mainly
    informs caveats and data gaps because coroutine identity is not available in
    normal traces.
- Candidate target:
  - Add strategy guidance to identify dispatcher thread saturation and require
    app-side coroutine trace markers before naming a coroutine as root cause.
- Risks/caveats:
  - Task9 marks needs-rework. Kotlin 2.2 performance numbers, ADPF version
    boundaries, and flagged APIs need current source verification before use.
- Status: read, useful with active technical caveats.

### 135. `part2-performance/ch08-responsiveness/07-baseline-profiles.md`

- Type: Baseline Profiles, ART profile-guided compilation, Startup Profile/DEX
  layout, Cloud Profiles, ProfileInstaller, ProfileVerifier, dexopt validation,
  Compose profiles, and AutoFDO separation.
- Useful information:
  - Separate Android 7 local JIT/profile/background dexopt, Android 9+ Google
    Play Cloud Profiles, and developer-provided Baseline Profiles.
  - HRF `baseline-prof.txt`, packaged binary `baseline.prof`/`.profm`, installed
    OAT/VDEX outputs, and `/data/misc/profiles` runtime profiles are distinct.
  - Installation source changes when profiles are consumed. Google Play, AGP
    8.4+ non-debuggable installs, older AGP, and sideload/ProfileInstaller paths
    need different verification.
  - Verify package contents first, then device compile state (`ProfileVerifier`
    or `dumpsys package dexopt`), then startup benefit with Macrobenchmark
    comparing `CompilationMode.None()` and `CompilationMode.Partial()`.
  - Startup Profile/DEX layout and 16 KB page-size native alignment are separate
    mechanisms.
  - Compose apps should generate app-specific profiles in addition to relying on
    library-provided Compose profiles.
- SmartPerfetto impact:
  - High-value for startup recommendation quality. It provides concrete
    validation commands and prevents confusing "profile is packaged" with
    "device has speed-profile compiled code".
- Candidate target:
  - Add Baseline Profile verification wording to startup recommendations and
    avoid claiming profile benefit unless compile state and benchmark comparison
    are available.
- Risks/caveats:
  - Finalized/pass-tech-review, with one P2 suggestion on quantified gains.
    Keep quantified effects source-specific.
- Status: read, high-value startup/profile validation source.

### 136. `part2-performance/ch08-responsiveness/08-media-pipeline.md`

- Type: Android multimedia pipeline: MediaCodec, Surface/BufferQueue,
  SurfaceView/TextureView/tunneled playback, fences, Media3/ExoPlayer, ABR,
  AudioFlinger/AAudio/MMAP, low-latency decoding, and Perfetto media analysis.
- Useful information:
  - MediaCodec Surface output avoids CPU pixel copies but the consumer path
    matters: SurfaceView can go directly to SurfaceFlinger/HWC; TextureView
    routes through SurfaceTexture and App RenderThread/GPU; tunneled playback
    uses sideband/HWC paths on capable devices.
  - BufferQueue and Sync Fence evidence is needed to separate decode delay,
    queueing, render/composition delay, and present/fence delay.
  - Async MediaCodec callback mode avoids blocking polling loops and is generally
    safer than synchronous `dequeue*` waits on critical threads.
  - Media3 buffer/load-control and ABR decisions are scenario tradeoffs:
    startup latency, rebuffer risk, memory, quality oscillation, and player pool
    size all interact.
  - Audio latency depends on AudioFlinger mixer path, Fast Mixer eligibility,
    AAudio/MMAP support, app buffer size, HAL, and scheduling. Underrun analysis
    needs audio thread scheduling, GC, lock, and mixer evidence.
  - Multimedia traces need `audio`, `video`, `camera`, `gfx`, `view`, `sched`,
    and `freq` as available; there is no generic `media`/`codec` atrace category.
- SmartPerfetto impact:
  - High-value for video/audio/media-scene reports, especially to avoid blaming
    UI thread when decode, BufferQueue, SurfaceFlinger/HWC, or AudioFlinger is
    the actual path.
- Candidate target:
  - Add multimedia evidence boundaries to scenario strategies: Surface path,
    decoder, buffer/fence, RenderThread, SurfaceFlinger/HWC, and audio mixer
    evidence must be separated.
  - Treat media SQL snippets as candidates only after schema/source validation.
- Risks/caveats:
  - Task9 has P0 queue items. Some injected supplemental sections conflict with
    the main text, especially Codec2 defaults, tunneled details, ABR timing, and
    fixed numeric gains. Use only stable API/path distinctions until reverified.
- Status: read, high-value but requires strict caveat filtering.

### 137. `part2-performance/ch08-responsiveness/08-system-triggered-profiling.md`

- Type: ProfilingManager system-triggered profiling, triggers, artifacts,
  version/extension gating, result delivery, redaction, and local validation.
- Useful information:
  - Android 15 has manual `ProfilingManager.requestProfiling()`; Android 16 adds
    system-triggered triggers. Results come through
    `registerForAllProfilingResults()`, not a request-scoped callback.
  - Trigger type determines artifact and tool: `APP_FULLY_DRAWN` and `ANR`
    return running system trace snapshots, `COLD_START` records a new trace plus
    stack sampling, `OOM` returns Java heap dump, and `ANOMALY`/`APP_COMPAT`
    artifacts vary by tag and file type.
  - `APP_FULLY_DRAWN` and `COLD_START` are different windows. The former is a
    snapshot after `reportFullyDrawn()`; the latter starts early in cold launch
    and stops at `reportFullyDrawn()` or a default cutoff.
  - OOM trigger is Java OOM, not LMK/lmkd. Excessive CPU trigger is tied to
    `ApplicationExitInfo.REASON_EXCESSIVE_RESOURCE_USAGE`, not public CPU
    percent thresholds.
  - Results are redacted by default; local validation has Android 15 versus 16+
    device_config differences and testing package switches.
- SmartPerfetto impact:
  - Medium/high-value as future evidence-collection guidance for startup, ANR,
    excessive CPU, OOM, and anomaly cases. It is not current trace interpretation
    evidence unless such artifacts are provided.
- Candidate target:
  - Add collection recommendations to ANR/startup docs or report data gaps:
    request/register the right trigger, inspect artifact type first, and avoid
    treating every trigger as a Perfetto trace.
- Risks/caveats:
  - Frontmatter says finalized but `task9_result` still says needs-rework. Verify
    current API levels and extension gates before shipping detailed code.
- Status: read, useful future collection source.

### 138. `part2-performance/ch08-responsiveness/09-game-performance.md`

- Type: game performance, Game Mode/State APIs, AGDK, Swappy, ADPF, headroom,
  Performance Tuner, OEM interventions, game trace analysis, thermal, and GC.
- Useful information:
  - Games are continuous full-load rendering workloads; frame-time distribution,
    P95/P99, thermal stability, CPU/GPU frequency, and present timing matter more
    than average FPS.
  - Game Mode reads user preference; Game State reports scene/loading state.
    They are not generic CPU pinning or scheduling guarantees.
  - AOSP-visible `GAME_LOADING` boost is bounded and conditional, not a whole
    match-long performance override.
  - Swappy/frame pacing and ADPF are distinct: one controls submit/display
    pacing, the other reports work duration and resource needs. They should not
    be collapsed into a single deadline API.
  - Native games should be read through FrameTimeline, app Surface layer,
    SurfaceFlinger, Swappy, GPU render stages/counters, CPU/GPU frequency,
    thermal/headroom, and scheduler state. `Choreographer#doFrame` may only
    describe UI shell segments.
  - OEM game overlays/interventions must be isolated in test design before
    attributing gains to the game or platform API.
- SmartPerfetto impact:
  - Medium/high-value for game traces and any future game scene. It mostly
    contributes scenario-specific evidence requirements and caution around OEM
    interventions and API semantics.
- Candidate target:
  - Add game-scene caveats if SmartPerfetto handles native game traces: use
    Surface/FrameTimeline/present evidence and thermal/frequency/headroom, not
    only UI-thread slices.
- Risks/caveats:
  - Task9 marks needs-rework. Public gains, ADPF/coroutine IPC estimates, Vulkan
    details, and OEM behavior need verification before becoming strategy text.
- Status: read, useful with technical caveats.

### 139. `part2-performance/ch08-responsiveness/11-native-library-loading-dynamic-linker.md`

- Type: native library loading, Bionic linker, Linker Namespace, 16 KB page-size
  compatibility, third-party SDKs, hook SDK risks, MTE, and CI validation.
- Useful information:
  - Startup native loading commonly happens in Application/ContentProvider init,
    static initializers, framework runtimes such as React Native/Flutter/Unity,
    and first-use feature modules.
  - `System.loadLibrary()`/`dlopen` cost combines ELF mapping, namespace checks,
    dependencies, relocation, RELRO/permission changes, and `DT_INIT` /
    `DT_INIT_ARRAY`/`JNI_OnLoad` work. SDK init inside `JNI_OnLoad` can be the
    real bottleneck.
  - Perfetto usually lacks a single native-load slice. Add trace sections around
    load points and use simpleperf/Perfetto callstack sampling for `dlopen`,
    linker, relocation, and init functions.
  - Linker Namespace failures are platform isolation issues, not ordinary
    missing dependencies. Workarounds using hooks or private library access add
    stability and security risk.
  - Android 15+ 16 KB page-size support has two checks: ELF `PT_LOAD` segment
    alignment and APK/AAB zip alignment. Bionic compat loading for 4 KB-aligned
    ELF is for compatibility and can increase anonymous memory/PSS.
  - CI should scan final artifacts, not source assumptions: every ABI `.so`,
    alignment, zipalign, unknown library source, startup load timing, and PSS.
- SmartPerfetto impact:
  - Very high-value for startup analysis and release recommendations when traces
    show `dlopen`, `System.loadLibrary`, native init, or 16 KB compatibility
    costs.
- Candidate target:
  - Add startup strategy guidance to separate Java startup work from native
    library load/link/init and recommend artifact-level 16 KB checks when native
    cost or compatibility appears.
- Risks/caveats:
  - Finalized/pass-tech-review. Keep NDK/AGP/Play policy dates current before
    release-facing guidance.
- Status: read, very high-value direct startup/native source.

### 140. `part2-performance/ch08-responsiveness/12-keystore-keymint-latency.md`

- Type: Keystore/KeyMint latency in startup, login, biometric, payment, session
  restore, hardware-backed keys, StrongBox/TEE/software levels, operation pool,
  and metrics.
- Useful information:
  - Keystore work spans app JCA provider, Binder to `keystore2`, KeyMint HAL, and
    TEE/StrongBox/software backends. Cost can occur in `generateKey`,
    `Cipher.init`, `Signature.initSign`, operation begin/update/finish,
    attestation, or `doFinal`.
  - Biometric/login latency must split authentication UI wait, operation init,
    and cryptographic finish. `CryptoObject` init may already involve Keystore
    before the prompt.
  - Main-thread Keystore use is risky and StrictMode can flag slow key
    generation. Startup/login flows should move hardware operations off the UI
    thread and keep payloads small.
  - StrongBox is slower and more constrained than TEE on many devices. Request
    value, actual `KeyInfo.getSecurityLevel()`, and fallback/failure must all be
    recorded.
  - KeyMint concurrent operation limits and pruning mean many unfinished
    operations can cause queueing or abort behavior. Long-lived `Cipher` or
    `Signature` objects are a performance and correctness smell.
  - Metrics must include scene, phase, API, algorithm, security level,
    strongbox_requested, auth mode, payload size, duration, thread, result, and
    device dimensions.
- SmartPerfetto impact:
  - High-value for login/startup responsiveness and ANR-like waits involving
    keystore2, Binder, or crypto APIs. It gives precise phase and data-gap
    boundaries.
- Candidate target:
  - Add guidance to responsiveness/startup/ANR strategies for Keystore spans:
    do not label "crypto slow" without separating prompt wait, init operation,
    hardware compute, Binder, and network login.
- Risks/caveats:
  - Ready-for-review with medium confidence. Device StrongBox timings and
    concurrency behavior require empirical evidence before fixed thresholds.
- Status: read, high-value security/performance boundary source.

### 141. `part2-performance/ch08-responsiveness/13-biometric-credential-login-performance.md`

- Type: biometric, Credential Manager, passkey, and login responsiveness
  analysis.
- Useful information:
  - Login latency must be split into Credential Manager discovery, system
    authentication UI, user sensor/action time, CryptoObject or Keystore/KeyMint
    work, server verification, session establishment, and navigation.
  - `BiometricPrompt.authenticate()` covers hardware wake, system dialog, and
    scan flow. Fast cancel/restart and configuration changes can create duplicate
    prompt/cancel behavior that looks like poor login performance.
  - Callback executor selection matters; reports should flag evidence of
    network, database, decryption, or page construction work serialized inside
    authentication callbacks.
  - Android 15 single-tap passkey flow is conditional: single-account only,
    provider configuration via `BiometricPromptData`, and `CryptoObject` requires
    `BIOMETRIC_STRONG` authenticators.
  - Metrics and privacy boundaries should record phase timing and error class,
    but must not upload biometric data, PIN/password, raw passkey assertions,
    full credential IDs, or full AAGUID values.
- SmartPerfetto impact:
  - High-value for login responsiveness and future authentication strategy
    guidance. It provides concrete stage boundaries and privacy caveats that
    prevent reports from collapsing all wait time into "biometric slow".
- Candidate target:
  - Add login/authentication guidance to responsiveness strategies when traces or
    app markers show Credential Manager, BiometricPrompt, Keystore, network
    verification, or navigation spans.
- Risks/caveats:
  - Ready-for-review with medium confidence. Device sensor type, ROM behavior,
    account count, and auth policy vary too much for fixed generic thresholds.
- Status: read, high-value login responsiveness source.

### 142. `part2-performance/ch08-responsiveness/README.md`

- Type: chapter index for responsiveness.
- Useful information:
  - Frames responsiveness as the operation-to-feedback path rather than only UI
    jank. This reinforces the distinction between responsiveness and smoothness.
  - The index appears stale because it lists the chapter through
    ProfilingManager and omits later responsiveness files.
- SmartPerfetto impact:
  - Low direct value beyond taxonomy confirmation.
- Candidate target:
  - No standalone implementation target.
- Risks/caveats:
  - Index-only source; do not use it as detailed technical evidence.
- Status: read, index-only.

### 143. `part2-performance/ch09-anr/01-anr-design.md`

- Type: ANR architecture, system flow, artifacts, version behavior, and common
  misconceptions.
- Useful information:
  - ANR is a runtime user-experience protection mechanism built around
    "register timeout, cancel on completion". Timeout detection asks whether the
    expected completion returned, not what the app main thread is doing at that
    exact dump moment.
  - ANR stack dumps are asynchronous and can be scapegoats. The operation that
    caused the timeout may already have completed before SIGQUIT captures the
    trace, so `nativePollOnce` or an unrelated main-thread stack is not proof
    against a real prior ANR cause.
  - Android 14+ Broadcast ANR has soft and hard timeout windows to separate app
    slowness from CPU starvation: foreground roughly 10-20s and background
    roughly 60-120s.
  - Completion signals differ by component: BroadcastReceiver calls
    `finishReceiver()`, Service lifecycle paths callback AMS, input finishes via
    `InputConsumer.finishInputEvent()`, and ContentProvider startup publishes
    providers.
  - Android 11+ routes ANR work through `AnrHelper` and an `AnrConsumerThread`;
    continuous ANR suppression can produce multiple `am_anr` event-log entries
    but only one full trace dump.
  - Foreground ANR generally shows a dialog, while background ANR can kill
    silently. A process receiving SIGQUIT can also be an associated process, not
    necessarily the ANR culprit.
  - Diagnostic artifacts are complementary: traces show thread snapshots, event
    log shows reason and process, Dropbox gives persistent history, and
    ProfilingManager ANR triggers can provide pre-ANR system trace snapshots on
    newer Android versions.
  - Watchdog is separate from app ANR: it monitors `system_server` service
    threads and can restart system_server, while ANR monitors app component
    responsiveness.
  - Start-foreground-service did-not-call-`startForeground()` timeouts and FGS
    runtime timeouts have different semantics and remediation paths.
- SmartPerfetto impact:
  - Very high-value for ANR scene classification and report quality. SmartPerfetto
    should privilege event-log reason, component type, timeout model, Perfetto
    timeline, and multi-source correlation over a single captured stack.
- Candidate target:
  - ANR strategy/Skill improvements: add timeout-type-first methodology, trace
    scapegoat caveat, continuous-ANR suppression caveat, associated-process
    SIGQUIT caveat, and artifact confidence grading.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. Android 16/17
    ProfilingManager and trigger details should remain version-gated.
- Status: read, very high-value ANR architecture source.

### 144. `part2-performance/ch09-anr/02-anr-types.md`

- Type: ANR type taxonomy, timeout thresholds, logcat reason patterns, and
  Perfetto signatures.
- Useful information:
  - Input ANR is a 5s native InputDispatcher timeout around the wait-queue head
    event. No-focused-window variants can reflect window/focus state rather than
    app main-thread blocking.
  - Broadcast ANR is 10s foreground and 60s background on Android 13 and below;
    Android 14+ diagnostic windows expand to about 10-20s foreground and
    60-120s background when CPU starvation is considered. `goAsync()` does not
    reset the budget.
  - Service ANR uses 20s foreground and 200s background defaults, with process
    startup included when relevant.
  - ContentProvider publish timeout is 10s and is especially startup-sensitive
    because provider publication can block Activity launch.
  - `startForegroundService()` did-not-start-foreground failures differ from FGS
    runtime timeouts. Android 12+ often reports
    `ForegroundServiceDidNotStartInTimeException`; runtime timeouts for
    `shortService`, `dataSync`, or `mediaProcessing` have `Service.onTimeout()`
    self-rescue semantics.
  - Android 14+ targetSdk 34 `JobService.onStartJob()` / `onStopJob()` callback
    timeouts can be explicit ANRs around `OP_TIMEOUT_MILLIS` and must not be
    confused with ordinary long-running job timeout after `jobFinished()`.
  - Logcat reason strings are strong classification hints: `Input dispatching
    timed out`, `Broadcast of Intent`, `executing service`, `ContentProvider ...
    not responding`, startForeground did-not-call message, and `No response to
    onStartJob/onStopJob`.
  - Perfetto signatures differ by type: input has app main-thread/input tracks
    and SF no-frame evidence, service/broadcast require system event and Binder
    context, and provider ANR appears around process startup/provider creation.
- SmartPerfetto impact:
  - Very high-value for ANR routing, extraction, and report phrasing. The report
    should classify ANR by reason/type before proposing root cause.
- Candidate target:
  - Add ANR timeout/type tables and reason-pattern interpretation to strategy
    guidance, and consider deterministic Skill support if traces contain
    relevant event/log slices.
- Risks/caveats:
  - Finalized/pass-tech-review with high confidence, but thresholds can be
    version-, config-, and `Build.HW_TIMEOUT_MULTIPLIER`-dependent.
- Status: read, very high-value ANR taxonomy source.

### 145. `part2-performance/ch09-anr/03-anr-analysis.md`

- Type: ANR analysis workflow, trace interpretation, Perfetto correlation, CPU
  and pressure metrics, and online collection.
- Useful information:
  - `traces.txt` is a SIGQUIT-time snapshot. Android 14+ `AnrLatencyTracker`
    slices/counters can help estimate dump latency; stack confidence decreases
    when the dump is delayed relative to `am_anr`.
  - Trace state interpretation must distinguish `Blocked`, `Native` with
    `nativePollOnce`, Binder wait, D-state I/O/freezer, and Runnable CPU
    starvation.
  - Perfetto analysis should cover the ANR window with app main thread,
    sched/thread_state, binder, input, am/view/wm, CPU frequency/load, and system
    tracks.
  - Root-cause classes include deadlock/lock competition, main-thread I/O,
    Binder timeout or remote thread-pool saturation, CPU starvation, and system
    load.
  - ANR CPU sections and PSI (`/proc/pressure/memory`, I/O pressure), major
    faults, `kswapd`, `logd`, `surfaceflinger`, and system_server CPU are
    important for separating app-side and system-side causes.
  - Online collection should prefer public `ApplicationExitInfo` and
    `getTraceInputStream()` on Android 11+, optionally combined with Looper
    history and Android 16+ ProfilingManager ANR triggers.
  - Android 14+ non-target process dumps come from `firstPids` / `lastPids` /
    `nativePids`; their presence is not automatically Binder causality.
- SmartPerfetto impact:
  - Very high-value for ANR strategy/report structure. It maps directly to a
    confidence model: type/time first, trace trust second, timeline and system
    pressure third, conclusion last.
- Candidate target:
  - Add ANR analysis methodology to strategy guidance and potentially report
    sections for trace-latency confidence, pressure evidence, Binder/log signals,
    and associated-process caveats.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. Version-gate
    ProfilingManager and AnrLatencyTracker details.
- Status: read, very high-value ANR workflow source.

### 146. `part2-performance/ch09-anr/04-special-anr.md`

- Type: special ANR scenarios across system load, Broadcast storm,
  ContentProvider cold start, SharedPreferences, Binder, GC/LMK, FGS, and SQLite.
- Useful information:
  - High-load ANR requires checking CPU saturation, Runnable-but-not-running
    main threads, I/O D-state, loadavg, PSI, and freezer/unfreeze events.
  - Broadcast storms do not create one cumulative queue timeout. Each receiver
    has its own window, but system load and serialized delivery can make many
    receivers fail close together.
  - Modern Broadcast Queue is system_server-side scheduling; App-side
    `onReceive()` still runs on the main thread unless the app chooses
    `goAsync()` or a custom Handler/executor.
  - ContentProvider initialization happens before `Application.onCreate()` and
    can block startup or cross-process callers through Binder while a provider
    process cold-starts.
  - `SharedPreferences.apply()` can block at component boundaries via
    `QueuedWork.waitToFinish()`; do not describe it as the main thread directly
    flushing every write.
  - Binder deadlocks and thread-pool exhaustion need caller and callee stacks,
    lock ordering, and thread-pool state. Default app Binder worker max is 15,
    but system processes can override it.
  - GC/LMK/system memory pressure can create ANR through STW accumulation,
    scheduler delay, `kswapd`, native allocation pressure, and system reclaim;
    fixed heap-utilization thresholds are unsafe.
  - FGS did-not-call-`startForeground()`, background start rejection, shortService
    runtime timeout, and dataSync/mediaProcessing time-limited FGS are distinct.
  - SQLite WAL analysis must separate connection-pool waits, single-writer lock,
    long readers blocking checkpoint, WAL growth, busy/locked logs, page size,
    and filesystem I/O.
- SmartPerfetto impact:
  - Very high-value for avoiding shallow ANR attribution. It gives detailed
    evidence boundaries for mixed app/system ANR reports.
- Candidate target:
  - Add special-scenario branches to ANR strategy guidance, especially
    SharedPreferences, Binder, provider cold start, freezer, FGS, and SQLite WAL.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. Keep Android 16 freezer,
    FGS, and 16KB SQLite advice version- and evidence-gated.
- Status: read, very high-value special ANR source.

### 147. `part2-performance/ch09-anr/05-case-studies.md`

- Type: ANR case studies and applied evidence chains.
- Useful information:
  - Real cases demonstrate that `nativePollOnce` plus high load/PSI can still be
    a system-load Input ANR, with `kswapd`, iowait, memory pressure, and major
    faults as decisive evidence.
  - `(server) is not responding` Input ANR can originate in system_server
    handlers, not the named foreground app.
  - `QueuedWork.waitToFinish()` and SharedPreferences apply backlog can produce
    lifecycle/receiver/service boundary waits.
  - Cached Apps Freezer cases require `am_freeze` / `am_unfreeze`, ActivityManager
    freezer tracks, or frozen state evidence.
  - `Application does not have a focused window` should be analyzed through
    focus/process events like `input_focus`, `am_proc_start`,
    `am_process_start_timeout`, and `am_kill`.
  - Java lock deadlock analysis should follow `waiting to lock` / `held by
    thread` chains and identify lock ordering violations.
  - InputDispatcher WaitQueue length and `wq` / `oq` counters are auxiliary
    signals; they should not be used alone to declare root cause.
  - Online aggregation should combine official `ApplicationExitInfo` traces with
    Looper-history style data when available.
- SmartPerfetto impact:
  - Very high-value for report examples and evidence ranking. It translates ANR
    methodology into concrete report patterns and anti-patterns.
- Candidate target:
  - Use as test-case inspiration for ANR strategy prompts and trace-regression
    expectations when ANR fixtures or log slices exist.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. Case-specific remediation
    should not become generic thresholds.
- Status: read, high-value ANR case-pattern source.

### 148. `part2-performance/ch09-anr/06-notification-performance-anr.md`

- Type: notification performance and ANR boundaries around NMS, RemoteViews,
  NotificationListenerService, FGS notifications, and Perfetto diagnosis.
- Useful information:
  - `NotificationManager.notify()` is a synchronous Binder entry into NMS for
    validation/enqueue, but it does not normally wait for listener fan-out or
    SystemUI rendering.
  - FGS start ANR risk is the window between `startForegroundService()` and
    `Service.startForeground()`; complex notification construction, image decode,
    disk read, or RemoteViews work in that window can burn the budget.
  - NLS callbacks run on the listener process main thread; blocking work there
    affects the listener process, not the original notification publisher by
    default.
  - Android 16 NMS enqueue rate limit is package-level update-path limiting, not
    per-channel. High-frequency progress updates can be shed silently.
  - RemoteViews costs span app-side object construction, Binder transfer, and
    SystemUI-side inflate/reapply/action execution. Stable package/layout IDs
    help reapply, but actions still execute.
  - Icon transport paths differ: resource ID is cheapest, URI shifts decode to
    SystemUI/provider path, bitmap uses shared-memory preparation and should be
    resized before use.
  - Perfetto diagnosis should prefer app-side `Trace.beginSection()` markers for
    `notif.build`, `notif.startForeground`, and NLS callbacks, then use
    thread_state and Binder waits instead of unstable private slice names.
- SmartPerfetto impact:
  - High-value for Service/notification ANR and responsiveness reports. It helps
    keep publisher, NMS, NLS, and SystemUI responsibility boundaries separate.
- Candidate target:
  - Add notification/FGS caveats to ANR and responsiveness strategy guidance,
    especially "simple notification first, enrich asynchronously" when evidence
    shows notification build inside FGS budget.
- Risks/caveats:
  - This file is `ready-for-review` and Task9 has pending needs-rework notes:
    NLS callback blocking must not be written as Input ANR without input/main
    thread timeout evidence, and Android 17 notification API metadata needs
    source/frontmatter alignment.
- Status: read, useful with explicit review caveats.

### 149. `part2-performance/ch09-anr/07-non-technical-anr-diagnosis.md`

- Type: app-vs-system ANR attribution and non-app-cause diagnosis.
- Useful information:
  - The diagnosis order should be: classify ANR type, identify timeout budget
    and responsibility boundary, use EventLog for time, traces for waiting
    object, and Perfetto for root cause.
  - Common "app is blamed but root cause is elsewhere" patterns include
    system_server lock or service stalls, Binder remote process/thread-pool
    exhaustion, CPU starvation/reclaim/freezer, and storage stall/provider cold
    starts.
  - Input ANR subtypes like `(server) is not responding` and no-focused-window
    need focus, WM/InputDispatcher, and system_server evidence, not only app
    traces.
  - `/proc/binder/stats` and binder debug nodes are not reliable on production
    devices; EventLog, traces, bugreport, and Perfetto are the more portable
    baseline.
  - The InputTransport historical bug example is a good reminder that app looper
    history, InputDispatcher wait queue, dynamic input logs, and framework
    patches can be needed before blaming app code.
- SmartPerfetto impact:
  - Very high-value for conclusion safety. Reports should explicitly separate
    "ANR subject process" from "probable root-cause process/component".
- Candidate target:
  - Add attribution language and evidence requirements to ANR strategy prompts,
    including a "system-side suspected" branch with required proof.
- Risks/caveats:
  - Ready-for-review with Task9 needs-rework: ContentProvider timeout/source
    semantics and Android 15+ 16KB/VMA-lock advice need caution.
- Status: read, high-value attribution-boundary source with caveats.

### 150. `part2-performance/ch09-anr/README.md`

- Type: ANR chapter index.
- Useful information:
  - Reiterates the chapter thesis: ANR analysis should return to the whole
    pre-timeout timeline rather than stare at the final stack.
- SmartPerfetto impact:
  - Low direct value beyond taxonomy confirmation.
- Candidate target:
  - No standalone implementation target.
- Risks/caveats:
  - Index-only source.
- Status: read, index-only.

### 151. `part2-performance/ch10-memory-perf/01-app-memory-analysis.md`

- Type: memory analysis tools, PSS/RSS/Private Dirty/Graphics/Native heap,
  heapprofd, memtrack, baselines, and online sampling.
- Useful information:
  - Use `dumpsys meminfo` as macro view, Memory Profiler for time behavior, MAT
    for Java heap references, and heapprofd/malloc debug for Native heap.
  - PSS, RSS, Private Dirty, Java Heap budget, Native Heap, Graphics, and
    memtrack all have different meanings. PSS should not be directly divided by
    `memoryClass`/`largeMemoryClass`, which are Java heap budget concepts.
  - Android 15+ 16KB page size shifts PSS/RSS baselines; memory baselines must be
    grouped by device, Android version, ABI, page size, and tool version.
  - Java leak analysis should use Shallow Size, Retained Size, Dominator Tree,
    and Path To GC Roots after forcing GC where appropriate.
  - Native analysis should choose heapprofd for low-overhead sampled allocation
    flamegraphs, malloc debug for high-overhead full traces, and ASan/HWASan for
    memory safety bugs rather than leak size analysis.
  - Graphics memory visibility depends on memtrack HAL/OEM implementation;
    Perfetto should enumerate actual counter tracks before querying assumed
    names.
  - Memory regression detection should compare within same page-size/device
    buckets and track PSS/RSS/Private Dirty/Graphics separately.
- SmartPerfetto impact:
  - High-value for memory scene reports and recommendation quality. It prevents
    mixing incompatible memory metrics and suggests page-size-aware baselines.
- Candidate target:
  - Add memory-report guidance for metric definitions, 16KB page-size caveats,
    memtrack uncertainty, heapprofd-vs-meminfo differences, and regression
    baseline dimensions.
- Risks/caveats:
  - Finalized with medium confidence but frontmatter notes previous PSS/malloc
    debug review issues; use the corrected `libc.debug.malloc.program`
    semantics in this article, not older package-name examples elsewhere.
- Status: read, high-value memory analysis source.

### 152. `part2-performance/ch10-memory-perf/02-memory-leak.md`

- Type: Java and Native memory leak definition, LeakCanary, Heap Dump, heapprofd,
  malloc debug, Compose leaks, and online leak detection.
- Useful information:
  - Java leaks are invalid strong reference chains from GC Roots to dead objects;
    Native leaks are unmatched `malloc`/`new` without `free`/`delete`. The tools
    and evidence are different.
  - LeakCanary uses lifecycle hooks, `WeakReference` + `ReferenceQueue`, delayed
    GC, Heap Dump, and Shark reference-chain analysis.
  - Common Java leak patterns include static Activity context, delayed Handler
    callbacks, listener/callback non-unregistration, Fragment view lifecycle
    references, and Compose external-scope captures.
  - Heap Dump investigation should follow Dominator Tree and Path To GC Roots
    excluding weak/soft refs, not just object counts.
  - Native leak evidence should come from heapprofd current-in-use growth,
    malloc debug full allocation traces, or libmemunreachable screening; ASan and
    HWASan are primarily memory safety tools.
  - `dumpsys meminfo` Activities/Views counts require controlled reproduction,
    GC, and idle before judging monotonic growth.
  - ProfilingManager API 35+ can request Java heap dumps, heap profiles, system
    traces, and stack sampling, but it is limited and cannot replace always-on
    leak monitors.
- SmartPerfetto impact:
  - High-value for memory-leak report wording and recommendations when traces or
    external diagnostics show heap growth or leak evidence.
- Candidate target:
  - Add memory leak guidance to strategy docs: require Java-vs-Native split,
    GC-root/reference-chain evidence, heapprofd allocation evidence, and avoid
    recommending `System.gc()` as a fix.
- Risks/caveats:
  - Finalized/high confidence, but the malloc debug snippet uses a package-like
    value for `libc.debug.malloc.program`; prefer the corrected executable-name
    semantics from entry 151.
- Status: read, high-value memory leak source with one command caveat.

### 153. `part2-performance/ch10-memory-perf/03-memory-growth.md`

- Type: non-leak memory growth, caches, Bitmap accumulation, native
  fragmentation, anonymous pages, WebView, long-running app budgets, and
  monitoring.
- Useful information:
  - Sustained memory growth is not always a leak. Caches, preloaded data, native
    pools, WebView process data, and graphics/native buffers may be reachable and
    purposeful but lack a capacity budget.
  - On API 26+, Bitmap pixel data primarily affects Native Heap/RSS/PSS rather
    than Java Heap, but leaked Bitmap Java objects can still keep native pixel
    memory alive.
  - Native fragmentation can show as Native Heap PSS/Private Dirty much larger
    than allocated bytes. heapprofd continuous snapshots can separate allocation
    growth from fragmentation/cache behavior.
  - Anonymous/Private Other growth can come from anonymous mmap, thread stacks,
    GPU mappings, or DMA-BUF/gralloc. `dmabuf_dump -b` is useful when graphics
    buffers are suspected.
  - Leak-vs-growth distinction depends on GC behavior, manual cache/resource
    release, controlled reproduction, and whether memory can return when the
    business owner releases capacity.
  - `LruCache` size units depend on `sizeOf()` and cache budget must be explicit.
    Ordinary Bitmap eviction should not blindly call `recycle()` on modern
    Android.
  - PSS is costly and should be low-frequency calibration, while RSS/Java Heap/
    Native Heap are better for more frequent trends. Android 15+ page size
    changes require separate memory baselines.
  - API 34+ no longer delivers the older fine-grained running/moderate/complete
    trim levels; stable app signals are mainly `UI_HIDDEN` and `BACKGROUND`.
- SmartPerfetto impact:
  - High-value for memory scene analysis and recommendation quality. It helps
    reports distinguish leaks from bounded-cache failures, fragmentation, and
    system/page-size baseline drift.
- Candidate target:
  - Add memory-growth guidance to strategies: classify memory curve shape,
    owner/releasability, page-size bucket, Bitmap/native/graphics source, and
    cache-budget evidence before recommending leak fixes.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. WebView cache behavior and
    long-running app budgets remain scenario-specific.
- Status: read, high-value memory growth source.

### 154. `part2-performance/ch10-memory-perf/04-low-memory-impact.md`

- Type: low-memory system performance chain across kswapd, direct reclaim, PSI,
  lmkd, GC, ZRAM, cgroups, compaction, MGLRU, and Perfetto signals.
- Useful information:
  - Low memory can degrade performance through kswapd, direct reclaim, dirty page
    writeback, D-state waits, PSI, lmkd kills, cold starts, GC frequency, and CPU
    contention.
  - lmkd uses PSI monitors and other signals such as thrashing, swap/file-cache
    state, `oom_score_adj`, and release benefit; do not reduce it to one PSS or
    PSI threshold.
  - GC under low memory should be judged by GC type/frequency, pause length,
    HeapTaskDaemon CPU, kswapd overlap, frame budget, and device refresh rate.
  - Perfetto evidence should combine `kswapd0`, vmscan/direct reclaim ftrace,
    PSI sys_stats, lmk/ProcessKilled/logcat, ART GC slices, and cold-start
    process churn in one time window.
  - `mm_events` is Android 15+ and may not expose a stable SQL view everywhere;
    fallback to ftrace slices and thread states.
  - Trace config must use correct memory reclaim/lmk capture paths; `lmkd` is not
    a stable atrace category.
  - 16KB page size changes RSS/PSS and reclaim/ZRAM behavior. Page size must be
    part of low-memory comparisons and baselines.
  - `onTrimMemory()` is coarse on modern Android; PSI/vmscan/lmkd evidence is the
    main system-pressure proof.
- SmartPerfetto impact:
  - Very high-value for system-wide jank, startup regression, and ANR reports
    where low memory is a candidate upstream cause.
- Candidate target:
  - Add low-memory evidence requirements and confidence language to
    smoothness/startup/ANR/memory strategies.
- Risks/caveats:
  - Finalized/pass-tech-review with medium-high confidence. Device kernels and
    OEM trace support vary; reports should say when evidence is missing.
- Status: read, very high-value low-memory source.

### 155. `part2-performance/ch10-memory-perf/05-case-studies.md`

- Type: memory performance case studies covering low-memory cold-start/jank,
  Java OOM, GPU renderD128 native memory, and live-stream memory thrashing.
- Useful information:
  - Low-memory cold-start regression can show nearly unchanged Running CPU time
    but much larger D-state/block-I/O time due to page cache eviction, kswapd,
    and lmkd kill/restart loops.
  - Java OOM crash stacks are often the final allocation, not the root cause.
    HPROF/Dominator Tree can reveal global collections, Bitmap retention, or
    Activity/Fragment callback retention as the true large owners.
  - GPU/native OOM may concentrate on specific SoC/ABI/driver combinations. For
    alpha/offscreen-buffer cases, `setAlpha()` only creates extra buffers when
    overlapping rendering and hardware acceleration conditions apply.
  - renderD128 or DMA-BUF/GPU memory issues need `/proc/self/maps`,
    `dmabuf_dump`, device/SoC slicing, and vendor-driver awareness, not
    LeakCanary/MAT alone.
  - MemoryThrashing detects sudden memory jumps, which differ from leaks. Android
    15+ ProfilingManager can be a collection backend, but OOM triggers are
    post-event and do not replace business-side threshold probes.
  - Object storms, decoder buffer overlap during resolution change, and image
    cache expansion require allocation-rate/capacity fixes rather than
    reference-chain leak fixes.
- SmartPerfetto impact:
  - High-value for report pattern library and recommendation safeguards across
    startup, memory, jank, and GPU/native issues.
- Candidate target:
  - Use as examples for memory strategy wording: crash stack as final straw,
    device-cluster/SoC evidence, render/GPU memory caveats, and sudden-growth vs
    leak split.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. Public improvement numbers
    and case-specific fixes should stay source-specific, not generic promises.
- Status: read, high-value memory case-pattern source.

### 156. `part2-performance/ch10-memory-perf/06-memory-churn.md`

- Type: memory churn, frequent GC, allocation stalls, object pools, autoboxing,
  ART GC version boundaries, and Perfetto/heapprofd detection.
- Useful information:
  - Memory churn is high allocation/free rate, often visible as sawtooth Java
    heap plus dense GC events and frame-time spikes.
  - Churn hurts performance through STW pauses, allocation stalls, HeapTaskDaemon
    CPU contention, and frame-budget pressure, especially on 120Hz devices.
  - High-risk code paths include `onDraw`/`onMeasure`, loop-body allocations,
    logging/string concatenation in disabled paths, and autoboxing through
    generic collections.
  - Detection should combine allocation counts, GC frequency, heap sawtooth,
    HeapTaskDaemon CPU, and frame timing. heapprofd is allocation-stack sampling,
    not a retained-object reference graph.
  - Java heap sampling via heapprofd is Android 12+ with
    `heaps: "com.android.art"` and debuggable/profileable conditions; old
    direct `adb shell heapprofd --java` style commands are not the stable path.
  - Object pools help only with bounded, resettable, high-frequency objects; big
    pools can become a retention problem.
  - ART GC cost model is versioned: Android 8-14 CC/Generational CC, Android 15
    CMC, Android 16 partial generational CMC, Android 17 default claims require
    release-note/runtime-flag verification.
- SmartPerfetto impact:
  - High-value for smoothness and memory reports. It gives precise evidence for
    "GC caused frame spikes" claims and avoids generic "reduce GC" advice.
- Candidate target:
  - Add memory-churn guidance to smoothness/memory strategies: require allocation
    rate + GC + frame overlap evidence and provide bounded optimization advice.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. Android 17 CMC default
    state remains explicitly unverified.
- Status: read, high-value churn/GC source.

### 157. `part2-performance/ch10-memory-perf/07-sqlite-room-performance.md`

- Type: SQLite/Room performance, WAL, ConnectionPool, CursorWindow, Room threading,
  Paging, Migration, PRAGMA, Provider/Binder ANR, and Perfetto analysis.
- Useful information:
  - SQLite/Room issues should be split into SQLite concurrency, Android
    `SQLiteConnectionPool`, CursorWindow/refill, Room API/thread model, and
    Provider/Binder boundaries.
  - WAL improves read/write concurrency and append behavior, but still allows
    one writer. Checkpoint costs can fall on the writer path; there is no
    guaranteed background checkpoint thread.
  - `SQLiteDatabase` does not put all queries behind one global Java lock.
    Threads use `ThreadLocal<SQLiteSession>` and wait at connection acquisition
    or transaction/open paths.
  - CursorWindow is a result window, not the whole result. Cross-process Cursor
    transfer uses descriptor plus ashmem FD; distinguish row-too-big/window
    errors, refill churn, and Binder transaction payload issues.
  - Room synchronous DAO executes on the caller thread; `allowMainThreadQueries`
    disables the guard but does not make work safe. First open/Migration cost
    belongs to whoever triggers open.
  - Room Paging 3 commonly uses `LIMIT/OFFSET`; Keyset pagination requires
    business SQL with stable cursor predicates.
  - `wal_autocheckpoint` is Android-resource configured (AOSP 100 pages), so
    checkpoint size depends on page size. 16KB devices change cost calculations.
  - ANR analysis should trace client Binder waits to Provider-side long
    transaction, migration, projection/refill, or `waitForConnection()` evidence.
  - Perfetto `android.monitor_contention` only covers Java monitor competition,
    not native SQLite file locks or all connection-pool waits.
- SmartPerfetto impact:
  - Very high-value for ANR/startup/responsiveness reports involving database
    waits, Provider calls, migration, and list/query jank.
- Candidate target:
  - Add database-specific branches to ANR/startup/responsiveness strategies and
    possibly Skill guidance for identifying SQLite/Room stack patterns in traces.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. Benchmark numbers and
    SQLCipher overhead should remain empirical, not fixed claims.
- Status: read, very high-value database performance source.

### 158. `part2-performance/ch10-memory-perf/README.md`

- Type: memory performance chapter index.
- Useful information:
  - Frames memory problems as user-facing performance issues: OOM, GC jitter,
    slow foreground/background transitions, and "heavier over time" behavior.
- SmartPerfetto impact:
  - Low direct value beyond taxonomy confirmation.
- Candidate target:
  - No standalone implementation target.
- Risks/caveats:
  - Index-only source and slightly stale because it lists only up to case studies
    while later files exist.
- Status: read, index-only.

### 159. `part2-performance/ch11-power/01-power-model.md`

- Type: Android power model, `power_profile.xml`, BatteryStats,
  BatteryUsageStats, IPowerStats/ODPM, Power Rails, and app attribution.
- Useful information:
  - `power_profile.xml` is fallback estimation input. Modern devices may use
    hardware energy data first and fall back to profile-based estimates when HAL
    data is unavailable.
  - CPU power attribution is not simply frequency time times current; Android 16
    `CpuPowerCalculator` separates active, scaling policy, and frequency-step
    time, and can prefer measured UID CPU energy.
  - Screen power can be smeared by foreground activity time or use measured
    screen energy, depending on available `EnergyConsumer` data.
  - AOSP BatteryStats/BatteryUsageStats has no standard GPU power component; GPU
    requires vendor rails/channels, GPU frequency/busy counters, or indirect
    graphics evidence.
  - `BatteryStatsImpl` records raw counters, `BatteryUsageStatsProvider` and
    calculators produce attributed results, and Settings/bugreport consume that
    attributed layer.
  - HIDL `IPowerStats` rail API and AIDL `IPowerStats` EnergyConsumer/Channel
    APIs are distinct. HAL energy units are uWs, not mAh.
  - Perfetto power rail data uses `android.power` with
    `collect_power_rails: true`; `android.hardware.power.stats` is HAL naming,
    not the Perfetto data source.
  - Android 15+ `PowerMonitor` APIs expose cumulative energy snapshots in uWs,
    requiring app-side differencing between reads.
- SmartPerfetto impact:
  - High-value for power/thermal reports and for avoiding false precision in
    battery conclusions.
- Candidate target:
  - Add power-report caveats: distinguish BatteryStats attribution, Power Rails
    hardware meters, Settings percentages, profile fallback, GPU hidden cost, and
    uWs/mAh unit conversions.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. Device support for ODPM,
    EnergyConsumer attribution, and rail names is variable.
- Status: read, high-value power attribution source.

### 160. `part2-performance/ch11-power/02-app-power-optimization.md`

- Type: app-level battery optimization across WakeLock, WorkManager/JobScheduler,
  location, network, Alarm, FGS, Camera, and Audio.
- Useful information:
  - WakeLock evidence begins with bugreport, Battery Historian, and
    `dumpsys batterystats --history`; Perfetto `power/wakelock` is not guaranteed
    on user builds.
  - WakeLock tags should be stable, meaningful, non-PII strings; every acquire
    should have a timeout and release across all paths.
  - WorkManager saves power through constraints, batching, quota handling, and
    dependency ordering, but `setExpedited()` still consumes quota and should not
    be used for ordinary periodic work.
  - ADPF `setPreferPowerEfficiency()` is a runtime hint for active compute
    sessions, not a WorkManager scheduling flag.
  - Location power should be managed through appropriate FLP priority, batching,
    `setDurationMillis()`, Geofencing, and hardware geofence capability checks.
  - Network power is mostly about radio wakeups/state transitions, not bytes.
    Push, request coalescing, backoff, and unmetered constraints are primary
    levers.
  - Exact alarms require special handling: Android 12 introduced special app
    access and Android 14 tightened default grant behavior. AlarmClock, exact,
    and allow-while-idle semantics must stay separate.
  - FGS solves app-level background limits, not device-level Doze exemption.
    Android 14+ type/permission/runtime conditions and Android 15 time-limited
    FGS budgets need separate diagnosis.
  - Camera/audio power requires resource lifetime evidence such as
    `dumpsys media.camera`, active clients, resolution/FPS, and HAL/vendor trace
    support when available.
- SmartPerfetto impact:
  - High-value for power reports and for cross-linking FGS/ANR/notification and
    background-task findings.
- Candidate target:
  - Add app-power strategy guidance: evidence-specific sections for WakeLock,
    location, network radio, alarm, FGS, camera/audio, and fallback when Perfetto
    lacks tracks.
- Risks/caveats:
  - Finalized/pass-tech-review with medium-high confidence. Battery Historian and
    dumpsys evidence often remain more reliable than Perfetto for app-level
    power on user builds.
- Status: read, high-value app power source.

### 161. `part2-performance/ch11-power/03-system-power-optimization.md`

- Type: system power management: Doze, App Standby Buckets, background starts,
  background location, Battery Saver, OEM restrictions, App Archiving, and
  troubleshooting.
- Useful information:
  - Doze diagnosis should combine `dumpsys deviceidle`, trace idle/suspend/cpu
    signals, `dumpsys jobscheduler`, `dumpsys alarm`, and Battery Historian
    rather than relying on one track name.
  - App Standby Buckets control job/alarm/network quotas and differ from Doze.
    Android 16 adds Active-bucket regular-job guidance and pending reason
    introspection.
  - Job pending reasons should separate bucket/quota, device idle, energy budget,
    Battery Saver, and system optimization decisions.
  - Background Activity Starts restrictions are ActivityOptions opt-in mode
    changes, not manifest/runtime permissions.
  - Background location must separate permission, visibility, while-in-use
    status, FGS type, and background permission. Android 14 checks location FGS
    preconditions at service creation.
  - Battery Saver is global low-power mode; it does not simply move every app to
    Rare or universally cut network. App evidence should include `low_power`,
    `dumpsys power`, CPU frequency/idle, and job/alarm behavior.
  - OEM power policies can freeze, delay, kill, or block app startup outside AOSP
    bucket/quota semantics. Capture ROM settings plus `dumpsys activity
    processes`, jobscheduler, alarm, and trace runnable state.
  - Android 15 App Archiving physically removes APK/cache while preserving user
    data; it is not the same as freezing or Restricted bucket.
- SmartPerfetto impact:
  - High-value for reports that explain delayed background work, push latency,
    missing jobs, and power-test invalidity due to system power modes.
- Candidate target:
  - Add power/background-task diagnosis guidance to strategies: classify Doze vs
    bucket/quota vs Battery Saver vs OEM freeze before blaming WorkManager or app
    logic.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. OEM-specific behavior
    needs device/ROM evidence.
- Status: read, high-value system power source.

### 162. `part2-performance/ch11-power/04-case-studies.md`

- Type: power optimization case studies: WakeLock leak, background location,
  radio polling, AlarmManager wakeups, JobScheduler timeout, FGS timeout, and
  monitoring.
- Useful information:
  - WakeLock case pattern: Battery Historian long bars, `dumpsys power` tag,
    acquire/release asymmetry, missing error callback release, and timeout-based
    safety net.
  - Background location case pattern: Battery Historian GPS/network activity,
    `dumpsys location`, active high-accuracy request, missing
    `removeLocationUpdates`, and FGS/background permission caveats.
  - Network polling case pattern: mobile radio remains active because independent
    module timers prevent standby. Consolidate polling windows or use push.
  - Alarm abuse pattern: frequent `RTC_WAKEUP` / exact alarms show as dense wake
    bars and kernel alarm wakeups. Periodic background sync should migrate to
    WorkManager when not user-visible exact timing.
  - JobScheduler pattern: when `onStartJob()` returns `true`, failing to call
    `jobFinished()` can keep the system-held WakeLock until the job timeout.
  - Monitoring stack should distinguish Play Vitals stuck/excessive WakeLock and
    excessive wakeups, Battery Historian/bugreport, Perfetto Power Rails on
    supported devices, and coarse self-monitoring limits.
- SmartPerfetto impact:
  - Useful case-pattern source for power reports and recommendations, especially
    with Battery Historian/dumpsys evidence.
- Candidate target:
  - Use as examples for power strategy report language, but only after verifying
    timeouts/version details against more stable sources.
- Risks/caveats:
  - This file is `ready-for-review` and Task9 needs-rework. Do not trust its
    JobScheduler timeout and FGS timeout details without cross-checking; earlier
    entries 160 and 146 have clearer FGS distinction.
- Status: read, useful with explicit review caveats.

### 163. `part2-performance/ch11-power/05-wakelock.md`

- Type: deep dive on WakeLock semantics, attribution, SystemSuspend path,
  diagnostics, policy boundaries, and safer alternatives.
- Useful information:
  - `PARTIAL_WAKE_LOCK` is the main app power-analysis concern. Foreground
    Service status does not imply CPU stay-awake; if foreground work must keep
    CPU awake, it still needs an explicit partial WakeLock or a system-managed
    API.
  - Default reference-counted WakeLocks can leak through acquire/release
    mismatch. `acquire(timeout)` is only a safety net, while lifecycle wrappers,
    non-reference-counted locks where appropriate, and `finally` release paths
    are stronger correctness boundaries.
  - WorkSource attribution can shift system-service WakeLock cost to the
    responsible UID; reports must separate holder tag/process from attributed
    UID when evidence exposes both.
  - User-space partial WakeLocks flow through PMS, suspend blockers, and modern
    `SystemSuspend` rather than direct app writes to `/sys/power/wake_lock`.
    Kernel `wakeup_sources`, `dumpsys suspend_control`, BatteryStats, and
    Perfetto ftrace are complementary views, not interchangeable sources.
  - Perfetto WakeLock evidence normally comes from `linux.ftrace`
    `power/wakeup_source_activate/deactivate` or legacy
    `power/wake_lock/unlock`; `android.power` is battery/rail sampling and is
    not itself the WakeLock event stream.
  - Doze, standby buckets, restricted mode, alarms, and high-priority FCM alter
    whether work can run; they are not simple cumulative WakeLock quotas.
  - Alarm `onReceive()` only keeps the system-managed WakeLock until return;
    async work after return needs an appropriate lifecycle API such as
    WorkManager or an explicit bounded WakeLock.
  - Play/Vitals excessive partial WakeLock policy should be treated as a product
    signal with exemptions and session thresholds, not as a low-level trace
    diagnosis rule.
  - ADPF power-efficiency hints and PowerMonitor are scheduling/measurement
    aids; they should not be described as guaranteed low-core or GPU-downshift
    controls without CPU/GPU/rail evidence.
- SmartPerfetto impact:
  - Very high-value for power reports and for cross-cutting FGS/background-task
    explanations. It gives the evidence contract needed to avoid blaming a
    WakeLock tag, FGS, or power rail in isolation.
- Candidate target:
  - Strengthen power strategy guidance around WakeLock evidence precedence:
    BatteryStats for UID duration/count, ftrace for active intervals,
    `dumpsys suspend_control` / kernel `wakeup_sources` for suspend blockers,
    and rails for measured hardware cost.
  - Add report-language guardrails: FGS is not a WakeLock, Power HAL hints are
    not WakeLocks, and WorkSource attribution can differ from the process that
    requested the lock.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. Policy dates and Vitals
    thresholds should be cited cautiously or rechecked before user-facing
    normative claims.
- Status: read, very high-value power/WakeLock source.

### 164. `part2-performance/ch11-power/06-bluetooth-scan-connection-power.md`

- Type: Bluetooth/BLE power deep dive covering scans, connections, BatteryStats
  attribution, Bluetooth service internals, and app-side mitigation patterns.
- Useful information:
  - Classic Bluetooth connection, BLE scan, BLE advertising, GATT connection,
    and audio chains have different evidence paths. A generic "Bluetooth power"
    conclusion is too coarse.
  - BLE scan cost depends on scan mode/duty cycle, filters, callback type,
    report delay batching, lifecycle, and whether the app keeps scanning while
    not visible.
  - Unfiltered scans are high risk. AOSP screen/location gating can suspend
    no-filter scans when screen or location state makes continued scanning
    inappropriate.
  - Background discovery should prefer filtered scans, PendingIntent scan
    delivery, Companion Device Manager, or backoff rather than periodic timer
    polling.
  - Android 12 Bluetooth permission split and `neverForLocation` are privacy
    boundaries, not power optimizations. `neverForLocation` may also filter
    some beacon results.
  - Bluetooth `GattService`, `ScanManager`, and `AppScanStats` track scan
    start/stop/results, unoptimized scans, too-frequent scanning failures, and
    BatteryStats reporting.
  - BatteryStats can attribute BLE scan duration/count/results to a UID, but it
    does not by itself prove controller mAh. Combine with rails, lifecycle,
    WakeLock, and sched evidence when available.
  - BLE Audio or spatial-audio power spans Bluetooth controller, audio DSP,
    codec, sensors, render threads, and display behavior; do not blame BLE
    scanning without separating the chain.
- SmartPerfetto impact:
  - High-value for future power/connectivity reports when bugreport/dumpsys
    Bluetooth or BatteryStats artifacts are available. It is less directly
    trace-only than WakeLock guidance.
- Candidate target:
  - Add a Bluetooth/BLE branch to the power strategy as a conditional diagnosis:
    only make scan conclusions when BatteryStats/bluetooth dumpsys/lifecycle
    evidence supports scan duration, unoptimized scan status, or too-frequent
    failures.
  - Add privacy guardrails to redact MAC addresses, device names, and raw BLE
    payloads from report snippets.
- Risks/caveats:
  - Ready-for-review with medium confidence. Bluetooth dumpsys fields and rail
    names vary by Android version, OEM, and chipset.
- Status: read, high-value conditional power/connectivity source.

### 165. `part2-performance/ch11-power/07-user-settings-energy-impact.md`

- Type: user-configurable power variables and experiment-design guidance:
  brightness, refresh rate, dark mode, Battery Saver, network, video
  resolution, temperature, and statistical repeatability.
- Useful information:
  - User settings are not background noise. Brightness, refresh rate, theme,
    Battery Saver, network state, charging state, temperature, content, and
    account state must be recorded as experimental conditions before comparing
    power results.
  - Brightness is a stable high-weight variable. Display model differences
    matter: OLED/AMOLED, LCD, auto brightness, outdoor high-brightness mode, and
    content color can change the interpretation.
  - Refresh rate must be interpreted by scenario. Static reading, lists, short
    video, long video, games, and ARR-capable devices have different tradeoffs.
    A report should separate user setting, observed VSync/display behavior, and
    low-power-mode constraints.
  - Dark mode is not a universal battery switch. It is conditionally useful on
    OLED-like devices with dark content and appropriate brightness; image,
    video, map, camera, and brand-heavy pages can erase or reverse the gain.
  - Video resolution and message length are workload variables, not direct
    component labels. Decode, network, cache, UI rendering, input, encryption,
    and acknowledgements should be separated before claiming a root cause.
  - Battery Historian, Perfetto counters/rails, Android Studio Profiler, and
    Macrobenchmark power metrics have different sampling scopes; conclusions
    need the sampling method and controlled variables.
  - Mobile power data should prefer repeated runs, medians/P90/variance, and
    significance or at least explicit uncertainty over a single average.
- SmartPerfetto impact:
  - High-value for power report reliability and for rejecting invalid before/
    after comparisons. It can improve strategy instructions that currently might
    over-trust trace power counters without recording test conditions.
- Candidate target:
  - Add a power-analysis preflight section: record brightness mode/level,
    observed refresh/VSync behavior, dark/light theme, Battery Saver,
    charging/USB, temperature, network, content source, and sampling window
    before making optimization claims.
  - Add language guardrails so SmartPerfetto reports say "conditional evidence"
    for dark mode, refresh rate, and video resolution instead of universal
    savings claims.
- Risks/caveats:
  - Ready-for-review with medium confidence and partially based on a 2026
    empirical paper. Numeric percentages should not be generalized beyond the
    tested device/workloads.
- Status: read, high-value experiment-design source.

### 166. `part2-performance/ch11-power/README.md`

- Type: chapter index and framing for power as a user-visible accumulated bad
  experience tied to heat, background drain, scheduling, WakeLock, and network
  behavior.
- Useful information:
  - Reinforces that power analysis is cross-dimensional: thermal, scheduling,
    background restrictions, WakeLocks, and network behavior often co-occur.
  - The chapter framing supports a report taxonomy that starts from user-visible
    symptoms such as background drain, heat-induced jank, and foreground power
    spikes rather than a single raw counter.
- SmartPerfetto impact:
  - Useful as chapter-level framing, but it adds no new deterministic diagnostic
    rule beyond entries 159-165.
- Candidate target:
  - Keep synthesis organized around power symptoms and evidence classes rather
    than isolated tools.
- Risks/caveats:
  - Index-only.
- Status: read, framing only.

### 167. `part2-performance/ch12-apk-network/01-apk-size.md`

- Type: APK/AAB size optimization, R8/resource shrinking, native library
  packaging, dynamic feature delivery, bundletool, and Baseline Profile size
  tradeoffs.
- Useful information:
  - APK size is linked to download, install, dexopt, native loading, runtime
    memory, and cold-start behavior; it should not be treated as only an app
    store metric.
  - APK contents need separate interpretation: dex, `resources.arsc`, compiled
    resources, assets, native libraries, manifest, and signatures have different
    optimization and runtime implications.
  - R8/code shrinking can reduce dex and resource reachability, but overly broad
    keep rules or reflection-heavy code can erase optimization gains or cause
    runtime failures.
  - Language filtering and density filtering have different modern boundaries:
    `localeFilters` can still help controlled packages; density/ABI delivery is
    usually better handled by App Bundle splits for Play distribution.
  - Native library size, compression, `jniLibs.useLegacyPackaging`, direct load,
    16KB page-size alignment, strip/debug symbols, and dynamic delivery must be
    kept as separate axes.
  - Baseline Profile can slightly increase package/download size and more
    noticeably affect installed odex/vdex footprint; profile breadth can trade
    startup speed for disk use and compile/update cost.
- SmartPerfetto impact:
  - Useful for startup/memory report context, especially when cold start,
    `dlopen`, dexopt, resource load, or installed footprint appears in traces or
    user artifacts.
- Candidate target:
  - Add strategy guardrails for startup reports: APK/AAB packaging can be a
    confounder, but SmartPerfetto should only make package-size claims when the
    trace/log/artifact exposes dex/native/resource/package evidence.
  - Keep this mostly as documentation/report caveat unless repository has
    package artifact inputs.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. Several AGP/version
    details are build-system specific and not directly inferable from Perfetto
    traces.
- Status: read, contextual startup/package source.

### 168. `part2-performance/ch12-apk-network/02-network-performance.md`

- Type: network performance fundamentals: request timing decomposition,
  HTTP/2/HTTP/3, connection reuse, preconnect, weak-network strategies,
  OkHttp EventListener, and NetworkCallback.
- Useful information:
  - A "network slow" claim must be split into DNS, connect/TLS, request send,
    TTFB, response body transfer, cache behavior, retries, and degradation
    policy.
  - HTTP/2 improves same-host multiplexing but still suffers TCP-level head-of-
    line blocking on packet loss. HTTP/3/QUIC can help mobile weak-network and
    network-switch tail latency, but 0-RTT requires idempotency/replay guardrails.
  - OkHttp connection reuse depends on sharing an `OkHttpClient` and connection
    pool; preconnect is only a warmup optimization and should target no-op
    endpoints on the same authority.
  - OkHttp timeout/retry policy must be request-class aware. Retrying non-
    idempotent requests without an idempotency key can create correctness bugs.
  - Offline cache behavior is explicit: `FORCE_CACHE` / `onlyIfCached()` can
    return 504 if no acceptable cached response exists.
  - `NetworkCallback` state should separate available network, validated
    internet, metered state, estimated bandwidth, and observed request metrics.
- SmartPerfetto impact:
  - High-value for report methodology when traces include network-wait symptoms,
    main-thread waits on async work, or user complaints about loading/weak
    network.
- Candidate target:
  - Add network-analysis strategy instructions: require phase-level evidence
    before assigning responsibility to DNS, TLS, server, client parsing, cache,
    retry, or network state.
  - For recommendations, distinguish "measure with EventListener/APM" from
    "observable in Perfetto"; do not invent request phases from trace alone.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. Production details depend
    on the client stack and available instrumentation.
- Status: read, high-value network methodology source.

### 169. `part2-performance/ch12-apk-network/03-network-performance-deep.md`

- Type: deeper network stack article covering OkHttp/Cronet/HttpEngine paths,
  main-thread network waits, connection pool, TLS, DNS resolver, radio power,
  and Perfetto instrumentation.
- Useful information:
  - OkHttp, Cronet, and platform `HttpEngine` are different network stacks.
    QUIC/HTTP/3, TLS, DNS, and thread behavior must be interpreted by stack, not
    flattened into one `java.net -> kernel` model.
  - Main-thread network symptoms split into direct socket I/O and synchronous
    waiting on background network threads. Perfetto should correlate main-thread
    futex/poll/recv waits with OkHttp Dispatcher, Cronet, Binder, DNS/connect/
    TLS/body slices in the same time window.
  - OkHttp EventListener timing has precise semantics: HTTPS
    `connectEnd - connectStart` includes TLS; pure TLS uses secure connect
    callbacks; TTFB for requests with bodies should start after request body
    send.
  - Standard JSSE/Conscrypt TLS 1.3 is not QUIC 0-RTT. Cronet/HttpEngine are the
    relevant mobile QUIC/HTTP3/0-RTT capability surfaces.
  - DNS resolver, DoT/DoH3, Type 65 HTTPS records, and App-side DNS prefetch have
    different API/version/observability boundaries.
  - Network power cost is shaped by modem radio tail time; batching background
    network work via WorkManager/JobScheduler can reduce repeated wakeups.
  - Perfetto has no universal built-in HTTP request track; useful request phase
    slices usually require app instrumentation via tracing and EventListener.
- SmartPerfetto impact:
  - Very high-value for SmartPerfetto report truthfulness: it defines what can
    and cannot be proven from trace-only data, and how to interpret main-thread
    waits around network activity.
- Candidate target:
  - Add strategy guardrails for "network-caused jank/startup delay": require
    stack identification, request-phase instrumentation or corroborating logs,
    and main-thread wait correlation before making root-cause claims.
  - Add a recommendation pattern for teams to add OkHttp/Cronet trace slices if
    current traces lack network phase markers.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. Some API details involve
    Android 17/API 37 and should be version-gated in any strategy language.
- Status: read, very high-value network/Perfetto methodology source.

### 170. `part2-performance/ch12-apk-network/04-network-security-tls-performance.md`

- Type: network security and TLS performance: TLS 1.2/1.3/0-RTT, session
  resumption, ECH, CT, cleartext migration, HPKE, and connection reuse.
- Useful information:
  - TLS 1.3 reduces handshake RTT relative to TLS 1.2, but 0-RTT is not a
    generic platform TLS guarantee. OkHttp/platform TLS and Cronet/HttpEngine
    QUIC capabilities must be separated.
  - Session resumption and connection pool reuse are often more important than
    micro-optimizing crypto; repeated handshakes for the same domain indicate
    reuse/configuration issues.
  - ECH adds DNS HTTPS/SVCB and ClientHello encryption considerations. DNS
    config retrieval, TLS handshake, connection reuse, and certificate
    verification should be measured separately.
  - Certificate Transparency for target SDK/version changes can manifest as
    connection failures rather than slow requests. The first check is
    certificate/SCT compatibility, not CPU cost.
  - HTTP to HTTPS migrations can accidentally add RTTs through redirects, mixed
    content, and long certificate chains.
  - HPKE SPI is an independent cryptographic API, not a default HTTPS
    transport path.
- SmartPerfetto impact:
  - Useful for network-failure or TLS-handshake-heavy reports, and for avoiding
    false performance-only explanations when security policy/version changes are
    the trigger.
- Candidate target:
  - Add report guardrails: repeated TLS slices imply connection reuse or stack
    configuration questions; CT/ECH/cleartext policy can cause failures and must
    be supported by version/config/error evidence.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. Android 17 ECH/CT details
    should remain version-gated and not be generalized to older devices.
- Status: read, useful network-security boundary source.

### 171. `part2-performance/ch12-apk-network/05-connectivity-service-network-callback.md`

- Type: ConnectivityService and NetworkCallback performance/lifecycle model:
  network capabilities, callback registration, background wakeups, metered
  policy, multi-network, VPN, and slicing.
- Useful information:
  - Platform network state consists of `Network`, `NetworkCapabilities`,
    `LinkProperties`, and `ConnectivityManager`. `onAvailable()` is not business
    reachability; validated internet and link properties must be checked
    separately.
  - NetworkCallback registration has system cost and per-UID outstanding request
    limits. App architecture should prefer process-level singleton monitoring
    and explicit unregistering over per-page registrations.
  - Manifest `CONNECTIVITY_ACTION` no longer wakes target API 24+ apps for
    network changes; background work should use WorkManager/JobScheduler network
    constraints instead of self-managed polling.
  - `NOT_METERED`, transport type, VPN, roaming, captive portal, and bandwidth
    estimate should be separate strategy inputs. Wi-Fi does not always mean
    unmetered/stable, and cellular does not always mean unusable.
  - NetworkCallback only provides network image input. HTTPDNS, connection pool,
    WorkManager, and business retry policy remain separate responsibilities.
  - Network slicing is optional, operator/device/policy dependent, and should
    not be described as a generic speed-up switch.
- SmartPerfetto impact:
  - High-value for weak-network, background sync, network-switch, and power
    reports, particularly when user symptoms are "has network but request
    failed" or "background drain/retries."
- Candidate target:
  - Add strategy language to require Network/Capabilities/LinkProperties/time
    correlation before attributing failures to server, DNS, or user network.
  - Add recommendation guardrails against per-screen callback registration,
    polling, and callback-thread heavy work when app architecture evidence is
    available.
- Risks/caveats:
  - Finalized/pass-tech-review with high confidence, but most details require
    app logs or bugreport data outside raw Perfetto.
- Status: read, high-value platform-network source.

### 172. `part2-performance/ch12-apk-network/06-netd-dnsresolver-network-diagnostics.md`

- Type: DNS Resolver and netd diagnostics: system resolver boundaries,
  ConnectivityService/DnsManager propagation, DNS latency/failure diagnosis,
  HTTPDNS tradeoffs, metrics, Private DNS, VPN, and tethering boundary.
- Useful information:
  - DNS diagnosis should start only after DNS time/failure is isolated from TCP
    connect, TLS, TTFB, and body transfer.
  - App DNS calls, Android `DnsResolver`, platform `LinkProperties`, and system
    resolver/netd each expose different information. Ordinary apps cannot
    directly control global resolver cache or per-netId resolver parameters.
  - DNS server changes propagate through `ConnectivityService`, `DnsManager`,
    resolver configuration, and `ACTION_CLEAR_DNS_CACHE`; stale app/OkHttp/
    HTTPDNS caches and connection pools can still keep old network assumptions.
  - Network-switch first-request failures need correlation across request ID,
    network capabilities, link properties, DNS servers, connection target IP,
    connection reuse, and failure exception.
  - HTTPDNS is not a silver bullet. Safer design is async prefetch, local cache
    read from OkHttp synchronous `Dns.lookup()`, system DNS fallback, bootstrap
    client separation, TTL, and failure isolation by hostname/IP/Network.
  - DNS metrics need P50/P90/P99, failure type, fallback direction, network
    switch window, Private DNS/VPN buckets, and privacy-preserving IP identity.
- SmartPerfetto impact:
  - Very high-value for report methodology and future artifact ingestion. It
    gives a concrete evidence chain for DNS/network-switch issues that are often
    over-attributed in performance reports.
- Candidate target:
  - Add DNS-specific strategy guardrails: never diagnose DNS from total request
    duration alone; require EventListener/log fields or bugreport/network state
    evidence.
  - Add report recommendation template for teams to collect request ID, Network,
    capabilities, DNS server summary, DNS duration/result count, connect target,
    fallback type, and exception class.
- Risks/caveats:
  - Ready-for-review but high confidence. App-visible evidence can be limited
    unless the trace is paired with logs/bugreport/APM.
- Status: read, very high-value DNS diagnostics source.

### 173. `part2-performance/ch12-apk-network/README.md`

- Type: chapter index and framing for package size and network performance as
  user-visible "other" performance surfaces.
- Useful information:
  - Package size affects download, install, and cold start; network/TLS/
    connection reuse affect first content and interaction rhythm.
  - Reinforces that these may look like local optimizations but are user-visible
    in real workflows.
- SmartPerfetto impact:
  - Framing only; no new deterministic rule beyond entries 167-172.
- Candidate target:
  - Keep network/package topics as optional contextual branches in strategy
    synthesis rather than core trace-only claims.
- Risks/caveats:
  - Index-only.
- Status: read, framing only.

### 174. `part2-performance/ch18-rendering-pipelines/01-pipeline-overview.md`

- Type: rendering pipeline taxonomy: standard Android View, software View,
  mixed View/SurfaceView, multi-window, SurfaceView, TextureView, OpenGL ES,
  offscreen HardwareBufferRenderer, Vulkan, WebView, Flutter, and fence types.
- Useful information:
  - Trace analysis should first identify the rendering pipeline before deciding
    what code or subsystem is slow. Producer thread, consumer, buffer submission
    path, and synchronization differ by pipeline.
  - BLAST changes the app-side submission/channel, not the consumer role:
    SurfaceFlinger still acquires/latches/composes buffers.
  - Fast pipeline identification uses threads, surface/layer count, buffer
    submission method, and CPU/GPU activity patterns.
  - WebView and Flutter have their own composition modes and thread models.
    Their trace signatures should not be forced into the standard View pipeline.
  - Acquire, release, and present fences answer different questions: buffer
    readiness, buffer reuse, and display presentation. Mixing them leads to
    wrong jank conclusions.
- SmartPerfetto impact:
  - High-value for scene routing and jank/report methodology. It complements
    earlier rendering chapters by making pipeline classification a required
    first step before root-cause analysis.
- Candidate target:
  - Strengthen rendering/jank strategy instructions: classify pipeline and fence
    type before attributing jank to UI thread, RenderThread, SurfaceFlinger,
    HWC, GL/Vulkan, WebView, Flutter, or SurfaceView.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence; some version details stop
    at Android 16 in the article frontmatter.
- Status: read, high-value rendering taxonomy source.

### 175. `part2-performance/ch18-rendering-pipelines/02-android-view-standard.md`

- Type: Android View standard HWUI/BLAST pipeline deep dive: UI thread,
  RenderThread, DisplayList/RenderNode, BLAST buffer lifecycle, FrameTimeline,
  Compose placement, and source-research appendix.
- Useful information:
  - Standard pipeline should be decomposed into UI thread
    input/animation/measure/layout/draw recording, RenderThread
    `syncFrameState`/GPU command submission, BLAST transaction submission, and
    SurfaceFlinger latch/present.
  - `syncFrameState` can unblock the UI thread early only when allowed; long
    waits need correlation with bitmap/layer updates, RenderThread state sync,
    `dequeueBuffer`, and GPU/fence behavior.
  - BLAST decouples app-side transaction submission from SF consumption, but
    slot release still depends on SF transaction-completed/release-fence
    callbacks.
  - Jank classification must use current frame interval and FrameTimeline
    expected/actual present deadlines, not a hard-coded 16.6 ms threshold.
  - Compose shares the same RenderThread/BLAST path after MainThread work; only
    the UI-stage workload differs. Recomposition, stability/skippability, and
    Compose tracing determine whether Composition/Layout/Drawing claims are
    supportable.
- SmartPerfetto impact:
  - Very high-value for rendering/jank strategy and scene routing. It gives the
    main evidence boundaries for UI-thread, RenderThread, BufferQueue, SF, and
    Compose claims.
- Candidate target:
  - Strengthen jank/report strategy so any "UI thread vs RenderThread vs SF"
    root cause cites the relevant frame-stage evidence and FrameTimeline result.
  - Add a Compose caveat: without Compose runtime tracing, reports should not
    name specific composables or recomposition causes.
- Risks/caveats:
  - Ready-for-review with Task6 needs-rework for editorial/source-appendix
    cleanup. Use the core BLAST/FrameTimeline technical points, but do not reuse
    unintegrated appendix numbers or Android 17 GC/Compose claims without
    independent verification.
- Status: read, very high-value but with explicit caveats.

### 176. `part2-performance/ch18-rendering-pipelines/03-android-view-software.md`

- Type: Android View software rendering path: whole-window software rendering,
  `Surface.lockCanvas()`, single-View software layers, CPU rasterization, dirty
  rects, and trace identification.
- Useful information:
  - Whole-window software rendering and single-View `LAYER_TYPE_SOFTWARE` have
    different trace signatures. Whole-window paths lack RenderThread
    `DrawFrame`; single-View software layer still has RenderThread and adds CPU
    bitmap rasterization plus texture upload.
  - `Canvas.isHardwareAccelerated()` is the local draw-surface check; `View` or
    window hardware acceleration state alone is not enough.
  - `Surface.lockCanvas()` / `unlockCanvasAndPost()` still interacts with
    BufferQueue slots and release/acquire fences even though there is no GPU
    rendering fence.
  - Software rendering jank usually comes from CPU rasterization, memory
    bandwidth, main-thread blocking, thermal pressure, or BufferQueue backpressure.
  - Dirty Rect reuses previous buffer regions only when previous buffer,
    dimensions, format, and copyback constraints allow it; resize/discard can
    force full redraw.
- SmartPerfetto impact:
  - High-value for classifying unexpected CPU-heavy draw traces and avoiding a
    false "RenderThread/GPU idle means no rendering problem" conclusion.
- Candidate target:
  - Add software-rendering guardrails: detect/describe whole-window vs
    software-layer paths separately and require `lockCanvas`/bitmap upload/
    RenderThread absence/presence evidence.
- Risks/caveats:
  - Ready-for-review with Task9 needs-rework/P0 around `LAYER_TYPE_SOFTWARE` and
    Java drawing cache/RenderNode wording. Keep the high-level path split, but
    recheck exact internals before making source-level claims.
- Status: read, high-value with source-caveat.

### 177. `part2-performance/ch18-rendering-pipelines/04-android-view-mixed.md`

- Type: mixed View + SurfaceView rendering: parallel pipelines, hole punching,
  per-layer latch behavior, cross-surface sync primitives, overlay limits, and
  trace recognition.
- Useful information:
  - Mixed rendering has at least two independent producers: app UI/RenderThread
    and media/game/camera Surface producer. Main-thread jank may not stall the
    independent content layer.
  - SurfaceFlinger advances per-layer. A new host buffer can be composed with an
    old video buffer or vice versa, creating visual mismatch even when each
    pipeline is individually healthy.
  - `SurfaceControl.Transaction`, desired present time, buffer timestamps,
    transaction-committed listeners, `SurfaceSyncGroup`, and latch-unsignaled
    buffers solve different timing problems and are not interchangeable.
  - External producers such as Camera/MediaCodec cannot be magically aligned by
    app-side transaction control; their buffer arrival and fences still matter.
  - Layer count, HWC overlay limits, geometry transforms, and extra UI overlays
    can force GPU composition and shift the bottleneck to SF/HWC.
- SmartPerfetto impact:
  - Very high-value for video/camera/feed jank reports where UI and content
    layers drift or only one layer appears janky.
- Candidate target:
  - Add mixed-rendering analysis instructions: inspect per-layer freshness,
    producer identity, layer count, composition type, and geometry/buffer sync
    before blaming RecyclerView, decoder, or SurfaceFlinger.
- Risks/caveats:
  - Finalized/pass-tech-review. Device-specific HWC limits still require
    `dumpsys SurfaceFlinger` evidence.
- Status: read, very high-value mixed-layer source.

### 178. `part2-performance/ch18-rendering-pipelines/05-android-view-multi-window.md`

- Type: same-process and cross-process multi-window rendering: Dialog,
  PopupWindow, Activity Embedding, split screen, PiP, desktop/freeform,
  Choreographer/RenderThread serialization, and SF-side composition.
- Useful information:
  - Multi-window analysis must start with topology: same process vs cross
    process. Window shape alone is insufficient.
  - Same-process active windows share one UI thread, one thread-local
    Choreographer, and one process RenderThread; multiple `performTraversals`
    and `DrawFrame` sequences serialize in one app process.
  - Cross-process split/PiP/freeform windows have independent app render
    pipelines; bottlenecks usually move to SurfaceFlinger per-layer latch,
    composition, and display scheduling.
  - Same-app split/embedding is a same-process special case and can show two
    full `ViewRootImpl` traversal sequences in one main-thread frame.
  - Optimizations should reduce independent windows or freeze/simplify inactive
    surfaces rather than only micro-optimize the visible Dialog.
- SmartPerfetto impact:
  - High-value for jank reports involving dialogs, bottom sheets, split screen,
    PiP, or desktop mode. It prevents conflating app-thread serialization with
    SF multi-layer composition.
- Candidate target:
  - Add strategy branch: when multiple windows/layers exist, classify
    same-process vs cross-process before assigning the bottleneck.
- Risks/caveats:
  - Marked finalized but Task9 state shows needs-rework for same-process
    generalization in split/desktop cases. Use topology method, but verify edge
    cases before hard rules.
- Status: read, high-value with topology caveat.

### 179. `part2-performance/ch18-rendering-pipelines/06-surfaceview.md`

- Type: SurfaceView direct-output path: independent layer, BLAST/SurfaceControl,
  producer types, BufferQueue/triple buffering, SurfaceView vs TextureView,
  HWC overlay, resize/first-frame/input latency, and trace recognition.
- Useful information:
  - SurfaceView owns an independent Surface/Layer. Producer identity can be
    MediaCodec, camera HAL, app GL/Vulkan thread, or another process; analysis
    must switch to the producer process/thread, not only the app main process.
  - Android version matters: modern SurfaceView BLAST/SurfaceControl behavior is
    strongest on Android 12+, while Android 11 still differs from the app-window
    BLAST path.
  - SurfaceView decouples rendering, not input. End-to-end input delay still
    includes InputDispatcher -> app main thread -> producer handoff -> producer
    cadence -> BufferQueue/display latency.
  - Overlay success depends on Z-order, buffer format, protected content,
    overlay plane availability, transform/scaler, HDR/colorspace, and overlaid
    UI. Composition type must be checked on the device.
  - Buffer starvation appears as producer-side `dequeueBuffer` waits; first
    frame/resize issues split into surface creation, BLAST init, transaction,
    first producer buffer, and fence readiness.
- SmartPerfetto impact:
  - Very high-value for video/camera/game reports and for explaining why app
    main-thread jank may not match visible content jank.
- Candidate target:
  - Add SurfaceView-specific report guidance: identify producer, layer,
    composition type, BufferQueue waits, and input-to-display segments.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence. Device HWC behavior and
    Producer process names are OEM-dependent.
- Status: read, very high-value SurfaceView source.

### 180. `part2-performance/ch18-rendering-pipelines/07-textureview.md`

- Type: TextureView composition path: SurfaceTexture producer/consumer model,
  App RenderThread sampling, OES texture, `onFrameAvailable`, memory overhead,
  secure content, and trace recognition.
- Useful information:
  - TextureView requires hardware acceleration and merges content into the app
    main window via App RenderThread. It is flexible but not independent like
    SurfaceView.
  - Producer frames go to SurfaceTexture, trigger app invalidation, then are
    consumed with `updateTexImage()` during the host window frame; frame rate is
    bounded by host UI/render cadence.
  - SurfaceTexture usually keeps the latest frame, so slow host consumption can
    drop intermediate producer frames.
  - TextureView has two fence layers: external producer -> SurfaceTexture, and
    host window -> SurfaceFlinger. They answer different wait questions.
  - Protected/DRM content generally cannot be sampled through the host
    RenderThread path and should use SurfaceView/secure composition.
- SmartPerfetto impact:
  - Very high-value for identifying why video/camera/WebView-like content janks
    together with app UI or consumes extra GPU/memory.
- Candidate target:
  - Add TextureView branch: no independent SF content layer, host RenderThread
    `updateTexImage`/DrawFrame evidence, extra GPU sampling, and host-main
    invalidation should drive conclusions.
- Risks/caveats:
  - Article metadata shows task9 needs-rework despite useful technical content.
    Use as medium-confidence and avoid provider-specific exactness without
    current evidence.
- Status: read, very high-value with review caveat.

### 181. `part2-performance/ch18-rendering-pipelines/08-opengl-es.md`

- Type: OpenGL ES rendering path: EGL, GLThread, continuous vs dirty render
  modes, `eglSwapBuffers`, BufferQueue/triple buffering, fences, ANGLE, and
  trace recognition.
- Useful information:
  - GLSurfaceView is SurfaceView-based: GLThread is independent of UI
    thread/RenderThread and submits to an independent surface.
  - Continuous mode is a tight render/swap loop constrained by BufferQueue
    availability, not directly by Choreographer. Dirty mode sleeps until
    `requestRender()`.
  - `eglSwapBuffers` includes command flush and buffer exchange; long slices are
    often waiting for available buffers rather than CPU draw time.
  - `dequeueBuffer` waits require layered analysis: available slot, outstanding
    buffer count, and returned release fence wait are separate causes.
  - GLES fence usage differs for CPU wait vs exported native fence FD; both need
    correct `glFlush()`/ownership handling.
  - ANGLE makes GLES appear as Vulkan submit/present slices, so native GLES,
    ANGLE, and native Vulkan must be distinguished.
- SmartPerfetto impact:
  - High-value for game/map/custom rendering reports and for avoiding the common
    `eglSwapBuffers` == GPU draw slow shortcut.
- Candidate target:
  - Add GL/GLES branch in rendering methodology: classify render mode, producer
    thread, `eglSwapBuffers` decomposition, and ANGLE/native path before root
    cause.
- Risks/caveats:
  - Finalized/pass-tech-review. Device traces may expose driver-specific slice
    naming.
- Status: read, high-value GLES source.

### 182. `part2-performance/ch18-rendering-pipelines/09-vulkan-native.md`

- Type: Vulkan native rendering: AVP, swapchain acquire/submit/present,
  explicit synchronization, presentation modes, Swappy frame pacing, trace
  recognition, and validation.
- Useful information:
  - Vulkan's Android swapchain still maps to BufferQueue. Long
    `vkAcquireNextImageKHR` usually means buffer/release-fence pressure, not
    necessarily GPU draw cost.
  - Command buffer recording is CPU work; `vkQueueSubmit` and semaphores define
    GPU ordering. Shared command pools/buffers/queues need app-side
    synchronization.
  - Present mode support must be queried and verified in trace; drivers/vendor
    policy can effectively fall back to FIFO.
  - Swappy may not show stable trace slices unless app/library trace markers are
    enabled; absence of `Swappy_*` markers does not prove Swappy is absent.
  - Vulkan vs GLES trace classification hinges on acquire/submit/present names,
    explicit barriers, and swapchain behavior.
- SmartPerfetto impact:
  - High-value for game/custom renderer reports and for buffer-pressure vs GPU
    bottleneck attribution.
- Candidate target:
  - Add Vulkan branch in rendering methodology: `vkAcquireNextImageKHR`,
    `vkQueueSubmit`, `vkQueuePresentKHR`, FrameTimeline, and app markers should
    be interpreted separately.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence; profile and feature
    details require device/API gating.
- Status: read, high-value Vulkan source.

### 183. `part2-performance/ch18-rendering-pipelines/10-surface-control-api.md`

- Type: SurfaceControl/ASurfaceControl/ASurfaceTransaction deep dive:
  layer trees, buffer submission, API levels, FrameTimeline, fences, release
  callbacks, WebView/PiP/self-renderer use cases, trace recognition, and graphic
  buffer object boundaries.
- Useful information:
  - SurfaceControl transaction `apply()` is asynchronous. It does not mean SF
    latched, presented, or released a buffer.
  - Acquire fence, release fence, OnComplete, present, and buffer lifecycle are
    distinct. API 29-35 use `OnComplete` plus previous release fence; API 36 adds
    `setBufferWithRelease()` callback.
  - `ASurfaceControl` local reference release is not display-tree removal.
    Hiding/reparenting and releasing the handle are separate lifecycle steps.
  - Layer count increases SF work, HWC decision cost, composition fallback risk,
    and buffer memory. Avoid fixed layer-count thresholds; use dumpsys/Perfetto
    evidence.
  - NDK FrameTimeline active use needs API 33 callback data plus
    `setFrameTimeline`; Android 12 can observe FrameTimeline but native-only
    apps lack the full NDK submission path.
  - Cross-process sharing uses Java Parcelable / Binder and API 34
    `ASurfaceControl_fromJava()` bridge; raw `ASurfaceControl*` is not a Binder
    payload.
- SmartPerfetto impact:
  - Very high-value for modern graphics reports involving WebView, PiP,
    SurfaceView, independent overlays, native engines, and layer leaks.
- Candidate target:
  - Add SurfaceControl report guardrails: separate transaction submit, SF
    receipt, latch, present, release, and layer lifecycle evidence.
  - Add recommendations to collect layer tree, composition type, transaction
    density, fence waits, and dmabuf/meminfo when layer/buffer leaks are
    suspected.
- Risks/caveats:
  - Finalized/pass-tech-review, but the article is API-level dense. Any strategy
    should use version-gated wording.
- Status: read, very high-value SurfaceControl source.

### 184. `part2-performance/ch18-rendering-pipelines/11-angle-gles-vulkan.md`

- Type: ANGLE GLES-over-Vulkan translation path: driver selection, runtime
  evidence, performance tradeoffs, Perfetto identification, Android version
  differences, and native fence to Vulkan semaphore conversion.
- Useful information:
  - ANGLE is a GLES frontend and translation layer over vendor Vulkan, not a
    magic performance mode. It can improve compatibility and sometimes
    performance, but shader compile/cache/state translation can add cost.
  - Driver selection depends on settings, package allowlist, ANGLE package, and
    EGL loader behavior. Runtime evidence should include settings, `GL_RENDERER`
    containing ANGLE, loaded libraries/logcat, and target-process `vk*` slices.
  - Seeing `vkQueueSubmit` alone is insufficient because native Vulkan and Skia
    Vulkan can also generate `vk*` slices.
  - ANGLE native-fence synchronization uses trace names such as
    `SyncHelperNativeFence::clientWait`; `serverWait` is a function name, not a
    stable Perfetto slice.
- SmartPerfetto impact:
  - Useful for rendering report classification when an app appears to use
    Vulkan despite a GLES codebase, or when device-specific driver behavior is
    suspected.
- Candidate target:
  - Add ANGLE/native GLES/native Vulkan differentiation guardrails in rendering
    methodology.
- Risks/caveats:
  - Finalized/pass-tech-review. Runtime selection is device/version/policy
    dependent and usually needs app/device logs, not trace alone.
- Status: read, useful ANGLE classification source.

### 185. `part2-performance/ch18-rendering-pipelines/12-flutter-rendering.md`

- Type: Flutter rendering on Android: merged platform model, Main/Raster/IO
  threads, Impeller/Skia, SurfaceView vs TextureView render modes,
  FlutterImageView, Platform Views, and Perfetto recognition.
- Useful information:
  - Flutter does not run Android View measure/layout/draw for its UI. Main
    thread builds Flutter layer trees; Raster thread rasterizes via Impeller or
    Skia; Android-side output depends on render mode.
  - Flutter 3.29+ merged model means Dart UI task, MethodChannel/plugins, and
    platform callbacks share the host main thread. Older/custom engines need
    version confirmation.
  - SurfaceView render mode bypasses host RenderThread for Flutter content but
    still shares host main thread for UI/platform work.
  - TextureView render mode queues to SurfaceTexture and then waits for host
    invalidation/RenderThread `updateTexImage`, inheriting host jank.
  - FlutterActivity default render mode depends on `BackgroundMode`: opaque ->
    surface; transparent -> texture.
  - Platform Views require separating Flutter root render mode from Platform
    Views composition mode; Hybrid Composition, Texture Layer Hybrid
    Composition, and HCPP have distinct version and content-type tradeoffs.
- SmartPerfetto impact:
  - High-value for Flutter trace classification and for avoiding false Android
    View-system diagnoses on Flutter workloads.
- Candidate target:
  - Add Flutter branch in jank methodology: identify Flutter version/model,
    render mode, Main vs Raster vs host RenderThread evidence, and Platform View
    composition before conclusions.
- Risks/caveats:
  - Ready-for-review with Task9 needs-rework. Use as medium-confidence and keep
    version/provider details gated.
- Status: read, high-value Flutter classification source.

### 186. `part2-performance/ch18-rendering-pipelines/13-webview-rendering.md`

- Type: WebView rendering modes: provider identity, process model, GL Functor,
  SurfaceControl child surface, fullscreen custom view, third-party texture-like
  implementations, and field evidence checklist.
- Useful information:
  - WebView analysis must first separate official Android System WebView/
    Trichrome provider internals, host `onShowCustomView()` fullscreen handoff,
    and third-party SDK paths such as X5/UC.
  - Provider version matters as much as Android platform version because WebView
    is independently updated.
  - GL Functor/DrawFn means WebView work is still in the host window frame and
    can consume the host RenderThread budget.
  - SurfaceControl child-surface mode is conditional and needs provider version,
    Perfetto, and SurfaceFlinger layer evidence before claiming decoupling.
  - Fullscreen custom view does not define the rendering path by itself; the
    returned runtime `view.javaClass.name` determines whether to analyze
    SurfaceView, TextureView, or a custom container.
  - Third-party texture-like implementations should be proven by SDK version,
    view tree, `updateTexImage`, and SurfaceTexture evidence.
- SmartPerfetto impact:
  - Very high-value for WebView performance reports and trace routing. It
    prevents collapsing all WebView jank into a single host RenderThread or
    Chromium explanation.
- Candidate target:
  - Add WebView branch in rendering strategy: require provider/SDK version,
    fullscreen handoff status, runtime view class, key Perfetto slices, and
    SurfaceFlinger layer evidence before choosing root cause.
- Risks/caveats:
  - Ready-for-review with Task9 needs-rework. Provider feature flags and
    default paths are version dependent; phrase conclusions as evidence-based,
    not universal.
- Status: read, very high-value WebView classification source.

### 187. `part2-performance/ch18-rendering-pipelines/14-camera-pipeline.md`

- Type: Camera rendering/data pipeline: Camera2/CameraX, multi-stream output,
  HAL3 request-buffer lifecycle, Stream Use Case, ZSL, Preview/Recording/
  Analysis consumers, AIDL/HIDL versioning, Perfetto trace guidance.
- Useful information:
  - Camera problems must be split into production, buffer handoff, and consumer
    return paths. HAL slow production, ImageReader slow close, MediaCodec
    pressure, and Binder congestion have different trace shapes.
  - A single capture request can target multiple surfaces. Preview, recording,
    and analysis usually receive purpose-specific output buffers, not one buffer
    copied among consumers.
  - Android 13+ AIDL Camera HAL and Android 10-12 HIDL HAL use related but
    differently named request/buffer-management slices; search by
    `processCaptureRequest`, `requestStreamBuffers`, and `processCaptureResult`
    rather than one exact method.
  - ZSL is not universal. Device-operated ZSL, CameraX ring-buffer ZSL, and HAL
    reprocess capability need capability checks and may fall back.
  - Analysis slow paths are visible through `onImageAvailable`, delayed
    `image.close()`, YUV/RGB CPU copies, allocation/GC, and dmabuf/buffer pool
    growth.
- SmartPerfetto impact:
  - Very high-value for camera-preview, recording, and analysis reports,
    especially where raw trace evidence spans app, cameraserver, vendor camera,
    SurfaceFlinger, and dmabuf.
- Candidate target:
  - Add Camera strategy branch: classify Preview/Recording/Analysis, HAL version
    naming, stream configuration, buffer-return pace, and consumer bottleneck
    before root-cause claims.
- Risks/caveats:
  - Ready-for-review with Task9 needs-rework/P0-P1 around Stream Use Case
    details. Use the multi-stream/buffer lifecycle methodology, but recheck
    exact stream-use-case constants before embedding them.
- Status: read, very high-value with camera API caveat.

### 188. `part2-performance/ch18-rendering-pipelines/15-video-overlay-hwc.md`

- Type: video overlay and Hardware Composer: DEVICE/CLIENT/SIDEBAND
  composition, GPU vs overlay paths, secure/protected/tunneled playback,
  SurfaceFlinger-HWC validation, and dumpsys/Perfetto recognition.
- Useful information:
  - SurfaceView + DEVICE composition is low-GPU video overlay, but SurfaceFlinger
    still latches buffers, coordinates fences, and presents through HWC.
  - TextureView/GPU path samples video into the app framebuffer and can add GPU
    bandwidth/power cost.
  - `CLIENT` and `DEVICE` layers can coexist. GPU does not necessarily take over
    the whole frame; it composites client target layers that HWC cannot handle.
  - Overlay fallback depends on plane count, format, color/HDR, crop/scale/
    rotation, alpha/rounded corners/blur, secure path, and UI overlays. Device
    evidence is required.
  - Protected content, secure GPU path, standard overlay, and tunneled/sideband
    playback are separate mechanisms. Tunneled playback may lack per-frame
    BufferQueue/latch signatures.
- SmartPerfetto impact:
  - High-value for video power/jank reports and for interpreting composition
    type changes in SurfaceFlinger evidence.
- Candidate target:
  - Add overlay guardrails: require composition type, layer format/effects,
    secure/tunneled path evidence, and GPU/client-target evidence before
    claiming overlay success or fallback.
- Risks/caveats:
  - Ready-for-review with Task9 needs-rework around SKIP_VALIDATE version/
    condition details. Avoid exact HWC optimization internals until rechecked.
- Status: read, high-value with HWC skip-validate caveat.

### 189. `part2-performance/ch18-rendering-pipelines/16-game-engine.md`

- Type: game engine rendering path: game loop, Unity/Unreal thread models,
  SurfaceView/BLAST, Swappy frame pacing, ADPF, Frame Rate API, Game Mode,
  draw-call batching, and Perfetto recognition.
- Useful information:
  - Game engines are loop-driven rather than ordinary View invalidation-driven.
    Separate logic thread, render/RHI thread, GPU, and present cadence before
    making conclusions.
  - Games usually output through SurfaceView/GameActivity/ANativeWindow and
    bypass app RenderThread during steady-state frame production.
  - Swappy affects present timing and queue stuffing, but stable `Swappy` trace
    slices only appear when app/library tracing is enabled; absence of a Swappy
    track is not proof of no Swappy.
  - ADPF, Frame Rate API, Game Mode, and Swappy are separate levers: resource
    hints, refresh-rate intent, system/user game interventions, and frame
    pacing.
  - Trace interpretation should include engine thread names (`UnityMain`,
    `UnityGfx`, `GameThread`, `FRenderingThread`, `RHIThread`), present calls,
    FrameTimeline, and GameMode/intervention state.
- SmartPerfetto impact:
  - High-value for game trace routing and for avoiding ordinary Android View
    jank interpretation on game workloads.
- Candidate target:
  - Add game-engine branch in routing/strategy: identify engine, logic/render/
    RHI split, present API, frame pacing, GameMode, and ADPF evidence.
- Risks/caveats:
  - Ready-for-review with Task9 needs-rework. Keep engine/API guidance
    evidence-gated.
- Status: read, high-value game-routing source.

### 190. `part2-performance/ch18-rendering-pipelines/17-hardware-buffer-renderer.md`

- Type: HardwareBufferRenderer: GPU offscreen rendering to HardwareBuffer,
  RenderNode usage, Java/NDK API boundaries, SurfaceControl submission,
  acquire/release fence lifecycle, HDR/wide-color output, and Perfetto
  recognition.
- Useful information:
  - HBR solves offscreen rasterization cost; it does not provide a window frame
    scheduler. The caller still manages draw frequency, transaction submit, and
    buffer pool reuse.
  - `RenderResult.getFence()` is acquire/readiness for the consumer, not buffer
    reuse. Reuse requires Java release callback or NDK API 36
    `setBufferWithRelease`; API 29-35 need OnComplete previous release fence for
    the buffer replaced by the current transaction.
  - HBR shares RenderNode/hardware rendering concepts with View rendering but
    moves scheduling and ownership to the caller.
  - Direct `SurfaceControl.setBuffer()` vs reconnecting to Surface/BLAST are
    separate submission paths with different trace signatures.
  - `RGBA_FP16` is not the same as HDR; dataspace, display capability,
    compositor, and headroom hints must align.
- SmartPerfetto impact:
  - Useful for modern offscreen-rendering reports, layer/buffer lifecycle
    issues, and API 34+ custom renderer traces.
- Candidate target:
  - Add HBR guardrail: distinguish offscreen GPU rasterization, transaction
    submission, release callback, and optional BufferQueue return path.
- Risks/caveats:
  - Ready-for-review/auto-fixed with prior P0 around release fence semantics.
    Use the corrected acquire/release distinction, but keep API details gated.
- Status: read, useful HBR source.

### 191. `part2-performance/ch18-rendering-pipelines/18-pip-freeform.md`

- Type: PiP/freeform/multi-window rendering: Shell/WMS transitions,
  WindowContainerTransaction, BLAST resize synchronization, producer cadence,
  buffer reuse, composition path changes, and Perfetto trace workflow.
- Useful information:
  - PiP/freeform issues should separate control-plane geometry/windowing changes
    from content producer buffer arrival and display presentation.
  - PiP usually reuses existing content layers where possible; stable-state
    memory/bandwidth may differ from transition-time peak when old and new
    buffers overlap.
  - Freeform resize exposes geometry-before-content races: WMS/Shell updates
    bounds first, then app relayout/draw/queue catches up.
  - BLAST sync can merge buffer and geometry into one transaction, but acquire
    fence readiness and SF latch/present still decide when users see it.
  - Minimal trace workflow: Shell/WMS transition -> app traversal/relayout ->
    producer dequeue/queue -> BLAST queued buffer -> SF latch -> actual present.
- SmartPerfetto impact:
  - High-value for resize/PiP/windowing jank and for trace routing involving
    Shell/WindowManager tracks.
- Candidate target:
  - Add PiP/freeform methodology: do not conflate transition start, transaction
    submit, content buffer readiness, and actual present.
- Risks/caveats:
  - Finalized/pass-tech-review.
- Status: read, high-value windowing source.

### 192. `part2-performance/ch18-rendering-pipelines/19-variable-refresh-rate.md`

- Type: variable/adaptive refresh-rate pipeline: multi-refresh-rate, ARR, VRR,
  frame-rate APIs, FrameTimeline, Perfetto SQL, version boundaries, and jank
  interpretation.
- Useful information:
  - Refresh budget is dynamic on VRR/ARR devices. Do not use fixed 16.6 ms or
    8.3 ms assumptions without checking current VSync/display interval.
  - ARR changes the target cadence; it does not repair already-missed deadlines.
    Expected and actual FrameTimeline windows still decide jank.
  - API boundaries matter: `Surface.setFrameRate()` from Android 11,
    `View.setRequestedFrameRate()`/Compose preference in API 35, and
    `Display.hasArrSupport()` / `getSuggestedFrameRate()` in API 36.
  - Perfetto analysis should use `actual_frame_timeline_slice` and VSync/app/SF
    intervals, not stale/nonexistent table names.
- SmartPerfetto impact:
  - Very high-value for SmartPerfetto's jank interpretation because trace
    reports must be refresh-rate aware.
- Candidate target:
  - Add refresh-rate-aware budget rules in strategies and trace regression
    expectations; never hardcode 16.6 ms as universal jank threshold.
- Risks/caveats:
  - Finalized/pass-tech-review. Android 15 QPR ARR without API 36 query requires
    inference from trace/known device support.
- Status: read, very high-value VRR/ARR source.

### 193. `part2-performance/ch18-rendering-pipelines/20-pipeline-analysis-methodology.md`

- Type: rendering pipeline analysis methodology: path identification,
  producer/consumer/buffer path, Perfetto tracks/slices, bottleneck patterns,
  case studies, dumpsys commands, and decision tree.
- Useful information:
  - Four-step method: identify rendering path, determine producer/consumer/
    BufferQueue path, inspect Perfetto tracks/slices, then classify bottleneck.
  - Diagnostic paths include standard View, SurfaceView, TextureView, WebView,
    Camera, Flutter, game, HBR, PiP/freeform, and VRR.
  - `dequeueBuffer` is the main free-buffer backpressure signal. Long
    `queueBuffer` requires checking binder callback, EGL throttle fence, and SF
    latch timing before declaring queue full.
  - Android 12+ should prefer FrameTimeline; Android 10/11 need doFrame/VSync/SF
    time-window correlation.
  - Reportable root causes should connect app thread, RenderThread, SF, GPU,
    HWC, layer tree, BufferQueue, and fence evidence as applicable.
- SmartPerfetto impact:
  - Extremely high-value. This is the best current skeleton for SmartPerfetto
    rendering/jank strategy updates.
- Candidate target:
  - Use this as the synthesis backbone for jank/rendering strategy: first
    classify path, then evidence chain, then root-cause taxonomy.
- Risks/caveats:
  - Finalized/pass-tech-review. SQL snippets should be checked against current
    SmartPerfetto trace processor schema before use.
- Status: read, top-priority methodology source.

### 194. `part2-performance/ch18-rendering-pipelines/21-eyedropper-crossdevice.md`

- Type: Android 17 EyeDropper API and cross-device collaboration boundary:
  intent result contract, privacy, activity result timing, fallback, and
  app-side synchronization.
- Useful information:
  - Public API is intent/result based:
    `Intent.ACTION_OPEN_EYE_DROPPER` returns one ARGB color via
    `Intent.EXTRA_COLOR`; there is no public `EyeDropper` object or screen pixel
    stream.
  - Secure/protected content is blacked out; EyeDropper is not MediaProjection
    and cannot substitute for continuous sampling or screen sharing.
  - No stable EyeDropper-specific Perfetto markers are guaranteed. App-side
    trace markers around launch/result are needed for robust latency analysis.
  - Cross-device collaboration is an app-layer problem: sync the chosen color
    value plus session metadata through existing collaboration channels.
- SmartPerfetto impact:
  - Low direct value for current trace strategies except as an example of system
    intent/activity result timing and privacy-bound output surfaces.
- Candidate target:
  - No immediate strategy/skill change unless SmartPerfetto adds Android 17
    system-intent latency templates.
- Risks/caveats:
  - Finalized/pass-tech-review with medium confidence; Android 17-specific.
- Status: read, low direct actionability.

### 195. `part2-performance/ch18-rendering-pipelines/22-android-xr-spatial-ui-rendering.md`

- Type: Android XR spatial UI and environment asset rendering performance:
  compatible panel apps, large-screen spatial panels, differentiated XR apps,
  Jetpack XR SDK boundaries, glTF/glb assets, display cadence, tooling, and
  host-device power boundaries.
- Useful information:
  - Analysis must first classify app tier: ordinary mobile app in an XR panel,
    large-screen spatial panel, or differentiated XR app using SceneCore,
    spatial environments, 3D models, Unity, or OpenXR.
  - Compatible panel apps often still use the normal View/Compose ->
    RenderThread -> SurfaceFlinger path; differentiated apps add glTF/glb, IBL,
    skybox, Full Space transitions, Unity/OpenXR, pose, and display config.
  - XR budgets are cadence-dependent: the article cites 90 Hz as 11.1 ms and
    72 Hz as 13.8 ms, with differentiated XR content adding per-eye resolution,
    pose latency, asset load, and thermal sensitivity.
  - Environment assets should separate visible skybox/geometry from IBL ZIP.
    Large texture, material, mipmap, KTX2, and mesh decisions affect memory
    bandwidth, package size, load latency, and power.
  - Trace/tooling should combine Perfetto/FrameTimeline for Android UI,
    Unity Profiler for Unity content, AGI/GPU counters where supported, and
    dumpsys/Winscope for layer/composition state.
- SmartPerfetto impact:
  - Medium to high future value. Current traces may rarely target Android XR,
    but the article reinforces a reusable rule: classify content path before
    choosing UI, 3D engine, media, or power diagnostics.
- Candidate target:
  - Add XR-aware guardrails to future rendering strategy work: report device,
    Jetpack XR/Unity package, Full Space, passthrough, refresh rate, asset
    sizes, model counts, texture sizes, and host-device role before claims.
- Risks/caveats:
  - Ready-for-review, medium confidence, Developer Preview/alpha APIs. Do not
    embed unstable XR-specific slice names or fixed API behavior.
- Status: read, future high-value source for XR/path-classification guardrails.

### 196. `part2-performance/ch18-rendering-pipelines/23-media-codec2-tunneled-media3-abr.md`

- Type: multimedia playback pipeline: Media3/ExoPlayer, MediaCodec, Stagefright,
  Codec2/OMX, Surface/SurfaceView, AudioTrack, tunneled playback, HWC/sideband,
  ABR, network, decoder capability, and logging.
- Useful information:
  - Video playback diagnosis should split network/load, Media3 selection,
    MediaCodec configure/start/output, Codec2/OMX/vendor HAL, Surface/
    BufferQueue or sideband, SurfaceFlinger/HWC, and AudioTrack clock.
  - Codec2 changes native-side evidence: CCodec/C2Component/C2Work/C2Buffer
    wait points differ from ACodec/OMX node/port callbacks. Java MediaCodec
    API stability does not imply identical native behavior.
  - Tunneled playback is not the same as ordinary SurfaceView overlay. It uses
    hardware AV sync/audio session and sideband/tunnel paths, may reduce visible
    BufferQueue evidence, and trades off GPU effects and some UI transforms.
  - Media3 ABR depends on bandwidth estimate, buffer state, track parameters,
    and device decode capability. Decoder or rendering bottlenecks can look like
    weak network if logs do not include codec/surface/tunnel/track data.
  - Playback logs should include session/content, MIME, codec name, surface
    type, secure/HDR/high-FPS/tunnel flags, selected track, bandwidth estimate,
    buffer duration, first frame, seek/rebuffer, dropped frames, and errors.
- SmartPerfetto impact:
  - Very high-value for video playback/jank/power analysis and future media
    strategy branches. It complements SurfaceView/TextureView/HWC chapters with
    MediaCodec/AudioTrack/ABR evidence.
- Candidate target:
  - Add a media-playback diagnostic bucket or strategy section that separates
    network, decoder, BufferQueue/composition, tunnel, ABR, and audio-clock
    evidence before root-cause claims.
- Risks/caveats:
  - Ready-for-review, medium confidence. Device/vendor media implementations
    vary heavily; any SQL or slice assumptions must be trace-schema checked.
- Status: read, very high-value media playback source.

### 197. `part2-performance/ch18-rendering-pipelines/24-advanced-professional-video-apv.md`

- Type: Android 16+ Advanced Professional Video (APV) and professional video
  codec workflow: APV positioning, APV 422-10 capability, MediaCodec probing,
  high-bitrate I/O, thermal, proxy files, export, and online bucketing.
- Useful information:
  - APV is a professional intermediate/recording/editing format, not a general
    online distribution default. It should be enabled only in pro workflows and
    paired with export/downstream compatibility paths.
  - Support cannot be inferred from API level alone. Apps need MediaCodecList
    probing by `video/apv`, hardware/vendor status, profile/level, size/rate,
    performance points, SDK/API exposure, and runtime vendor codec support.
  - APV 422-10 high-bitrate workflows quickly become storage and thermal
    problems: 2 Gbps is roughly 250 MB/s, making sustained write speed, free
    space, external storage, battery, and thermal throttling first-class inputs.
  - Professional video apps should split capture, preview, encode, write,
    proxy generation, edit timeline, export, cache cleanup, and project metadata
    rather than pushing all work onto the interaction path.
  - Logs should bucket by SDK/vendor build, camera provider, codec details,
    resolution/FPS/bitrate/HDR, storage volume, thermal state, duration, and
    failure shape.
- SmartPerfetto impact:
  - Medium future value for pro video/camera/media traces; high value as a
    guardrail against API-level-only media capability conclusions.
- Candidate target:
  - If media strategy work is added, include APV/API36-specific guardrails:
    do not claim APV support, encoder bottleneck, or storage bottleneck without
    codec capability, target spec, I/O, and thermal evidence.
- Risks/caveats:
  - Ready-for-review, medium confidence, Android 16/17-specific and hardware
    dependent. Keep evidence-gated and avoid making APV a default diagnosis.
- Status: read, useful future media/pro-video source.

### 198. `part2-performance/ch18-rendering-pipelines/README.md`

- Type: chapter index and methodology framing for rendering pipeline analysis.
- Useful information:
  - The chapter exists to prevent collapsing ordinary View, SurfaceView,
    TextureView, Flutter, WebView, OpenGL ES, Vulkan, Camera, video overlay,
    XR, and media playback into one generic rendering path.
  - The repeated foundation is BufferQueue/BLAST/Vsync, FrameTimeline/
    JankTracker, and modern GPU/rendering features.
  - Recommended analysis flow is: identify which rendering path the issue uses,
    read the relevant path chapter, then validate with the method chapter.
- SmartPerfetto impact:
  - High value as a synthesis signal. Rendering strategy should be path-first
    rather than one unified jank prompt.
- Candidate target:
  - Use the chapter README as a high-level rationale for organizing any
    SmartPerfetto rendering/jank plan by path classification.
- Risks/caveats:
  - Index/framing only; no standalone technical claims beyond chapter scope.
- Status: read, high-value synthesis/index source.

### 199. `part3-tools/ch13-perfetto/01-perfetto-intro.md`

- Type: Perfetto introduction and architecture: traced/traced_probes,
  producers, data sources, TraceConfig, Track/Slice/Counter, Trace Processor,
  built-in metrics, profiling components, version boundaries, and capture
  entrypoints.
- Useful information:
  - Perfetto analysis should distinguish capture layer, SQL analysis layer, and
    UI layer. SmartPerfetto mostly lives in the SQL/analysis layer but must
    understand capture coverage before making claims.
  - Default Perfetto captures primarily use memory buffers; long trace behavior
    requires explicit `write_into_file` and `file_write_period_ms`.
  - TraceConfig is protobuf, not JSON. Android 9 requires binary protobuf;
    Android 10/11 often need stdin for config; Android 12+ can use
    `/data/misc/perfetto-configs/`.
  - Data source availability and gates matter: FrameTimeline Android 12+,
    `android.log` userdebug caveat, heapprofd/profileable/debuggable gates,
    Java heap dump vs sampling, `linux.perf` via traced_perf, power rails by
    device capability.
  - Prefer official metrics/stdlib/Trace Summary where available, but verify
    metric names such as `android_frame_timeline_metric` and
    `android_jank_cuj`; do not invent unavailable metric names.
  - LMKD evidence is version-dependent: legacy lowmemorykiller ftrace vs modern
    lmkd/PSI/logcat/statsd/process callbacks.
- SmartPerfetto impact:
  - Very high-value for strategy guardrails and Skill SQL preconditions. It
    reinforces that missing data source coverage must be reported as a capture
    limitation, not silently converted into "no issue."
- Candidate target:
  - Add/strengthen strategy language that checks data-source availability,
    Android version, and schema/table presence before conclusions; prefer
    official metrics/stdlib when available.
- Risks/caveats:
  - Finalized/pass-tech-review. Some Android 15-17 profiling surfaces remain
    capability/source dependent and should be treated as version-gated.
- Status: read, high-value Perfetto foundation source.

### 200. `part3-tools/ch13-perfetto/02-trace-capture.md`

- Type: trace capture guide: `adb shell perfetto`, TraceConfig, atrace
  categories, record_android_trace, Perfetto UI recording, app trace markers,
  long trace, heapprofd, Java heap sampling/snapshot, and linux.perf sampling.
- Useful information:
  - Capture quality determines analysis validity. Missing categories, tiny
    buffers, or missing `atrace_apps` can make App markers and slices absent.
  - Baseline configs should differ by Android version: Android 10/11 without
    FrameTimeline, Android 12+ with `android.surfaceflinger.frametimeline`.
  - Recommended categories are scenario-specific; `sched/freq/gfx/view/input`
    for jank, `am/wm/binder_driver` for startup/ANR, `dalvik/memory` for GC/
    memory, and power/idle for power.
  - `Trace.beginSection`/`endSection` must be paired and same-thread; section
    names should be short and non-sensitive; async work requires API29+
    `beginAsyncSection`/`endAsyncSection` with a stable int cookie.
  - Long trace introduces disk I/O and large-file analysis tradeoffs. Capture
    configs should shrink data sources for long windows.
  - Heapprofd, Java heap sampling, Java heap snapshot, and linux.perf have
    distinct version and profileable/debuggable gates; `linux.perf` and atrace
    are orthogonal, not substitutes.
- SmartPerfetto impact:
  - Very high-value for report caveats and e2e trace recommendations. Many
    SmartPerfetto false negatives can be framed as capture-coverage gaps.
- Candidate target:
  - Add capture-coverage checks/wording to strategies: when required tables,
    slices, FrameTimeline, ftrace, or app markers are absent, report the missing
    capture precondition before root-cause analysis.
- Risks/caveats:
  - Ready-for-review with Task9 `needs-rework` in frontmatter. Use only
    source-verified, conservative capture principles unless revalidated.
- Status: read, very high-value capture-precondition source.

### 201. `part3-tools/ch13-perfetto/03-perfetto-view.md`

- Type: Perfetto UI interpretation guide: navigation, track pinning, key tracks,
  FrameTimeline, SurfaceFlinger version differences, slice details, thread
  states, waker, Flow Events, Critical Path, lock contention, logs, and UI vs
  Android Studio Profiler.
- Useful information:
  - UI analysis is time-window-first: locate abnormal interval, pin key tracks,
    then inspect FrameTimeline/main thread/RenderThread/SurfaceFlinger/system
    tracks in the same window.
  - For Android 12+, `Expected/Actual Timeline` and raw `Jank Type` should be
    the first jank classification source. Dropped-frame status is not itself a
    jank type.
  - Android 10/11 lack FrameTimeline main tables; use `doFrame`, `VSYNC-app`,
    `VSYNC-sf`, MainThread, RenderThread, and SurfaceFlinger time correlation.
  - SurfaceFlinger tracks are version-dependent: Android 12/12L old message
    entries; Android 13+ `commit`/`composite`/`present` path.
  - Wall Duration vs CPU Duration vs Thread States split compute, scheduler,
    lock/Binder/condition wait, and I/O wait. `slice_self_dur` stdlib can avoid
    fragile manual child-slice subtraction where available.
  - Flow Events and Critical Path are essential for Binder and cross-thread
    dependency chains; lock contention should jump to owner/waker, not only the
    waiting thread.
- SmartPerfetto impact:
  - Very high-value for report structure. SmartPerfetto reports should explain
    whether time was spent running, runnable, sleeping, blocked, or D-state, and
    should keep Android version-specific jank/SF interpretation.
- Candidate target:
  - Strengthen strategy/report guidance for jank/ANR: preserve raw jank fields,
    split wall vs CPU vs thread states, follow Binder/flow owner evidence, and
    version-gate SurfaceFlinger conclusions.
- Risks/caveats:
  - Finalized/pass-tech-review. Perfetto UI features change; keep UI shortcut
    details out of automated strategy logic unless needed.
- Status: read, very high-value UI interpretation/report-source source.

### 202. `part3-tools/ch13-perfetto/04-large-traces.md`

- Type: large trace command-line analysis: trace_processor shell, SQL basics,
  table schemas, event existence checks, batch SQL, Python API, BatchTraceProcessor,
  traceconv, pipeline storage, query optimization, and CI integration.
- Useful information:
  - Large traces should be parsed locally with native `trace_processor` or
    `trace_processor --httpd`; browser UI parsing multiplies memory usage and
    can fail at 500 MB+.
  - SQL must start by validating schema/table/event presence. Slice names depend
    on capture config and instrumentation; empty results are often capture
    gaps, not proof of absence.
  - Prefer stable join paths such as `slice -> thread_track -> thread -> process`
    and use `utid`/`upid` instead of raw pid/tid because IDs can be reused.
  - Trace Processor CLI `-q` returns CSV-like output and expects only the final
    statement to produce rows. Python API returns iterators/DataFrames and
    BatchTraceProcessor can run the same query over many traces.
  - `TraceProcessorConfig(ingest_ftrace_in_raw=True)` is required when Python
    analysis needs raw ftrace events.
  - Query performance matters: restrict time windows, avoid `SELECT *`, avoid
    heavy `EXTRACT_ARG` over huge tables in production, version-control SQL, and
    store results for trend/regression analysis.
- SmartPerfetto impact:
  - Extremely high-value because SmartPerfetto is effectively a local
    trace_processor automation system. This validates schema-first,
    existence-check-first, batchable SQL design.
- Candidate target:
  - Use these as hardening principles for Skills: each SQL skill should verify
    required tables/columns/events, emit capture-gap diagnostics, use stable
    joins, and avoid expensive full-trace scans where possible.
- Risks/caveats:
  - Finalized/pass-tech-review, medium confidence. CLI flags can differ by
    bundled trace_processor version; SmartPerfetto should inspect local
    capability when invoking advanced flags.
- Status: read, top-priority Skill SQL hardening source.

### 203. `part3-tools/ch13-perfetto/05-topic-analysis.md`

- Type: Perfetto topic workflows for startup, jank/FrameTimeline, Binder,
  memory, I/O, power, and multi-process analysis.
- Useful information:
  - Startup analysis should split Zygote fork, process creation/rename,
    `bindApplication`/providers, Activity lifecycle, first traversal, RenderThread,
    BLAST, SurfaceFlinger, and first present. Main-thread state distribution
    quickly separates compute, runnable, Binder/lock wait, and D-state I/O.
  - Jank analysis should use FrameTimeline on Android 12+, preserving
    `jank_type`, `present_type`, and `on_time_finish`; Android 10/11 need
    `doFrame`/`VSYNC-app`/`VSYNC-sf`/thread-state fallback.
  - Binder analysis should use `linux.ftrace` Binder events plus sched, then
    `android.binder` stdlib tables. `android_binder_txns` is analysis output,
    not a capture data source.
  - Memory analysis must separate process RSS/PSS counters, heapprofd native/
    Java allocation sampling, and `android.java_hprof` retained graph.
  - I/O analysis requires thread D-state, `sched_blocked_reason`, filesystem
    events, and device-level `block_io` evidence; device I/O alone cannot prove
    which app is responsible.
  - Multi-process analysis pattern: narrow abnormal window in one process, pin
    related App/RenderThread/system_server/surfaceflinger tracks, follow Binder
    Flow or frame/buffer anchors, then quantify with SQL.
- SmartPerfetto impact:
  - Extremely high-value as a direct strategy skeleton. This chapter maps to
    SmartPerfetto's common scene buckets and report evidence structure.
- Candidate target:
  - Use these workflows to organize strategy sections by symptom and evidence
    chain: startup, jank, Binder, memory, I/O, power, and multi-process.
- Risks/caveats:
  - Finalized/pass-tech-review. SQL snippets still need schema checks against
    SmartPerfetto's bundled trace processor and target traces.
- Status: read, top-priority topic workflow source.

### 204. `part3-tools/ch13-perfetto/06-thread-cpu-states.md`

- Type: thread CPU state analysis: Running, Runnable/R+, Sleeping, D-state,
  scheduling latency, wakeups, block reason, irq/softirq, SQL quantification,
  CPU core/frequency context, and state-to-cause mapping.
- Useful information:
  - Wall Duration vs CPU Duration is the first branch. `Wall ~= CPU` suggests
    compute/kernel-running work; `Wall >> CPU` requires R/S/D/off-CPU breakdown.
  - Running can mean user code, native code, system call, kernel path, low
    frequency, small core, or interrupted effective execution; flamegraph/
    linux.perf and CPU frequency/core evidence are needed for code-hotspot
    claims.
  - Runnable/R+ means ready but not running. Causes include priority, affinity,
    system load, limited CPU/frequency/thermal, or over-fragmented thread
    dependency chains. R+ indicates preemption.
  - Sleeping requires finding the dependency: lock, Binder, condition, network/
    file wait, GPU fence, or active wait. Wakeup/waker data is useful but must
    be cross-checked with Binder/slice/code context.
  - D-state should be split by `io_wait` and `blocked_function` where available.
    `io_wait=1` points toward I/O; `io_wait=0` toward kernel locks, memory
    reclaim, driver waits, etc.
  - SQL should quantify state distribution, R vs R+, D io_wait distribution,
    blocked functions, CPU distribution, and global per-process/per-thread CPU.
- SmartPerfetto impact:
  - Very high-value for every performance report. It gives a defensible
    root-cause taxonomy from thread evidence rather than generic "slow" wording.
- Candidate target:
  - Add a reusable thread-state interpretation block to relevant strategies and
    Skill outputs, especially startup/jank/ANR/scrolling.
- Risks/caveats:
  - Finalized/pass-tech-review. Kernel/vendor availability of
    `sched_blocked_reason`, `io_wait`, and irq details varies by trace.
- Status: read, high-value root-cause taxonomy source.

### 205. `part3-tools/ch13-perfetto/07-advanced-usage.md`

- Type: advanced Perfetto usage: custom metrics, Standard Library, Trace
  Summarization v2, macros, Python API, BatchTraceProcessor/Bigtrace, CI/CD,
  custom trace points, Perfetto SDK, and production trace-point governance.
- Useful information:
  - New analysis should prefer Standard Library modules and Trace Summarization
    where available; old metric v1 and custom SQL remain useful for gaps but
    carry more table-schema maintenance cost.
  - Standard Library module names use dotted form like
    `android.startup.startups`, `android.frames.jank_type`, and
    `linux.memory.process`, distinct from old metric IDs such as `android_cpu`.
  - Automated regression checks need stable environment binding: fixed device/
    OS/build can gate PRs; shared device pools should mostly trend/alert.
  - CI reports should persist raw run fields (`runs[]`, median, warmup/repeat
    iterations, device metadata) instead of only final percentage deltas.
  - Trace point design rules: stable names, phase-boundary granularity, avoid
    high-frequency loops, use async IDs for cross-thread flows, avoid sensitive
    strings, and distinguish dev-only vs production-retained markers.
  - Perfetto SDK/Custom Data Source is for native engines or structured packet
    needs; ordinary Android app timing should start with `android.os.Trace` or
    `ATrace_*`.
- SmartPerfetto impact:
  - High value for future-proofing SmartPerfetto's SQL engine, benchmark
    reports, and recommendations to app teams about trace instrumentation.
- Candidate target:
  - Prefer official modules in new Skills; add strategy wording for stable trace
    marker naming and benchmark/regression metadata requirements.
- Risks/caveats:
  - Finalized/pass-tech-review. Advanced metric/summary APIs depend on bundled
    trace_processor version; verify support before implementation.
- Status: read, high-value automation and instrumentation source.

### 206. `part3-tools/ch13-perfetto/08-input-latency-sql.md`

- Type: Android input latency SQL: `android.input` stdlib tables, input event
  lifecycle, InputDispatcher queue counters, input-to-frame correlation,
  sliding/ANR/startup templates, capture config, and batch comparison.
- Useful information:
  - `android_input_events` is the main lifecycle table, with ready-made
    `dispatch_latency_dur`, `handling_latency_dur`, `ack_latency_dur`,
    `total_latency_dur`, `end_to_end_latency_dur`, timestamps, thread/process,
    event IDs, channel, and optional `frame_id`.
  - Use stdlib-calculated latency fields instead of inventing missing ACK
    timestamps. `android_motion_events`/`android_key_events` are raw event views,
    not 1:1 mirrors of `android_input_events`.
  - `android_input_event_dispatch.event_id` and
    `android_input_events.input_event_id` are different concepts and should not
    be directly equality-joined without a bridge.
  - InputDispatcher queues: `iq` is inbound queue, `oq` is connection
    outboundQueue waiting to publish to target channel, and `wq` is waitQueue
    waiting for App finish/ACK. `wq` buildup is the dispatch timeout/ANR
    responsiveness signal.
  - Input-to-frame correlation should use `android_input_events.frame_id` and
    `android.frames.timeline` when FrameTimeline is present; enumerate actual
    doFrame child slice names before filtering callbacks.
  - Capture requires `android.input.inputevent` with explicit
    `AndroidInputEventConfig` fields/rules plus FrameTimeline and ftrace context;
    `android.input` itself is only the SQL module.
- SmartPerfetto impact:
  - Very high-value for selected-scope, input latency, scroll, and ANR reports,
    but only when the trace contains the debug-level input data source.
- Candidate target:
  - Add an input latency Skill/strategy branch that first checks
    `android.input` table availability, then reports dispatch/handling/ack/
    total distributions, queue buildup, and input-to-frame correlation.
- Risks/caveats:
  - Frontmatter records a Task9 P0 audit about earlier `oq`/`wq` semantics; use
    the corrected semantics above. `android.input.inputevent` is debuggable-build
    oriented and may be absent from normal user traces.
- Status: read, high-value input-latency source with queue-semantics caveat.

### 207. `part3-tools/ch13-perfetto/09-tracing-infrastructure.md`

- Type: Android tracing infrastructure: ftrace, tracefs, atrace categories,
  trace_marker, traced/traced_probes, boot trace, custom App/Framework/kernel
  tracing, buffer loss, overhead, and eBPF relationship.
- Useful information:
  - ftrace tracepoints are the low-overhead kernel source behind sched, power,
    binder, block, net, and display events. Function/function_graph tracers are
    too expensive for normal performance measurement.
  - Perfetto has raw ftrace events in `ftrace_event` and derived tables/views
    such as `sched` and CPU frequency counters. Use raw table for validation
    and derived views for production analysis.
  - atrace categories are presets that may combine user-space tags and kernel/
    sysfs toggles; direct `TraceConfig.ftrace_config.ftrace_events` is more
    precise. Categories such as `gfx` and vendor additions are not fixed single
    tracepoints.
  - `android.os.Trace`/ATRACE ultimately write to `trace_marker`; App markers
    appear on the calling thread and require capture config to include the app.
  - `traced_probes` reads tracefs/per-CPU `trace_pipe_raw`, controlled by
    `FtraceConfig` fields such as `drain_period_ms`, `buffer_size_kb`, and
    `ftrace_events`.
  - Missing trace data can come from disabled events, buffer overflow, overly
    sparse drain period, wrong tracefs path/capability, or trace_marker/app tag
    capture gaps.
- SmartPerfetto impact:
  - Very high-value for explaining capture gaps and avoiding false assumptions
    about raw ftrace availability or category semantics.
- Candidate target:
  - Add capture-layer diagnostics to strategies/skills: distinguish raw
    `ftrace_event` validation, derived table availability, atrace app marker
    presence, and ftrace buffer/drop caveats.
- Risks/caveats:
  - Finalized/pass-tech-review but confidence medium. Overhead numbers remain
    device/event-set dependent; avoid embedding exact cost thresholds.
- Status: read, high-value capture-infrastructure source.

### 208. `part3-tools/ch13-perfetto/10-perfetto-sql-cookbook.md`

- Type: Perfetto SQL cookbook for frames, scheduling, Binder, memory/GC,
  startup, ANR, monitor contention, SPAN_JOIN, and analysis paths.
- Useful information:
  - Prefer Standard Library modules (`android.frames.timeline`,
    `android.input`, `android.monitor_contention`) over raw-table rewrites.
  - Target process and main thread selection should use `thread.is_main_thread`
    or `thread.tid = process.pid` fallback, not only `thread.name = 'main'`.
  - Large trace SQL must filter target process/time/thread before non-equality
    joins. Materialize small filtered `CREATE PERFETTO TABLE`s for reuse.
  - Android 12+ `Choreographer#doFrame` names may include a vsync id; use
    `GLOB 'Choreographer#doFrame*'`. FrameTimeline actual/expected frames
    should be paired by `display_frame_token` plus nullable
    `surface_frame_token`, not `track_id`.
  - `sched.end_state` is the state at CPU-slice exit, not a state distribution;
    state distribution comes from `thread_state`.
  - Binder ftrace has no `binder_reply` tracepoint; reply semantics come through
    `binder_return`/`binder_command` (`BR_REPLY`/`BC_REPLY`) or Perfetto Binder
    slices/args.
  - Monitor contention stdlib has parsed blocked/owner thread/method fields;
    `lock_name` support depends on Trace Processor version.
  - ANR/main-thread blocking classification should clip the time window and
    avoid double-counting nested slices.
- SmartPerfetto impact:
  - Extremely high-value for hardening existing Skill SQL and report logic.
- Candidate target:
  - Audit high-risk SmartPerfetto Skill SQL for main-thread selection,
    FrameTimeline keying, `thread_state` vs `sched.end_state`, Binder reply
    assumptions, and large-trace window filtering.
- Risks/caveats:
  - Finalized/pass-tech-review, but SQL snippets need local schema validation
    before being copied into Skills.
- Status: read, top-priority SQL cookbook source.

### 209. `part3-tools/ch13-perfetto/11-perfetto-span-join-window-functions.md`

- Type: Perfetto time-span correlation: `SPAN_JOIN`, `SPAN_LEFT_JOIN`,
  `SPAN_OUTER_JOIN`, `LEAD()` counter-to-span, `PARTITIONED` constraints,
  frame/CPU frequency, Binder/lock/GC overlap, stdlib integration, query cost,
  and CI reuse.
- Useful information:
  - `SPAN_JOIN` computes interval intersection for tables with `ts` and `dur`.
    It is appropriate when results must be weighted by overlap duration.
  - Counters must be converted to spans using `LEAD()` partitioned by track;
    trailing counter rows need an explicit boundary such as `trace_end()` or a
    target window end.
  - `PARTITIONED` columns must be integer and semantically equivalent on both
    sides, such as `cpu` with `cpu` or `utid` with `utid`.
  - Same table/same partition spans must not overlap. Raw `slice` often has
    nested intervals; filter by layer, flatten, merge, or use interval stdlib
    instead of forcing it into `SPAN_JOIN`.
  - For per-frame CPU/frequency metrics, overlap must be clipped to the frame
    boundary; otherwise sched/frequency spans crossing frames pollute metrics.
  - GC overlap with frames should first merge overlapping GC phase windows; GC
    overlap is temporal correlation and not proof of STW blocking without
    thread_state/ART evidence.
  - Complex CI SQL should produce a few stable, explainable metrics tied to
    device, refresh rate, thermal state, and trace config.
- SmartPerfetto impact:
  - Very high-value for building cross-evidence Skills such as frame x CPU freq,
    frame x Binder, frame x locks, frame x GC, and state-over-window analysis.
- Candidate target:
  - Use `SPAN_JOIN` patterns only after adding non-overlap/schema tests, and
    prefer materialized filtered tables for large trace analysis.
- Risks/caveats:
  - Ready-for-review with frontmatter Task9 needs-rework. Use the corrected
    caveats in the article: frame boundary clipping and non-overlap constraints
    are mandatory.
- Status: read, high-value but review-caveated SQL operator source.

### 210. `part3-tools/ch13-perfetto/12-perfetto-profiles-flamegraph.md`

- Type: profile import and flamegraph analysis: system trace vs CPU profile,
  pprof/Simpleperf import, `linux.perf`, dynamic flamegraph, TrackEvent
  callstack, symbolization, inline functions, R8 retracing, DataGrid, and
  profile/frame/Binder/GC cross-analysis.
- Useful information:
  - System trace and CPU profiles answer different questions. System trace gives
    time windows and thread states; profile gives sampled call stacks. Neither
    should replace the other.
  - Pure pprof/collapsed stack data lacks Android timeline context, so it cannot
    explain a specific frame/ANR/startup window alone.
  - Android 10-14 CPU profiling should use Simpleperf protobuf import; Perfetto
    `linux.perf` command-line capture is Android 15+ with
    profileable/debuggable/userdebug gates.
  - Flamegraph width is sample count, not per-call duration. Conclusions need
    enough samples in the selected window/thread, plus matching system trace
    evidence.
  - Symbolization and R8 retracing depend on Build ID, unstripped symbols, and
    matching mapping.txt. Missing symbols only identify an unknown mapping hot
    region, not concrete source.
  - Good workflow: locate abnormal window, confirm profile input quality, narrow
    by thread/scenario, inspect flamegraph, quantify with SQL, then state
    sample rate/device/build/symbol boundary.
- SmartPerfetto impact:
  - High future value for adding profile-aware reports or advising users when
    trace evidence needs callstack sampling.
- Candidate target:
  - Add strategy guardrails: never turn a global flamegraph hotspot into a
    frame-level root cause without selected-window sample count and trace
    correlation.
- Risks/caveats:
  - Finalized/pass-tech-review. Some v53/v54 UI/DataGrid features depend on
    local Perfetto version and should be capability-checked.
- Status: read, high-value profiling evidence-boundary source.

### 211. `part3-tools/ch13-perfetto/13-cpu-frequency-dvfs-analysis.md`

- Type: CPU frequency and DVFS analysis: `power/cpu_frequency`,
  `power/cpu_idle`, `linux.sys_stats`, `linux.system_info`, CPU clusters,
  sched/thread_state correlation, DVFS lag, AI inference governor mismatch,
  EAS/uclamp/thermal boundaries, and SQL templates.
- Useful information:
  - CPU frequency tracks and thread state tracks answer different questions:
    Running means scheduled on CPU, not necessarily high-frequency, high-power,
    or high-efficiency execution.
  - `power/cpu_frequency` is event-driven and can miss the initial value;
    `linux.sys_stats.cpufreq_period_ms` can fill initial/periodic frequency
    but cannot represent short burst transitions precisely.
  - Idle intervals weaken frequency semantics because clock-gated CPUs can keep
    displaying the previous run frequency. Power claims must include cpuidle/
    rail/thermal evidence.
  - Running should be correlated with CPU id, cluster/capacity, frequency,
    cpuidle, thermal/uclamp/power mode, and surrounding 50-200 ms context.
  - Use `cpu.cluster_id`/`capacity` or `cpu_freq` available frequencies first
    for cluster identification; fall back to sysfs/policy only in local
    reproducible experiments.
  - For mobile AI inference, CPU/GPU/memory governors can be independently
    misaligned. CPU frequency alone is only partial evidence.
- SmartPerfetto impact:
  - High-value for jank/startup/power/AI reports. It prevents "CPU slow" claims
    from being made without actual frequency/cluster/state evidence.
- Candidate target:
  - Add DVFS-aware interpretation to thread-state strategies: only discuss CPU
    frequency when Running dominates, and include cluster/idle/thermal caveats.
- Risks/caveats:
  - Finalized/pass-tech-review, medium confidence. Device/vendor governor and
    exposed counter support vary heavily; avoid cross-device generalization.
- Status: read, high-value CPU/DVFS source.

### 212. `part3-tools/ch13-perfetto/14-perfetto-data-explorer-jank-cuj.md`

- Type: Perfetto v54 DataGrid and Jank CUJ standard-library workflow:
  DataGrid table/pivot filtering, `android_jank_cuj` metrics, relevant threads,
  weighted jank counters, FrameTimeline/thread_state integration, schema
  migration, heap_graph_stats/dmabuf, and third-party app CUJ boundaries.
- Useful information:
  - DataGrid is an interactive table viewer for SQL outputs; SQL still defines
    evidence. Build narrow tables with one row per CUJ/frame/slice/thread-state
    object and explicit evidence columns.
  - `android_jank_cuj` defaults to system/google process scope; third-party apps
    need AndroidX JankStats, custom `Trace.beginSection("J<...>")` markers with
    custom SQL, or direct FrameTimeline joins.
  - CUJ is for scenario windowing, FrameTimeline for abnormal frames, and
    `thread_state` for wait/execute classification. Root cause still requires
    drilling into UI/RT/GPU/HWC/SF evidence.
  - Weighted jank counters help rank severity but do not explain cause.
  - v54 schema changes (`slice.stack_id` removal, machine_id/metadata changes,
    SQL package flag changes) make capability/version checks necessary.
  - `android.memory.heap_graph.heap_graph_stats` can correlate Java heap,
    NativeAllocationRegistry, RSS/swap, OOM score, and `dmabuf_rss_size`.
- SmartPerfetto impact:
  - High-value for future CUJ/scene-level reports, especially selected-scope
    and scrolling reports. Also reinforces keeping SQL results narrow and
    evidence-rich.
- Candidate target:
  - Add third-party CUJ caveats and FrameTimeline-direct fallback to jank
    strategy; consider heap_graph_stats/dmabuf checks for graphics-memory cases.
- Risks/caveats:
  - Finalized/pass-tech-review, medium confidence. v54-specific features must
    be gated by bundled Trace Processor capability.
- Status: read, high-value CUJ/DataGrid source.

### 213. `part3-tools/ch13-perfetto/15-bufferqueue-blocking-perfetto.md`

- Type: BufferQueue blocking recognition in Perfetto: FrameTimeline Buffer
  Stuffing, RenderThread `dequeueBuffer`, BLAST `QueuedBuffer`, producer/
  consumer causality, SurfaceView/video/Camera cases, misdiagnosis boundaries,
  Android 16+ release channel caveat, and SQL templates.
- Useful information:
  - `Buffer Stuffing` is a queue-state/latency label, not direct proof that App
    CPU drawing exceeded deadline. It can indicate steady frame rate with rising
    input-to-display latency.
  - Evidence chain should combine same-layer FrameTimeline (`jank_type`,
    `layer_name`, app/display tokens), `QueuedBuffer`, producer `dequeueBuffer`
    waiting, SF latch/composition/present, releaseBuffer/fence timing, and
    thread state.
  - RenderThread `dequeueBuffer` waits indicate producer backpressure only when
    paired with layer-specific queue/release evidence; EGL/HWUI wrappers and
    ROM naming can hide the exact slice.
  - Multi-surface scenes require layer-specific attribution. Main-window jank,
    video Surface, Camera preview, WebView/GL Surface, SurfaceView, and
    TextureView must not be conflated.
  - Distinguish BufferQueue backpressure from main-thread layout work, GPU fence
    waits, SurfaceFlinger/HWC slowness, Binder/lock waits, and release fence
    delays.
- SmartPerfetto impact:
  - Very high-value for rendering/jank/video/camera strategies and selected
    range analysis.
- Candidate target:
  - Add a BufferQueue-backpressure diagnostic branch requiring same-layer token
    and release/queued/dequeue evidence before claiming buffer stuffing root
    cause.
- Risks/caveats:
  - Finalized/pass-tech-review, medium confidence. `BUFFER_RELEASE_CHANNEL` is
    Android 16+/main pending verification; do not claim Android 14/15 behavior
    from that flag.
- Status: read, very high-value BufferQueue evidence-chain source.

### 214. `part3-tools/ch13-perfetto/16-agent-perfetto-analysis-protocol.md`

- Type: Agent-assisted Perfetto analysis protocol: input constraints,
  scratchpad evidence chain, schema/stdlib SQL guards, six investigation
  domains, Wall vs CPU separation, global review, output template, trace capture
  planner, version/vendor differences, SQL template tests, and source mapping.
- Useful information:
  - Agent analysis must collect trace path, problem type, target package,
    Android version/device/ROM, scenario/window, capture config, and exact
    question before open-ended investigation.
  - Scratchpad should record only verified facts: window, object, evidence,
    SQL/query result, and exclusions. Hypotheses stay separate until verified.
  - SQL generation must inspect schema/stdlib first, use `utid/upid`, handle
    `dur=-1`, use overlap conditions for windows, prefer stdlib modules, and
    avoid non-equivalent `SPAN_JOIN` partitions.
  - Six investigation domains map evidence and next hops: CPU, Graphics, I/O,
    IPC, Memory, Power.
  - Every long slice needs Wall vs CPU/thread-state breakdown before root-cause
    wording. Waiting time inside a function slice is not proof of computation
    in that function.
  - After a local candidate is found, perform global review: longest slices,
    D-state, FrameTimeline/Binder, and key counters in the window.
  - Final reports should include problem window, conclusion, evidence table,
    blocker, exclusions, confidence, recapture suggestions, and actionable
    optimization steps.
  - SQL templates need smoke/schema/boundary/semantic tests like code.
- SmartPerfetto impact:
  - Highest-value article for this goal. It directly describes the product
    behavior SmartPerfetto should enforce in strategy/report contracts.
- Candidate target:
  - Use this as the backbone for the final implementation plan: add
    evidence-first report protocol, capture-gap output, global review, and
    template validation for SmartPerfetto strategies/skills.
- Risks/caveats:
  - Finalized/pass-tech-review, medium confidence. It is a workflow protocol,
    so implementation must adapt to existing SmartPerfetto architecture rather
    than hardcoding a separate process.
- Status: read, top-priority SmartPerfetto agent protocol source.

### 215. `part3-tools/ch13-perfetto/17-perfetto-sdk-in-app-tracing.md`

- Type: Perfetto SDK and in-app trace data-source guide: AndroidX/platform
  tracing boundaries, native `track_event`, custom data sources, in-process vs
  system backend, startup tracing, online triggered capture, build/ABI costs,
  privacy, ProfilingManager, and APM integration.
- Useful information:
  - `androidx.tracing` and `android.os.Trace` are enough for Java/Kotlin
    sections; Perfetto SDK is mainly for native modules, engines, render
    pipelines, ML inference, counters, and structured application context.
  - `track_event` covers slices, async slices, counters, and debug annotations;
    custom data sources are only justified when stable protobuf schemas,
    downstream consumers, and bounded volume exist.
  - In-process backend captures only app-emitted events. It does not include
    scheduling, Binder, ftrace, SurfaceFlinger, or other process data.
  - System backend lets the app act as a producer for a system trace session,
    but does not give ordinary apps permission to read whole-device traces.
  - Startup tracing is a system-backend path; in-process sessions should not be
    described as caching events from before the session exists.
  - Online capture must split app-owned events from system-level evidence, and
    must handle sampling, consent, file size, network, retention, and privacy.
  - Categories/event names should be stable technical labels; debug annotations
    and counters need low-sensitivity fields, units, and bounded cardinality.
  - `ProfilingManager` returns redacted request-app results, not adb-equivalent
    whole-device traces.
- SmartPerfetto impact:
  - High-value for recapture guidance, capture-gap explanations, and future
    app-instrumentation advice in reports.
- Candidate target:
  - Add strategy/report language that recommends the right capture/instrument
    path when trace evidence is missing: AndroidX tracing, Perfetto SDK
    `track_event`, custom data source, ProfilingManager, adb/system trace, or
    APM summary.
- Risks/caveats:
  - Finalized/pass-tech-review, medium confidence. Android 17 SDK/
    ProfilingManager interactions and C SDK package-size costs are still listed
    as follow-up verification items.
- Status: read, high-value capture and instrumentation boundary source.

### 216. `part3-tools/ch13-perfetto/18-smartperfetto-trace-analysis-platform.md`

- Type: SmartPerfetto platform contract overview: reusable analysis results,
  AI Assistant workflow, Skill/strategy/template layering, SQL guardrails,
  evidence source indexes, multi-trace comparison, provider/runtime boundaries,
  privacy, quality tests, enterprise governance, and AIW feedback loops.
- Useful information:
  - SmartPerfetto outputs should be treated as separate artifacts: chat answer,
    SQL/Skill tables, HTML report, and analysis result snapshot.
  - The model should not directly read full trace files. It should reason over
    tool-returned SQL/Skill results, table summaries, selected context, and
    report fragments.
  - Skill, strategy, and template have clear boundaries: executable SQL/table
    output, scene routing/execution order, and report organization.
  - Reports must let numeric claims trace back to tool calls, table rows/columns,
    query hashes, `evidenceRefId`, `sourceToolCallId`, `traceSide`, and plan
    phase when available.
  - SQL guardrails must expose final executable SQL, stdlib includes, Skill
    dependencies, and high-risk SQL patterns while preserving missing-data and
    degraded-result boundaries.
  - Multi-trace comparison should distinguish raw reference trace comparison
    from analysis-result snapshot comparison.
  - Current standard comparison keys are broader than current backfill support:
    standard backfill is described as covering `startup.total_ms` and basic
    scrolling FPS/Jank, while TTFD, PSS, heap, dmabuf, RSS/swap, and similar
    metrics may come from Skills/templates rather than built-in backfill.
  - Provider Manager troubleshooting must separate backend connection,
    provider profile, active provider, env fallback, and runtime.
  - Skill quality requires fixed traces, SQL smoke/schema checks, output column
    contracts, golden values/reports, and missing-field samples.
- SmartPerfetto impact:
  - Highest-value repo-specific article. It confirms the architecture-level
    target for this goal: evidence-first Skills/strategies, reusable reports,
    traceable claims, and golden regression coverage.
- Candidate target:
  - Use this article as a checklist during synthesis, but verify every claim
    against the current repository before editing because the article describes
    intended/current platform behavior at a point in time.
- Risks/caveats:
  - Finalized/pass-tech-review, medium confidence. It references SmartPerfetto
    `main` as of 2026-05-28, so current branch state may differ.
- Status: read, top-priority SmartPerfetto product-contract source.

### 217. `part3-tools/ch13-perfetto/README.md`

- Type: Perfetto chapter overview and reading-order guide.
- Useful information:
  - Reaffirms that Perfetto is the shared timeline for cross-thread,
    cross-process, cross-system Android performance issues.
  - Organizes the chapter into capture, UI interpretation, large traces, topic
    analysis, CPU state, advanced usage, input latency, tracing infrastructure,
    SQL, span joins, profiles, DVFS, CUJ, BufferQueue, and agent protocols.
  - Suggested first-pass workflow is UI interpretation, then trace capture, then
    targeted topic/CPU/input/SQL analysis.
- SmartPerfetto impact:
  - Medium value as taxonomy for strategy `doc_path` references and report
    recapture/next-reading suggestions.
- Candidate target:
  - When updating Skill/strategy docs, use this taxonomy to group references
    rather than scattering article links ad hoc.
- Risks/caveats:
  - Last verified before the 13.17 and 13.18 additions, so it is an orientation
    source rather than the authoritative current chapter inventory.
- Status: read, medium-value taxonomy source.

### 218. `part3-tools/ch14-other-tools/01-as-profiler.md`

- Type: Android Studio Profiler guide: CPU/System Trace/Method Trace/
  Callstack Sample, Memory Profiler, Network Inspector, Power Profiler,
  `profileable`, ProfilingManager triggers, and Perfetto relationship.
- Useful information:
  - Profiler is app-centric and good for IDE/source-level narrowing; Perfetto is
    required for system-wide scheduling, multi-process competition, and render
    pipeline context.
  - System Trace is the first-line low-overhead CPU/profiling mode and is
    compatible with Perfetto exports.
  - Java Method Trace is primarily for call hierarchy; its timings can be
    heavily distorted by instrumentation overhead and should not be used as
    ground-truth wall time.
  - Callstack Sample is for statistical CPU hotspots; short work below the
    sample interval can be missed.
  - Memory Profiler covers Java heap curves, heap dumps, allocation tracking,
    and native allocation tracking, but heap dumps and full allocation tracking
    have significant overhead.
  - `profileable` release-like builds are preferred for performance profiling;
    `debuggable` is still needed for some Java heap/allocation capabilities.
  - Power Profiler ODPM rails are device/subsystem measurements, not purely
    app-specific attribution.
  - ProfilingManager can trigger app fully drawn and ANR traces, but returned
    artifacts are platform-controlled profiling results.
- SmartPerfetto impact:
  - Medium/high value for recapture advice and confidence wording. It helps
    reports explain when a Perfetto trace is insufficient and when Profiler,
    simpleperf, heap dump, allocation tracking, or Power Profiler evidence is
    the right next tool.
- Candidate target:
  - Add recapture/tool-selection guidance that distinguishes system trace,
    method trace, callstack sample, heap dump, allocation tracking, and ODPM
    power rails.
- Risks/caveats:
  - Finalized/pass-tech-review, high confidence, but some Java Method Trace
    profileable support details are still version-gated.
- Status: read, medium/high-value external-tool boundary source.

### 219. `part3-tools/ch14-other-tools/02-simpleperf.md`

- Type: Simpleperf guide: Android CPU profiling, sampling mechanics,
  permissions, `stat`/`record`/`report`, software events, PMU events,
  flamegraphs, Perfetto callstack sampling comparison, native symbols,
  off-CPU profiling, kernel symbols, and import paths.
- Useful information:
  - Simpleperf is statistical sampling, not exact method timing. Flamegraph
    width means sample share, not precise wall duration.
  - It is the right follow-up when Perfetto proves a thread is Running but
    available trace sections cannot identify which function/code path consumed
    CPU.
  - `cpu-cycles` is useful for CPU hot spots; `cpu-clock`/`task-clock` with
    `--trace-offcpu` can split on-CPU and off-CPU sample views.
  - PMU events such as cache misses and branch misses are hardware/kernel/
    permission dependent. `profileable` enables app profiling but does not
    grant arbitrary PMU access.
  - Profileable release-like builds are preferred for CPU profiling; older
    Android versions and non-root devices have Java stack and permission limits.
  - Symbol quality controls report value: native profiling needs unstripped
    libraries/binary cache, Java stacks are version dependent, and kernel
    symbolization usually needs root/userdebug/kallsyms or vmlinux.
  - Simpleperf is depth-oriented; Perfetto is breadth-oriented. Perfetto can
    correlate samples with ftrace, sched, Binder, GC, and frame evidence.
  - Simpleperf data can be viewed through native HTML/Speedscope paths or
    imported into Perfetto via simpleperf proto when timeline/SQL correlation is
    needed.
- SmartPerfetto impact:
  - High value for CPU-hotspot recapture guidance and future profile-aware
    reports. It should be used to explain when a high Running span needs
    function-level samples rather than more trace SQL.
- Candidate target:
  - Add recapture guidance for CPU-bound findings: require sample count, symbol
    mapping, Android/profileable/root constraints, and Perfetto correlation
    before treating a flamegraph as root-cause evidence.
- Risks/caveats:
  - Article metadata is mixed: confidence high and finalized, but
    `task9_result` still says `needs-rework`. Use conservative wording and
    verify exact command/version details before implementation.
- Status: read, high-value CPU profile boundary source.

### 220. `part3-tools/ch14-other-tools/03-memory-tools.md`

- Type: Memory tools survey: LeakCanary, MAT, heapprofd, dumpsys meminfo,
  showmap/procrank/libmeminfo, Graphics/dma-buf memory, malloc debug/hooks,
  HWASAN, MTE, and tool-selection workflows.
- Useful information:
  - LeakCanary detects Java component leaks and can leave visible `dumpHprof`
    slices in Perfetto when it dumps heap.
  - MAT/hprof is for Java reference-chain analysis; Android 8+ Bitmap pixels
    usually live outside Java heap, so MAT alone cannot explain modern bitmap/
    graphics memory growth.
  - heapprofd samples `malloc`/`free` allocations and can show allocation stacks
    and live allocations, but it does not see Graphic Buffer/dma-buf/Surface
    memory and does not by itself prove a leak.
  - `dumpsys meminfo` gives PSS/USS/Private Dirty/SWAP snapshots and category
    splits. PSS estimates system pressure contribution; USS estimates private
    memory freed by killing the process.
  - Native Heap, Java Heap, Graphics/dma-buf, mmap regions, and system LMK
    pressure need separate evidence paths.
  - Graphics/dma-buf growth should be checked with meminfo, showmap/smaps,
    SurfaceFlinger layer/buffer state, and Perfetto render/BufferQueue tracks.
  - LMKD decisions are not just total PSS; PSI/vmpressure, swap/thrashing,
    oom_score_adj, and device policy matter.
  - malloc debug/hooks and HWASAN/MTE are diagnostic tools with significant
    environment, architecture, and overhead constraints.
- SmartPerfetto impact:
  - High value for memory and graphics-memory strategy boundaries. It prevents
    conflating Java heap leaks, native malloc growth, graphics buffer retention,
    and system memory pressure.
- Candidate target:
  - Add memory evidence taxonomy to synthesis: Java Heap, Native Heap,
    Graphics/dma-buf, PSS/USS/LMK, allocator safety, and required next-tool
    guidance.
- Risks/caveats:
  - Status is `ready-for-review`/`task9_pending` despite high confidence. Treat
    as useful but not final; verify exact signals before encoding.
- Status: read, high-value memory-tool boundary source.

### 221. `part3-tools/ch14-other-tools/04-dumpsys.md`

- Type: dumpsys command guide: activity/exit-info, meminfo, gfxinfo, cpuinfo,
  window/input focus, batterystats, SurfaceFlinger layers/HWC/latency, package,
  alarm, jobscheduler, and custom service dumps.
- Useful information:
  - dumpsys provides state snapshots; Perfetto provides time-series process and
    causality. A snapshot can support context but should not replace timeline
    evidence.
  - ANR/root-cause checks should prefer `dumpsys activity exit-info` on modern
    Android; `lastanr` is only a most-recent legacy fallback.
  - `meminfo` PSS/USS/Private Dirty/SwapPss and category splits have distinct
    meanings and should not be merged into a single "memory used" claim.
  - `gfxinfo` aggregate and `framestats` are useful prefilters, but VRR/ARR and
    Android version columns require `FrameDeadline`/`FrameInterval` aware
    interpretation and Perfetto FrameTimeline confirmation.
  - `cpuinfo` is a momentary process CPU snapshot; process lines differ from the
    global `TOTAL` line, and page-size differences affect fault comparisons.
  - Window focus needs WMS and InputDispatcher correlation; multi-display cases
    cannot rely on one global `mCurrentFocus` grep.
  - SurfaceFlinger dumps changed in Android 15+ FrontEnd paths; layer list,
    Frontend snapshot, HWC view, and `--latency` answer different questions.
  - `--latency` actual vs desired present deltas are a first filter, not a
    complete VRR/deadline analysis.
- SmartPerfetto impact:
  - High value for report context and recapture guidance, especially when a
    trace lacks Activity state, focus, frame snapshots, memory snapshots, layer
    names, or battery history.
- Candidate target:
  - Add a "snapshot evidence vs trace evidence" rule to the implementation plan:
    use dumpsys-derived data only as contextual/supporting evidence unless it
    is linked to a trace window or repeated trend.
- Risks/caveats:
  - Status is `ready-for-review`/`task6_pending`, confidence medium. Use for
    strategy guidance, not as a hard-coded parser contract without verification.
- Status: read, high-value snapshot/tool-boundary source.

### 222. `part3-tools/ch14-other-tools/05-third-party-libs.md`

- Type: Third-party performance library survey: Matrix, KOOM, Booster, startup
  DAG frameworks, LeakCanary, btrace/Rhea, Firebase Performance, Measure,
  DoKit, BlockCanary, Rabbit, PLT hook, inline hook, Transform, and tool
  selection.
- Useful information:
  - Official tools are for deep analysis; third-party libraries are mostly for
    online detection, preservation, governance, or local developer diagnostics.
  - Matrix/Trace Canary, KOOM, Booster, Rhea/btrace, Firebase, Measure, and
    DoKit occupy different layers and should not be compared as one flat list.
  - Online monitoring evidence may identify suspicious stacks/events but does
    not replace Perfetto when render pipeline, scheduling, Binder, or system
    context is needed.
  - Hook/instrumentation approaches carry overhead, compatibility, page-size,
    AGP, and conflict risks; multi-library deployments need measured baselines.
  - Rhea/btrace is relevant when app-side or remote trace capture is needed, but
    instrumentation overhead itself can create misleading trace artifacts.
- SmartPerfetto impact:
  - Medium value for future online-evidence integration and recapture advice.
    It reinforces that SmartPerfetto reports should label APM/third-party data
    as external evidence unless imported into the trace/evidence model.
- Candidate target:
  - Add tool-selection wording that recommends third-party APM/trace libraries
    for online detection or preservation, while keeping SmartPerfetto root-cause
    claims tied to trace/Skill evidence.
- Risks/caveats:
  - Finalized/pass-tech-review, medium confidence. Library compatibility changes
    quickly, so avoid hard-coding current AGP/SDK support in product logic.
- Status: read, medium-value online-tool ecosystem source.

### 223. `part3-tools/ch14-other-tools/06-automation-tools.md`

- Type: Automation and benchmark tools guide: Macrobenchmark,
  Microbenchmark, `am instrument`, UI Automator, Espresso, Monkey, SoloPi,
  Appium, CI/CD, Firebase Test Lab, trace outputs, and benchmark noise.
- Useful information:
  - Macrobenchmark measures end-to-end user-perceived performance such as
    startup, scrolling, animations, and power; each iteration can emit Perfetto
    traces for root-cause analysis.
  - Microbenchmark measures code-level hotspots after a larger workflow has
    identified candidate code.
  - Startup metrics must distinguish TTID and TTFD; TTFD depends on
    `reportFullyDrawn()` matching meaningful content completion.
  - FrameTimingMetric on API 31+ should prefer deadline/overrun signals; older
    devices rely more on frame-time distributions and trace inspection.
  - CI benchmark runs need real devices, stable model/OS/thermal/power state,
    multiple iterations, trend tracking, and explicit missing-metric handling.
  - UI Automator is appropriate for Macrobenchmark black-box driving; Espresso
    is for functional validation and should not be used as a measurement driver.
  - Monkey/SoloPi/Appium are useful for stress, scenario scripting, or visual
    checks, but do not provide trustworthy performance metrics by themselves.
  - Benchmark JSON and generated Perfetto traces are complementary: JSON gates
    regression, traces explain root cause.
- SmartPerfetto impact:
  - Medium/high value for SmartPerfetto's own verification philosophy and for
    report guidance around trace regression, golden traces, and stable benchmark
    baselines.
- Candidate target:
  - During synthesis, map this to SmartPerfetto testing: fixed trace corpora,
    deterministic Skill outputs, golden report/evidence checks, and trend/noise
    handling, rather than Android device benchmarks unless the changed surface
    requires device capture.
- Risks/caveats:
  - Status is `ready-for-review`; `task9_result` says `needs-rework` for at
    least one AndroidX Benchmark instrumentation-argument issue. Use only broad
    architecture/testing principles without copying exact command forms.
- Status: read, medium/high-value automation and regression source.

### 224. `part3-tools/ch14-other-tools/07-profiling-manager.md`

- Type: ProfilingManager guide: AndroidX explicit profiling requests,
  platform results, four profiling types, buffer policies, result listeners,
  system-triggered profiling, version/extension boundaries, failure handling,
  privacy, and archive flow.
- Useful information:
  - Explicit requests use AndroidX `Profiling.requestProfiling(...)`, while
    results are platform `android.os.ProfilingResult`.
  - Four result types answer different questions: system trace for thread/
    startup/ANR timelines, Java heap dump for object/reference questions, heap
    profile for allocation growth/hotspots, and stack sampling for CPU stacks.
  - `BufferFillPolicy` only has public `RING_BUFFER` and `DISCARD`; end-window
    jank/ANR favors ring buffer, early startup preservation favors discard.
  - `registerForAllProfilingResults()` receives current-UID results from both
    explicit requests and system triggers, so archive flows need de-duplication
    by result path or trigger/tag/error key.
  - API 36, extension/version 36.1, and API 37 triggers must be version-gated
    separately. `APP_FULLY_DRAWN` and `COLD_START` cover different startup
    windows and artifacts.
  - Failure errors must be reported as rate limit, no disk space,
    post-processing failure, profiling already in progress, etc.; system rate
    limits should trigger backoff, not foreground retry loops.
  - Profiling outputs are current-UID artifacts, but still contain sensitive
    trace/heap/stack context and need tag hygiene, retention, cleanup, consent,
    encryption, and upload controls.
- SmartPerfetto impact:
  - High value for recapture recommendations and online evidence guidance,
    especially for ANR, cold start, jank, CPU sampling, heap growth, and OOM
    cases.
- Candidate target:
  - Add version-gated ProfilingManager recommendations to report recapture
    advice, with artifact type, buffer policy, privacy, and rate-limit caveats.
- Risks/caveats:
  - Finalized/pass-tech-review. Still avoid hardcoding exact trigger support in
    SmartPerfetto logic without runtime/device capability checks.
- Status: read, high-value online profiling source.

### 225. `part3-tools/ch14-other-tools/08-gpu-debug-tools.md`

- Type: GPU graphics debugging and profiling tools guide: Perfetto GPU
  counters/renderstages, AGI System/Frame Profiler, RenderDoc, Sokatoa,
  vendor tools, GPU bottleneck metrics, profileable/debuggable boundaries,
  ANGLE, and profiling overhead.
- Useful information:
  - Perfetto is the entry point for deciding whether GPU is involved, using GPU
    counters, frequency/utilization/bandwidth, and `gpu.renderstages`.
  - Perfetto cannot identify a specific Draw Call, shader, resource, or
    overdraw source; AGI/RenderDoc/vendor tools are needed for frame-level
    evidence.
  - CPU submit vs GPU execution split is a key branch: fast CPU submit plus long
    GPU activity suggests GPU bound; long RenderThread/dequeue/queue waits with
    short GPU work suggests CPU/buffer/backpressure.
  - GPU utilization alone is not proof of root cause. Bandwidth, ALU, frequency,
    thermal throttling, overdraw, and frame workload all change interpretation.
  - Perfetto GPU counter IDs/semantics are vendor-specific and should not be
    compared across Adreno/Mali/PowerVR without counter docs.
  - AGI Frame Profiler and RenderDoc need debuggable/frame-capture conditions
    and can heavily perturb runtime; they should not be used to measure real
    frame rate.
  - `profileable` supports Perfetto/simpleperf style release-like profiling, but
    frame capture often still requires `debuggable`.
  - GLES/ANGLE routing changes on Android 15-17 affect frame-analysis paths and
    must be confirmed per device.
- SmartPerfetto impact:
  - Very high value for rendering/jank/GPU strategies. It clarifies what
    SmartPerfetto can conclude from trace-only evidence and when reports should
    recommend AGI, RenderDoc, Sokatoa, or vendor tools.
- Candidate target:
  - Add GPU evidence boundaries: require Perfetto GPU/renderstage evidence for
    trace claims; only recommend Draw Call/shader/overdraw causes as hypotheses
    unless frame-level external evidence is attached.
- Risks/caveats:
  - Finalized/pass-tech-review, medium confidence. Tool availability and GPU
    counter semantics vary by device/vendor, so avoid hard-coded thresholds
    beyond conservative diagnostic branches.
- Status: read, very high-value GPU evidence-boundary source.

### 226. `part3-tools/ch14-other-tools/09-camera-performance-analysis.md`

- Type: Camera performance and Perfetto analysis guide: preview stutter,
  photo latency, video drops, memory pressure, HAL3 buffer flow, cameraserver,
  vendor HAL slices, BufferQueue, Frame/Buffer SQL, Camera startup, power,
  Camera2/CameraX, HAL latency, and GFXReconstruct.
- Useful information:
  - Camera issues must be split into preview stutter, photo latency, video
    drops, and memory pressure. Each has different tracks and evidence.
  - Camera buffer flow branches by consumer: SurfaceView can go directly through
    SF/HWC, TextureView adds SurfaceTexture/GLConsumer sampling and App View
    composition, and ImageReader/MediaCodec have separate CPU/codec paths.
  - Useful trace categories include `camera`, `gfx`, `view`, `hwc`, and
    `binder_driver`, plus process stats.
  - `cameraserver`, vendor camera provider/HAL, App process, SurfaceFlinger,
    and media codec processes must be separated. Modern Android should not
    assume one old `/system/bin/mediaserver` path.
  - Camera SQL should first identify actual process/track/thread with
    `utid`/`upid`/track joins, then calculate FPS/interval/jitter per stream or
    track. Same-name slices across streams can inflate FPS if aggregated.
  - Buffer exhaustion/backpressure evidence requires `request_stream_buffers`,
    `return_stream_buffers`, `dequeueBuffer`, `queueBuffer`, SF latch, release
    fence, and consumer-held-buffer context.
  - Camera launch can be decomposed from input/open/connect/configure/
    submitRequest/first-full-buffer, but vendor slice names such as Qualcomm
    `CameraHal::openSession` need fallbacks.
  - CameraMetadataNative memory pressure is a retained-result/native metadata
    problem; App code should extract needed fields and drop result objects.
  - GFXReconstruct can inspect graphic API buffer content only for suitable
    paths; SurfaceView/HWC overlay or Sensor/ISP internals require HAL/vendor
    evidence.
- SmartPerfetto impact:
  - Very high value for future Camera/rendering/video strategies and for
    avoiding false HAL attribution in mixed Surface/BufferQueue cases.
- Candidate target:
  - Add Camera-specific evidence chain only if current SmartPerfetto has camera
    strategies; otherwise fold its BufferQueue, track-discovery, vendor-slice,
    and memory-boundary rules into rendering/video/selected-scope analysis.
- Risks/caveats:
  - Finalized/pass-tech-review, medium confidence. Vendor HAL slice names and
    CameraX overhead numbers are device-sensitive and should stay caveated.
- Status: read, very high-value Camera/BufferQueue evidence-chain source.

### 227. `part3-tools/ch14-other-tools/10-ebpf-performance-analysis.md`

- Type: Android eBPF/BPF performance-analysis guide: Android BPF loader,
  platform BPF programs, CO-RE, Simpleperf kprobe/uprobe via perf_event,
  UprobeStats, sched_ext, CPU usage, syscall/I/O latency, process exit,
  Binder tracing, permissions, SELinux, and overhead.
- Useful information:
  - eBPF can aggregate/filter in-kernel with lower output volume than raw
    tracing, but it still has verifier, helper, map, probe-frequency, and ring
    buffer costs.
  - Android uses BPF for networking, CPU frequency/time-in-state, GPU memory,
    and system modules, but ordinary apps cannot load custom BPF programs on
    user builds.
  - Simpleperf `--kprobe`/`--uprobe` uses tracefs + perf_event paths, not BPF
    program loading. UprobeStats is the Android eBPF dynamic-instrumentation
    path.
  - UprobeStats in Android 16 has strict user-build allowlists and is mainly a
    system-managed diagnostic facility, not arbitrary app instrumentation.
  - sched_ext needs Linux 6.12/GKI, `CONFIG_SCHED_CLASS_EXT`, runtime nodes, and
    OEM/platform enablement; Android 16 kernel capability does not mean devices
    run BPF schedulers.
  - CPU utilization from sched_switch/eBPF can be more precise than tick-based
    `/proc/stat`, but capacity/frequency/power interpretations still need
    cpufreq/power correlation.
  - Syscall latency needs enter/exit pairing; signal/Binder tracing needs ABI
    and kernel-branch-specific constants.
- SmartPerfetto impact:
  - Medium value now, high future value. It is mostly a capability/permission
    boundary for recapture guidance and future system-level extensions, not an
    immediate trace SQL Skill source.
- Candidate target:
  - Keep eBPF recommendations as advanced/userdebug/system-build recapture
    advice. Do not imply SmartPerfetto can request arbitrary eBPF evidence from
    a normal user trace.
- Risks/caveats:
  - Status is `ready-for-review` with auto-fixed task9 metadata and a remaining
    P1 count in frontmatter. Treat as directional unless exact kernel/AOSP
    details are verified before implementation.
- Status: read, medium-value kernel-observability boundary source.

### 228. `part3-tools/ch14-other-tools/11-battery-historian.md`

- Type: Battery Historian and power-analysis tools guide: bugreport,
  batterystats, Battery Historian, Power Profiler, ODPM/Power Stats HAL,
  Perfetto power rails, Macrobenchmark PowerMetric, PowerMonitor API,
  ADPF power efficiency, and testing practices.
- Useful information:
  - Power analysis has distinct evidence chains: UID historical statistics via
    batterystats/bugreport/Battery Historian, and rail-level readings via
    PowerMonitor/Perfetto/Power Profiler.
  - Battery Historian is best for offline timeline review of wakelocks,
    cpu_running, network, gps, jobs, sync, top app, and battery-level trends.
  - Battery testing must control USB/charging, brightness, background apps,
    duration, battery state, and scenario parity.
  - Power Profiler/ODPM and PowerMonitor measure device or rail-level energy,
    not direct app-specific power attribution; App attribution is inferred from
    timing/context or modeled statistics.
  - Perfetto `android.power`/power rails can be correlated with sched/thread
    tracks and queried as counters, which makes it more useful for trace-level
    root-cause correlation than standalone Battery Historian.
  - Macrobenchmark `PowerMetric` is good for relative regression when device
    capability is confirmed and unsupported rails are treated as missing.
  - PowerMonitor readings are cumulative energy values; instantaneous power
    requires deltas between snapshots.
  - ADPF power-efficiency mode is a hint, not a guarantee, and PowerMonitor data
    does not automatically flow into ADPF.
- SmartPerfetto impact:
  - High value for power strategies and recapture guidance. It reinforces that
    power claims require explicit evidence source and attribution caveats.
- Candidate target:
  - Add power evidence taxonomy: battery history/UID stats, rail counters,
    thread/sched correlation, camera/GPU/network rails, and missing capability
    handling.
- Risks/caveats:
  - Finalized/pass-tech-review, medium confidence. Device Power Stats HAL/ODPM
    support varies and cannot be assumed from Android version alone.
- Status: read, high-value power evidence-boundary source.

### 229. `part3-tools/ch14-other-tools/12-apm-observability.md`

- Type: APM/observability platform and SDK selection guide: official baseline
  signals, client enhancement SDKs, platform capabilities, JankStats,
  FrameMetrics, ApplicationExitInfo, Android Vitals, Matrix, KOOM, LeakCanary,
  btrace, DoKit, Firebase Performance, Measure, and governance maturity.
- Useful information:
  - Online performance governance should separate official baseline signals,
    client-side evidence enhancement, and platform/governance layers.
  - JankStats gives frame-level signal and PerformanceMetricsState context, but
    it is not trace management, alerting, or a full APM.
  - FrameMetrics can supplement high-version frame breakdowns; JankStats can
    remain the broad signal layer.
  - ApplicationExitInfo is the system-truth starting point for exits on API 30+,
    but low versions still need traditional crash/ANR/session stitching.
  - Matrix/KOOM/LeakCanary/btrace/DoKit serve different roles and should be
    selected by whether the team needs detection, preservation, local debugging,
    memory governance, or platform aggregation.
  - Platform layer value is version/device/page aggregation, session replay or
    timeline, alerting, backlog flow, and data governance.
  - More instrumentation is not useful if the team lacks owners, schema, sampling
    policy, data boundaries, and a way to consume findings.
- SmartPerfetto impact:
  - Medium/high value for positioning SmartPerfetto as offline/root-cause trace
    analysis that can integrate with online APM evidence, but should not blur
    APM signals with trace-grounded proof.
- Candidate target:
  - In synthesis, preserve a distinction between online signal intake and
    SmartPerfetto trace evidence. Candidate report language can say "APM signal
    suggests recapture" without treating it as a verified trace root cause.
- Risks/caveats:
  - Finalized/pass-tech-review, medium confidence. Library and platform
    compatibility drift quickly.
- Status: read, medium/high-value observability positioning source.

### 230. `part3-tools/ch14-other-tools/13-hook-infrastructure.md`

- Type: Hook infrastructure guide: official callbacks, bytecode
  instrumentation, PLT Hook, Inline Hook, ART runtime Hook, ByteHook,
  ShadowHook, xHook, Booster, Matrix/KOOM/btrace mechanisms, Android linker
  namespace, W^X, 16KB page size, trampolines, icache flush, and compatibility
  risks.
- Useful information:
  - Hook and instrumentation mechanisms have distinct evidence and blind spots:
    official callbacks expose only platform signals; bytecode instrumentation
    covers build-time visible code; PLT Hook covers dynamic library boundaries;
    Inline Hook changes machine code; ART Hook depends on ART internals.
  - Official interfaces and build-time instrumentation are lower-risk than
    runtime native or ART hooks and should be preferred when sufficient.
  - PLT Hook misses calls that do not go through PLT/GOT and is constrained by
    linker namespace and loaded-library visibility.
  - Inline Hook requires instruction patching, page permission changes,
    icache flush, architecture-specific stubs, and ROM/SELinux compatibility.
  - Android 15+ 16KB page size affects `mprotect` alignment and native library
    `p_align`; old hook libraries hardcoding 4096 can fail or crash.
  - Android 14 safer dynamic-code-loading requirements and W^X/execmem/execmod
    constraints are separate issues and should not be conflated.
  - Hook-based performance data can be biased by instrumentation overhead,
    missing coverage, recursion handling, hook-chain conflicts, and library/
    AGP/NDK compatibility.
- SmartPerfetto impact:
  - Medium value for external evidence intake and recapture guidance. It helps
    label hook/APM/btrace-derived data as instrumented observations with
    coverage and overhead caveats.
- Candidate target:
  - If SmartPerfetto reports reference hook-based external evidence, require
    source/tool name, hook route, build type, Android version, coverage limits,
    and overhead caveat before using it as supporting evidence.
- Risks/caveats:
  - Status is `ready-for-review` with task9 auto-fixed metadata. Use for
    boundary/risk principles, not exact library compatibility assertions.
- Status: read, medium-value instrumentation-risk source.

### 231. `part3-tools/ch14-other-tools/14-android-studio-leakcanary-profiler.md`

- Type: Android Studio LeakCanary Profiler and heap dump workflow guide:
  Panda LeakCanary task, HPROF capture/export, retained paths, Memory Profiler
  fields, device/desktop/online analysis boundaries, Java vs Native/Graphics
  memory split, LeakCanary setup choices, and reproducible leak workflows.
- Useful information:
  - LeakCanary starts from lifecycle-retained objects, not from memory size.
    It tracks whether destroyed Activity/Fragment/ViewModel/etc. objects remain
    strongly reachable.
  - Leak traces should be read from GC root through intermediate holder to the
    retained object; the fix is usually at the long-lived holder edge.
  - Memory Profiler fields such as allocation count, shallow size, retained
    size, native size, and GC-root depth answer different questions.
  - HPROF mainly answers managed heap reachability. Native malloc growth,
    Graphics/dma-buf, WebView/video buffers, and Android memory-limit exits need
    heapprofd, malloc debug, showmap/SF/Perfetto, or ApplicationExitInfo.
  - Device-side LeakCanary is for early discovery; IDE/Panda task is for local
    source-context analysis; online hprof collection needs sampling, privacy,
    upload-size, rate-limit, and server-side analysis controls.
  - Reproducible leak diagnosis needs controlled scenario, original hprof,
    retained path, minimal lifecycle fix, repeat capture, and regression case.
- SmartPerfetto impact:
  - Medium/high value for memory recapture guidance and for future memory
    strategy report wording.
- Candidate target:
  - Add memory report guidance that sends Java leaks to LeakCanary/hprof/MAT
    style evidence, native allocations to heapprofd/malloc debug, and graphics
    memory to SurfaceFlinger/showmap/Perfetto.
- Risks/caveats:
  - Status is `ready-for-review`, confidence medium. Panda IDE features are
    tool-version dependent.
- Status: read, medium/high-value heap workflow source.

### 232. `part3-tools/ch14-other-tools/15-winscope-window-composition-debugging.md`

- Type: Winscope window/composition visual debugging guide: WindowManager,
  SurfaceFlinger layers, transactions, shell transitions, ViewCapture, input
  regions, Perfetto data sources, dumpsys proto snapshots, search SQL, and
  tool boundaries.
- Useful information:
  - Winscope answers state questions: which window/layer is visible, hidden,
    occluded, missing buffer, focused, transformed, or changed by transaction.
  - It does not answer why Java/native code, Binder, fence, GPU, or scheduler
    work was slow; those belong to Perfetto/AGI/trace evidence.
  - WindowManager visibility and SurfaceFlinger final visibility are distinct.
    A window can be visible in WM while its layer has no buffer, empty visible
    region, parent crop, or opaque occlusion in SF.
  - Android 15+ Winscope traces are Perfetto data sources; Android 14 and lower
    use separate WM/SF tracing or dumpsys paths.
  - Capture should be scoped to the question. SF layers/transactions, input,
    buffers, HWC, metadata, verbose traces, and input trace-all have different
    memory/performance costs.
  - Rendering diagnosis can follow a simple split: "画面不对" first Winscope,
    "画面慢" first Perfetto; mixed cases need Winscope object identity plus
    Perfetto timing around that object.
  - Search SQL can identify layer visibility, bounds, alpha, transaction, and
    transition changes, but late/slow reasons still require timing evidence.
- SmartPerfetto impact:
  - High value for rendering/window/startup/black-screen recapture guidance and
    for preventing trace-only reports from guessing state bugs without layer
    evidence.
- Candidate target:
  - Add report recapture suggestions for black screen, white screen, touch not
    working, transition, PIP/freeform, and layer occlusion cases: collect
    Winscope WM/SF/transactions plus Perfetto timing trace and screenshot/video.
- Risks/caveats:
  - Status is `ready-for-review`, confidence medium. Capture commands and data
    sources vary by Android version/build type.
- Status: read, high-value window/layer state evidence source.

### 233. `part3-tools/ch14-other-tools/16-layout-inspector-viewdebug.md`

- Type: Layout Inspector and ViewDebug guide: View/Compose tree inspection,
  live/snapshot workflows, bounds/properties/3D history, recomposition counts,
  ViewDebug exported properties, invalidate/RenderNode/DisplayList clues,
  third-party layout tools, density conversion, and Perfetto/FrameTimeline
  pairing.
- Useful information:
  - Layout Inspector answers App-internal UI structure and property questions:
    node existence, bounds, constraints, visibility, hierarchy, Compose
    semantics, and recomposition counters.
  - It does not explain frame cost, RenderThread, GPU, HWC, SF, Binder, or
    scheduler timing; those require Perfetto/Winscope/AGI.
  - Compose recomposition counts are clues, not proof of jank. They need
    Perfetto or Compose tracing correlation with main-thread cost, allocations,
    or FrameTimeline jank.
  - ViewDebug/exported properties explain why some fields are visible to tools
    and others are not; reflection/log-based debug paths are not online
    monitoring mechanisms.
  - `invalidate()` marks dirty regions and schedules traversal, but does not
    fix measure/layout errors. DisplayList/RenderNode clues belong to draw
    invalidation, not layout.
  - Screenshots, snapshots, layout trees, Winscope traces, and Perfetto traces
    answer different parts of a UI issue and should be captured together for
    reproducible reports.
- SmartPerfetto impact:
  - Medium/high value for UI-state recapture guidance, especially selected-scope
    or rendering reports that need to distinguish layout structure from timing.
- Candidate target:
  - Add UI recapture advice: use Layout Inspector/snapshot for App UI tree
    evidence, Winscope for window/layer state, Perfetto for timing, and avoid
    treating recomposition or hierarchy depth as root cause without frame data.
- Risks/caveats:
  - Status is `ready-for-review`, confidence medium. IDE feature availability is
    Android Studio/version/build-type dependent.
- Status: read, medium/high-value App UI state source.

### 234. `part3-tools/ch14-other-tools/17-statsd-system-metrics.md`

- Type: statsd and system metrics guide: StatsD APEX, atoms, pushed/pulled
  atoms, metric configs, ANR/LMK/job/start/power/game/UprobeStats atoms, adb
  `cmd stats`, Perfetto/logcat/dumpsys cross-validation, permissions, Tradefed,
  APM boundaries, and vendor atom compatibility.
- Useful information:
  - statsd is a system event/metric aggregation service, not a timeline trace.
    It can prove an atom/metric was reported, but not reconstruct causal
    execution order.
  - Atom facts and metric configs must be separated. Missing metrics may mean
    the config did not collect a signal, not that the event did not happen.
  - ANR, crash, LMK, JobScheduler, startup, wakelock, CPU time, input latency,
    and UprobeStats events are useful event indexes that need Perfetto/logcat/
    dumpsys/traces/tombstone follow-up.
  - `cmd stats` is useful for local/system validation but has root/shell,
    userdebug/eng, UID, and binary-proto constraints.
  - Long-term dashboards must pin atom ID, field number, Android version,
    metric config version, and fallback behavior.
  - APM should own App/user/session/business context; statsd should own system
    event and aggregate signals. Backend correlation should preserve source.
- SmartPerfetto impact:
  - High value for online/system-signal intake boundaries and for report
    language that distinguishes event index from trace evidence.
- Candidate target:
  - Add an evidence-source distinction for statsd/APM signals: they can trigger
    or contextualize trace analysis but require trace/log/dump proof before
    root-cause wording.
- Risks/caveats:
  - Status is `ready-for-review`, confidence medium. Atom fields and OEM/vendor
    extensions drift by Android version.
- Status: read, high-value system-metric boundary source.

### 235. `part3-tools/ch14-other-tools/18-android-performance-analyzer.md`

- Type: Android Performance Analyzer guide: APA positioning, Android Studio
  System Trace viewer, Perfetto TraceConfig, GPU counters, SurfaceFlinger, frame
  path analysis, project-based trace comparison, AI SQL assistance, and
  SmartPerfetto/agent workflow boundaries.
- Useful information:
  - APA consumes Perfetto traces and adds a performance-workbench layer: CPU,
    GPU, memory, power, SF events, screenshots, project comparison, bookmarks,
    annotations, pinned tracks, and AI SQL assistance.
  - APA is useful for exploration, A/B trace comparison, and GPU/SF/frame-path
    diagnosis, but conclusions still need trace data, SQL, device/scenario
    metadata, and manual verification.
  - GPU counter availability is device/vendor/tool-version dependent. Cross
    device generalization should be avoided.
  - AI-assisted SQL should be treated as query draft and analysis starting
    point, not final performance conclusion.
  - A practical path is online/test signal -> APA/Perfetto local trace -> SQL
    verification -> stable Macrobenchmark/APM/statsd/CI signal.
  - It explicitly frames APA as interactive exploration and SmartPerfetto as
    reusable trace investigation/automation.
- SmartPerfetto impact:
  - High value for positioning and plan synthesis. It supports moving mature
    APA/Perfetto observations into SmartPerfetto Skills/strategies only after
    SQL and trace evidence stabilize.
- Candidate target:
  - Incorporate "AI SQL is draft, evidence is trace/SQL" into SmartPerfetto
    strategy/report contracts and compare SmartPerfetto automation boundaries
    with APA exploration.
- Risks/caveats:
  - Status is `ready-for-review`, confidence medium. APA was beta/new in the
    article; tool capabilities can change quickly.
- Status: read, high-value official-agent/profiler boundary source.

### 236. `part3-tools/ch14-other-tools/19-android-cli-agent-performance-workflow.md`

- Type: Android CLI and agentized performance workflow guide: project
  description, SDK/device baselines, run/layout/screen commands, Journeys,
  Android Studio semantic commands, Android skills, APA/Perfetto/Macrobenchmark
  division, CI workflow, privacy, and telemetry boundaries.
- Useful information:
  - Android CLI is workflow glue for agents: project structure, SDK/device
    state, APK install/run, layout tree, screenshots, screen coordinates, IDE
    semantic queries, and skill management.
  - It does not generate frame-level performance evidence and does not replace
    trace/profiler/benchmark outputs.
  - Performance scenarios need environment baselines, target APK, page state,
    interaction path, screenshot/layout records, trace/benchmark artifacts, and
    explicit failure handling.
  - Natural-language Journeys can drive repeatable user paths, but metrics still
    need Macrobenchmark, Perfetto, APA, profiler, or APM evidence.
  - Agent workflows must record privacy boundaries for screenshots, layout
    trees, trace files, source snippets, device serials, and external model
    contexts.
- SmartPerfetto impact:
  - Medium/high value for future e2e workflow design and this goal's testing
    philosophy: automate reproduction and UI state, but verify with traces and
    deterministic outputs.
- Candidate target:
  - Use this during final plan synthesis to distinguish automation harness from
    evidence engine and to document artifact bundles for trace regression/e2e.
- Risks/caveats:
  - Finalized/pass-tech-review, high confidence, but Android CLI/Journey command
    details are version-sensitive.
- Status: read, medium/high-value agent workflow source.

### 237. `part3-tools/ch14-other-tools/20-r8-configuration-analyzer.md`

- Type: R8 Configuration Analyzer guide: keep-rule impact, analyzer inputs,
  shrinking/optimization/obfuscation scores, high-risk rules, full mode,
  CI governance, APK Analyzer boundary, and AI-assisted R8 review.
- Useful information:
  - R8 Configuration Analyzer explains why keep rules prevented shrinking,
    optimization, or obfuscation; APK Analyzer explains final artifact size.
  - Broad keep rules, consumer rules, full-mode compatibility fallbacks, JNI,
    reflection, serialization, annotations, and generic signatures need
    separate runtime-contract validation.
  - CI should gate "rules got broader" and archive configanalyzer,
    configuration, mapping, seeds, usage, and APK/AAB diff artifacts.
- SmartPerfetto impact:
  - Low/medium value for current Skill/strategy goal. It matters only if changes
    affect Android app/package build artifacts or agent skills for R8 review,
    not trace-analysis SQL/report behavior.
- Candidate target:
  - Do not prioritize for current implementation unless synthesis finds a
    SmartPerfetto release/package/build-size surface in scope.
- Risks/caveats:
  - Status is `ready-for-review`, confidence medium. AGP/R8 versions are
    fast-moving.
- Status: read, low/medium-value build-size governance source.

### 238. `part3-tools/ch14-other-tools/README.md`

- Type: Chapter 14 overview and reading guide.
- Useful information:
  - Reaffirms the chapter's purpose: know when to stop forcing every issue into
    Perfetto and switch to CPU sampling, memory snapshots, dumpsys, automation,
    APM, or client enhancement tools.
- SmartPerfetto impact:
  - Medium value as a tool-selection taxonomy supporting recapture guidance.
- Candidate target:
  - Use as a chapter-level reminder in synthesis: SmartPerfetto should be strong
    at trace evidence while clearly recommending the next tool when trace data
    is insufficient.
- Risks/caveats:
  - README list is shorter than the current chapter contents, so it is taxonomy
    rather than authoritative inventory.
- Status: read, medium-value tool-selection overview.

### 239. `part3-tools/ch15-methodology/01-philosophy.md`

- Type: performance philosophy and methodology guide: user experience, data,
  continuous optimization, measurement effects, baseline, tool choice, ROI, and
  common pitfalls.
- Useful information:
  - Performance work should start from the user-perceived problem, not from a
    tool or a generic optimization target.
  - The basic evidence loop is baseline -> quantified problem -> measured
    improvement under comparable conditions.
  - Measurement itself affects the system: tracing overhead, sampling frequency,
    benchmark thermal state, compilation mode, warmup, and device condition can
    change the result.
  - Reports should avoid average-only conclusions; distributions, long-tail
    behavior, and P50/P90/P99-style framing matter.
  - Prioritization should consider user frequency and perceived pain: direct
    user-facing issues and broad impact outrank small lab-only improvements.
  - Tool choice follows the question. Perfetto gives the global timeline;
    profilers, simpleperf, memory tools, dumpsys, and online monitoring provide
    deeper or contextual evidence for specific questions.
- SmartPerfetto impact:
  - High value for the final report contract and strategy synthesis. It
    reinforces quantified conclusions, confidence boundaries, and explicit
    measurement caveats.
- Candidate target:
  - Strengthen report/strategy language so conclusions identify the user
    question/window, quantified evidence, baseline or missing-baseline caveat,
    confidence, what would prove/falsify the claim, and recapture or benchmark
    guidance.
- Risks/caveats:
  - Methodology source, not a direct SQL specification. Translate it into report
    norms rather than deterministic trace rules.
- Status: read, high-value methodology source.

### 240. `part3-tools/ch15-methodology/02-system-vs-app.md`

- Type: system-versus-application attribution methodology: Wall vs CPU,
  thread_state interpretation, global context, app signals, gray zones,
  Binder-chain attribution, system regression A/B, and a scenario cheat sheet.
- Useful information:
  - A disciplined attribution chain starts with the problem slice, compares Wall
    time and CPU time, inspects thread_state, then checks global system context.
  - Wall roughly equal to CPU points toward app execution; Wall much greater
    than CPU requires state-specific interpretation: Runnable means scheduling
    or CPU contention, Sleep means Binder/lock/I/O/resource wait, and D-state
    means uninterruptible I/O or page-fault style waits.
  - Runnable is not automatically a system problem. Check top CPU processes and
    the app's own background work before blaming external contention.
  - Binder Sleep requires following the server thread and classifying the
    server's own Wall/CPU/thread_state before blaming `system_server` or a
    service dependency.
  - SurfaceFlinger delay requires same-device, same-FPS, similar-layer-count
    baseline and FrameTimeline jank-type evidence; it is not automatically a
    GPU/vendor root cause.
  - System context includes all-core load, CPU frequency or scaling limits,
    kswapd/reclaim/RSS/LMKD/ApplicationExitInfo, SurfaceFlinger composition,
    and FrameTimeline jank type.
  - Gray zones include contention from other apps, memory pressure, and thermal
    throttling: app defensive optimization may still be useful, but root
    responsibility differs.
- SmartPerfetto impact:
  - Top-priority methodology for report quality. It maps directly to
    thread-state, ANR, jank, startup, selected-scope, and root-cause wording.
- Candidate target:
  - Make Wall-vs-CPU, thread_state, global context, and Binder server-chain
    evidence required primitives before final reports label a bottleneck as app,
    system, Binder, SurfaceFlinger, or external contention.
- Risks/caveats:
  - Finalized and high confidence, but ANR/component thresholds and OEM behavior
    can vary; keep threshold language version/component caveated.
- Status: read, highest-value attribution methodology source.

### 241. `part3-tools/ch15-methodology/03-metrics.md`

- Type: performance metrics system: smoothness, responsiveness, stability,
  memory, power, online/offline scope, aggregation granularity, Vitals, and
  custom business metrics.
- Useful information:
  - Metrics are decision interfaces: they should answer whether there is a
    problem, how broad it is, or which category should be investigated first.
  - FPS is mostly a display metric; frame-duration percentiles, jank rate,
    frozen frame rate, and deadline overrun are better diagnostic/governance
    signals.
  - Frame overrun and `FrameMetrics.DEADLINE` are required for high-refresh and
    variable-refresh-rate contexts; do not hardcode a single 16 ms threshold for
    all devices.
  - TTID and TTFD must stay separate. TTID covers initial display; TTFD requires
    a meaningful `reportFullyDrawn()` point and represents usable content.
  - ANR and crash rates should use affected-user/session semantics where
    available, not raw event counts alone.
  - ApplicationExitInfo distinguishes ANR, crash, native crash, LMK, user/system
    exit, RSS/PSS snapshots, and trace/tombstone availability; trace streams may
    be absent.
  - PSS, RSS, Java heap, native heap, graphics memory, OOM, LMK, and GC behavior
    are different evidence surfaces and should not be collapsed into one
    "memory issue" label.
  - Online metrics provide trend/regression discovery; offline trace metrics
    provide precise diagnosis. Do not substitute one for the other.
  - Aggregation should use scene/page/device/version dimensions and
    P50/P90/P99-style distribution summaries; averages hide tail pain.
- SmartPerfetto impact:
  - High value for report contracts and strategy templates. It provides the
    metric vocabulary needed to distinguish gate, diagnostic, and governance
    signals.
- Candidate target:
  - Add metric-boundary language to final reports: identify which metric is
    being interpreted, whether it is online/offline, the scene/window, the
    percentile or rate direction, and the missing evidence when only one side is
    present.
- Risks/caveats:
  - Confidence medium. Public thresholds and Play policy can change, so avoid
    baking exact Vitals threshold numbers into code.
- Status: read, high-value metric taxonomy source.

### 242. `part3-tools/ch15-methodology/04-competitive-analysis.md`

- Type: competitive and baseline analysis methodology: controlled variables,
  startup measurement, trace-based smoothness comparison, APK size comparison,
  automation, and power comparison.
- Useful information:
  - Comparative performance claims require same device, same scenario, same
    network, same temperature, same refresh/display mode, and comparable
    compilation/profile state.
  - Startup comparisons should prefer `am start -W` `TotalTime` over `ThisTime`
    for multi-activity launch paths, while separating SplashScreen, first
    business frame, and `reportFullyDrawn()` when they differ.
  - Cold, warm, and hot starts are different scenarios and must not be mixed.
  - Smoothness comparison needs trace/frame-duration distributions, not single
    FPS values. P50/P90/P99, jank, and BigJank convey different parts of the
    experience.
  - `FrameMetrics.TOTAL_DURATION` starts at intended VSync and ends at frame
    completion; phase metrics must be interpreted separately.
  - Performance claims require multiple samples, median/distribution
    statistics, scenario definitions, version metadata, and compilation-state
    metadata.
- SmartPerfetto impact:
  - Medium/high value for baseline and comparison language. SmartPerfetto should
    flag when a user asks for "better/worse" claims without controlled
    comparable traces or baselines.
- Candidate target:
  - In reports, distinguish single-trace diagnosis from A/B or competitor
    comparison. Require comparable conditions before declaring a regression or
    competitive advantage.
- Risks/caveats:
  - Confidence medium. Some command behavior and tool URLs are version
    sensitive; use as methodology, not as fixed command contract.
- Status: read, medium/high-value comparison methodology source.

### 243. `part3-tools/ch15-methodology/05-online-monitoring.md`

- Type: online performance monitoring guide: signal layer, client evidence
  enhancement, platform layer, FrameMetrics/JankStats, startup, ANR,
  ApplicationExitInfo, ProfilingManager, sampling, aggregation, and alerting.
- Useful information:
  - Monitoring has three layers: signal collection, client-side evidence
    enrichment, and platform aggregation/retrieval. A trace tool should not
    pretend to replace all three.
  - `JankStats` is a good normalized frame signal with UI state context;
    `FrameMetrics` provides high-version detailed frame phase metrics.
  - Startup monitoring should split TTID/TTFD, launch type, and sub-stages.
  - ANR Watchdog detects main Looper stalls, not all system ANR verdicts.
    API 30+ `ApplicationExitInfo` is closer to system verdicts, while
    SIGQUIT/self-stack capture is supplemental and risky.
  - ProfilingManager can provide exception-triggered heavy artifacts, but has
    API, rate-limit, and privacy boundaries.
  - Production monitoring should use baseline low-cost signals, sampled
    detailed data, and anomaly-triggered full evidence; heavy artifacts require
    context, encryption, retention, and privacy review.
  - Alerts should combine percentile/rate threshold, time window, and minimum
    affected-user count to avoid noise.
- SmartPerfetto impact:
  - High value for positioning SmartPerfetto as the offline trace evidence
    engine connected to, but distinct from, online APM and governance systems.
- Candidate target:
  - Strengthen strategy wording so online APM/Vitals/JankStats data becomes a
    hypothesis or triage input unless a trace/SQL/artifact proves the local
    cause.
- Risks/caveats:
  - Confidence medium. Monitoring APIs and ProfilingTrigger capabilities are
    version-sensitive.
- Status: read, high-value observability boundary source.

### 244. `part3-tools/ch15-methodology/06-testing-best-practices.md`

- Type: performance testing best practices: environment standardization,
  interference control, sampling, warmup/compilation mode, baseline,
  regression detection, report writing, Macrobenchmark CI, and FPM limits.
- Useful information:
  - Performance tests are probabilistic. Single runs are weak evidence; reports
    need repeated samples, median, tail percentiles, environment metadata, and
    controlled variables.
  - Test metadata should include device, OS, app version, date, battery,
    thermal state, refresh mode, network, compilation mode, and sample count.
  - Peak performance and thermal steady-state are different goals and should be
    reported separately.
  - Refresh rate and VRR/LTPO behavior affect frame deadlines; verify with
    FrameTimeline/display state when settings may be ignored.
  - CPU frequency, background dexopt, system background work, low-power mode,
    charging state, and temperature can invalidate performance results.
  - Macrobenchmark `CompilationMode.DEFAULT`, `Partial`, `None`, and `Full`
    represent different user/device states; old `SpeedProfile()` language
    should not be used for current API.
  - For "higher is better" metrics like FPS, P90 is the wrong tail direction;
    use P10/P5 or convert to duration/jank/slow-frame metrics.
  - CI performance regression gates should run on physical devices for real
    decisions; emulators/GMD are suitable for smoke/dry-run only.
  - Automated benchmarks detect regressions; Perfetto traces explain root
    cause.
- SmartPerfetto impact:
  - High value for this goal's verification plan and report language. It also
    reinforces that trace-analysis output should record environmental caveats
    before making regression claims.
- Candidate target:
  - Add test/baseline caveat language to strategies and final reports:
    baseline metadata, sample size, compilation state, refresh rate, thermal
    state, and whether the claim is single-trace diagnosis or statistically
    supported regression.
- Risks/caveats:
  - Confidence medium. Some benchmark and CI details changed recently; avoid
    hardcoding exact tool commands in SmartPerfetto strategies.
- Status: read, high-value testing methodology source.

### 245. `part3-tools/ch15-methodology/07-aosp-reading.md`

- Type: AOSP source reading methodology: Code Search, key directories,
  log/trace tag reverse lookup, core performance entry points, call-chain
  tracing, Binder boundary tracing, local AOSP, and Git/Gerrit history.
- Useful information:
  - Logs and Perfetto slices should be traced back to source strings, trace
    macros, and version-specific implementation details before being treated as
    stable semantics.
  - Slice names are not guaranteed to include class names. Java `Trace`,
    generic `ATRACE_*`, SurfaceFlinger `SFTRACE_*`, and async trace APIs have
    different naming and pairing behavior.
  - Async trace interpretation requires name/cookie matching, not just adjacent
    begin/end events.
  - Binder boundary tracing should start from AIDL/proxy/stub, then match
    Perfetto `binder transaction`/`binder reply` client/server pid/tid/time
    windows before reading server-side code.
  - Core source anchors for performance include ActivityThread, ViewRootImpl,
    Choreographer, SurfaceFlinger/CompositionEngine/HWC, inputflinger, binder,
    power, and ART.
- SmartPerfetto impact:
  - Medium/high value for evidence provenance. It supports adding caveats around
    source-derived interpretations and Binder/server-chain reasoning.
- Candidate target:
  - Prefer report wording that says a slice name suggests a source path or
    subsystem unless the analysis has matched the version/source-specific macro
    or transaction chain.
- Risks/caveats:
  - Article status is `ready-for-review` and has explicit SurfaceFlinger
    version-boundary concerns. Use the general method, not its exact
    SurfaceFlinger slice-name assertions, unless independently verified.
- Status: read, medium/high-value source-provenance methodology source.

### 246. `part3-tools/ch15-methodology/08-empirical-performance-issues.md`

- Type: empirical Android performance issue taxonomy: user/developer/researcher
  focus, real-world contributing factors, common code patterns, synchronous
  Binder, cached-app freezer, and performance review checklist.
- Useful information:
  - User complaints skew strongly toward responsiveness: ANR, jank, startup,
    and no-response issues.
  - Developer discussions and commits skew toward memory: OOM, leaks, GC churn,
    and cache behavior.
  - Performance consequences and contributing factors should stay separate:
    responsiveness/memory/energy/storage/CPU/GPU/network are outcomes or
    symptom classes, not necessarily root causes.
  - Common code-risk patterns include main-thread I/O/network/db, GlobalScope or
    lifecycle mistakes, frequent `requestLayout()`, unreleased references,
    object churn in draw/measure/layout, large data/bitmap work, deep layouts,
    locks, reflection, JNI overhead, and bad synchronization.
  - Main-thread synchronous Binder is a modern high-value responsiveness risk;
    attribution requires App wait plus server Binder thread state, not just an
    App stack containing Binder.
  - Cached-app freezer/unfreeze can create switch-back latency and first-action
    stalls; correlate process state, runnable gap, Binder events, and first
    frame before blaming one function.
- SmartPerfetto impact:
  - High value for prioritization and root-cause candidate generation, provided
    it remains hypothesis-generating and trace-verified.
- Candidate target:
  - Add or strengthen strategy guidance that responsiveness findings should
    look first at main-thread blocking, Binder wait chains, GC/memory churn,
    requestLayout/layout churn, bitmap/decode, and cached-app freezer context.
- Risks/caveats:
  - Article status is `ready-for-review`, with prior needs-rework metadata.
    Treat empirical numbers and modern additions as prioritization hints, not
    absolute claims.
- Status: read, high-value but caveated empirical-prioritization source.

### 247. `part3-tools/ch15-methodology/09-observability-closed-loop.md`

- Type: observability-to-governance feedback loop: collection, sampling,
  aggregation, attribution, alerting, retrieval, fixing, verification, join
  keys, and minimal viable governance loop.
- Useful information:
  - Monitoring only becomes governance when anomalies can move through
    collection, sampling, aggregation, attribution, alerting, retrieval, fix,
    and verification.
  - Stable join keys matter more than a large number of fields:
    `session_id`, `trace_id`, `page_id`/`scene_id`, build/version/channel, and
    device fingerprint link metrics, traces, alerts, and cases.
  - Attribution categories should separate App MainThread, RenderThread/GPU,
    SurfaceFlinger/display, Binder/system service, IO, memory, scheduling, and
    thermal.
  - Backlog items need impact, initial responsibility direction, repro
    condition, priority, and acceptance metric.
  - Verification needs both offline benchmark/trace checks and online tail
    latency or version metric recovery.
- SmartPerfetto impact:
  - Medium/high value for artifact and report structure. It supports keeping
    SmartPerfetto reports compatible with APM/backlog workflows without turning
    trace analysis into a full monitoring platform.
- Candidate target:
  - Include trace/session/page/build/device identifiers when available and make
    final recommendations actionable as backlog-ready items with acceptance
    metrics.
- Risks/caveats:
  - Governance process source, not deterministic trace logic.
- Status: read, medium/high-value workflow source.

### 248. `part3-tools/ch15-methodology/10-performance-governance.md`

- Type: engineering governance guide: budgets, baselines, regression gates,
  staged rollout observation, release acceptance, owners, SLOs, roles, and
  maturity path.
- Useful information:
  - Performance governance should move from individual expertise to team
    mechanism through budget, baseline, gate, rollout observation, and release
    acceptance.
  - Budgets should cover core paths, platform/build properties, and stability
    red lines.
  - Baselines include offline Macrobenchmark/key interactions, online version
    metrics, and important device/SoC/page groups.
  - Gates can include Macrobenchmark, Baseline Profile validation, APK size,
    main-thread risk scans, startup-task checks, and key frame/startup
    thresholds.
  - Performance issues need phenomenon, impact, priority, metric change,
    initial attribution, owner, SLO/budget, fix plan, and acceptance standard.
  - Incident handling should connect platform impact distribution with
    engineering traces/cases, then feed new checks back into daily gates.
- SmartPerfetto impact:
  - Medium value for how SmartPerfetto recommendations should be phrased as
    engineering artifacts, not only observations.
- Candidate target:
  - Make final report next steps include owner-ready acceptance criteria when
    the evidence supports it: budget target, validation trace/benchmark, and
    rollout metric to watch.
- Risks/caveats:
  - Governance source, not direct Skill SQL input.
- Status: read, medium-value governance source.

### 249. `part3-tools/ch15-methodology/README.md`

- Type: chapter 15 overview.
- Useful information:
  - Chapter 15 is the connecting methodology layer: how to reason after seeing
    an anomaly, how to distinguish system and app causes, which metrics matter,
    and how online monitoring becomes team process.
- SmartPerfetto impact:
  - Low/medium value as a chapter-level synthesis. It reinforces that trace
    reading needs a judgement framework, not only tool output.
- Candidate target:
  - Use as a chapter-level pointer in synthesis, not a direct implementation
    source.
- Risks/caveats:
  - Overview only; no new technical facts beyond entries 239-248.
- Status: read, low/medium-value overview.

### 250. `part3-tools/ch19-apm/01-apm-landscape.md`

- Type: APM landscape and taxonomy: client APM, official SDKs, offline tools,
  benchmark tools, metrics/samples/traces/context, collection paths, data
  contract, sampling, privacy, and AppExitInfoTracker internals.
- Useful information:
  - APM provides broad online visibility; Perfetto/Profiler/simpleperf/heap
    tools provide deep diagnosis. APM finds candidate samples and distributions,
    not final trace root cause by itself.
  - Four evidence types must stay separate: metrics, samples, trace files, and
    context. They answer trend, single-case, timeline, and scope questions.
  - Tool choice should be judged by collection path, runtime overhead, upload
    strategy, privacy boundary, and retrieval ability, not feature checklists.
  - Official signals have version floors: JankStats API 16+ with precision
    improving by version, FrameMetrics API 24+, ApplicationExitInfo API 30+,
    ProfilingManager API 35+.
  - Data contracts need stable event names, units, sampling, anonymization,
    retention, session/trace relationships, Mapping UUID, and Native Build-ID.
  - AppExitInfoTracker keeps system-side exit history; `getTraceInputStream()`
    exists only for selected reasons and low-memory exits may have no trace.
- SmartPerfetto impact:
  - High value for report boundary language: APM artifacts should be described
    as upstream signal/context unless the trace or artifact proves the local
    cause.
- Candidate target:
  - Add APM evidence boundary wording to strategies: metrics establish impact,
    samples propose hypotheses, traces prove timing chains, context scopes
    blast radius.
- Risks/caveats:
  - Confidence medium; tool/API state can change. Avoid hardcoding provider
    capabilities or exact reason tables in SmartPerfetto code.
- Status: read, high-value APM taxonomy source.

### 251. `part3-tools/ch19-apm/02-tencent-matrix.md`

- Type: Tencent Matrix guide: Trace Canary, IO Canary, Resource Canary, SQLite
  Lint, Battery Canary, native memory/hook modules, AGP boundaries, report
  schema, and Perfetto correlation.
- Useful information:
  - Matrix is a client-side collection framework, not a complete SaaS; teams
    must provide upload, aggregation, alerting, querying, privacy, and issue
    workflow.
  - Trace Canary provides method-level context through bytecode instrumentation,
    but method ids require matching method maps/mapping to become readable.
  - Matrix reports need stable fields such as issue type, process, thread,
    scene, duration, stack signature, method map version, sample payload id, and
    privacy level.
  - IO Canary can add file path/type, thread, repeat count, and buffer context
    that Perfetto may not expose directly, but needs path hashing/desensitizing.
  - Resource Canary detects Activity leaks and duplicate bitmaps at distribution
    level; full Hprof should remain controlled due to size and privacy.
  - Matrix should be correlated with Perfetto: Matrix provides app-side method
    or I/O context, Perfetto proves CPU running state, D-state, Binder, system
    load, startup stages, and ANR chains.
  - AGP 8+ Transform removal is a major Trace plugin boundary.
- SmartPerfetto impact:
  - High value for interpreting Matrix/APM attachments if users import them
    alongside traces.
- Candidate target:
  - Teach strategies to treat Matrix slow-method and IO reports as app-context
    hypotheses that need Perfetto/thread-state confirmation before root-cause
    language.
- Risks/caveats:
  - Confidence medium and AGP/tool compatibility is fast-moving.
- Status: read, high-value Matrix evidence-boundary source.

### 252. `part3-tools/ch19-apm/03-koom.md`

- Type: KOOM memory-specialist guide: Java heap leak, native leak, thread leak,
  fork dump, Hprof pruning, native reachability, thread white-listing, OOM
  workflow, and system memory signals.
- Useful information:
  - KOOM is for confirmed memory/OOM/leak concentration, not startup/jank/network
    first-line diagnosis.
  - Java, native, and thread leaks are separate evidence classes with different
    reports, owners, and validation paths.
  - Fork dump lowers main-process pause but does not eliminate VM suspend, child
    memory, I/O, privacy, and failure costs.
  - Native leak reports are candidates; they require symbols, build ids,
    repeated persistence, ownership by `.so`/module, and lifecycle context.
  - Thread leak reports need thread naming, creator stack, alive duration,
    state, group, whitelist, and growth trend; system/Binder/RenderThread should
    not be treated as leaks.
  - KOOM should be combined with ApplicationExitInfo, Vitals/Crash data,
    Perfetto memory counters, and `dumpsys meminfo`.
- SmartPerfetto impact:
  - High value for memory-analysis report wording: separate Java/native/thread,
    distinguish trend from leak proof, and identify when heap/native tools are
    required beyond trace counters.
- Candidate target:
  - Strengthen memory strategies so RSS/PSS/heap growth in Perfetto leads to
    classification and next-evidence requests rather than a generic OOM label.
- Risks/caveats:
  - Confidence medium; KOOM module support and ABI limits need current project
    verification.
- Status: read, high-value memory-tool boundary source.

### 253. `part3-tools/ch19-apm/04-btrace.md`

- Type: btrace/RheaTrace guide: method-level tracing, Perfetto/simple modes,
  collection parameters, startup/jank templates, Perfetto UI reading, and
  sampling boundaries.
- Useful information:
  - btrace complements Perfetto by adding method-level app context into a
    Perfetto-readable timeline.
  - `sched`/system trace information is required to distinguish a long app
    method from runnable-but-not-running, Binder, I/O, GC, or lock waits.
  - Analysis should start with the scenario time window, then thread running
    state, RenderThread, CPU scheduling, btrace method tracks, Binder/I/O/GC.
  - Startup analysis should split Zygote, bindApplication, ContentProvider,
    Application, Activity, first draw, and post-first-frame work.
  - Sampling interval, buffer size, mapping, mode, process, and trace duration
    directly affect what can be concluded.
  - Single btrace captures are root-cause candidate validation, not online
    distribution proof.
- SmartPerfetto impact:
  - High value because it aligns with SmartPerfetto's trace-first reasoning and
    can inform external trace interpretation.
- Candidate target:
  - Add strategy reminders that method slices only prove code was on the stack;
    thread state and system tracks decide whether it was executing, waiting, or
    starved.
- Risks/caveats:
  - Confidence medium; btrace version/device constraints should not be encoded
    as SmartPerfetto assumptions.
- Status: read, high-value method-trace boundary source.

### 254. `part3-tools/ch19-apm/05-leakcanary.md`

- Type: LeakCanary guide: local leak diagnosis, ObjectWatcher, retained object
  thresholds, Shark/leak trace reading, release boundary, online linkage, and
  CI leak tests.
- Useful information:
  - LeakCanary is primarily a Debug/QA local diagnosis tool, not an online APM
    platform.
  - Retained object, heap dump, leak trace, GC root, suspect reference, and
    retained size are different layers of evidence.
  - Leak trace is an object reference path, not a call stack.
  - Application Leak and Library Leak need different triage. Library Leak is not
    automatically ignorable.
  - Release heap dumps are expensive and sensitive; if release retains a signal,
    object-watcher-only style signals are safer than full analysis.
  - Online memory samples should lead to local reproduction and LeakCanary
    verification, then online OOM/PSS/heap trend validation.
- SmartPerfetto impact:
  - Medium/high value for memory recommendations and avoiding trace-only memory
    overclaims.
- Candidate target:
  - Make memory reports ask for leak trace/heap evidence when Perfetto shows
    growth but cannot establish object retention or reference path.
- Risks/caveats:
  - LeakCanary tool details can change by version; use conceptually.
- Status: read, medium/high-value leak-diagnosis boundary source.

### 255. `part3-tools/ch19-apm/06-blockcanary.md`

- Type: BlockCanary/Looper block guide: historical Looper message monitoring,
  `Printer`, stack sampling, report schema, JankStats/FrameMetrics distinction,
  and self-built monitoring improvements.
- Useful information:
  - BlockCanary observes one main Looper message duration, not a frame, render
    phase, or system ANR verdict.
  - `setMessageLogging()` is a single-slot listener; multiple SDKs can overwrite
    each other unless a hub is used.
  - Enabling Looper logging adds string construction/allocation cost to every
    message.
  - Stack sampling may miss short functions and can mislead during GC, native,
    Binder, I/O, lock, or scheduling waits.
  - Looper block count must not be treated as slow-frame rate, and custom
    500-1000 ms block thresholds must not be equated to 5s system ANR.
  - Useful reports need page, foreground, qualifier/version, network, stack
    signature, sample count, and optional CPU/system state.
- SmartPerfetto impact:
  - Medium/high value for interpreting Looper-block style evidence and avoiding
    frame/ANR conflation.
- Candidate target:
  - Add caveats in responsiveness strategies: Looper block is a main-thread
    sample, while FrameTimeline/JankStats/ANR each have different windows and
    denominators.
- Risks/caveats:
  - Article status ready-for-review and historical project; use as principle,
    not as modern tool recommendation.
- Status: read, medium/high-value Looper-monitoring boundary source.

### 256. `part3-tools/ch19-apm/07-dokit.md`

- Type: DoKit guide: debug/QA toolbox, performance panel, network/mock/weak
  network, release isolation, security risks, and handoff to Perfetto/Profiler.
- Useful information:
  - DoKit is a development-site toolbox, not production monitoring.
  - Its FPS/CPU/memory/network/startup panels are fast first-screening tools but
    can alter the runtime environment through floating UI, polling, hooks, and
    ASM injection.
  - DoKit weak-network, mock, environment switching, and network views help turn
    vague user complaints into stable reproduction paths.
  - DoKit observations should be followed by Perfetto, Profiler, JankStats, or
    benchmark evidence before final diagnosis.
  - Release isolation must cover dependencies/no-op, debug entries, permissions,
    network platform calls, logs, tokens, headers, screenshots, file exports,
    and custom business panels.
- SmartPerfetto impact:
  - Medium value for e2e/repro guidance and for not overinterpreting debug-panel
    performance data.
- Candidate target:
  - Include a recommendation pattern: use DoKit/debug tooling to stabilize
    reproduction, then capture trace/profiler/benchmark proof.
- Risks/caveats:
  - Version/build compatibility is project-specific; not direct Skill logic.
- Status: read, medium-value debug-tool workflow source.

### 257. `part3-tools/ch19-apm/08-argusapm.md`

- Type: ArgusAPM legacy APM guide: architecture, AspectJ/ASM weaving, modules,
  modern compatibility risks, AOP applicability, multi-process, network stages,
  and migration.
- Useful information:
  - ArgusAPM is a legacy integrated APM architecture reference, not a modern
    default choice.
  - AOP/ASM can capture clear Java call boundaries such as Activity lifecycle,
    network wrapping, WebView callbacks, and selected run/onReceive methods.
  - AOP cannot see system scheduling, RenderThread, GPU, native heap, or Binder
    server-side behavior.
  - Modern network monitoring should split DNS, connect, TLS, request body,
    server wait, response, retry, queue wait, cache, status, business code, and
    trace/request id.
  - Multi-process APM needs process name, pid, session id, trace id, message id,
    deduplication, and selective module startup to avoid launch overhead.
- SmartPerfetto impact:
  - Medium value for legacy APM evidence interpretation and network-stage
    boundary wording.
- Candidate target:
  - If report input includes AOP/APM timing, state that Java lifecycle timing
    does not cover scheduler, GPU, Binder server, or native causes.
- Risks/caveats:
  - Historical tool with old sample baseline; use for architecture lessons.
- Status: read, medium-value legacy-APM architecture source.

### 258. `part3-tools/ch19-apm/09-measure.md`

- Type: Measure platform guide: open-source mobile observability platform,
  session timeline, SDK/backend/dashboard, event model, traces, self-hosting,
  OpenTelemetry relation, privacy, and trial checklist.
- Useful information:
  - Platform APM value comes from session timelines linking screen, click, HTTP,
    resource, error, and custom trace events.
  - Session timelines clarify reproduction paths but do not directly prove root
    cause; Perfetto/profiler/heap dump/business logs still provide diagnosis.
  - Data model entities include session, screen, event, trace, error, resource,
    user/device/session attributes.
  - Custom trace names and attributes must be stable, low-cardinality, and
    unit-defined; dynamic names break aggregation.
  - Self-hosting cost includes storage, query, symbolication, alerting,
    permissions, retention, privacy, backups, and upgrades.
  - Privacy controls include URL patterns, body/header opt-in, anonymous user
    ids, screenshot masking, attachments, region deployment, retention, and
    deletion processes.
- SmartPerfetto impact:
  - Medium/high value for report interoperability with platform timelines and
    for treating external session data as context.
- Candidate target:
  - Preserve session/screen/event/trace/error/resource terminology where users
    attach platform exports, and require trace/artifact proof for causal claims.
- Risks/caveats:
  - Article status ready-for-review with known task9 needs-rework around SDK
    event/schema accuracy; use platform concepts, not field tables as source of
    truth.
- Status: read, medium/high-value platform-context source with schema caveat.

### 259. `part3-tools/ch19-apm/10-other-opensource-apm.md`

- Type: survey of other open-source APM/debug libraries: AndroidGodEye,
  Collie, Rabbit, Matrix positioning, official SDK/platform tradeoffs,
  minimal APM SDK, threading, switches, and migration checklist.
- Useful information:
  - Older open-source APM/debug projects are better as design references or
    partial modules than modern production defaults.
  - AGP 8 Transform removal is a major compatibility boundary for old bytecode
    instrumentation plugins.
  - Minimal online signals can start with startup, JankStats/FrameMetrics,
    Looper block, memory, network, Crash/ANR/ApplicationExitInfo, and page
    lifecycle.
  - Main thread collection must stay lightweight; serialization, compression,
    file writes, uploads, and complex stack processing belong off main thread.
  - APM needs total/module/sampling switches with versioned configs and client
    config-version reporting.
  - Migration should stabilize internal schema, double-write, compare metric
    definitions, and phase out old flows over one or two release cycles.
- SmartPerfetto impact:
  - Medium value for synthesis of APM boundaries and migration mindset.
- Candidate target:
  - Use as support for strategy language that external SDK signals need data
    contracts and cannot be mixed without denominator/window/schema checks.
- Risks/caveats:
  - Some listed projects are historical or maintenance-limited.
- Status: read, medium-value APM-survey source.

### 260. `part3-tools/ch19-apm/11-jankstats.md`

- Type: JankStats guide: AndroidX frame-level jank signal, `FrameData`,
  `PerformanceMetricsState`, API differences, threshold, UI context, Compose,
  batch aggregation, tool boundaries, and misclassification cases.
- Useful information:
  - JankStats is a frame-level online entry point for where/when jank happens,
    not a root-cause analyzer.
  - Its value depends on stable UI context: screen, interaction, content type,
    first-screen flag, bounded list-size buckets, and lifecycle cleanup.
  - Jank threshold follows expected frame duration and heuristic multiplier, not
    a fixed 16 ms.
  - OnFrameListener must stay lightweight; copy DTO fields and aggregate/upload
    off main thread.
  - API 16-23, 24-30, and 31+ have different timing source precision.
  - Do not upload every frame; aggregate by page/interaction/window with total
    frames, jank frames, percentiles, refresh rate, and sampling metadata.
  - Slow-frame scopes should distinguish all-page, interaction, and first-screen
    windows. Idle frames dilute scroll/transition issues.
  - JankStats, FrameMetrics, Perfetto, Macrobenchmark, and Firebase answer
    different parts of the flow.
- SmartPerfetto impact:
  - High value for any strategy/report text consuming JankStats-derived evidence.
- Candidate target:
  - When JankStats appears in user evidence, require UI context, aggregation
    denominator, refresh rate, and follow-up FrameMetrics/Perfetto evidence
    before root-cause language.
- Risks/caveats:
  - Article status ready-for-review with known P0/P1 queue around API details.
    Use high-level official concepts, verify exact AndroidX internals before
    code-level claims.
- Status: read, high-value JankStats evidence-boundary source.

### 261. `part3-tools/ch19-apm/12-framemetrics.md`

- Type: Android `FrameMetrics` / `Window.OnFrameMetricsAvailableListener`
  guide, with API/version boundaries and phase interpretation.
- Useful information:
  - `FrameMetrics` splits frame time into unknown delay, input, animation,
    layout/measure, draw, sync, command issue, swap buffers, total duration,
    and on newer APIs deadline/GPU-related fields.
  - Collection should use a background `HandlerThread`, remove listeners with
    lifecycle, copy primitive fields quickly, and track dropped samples.
  - Stage metrics are triage direction, not root cause proof. They do not cover
    all SurfaceView/camera/player internals, SurfaceFlinger/HWC/GPU driver
    behavior, or business stack context.
  - High-refresh devices need deadline/budget-aware interpretation rather than
    fixed 16 ms wording.
- SmartPerfetto impact:
  - High value for reports that consume user-supplied `FrameMetrics` or
    JankStats/FrameMetrics evidence.
- Candidate target:
  - Require page/window context, API level, refresh/budget, dropped-sample
    count, and follow-up Perfetto evidence before root-cause language.
- Risks/caveats:
  - Article is finalized, but some GPU/SWAP exact-version details are marked as
    still needing caution.
- Status: read, high-value frame-phase evidence source.

### 262. `part3-tools/ch19-apm/13-tracing-sdk.md`

- Type: AndroidX tracing / manual business slice instrumentation guide.
- Useful information:
  - `androidx.tracing` and platform trace APIs add business semantics to
    Perfetto; they mark what phase is executing, not why it was slow.
  - Slice names should be stable and low-cardinality; dynamic IDs belong in
    arguments or external context, not slice names.
  - Synchronous trace sections must be closed on the same thread and protected
    with try/finally. Cross-thread or coroutine work needs async trace spans.
  - Business slices should be read together with thread state, scheduler, Binder
    and I/O tracks; gaps can be wait, Binder, I/O, or scheduling delay.
- SmartPerfetto impact:
  - High value for preserving the distinction between business phase anchors
    and trace-proven execution/root cause.
- Candidate target:
  - Add strategy/report wording that manual trace sections are semantic anchors
    and require thread-state/system evidence for causal conclusions.
- Risks/caveats:
  - None beyond normal library-version checks for exact API names.
- Status: read, high-value trace-semantics source.

### 263. `part3-tools/ch19-apm/14-jetpack-benchmark.md`

- Type: Jetpack Microbenchmark and Macrobenchmark workflow guide.
- Useful information:
  - Benchmarks prove code-change effect under controlled conditions; they are
    not online monitoring and do not replace trace root-cause analysis.
  - Microbenchmark fits small code paths; Macrobenchmark fits startup, scroll,
    transitions, and end-to-end user flows.
  - Results need compilation mode, startup mode, build variant, iterations,
    device/environment controls, and preserved trace artifacts.
  - TTID and TTFD must remain distinct. Frame, trace-section, allocation, and
    power metrics answer different questions.
- SmartPerfetto impact:
  - High value for final recommendations and verification plans after a trace
    diagnosis.
- Candidate target:
  - Recommendations should say when to validate a fix with Macrobenchmark and
    specify the scenario and controlled variables.
- Risks/caveats:
  - None for high-level strategy use.
- Status: read, high-value benchmark-verification source.

### 264. `part3-tools/ch19-apm/15-baseline-profiles.md`

- Type: Baseline Profiles / Startup Profiles / ART compilation guide.
- Useful information:
  - Baseline Profiles help first-run, post-update, and hot-path startup by
    influencing ART compilation; they do not fix network, I/O, locks, SDK init,
    or scheduling stalls.
  - Profile file presence does not prove compiled execution. Evidence should
    include ProfileVerifier status, package artifacts, Macrobenchmark
    compilation-mode comparisons, or dexopt/dumpsys context.
  - Baseline Profiles and Startup Profiles have different packaging/runtime
    effects.
- SmartPerfetto impact:
  - Medium/high value for startup recommendations; avoid generic "add baseline
    profile" advice unless execution/JIT/class-loading evidence supports it.
- Candidate target:
  - Startup strategy text should gate Baseline Profile recommendations on
    evidence for code-loading/JIT/class init cost and verification plan.
- Risks/caveats:
  - Exact Play/cloud profile behavior is platform/distribution dependent.
- Status: read, useful startup-remediation source.

### 265. `part3-tools/ch19-apm/16-profiling-manager.md`

- Type: Android 15+ `ProfilingManager` and Android 16+ trigger-based profiling
  guide.
- Useful information:
  - `ProfilingManager` is a controlled heavy-artifact capture path for system
    trace, heap dump, heap profile, and stack sampling after an anomaly is
    detected.
  - Request/listener setup, result status, rate limits, disk limits,
    post-processing errors, and privacy policies are part of the evidence.
  - Trigger support is version-specific; app-driven profiling and
    system-triggered profiling must not be assumed on all devices.
  - HPROF and trace artifacts are sensitive and need metadata, retention,
    upload constraints, and user/internal gating.
- SmartPerfetto impact:
  - Medium/high value for recapture guidance when a current trace is
    insufficient.
- Candidate target:
  - Report next steps can recommend `ProfilingManager` artifacts with explicit
    Android-version, rate-limit, privacy, and artifact-metadata caveats.
- Risks/caveats:
  - Article had needs-rework notes on some version details; verify exact API
    claims before turning them into code.
- Status: read, useful recapture-artifact source.

### 266. `part3-tools/ch19-apm/17-firebase-performance.md`

- Type: Firebase Performance Monitoring guide.
- Useful information:
  - Firebase Performance provides hosted trend/dashboard signals for app start,
    screen, network, and custom traces, but delivery can be sampled/delayed.
  - Firebase metrics, Android Vitals, JankStats, FrameMetrics, and Perfetto use
    different samples, windows, and definitions.
  - URL patterns, attributes, and custom dimensions must stay low-cardinality
    and privacy-safe.
- SmartPerfetto impact:
  - Medium value for interpreting externally supplied Firebase evidence.
- Candidate target:
  - External APM evidence should remain trend/anomaly context until trace or
    artifact evidence proves the local cause.
- Risks/caveats:
  - Not a real-time incident or deep-diagnosis tool.
- Status: read, medium-value external-APM source.

### 267. `part3-tools/ch19-apm/18-commercial-apm.md`

- Type: Commercial APM platform evaluation guide covering Sentry, APMPlus,
  Bugly, and similar products.
- Useful information:
  - Commercial APM buys service, dashboards, symbolication, alerting,
    compliance, support, and operating process, not just an SDK.
  - Metric definitions differ: system ANR vs SDK stall, Looper block vs slow
    frame, Java/native/thread memory, OOM/PSS/heap, and network attempt models.
  - A stable internal schema/facade reduces vendor lock-in and supports
    double-write migration.
- SmartPerfetto impact:
  - Low/medium direct implementation value, but useful for external evidence
    boundaries and denominator/schema checks.
- Candidate target:
  - When reports cite commercial APM data, name the metric definition and avoid
    mixing vendor denominators without normalization.
- Risks/caveats:
  - Article had needs-rework notes; treat detailed vendor claims as advisory.
- Status: read, medium-value external-signal source.

### 268. `part3-tools/ch19-apm/19-perfdog.md`

- Type: PerfDog external performance test tool guide.
- Useful information:
  - PerfDog observes external FPS/FTime/Jank/Stutter/CPU/GPU/memory/power/temp
    and network signals; it is not embedded APM.
  - Frame time distribution matters more than average FPS for jank diagnosis.
  - Power/current readings are environment-sensitive; USB, charging, thermal,
    device model, refresh rate, and scenario control must be documented.
  - External observations cannot infer internal code strategy without Perfetto,
    profiler, or app evidence.
- SmartPerfetto impact:
  - Medium value for interpreting external test reports attached by users.
- Candidate target:
  - Add caveat wording for external benchmark/test-tool evidence and require
    environment metadata before regression/root-cause claims.
- Risks/caveats:
  - Commercial tool details may drift.
- Status: read, medium-value external-test source.

### 269. `part3-tools/ch19-apm/20-solopi-emmagee.md`

- Type: SoloPi and historical Emmagee testing-tool guide.
- Useful information:
  - SoloPi is useful for repeatable operation paths and visual startup testing;
    Emmagee is mostly historical on modern Android.
  - Automation/performance collection can perturb environment, permissions,
    process state, and timing.
  - Visual startup, Activity timing, Macrobenchmark metrics, and Perfetto
    evidence are different surfaces.
- SmartPerfetto impact:
  - Low/medium value for e2e/reproduction guidance.
- Candidate target:
  - Use as support for recommending repeatable operation scripts when a user
    needs to recapture a problem.
- Risks/caveats:
  - Tool maintenance/version support must be verified before recommending
    concrete setup.
- Status: read, low/medium-value repro-tool source.

### 270. `part3-tools/ch19-apm/21-benchmark-apps.md`

- Type: Device benchmark app guide: Geekbench, AnTuTu, 3DMark, PCMark,
  Speedometer, CPDT, and related tools.
- Useful information:
  - Device benchmark scores describe device capability or stress behavior, not
    application root cause.
  - Single-core CPU, random storage I/O, GPU stress, browser/WebView engine
    version, and thermal stability can explain device-tier differences.
  - Composite scores should not be used as direct proof for an app issue.
- SmartPerfetto impact:
  - Medium value for environment/device-tier caveats.
- Candidate target:
  - Reports can use benchmark/device-tier data as context, not root-cause
    evidence.
- Risks/caveats:
  - Benchmark versions and scoring models drift.
- Status: read, medium-value environment-context source.

### 271. `part3-tools/ch19-apm/22-storage-benchmark.md`

- Type: Storage benchmark guide for AndroBench, A1 SD Bench, CPDT, and modern
  storage caveats.
- Useful information:
  - Device storage benchmarks provide a lower-bound environment context; they
    do not prove an app I/O root cause.
  - Sequential, random, SQLite, filesystem path, scoped storage, free space,
    thermal state, UFS/eMMC class, and cache warmness must be separated.
  - App I/O root cause still needs Perfetto D-state/I/O evidence, IO Canary
    path/thread/buffer context, SQLite trace/query plan, or repeatable repro.
- SmartPerfetto impact:
  - Medium/high value for startup and I/O reports.
- Candidate target:
  - I/O-related recommendations should separate device storage capability from
    app-side blocking I/O proof.
- Risks/caveats:
  - Older storage benchmarks may not match Android 10+ storage restrictions.
- Status: read, useful storage-caveat source.

### 272. `part3-tools/ch19-apm/23-network-apm-internals.md`

- Type: Network APM internals guide covering OkHttp, interceptors,
  EventListener, retries, Cronet, native hook, eBPF, and privacy.
- Useful information:
  - OkHttp `EventListener` gives phase timing; interceptors provide request
    semantics. Attempt, exchange, retry, redirect, and connection reuse must be
    modeled separately.
  - Reused connections legitimately have missing DNS/TCP/TLS phases.
  - HTTP/2 multiplexing and QUIC/HTTP3 change transport interpretation.
  - TTFB depends on request-body semantics; response-body consumption boundary
    matters when interpreting end time.
  - URL/header/body data needs strict redaction and low-cardinality patterns.
- SmartPerfetto impact:
  - High value for any report that consumes network APM logs or user-provided
    request timing.
- Candidate target:
  - Network-related strategy text should avoid server blame until retries,
    attempts, connection reuse, body consumption, and local thread wait are
    separated.
- Risks/caveats:
  - Article had a known response-body-end boundary caveat; verify before
    making exact code claims.
- Status: read, high-value network-evidence source.

### 273. `part3-tools/ch19-apm/24-crash-anr-internals.md`

- Type: Crash, native crash, ANR, ApplicationExitInfo, LMK, OOM, and
  low-version diagnostic boundary guide.
- Useful information:
  - Java crash handlers must proxy previous handlers, persist only a lightweight
    envelope/breadcrumb, avoid complex allocation/locks/network, and upload on
    next launch.
  - Native signal handlers must be async-signal-safe, preserve old handler
    chaining, handle `SA_SIGINFO`/`SIG_DFL`/`SIG_IGN`, avoid reentrancy, and
    preserve debuggerd/tombstone flow. Crashpad-style out-of-process handling is
    safer for production.
  - Production ANR retrieval should prefer API 30+
    `ApplicationExitInfo`; `/data/anr` and `SIGQUIT` interception are not
    reliable ordinary-app strategies.
  - `ApplicationExitInfo` trace availability differs by reason/API. ANR traces,
    API 31+ native tombstone protobuf, low-memory reason, timestamp/reason/pid
    dedupe, and background parsing should be recorded.
  - Resource exhaustion must separate Java heap, native RSS, FD count, thread
    count, VMA/address space, and LMK.
  - API 21-29 needs different fallback expectations: native crash signal
    handler and KOOM-style fork dump can help, but ANR/LMK visibility is weaker.
- SmartPerfetto impact:
  - High value for ANR/crash reports and recommendations; reinforces that
    ApplicationExitInfo/ANR/traces are evidence surfaces with API boundaries.
- Candidate target:
  - ANR/crash strategy wording should require API/reason/artifact metadata and
    avoid promising `/data/anr` or signal interception for ordinary production
    apps.
- Risks/caveats:
  - Article status needs rework around some LMK/OOM/ProfilingManager details;
    use only stable concepts unless independently verified.
- Status: read, high-value stability-evidence source.

### 274. `part3-tools/ch19-apm/25-battery-thermal-apm.md`

- Type: Battery, wakelock, alarm, hardware resource, thermal, and Android
  Vitals monitoring guide.
- Useful information:
  - Battery drain is derived; robust APM records high-power resource occupancy
    rather than assigning mAh to methods.
  - Wakelock attribution needs token/tag/acquire/release/timeout/reference
    counting/page/foreground fields.
  - Alarm and background-task samples should record exact-alarm permissions,
    API behavior, requested vs actual exactness, allow-while-idle, WorkManager
    or JobScheduler identity, and fallback path.
  - Thermal API provides system heat levels, not raw cause. Reports need the
    concurrent CPU/network/GNSS/Bluetooth/wakelock/alarm window and degradation
    actions.
  - Android Vitals gives fleet-level trend; app-side APM explains business
    source but cannot fully read system power accounting.
- SmartPerfetto impact:
  - Medium/high value for power/thermal caveats and recommendations.
- Candidate target:
  - If power or thermal issues are in scope, require resource-window evidence
    and avoid direct mAh/method attribution.
- Risks/caveats:
  - Exact alarm and thermal APIs can drift by Android version and OEM.
- Status: read, useful power/thermal source.

### 275. `part3-tools/ch19-apm/26-hybrid-apm.md`

- Type: Hybrid WebView / Flutter APM guide.
- Useful information:
  - WebView page load needs Native container init plus H5 FCP/LCP/ready/load
    events, with clock mapping between JS `performance.now()` and native
    `elapsedRealtime`.
  - `onPageFinished` is not proof of visible content. `onPageCommitVisible`,
    `postVisualStateCallback`, DOM/ready signals, and low-frequency `PixelCopy`
    have different meanings.
  - WebView render process gone/unresponsive signals have API-specific
    boundaries and need page/session/process/memory context.
  - JSBridge problems require call frequency, payload size, and main-thread wait
    evidence.
  - Flutter `FrameTiming` separates build and raster durations. Raw timestamps
    are not native monotonic time; use native receive time as a coarse timeline
    anchor and keep clock-source/error metadata.
  - Session timeline should share IDs across native, WebView, and Flutter while
    keeping runtime-specific semantics separate.
- SmartPerfetto impact:
  - High value for mixed-surface trace/report language and future hybrid
    evidence support.
- Candidate target:
  - Mixed WebView/Flutter reports should require clock-source, runtime, surface,
    page/route, and evidence-kind metadata before merging timelines.
- Risks/caveats:
  - Article had P2 notes on visible-state API and clock calibration; exact
    low-level assertions should be checked before code changes.
- Status: read, high-value hybrid-evidence source.

### 276. `part3-tools/ch19-apm/27-apm-client-architecture.md`

- Type: Large-scale client APM architecture guide.
- Useful information:
  - Client APM is a small data system: lightweight API, bounded buffer, encoding,
    local storage, upload, remote commands, self-monitoring, and guardrails.
  - Business/main threads should only capture minimal fields and `tryOffer`
    events. Serialization, compression, encryption, disk, and network belong to
    workers.
  - Bounded queues must drop by priority instead of blocking host app threads.
  - `mmap` reduces write jitter but still needs record boundaries, commit
    cursors, shard rotation, repair, and separate handling for crash/ANR/Hprof.
  - Protobuf Lite or binary batches fit high-frequency event upload better than
    JSON; schema evolution and R8 rules matter.
  - Remote trace/Hprof/logcat commands need TTL, quotas, signatures, kill
    switches, privacy controls, and local recovery state.
  - APM must monitor its own CPU, allocation, I/O, dropped counts, storage
    repairs, and command execution.
- SmartPerfetto impact:
  - Medium/high architecture value. Not a direct Skill SQL source, but useful
    for recapture recommendations and external APM evidence quality gates.
- Candidate target:
  - Strategy/report recommendations around app-side telemetry should include
    bounded-overhead, self-monitoring, and privacy/TTL/quota constraints.
- Risks/caveats:
  - Article is ready-for-review/needs-rework for some remote-diagnostic
    permission boundaries; verify before concrete Android API advice.
- Status: read, useful APM-architecture source.

### 277. `part3-tools/ch19-apm/README.md`

- Type: Chapter 19 overview and taxonomy for APM tools and performance
  monitoring ecosystem.
- Useful information:
  - APM fills the online gap left by offline Perfetto/profiler tools; it
    provides trends, samples, context, and retrieval paths.
  - App, framework, platform, system, benchmark, and automation tools answer
    different questions and should not be collapsed into one evidence type.
  - Some tools are modern recommendations while others are historical or
    reference-only.
- SmartPerfetto impact:
  - Medium value as synthesis support for APM evidence taxonomy already seen in
    individual articles.
- Candidate target:
  - Keep report text explicit about whether evidence is online APM signal,
    offline trace, benchmark, heap artifact, or external-device measurement.
- Risks/caveats:
  - Overview only; no new direct implementation detail.
- Status: read, medium-value APM-taxonomy source.

### 278. `part4-system/ch16-aosp/01-google-optimization.md`

- Type: Google platform-performance philosophy and AOSP mechanism evolution
  overview.
- Useful information:
  - Separate systemic performance from user-perceived performance. Platform
    improvements raise the ceiling; app architecture still determines whether
    users feel startup, input, scroll, and ANR improvements.
  - Mainline/APEX, GKI/OTA, and Google Play compilation are different delivery
    paths. Do not attribute Cloud Profiles, ART module updates, or kernel
    AutoFDO to the same release mechanism.
  - Android 17 lock-free `MessageQueue` depends on system/targetSdk behavior;
    older locked queues still matter when analyzing historical traces.
  - Binder thread pool and priority inheritance history has exact boundaries:
    worker max and nice/RT inheritance should not be simplified into folklore.
  - BLASTBufferQueue still uses BufferQueue infrastructure; the key is aligning
    buffer acquisition and transaction merge/apply with frame numbers.
- SmartPerfetto impact:
  - High value for system-vs-app attribution, version-aware explanations, and
    avoiding generic system-blame language.
- Candidate target:
  - Report methodology should require platform version, targetSdk, delivery
    path, and trace evidence before saying a system optimization explains a
    performance delta.
- Risks/caveats:
  - Some Android 17 material is recent; verify exact release/behavior-change
    facts before code or public docs.
- Status: read, high-value system-methodology source.

### 279. `part4-system/ch16-aosp/02-version-changes.md`

- Type: Android 12-16 performance behavior/API change tracker.
- Useful information:
  - Android 12+ background FGS, exact alarm, notification trampoline, app
    hibernation, and game mode changes alter background monitoring and capture
    assumptions.
  - Android 14 cached-app freeze and broadcast queuing can explain apparent
    "missing" background activity in traces without implying app failure.
  - Android 15 adds `ProfilingManager`, `ApplicationStartInfo`, ADPF updates,
    FGS time limits, and 16 KB page-size support.
  - Android 16 expands Profiling triggers, `ApplicationStartInfo` component
    data, adaptive-app requirements, predictive back, FrameMetrics
    `FRAME_TIMELINE_VSYNC_ID`, CPU/GPU headroom, and JobScheduler pending
    reasons.
  - Perfetto interpretation should account for freeze, FGS timeout, system
    triggered profiling, and predictive-back preparation.
- SmartPerfetto impact:
  - High value for report caveats and recapture guidance when trace behavior is
    version- or targetSdk-dependent.
- Candidate target:
  - Strategies should preserve Android API level, targetSdk, refresh/headroom,
    `ApplicationStartInfo`, `ProfilingManager`, and JobScheduler reason
    metadata when present.
- Risks/caveats:
  - Version behavior changes are drift-prone; use current official docs before
    adding precise API claims.
- Status: read, high-value version-boundary source.

### 280. `part4-system/ch16-aosp/03-aosp-build.md`

- Type: AOSP build/debug environment guide.
- Useful information:
  - AOSP performance validation should use `userdebug` as the main comparable
    build; `eng` is convenient but too instrumented for credible benchmarks.
  - Linux is the supported AOSP build platform; Cuttlefish is the preferred
    repeatable framework/system validation environment.
  - `adb sync system`, `stop`/`start`, service restarts, logcat,
    SystemProperties, and dumpsys provide framework-debug loops.
  - `dumpsys gfxinfo`, `cpuinfo`, `meminfo`, activity process state, and
    SurfaceFlinger dumps remain complementary evidence, not trace replacement.
- SmartPerfetto impact:
  - Medium value for validation guidance and user-facing suggestions when trace
    evidence points to framework/system issues.
- Candidate target:
  - Reports should avoid comparing `eng` traces to production/user traces and
    should recommend userdebug/Cuttlefish only when the diagnosis genuinely
    requires system-level reproduction.
- Risks/caveats:
  - Mostly platform-engineering process; low direct Skill/strategy edit value.
- Status: read, medium-value validation-environment source.

### 281. `part4-system/ch16-aosp/04-android17-kernel612-performance.md`

- Type: Android 17 / Kernel 6.12+ system-level performance optimization guide.
- Useful information:
  - Platform version, GKI branch, kernel release, vendor config, and targetSdk
    behavior must be separated. `android16-6.12` and `android17-6.18` are not
    interchangeable.
  - EEVDF affects fair-scheduler latency decisions; sched_ext is an OEM/system
    customization framework, not the default Android scheduler.
  - F2FS checkpoint merge, io_uring capability, and dm-verity multi-buffer
    hashing need actual trace/syscall/source adoption evidence before being
    credited for an app regression.
  - Kernel AutoFDO and ART/Cloud Profile optimize different layers.
  - MGLRU reduces memory pressure signals indirectly; it does not fix app leaks
    or prove LMK improvements without device-specific evidence.
  - Perfetto observation points include sched/sched_switch/sched_ext,
    block/f2fs/dm-verity, kswapd, lmk, and page-fault counters.
- SmartPerfetto impact:
  - High value for preventing over-attribution to "Android 17/kernel upgrade"
    and for adding system-evidence caveats.
- Candidate target:
  - System-issue reports should explicitly list platform/API/GKI/kernel/vendor
    evidence and only then mention EEVDF, sched_ext, F2FS, io_uring, dm-verity,
    AutoFDO, ART GC, DeliQueue, or MGLRU as candidates.
- Risks/caveats:
  - Article had substantial review history around version boundaries. Treat
    exact kernel branch/API symbol claims as requiring verification.
- Status: read, high-value system-version/source-boundary source.

### 282. `part4-system/ch16-aosp/05-android17-api37-performance-changes.md`

- Type: Android 17/API 37 performance behavior and migration guide.
- Useful information:
  - DeliQueue removes old `MessageQueue` lock contention for targetSdk 37+
    cases, but benefits must be verified with `monitor contention with
    MessageQueue` slices or A/B compatibility toggles.
  - Generational CMC GC has gating conditions and must be verified in Perfetto
    GC tracks or device config; it is not universal Android 17 behavior.
  - API 37 `ProfilingTrigger` adds cold start, OOM, anomaly, app compat, and
    excessive CPU kill triggers, but result type should be read from
    `ProfilingResult`, not hardcoded.
  - JobScheduler pending reason APIs can explain delayed background work.
  - `static final` immutability, large-screen behavior, ECH/CT/network security,
    16 KB page size, memory limiter, background audio restrictions, and native
    DCL can affect performance/stability interpretation.
  - Android 16 Choreographer Buffer Stuffing Recovery targets buffer dequeue
    blocking, a different root cause from MessageQueue lock contention.
- SmartPerfetto impact:
  - High value for future Android 17 trace interpretation and recommendations.
- Candidate target:
  - Add version-aware caveats around MessageQueue contention, GC labels,
    ProfilingManager triggers, JobScheduler reasons, memory-limiter exits, and
    buffer-stuffing vs lock-contention separation.
- Risks/caveats:
  - Status ready-for-review and API 37 is recent; exact API/result-type details
    need live verification before implementation.
- Status: read, high-value API37 behavior source.

### 283. `part4-system/ch16-aosp/06-android16-cloud-profile-dexopt.md`

- Type: Android 16 Cloud Profile, Baseline Profile, Startup Profile, `.dm`, ART
  Service, and dexopt guide.
- Useful information:
  - Baseline Profile, Startup Profile, Cloud Profile, `.dm`, SDM, and ART
    Service have distinct roles in installation, first launch, later launch,
    and DEX layout.
  - `.dm` is a paired container and may carry profile/VDEX metadata; package
    filename, manifest, checksum, and install source matter.
  - Android 14+ ART Service controls device-side AOT; background dexopt is
    constrained by idle/charging/battery state.
  - Cloud compilation/SDM device-side support does not prove Play delivery
    coverage or that local dex2oat was skipped.
  - Verification needs package artifact inspection, `pm compile -m
    speed-profile -f -v`, `dumpsys package dexopt`, and Macrobenchmark
    `CompilationMode.None` vs `Partial` comparisons with TTID/TTFD.
- SmartPerfetto impact:
  - High value for startup remediation and compilation-profile caveats.
- Candidate target:
  - Startup recommendations should distinguish install cost, first launch,
    later launch, baseline/cloud/startup profile, and actual dexopt state.
- Risks/caveats:
  - Cloud compilation public details remain incomplete; do not overclaim.
- Status: read, high-value startup/profile-verification source.

### 284. `part4-system/ch16-aosp/07-system-boot-time-optimization.md`

- Type: Android system boot time, bootanalyze, bootio, init, Zygote,
  system_server, bootstat, and boot trace guide.
- Useful information:
  - System boot time and app cold launch are different targets and must not be
    combined into one metric.
  - Boot analysis should split bootloader, kernel, first-stage init,
    second-stage init, Zygote/system_server, and Launcher-ready windows.
  - `bootanalyze`, `bootio`, Perfetto/ftrace, init logs, service properties,
    and `bootstat` answer different questions.
  - Init rc actions are sequential; `exec` vs `exec_background`, class timing,
    disabled services, property triggers, APEX/updatable services, and SELinux
    or `/data` readiness are safety boundaries.
  - Boot I/O/page fault/storage preheat findings must keep OTA-first-boot,
    encryption, dexopt, verity, and 16 KB page-size tags.
- SmartPerfetto impact:
  - Medium/high value for keeping app launch analysis separate from platform
    boot regressions and for suggesting correct system-side evidence.
- Candidate target:
  - Startup reports should avoid mixing app TTID/TTFD with platform boot
    metrics; if system boot is relevant, list boot phase and raw evidence.
- Risks/caveats:
  - Mostly platform/ROM scope; direct SmartPerfetto impact depends on whether
    user traces include boot sequences.
- Status: read, useful boot-analysis boundary source.

### 285. `part4-system/ch16-aosp/08-appflow-large-app-cold-launch-memory-scheduling.md`

- Type: AppFlow research/prototype analysis for large-app cold launch, memory
  scheduling, preloading, page reclaim, LMKD, and process killing.
- Useful information:
  - AppFlow is a research prototype, not AOSP default behavior.
  - GB-scale app cold launch may be dominated by file I/O, page reclaim, zRAM,
    LMKD, and repeated cold-launch after process kill, not just
    `Application.onCreate`.
  - Selective file preload, adaptive reclaimer, and context-aware killer require
    coordinated framework/kernel changes and have fairness, power, privacy,
    CTS/VTS, and maintenance risks.
  - Validation needs TTID/TTFD P90/P95/P99, major/minor faults, block I/O,
    kswapd/direct reclaim, zRAM, LMKD kill, ApplicationExitInfo, and background
    relaunch metrics.
  - Baseline/Profile work and file-page preload solve different startup costs.
- SmartPerfetto impact:
  - High conceptual value for large-app startup reports: separate CPU/profile
    execution from I/O/page-cache/LMK/relaunch costs.
- Candidate target:
  - For startup traces with major faults, D-state I/O, reclaim, or LMK context,
    recommendations should not stop at app init; they should call out file-page
    and process-lifetime evidence separately.
- Risks/caveats:
  - Research numbers and thresholds are experimental and must not become
    Android platform facts.
- Status: read, high-value large-startup conceptual source.

### 286. `part4-system/ch16-aosp/README.md`

- Type: Chapter 16 overview.
- Useful information:
  - The chapter is system/ROM/platform oriented and should be read as "how the
    platform could be changed," not merely app-side workaround advice.
  - Debug/release/profiling build differences and GUI-agent evaluation are
    suggested related research areas.
- SmartPerfetto impact:
  - Low/medium synthesis value; reinforces the distinction between app-side
    diagnosis and platform-side remediation.
- Candidate target:
  - Keep app-facing reports clear about when an issue is actionable by app code
    versus system/ROM/kernel changes.
- Risks/caveats:
  - Overview only.
- Status: read, low/medium-value chapter overview.

### 287. `part4-system/ch17-oem/01-oem-overview.md`

- Type: OEM performance optimization overview: startup, smoothness, memory,
  power, thermal, freezing, preloading, and background policy.
- Useful information:
  - OEM changes span kernel scheduler/memory/I/O, Native SurfaceFlinger/Binder,
    Framework AMS/WMS/PMS, and app/vendor collaboration layers.
  - Cached-app freezer is different from process kill. In Perfetto, frozen
    threads disappear from CPU execution while the process remains; killed
    processes disappear and later relaunch from Zygote.
  - OEM preloading, USAP Pool, predicted launch, per-app white lists, and
    background management can materially change startup trace shape.
  - Domestic ROM background policy and push ecosystems can alter notification,
    WorkManager/JobScheduler, FGS, and process-lifetime behavior.
- SmartPerfetto impact:
  - High value for cross-device attribution and for avoiding direct app blame
    when OEM policy is the differentiator.
- Candidate target:
  - Reports should include device/OEM/build context and distinguish freeze,
    kill, preload, USAP, FGS/background limits, and vendor whitelist effects.
- Risks/caveats:
  - Vendor-specific claims need device evidence; many details are strategy
    descriptions rather than reproducible constants.
- Status: read, high-value OEM-boundary source.

### 288. `part4-system/ch17-oem/02-soc-differences.md`

- Type: SoC platform differences guide: Qualcomm, MediaTek, Samsung Exynos,
  Google Tensor, CPU topology, GPU, NPU/DSP/ISP, memory, and vendor tools.
- Useful information:
  - Cross-device Perfetto comparisons must account for CPU topology, IPC,
    frequency reporting, EAS/uclamp/cpuset, Perflock or vendor boost,
    thermal policy, and SoC generation.
  - All-big-core, Oryon dual-cluster, Tensor conservative clocks, and Exynos /
    Mali / Xclipse differences change how CPU utilization and migration should
    be interpreted.
  - GPU render-stage data differs across Adreno, Mali/Immortalis, and Xclipse;
    absolute `gpu_render_stages` values are not portable across architectures.
  - NPU/DSP/ISP work can create indirect CPU, bandwidth, power, and camera
    latency effects that may not show as CPU slices.
  - Memory bandwidth pressure is often inferred indirectly through GPU/CPU
    interaction, cache misses, frame variance, and device-specific tools.
- SmartPerfetto impact:
  - High value for device-tier and cross-SoC report caveats.
- Candidate target:
  - Trace reports should avoid cross-device absolute comparisons unless they
    normalize for SoC/GPU/frequency/thermal/reporting differences; use relative
    before/after on the same device when possible.
- Risks/caveats:
  - SoC specifications and vendor kernel parameters are fast moving; verify
    exact product claims before public wording.
- Status: read, high-value SoC-difference source.

### 289. `part4-system/ch17-oem/03-industry-cases.md`

- Type: Industry case studies: Samsung Game Booster/SceneSDK, Xiaomi Game
  Turbo, OPPO/vivo ADPF, TikTok/Douyin startup, foldables, and large-app/OEM
  collaboration.
- Useful information:
  - Public APIs, device-side configuration, and private OEM collaboration must
    be separated. Game Mode / ADPF do not imply a universal thread-scheduler
    or input-priority mechanism.
  - ADPF evidence needs target/actual workload duration, frequency response,
    thermal headroom/status, frame time, and game/app-side trace markers.
  - Large-app startup case studies emphasize task classification,
    atomization/lazy SDK init, preloading ROI, ContentProvider costs, and
    baseline-vs-regression differential analysis.
  - Foldables and multi-window add configuration changes, Surface recreation,
    GPU/layer load, VRR, and focus/window management as performance variables.
- SmartPerfetto impact:
  - Medium/high value for recommendation language and for framing industry
    cases as evidence chains rather than recipes.
- Candidate target:
  - Report recommendations can cite methodology: classify startup work, verify
    preloads with hit rate, and separate public API from OEM/private behavior.
- Risks/caveats:
  - Case-study numbers are not transferable baselines.
- Status: read, useful methodology/case source.

### 290. `part4-system/ch17-oem/04-sched-ext-oem-bpf-scheduler.md`

- Type: Linux `sched_ext` and OEM BPF scheduler guide.
- Useful information:
  - `sched_ext` is a kernel scheduler-class extension point, not an app
    threading or WorkManager feature.
  - AOSP/common kernel may contain sched_ext infrastructure, while actual
    product behavior depends on kernel config, BPF scheduler loading,
    partial/non-partial switch mode, vendor proc/sysfs controls, and SELinux.
  - OPPO/OnePlus `hmbird_sched` public evidence is a procfs control surface,
    not proof of a full public scheduling algorithm.
  - To prove influence, check `CONFIG_SCHED_CLASS_EXT`,
    `/sys/kernel/sched_ext/*`, vendor nodes, `ext` sched state, Perfetto
    migrations, runnable time, cpufreq, binder wait, frame timeline, and A/B
    toggles.
  - `uclamp` and `cpuset` still constrain tasks and must be read before blaming
    BPF scheduler behavior.
- SmartPerfetto impact:
  - High value for OEM scheduler attribution in trace reports.
- Candidate target:
  - Add report caveat/checklist when sched_ext/vendor scheduler is suspected:
    evidence must include kernel state, task attributes, and frame/binder/freq
    correlation.
- Risks/caveats:
  - Product default enablement remains device-specific.
- Status: read, high-value OEM-scheduler evidence source.

### 291. `part4-system/ch17-oem/05-oem-game-mode-input-priority.md`

- Type: OEM game mode, input priority, touch dispatch, refresh-rate, and
  verification guide.
- Useful information:
  - AOSP Game Mode does not provide a standard independent game-input-priority
    channel. It manages mode state and power hints; private OEM layers may add
    additional behavior.
  - InputDispatcher target selection uses focus, touch hit testing, window
    flags, touch state, and security policy, not Game Mode alone.
  - Better touch feel may come from shorter VSync/present wait, high refresh
    mode, CPU/frequency boost, touch firmware sampling, or vendor input paths,
    not necessarily input queue priority.
  - `requestDisallowInterceptTouchEvent()` preserves View-level touch sequence;
    it does not alter system input dispatch.
  - A/B validation should separate input delivery latency, runnable-to-running
    scheduling, frame/present latency, display mode, touch raw event interval,
    and OEM panel/service state.
- SmartPerfetto impact:
  - High value for input-latency and game-mode report attribution.
- Candidate target:
  - Input reports should explicitly separate dispatcher latency from
    touch-to-present latency and should not claim "InputDispatcher priority"
    without dispatcher evidence.
- Risks/caveats:
  - OEM private implementations require device evidence.
- Status: read, high-value input/game-mode boundary source.

### 292. `part4-system/ch17-oem/06-media-performance-class-device-capability.md`

- Type: Media Performance Class and device capability tier guide.
- Useful information:
  - `Build.VERSION.MEDIA_PERFORMANCE_CLASS` / Jetpack Core Performance gives a
    capability bucket, not a generic benchmark score.
  - `0` means unknown/no declared class, not automatically low-end.
  - MPC is decoupled from current OS version; a newer OS can report an older
    capability class.
  - MPC is a good default feature-gating input, but specific media/camera/GPU
    decisions still need runtime capability APIs and online metrics.
  - Performance metrics should carry MPC, SDK/current/initial version, SoC/ABI,
    memory, storage/I/O, display, and refresh capability tags.
- SmartPerfetto impact:
  - Medium/high value for environment labels and recommendation wording.
- Candidate target:
  - Reports and future telemetry evidence should ask for device capability
    labels when comparing media/camera/rendering performance across devices.
- Risks/caveats:
  - MPC does not account for current thermal, battery, background pressure, or
    vendor policy state.
- Status: read, useful device-capability source.

### 293. `part4-system/ch17-oem/07-private-space-app-lock-boundary.md`

- Type: Private Space, app lock, user profile, launcher, notification, media,
  URI grant, and compatibility-boundary guide.
- Useful information:
  - Android Private Space is a separate private profile, not a single app
    switch. Same package in main/private profiles is a separate user instance.
  - Locked Private Space means the private profile is stopped; apps cannot run
    foreground/background work or show notifications.
  - Launcher/home-role permissions, `LauncherUserInfo`, quiet mode, hidden
    entrypoint, user/profile visibility, and URI grant state affect startup,
    recents, notification, share, photo picker, and file flows.
  - OEM app lock is a separate mechanism and may be launch/task/notification
    authentication rather than profile stop.
  - Android 17 native app-lock claims are currently treated as unverified until
    official SDK/AOSP/docs confirm.
- SmartPerfetto impact:
  - Medium value for interpreting missing processes, notification resume,
    picker/file failures, and startup metrics split by user/profile.
- Candidate target:
  - Stability/startup reports should avoid aggregating main-profile and private
    profile app launches solely by package name when evidence indicates profile
    isolation.
- Risks/caveats:
  - Privacy-sensitive. Do not recommend collecting raw app lists, paths, URIs,
    notification contents, or account identifiers.
- Status: read, useful profile/app-lock boundary source.

### 294. `part4-system/ch17-oem/README.md`

- Type: Chapter 17 overview.
- Useful information:
  - Real-device behavior can diverge from AOSP because of system strategy,
    background limits, scheduler parameters, graphics stack, and thermal
    policy.
  - Device distribution should shift analysis from "is this code slow" to "how
    does this system strategy work on this device."
- SmartPerfetto impact:
  - Medium synthesis value for cross-device report framing.
- Candidate target:
  - Preserve OEM/SoC/device distribution context in report preconditions.
- Risks/caveats:
  - Overview only.
- Status: read, medium-value chapter overview.

### 295. `part4-system/ch17-oem/ch17-oem.md`

- Type: Aggregated reference/intake notes for chapter 17.
- Useful information:
  - Contains recent article pointers around Android 17 behavior, app lock
    rumors, developer identity/sideload policy, Android Weekly, kernel CVE, and
    related RSS items.
  - Reinforces that some Android 17 app-lock material is currently secondary
    commentary and must stay in a pending/verification bucket.
- SmartPerfetto impact:
  - Low direct value; useful only as a reminder not to turn rumor/RSS intake
    into confirmed platform behavior.
- Candidate target:
  - No direct Skill/strategy edit unless Android 17 app-lock or sideload policy
    appears in user evidence.
- Risks/caveats:
  - Mixed-source intake notes with duplicates; not a primary technical source.
- Status: read, low-value intake/reference source.

### 296. `part5-app/ch20-stability/01-stability-overview.md`

- Type: Application stability overview.
- Useful information:
  - Crash, ANR, OOM, LMK, and resource exhaustion may all end at process exit,
    but their trigger path, evidence quality, and fix strategy differ.
  - Java crash evidence usually starts at the ART/RuntimeInit uncaught exception
    path; native crash evidence centers on signal/tombstone/symbolization; ANR
    evidence centers on timeout type and traces; OOM evidence must split Java
    heap, native/virtual memory, thread, FD, and LMK cases.
  - `ApplicationExitInfo` is a useful API 30+ compensation source, but it does
    not replace crash envelope, tombstone, ANR trace, or domain context.
  - Stability governance should run prevention, detection, diagnosis, fix, and
    verification as one loop.
- SmartPerfetto impact:
  - High value for report framing. Stability conclusions should identify the
    exit category and evidence source before recommending fixes.
- Candidate target:
  - Stability-related strategies should ask for API version, foreground /
    background state, `ApplicationExitInfo.reason`, trace/tombstone presence,
    and whether the issue is user-perceived.
- Risks/caveats:
  - Article is `ready-for-review` with `task9_result: needs-rework`; use stable
    taxonomy concepts, not version-specific timeout details without a second
    source.
- Status: read, high-value stability taxonomy source.

### 297. `part5-app/ch20-stability/02-java-crash-governance.md`

- Type: Java crash governance.
- Useful information:
  - Custom `UncaughtExceptionHandler` must chain to the previous/default handler
    and only write a minimal, bounded crash envelope before process death.
  - Crash-time work should avoid network, heavy I/O, allocations, and complex
    recovery; richer context belongs to next-start compensation.
  - `kMaxSavedFrames = 256` is an ART saved-frame cap for stack construction,
    not an arbitrary Java stack limit.
  - Coroutine exception handling depends on root `launch`, `async` / deferred,
    supervisor scopes, and global handlers.
- SmartPerfetto impact:
  - Medium value for Java crash recommendations and report caveats.
- Candidate target:
  - Crash strategy wording should separate immediate crash envelope fields from
    next-start runtime context and avoid suggesting heavy in-handler work.
- Risks/caveats:
  - Mostly governance guidance; not directly trace-SQL actionable.
- Status: read, useful Java crash boundary source.

### 298. `part5-app/ch20-stability/03-native-crash-governance.md`

- Type: Native crash analysis and governance.
- Useful information:
  - Native crashes flow through signal handling, debuggerd / crash_dump,
    tombstoned, tombstones, and symbolization; they do not pass through Java
    `UncaughtExceptionHandler`.
  - Tombstone evidence should preserve signal/code/fault address, pid/tid/name,
    registers, pc/lr/sp, backtrace, maps, ABI, build id, and symbolization
    status.
  - App-level signal handlers must stay async-signal-safe, preserve system crash
    semantics, and not swallow signals or block debuggerd tombstone generation.
  - Common signals need separate interpretation: `SIGSEGV`, `SIGABRT`,
    `SIGBUS`, JNI local-reference overflow, allocator aborts, and C++ exception
    boundary mistakes are not interchangeable.
- SmartPerfetto impact:
  - High value for native-crash report contracts and stability recommendations.
- Candidate target:
  - Native stability reports should carry tombstone availability, symbol table
    quality, ABI/build id, and signal-safety caveats before assigning root
    cause.
- Risks/caveats:
  - Article is `ready-for-review` with `task9_result: needs-rework`; preserve
    stable crash-pipeline facts and avoid unverified API-format specifics.
- Status: read, high-value native crash source with caveats.

### 299. `part5-app/ch20-stability/04-anr-governance.md`

- Type: ANR governance.
- Useful information:
  - ANR diagnosis must begin with timeout type, component, foreground /
    background state, Android version, and whether the symptom is user-perceived.
  - Main-thread risks include disk, network, CPU, Binder, locks, ContentProvider
    startup, broadcast `goAsync()` misuse, and lifecycle flushes such as
    `SharedPreferences.apply`.
  - Binder has no generic automatic timeout. Caller-side async timeout wrappers
    are not the same as system ANR boundaries.
  - `nativePollOnce` and an idle-looking main thread are not enough to absolve
    app code; system load, Binder chains, queued input, locks, and component
    lifecycle must be checked.
  - SIGQUIT/traces collection has permission and production-safety boundaries.
- SmartPerfetto impact:
  - Very high value for ANR Skill/strategy hardening.
- Candidate target:
  - ANR strategies should require ANR type, component callback, API/version
    timeout boundary, main-thread state, lock/Binder/IO evidence, and system-load
    disambiguation before final attribution.
- Risks/caveats:
  - Article is `ready-for-review` with `task9_result: needs-rework`; version
    tables and privileged collection details need secondary verification before
    becoming deterministic rules.
- Status: read, top-priority ANR source with version caveats.

### 300. `part5-app/ch20-stability/05-oom-governance.md`

- Type: OOM governance.
- Useful information:
  - OOM is not one bucket. Java heap OOM, native/mmap OOM, thread creation OOM,
    virtual address exhaustion, FD exhaustion, and LMK need separate evidence.
  - Java heap OOM evidence includes growth limit, target footprint, free space,
    GC result, and fragmentation/largest-allocation clues.
  - Thread OOM requires thread count, virtual memory, stack size, task limits,
    and creation stack evidence.
  - FD exhaustion is separate resource exhaustion, not ART OOME.
  - `onTrimMemory` handlers must return quickly; heavy cleanup should not block
    the main thread.
- SmartPerfetto impact:
  - High value for memory/stability report quality.
- Candidate target:
  - Memory-related reports should classify OOM flavor and ask for OOME message,
    `/proc/status`, fd count, thread count, maps/smaps, heap profile, and LMK
    evidence instead of saying generic "memory leak."
- Risks/caveats:
  - Article is `ready-for-review` with `task9_result: needs-rework`; use the
    classification model, not disputed low-level specifics.
- Status: read, high-value OOM taxonomy source.

### 301. `part5-app/ch20-stability/06-stability-metrics.md`

- Type: Stability metrics.
- Useful information:
  - UV crash rate, PV/session crash rate, startup crash rate, repeated crash
    rate, crash-free users, and crash-free sessions answer different questions.
  - Play Vitals user-perceived ANR is narrower than an internal "all ANR"
    metric.
  - Bad-behavior thresholds, single-device thresholds, top stack clusters,
    version comparison, and device/system heatmaps should be interpreted with
    denominators intact.
  - Stack clustering and dedupe windows matter for issue priority.
- SmartPerfetto impact:
  - Medium to high value for recommendation wording and governance sections.
- Candidate target:
  - Final reports should distinguish Vitals vs internal metrics and
    user-perceived vs all-event ANR before comparing rates.
- Risks/caveats:
  - Metric thresholds are governance context, not trace-derived proof.
- Status: read, useful stability metric source.

### 302. `part5-app/ch20-stability/07-exception-architecture.md`

- Type: Exception-handling architecture.
- Useful information:
  - A robust architecture separates runtime entry, minimal crash envelope,
    next-start context compensation, exit reason, SafeMode, and degradation.
  - Crash-loop protection must run early, before high-risk SDK initialization,
    and should degrade narrowly by module/path instead of disabling the whole
    app.
  - Multi-process apps need per-process handler state.
  - WebView renderer exits are system/provider-managed renderer events; apps
    recover with `onRenderProcessGone()` and cannot install normal crash
    handlers inside renderer processes.
  - Coroutine crash context should preserve scope/page/name metadata.
- SmartPerfetto impact:
  - Medium to high value for stability recommendation architecture.
- Candidate target:
  - Reports that recommend crash-loop or WebView mitigation should separate
    envelope, next-start compensation, `ApplicationExitInfo`, SafeMode level,
    and renderer-page fallback.
- Risks/caveats:
  - Article is `ready-for-review`; file-atomicity and WebView/tombstone details
    should stay conservative.
- Status: read, useful exception architecture source.

### 303. `part5-app/ch20-stability/08-crash-aggregation.md`

- Type: Crash aggregation and attribution.
- Useful information:
  - Stack fingerprinting normally normalizes exception type/message, app frames,
    line numbers, native PC offsets, dynamic message fragments, and root-cause
    chains before hashing.
  - Obfuscation/mapping, native symbols, low-information OOM/StackOverflow
    reports, and asynchronous stack drift can split or merge issues incorrectly.
  - Attribution needs app version, OS, model/SoC, process/component, page/scene,
    ABI, build config, gray-release phase, and statistically meaningful sample
    size.
  - Trend and alerting should distinguish new issue, regression, single-cluster
    spike, startup crash, repeated crash, and global rate break.
  - ML/AI clustering can help with second-pass grouping but needs labeled data,
    drift management, and human validation.
- SmartPerfetto impact:
  - Medium to high value for stability report grouping, provenance, and AI
    humility.
- Candidate target:
  - Crash reports should include mapping/symbolization status, first-seen
    version, gray bucket, device/ABI concentration, and scene context before
    claiming an issue cluster or owner.
- Risks/caveats:
  - Article is `ready-for-review` with `task9_result: needs-rework`; ML accuracy
    claims and platform-specific details should not be copied as hard rules.
- Status: read, useful crash aggregation source with caveats.

### 304. `part5-app/ch20-stability/09-stability-case-studies.md`

- Type: Stability governance case studies.
- Useful information:
  - Case framework: classify the failure, locate the blocking/crashing point,
    trace root cause across time/device/frequency dimensions, then fix and
    verify with metrics.
  - Thread-leak OOM should be diagnosed from Java heap status, thread count,
    virtual memory, `/proc/self/status`, thread naming/lifecycle, and Perfetto
    thread lifecycle tracks.
  - Native crash monitoring conflicts should preserve signal-safety, altstack,
    minimal snapshot, re-raise/default crash path, and avoid unsafe in-handler
    unwind or longjmp recovery.
  - ContentProvider startup ANR maps cleanly to `handleBindApplication` /
    `installContentProviders`, provider `onCreate()` main-thread work, manifest
    merge/init order, and SDK auto-init policy.
- SmartPerfetto impact:
  - High value for examples that can become strategy checklist language.
- Candidate target:
  - ANR/OOM/native crash reports should use the same classify -> evidence ->
    root cause -> fix -> verification structure and avoid jumping directly from
    final stack frame to fix recommendation.
- Risks/caveats:
  - Examples are illustrative; SmartPerfetto should convert them into evidence
    gates, not hardcoded case labels.
- Status: read, high-value case-study source.

### 305. `part5-app/ch20-stability/10-webview-renderer-oom-recovery.md`

- Type: WebView renderer OOM and white-screen recovery.
- Useful information:
  - Renderer gone is not automatically an app-process crash. `didCrash()` and
    `rendererPriorityAtExit()` distinguish renderer crash vs killed, while the
    host process may keep running.
  - `onRenderProcessGone()` requires removing the broken WebView, clearing
    references, destroying it, and rebuilding or falling back. Calling `reload`
    on the old instance is unsafe.
  - Metrics should cover renderer gone count, recovery success, second gone
    rate, fallback-page rate, provider version, URL/page pattern, foreground
    state, App PSS, `onTrimMemory`, and WebView provider package/version.
  - `ApplicationExitInfo` can help only when the host process exits; it does not
    substitute for renderer-gone telemetry.
- SmartPerfetto impact:
  - High value for hybrid/WebView stability reports and memory attribution.
- Candidate target:
  - WebView-related reports should separate host crash, renderer crash, renderer
    killed/OOM, white-screen recovery, provider-version concentration, and page
    memory budget.
- Risks/caveats:
  - Renderer memory details may require app-side telemetry; Perfetto alone may
    not show page-level JS heap or provider internals.
- Status: read, high-value WebView stability source.

### 306. `part5-app/ch20-stability/11-mte-memtag-native-crash.md`

- Type: MTE / memtag native crash governance.
- Useful information:
  - MTE turns certain native heap memory-safety bugs into `SIGSEGV` with MTE
    `si_code`; it is not a native heap size profiler.
  - Manifest `android:memtagMode` exposes `off/default/sync/async`, while ASYMM
    is a device / kernel policy path, not an app API.
  - Requested mode, effective device context, MTE hardware support, CPU
    `mte_tcf_preferred`, ABI, build id, so offset, signal code, SYNC/ASYNC
    report quality, and business entry all matter for aggregation.
  - ASYNC reports may crash later than the actual bad access; stack-top-only
    fingerprinting is unsafe.
  - Existing signal-handler constraints still apply: no complex work in the
    crash handler and do not swallow debuggerd tombstones.
- SmartPerfetto impact:
  - Medium value now; high value if native-crash strategy/reporting expands.
- Candidate target:
  - Native crash reports with MTE markers should split requested mode from
    effective device behavior and classify `SEGV_MTESERR` vs `SEGV_MTEAERR`.
- Risks/caveats:
  - Mostly useful for native-crash surfaces, not current trace-SQL Skills unless
    stability traces include tombstone/MTE metadata.
- Status: read, useful native memory-safety source.

### 307. `part5-app/ch20-stability/12-safemode-crash-loop-recovery.md`

- Type: SafeMode crash-loop detection and startup compensation.
- Useful information:
  - Crash-loop detection needs startup marker state plus exit evidence, not
    just recent crash count.
  - Marker dimensions should include session, version, process, pid, elapsed and
    wall time, startup route, stage, and safe-mode level.
  - `ApplicationExitInfo` should be matched by process, time window, marker, and
    stage; "nearest record" is insufficient in multi-process apps.
  - Java crash, native crash, ANR, LMK, user stop, package state changes, and
    WebView renderer gone each have different SafeMode meaning.
  - Degradation should be narrow: module, startup route, protection mode, or
    service retry backoff, with conservative recovery rules.
- SmartPerfetto impact:
  - Medium to high value for recommendations around repeated startup failures.
- Candidate target:
  - Startup/stability reports should describe crash-loop evidence as marker +
    exit reason + stable signature + route, and avoid recommending broad
    app-wide SafeMode without a fault-radius argument.
- Risks/caveats:
  - Requires app-side markers that Perfetto traces may not contain.
- Status: read, useful SafeMode architecture source.

### 308. `part5-app/ch20-stability/13-16kb-page-size-native-compatibility.md`

- Type: 16 KB page size native compatibility.
- Useful information:
  - 16 KB page size issues primarily affect native dependencies: `.so`, static
    libs, Prefab, game plugins, hook/APM SDKs, and runtime-loaded plugins.
  - Evidence should split ELF `PT_LOAD` alignment, APK/AAB ZIP alignment,
    AGP/NDK/linker settings, runtime page size, ABI, toolchain, SDK version,
    and Play/prelaunch validation.
  - Symptoms include install/load failure, `UnsatisfiedLinkError`, `dlopen`
    failure, `mprotect ... Invalid argument`, NDK r27 `WriteProtected` cases,
    and early native/library-loader crashes.
  - Hook/APM SDKs are only risky when final artifacts or runtime page-boundary
    math are wrong; library names alone are not proof.
- SmartPerfetto impact:
  - Medium value for native crash/load-failure recommendations and environment
    fields.
- Candidate target:
  - Native load-failure reports should group by `page_size + signature +
    native_lib + ABI + SDK/toolchain version`, not just crash signal.
- Risks/caveats:
  - Many facts apply to package/build artifacts outside Perfetto traces.
- Status: read, useful native compatibility source.

### 309. `part5-app/ch20-stability/14-thread-fd-resource-monitoring.md`

- Type: Thread and FD resource monitoring.
- Useful information:
  - Thread and FD problems need four layers: quantity, type, creation source,
    and close/release quality.
  - Thread snapshots show current live threads and stacks, but not necessarily
    creation sites or short-lived threads.
  - FD snapshots from `/proc/$pid/fd` plus `readlink()` should classify file,
    socket, pipe, anon_inode, ashmem/memfd, eventfd, epoll, and top-N targets
    with privacy-safe normalization.
  - Hooking `open/socket/pipe/dup/close` is a short diagnostic mode, not a
    default always-on monitor.
  - `FD_SETSIZE` FORTIFY abort is about a high fd value entering `FD_SET`, not
    simply total FD count exceeding 1024.
- SmartPerfetto impact:
  - High value for memory/OOM/ANR/native-crash evidence checklist language.
- Candidate target:
  - Reports involving thread OOM, FD exhaustion, Binder thread starvation, or
    Looper/epoll crashes should ask for resource trend attachments and avoid
    conflating count, fd value, and fd-set boundary.
- Risks/caveats:
  - Requires app-side evidence; trace-only flows may have limited visibility.
- Status: read, high-value resource governance source.

### 310. `part5-app/ch20-stability/15-android17-native-dcl-stability.md`

- Type: Android 17 native dynamic-code-loading stability.
- Useful information:
  - Android 17 targetSdk changes can make writable `System.load(path)` native
    files fail with `UnsatisfiedLinkError`.
  - This surface is a native loading / publication-state problem before it is a
    signal crash problem; evidence should separate loading failure from later
    execution tombstone.
  - Evidence fields include targetSdk, Android version, ABI, final path,
    permissions/stat bits, file length/hash, library version, load stack,
    process, gray batch, and plugin/native package version.
  - `UnsatisfiedLinkError` can also mean ABI mismatch, dependency missing,
    namespace access, 16 KB page-size incompatibility, file corruption, or
    unresolved symbols.
- SmartPerfetto impact:
  - Medium value for Android 17 native load-failure guidance.
- Candidate target:
  - Native load-failure recommendations should classify DCL permission issues
    separately from 16 KB alignment and native execution crashes.
- Risks/caveats:
  - Article is `ready-for-review` with `task9_result: needs-rework` and a P1
    note about publication ordering / concurrent load windows. Do not copy its
    release-state-machine sequence as final guidance without fixing that risk.
- Status: read, useful Android 17 source with active review caveat.

### 311. `part5-app/ch20-stability/16-keystore-quota-login-stability.md`

- Type: Android 17 Keystore quota and login stability.
- Useful information:
  - Android 17 introduces per-app Keystore key count limits; targetSdk 37+
    non-system apps get `ERROR_TOO_MANY_KEYS`, while legacy target behavior may
    surface as `ERROR_INCORRECT_USAGE`.
  - Login, payment, biometric, passkey, device-binding, cache, certificate
    rotation, and QA flows can leak aliases over time.
  - `KeyStoreException` handling should inspect cause chains, numeric error
    code, retry policy, transient/system flags, targetSdk, API level, and
    account state.
  - Alias lifecycle needs deterministic naming, reuse-before-create,
    per-account cleanup, migration tables, generation cleanup, and multiprocess
    synchronization.
  - Evidence should use alias prefix/count bucket and lifecycle metadata, not
    raw aliases, tokens, account IDs, or key material.
- SmartPerfetto impact:
  - Low to medium direct trace value, but useful for stability recommendation
    boundaries and Android 17 app-behavior reports.
- Candidate target:
  - If reports mention login/payment Keystore failures, classify quota,
    authentication, invalid key, unsupported capability, and transient system
    failures separately.
- Risks/caveats:
  - This is mostly app telemetry and exception-handling guidance; no direct
    Perfetto SQL action.
- Status: read, useful Android 17 stability source.

### 312. `part5-app/ch20-stability/README.md`

- Type: Chapter 20 overview.
- Useful information:
  - Stability governance is framed around whether the app stays usable, not
    only whether it is fast.
  - Chapter-level taxonomy covers Crash, ANR, OOM, monitoring, governance, and
    measurement.
- SmartPerfetto impact:
  - Low direct value; useful as chapter synthesis.
- Candidate target:
  - No direct Skill/strategy edit.
- Risks/caveats:
  - Overview only and list is older than the full chapter contents.
- Status: read, low-value overview source.

### 313. `part5-app/ch21-startup/01-startup-analysis.md`

- Type: App-side startup path analysis.
- Useful information:
  - Cold startup should be split into process/runtime setup, Application
    initialization, Activity/layout construction, and first-frame rendering.
  - TTID ends at system-observed initial display, while TTFD depends on
    `reportFullyDrawn()` and business-defined content readiness.
  - `performTraversals` ending is only a CPU-side lower-bound approximation for
    TTID when exact draw-finished/frame-commit evidence is unavailable.
  - Perfetto startup analysis should correlate system_server start process,
    app main thread `bindApplication` / `activityCreate` / `performTraversals`,
    RenderThread `DrawFrame`, SurfaceFlinger, class loading, GC, thread state,
    Binder, and CPU scheduling.
  - Cold/warm/hot and first-install/upgrade paths need separate statistics.
- SmartPerfetto impact:
  - Very high value for startup analysis strategy/reporting.
- Candidate target:
  - Startup reports should explicitly label TTID/TTFD endpoints, whether the
    endpoint is exact or approximate, and which phase dominates wall time vs CPU
    time.
- Risks/caveats:
  - Article is `ready-for-review` with `task9_result: needs-rework`; first-frame
    callback API names, TTID endpoint approximations, and SharedPreferences
    version details need conservative treatment.
- Status: read, top-priority startup source with caveats.

### 314. `part5-app/ch21-startup/02-startup-framework.md`

- Type: Startup framework and task orchestration.
- Useful information:
  - Startup tasks should be modeled as a DAG with dependencies, thread mode,
    priority, timeout, owner, and critical-path contribution.
  - Critical-path analysis matters more than total task count: shortening
    non-critical tasks may not improve startup wall time.
  - App Startup reduces multiple ContentProvider entrypoints but still runs
    synchronously before `Application.onCreate`; it is not an async startup
    framework.
  - Async initialization needs separate main/IO/CPU scheduling, dependency
    checks, timeouts, soft dependencies, and monitoring.
  - Dynamic startup configuration needs local defaults, config validation,
    cycle detection, version compatibility, and A/B metrics.
- SmartPerfetto impact:
  - High value for interpreting app-provided startup task telemetry and
    recommending startup governance.
- Candidate target:
  - Startup reports should recommend DAG/critical-path remediation only when
    trace evidence shows task-level ownership or explicit initialization
    slices; otherwise ask for task telemetry.
- Risks/caveats:
  - Article still has `needs-rework` notes around Alpha details and thread
    priority guidance. Use generic DAG concepts, not framework-specific API
    claims.
- Status: read, high-value startup architecture source with active caveats.

### 315. `part5-app/ch21-startup/03-contentprovider-optimization.md`

- Type: ContentProvider startup governance.
- Useful information:
  - `ActivityThread.handleBindApplication()` installs providers before
    `Application.onCreate`, so provider work can be invisible to App-only
    startup timers.
  - Provider cost includes class loading/reflection, disk I/O, locks/threads,
    cross-process wakeups, and SDK auto-initialization.
  - Provider audit needs merged manifest source, process, authorities,
    `initOrder`, source library, necessity, measured cost, and migration path.
  - App Startup consolidates automatic initialization into one provider and
    explicit dependencies, but heavy work still blocks startup if left there.
  - Multi-process providers and initializers need process guards.
- SmartPerfetto impact:
  - Very high value for startup trace interpretation.
- Candidate target:
  - Startup strategies should flag time before `Application.onCreate` as
    provider/attach/bind territory and avoid telling users to inspect only
    `Application.onCreate`.
- Risks/caveats:
  - Provider ownership usually requires manifest/build evidence outside trace.
- Status: read, top-value ContentProvider startup source.

### 316. `part5-app/ch21-startup/04-baseline-profile-practice.md`

- Type: Baseline Profile practice.
- Useful information:
  - Baseline Profile helps with class/method compilation, interpretation, JIT
    warmup, and startup/high-frequency path execution; it does not fix main
    thread I/O, locks, network waits, database upgrades, or SDK synchronous
    initialization.
  - Verification must cover source `baseline-prof.txt`, APK/AAB binary profile
    presence, installation channel, device compilation state, and measured
    benefit.
  - `ProfileVerifier` / `dumpsys package dexopt` states distinguish profile
    present/enqueued from compiled-with-profile.
  - Macrobenchmark should compare clean profile/no profile and
    profile-enabled runs under the same device, data, account, and route.
- SmartPerfetto impact:
  - High value for startup recommendations when class loading/JIT dominates.
- Candidate target:
  - Startup reports should recommend Baseline/Profile only when trace evidence
    points to code execution/class loading/JIT, and should request compilation
    state before blaming missing profiles.
- Risks/caveats:
  - Profile benefits are install/channel/device-state dependent.
- Status: read, high-value profile verification source.

### 317. `part5-app/ch21-startup/05-splash-screen.md`

- Type: Splash Screen and perceived startup speed.
- Useful information:
  - Starting Window/Splash is system or compatibility UI feedback before app
    content; it must not be counted as app content readiness.
  - SplashActivity adds an extra Activity/window lifecycle and can be visible
    in traces as extra draw-finished cycles.
  - `reportFullyDrawn()` is a TTFD metric signal and does not control
    SplashScreen lifetime.
  - Skeleton screens, preloading, and animations improve perceived performance,
    but TTID/TTFD/first-content quality must be measured separately.
  - Perfetto should split system_server starting surface, Shell/SystemUI splash
    creation, app first frame, and app exit animation.
- SmartPerfetto impact:
  - High value for avoiding false "startup improved" conclusions.
- Candidate target:
  - Startup reports should distinguish Starting Window/Splash visibility,
    first app frame, skeleton frame, and content-ready frame.
- Risks/caveats:
  - Article has `task9_result: needs-rework`; Baseline Profile DSL and
    core-splashscreen compatibility details should not be reused as hard facts.
- Status: read, useful perceived-startup source with caveats.

### 318. `part5-app/ch21-startup/06-lazy-initialization.md`

- Type: Delayed initialization and on-demand loading.
- Useful information:
  - Delaying work changes execution time, not necessarily total user waiting
    time; validate TTID, TTFD, first-use latency, frame/input impact, and
    failure rate together.
  - Good trigger categories are after-first-frame, first-use, main-queue idle,
    and process-idle, each with different risk.
  - `MessageQueue.IdleHandler` is a queue-idle signal on that Looper, not a
    system-idle signal; heavy work should be scheduled elsewhere.
  - Delayed tasks need declarations: trigger, dependencies, thread, timeout,
    fallback, and metrics.
  - App Startup manual initialization and dynamic feature/on-demand loading need
    explicit ready/loading/failed states.
- SmartPerfetto impact:
  - High value for recommendation quality when startup work is merely moved.
- Candidate target:
  - Reports should avoid saying "move to async/lazy" unless they also mention
    first-use cost, fallback, and validation metrics.
- Risks/caveats:
  - Many mitigations require app telemetry unavailable from a single trace.
- Status: read, high-value lazy-init source.

### 319. `part5-app/ch21-startup/07-multiprocess-startup.md`

- Type: Multi-process startup optimization.
- Useful information:
  - Every process pays process creation, runtime/class loading, provider
    installation, `Application.onCreate`, native state, and IPC costs.
  - Moving a module to another process can improve isolation/address-space
    pressure but can also add cold-start and Binder waiting costs.
  - Subprocess startup should be classified as first-screen required,
    after-first-frame, path-predicted, or background.
  - Cross-process dependencies need capability/state machines with timeout,
    cancellation, and degradation; memory singletons and `MODE_MULTI_PROCESS`
    style assumptions are unsafe.
  - Metrics should be per-process: start reason, bind/provider/Application
    duration, Binder ready, TTID/TTFD effect, PSS/RSS, thread/FD/native heap,
    crash/restart/binderDied.
- SmartPerfetto impact:
  - High value for startup traces that contain multiple app processes.
- Candidate target:
  - Startup reports should not treat a child process as "free background work";
    they should quantify whether it happens before first frame and whether main
    thread waits on Binder.
- Risks/caveats:
  - Requires accurate process-role detection and start reason.
- Status: read, high-value multi-process startup source.

### 320. `part5-app/ch21-startup/08-startup-monitoring.md`

- Type: Startup monitoring and measurement.
- Useful information:
  - Startup monitoring should include TTID, TTFD, process-observed time, app
    onCreate, Activity lifecycle, first draw, content ready, and fully drawn.
  - Metrics must be segmented by cold/warm/hot, first install, upgrade first
    launch, entry source, page, version, process, device, OS, ABI, memory tier,
    and cache state.
  - P50/P75/P90/P99 and sample size are more useful than average.
  - Android Vitals thresholds are external baselines, not internal proof of
    good user experience.
  - Android 15+ `ApplicationStartInfo` can calibrate system-side timestamps but
    cannot replace compatibility monitoring for older versions.
- SmartPerfetto impact:
  - High value for startup report metric interpretation and recommendations.
- Candidate target:
  - Startup reports should ask for segmentation and sample size when comparing
    startup regressions, and avoid averaging cold/warm/hot samples.
- Risks/caveats:
  - Article has `task9_result: needs-rework`; keep Android 15+ API details
    conservative unless verified against official API.
- Status: read, high-value monitoring source with caveats.

### 321. `part5-app/ch21-startup/09-startup-case-studies.md`

- Type: Startup optimization review framework and case template.
- Useful information:
  - Reusable framework: background, problem, evidence, bottleneck, change, risk,
    verification, follow-up.
  - Startup bottlenecks should be classified by CPU, I/O, lock, GC, class
    loading, rendering, and network, not just "startup slow."
  - `Application.onCreate` task reviews should split minimal startup-critical
    work from delayed history upload, telemetry, push, DB, and remote config.
  - Profile work must be verified through source, package, install/compile
    state, and measured benefit.
  - GC suppression / runtime-hook approaches are research-only unless proven
    safe per Android version, ABI, and ROM.
- SmartPerfetto impact:
  - High value for report structure and remediation framing.
- Candidate target:
  - Startup reports should end with evidence-backed bottleneck class, change
    category, risks, and validation plan rather than only listing slow slices.
- Risks/caveats:
  - Provides templates, not deterministic trace logic.
- Status: read, high-value startup report template.

### 322. `part5-app/ch21-startup/10-sdk-runtime-ad-sdk-startup.md`

- Type: SDK Runtime / ad SDK startup isolation.
- Useful information:
  - SDK Runtime shifts ad SDK cost from in-process initialization to sandbox
    process startup, `loadSdk()` async loading, Binder calls, sandbox memory,
    SharedPreferences key sync, and failure handling.
  - It should be modeled as an async startup-DAG node after first frame or before
    ad exposure, not as a first-frame blocking dependency.
  - Metrics should distinguish load start/callback, first ad request after load,
    TTID/TTFD, Binder call count, sandbox death, failure code, compat path, and
    App/sandbox PSS.
  - SharedPreferences sync keys are explicit contracts; sync only small stable
    fields.
- SmartPerfetto impact:
  - Medium to high value for modern ad/hybrid startup analysis.
- Candidate target:
  - Reports mentioning ad SDK startup should include whether SDK Runtime or
    compat path is used and whether the app main thread waits for `loadSdk()` or
    sandbox Binder calls.
- Risks/caveats:
  - Article is `ready-for-review`; AndroidX compatibility process model needs
    version-specific verification.
- Status: read, useful SDK Runtime source.

### 323. `part5-app/ch21-startup/11-cloud-profile-dm-install-compile.md`

- Type: Cloud Profile, `.dm`, ART compilation, and install-time optimization.
- Useful information:
  - Baseline Profile, Cloud Profile, local JIT profile, and Startup Profile have
    different producers, arrival times, and effects.
  - `.dm` dex metadata can carry profile data; ART/installd/profman/dex2oat
    consume profiles based on install source and compiler filter.
  - Installation complete does not equal compilation complete. Android 14+ ART
    Service, `pm art dump`, `dumpsys package dexopt`, compiler filter, reason,
    and background dexopt matter.
  - Clean/no-profile, profile-hit, and steady-state startup tests must be
    separated.
  - Profile risk includes code mismatch, overly narrow/wide profiles, dynamic
    feature gaps, and hotfix/plugin divergence.
- SmartPerfetto impact:
  - High value for startup reports that blame or recommend profile/compile
    changes.
- Candidate target:
  - Startup analysis should require install source, compiler filter/reason, and
    JIT/class-loading evidence before attributing slow start to missing Cloud or
    Baseline Profile.
- Risks/caveats:
  - Article has `task9_result: needs-rework`; exact ART Service commands and
    API 34+ no-profile baseline procedure should be verified before inclusion.
- Status: read, high-value profile-system source with command caveats.

### 324. `part5-app/ch21-startup/12-startup-profile-dex-layout.md`

- Type: Startup Profile and DEX layout optimization.
- Useful information:
  - Startup Profile is a build-time DEX layout input, while Baseline Profile is
    an ART profile-guided AOT input.
  - Startup Profile targets entry-to-first-screen code locality, page faults,
    DEX/class metadata access, and variance; it does not remove business
    initialization, network, I/O, locks, or SDK work.
  - `includeInStartupProfile` should cover launcher, deep link, notification,
    first-screen View/Compose tree, route, and necessary SDK init; search,
    detail, long scroll, payment, and low-frequency paths belong in Baseline
    Profile, not startup DEX layout.
  - Verification needs generated `startup-prof.txt`, R8/AGP consumption,
    release/minified build, DEX layout checks, and Macrobenchmark groups.
- SmartPerfetto impact:
  - High value for precise profile recommendations.
- Candidate target:
  - Reports should distinguish "compile profile missing" from "startup DEX
    layout not optimized" and only recommend Startup Profile when code locality
    / class loading appears relevant.
- Risks/caveats:
  - Article is `ready-for-review`; verify toolchain-version claims before using
    them in deterministic docs.
- Status: read, high-value Startup Profile source.

### 325. `part5-app/ch21-startup/README.md`

- Type: Chapter 21 overview.
- Useful information:
  - Startup optimization chapter covers app-side startup framework, provider
    governance, Baseline/Profile, perceived speed, lazy init, multiprocess, and
    monitoring.
- SmartPerfetto impact:
  - Low direct value; useful as chapter synthesis.
- Candidate target:
  - No direct Skill/strategy edit beyond chapter synthesis.
- Risks/caveats:
  - Overview list is shorter than actual chapter contents.
- Status: read, low-value overview source.

### 326. `part5-app/ch22-rendering-practice/01-layout-optimization.md`

- Type: Layout optimization practice.
- Useful information:
  - Layout/jank attribution should start from trace evidence:
    `performMeasure` / `performLayout` dominance means something different from
    RenderThread or GPU dominance.
  - View hierarchy cost is not only depth. Repeated measure containers,
    high-frequency list items, and inflated hidden content are often more
    important.
  - `ConstraintLayout` helps mainly when it flattens complex relative
    relationships; simple linear layouts may stay simpler and faster.
  - `ViewStub` defers creation, `<merge>` removes a wrapper, and `<include>`
    mainly reuses XML unless paired with `merge` or deferred inflation.
  - `AsyncLayoutInflater` only moves part of XML/View creation off main and may
    fall back; binding and add-to-parent still happen on main.
  - Compose/View mixed pages need phase separation between View
    measure/layout and Compose composition/layout/draw.
- SmartPerfetto impact:
  - High value for jank recommendation precision.
- Candidate target:
  - Jank strategies should only recommend layout flattening when trace evidence
    shows measure/layout is the bottleneck, not when RenderThread/GPU dominates.
- Risks/caveats:
  - Recommendations require distinguishing View, Compose, and mixed phases.
- Status: read, high-value layout/jank source.

### 327. `part5-app/ch22-rendering-practice/02-recyclerview-practice.md`

- Type: RecyclerView performance practice.
- Useful information:
  - List jank should be bucketed into reuse miss, full bind, diff/update,
    prefetch deadline miss, nested list, animation, or layout.
  - `viewType` should describe layout structure, not transient business state;
    excessive view types fragment pools.
  - DiffUtil/AsyncListDiffer/ListAdapter and payloads reduce main-thread bind;
    `notifyDataSetChanged` hides fine-grained update intent.
  - GapWorker prefetch has deadlines. `setInitialPrefetchItemCount()` is for
    nested RecyclerView initial prefetch and is not "larger is always better."
  - Shared `RecycledViewPool`, `setHasFixedSize`, and disabling change
    animations can be valid only in matching contexts.
  - RecyclerView vs LazyColumn decisions require measured metrics and stack
    context, not blanket recommendations.
- SmartPerfetto impact:
  - High value for scroll/list jank reports.
- Candidate target:
  - When traces show `RV onCreateViewHolder`, `RV onBindViewHolder`,
    `RV Prefetch`, or `RV OnLayout`, reports should map to the specific bucket
    rather than saying "optimize RecyclerView."
- Risks/caveats:
  - Some fixes require app source or runtime tags not always available in a
    standalone trace.
- Status: read, high-value RecyclerView source.

### 328. `part5-app/ch22-rendering-practice/03-compose-performance.md`

- Type: Jetpack Compose performance practice.
- Useful information:
  - Compose perf attribution should separate recomposition, layout, draw, state
    read phase, and allocation.
  - `derivedStateOf` fits high-frequency input producing lower-frequency output,
    not every computed value.
  - Strong Skipping, lambda memoization, Stable/Immutable contracts, pausable
    composition, and Lazy cache-window behavior are version-sensitive.
  - Lazy list `key` should be stable business identity; `contentType` helps item
    reuse. Index keys are risky under insert/delete.
  - ComposeView in RecyclerView and Fragment ComposeView have different
    composition disposal rules.
  - `AndroidView` update lambdas run on recomposition and should stay minimal.
- SmartPerfetto impact:
  - High value when traces contain Compose slices or mixed View/Compose lists.
- Candidate target:
  - Reports should avoid "Compose is slow" and classify recomposition vs layout
    vs draw vs interop boundary with version caveats.
- Risks/caveats:
  - Article is marked `needs-rework`; exact version/default claims must be used
    conservatively.
- Status: read, high-value Compose source with version caveats.

### 329. `part5-app/ch22-rendering-practice/04-custom-view-optimization.md`

- Type: Custom View performance practice.
- Useful information:
  - Custom View optimization priority often follows call frequency:
    `onDraw` > `onLayout` > `onMeasure`.
  - `onDraw` should avoid allocation; per-frame object/string/path allocation
    can align GC with `doFrame`.
  - `LAYER_TYPE_HARDWARE` helps complex static content but hurts frequently
    invalidated content.
  - API 21+ hardware rendering ignores dirty-rect optimization in
    `invalidate(Rect)`; invalidation works through RenderNode.
  - `invalidate()` and `requestLayout()` have different costs; animation should
    use frame-aligned invalidation rather than invalidating from `onDraw`.
  - RenderNode API 29+ can split static and dynamic drawing for custom caches.
- SmartPerfetto impact:
  - High value for custom View and RenderThread/UI-thread draw attribution.
- Candidate target:
  - Jank reports should distinguish UI-thread display-list recording from
    RenderThread `DrawFrame`, and recommend custom trace sections when app code
    is opaque.
- Risks/caveats:
  - Some advice depends on API level and hardware acceleration state.
- Status: read, high-value custom View source.

### 330. `part5-app/ch22-rendering-practice/05-animation-performance.md`

- Type: Animation performance practice.
- Useful information:
  - Animation cost depends on what changes each frame: render properties
    (alpha/translation/scale), layout params, drawable frames, or self-draw.
  - `ViewPropertyAnimator` is appropriate for render-property animations, while
    width/height/layout animations can force traversal.
  - `withLayer` is useful only when animated content is stable.
  - Frame animation cost should account for decoded RGBA size, decode work,
    texture upload, and memory spikes.
  - Lottie cost depends on masks, mattes, path complexity, images, and
    simultaneous playback count.
  - Blur/RenderEffect can make UI thread look short while RenderThread/GPU is
    the real bottleneck.
- SmartPerfetto impact:
  - High value for animation jank reports.
- Candidate target:
  - Animation analysis should classify UI-thread `doFrame`, RenderThread,
    texture/GPU, and layout traversal before recommending a fix.
- Risks/caveats:
  - Specific animation library advice requires app context.
- Status: read, high-value animation source.

### 331. `part5-app/ch22-rendering-practice/06-image-loading.md`

- Type: Image loading and display performance.
- Useful information:
  - Image issues split into network/download, decode, pixel memory, display
    timing, cache, and lifecycle.
  - Glide/Coil choices depend on lifecycle, cache, target size, and reuse
    discipline; single-benchmark ranking is weak evidence.
  - Decode should target View/display size. A 4000 x 3000 `ARGB_8888` image is
    about 45.8 MB.
  - Large pan/zoom images need tile/region strategies; crop alone is not a
    substitute.
  - Cache keys should include URL, size, transformation, and format/version.
  - Smaller encoded formats such as AVIF can still decode slower.
- SmartPerfetto impact:
  - High value for rendering and memory report recommendations.
- Candidate target:
  - Reports should distinguish network, decode, cache miss, oversized bitmap,
    texture upload, and OOM/memory pressure rather than saying "optimize
    images."
- Risks/caveats:
  - Trace-only analysis may not expose loader cache keys or request sizes.
- Status: read, high-value image source.

### 332. `part5-app/ch22-rendering-practice/07-webview-optimization.md`

- Type: WebView performance practice.
- Useful information:
  - WebView open should be split into T0 click, T1 native container visible, and
    T2 first readable/interactive H5 content.
  - First WebView creation includes provider/Chromium init and is much heavier;
    warmup should usually happen after first app frame or idle, not in
    `Application.onCreate`.
  - WebView pools require capacity, admission, cleanup, parent removal,
    client/bridge clearing, and `about:blank`/history reset.
  - Offline packages and `shouldInterceptRequest` must keep the callback path
    short and have manifest/hash/rollback/network fallback.
  - JS bridge callbacks run off the UI thread but JS waits for them;
    `evaluateJavascript` is main-thread entry and should not block.
  - Renderer gone handling should capture didCrash, priority, provider, URL,
    memory, and recreate/cleanup behavior.
- SmartPerfetto impact:
  - High value for hybrid performance and WebView stability reports.
- Candidate target:
  - WebView reports should separate native shell, Chromium provider init,
    network/offline package, JS bridge, renderer process, and app main-thread
    waits.
- Risks/caveats:
  - Article is marked `needs-rework`; use stable principles and cross-check
    renderer-gone evidence with stability chapters.
- Status: read, high-value WebView source with caveats.

### 333. `part5-app/ch22-rendering-practice/08-frame-monitoring.md`

- Type: Frame monitoring and online jank governance.
- Useful information:
  - Frame diagnostics need three layers: frame cadence, phase duration, and code
    context.
  - Choreographer callbacks show cadence only; `frameTimeNanos` is frame start,
    not completion.
  - JankStats is per-window and needs stable UI state tags; copy `FrameData`
    immediately.
  - FrameMetrics gives phase metrics with API/version limitations; API 31+ adds
    GPU/deadline-related fields.
  - Stack sampling should be bounded, slow-window-only, and privacy-trimmed.
  - First draw frames should not be counted as normal animation/list jank.
- SmartPerfetto impact:
  - Top-priority source for jank report contract and online/offline boundary.
- Candidate target:
  - Strategies should separate cadence, rendering stage, and code context, and
    be refresh-rate/deadline aware.
- Risks/caveats:
  - Online monitoring data is aggregate context, not deterministic root-cause
    proof by itself.
- Status: read, top-priority frame-monitoring source.

### 334. `part5-app/ch22-rendering-practice/09-rendering-case-studies.md`

- Type: Rendering optimization case framework.
- Useful information:
  - Reusable case template: scene, symptom, evidence, root cause, change, cost,
    validation.
  - List jank should combine Macrobenchmark, JankStats states, and Perfetto to
    classify main bind, RenderThread, background decode/diff, and GC.
  - Compose migration should not be summarized as "Compose is slow"; identify
    composable computation, Lazy keys/contentType, subcompose cost, and Binder
    side effects.
  - Complex pages should split first-frame-required work, after-first-frame
    fill, and near-viewport loading, with refresh-rate budgets.
  - AI attribution can propose candidates but must be validated by benchmarks,
    JankStats, or Perfetto.
- SmartPerfetto impact:
  - High value for report structure and remediation validation language.
- Candidate target:
  - Rendering reports should end in evidence-backed class, change cost, and
    validation plan rather than only listing slow slices.
- Risks/caveats:
  - Provides framework, not deterministic SQL logic.
- Status: read, high-value rendering report template.

### 335. `part5-app/ch22-rendering-practice/10-rendereffect-runtime-shader-performance.md`

- Type: RenderEffect, RuntimeShader, and AGSL performance.
- Useful information:
  - RenderEffect API 31+ and RuntimeShader API 33+ effects often involve
    offscreen layers or texture read/write work.
  - Cost depends on area, blur radius, input changes, chain length, shader
    `eval()` count, and refresh rate.
  - Full-screen intermediate textures can be large; 1080 x 2400 RGBA is about
    9.9 MB before driver/stride/pooling details.
  - Shader/effect objects should be created once and animated via small uniform
    updates.
  - Perfetto can show FrameTimeline, UI vs RenderThread, and sometimes GPU
    counters, but counter names vary.
  - Compose `graphicsLayer` RenderEffect shares HWUI model.
- SmartPerfetto impact:
  - High value for GPU/RenderThread jank attribution.
- Candidate target:
  - Reports should warn that RenderEffect/AGSL recommendations require area,
    offscreen-layer, RenderThread/GPU, and device-tier evidence.
- Risks/caveats:
  - Article is `needs-rework`; avoid reusing exact code examples or unstable
    behavior claims.
- Status: read, high-value graphics effect source with caveats.

### 336. `part5-app/ch22-rendering-practice/11-animated-vector-drawable-performance.md`

- Type: Animated Vector Drawable performance.
- Useful information:
  - API 25+ AVD can run on RenderThread when hosted in hardware-accelerated View
    Canvas and RenderNode path; pre-25 is UI-thread oriented.
  - Software Canvas, software layer, bitmap pre-rendering, or disabled hardware
    acceleration can move work back to the UI path.
  - RenderThread AVD can keep animating while UI thread is busy until the next
    UI synchronization point; callbacks may lag.
  - Diagnosis should compare the same AVD in a normal ImageView and the problem
    container and record hardware acceleration, software layer, visible count,
    and resource complexity.
- SmartPerfetto impact:
  - Medium/high value for animation jank when AVD resources appear in app
    context.
- Candidate target:
  - Animation reports should not assume AVD is always UI-thread work or always
    RenderThread work; host and API boundary matter.
- Risks/caveats:
  - Requires app resource and host-view context that may not be present in
    Perfetto alone.
- Status: read, useful AVD source.

### 337. `part5-app/ch22-rendering-practice/12-fragment-transaction-performance.md`

- Type: FragmentTransaction and page-switching performance.
- Useful information:
  - `commit()` queues work; the expensive execution may appear later in
    `execPendingActions`, not inside the click handler or a Choreographer slice.
  - `commitNow` is synchronous and cannot use back stack; `executePendingTransactions`
    flushes all pending transactions and can have broader effects.
  - `runOnCommit` means transaction execution, not frame drawn or data loaded.
  - `setReorderingAllowed(true)` changes lifecycle/order behavior and is not
    just a speed flag.
  - Evidence should include click message, lifecycle/inflate/onViewCreated,
    adapter submit, traversal, RenderThread, FrameTimeline, and custom trace
    sections.
  - Budget should split transaction execution, first frame, and after-first-frame
    completion.
- SmartPerfetto impact:
  - High value for page-transition jank reports.
- Candidate target:
  - Reports should look outside the immediate click handler for queued fragment
    transaction cost and distinguish first frame from content-ready completion.
- Risks/caveats:
  - Article is `needs-rework`; exact version and callback details need cautious
    wording.
- Status: read, high-value page-transition source with caveats.

### 338. `part5-app/ch22-rendering-practice/13-predictive-back-performance.md`

- Type: Predictive Back performance.
- Useful information:
  - Back interaction has start, progress, cancel, and complete phases.
  - Progress callbacks should only update per-frame-safe animation state or
    properties; navigation and heavy save work belong to completion.
  - Android and AndroidX version boundaries matter for progress callbacks and
    Fragment/Transition support.
  - Compose should read progress in the animation layer, not force broad
    NavHost/scaffold recomposition.
  - Mixed WebView/Fragment/Activity stacks need explicit priority: WebView
    history, page dialog, fragment stack, Activity finish.
- SmartPerfetto impact:
  - Medium/high value for modern transition jank analysis.
- Candidate target:
  - Transition reports should classify progress callback, layout/recomposition,
    RenderThread, FrameTimeline, and SurfaceFlinger evidence separately.
- Risks/caveats:
  - Some version claims are `ready-for-review`; keep exact boundaries guarded.
- Status: read, useful predictive-back source.

### 339. `part5-app/ch22-rendering-practice/14-desktop-windowing-large-screen-performance.md`

- Type: Desktop windowing and large-screen rendering performance.
- Useful information:
  - Desktop windowing changes workload shape: continuous resize, more visible
    content, higher-frequency pointer/keyboard input, and more window state.
  - Android 16/17 large-screen behavior ignores some orientation/aspect/resizable
    limits for targetSdk/device combinations; app layouts must handle size
    changes rather than relying on manifest locks.
  - Adaptive UI should compress window metrics into stable layout modes and
    avoid rebuilding data sources on every pixel resize.
  - Multi-instance risk includes duplicated caches, cross-window state writes,
    large drag/drop payloads, database invalidation, and route ownership.
  - Perfetto attribution should split input, app main thread, RenderThread/GPU,
    and SurfaceFlinger/HWC composition.
  - Window-size pressure tests should cross breakpoints around 600/840/1200/1600
    dp and keep per-size trace baselines.
- SmartPerfetto impact:
  - High value for large-screen jank and resize analysis.
- Candidate target:
  - Rendering strategies should treat resize and multi-window as explicit
    scenario dimensions, not just static layout size variants.
- Risks/caveats:
  - Some Android 16/17 desktop-windowing facts are recent and should stay
    version-gated.
- Status: read, high-value large-screen rendering source.

### 340. `part5-app/ch22-rendering-practice/15-compose-first-view-migration-performance.md`

- Type: Compose First and View/Compose migration boundary.
- Useful information:
  - Compose First means new UI should start from Compose, while stable View
    pages can remain until touched by redesign/performance work.
  - View toolkit and View-based Jetpack libraries are maintenance/complete, not
    immediately unusable.
  - `ComposeView` and `AndroidView` add lifecycle, measure/layout, state sync,
    and dual-tree management costs.
  - Migration risk varies by page type: settings, lists, animation-heavy pages,
    adaptive layouts, and WebView/Map/Ad/Player pages need different gates.
  - Lazy/Pausable Composition and Strong Skipping behavior is version-sensitive;
    do not write alpha defaults as stable behavior.
  - Validation should include Macrobenchmark, FrameTimeline, recomposition/skip
    metrics, GC, memory, and Baseline Profile state.
- SmartPerfetto impact:
  - High value for mixed View/Compose and migration recommendation quality.
- Candidate target:
  - Reports should distinguish migration architecture risk from trace-proven
    frame bottlenecks and avoid blanket "rewrite in Compose/View" suggestions.
- Risks/caveats:
  - Public API/tooling state is fast-moving; recommendations need version
    context.
- Status: read, high-value Compose migration source.

### 341. `part5-app/ch22-rendering-practice/16-deliqueue-recyclerview-prefetch.md`

- Type: Android 17 DeliQueue and RecyclerView prefetch timing.
- Useful information:
  - Android 17 DeliQueue affects MessageQueue lock contention for targetSdk 37+;
    it does not change RecyclerView prefetch algorithms or shorten bind/layout.
  - List jank should split queue entrance wait, `RV Prefetch` execution,
    create/bind/layout, and FrameTimeline outcome.
  - `MessageQueue.mMessages` reflection becomes invalid in the new
    implementation; tests/APM/idle detectors may break.
  - Target 36 vs 37 A/B on the same Android 17 device can isolate DeliQueue
    effects, with compat switches for diagnosis.
  - Business-side batching should reduce main-thread post storms even when the
    queue is lock-free.
  - Mixed Compose/View item cost remains separate from queue contention.
- SmartPerfetto impact:
  - High value for Android 17 scroll jank and platform-change attribution.
- Candidate target:
  - Reports should not attribute target 37 improvements/regressions to
    RecyclerView itself until MessageQueue contention, bind/layout, and
    FrameTimeline evidence are separated.
- Risks/caveats:
  - DeliQueue benchmark numbers are official directional references, not local
    app proof.
- Status: read, high-value DeliQueue/RecyclerView source.

### 342. `part5-app/ch22-rendering-practice/17-hardware-bitmap-rendernode.md`

- Type: Hardware Bitmap and RenderNode caching strategy.
- Useful information:
  - `Bitmap.Config.HARDWARE` is appropriate for decoded pixels that only need
    hardware-accelerated screen drawing and no CPU read/write.
  - Hardware Bitmap shifts pixel storage to graphics memory/AHardwareBuffer and
    can avoid ordinary Bitmap first-draw texture upload.
  - It still draws inside the app RenderNode/RenderThread path and does not
    become an independent SurfaceFlinger layer.
  - Total memory does not disappear; graphics memory, dma-buf, FD count, PSS,
    and low-RAM behavior matter.
  - `Bitmap.prepareToDraw()` and Hardware Bitmap solve related but different
    upload-preparation problems.
  - Rollout should measure first-frame P90, upload slices, graphics memory/FD,
    and low-memory crashes by page/device tier.
- SmartPerfetto impact:
  - High value for image/rendering/memory report boundaries.
- Candidate target:
  - Reports should separate Java heap reduction, graphics memory increase,
    texture upload, RenderNode caching, and SurfaceFlinger layer count.
- Risks/caveats:
  - Requires app/image-loader context to recommend enabling or disabling
    Hardware Bitmap.
- Status: read, high-value Hardware Bitmap source.

### 343. `part5-app/ch22-rendering-practice/18-adaptive-refresh-rate-practice.md`

- Type: Adaptive Refresh Rate and frame-rate strategy.
- Useful information:
  - ARR handles display presentation cadence and high-refresh residency; it does
    not reduce app CPU/GPU work per frame.
  - API availability and actual `Display.hasArrSupport()`/HAL/OEM strategy are
    separate facts.
  - `View.setRequestedFrameRate`, `setFrameContentVelocity`, Window ARR/touch
    boost APIs, `Surface.setFrameRate`, and Compose frame-rate modifiers have
    different scopes.
  - Strategies must be content-layer specific: scrolling, low-frequency
    animation, video Surface, static reading, and touch feedback differ.
  - Perfetto validation should inspect FrameTimeline, layer frame-rate votes,
    display refresh-rate counters, SurfaceFlinger, CPU/GPU/power, and input
    latency.
  - A/B success requires high-refresh residency down, slow/frozen frames not up,
    and touch latency not worse.
- SmartPerfetto impact:
  - High value for high-refresh jank/power report caveats.
- Candidate target:
  - Reports should avoid "lower refresh rate fixes jank" and instead treat ARR
    as a power/frame-pacing signal with device/OEM and layer-scope evidence.
- Risks/caveats:
  - API state is Android 15-17 specific and OEM-dependent.
- Status: read, high-value ARR source.

### 344. `part5-app/ch22-rendering-practice/19-runtimecolorfilter-runtimexfermode-performance.md`

- Type: RuntimeColorFilter and RuntimeXfermode performance.
- Useful information:
  - Android 16 adds AGSL hooks at smaller draw-call points:
    `RuntimeColorFilter` for current-color transform and `RuntimeXfermode` for
    source/destination blending.
  - Standard BlendMode/ColorFilter/static resources should be preferred when
    expressive enough.
  - Runtime shader/filter/mode objects should be cached; per-frame work should
    update small uniforms, not recreate AGSL strings, Paints, or Bitmaps.
  - Cost is driven by affected pixel area, overdraw, transparency, target read,
    offscreen layers, GPU bandwidth, and refresh rate.
  - RenderEffect, Hardware Bitmap, RenderNode, and Runtime APIs solve different
    problems and should not be conflated.
  - Testing needs version guards, screenshot regression, FrameTimeline,
    RenderThread/GPU, graphics memory, and device-tier fallback.
- SmartPerfetto impact:
  - Medium/high value for modern GPU/effect recommendations.
- Candidate target:
  - Graphics-effect reports should demand area/GPU/RenderThread/screenshot
    evidence before recommending or blaming AGSL Runtime APIs.
- Risks/caveats:
  - API 36+ only; Compose `drawWithCache` / `graphicsLayer` integration needs
    separate verification.
- Status: read, useful AGSL Runtime API source.

### 345. `part5-app/ch22-rendering-practice/README.md`

- Type: Chapter 22 overview.
- Useful information:
  - Rendering practice chapter frames app-side UI smoothness from layout through
    RecyclerView, Compose, WebView, frame monitoring, and case studies.
- SmartPerfetto impact:
  - Low direct value; useful as chapter synthesis.
- Candidate target:
  - No direct Skill/strategy edit beyond chapter synthesis.
- Risks/caveats:
  - Overview list is shorter than the actual chapter contents.
- Status: read, low-value overview source.

### 346. `part5-app/ch23-memory-practice/01-memory-leak-governance.md`

- Type: Memory leak detection and governance.
- Useful information:
  - Leak classification needs both lifecycle end and strong reachability from a
    GC Root. A recently exited object that has not had a GC opportunity is not
    enough.
  - Common leak patterns are Activity, Fragment View, Handler/Runnable,
    anonymous/lambda capture, listener, coroutine/Flow, and callbackFlow cleanup
    failures.
  - Java Bitmap objects can retain native pixel memory through the Java
    reachability path; Bitmap leaks are often Java ownership bugs with native
    memory consequences.
  - LeakCanary is valuable because it provides retained-object and reference
    chain evidence; online systems should collect trends and candidates, not run
    heavy heap analysis on every user device.
  - Online leak signals include Activity instance count after exit, repeated
    enter/exit heap stair-steps, GC-after-used-heap recovery, and page path.
- SmartPerfetto impact:
  - High value for memory/OOM report evidence boundaries.
- Candidate target:
  - Memory reports should avoid labeling high heap as "leak" unless lifecycle
    end plus retained/reference-chain evidence exists; otherwise describe it as
    pressure, growth, cache, or candidate leak.
- Risks/caveats:
  - Perfetto-only traces rarely contain Hprof reference chains.
- Status: read, high-value leak governance source.

### 347. `part5-app/ch23-memory-practice/02-bitmap-optimization.md`

- Type: Bitmap and image memory optimization.
- Useful information:
  - Bitmap memory should be estimated by width x height x bytes-per-pixel, but
    `allocationByteCount` can exceed `byteCount` when reused.
  - Decode should read bounds first and sample to target display size; fixed MB
    thresholds are weaker than target-size comparisons.
  - Android 8+ puts Bitmap pixels on the native side, but Java reachability still
    controls lifetime.
  - `inBitmap` reduces repeated allocation but needs mutable, non-HARDWARE
    candidates and a capacity-limited pool.
  - Hardware Bitmap is for display-only hardware rendering and is invalid for
    pixel read/write, software Canvas, `inBitmap`, and many editing/share flows.
  - Diagnosis order: size, lifecycle, reuse, config; only then native memory
    tools if growth remains unexplained.
- SmartPerfetto impact:
  - High value for image memory and native/Java attribution.
- Candidate target:
  - Reports should separate oversized decode, Bitmap/page leak, reuse-pool
    retention, Hardware Bitmap graphics memory, and texture upload effects.
- Risks/caveats:
  - Trace evidence may not include source image dimensions or target View size.
- Status: read, high-value Bitmap source.

### 348. `part5-app/ch23-memory-practice/03-native-memory-management.md`

- Type: Native memory management and optimization.
- Useful information:
  - Native memory should be split into malloc/native heap, anonymous mmap, SO/ELF
    mappings, and graphics/hardware buffers.
  - `dumpsys meminfo`, `/proc/<pid>/smaps`, and Native Heap stats answer
    different questions. They identify category before root cause.
  - heapprofd is the default Native Heap allocation profiler when profileable or
    debug conditions allow; malloc_debug is for heavier local reproduction.
  - ASan/HWASan/GWP-ASan/MTE find memory safety bugs and do not replace capacity
    profiling.
  - SO memory optimization needs load timing, private dirty, symbol/build-id,
    and runtime allocation evidence.
  - Online monitoring should distinguish high occupancy from leak by looking at
    scenario exit, `onTrimMemory`, and post-task recovery.
- SmartPerfetto impact:
  - High value for Native Heap and graphics-memory report boundaries.
- Candidate target:
  - Memory strategies should branch on Native Heap vs Graphics/GL/dma-buf vs
    Code/SO vs Stack/mmap before recommending heapprofd, smaps, or image fixes.
- Risks/caveats:
  - heapprofd/profileable availability varies by build and device.
- Status: read, high-value native memory source.

### 349. `part5-app/ch23-memory-practice/04-java-heap-optimization.md`

- Type: Java Heap optimization.
- Useful information:
  - Java Heap pressure should consider max heap, used heap, growth limit, large
    object paths, object count, peak, recovery, and GC frequency.
  - Large primitive arrays and strings can enter Large Object Space; large JSON,
    logs, whole-file reads, DTO/domain/UI copies, and unlimited builders are
    common pressure sources.
  - Caches and object pools need byte-accurate sizing, ownership, `onTrimMemory`
    behavior, and proof that CPU/I/O/user metrics do not regress.
  - Object pooling can be counterproductive when modern ART handles short-lived
    small objects cheaply or when pooled objects retain state/Context.
  - `largeHeap` and ART hook/GC suppression are exceptional or experimental, not
    default remediation.
- SmartPerfetto impact:
  - High value for Java heap and recommendation quality.
- Candidate target:
  - Reports should classify Java pressure into leak, peak, cache budget, large
    object, allocation churn, or toolchain/runtime caveat before recommending
    cache trimming, streaming, pooling, or `largeHeap`.
- Risks/caveats:
  - Trace-only evidence may not include object type and heap dump details.
- Status: read, high-value Java Heap source.

### 350. `part5-app/ch23-memory-practice/05-memory-churn-gc.md`

- Type: Memory churn and GC governance.
- Useful information:
  - Memory churn is about allocation density and timing, not only object size.
  - GC affects frames through pauses and CPU contention from `HeapTaskDaemon`;
    short GCs can matter when clustered inside startup, scroll, animation, or
    input windows.
  - Evidence should align FrameTimeline, main thread/RenderThread, GC events,
    `HeapTaskDaemon`, and allocation stacks.
  - Common hotspots are `onDraw`, `onMeasure`, `onBindViewHolder`, touch
    callbacks, Compose recomposition, animation callbacks, string formatting,
    auto-boxing, and temporary collections.
  - Heap dump alone is weak for churn because temporary objects may already be
    gone; allocation-over-time profiling is needed.
  - The goal is fewer hot-path allocations and lower allocation density, not
    universal zero allocation or GC suppression.
- SmartPerfetto impact:
  - High value for jank + GC correlation and memory-churn recommendations.
- Candidate target:
  - Reports should phrase GC as root cause only when temporal overlap, thread
    state, and allocation evidence support it; otherwise it is a correlated
    symptom or pressure signal.
- Risks/caveats:
  - Requires allocation profiling or trace GC events beyond basic frame data.
- Status: read, high-value churn/GC source.

### 351. `part5-app/ch23-memory-practice/06-large-heap-multiprocess.md`

- Type: largeHeap, multiprocess, and address-space strategy.
- Useful information:
  - `android:largeHeap` affects ART heap growth limit and memory class, not
    Native Heap, Graphics, thread stacks, SO mappings, or system total memory.
  - It can hide leaks, increase GC/system pressure, and should be limited to
    proven short high-memory windows after basic memory hygiene.
  - Multiprocess isolates address space and failure domains but adds ART,
    ClassLoader, thread, Binder, cache, startup, and serialization costs.
  - Per-process budgets should be split by role, memory type, scene, exit
    strategy, and degradation trigger.
  - Thread stack count is a virtual-memory budget item, especially for 32-bit
    processes.
  - 64-bit migration helps address-space exhaustion but can increase pointer/so
    footprint and needs ABI/runtime verification.
- SmartPerfetto impact:
  - High value for OOM and memory strategy recommendations.
- Candidate target:
  - Reports should avoid recommending `largeHeap` or process split without first
    identifying OOM flavor and proving Java heap vs native/graphics/stack/VA
    pressure.
- Risks/caveats:
  - Multiprocess benefits depend on app architecture and IPC boundaries.
- Status: read, high-value large-memory strategy source.

### 352. `part5-app/ch23-memory-practice/07-memory-monitoring.md`

- Type: Memory monitoring and online governance.
- Useful information:
  - PSS, RSS, Java Heap, Native Heap, system watermarks, and `onTrimMemory` are
    different signals and must not be merged into one "memory usage" metric.
  - Android Q+ rate-limits `getProcessMemoryInfo()` freshness; PSS sampling is
    too expensive for high-frequency polling.
  - Alerting should use version baselines, device tiers, process roles, page
    paths, continuous windows, and recovery after trim/cleanup.
  - OOM prevention should be tiered: observe, degrade, snapshot, protect/skip.
  - Heap dump can trigger GC, write large files, and include user data; online
    capture needs rate limits, privacy controls, disk checks, and summaries.
  - ProfilingManager on newer Android versions can provide app-driven heap dump
    or profile capture under system rate limits.
- SmartPerfetto impact:
  - High value for report interpretation of telemetry and recapture guidance.
- Candidate target:
  - Memory reports should recommend the lowest-cost next evidence source:
    metric baseline, summary snapshot, heap dump, heapprofd, or specialized
    tooling based on the observed signal.
- Risks/caveats:
  - Monitoring data defines candidates and trends, not local root cause alone.
- Status: read, high-value monitoring source.

### 353. `part5-app/ch23-memory-practice/08-memory-case-studies.md`

- Type: Memory optimization case framework.
- Useful information:
  - Good memory cases preserve phenomenon, metric, evidence, root cause, fix,
    validation, and prevention.
  - Bitmap cases should first split oversized decode from lifecycle leak.
  - Native cases should verify Java Heap stability, Native/Graphics/PSS trend,
    smaps/meminfo category, heapprofd call stacks, and release ownership.
  - Large-app budget management should split by device tier, process, scene,
    memory type, version, and owner.
  - Release gates should watch P50/P90/P99 by device and scene, not average-only
    memory.
  - Evidence packets should include heap dumps, heapprofd traces, meminfo/smaps,
    image logs, leak chains, and post-fix repeated-run recovery.
- SmartPerfetto impact:
  - High value for memory report structure and remediation validation.
- Candidate target:
  - Memory strategies should produce an evidence chain and validation plan, not
    only list high memory counters.
- Risks/caveats:
  - Case templates require app-specific owners and budgets beyond trace data.
- Status: read, high-value memory case template.

### 354. `part5-app/ch23-memory-practice/09-android17-app-memory-limits.md`

- Type: Android 17 App Memory Limits and leak governance.
- Useful information:
  - Android 17 App Memory Limits are distinct from Java Heap OOM and LMKD global
    pressure kills.
  - Detection path: `ApplicationExitInfo.reason == REASON_OTHER` and
    `description` containing `MemoryLimiter:AnonSwap`; keep full description,
    pss/rss, process, timestamp, and trace input when available.
  - The signal identifies the exit category but not the leaking code.
  - `TRIGGER_TYPE_ANOMALY` can provide trigger-based heap dump/profile evidence
    under rate limits and privacy constraints.
  - Baselines should be split by RAM tier, process, page path, long-residency
    window, PSS/RSS/Java/Native/Graphics/Anon Swap, and exit evidence.
  - Java Heap stable but RSS rising should route to Native, thread stack, mmap,
    Bitmap, WebView renderer, or graphics evidence.
- SmartPerfetto impact:
  - High value for modern exit/OOM analysis and Android 17 report caveats.
- Candidate target:
  - Stability/memory reports should classify MemoryLimiter exits separately and
    ask for ApplicationExitInfo + ProfilingManager evidence rather than calling
    them generic LMK or OOM.
- Risks/caveats:
  - Article is `ready-for-review`; MemoryLimiter implementation path was not
    fully traced in public AOSP.
- Status: read, high-value Android 17 memory-limit source.

### 355. `part5-app/ch23-memory-practice/10-memory-advice-api.md`

- Type: Memory Advice API and game memory-pressure governance.
- Useful information:
  - Memory Advice API beta is deprecated as of 2026 docs; new projects should
    not make it the central memory governance entrypoint.
  - It is an AGDK/Jetpack library signal source, not a new framework service.
  - Memory states are estimates intended to drive game/resource degradation:
    stop preload, shrink caches, reduce texture quality, release scene assets.
  - The library samples multiple process/system metrics and may cost 1-3 ms per
    state generation; watcher callbacks should not directly destroy render
    resources.
  - It complements but does not replace `onTrimMemory`, LMKD,
    ApplicationExitInfo, Android Vitals, meminfo, Perfetto, or heapprofd.
  - A stable architecture should make memory-pressure signal sources
    replaceable while resource budgets and release actions stay testable.
- SmartPerfetto impact:
  - Medium value for game/graphics-heavy memory recommendations and deprecated
    API caveats.
- Candidate target:
  - Reports should mention Memory Advice only as historical/legacy game signal
    context and prefer current system/telemetry/profiler evidence.
- Risks/caveats:
  - Deprecated API; avoid recommending new adoption.
- Status: read, useful legacy game-memory source.

### 356. `part5-app/ch23-memory-practice/11-scudo-native-heap-allocator.md`

- Type: Scudo allocator and Native Heap performance boundary.
- Useful information:
  - Native Heap is not all native memory. Allocator stats, VMA/smaps, and
    Android meminfo categories are separate views.
  - Scudo serves malloc/new paths and memory-safety mitigation; it does not
    explain Graphics buffers, SO mappings, thread stacks, files, or arbitrary
    anonymous mmaps.
  - GWP-ASan and MTE expose sampled/hardware memory-safety bugs; they are not
    capacity profilers.
  - Observation order: online PSS/RSS/native/graphics/stack/code trends,
    meminfo/smaps/showmap classification, heapprofd call stacks, Native
    Allocations, then heavier malloc debug/libmemunreachable/hook tools.
  - 16 KB page size, MTE, and allocator behavior are separate axes; evidence
    must identify page-size/ELF alignment, mapping, allocation stack, and memory
    safety reports separately.
  - Third-party SO governance needs build id, symbols, ABI, version, call path,
    and fallback actions such as rollback, isolation, or feature limiting.
- SmartPerfetto impact:
  - High value for native memory and native crash/memory-safety reports.
- Candidate target:
  - Native-memory reports should not infer allocator root cause from a Native
    Heap curve alone; they should route by evidence source and recommend the
    right profiler or safety signal.
- Risks/caveats:
  - Tool availability and allocator behavior vary by Android version, device,
    build type, and process configuration.
- Status: read, high-value Scudo/native-memory source.

### 357. `part5-app/ch23-memory-practice/README.md`

- Type: Chapter 23 overview.
- Useful information:
  - Memory practice chapter covers leak detection, Bitmap, Native memory, Java
    heap, GC churn, large heap/multiprocess, monitoring, and case studies.
- SmartPerfetto impact:
  - Low direct value; useful as chapter synthesis.
- Candidate target:
  - No direct Skill/strategy edit beyond chapter synthesis.
- Risks/caveats:
  - Overview list is shorter than actual chapter contents.
- Status: read, low-value overview source.

### 358. `part5-app/ch24-io-network/01-file-io-optimization.md`

- Type: File I/O optimization.
- Useful information:
  - Main-thread `read`, `write`, `fsync`, and `QueuedWork.waitToFinish` are
    separate risk surfaces.
  - StrictMode detects current-thread disk/network work, but does not prove
    whether background I/O delayed first frame.
  - SharedPreferences first read can wait XML load; `apply()` returns quickly,
    but lifecycle stop can wait queued writes through `QueuedWork`.
  - DataStore migration should follow access paths, splitting startup-critical
    keys from delayed keys rather than being a pure API rename.
  - MMKV helps hot small key/value paths but dirty pages still flush; it is not
    a large JSON/blob/transaction store.
  - `AtomicFile` provides a write protocol but does not serialize cross-thread
    writers by itself.
  - Useful I/O evidence includes operation duration, file size, thread, path
    category, and whether time is spent in read/write/parse/lock/fsync.
- SmartPerfetto impact:
  - High value for ANR, startup, and jank reports involving disk waits.
- Candidate target:
  - Strategy wording should distinguish main-thread disk, background fsync wait,
    SharedPreferences lifecycle wait, parser CPU, and lock contention.
- Risks/caveats:
  - Library-swap advice is unsafe without access-path and persistence evidence.
- Status: read, high-value file-I/O source.

### 359. `part5-app/ch24-io-network/02-database-optimization.md`

- Type: SQLite and Room optimization.
- Useful information:
  - WAL improves reader/writer concurrency and commit behavior, but a single
    active writer remains.
  - `SQLiteConnectionPool.waitForConnection()` points to long transactions,
    slow migration, write connection ownership, or pool mismatch, not just slow
    SQL.
  - Room risk surfaces include sync DAO/main-thread calls, first open,
    migration, wide Flow invalidation, and oversized transactions.
  - List queries should avoid `SELECT *` and push projection, limit/paging,
    filter, sort, and aggregation into SQL when useful.
  - Index design must follow query shape and be verified with
    `EXPLAIN QUERY PLAN`.
  - Migration can block first open; destructive migration is appropriate only
    for cache-like data.
- SmartPerfetto impact:
  - High value for DB wait, ANR, and startup traces.
- Candidate target:
  - DB reports should split connection wait, SQL execution, CursorWindow,
    migration/open, checkpoint/fsync, Room invalidation/Flow, and Binder
    ContentResolver waits.
- Risks/caveats:
  - WAL, index, and migration advice depends on schema, historical migrations,
    low-RAM mode, and ATTACH/compatibility boundaries.
- Status: read, high-value database source.

### 360. `part5-app/ch24-io-network/03-serialization-performance.md`

- Type: Serialization and IPC payload performance.
- Useful information:
  - JSON cost combines token scanning, string handling, object binding, and
    allocation; it is often visible in startup, network response, and Binder
    paths.
  - Gson is not a preferred new Android path in its own README; Moshi codegen or
    kotlinx.serialization can be better when models are controlled.
  - Protobuf fits controlled schema and high-frequency transport; FlatBuffers
    fits read-mostly large structured data.
  - Parcelable/Parcel are high-performance IPC mechanisms, not durable
    persistence formats.
  - Binder's 1 MB buffer is shared among in-flight transactions; payload size
    issues can be heuristic and concurrency-dependent.
- SmartPerfetto impact:
  - Medium to high value for startup, network decode, and Binder reports.
- Candidate target:
  - Reports should classify parse/decode, network body, Binder transaction, and
    allocation pressure before recommending payload slimming or library changes.
- Risks/caveats:
  - Library choice is secondary to payload size, lazy parsing, adapter reuse,
    and passing stable keys/files instead of large objects.
- Status: read, useful serialization source.

### 361. `part5-app/ch24-io-network/04-network-architecture.md`

- Type: Network architecture and connection governance.
- Useful information:
  - Network design splits into connection, DNS/HTTPDNS, scheduling, and
    fault-tolerance control planes.
  - OkHttp clients should be shared by network policy; too many clients split
    connection pools and dispatcher state.
  - Dispatcher controls concurrency, not business priority; API, image,
    download, and logs often need separate scheduling policies.
  - OkHttp `EventListener` separates DNS, connect, TLS, acquired, headers, and
    failure stages.
  - HTTPDNS should keep the hostname in the HTTPS URL for SNI, certificate, and
    cookie semantics, while handling TTL, failure isolation, and system DNS
    fallback.
- SmartPerfetto impact:
  - High value for network-stage attribution and remediation boundaries.
- Candidate target:
  - Network strategies should treat long DNS/connect/TLS/TTFB/body time as
    separate evidence paths and avoid generic "network slow" conclusions.
- Risks/caveats:
  - The article is marked `needs-rework`; use the HTTPDNS boundary article as
    the stronger source for sync lookup risks.
- Status: read, useful but caveated network architecture source.

### 362. `part5-app/ch24-io-network/05-protocol-optimization.md`

- Type: HTTP/2, HTTP/3, QUIC, and gRPC protocol choice.
- Useful information:
  - HTTP/2 helps many same-host short requests through multiplexing, but TCP
    head-of-line blocking remains under packet loss.
  - Server Push is not recommended as a default optimization; explicit
    prefetch, cache, or aggregate APIs are more controllable.
  - HTTP/3/QUIC can help loss, network switching, and tail latency, but needs
    UDP, server/CDN, fallback, and regional verification.
  - gRPC is strongest for controlled schemas, internal RPC, and streaming, but
    requires channel/stub reuse, deadlines, retry, and keepalive governance.
- SmartPerfetto impact:
  - Medium to high value for protocol-specific network recommendations.
- Candidate target:
  - Network reports should record protocol, connection reuse, DNS/connect/TLS or
    QUIC handshake, TTFB, body, and fallback evidence before protocol advice.
- Risks/caveats:
  - Protocol migration is not a trace-local fix unless capability and rollout
    evidence exist.
- Status: read, useful protocol source.

### 363. `part5-app/ch24-io-network/06-data-caching.md`

- Type: Compression and cache design.
- Useful information:
  - Text responses can benefit from gzip or Brotli; double-compressing already
    compressed media or tiny responses can regress CPU/latency.
  - Compression should be judged with original bytes, transfer bytes,
    decompression CPU, and total latency.
  - Cache layers include memory, disk `cacheDir`, HTTP validators, and business
    cache.
  - Cache keys must include user, tenant, parameters, page, version, and
    experiment dimensions that affect content.
  - Writes must invalidate affected resource caches.
  - Offline sync separates read and write paths through local-first reads,
    outbox, and retry metadata.
- SmartPerfetto impact:
  - Medium to high value for network, cache, and offline recommendations.
- Candidate target:
  - Reports should only recommend compression/cache/preload when hit rate,
    waste, decompression CPU, mobile bytes, and invalidation evidence support
    the advice.
- Risks/caveats:
  - Cache advice can create correctness bugs if account, experiment, or
    invalidation dimensions are missing.
- Status: read, useful cache source.

### 364. `part5-app/ch24-io-network/07-offline-first.md`

- Type: Offline-first architecture.
- Useful information:
  - Repository local data should be the source of truth; network refresh writes
    local state.
  - Read model and write model should be separated.
  - Typical tables include entity, remote key, outbox, and sync state.
  - Outbox records need local op id, object id, operation, payload, idempotency
    key, attempt count, status, and timestamps.
  - WorkManager is the persistent sync orchestrator; Worker should call the
    Repository rather than raw UI/SQL paths.
  - Conflict strategies need serverVersion or ETag, not only `updatedAt`.
- SmartPerfetto impact:
  - Medium value for network/cache recommendation quality.
- Candidate target:
  - Offline-related reports should separate foreground request latency from
    background sync backlog, outbox age, retries, and conflict rate.
- Risks/caveats:
  - Architecture guidance is high-level; only use it when trace/evidence shows
    offline sync is part of the observed issue.
- Status: read, useful offline-source.

### 365. `part5-app/ch24-io-network/08-io-network-case-studies.md`

- Type: I/O and network case-study framework.
- Useful information:
  - Case structure is phenomenon, observation, root cause, fix, and validation.
  - SharedPreferences ANR analysis should inspect `QueuedWork.waitToFinish`,
    file size, write frequency, apply-to-disk P95, StrictMode, and lifecycle.
  - Network slow analysis should split queue, DNS, connect, TLS, TTFB, body,
    parse, EventListener, dispatcher isolation, and HTTPDNS cache-only lookup.
  - Large file paths should separate immediate vs background downloads,
    WorkManager/DownloadManager constraints, streaming uploads, chunking,
    idempotency, and resume.
- SmartPerfetto impact:
  - High value for report structure.
- Candidate target:
  - Use the case template as a strategy guard for evidence-backed root cause and
    validation sections.
- Risks/caveats:
  - The article is marked `needs-rework`; one sample code race should not become
    a deterministic recommendation.
- Status: read, useful but caveated case-study source.

### 366. `part5-app/ch24-io-network/09-wifi-connectivity-selection.md`

- Type: Wi-Fi scoring and default network selection.
- Useful information:
  - System network selection includes Wi-Fi AP selection and Connectivity
    default-network selection.
  - Wi-Fi scoring considers RSSI/frequency, validation, metered state, history
    blocklist, user selection, and OEM overlays; fixed numeric thresholds are
    not portable.
  - App-level diagnostics should use default NetworkCallback snapshots such as
    transport, VPN, INTERNET, VALIDATED, NOT_METERED, DNS, proxy, and MTU.
  - `NET_CAPABILITY_INTERNET` and `VALIDATED` are different; VPN can alter DNS
    and routing.
  - Bugreport, `dumpsys connectivity`, `dumpsys wifi`, and Perfetto evidence are
    needed to prove system selection versus app-stack issues.
- SmartPerfetto impact:
  - High value for network transition attribution.
- Candidate target:
  - Reports should distinguish default-network switches, validation recovery,
    DNS, TCP/TLS, TTFB, and user-visible interruption.
- Risks/caveats:
  - Article is marked `needs-rework`; keep only stable concept boundaries and
    avoid hard scoring thresholds.
- Status: read, useful but caveated Wi-Fi source.

### 367. `part5-app/ch24-io-network/10-httpdns-okhttp-dns-boundary.md`

- Type: HTTPDNS and OkHttp `Dns` boundary.
- Useful information:
  - OkHttp `Dns.lookup()` is synchronous during route planning and can block
    before connect; implementations must be concurrent-safe.
  - Live HTTPDNS HTTP calls inside `lookup()` risk blocking, recursion,
    dispatcher deadlock, and failure amplification.
  - Correct model is async prefetch, memory cache, disk snapshot, TTL, source,
    network key, failure quarantine, and system DNS fallback.
  - HTTPDNS bootstrap client should be independent from the business client and
    custom DNS.
  - Network switching should refresh high-value hosts but not immediately drop
    old cache.
  - Fast fallback works after `lookup()` returns; it cannot erase sync lookup
    latency.
- SmartPerfetto impact:
  - Top-value source for DNS-phase network report correctness.
- Candidate target:
  - Network strategies should warn that long DNS with HTTPDNS requires lookup
    path, bootstrap, fallback, TTL, and cache-source evidence before blame.
- Risks/caveats:
  - HTTPDNS implementation details are app-specific; SmartPerfetto can only
    recommend verification unless code/config evidence is present.
- Status: read, top-value HTTPDNS source.

### 368. `part5-app/ch24-io-network/11-satellite-low-bandwidth-network.md`

- Type: Satellite and constrained low-bandwidth network behavior.
- Useful information:
  - Android 15 adds non-terrestrial network awareness; later Android releases
    add constrained satellite-network concepts.
  - Apps should treat low-bandwidth mode as request budgeting, not just an icon.
  - Priority tiers include emergency/key confirms, config/outbox, lists/images,
    and paused video/full sync/log replay.
  - Useful metrics include satellite or constrained state, bandwidth, metered,
    roaming, default network, bytes, retries, queue length, and degradation hits.
- SmartPerfetto impact:
  - Medium to high value for modern network diagnosis.
- Candidate target:
  - Network reports should keep constrained-network degrade behavior distinct
    from generic weak-network bugs.
- Risks/caveats:
  - API details are platform-version dependent and may not appear in older
    traces.
- Status: read, useful constrained-network source.

### 369. `part5-app/ch24-io-network/12-mediastore-mediaprovider-performance.md`

- Type: MediaStore and MediaProvider performance.
- Useful information:
  - MediaStore is an indexed query API, not a filesystem replacement.
  - Access model should query batch metadata, open file descriptors for selected
    files, and use `loadThumbnail` for thumbnails.
  - MediaProvider indexing and scanning are asynchronous; ContentObserver is an
    invalidation signal, not a complete event log.
  - Scoped storage/FUSE can add cost to high-frequency direct filesystem paths.
  - Compatible media transcoding can add large latency; apps can declare
    `ApplicationMediaCapabilities`.
  - Useful metrics include query fields, rows, query time, thumbnail size/cache,
    cancellation, open-fd first byte, transcoding time/cache, and observer churn.
- SmartPerfetto impact:
  - High value for media I/O and UI traces.
- Candidate target:
  - Media reports should distinguish index query, file open, thumbnail decode,
    transcoding, observer churn, and app-side upload/processing.
- Risks/caveats:
  - Permission model, API level, OEM provider behavior, and media type matter.
- Status: read, high-value media-provider source.

### 370. `part5-app/ch24-io-network/13-photo-picker-transcoding-performance.md`

- Type: Photo Picker, transcoding, and media-cache performance.
- Useful information:
  - Photo Picker solves selection and permission surface, not downstream upload,
    decode, or compression.
  - Returned URI lifetime can require persistable permission for long background
    upload.
  - Embedded picker uses SurfaceView; host first frame and picker first
    thumbnail should be measured separately.
  - HDR-to-SDR and compatible transcoding have time and storage cost; apps can
    declare media capabilities to avoid unnecessary transcode.
  - System transcode cache, MediaProvider thumbnail/index, and app temp/upload
    cache are separate caches.
  - Multi-select needs bounded I/O, CPU, and network queues.
- SmartPerfetto impact:
  - Medium to high value for media upload and picker traces.
- Candidate target:
  - Reports should separate picker open, first thumbnail, selection-to-fd,
    transcode, local prepare, cache bytes, media info, and failures.
- Risks/caveats:
  - Selection limits and URI permission behavior vary by platform and business
    workflow.
- Status: read, useful Photo Picker source.

### 371. `part5-app/ch24-io-network/14-network-request-performance-playbook.md`

- Type: Network request performance playbook.
- Useful information:
  - Request stages are DNS, TCP connect, TLS, request write, TTFB, response
    read, and decode/render.
  - Speed, weak network, security, and power are different goals; foreground
    and background traffic should not share one strategy.
  - OkHttp, Cronet, HttpEngine, and long connection stacks fit different
    scenarios; Cronet features do not solve business retry or scheduling.
  - Weak-network handling should first control request storms before adding
    acceleration.
  - Compression, cache, and preload require hit, waste, mobile-byte, and
    background guardrails.
  - Client, ingress, and business logs need trace id joins; WebView, media,
    downloader, and long connections are separate.
- SmartPerfetto impact:
  - Top-value source for network strategy structure.
- Candidate target:
  - Network strategy should enforce stage-first diagnosis and avoid total-time
    root cause without DNS/connect/TLS/TTFB/body/decode evidence.
- Risks/caveats:
  - Some evidence requires app logging beyond Perfetto-only traces.
- Status: read, top-value network playbook source.

### 372. `part5-app/ch24-io-network/15-network-performance-baseline.md`

- Type: Mobile network performance baseline.
- Useful information:
  - Useful fields include DNS provider/cache, IP family/candidate, fallback
    index, protocol/reuse, TLS session, TTFB, and bytes.
  - `DnsResolver` async and network-specific queries are not the same as
    HTTPDNS.
  - DNS optimization covers entry, cache, sorting, and fallback.
  - HTTP/2 remains TCP-bound; domain coalescing has certificate and authority
    boundaries.
  - HTTP/3/QUIC rollout depends on UDP availability, server support, fallback,
    and region.
  - Weak-network design needs staged timeouts, retry budgets, circuit breakers,
    fallback domain/IP, request priority, and traffic degrade.
- SmartPerfetto impact:
  - High value for request-stage field requirements.
- Candidate target:
  - Use these field names as a network evidence checklist in strategy/report
    methodology.
- Risks/caveats:
  - Transport choice can require app, ingress, and server evidence unavailable in
    trace-only analysis.
- Status: read, high-value network-baseline source.

### 373. `part5-app/ch24-io-network/16-android17-streaming-local-network.md`

- Type: Android 17 streaming cap and local-network permission.
- Useful information:
  - Separate media streaming, local network discovery/control, and ordinary API
    traffic.
  - Data Plan Streaming API exposes maximum downlink/uplink caps or unknown;
    caps should bound ABR candidates rather than overwrite bandwidth estimates.
  - Android 17 target SDK 37 introduces `ACCESS_LOCAL_NETWORK` runtime
    permission; Android 16 can opt in for testing through compat.
  - Prefer mediated system paths before broad LAN permission when possible.
  - Local network permission failures should be distinct from TLS, ECH, and weak
    network failures.
- SmartPerfetto impact:
  - Medium to high value for modern networking reports.
- Candidate target:
  - Reports should separate local-network permission denial, device discovery,
    streaming first buffer, bitrate switching, and rebuffer ratio.
- Risks/caveats:
  - Android 17 details are forward-looking and target-SDK dependent.
- Status: read, useful Android-17 network source.

### 374. `part5-app/ch24-io-network/17-room3-sqlitedriver-kmp-performance.md`

- Type: Room 3, SQLiteDriver, and KMP migration.
- Useful information:
  - Room 3 alpha introduces `androidx.room3`, KSP-only generated code,
    SQLiteDriver backend, and KMP scope.
  - Migration affects runtime DB I/O, build/schema/KSP output, and old
    SupportSQLite extension points.
  - SQLiteDriver uses `SQLiteConnection`, `SQLiteStatement`, reader/writer
    connections, and prepared statements.
  - Validation should include cold DB open/migration, query/transaction
    P50/P90/P99, main-thread I/O, connection wait, and Gradle/KSP timings.
  - Rollback must consider schemas advanced after upgrade.
- SmartPerfetto impact:
  - Medium value when reports discuss Room 3 migration or DB library changes.
- Candidate target:
  - Avoid recommending Room 3 or SQLiteDriver migration as a generic trace-local
    fix; use it only as a versioned migration risk boundary.
- Risks/caveats:
  - Article is marked `needs-rework` and Room 3 state is alpha; do not treat
    package/API details as stable.
- Status: read, caveated Room migration source.

### 375. `part5-app/ch24-io-network/18-android17-ech-domain-encryption.md`

- Type: Android 17 ECH and domain-encryption behavior.
- Useful information:
  - ECH requires Android 17, network-library support, server HTTPS DNS records,
    and ECH config; it is not automatic for all HTTPS.
  - Network Security Config `domainEncryption` is a separate policy surface.
  - Library support differs across HttpEngine/Cronet, WebView,
    OkHttp/platform TLS, and custom TLS.
  - No ECH config, TLS failure, enterprise proxy, HTTP/3 fallback, and LAN
    permission failure are distinct outcomes.
  - Android 17 CT behavior can also affect failures; do not blame ECH before
    certificate, CT, and DNS checks.
- SmartPerfetto impact:
  - Medium value for modern network/security reports.
- Candidate target:
  - Reports should distinguish ECH capability/config, TLS handshake,
    proxy/region, reuse, and fallback before recommending domain-encryption
    changes.
- Risks/caveats:
  - Forward-looking platform details and library support may change.
- Status: read, useful but versioned network-security source.

### 376. `part5-app/ch24-io-network/19-bluetoothsocket-read-disconnect.md`

- Type: BluetoothSocket read disconnect and long-connection governance.
- Useful information:
  - Android 17 target SDK 37 RFCOMM `InputStream.read()` may return `-1` on
    disconnect or close; old code that only catches `IOException` can fail.
  - `connect`, `read`, and `write` can block and should not run on the UI
    thread.
  - State machines should distinguish LocalClose, RemoteEof, TransportError,
    AdapterOff, PermissionLost, HeartbeatTimeout, and UnstableLink.
  - Reconnect budgets should cap connect timeout, retry count, time window, and
    scan budget, with foreground/background separation.
  - Useful metrics include SDK/target/socket, read exit reason, bytes, thread
    liveness, write-block time, retry/backoff, scan-after-disconnect, adapter,
    permission, and battery state.
- SmartPerfetto impact:
  - Medium value if Bluetooth or long-connection traces are in scope.
- Candidate target:
  - Long-connection reports should separate EOF, IOException, write blockage,
    adapter/permission state, and retry storm evidence.
- Risks/caveats:
  - Only applies to specific Bluetooth socket paths and target-SDK boundaries.
- Status: read, useful long-connection source.

### 377. `part5-app/ch24-io-network/README.md`

- Type: Chapter 24 overview.
- Useful information:
  - Chapter covers file I/O, database, serialization, network architecture,
    protocols, caching, offline-first, Wi-Fi selection, HTTPDNS, satellite,
    MediaStore, Photo Picker, network baselines, Android 17 networking, Room 3,
    ECH, and Bluetooth disconnect behavior.
- SmartPerfetto impact:
  - Low direct value; useful as chapter synthesis.
- Candidate target:
  - No direct Skill/strategy edit beyond I/O and network synthesis.
- Risks/caveats:
  - Overview is less actionable than the individual articles.
- Status: read, low-value overview source.

### 378. `part5-app/ch25-power-size/01-power-diagnosis.md`

- Type: Power diagnosis method.
- Useful information:
  - Power diagnosis should split CPU, network, GPS/sensors, and WakeLock rather
    than use a single battery-drain label.
  - Battery Historian, `dumpsys batterystats`, Power Profiler, Perfetto power
    rails, and Macrobenchmark `PowerMetric` serve different windows and
    evidence levels.
  - `batterystats` is useful for UID CPU, WakeLock, network, GPS/sensor, Job,
    Sync, and Alarm comparisons, but percent battery alone is noisy.
  - Useful scenarios include foreground startup/idle, screen-off background,
    long user-visible tasks, and weak-network retry.
- SmartPerfetto impact:
  - High value for power and background-task reports.
- Candidate target:
  - Power reports should require a time-bounded scenario, UID-level evidence,
    and resource-specific attribution before recommending code changes.
- Risks/caveats:
  - Article is marked `needs-rework` due WakeLock threshold wording; use the
    dedicated Vitals article for exact threshold language.
- Status: read, high-value power-diagnosis source.

### 379. `part5-app/ch25-power-size/02-background-power.md`

- Type: Background power governance.
- Useful information:
  - Background work should be modeled as deferrable, mergeable, cancelable, and
    observable.
  - Doze, App Standby, standby buckets, foreground service restrictions, and
    Job quota are separate layers.
  - WorkManager tasks should record task name, trigger source, user visibility,
    constraints, standby bucket, stop reason, network bytes, and CPU time.
  - Foreground service is not a keepalive tool; it needs user-visible semantics,
    type/permission correctness, and stop conditions.
  - Background location should use geofencing, passive location, batching, or
    lower power modes when continuous high-accuracy use is not user-visible.
- SmartPerfetto impact:
  - High value for power, ANR, and background CPU/network reports.
- Candidate target:
  - Background-task findings should ask whether work was user-triggered,
    deferrable, mergeable, cancelable, and properly constrained.
- Risks/caveats:
  - Many fields require app telemetry in addition to Perfetto.
- Status: read, high-value background-power source.

### 380. `part5-app/ch25-power-size/03-wakelock-alarm.md`

- Type: WakeLock and Alarm management.
- Useful information:
  - App-side wake locks should normally be short `PARTIAL_WAKE_LOCK` windows
    with stable tags, timeout, and `try/finally` release.
  - System APIs and libraries can hold wake locks attributed to the app,
    including AlarmManager, JobScheduler, WorkManager, location, FCM, media, and
    downloads.
  - AlarmManager is for timed wakeup, not background execution; WorkManager and
    JobScheduler are preferred for deferrable work.
  - Exact Alarm permission behavior since Android 12/14 requires permission
    checks and downgrade paths.
- SmartPerfetto impact:
  - High value for WakeLock, Alarm, and screen-off background drain reports.
- Candidate target:
  - Reports should distinguish manual WakeLock leak, system-attributed API
    WakeLock, wakeup Alarm frequency, and exact alarm permission failures.
- Risks/caveats:
  - Thresholds and Vitals policy should be sourced from the dedicated Vitals
    article or official docs before codifying.
- Status: read, high-value WakeLock/Alarm source.

### 381. `part5-app/ch25-power-size/04-workmanager-practice.md`

- Type: WorkManager and background scheduling practice.
- Useful information:
  - WorkManager persists reliable background work, usually through
    JobScheduler, and remains subject to Doze, App Standby, quota, and
    constraints.
  - `GreedyScheduler` is an in-process fast path for eligible work; it is not a
    reliable background guarantee.
  - Periodic work is not exact timing; unique work, flex windows, constraints,
    and backoff prevent duplicate wakeups and retry storms.
  - Chains need clear boundaries; default input merging can overwrite same-name
    keys.
  - Expedited work is quota-controlled and must define out-of-quota behavior.
  - Stop reasons are a quality gate, not just debug output.
- SmartPerfetto impact:
  - High value for WorkManager/JobScheduler report recommendations.
- Candidate target:
  - Reports should separate enqueue duplication, constraints, quota, stop
    reason, retry/backoff, chain depth, and long-running worker behavior.
- Risks/caveats:
  - Article is marked `needs-rework` for UIDT boundaries; use later FGS/quota
    articles for those details.
- Status: read, high-value WorkManager source.

### 382. `part5-app/ch25-power-size/05-location-sensor.md`

- Type: Location and sensor power optimization.
- Useful information:
  - Location power is controlled by accuracy, frequency, and latency.
  - FLP requests should encode duration, minimum interval, distance, max update
    delay, and lifecycle release.
  - Geofencing, passive location, and batched location are different low-power
    alternatives.
  - Sensor batching reduces application-processor wakeups when hardware FIFO or
    sensor hub support exists.
  - Useful local evidence includes `dumpsys location`, `dumpsys sensorservice`,
    and `batterystats` in fixed background scenarios.
- SmartPerfetto impact:
  - Medium to high value for power reports involving GNSS/sensors.
- Candidate target:
  - Location/sensor reports should distinguish foreground high-accuracy,
    background batched/passive, geofence, wake-up sensor, batching, and listener
    lifecycle leaks.
- Risks/caveats:
  - Article is marked `needs-rework`; keep advice evidence-scoped.
- Status: read, useful location/sensor source.

### 383. `part5-app/ch25-power-size/06-apk-analysis.md`

- Type: APK size analysis and slimming.
- Useful information:
  - Size analysis must separate raw APK file size, Play download size, installed
    size, and directory attribution.
  - Dex, `res/`, `resources.arsc`, `assets/`, and `lib/<abi>/` have different
    causes and remediation paths.
  - R8/resource shrink, resource keep rules, ABI filtering, stripped native
    symbols, AAB/splits, and on-demand delivery solve different problems.
  - `extractNativeLibs`, page alignment, download size, installed size, and
    startup load cost can trade off against each other.
- SmartPerfetto impact:
  - Low to medium direct value; useful if package/install/native-load reports
    are in scope.
- Candidate target:
  - Do not collapse APK raw size, download size, installed footprint, and native
    library compatibility into one recommendation.
- Risks/caveats:
  - Article is marked `needs-rework` for native distribution boundary details.
- Status: read, useful package-size source.

### 384. `part5-app/ch25-power-size/07-r8-resource-optimization.md`

- Type: R8 and resource optimization.
- Useful information:
  - R8 full mode is more aggressive around class merging, inlining, signatures,
    annotations, and member removal.
  - Keep rules should preserve runtime contracts while allowing shrinking,
    obfuscation, and optimization where safe.
  - Resource shrink depends on code shrink; dynamic resource names require
    explicit keep/discard rules.
  - WebP, AVIF, VectorDrawable, and fonts solve different resource-size
    problems and need visual/runtime regression coverage.
- SmartPerfetto impact:
  - Low to medium direct value.
- Candidate target:
  - If SmartPerfetto discusses size/build issues, it should separate shrink
    graph, dynamic resource safety, image format, and font delivery evidence.
- Risks/caveats:
  - Article is marked `needs-rework`; avoid treating tool-version details as
    universal unless verified.
- Status: read, useful R8/resource source.

### 385. `part5-app/ch25-power-size/08-app-bundle-delivery.md`

- Type: App Bundle and on-demand delivery.
- Useful information:
  - AAB upload size, device download size, and installed footprint are different
    metrics.
  - Device-specific APK sets should be verified with `bundletool` and
    representative device specs.
  - Dynamic Feature Module and Play Asset Delivery reduce initial delivery only
    when module/resource boundaries are correct.
  - Domestic/sideload channels may need universal APK, split-session support,
    or self-managed resource download with signature/hash validation.
- SmartPerfetto impact:
  - Low to medium direct value for packaging/release diagnostics.
- Candidate target:
  - Package-size advice should identify base download, feature download, asset
    pack, and universal fallback surfaces separately.
- Risks/caveats:
  - Distribution policy is channel-dependent.
- Status: read, useful delivery-source.

### 386. `part5-app/ch25-power-size/09-power-size-case-studies.md`

- Type: Power and size case-study templates.
- Useful information:
  - Power cases should convert complaints into version/device/window/app-state
    questions, then collect bugreport, `batterystats`, Perfetto, and task logs.
  - Size cases should build a budget table across dex, resources, assets,
    native libraries, and distribution form.
  - WakeLock cases should distinguish Play Console Vitals, local
    `dumpsys power`, `batterystats --history`, Perfetto, and API-attributed
    wake locks.
  - Reports should explicitly record negative evidence such as no GPS, no
    WakeLock, or no CPU increase.
- SmartPerfetto impact:
  - Medium value as report-structure guidance.
- Candidate target:
  - Case templates can inform report sections: phenomenon, observation, root
    cause, fix, validation, and excluded causes.
- Risks/caveats:
  - Article is marked `needs-rework`; use as structure, not as threshold source.
- Status: read, useful case-template source.

### 387. `part5-app/ch25-power-size/10-hybrid-webview-power.md`

- Type: Hybrid/WebView power and native-vs-web tradeoff.
- Useful information:
  - Hybrid pages combine app process, WebView renderer, JavaScript, network,
    bridge calls, cache, and lifecycle costs.
  - Native/Web/Hybrid energy comparisons require same device, content, script,
    WebView provider version, network, brightness, temperature, and account.
  - WebView power evidence should record URL type, provider version, renderer
    PID, session duration, CPU time, PSS/RSS, network bytes, bridge calls,
    frame time, foreground/background transitions, and renderer exit reason.
  - Page-level budgets are needed; app-level battery totals hide which WebView
    page caused the cost.
- SmartPerfetto impact:
  - Medium to high value for WebView-heavy power, memory, and jank reports.
- Candidate target:
  - Hybrid reports should distinguish web content cost, app container
    lifecycle, renderer memory, bridge CPU, and network/cache behavior.
- Risks/caveats:
  - Article is marked `needs-rework` for network sampling and API boundary
    details.
- Status: read, useful Hybrid/WebView power source.

### 388. `part5-app/ch25-power-size/11-adpf-coroutine-thread-migration.md`

- Type: ADPF Hint Session and coroutine thread migration.
- Useful information:
  - `PerformanceHintManager.Session` binds Linux TIDs, not JVM thread IDs.
  - Default Kotlin coroutine dispatchers can resume on different worker threads,
    making session TID evidence stale.
  - ADPF fits stable long-lived threads and periodic deadlines; fixed executor
    or HandlerThread models are safer than elastic IO dispatchers.
  - `setThreads()` replaces the thread list and should be lifecycle-level, not
    hot-path per-task churn.
  - Benefits require joint validation of P95/P99 latency, Perfetto scheduling,
    CPU frequency, thermal state, and power.
- SmartPerfetto impact:
  - Medium value for modern CPU/power recommendations.
- Candidate target:
  - Reports should not recommend ADPF for generic coroutine work; require stable
    TIDs, periodic deadlines, target duration, and trace validation.
- Risks/caveats:
  - Article is marked `needs-rework`; API boundary notes are version-sensitive.
- Status: read, useful ADPF/coroutine source.

### 389. `part5-app/ch25-power-size/12-android17-excessive-cpu-kill.md`

- Type: Android 17 excessive CPU trigger and background CPU governance.
- Useful information:
  - `TRIGGER_TYPE_KILL_EXCESSIVE_CPU_USAGE` is a post-event profiling evidence
    mechanism, not a preventive scheduler.
  - JobScheduler quota and excessive CPU trigger are independent control paths:
    quota governs execution budget, trigger records an abnormal CPU event.
  - Evidence packages should join `ProfilingResult`, `ApplicationExitInfo`,
    work/job IDs, retry counts, standby bucket, battery/network/thermal state,
    and task owner.
  - High-background-CPU roots include retry storms, chain pileup, log
    compression, DB migration/vacuum, media transcode, polling, and thread-pool
    misuse.
- SmartPerfetto impact:
  - Medium to high value for future background CPU and process-exit reports.
- Candidate target:
  - Reports should call profiling triggers evidence and still recommend task
    constraints, merging, backoff, partitioning, and circuit breakers.
- Risks/caveats:
  - Trigger thresholds, kill signal, and OEM behavior remain explicitly
    unverified; do not hardcode.
- Status: read, useful Android-17 CPU evidence source.

### 390. `part5-app/ch25-power-size/13-fgs-timeout-jobscheduler-quota.md`

- Type: Foreground service timeout and JobScheduler quota governance.
- Useful information:
  - Android 15 `dataSync` and `mediaProcessing` foreground services have
    background 24-hour cumulative time windows; `shortService` is for very
    short work.
  - `onTimeout()` is an exit-and-persist-progress callback, not extra execution
    budget.
  - Android 16 counts Jobs running concurrently with foreground services against
    runtime quota.
  - User-initiated data transfer, WorkManager, JobScheduler, AlarmManager, and
    foreground service serve different task contracts.
  - Metrics should include FGS type/start source/runtime/timeout, Job stop
    reason, WorkManager stop reason, standby bucket, constraints, transfer
    progress, and user recovery.
- SmartPerfetto impact:
  - High value for background execution and power reports.
- Candidate target:
  - Strategy should flag old patterns that use FGS to bypass quota or expect a
    long task to run to completion without resumable progress.
- Risks/caveats:
  - OEM background policies add another layer and need device evidence.
- Status: read, high-value FGS/quota source.

### 391. `part5-app/ch25-power-size/14-jobdebuginfo-jobscheduler-diagnostics.md`

- Type: JobScheduler pending reasons and JobDebugInfo diagnostics.
- Useful information:
  - Pending reason explains why a submitted Job has not started; stop reason
    explains why running work stopped.
  - API 34 returns one pending reason; API 36 adds current reason arrays and
    history; API 37 adds reason-to-duration stats.
  - Reasons map to explicit constraints, implicit device state, application
    state, user action, quota, standby, and scheduler optimization.
  - WorkManager logs, WorkManager diagnostics, `dumpsys jobscheduler`, IDE
    inspector, and JobScheduler APIs have different scopes.
  - Online telemetry should avoid raw Job IDs, payloads, URLs, SSIDs, and full
    dumpsys output.
- SmartPerfetto impact:
  - High value for JobScheduler and WorkManager trace/report semantics.
- Candidate target:
  - Reports should keep pending reason, stop reason, quota, constraints, retry,
    and business failure distinct.
- Risks/caveats:
  - API availability and flagged status are version-sensitive.
- Status: read, high-value JobScheduler diagnostics source.

### 392. `part5-app/ch25-power-size/15-scheduledexecutor-fixedrate-android16.md`

- Type: Android 16 fixed-rate task catch-up behavior.
- Useful information:
  - Android 16 changes `scheduleAtFixedRate()` behavior for `targetSdk >= 36` so
    missed periodic executions after lifecycle/suspend/freezer are caught up at
    most once.
  - Old behavior can create resume-window CPU spikes when many missed periods
    run back-to-back.
  - Periodic tasks should be classified as monitoring, heartbeat, cache refresh,
    real-time work, or SDK internal polling before choosing fixed rate.
  - Recovery windows need lifecycle gates, skipped historical periods, staggered
    low-priority work, thread naming, and telemetry.
- SmartPerfetto impact:
  - Medium value for power/startup-resume CPU spike reports.
- Candidate target:
  - If traces show CPU bursts after resume, reports should consider fixed-rate
    catch-up, SDK polling, recovery window contention, and targetSdk behavior.
- Risks/caveats:
  - The platform behavior only helps newer target SDKs; old devices/SDKs and
    app-level catch-up logic still need governance.
- Status: read, useful fixed-rate scheduling source.

### 393. `part5-app/ch25-power-size/16-adpf-power-efficiency-powermonitor.md`

- Type: ADPF power efficiency and PowerMonitor validation.
- Useful information:
  - Power Efficiency Mode expresses scheduling preference, not guaranteed power
    savings.
  - It fits long-running stable periodic work with deadline slack, not input,
    render-submit, or low-latency audio paths.
  - `PowerMonitorReadings` returns cumulative energy per monitor; scenario
    energy is a before/after delta.
  - Perfetto power rails, CPU frequency, sched state, thermal state, and trace
    markers are needed to validate a window.
  - Experiments should compare P50/P90/P99 latency, unit energy, thermal state,
    device model, SoC, refresh rate, charging, and temperature.
- SmartPerfetto impact:
  - Medium value for ADPF/power recommendations.
- Candidate target:
  - Reports should phrase ADPF power efficiency as an experiment requiring
    stable threads, periodic workload, and power-rail validation.
- Risks/caveats:
  - PowerMonitor and rail names are OEM/device-specific; cross-device absolute
    comparison is unsafe.
- Status: read, useful ADPF power-validation source.

### 394. `part5-app/ch25-power-size/17-background-audio-hardening-power.md`

- Type: Android 17 background audio hardening and playback power.
- Useful information:
  - Android 17 limits background audio playback, focus requests, and volume
    control unless lifecycle and foreground-service requirements are met.
  - `mediaPlayback` FGS, while-in-use capability, exact-alarm/alarm-usage
    exemptions, and user-visible playback intent must be distinguished.
  - Failures can be silent; evidence includes audio focus result, MediaSession,
    player state, `AudioTrack`, `AudioHardening` logs, `dumpsys audio`,
    FGS state, and power/network/WakeLock data.
  - Long playback power budget includes audio offload, buffer strategy,
    network retry, WakeLock, Bluetooth route, decoder threads, and background
    tasks.
- SmartPerfetto impact:
  - Medium value for media/audio power and Android 17 compatibility reports.
- Candidate target:
  - Audio reports should distinguish user intent, FGS/WIU legality, focus
    failure, route/network failure, and resource leakage after playback stops.
- Risks/caveats:
  - Applies to audio-heavy apps and Android-version-specific behavior.
- Status: read, useful background-audio source.

### 395. `part5-app/ch25-power-size/18-audio-offload-audiotrack-power.md`

- Type: Audio offload and AudioTrack power control.
- Useful information:
  - Audio offload targets long compressed playback power, not low-latency
    interaction.
  - AAudio offload request must be checked with actual performance mode after
    stream open.
  - Android 17 AudioTrack APIs add codec provenance and offload flush-position
    controls; these aid seek/ads/resume but do not prove DSP/offload by
    themselves.
  - Validation should compare CPU time, audio-thread wakeups, CPU frequency/idle
    state, `dumpsys audio`, Perfetto, `batterystats`, playback continuity, and
    route/device dimensions.
- SmartPerfetto impact:
  - Medium value for media playback power reports.
- Candidate target:
  - Do not recommend offload without actual-mode, format, route, feature, and
    A/B power/experience evidence.
- Risks/caveats:
  - Device, format, route, effects, gapless, speed, and HAL support vary.
- Status: read, useful audio-offload source.

### 396. `part5-app/ch25-power-size/19-android-vitals-wakelock-governance.md`

- Type: Android Vitals excessive WakeLock metric and governance.
- Useful information:
  - Excessive partial wake lock is scoped to non-exempt partial wake locks while
    screen-off and app background/FGS, accumulating 2 hours or more in 24 hours;
    Play quality thresholds consider more than 5 percent affected sessions over
    28 days.
  - Stuck partial wake lock is about a single long hold; excessive can be many
    short holds.
  - Exemptions such as audio, location, and user-initiated JobScheduler do not
    remove app responsibility for release, lifecycle, and user value.
  - Play Console gives tag-level evidence; app telemetry must add stack hashes,
    task type, SDK source, state, charge/screen/network, and owner.
  - Internal gates should be stricter than Play thresholds because Play has
    reporting delay and distribution impact.
- SmartPerfetto impact:
  - High value for WakeLock and power-report threshold wording.
- Candidate target:
  - WakeLock reports should separate Vitals excessive, stuck, manual locks,
    system-attributed locks, exemptions, and internal telemetry gaps.
- Risks/caveats:
  - Play policy and thresholds can change; verify official docs before
    hardcoding in product text.
- Status: read, high-value WakeLock governance source.

### 397. `part5-app/ch25-power-size/20-android17-allow-while-idle-listener-alarm.md`

- Type: Android 17 listener allow-while-idle alarm and short-lifecycle wakeups.
- Useful information:
  - API 37 adds `setExactAndAllowWhileIdle()` with `Executor` and
    `OnAlarmListener`, combining idle wakeup with in-process callback.
  - This fits short process-alive tasks such as socket heartbeat retry or
    temporary sync windows; it is not reliable after process death.
  - It can reduce waiting-phase continuous WakeLock usage, but execution-phase
    network/disk/Binder work still needs short windows, timeout, and handoff.
  - Listener exact alarms have different permission and lifecycle boundaries
    than PendingIntent exact alarms.
  - Tags should be stable, low-cardinality, and aligned with WakeLock/Alarm
    telemetry.
- SmartPerfetto impact:
  - Medium to high value for Alarm/WakeLock power reports on Android 17.
- Candidate target:
  - Reports should treat listener alarm as a narrow replacement for continuous
    waiting WakeLocks, and warn about wakeup storms if used for broad polling.
- Risks/caveats:
  - API 37 and process-lifecycle dependent; OEM process cleanup can still cancel
    delivery.
- Status: read, useful listener-alarm source.

### 398. `part5-app/ch25-power-size/README.md`

- Type: Chapter 25 overview.
- Useful information:
  - Chapter covers power diagnosis, background power, WakeLock/Alarm,
    WorkManager, location/sensor, package size, R8/resources, AAB delivery, and
    case studies.
- SmartPerfetto impact:
  - Low direct value; useful as chapter synthesis.
- Candidate target:
  - No direct Skill/strategy edit beyond power/size synthesis.
- Risks/caveats:
  - Overview is shorter than the actual expanded chapter.
- Status: read, low-value overview source.

### 399. `part5-app/ch26-observability/01-observability-architecture.md`

- Type: Observability architecture.
- Useful information:
  - Metrics, logs, and traces answer different questions: trend/threshold,
    single-site evidence, and timeline causality.
  - Android Vitals provides an external quality baseline, but lacks business
    scene, user path, and internal log/context linkage.
  - App observability architecture should separate collection, bounded local
    buffering, shard storage, batch upload, server processing, remote
    config/sampling, SDK self-monitoring, alerting, and sample backtracking.
  - Stable join keys include `session_id`, `trace_id`, `scene_id`,
    `build_version`, `device_model`, `android_version`, and `network_type`.
  - Sampling should distinguish baseline all-sample signals, user-level
    sampling, abnormal补采, and large-file quota control.
  - Remote diagnostics should be signed, expiring, quota-bound, and read-only.
- SmartPerfetto impact:
  - High value for final report evidence contracts and provenance wording.
- Candidate target:
  - Reports should explicitly distinguish metric trend, log evidence, and trace
    timeline evidence, and say when a needed evidence class is missing.
- Risks/caveats:
  - Architecture guidance is broad and must be mapped to trace-analysis surfaces
    rather than copied as product requirements.
- Status: read, high-value observability architecture source.

### 400. `part5-app/ch26-observability/02-crash-reporting.md`

- Type: Crash reporting, ready-for-review.
- Useful information:
  - Crash SDK path: capture, minimal envelope, atomic local write, preserve
    default exit, next-start/upload-process enrichment, compression,
    desensitization, rate limiting, server processing, symbolication/retrace,
    aggregation, and alerting.
  - Java crash handlers should not swallow the original handler; native signal
    handlers must be signal-safe and avoid malloc, locks, SQLite, or network in
    the crash path.
  - Crash envelopes need crash/process/thread/type/signal/build/breadcrumb/device
    context and raw stack/top-frame evidence.
  - Persistence should use temp file, fsync, atomic rename, per-process dirs,
    and quotas.
  - Symbolication needs R8 mapping and native ABI, SO build ID, PC offset,
    unstripped symbols, and compiler/source provenance.
  - ApplicationExitInfo can compensate native/ANR evidence after restart on
    newer Android versions.
- SmartPerfetto impact:
  - Medium to high value for crash/native-crash strategy wording and evidence
    source separation.
- Candidate target:
  - Stability reports should separate raw crash evidence, symbolication gaps,
    ApplicationExitInfo compensation, and native tombstone/minidump sources.
- Risks/caveats:
  - The source is marked needs-rework for native signal-safe persistence and
    ApplicationExitInfo compensation-chain completeness.
- Status: read, useful but caveated crash-reporting source.

### 401. `part5-app/ch26-observability/03-performance-collection.md`

- Type: Performance metrics collection.
- Useful information:
  - Metrics split into low-frequency state samples and event-triggered samples.
  - Startup should distinguish TTID, TTFD, startup type, Activity, entry,
    version, and device; TTID aligns Android Vitals, while TTFD aligns business
    readiness.
  - Rendering collection should aggregate windows such as total frames, jank,
    frozen, P90, and P99 rather than upload every frame by default.
  - `Debug.MemoryInfo`/PSS and Runtime Java heap are different concepts and must
    not be added together as one memory number.
  - Custom traces should use stable product-scene, technical-stage, and result
    names; high-cardinality values belong in attributes/logs, not section
    names.
  - Percentiles need metric, scene, version, startup type, device tier, Android
    split, and sample count.
  - SDK self-monitoring should track enqueue cost, drop count, local bytes,
    upload success, and config version.
- SmartPerfetto impact:
  - High value for metric interpretation and trace-vs-telemetry report wording.
- Candidate target:
  - Strategies should avoid mixing TTID/TTFD, PSS/heap, metric trend, and trace
    evidence, and should report sample/context scope when using percentiles.
- Risks/caveats:
  - Online telemetry guidance should be adapted carefully for offline Perfetto
    trace analysis.
- Status: read, high-value performance-collection source.

### 402. `part5-app/ch26-observability/04-anr-monitoring.md`

- Type: ANR monitoring.
- Useful information:
  - System-confirmed ANR, Play Vitals ANR, client watchdog pre-warning, and
    onsite snapshots are distinct evidence sources.
  - The system ANR path runs through trigger, AMS, AnrHelper,
    StackTracesDumpHelper/DropBox, and ApplicationExitInfo.
  - Apps cannot reliably read `/data/anr`; API 30+ ApplicationExitInfo can
   补系统 ANR traces on next start when available.
  - Main-thread watchdogs are not ANR determination; they provide pre-ANR
    context.
  - Useful snapshots include session/event IDs, foreground state, last user
    action, main stack, peer thread stacks, Looper message, frame state,
    resource state, build bucket, and system exit info.
  - Analysis order should cover source, type, main-thread state
    RUNNABLE/WAITING/BLOCKED, waiting peer, and release dimension.
- SmartPerfetto impact:
  - Top-priority value for ANR strategy and report confidence wording.
- Candidate target:
  - ANR reports should explicitly separate system-confirmed ANR from suspected
    long stalls and preserve peer-thread/wait-chain evidence.
- Risks/caveats:
  - Some Play/Vitals thresholds and platform availability details are
    time-sensitive.
- Status: read, high-value ANR observability source.

### 403. `part5-app/ch26-observability/05-online-troubleshooting.md`

- Type: Online troubleshooting methodology, ready-for-review.
- Useful information:
  - Troubleshooting flow: gather evidence, reproduce, enable dynamic logs or
    diagnostics, isolate with gray rollout, mitigate, and verify.
  - Remote logs need private local files, tag-level dynamic levels, privacy
    redaction, targeted pull/upload, expiry, size limit, and network limit.
  - Feedback should include user/anonymous ID, app/channel/device/android/time,
    network, page, steps, screenshot, session ID, and request ID.
  - Problems split into strong repro, weak repro, data-dependent, and
    timing-dependent.
  - Trace levels include always-on lightweight markers, triggered app evidence,
    and manual/system Perfetto or bugreport.
  - Evidence packages should include phenomenon, scope, timeline, evidence,
    change, mitigation, and conclusion.
- SmartPerfetto impact:
  - High value for report packaging and missing-evidence handling.
- Candidate target:
  - Final reports should make missing repro/context/evidence explicit rather
    than infer certainty from partial traces.
- Risks/caveats:
  - Source is marked needs-rework; use as methodology rather than final
    platform reference.
- Status: read, useful troubleshooting source.

### 404. `part5-app/ch26-observability/06-ab-testing-regression.md`

- Type: A/B testing and performance regression protection, ready-for-review.
- Useful information:
  - Performance A/B needs stable experiment unit, one primary metric, guardrails
    such as crash/ANR/memory/power/upload/business metrics, segments, and
    stopping rules.
  - Activation event must happen after config activation and before behavior.
  - Sample design needs baseline, MDE, alpha, power, historical distribution,
    variance, allocation ratio, and minimum segment sample.
  - A/A or A/A/B sanity tests expose assignment and instrumentation bias.
  - CI, lab baseline, and online distribution answer different regression
    questions.
  - Do not attribute impact by multiplying sample count and P90 delta.
- SmartPerfetto impact:
  - Medium value for validation advice and performance-delta caveats.
- Candidate target:
  - Strategy text that mentions A/B or rollout should require sample health,
    guardrails, and avoid linear P90 contribution claims.
- Risks/caveats:
  - Source is marked needs-rework; percentile statistics should prefer the
    finalized statistics article.
- Status: read, useful regression-methodology source.

### 405. `part5-app/ch26-observability/07-release-quality-gate.md`

- Type: Release quality gate, ready-for-review.
- Useful information:
  - Gate checklist spans startup TTID/TTFD P90, rendering slow/frozen frames or
    FrameTimingMetric, memory PSS/heap/OOM/LMKD, stability, upload quality, and
    package/config.
  - RC gates use lab benchmark; gray rollout uses real users; Android Vitals are
    slow 28-day signals and not minute-level gates.
  - Macrobenchmark artifacts, JSON, and Perfetto traces should be archived by
    commit, build, device, and test.
  - Gates should bind scenario, device group, baseline, and action.
  - Rollout snapshots should include rollout ID, fraction, build ID,
    experiment/config snapshot, metric window, and segment.
  - Rollback choices include halt/pause rollout, config rollback, and fix
    release.
- SmartPerfetto impact:
  - Medium value for release/report validation and artifact provenance.
- Candidate target:
  - Report recommendations should distinguish lab RC evidence, online rollout
    evidence, and slow Vitals evidence.
- Risks/caveats:
  - Source is marked needs-rework around Macrobenchmark/slow Vitals/halt
    boundary; verify policy details before productizing thresholds.
- Status: read, useful release-gate source.

### 406. `part5-app/ch26-observability/08-observability-case-studies.md`

- Type: Observability case studies, ready-for-review.
- Useful information:
  - A practical APM route starts with event model, low-frequency high-value
    signals, non-blocking upload, first dashboard, and drill-down paths.
  - Universal fields include event/session/trace/request IDs, scene/build/config
    versions, device/android/ABI, and sampling policy.
  - Download-stuck evidence spans DNS/connect/TLS/TTFB/body/retry, HTTP
    range/status/content-length/ETag, local bytes/temp/space/rename, hash, UI
    progress, and IDs.
  - Startup cases need stages, local data size, thread/scheduler, I/O, and user
    buckets.
  - Payment-page stalls need main thread, locks, I/O, GC/memory, rendering, and
    system-load evidence.
  - Background battery complaints need WakeLock, Alarm, network, location/sensor,
    and Work/Job evidence.
  - Runbooks should state trigger, impact, evidence, version capability,
    mitigation, verification, and prevention.
- SmartPerfetto impact:
  - High value as cross-domain report template and evidence taxonomy.
- Candidate target:
  - Strategy/report templates should borrow the runbook structure for root cause
    and mitigation sections.
- Risks/caveats:
  - Source is marked needs-rework for some versioned-diagnostic boundaries.
- Status: read, high-value case-study source.

### 407. `part5-app/ch26-observability/09-application-exit-info.md`

- Type: ApplicationExitInfo process exit attribution, ready-for-review.
- Useful information:
  - ApplicationExitInfo is after-the-fact system exit attribution, not a
    replacement for crash, ANR, heap, or online logging.
  - Useful fields include process name, pid, package, reason, subReason, status,
    importance, timestamp, PSS/RSS, and optional traceInputStream.
  - Reasons include crash, native crash, ANR, low memory, signal, user request,
    package state, and freezer.
  - Importance distinguishes foreground and background impact; traceInputStream
    may be null and should be read asynchronously.
  - ANR/native stitching should dedupe watchdog/SDK/minidump, ApplicationExitInfo
    reason/trace/tombstone, Play/Crashlytics, and APM sources.
  - Below Android 11, use self markers/watchdog/minidump/resource snapshots with
    reason_guess, confidence, and evidence.
- SmartPerfetto impact:
  - High value for stability, OOM, restart, and process-exit reports.
- Candidate target:
  - Reports should not treat an app restart or exit as a crash without reason,
    importance, timestamp, and evidence provenance.
- Risks/caveats:
  - Source is marked needs-rework; API boundary details require verification if
    turned into hard rules.
- Status: read, high-value process-exit source.

### 408. `part5-app/ch26-observability/10-legacy-process-exit-attribution.md`

- Type: Android 11-below process exit attribution.
- Useful information:
  - API 21-29 lacks ApplicationExitInfo; model exits as `reason_guess`,
    `confidence`, and `evidence[]`.
  - Confirmed crash can come from Java crash files or native minidumps; suspected
    ANR can come from watchdog, Play, bugreport/log evidence; suspected low
    memory can come from markers, memory snapshots, and KOOM-like evidence.
  - KOOM/fork dumps provide Java heap evidence before death, not LMK reason
    after death.
  - Normalize to an ApplicationExitInfo-like schema, but keep `system_reason`
    and `legacy_reason` separate.
  - Heavy raw files should require strong triggers and privacy/sampling controls.
- SmartPerfetto impact:
  - Medium to high value for legacy logs or imported diagnostic-package analysis.
- Candidate target:
  - Stability strategies should keep legacy reason guesses separate from
    system-confirmed reasons.
- Risks/caveats:
  - Less directly applicable to Perfetto-only traces.
- Status: read, useful legacy-attribution source.

### 409. `part5-app/ch26-observability/11-ebpf-online-tracing-binder-semantics.md`

- Type: eBPF online tracing and Binder semantics, ready-for-review.
- Useful information:
  - Online tracing cannot rely only on ftrace because of ring-buffer overwrite,
    long-run costs, and event loss.
  - Collection windows need loss metrics, permission model, and data-boundary
    definition.
  - Android eBPF can reconstruct lower-level Binder semantics from
    `ioctl(BINDER_WRITE_READ)`, `BC_TRANSACTION`, transaction code, parcel
    buffer, and interface descriptor/signature tables.
  - This is high-privilege evidence for userdebug/root/OEM/enterprise/security
    lab contexts, not normal app SDK telemetry.
  - For ANR, Binder semantic logs can identify outgoing interface/transaction
    waits, but request/reply latency still needs matching evidence.
  - Binder params can be sensitive; interface-level desensitization is safer.
- SmartPerfetto impact:
  - High value for Binder-wait nuance in ANR reports.
- Candidate target:
  - Reports should state that Perfetto Binder wait evidence usually lacks
    high-level method/parameter semantics unless augmented by privileged
    tracing.
- Risks/caveats:
  - Implementation is likely strategy wording only; not a normal-app feature.
- Status: read, useful Binder semantics source.

### 410. `part5-app/ch26-observability/12-versioned-diagnostics.md`

- Type: Versioned online diagnostic capabilities, ready-for-review.
- Useful information:
  - Three modern paths: exit tracing with ApplicationExitInfo API 30+,
    app-driven profiling with ProfilingManager API 35+, and system-triggered
    profiling with ProfilingTrigger API 36/37+.
  - Android 10-14 still relies on logs, Crash SDK, Perfetto, and bugreport, with
    API 30+ ApplicationExitInfo and API 31+ native tombstone proto possibilities.
  - Do not rely on ApplicationExitInfo `description` as a stable format.
  - ProfilingManager result handling should use result file path, error code,
    error message, and rate-limit behavior.
  - ProfilingTrigger coverage includes ANR, fully drawn, app-request running
    trace, force-stop/recents/task-manager kills, cold start, OOM, excessive CPU,
    and anomaly/app-compat in different API/extension bands.
  - Evidence tables should include case/session/app/device/API/extension,
    pid/process/timestamp, reason/status/subReason, profiling type, trigger,
    result file hash/size, and user action.
- SmartPerfetto impact:
  - High value for Android-version-aware diagnostic recommendations.
- Candidate target:
  - Strategy/report text should recommend evidence sources by API/extension and
    avoid claiming availability when the platform cannot provide it.
- Risks/caveats:
  - Source is marked needs-rework; official API details are time-sensitive and
    need verification before hardcoding.
- Status: read, high-value versioned-diagnostics source.

### 411. `part5-app/ch26-observability/13-application-start-info.md`

- Type: ApplicationStartInfo startup attribution, ready-for-review.
- Useful information:
  - Android 15 API 35 ApplicationStartInfo reports start type, reason, and
    timestamps; completion listener is at first frame, not `reportFullyDrawn`.
  - Cold-start SLA should count only `START_TYPE_COLD`.
  - Reasons include launcher, recents, start_activity/deeplink/notification,
    broadcast, service, job, alarm, push, content provider, and other.
  - Startup timestamps can include launch, fork, bind, app `onCreate`, first
    frame, fully drawn, and SurfaceFlinger composition; keys may be missing.
  - System timestamps should be combined with business-ready, first-interactive,
    and reportFullyDrawn metrics while keeping raw and adjusted metrics separate.
  - Combining previous ApplicationExitInfo with current ApplicationStartInfo can
    explain crash loops, update first launch, and low-memory recovery.
- SmartPerfetto impact:
  - High value for startup strategy methodology and modern platform caveats.
- Candidate target:
  - Startup strategy should ask for start type/reason/previous exit when
    available and avoid mixing background launches into cold-start SLAs.
- Risks/caveats:
  - API 35/37 boundaries and timestamp details are version-sensitive.
- Status: read, high-value startup attribution source.

### 412. `part5-app/ch26-observability/14-performance-experiment-statistics.md`

- Type: Performance experiment statistics and percentile regression,
  ready-for-review.
- Useful information:
  - Gray rollout asks whether rollout can continue; performance experiments ask
    whether a variant caused reproducible difference; CI asks whether a
    candidate deterministic regression exists.
  - A/B requires stable unit, activation after config active, and A/A sanity.
  - Quantile sample sizing needs historical distribution and density near the
    target quantile, not just baseline/MDE/alpha/power.
  - P90/P99 reports should use point estimate plus bootstrap or order-stat CI
    and tail violation rate.
  - Bootstrap should sample by experiment unit, not event.
  - P90 cannot be linearly contributed; use tail source, threshold violation,
    and counterfactual distribution.
  - SRM, assignment, activation, sampling, and report completeness failures make
    conclusions invalid, not merely "no regression".
- SmartPerfetto impact:
  - Medium to high value for validation methodology and report uncertainty.
- Candidate target:
  - Performance-regression advice should separate rollout, experiment, and CI
    evidence and include sample-health caveats.
- Risks/caveats:
  - Less central to offline trace root-cause analysis unless SmartPerfetto emits
    experiment/rollout recommendations.
- Status: read, useful statistics source.

### 413. `part5-app/ch26-observability/15-android-vitals-play-console-quality.md`

- Type: Android Vitals and Play Console quality attribution, ready-for-review.
- Useful information:
  - Android Vitals is an external quality signal, not a replacement for app APM
    or trace evidence.
  - Layers include core vitals, regular vitals, game slow sessions, Wear OS
    signals, and self APM.
  - Vitals use slow reporting windows such as 28 days; they are not immediate
    trace-level evidence.
  - Local article thresholds include user-perceived crash, ANR, excessive
    partial wake lock, startup, frozen frame, slow session, and Wear OS CPU or
    WakeLock categories.
  - Vitals and internal APM differ in coverage, denominator, evidence delay, and
    joinability to traces/logs.
  - Decision handling should map near/over threshold states to halt, pause,
    rollback, feature flag, or device-specific mitigation.
- SmartPerfetto impact:
  - Medium to high value for threshold caveats, release gates, and external
    signal wording.
- Candidate target:
  - Reports should state when a Vitals number is external/slow/aggregate and
    avoid treating it as direct Perfetto-trace proof.
- Risks/caveats:
  - Vitals thresholds and policy can change; verify official docs before
    codifying exact numbers.
- Status: read, useful Vitals quality source.

### 414. `part5-app/ch26-observability/16-online-storage-io-sqlite-observability.md`

- Type: Online storage, I/O, and SQLite observability, ready-for-review.
- Useful information:
  - Storage observability should separate file I/O slow calls, bad I/O patterns,
    SQLite/Room slow query, SQLite errors, storage growth, file corruption, and
    resource leaks.
  - Online events should avoid raw paths, SQL params, file contents, and user
    data; use path classes, hashes, SQL fingerprints, and app-frame stack
    fingerprints.
  - I/O collection paths have different boundaries: Java wrappers, Java/libcore
    hooks, native hooks, compile-time instrumentation, and Perfetto/ftrace.
  - Bad-I/O rules need device tier, scene, and sampling budgets rather than one
    global threshold.
  - SQLite analysis should split slow query, transaction hold time, busy/locked,
    corrupt, and disk-full evidence; `EXPLAIN QUERY PLAN` distinguishes scan vs
    indexed search.
  - Directory snapshots need top-K, file counts, age buckets, corruption checks,
    cleanup results, and privacy-aware pruning.
  - Monitoring SDK self-metrics should track collection cost, queue length,
    local bytes, drop count, package size, and upload failure reason.
- SmartPerfetto impact:
  - High value for storage/I/O/SQLite sections and final-report evidence
    taxonomy.
- Candidate target:
  - I/O and SQLite reports should distinguish syscall/wait evidence from SQL
    plan/index evidence and avoid recommending mmap, Room, index, or cleanup
    without the matching evidence class.
- Risks/caveats:
  - Some Matrix/Room/AndroidX details are version and library dependent.
- Status: read, high-value storage observability source.

### 415. `part5-app/ch26-observability/17-online-network-quality-observability.md`

- Type: Online network quality monitoring and access-layer coordination,
  ready-for-review.
- Useful information:
  - Network quality should separate client samples, access-layer logs, and
    system network state.
  - Request timing should preserve queue, DNS, TCP, TLS, TTFB, body, total,
    retry, follow-up, and connection reuse semantics.
  - OkHttp `EventListener`, public Cronet `org.chromium.net.RequestFinishedInfo`,
    instrumentation, native hooks, and unified network libraries have different
    coverage/risk boundaries.
  - `TrafficStats` gives UID traffic, not request-stage root cause.
  - `NetworkCapabilities` and per-request network snapshots explain validated,
    captive-portal, VPN/proxy, metered, roaming, and transport changes.
  - Client/access-layer reconciliation needs trace ID, request ID, and attempt
    ID; "not reaching ingress" is a different failure than ingress 5xx or
    client-only dimensions.
  - QUIC/HTTP3 should not be forced into TCP/TLS fields; use protocol/transport,
    handshake, 0-RTT, migration, and path-validation semantics.
- SmartPerfetto impact:
  - High value for network-stage and report-provenance wording.
- Candidate target:
  - Network reports should classify slow stage and evidence source, and avoid
    calling total request time a network root cause without client/access-layer
    and system-state context.
- Risks/caveats:
  - Source is marked needs-rework for platform/Cronet API boundary details; use
    public Cronet and official docs if codifying.
- Status: read, high-value network observability source.

### 416. `part5-app/ch26-observability/18-app-performance-score.md`

- Type: App Performance Score and performance quality attribution.
- Useful information:
  - App Performance Score is a研发阶段 performance health-check framework, not
    root-cause proof or a replacement for online monitoring.
  - Static score items include AGP, R8, Baseline Profile, Startup Profile,
    Compose, and `reportFullyDrawn`/FullyDrawnReporter readiness.
  - Dynamic score needs physical devices and user paths such as cold start,
    notification start, core page scroll, animations, low-end, low-storage,
    weak-network, and thermal scenarios.
  - Convert scores into queues: config, tests, trace, and platform work.
  - Reports should preserve app version, commit, build type, minify/profile
    status, device matrix, path coverage, Macrobenchmark JSON, Perfetto/APA
    trace, screenshots, SQL, decision, owner, and retest time.
  - App Performance Score, Android Vitals, Macrobenchmark, Perfetto/APA, and
    self APM answer different questions.
- SmartPerfetto impact:
  - Medium to high value for recommendation quality and validation-plan wording.
- Candidate target:
  - SmartPerfetto recommendations should route low-confidence score or metric
    findings into config/test/trace/platform next actions instead of presenting
    a score as a root cause.
- Risks/caveats:
  - App Performance Score is preview/current-policy dependent; verify official
    docs before exact scoring claims.
- Status: read, useful finalized performance-governance source.

### 417. `part5-app/ch26-observability/19-client-log-diagnostic-command-channel.md`

- Type: High-availability client logs and diagnostic command channel,
  ready-for-review.
- Useful information:
  - Business logs, performance traces, diagnostic commands, and dynamic rules
    answer different questions and have different cost/privacy risk.
  - Logs need five goals: no critical data loss, bounded write cost, weak-network
    recovery, user/session traceability, and sensitive-field governance.
  - Architecture should split sampling, local storage, and upload; user sampling,
    event priority, temporary windows, and config snapshots are separate knobs.
  - Multi-process design should use independent process writes and centralized
    upload, with atomic rename, recovery scanning, record checksum/chunk length,
    backlog cleanup, elapsedRealtime, background compression/encryption.
  - Diagnostic commands should be pre-defined, signed/authorized/audited,
    expiring, quota-limited, and return state transitions and failure receipts.
  - `ProfilingManager` is a profile entry point, not a log system; return fields
    must include type, tag, duration, buffer, result path, error, rate limit, and
    upload state.
  - Privacy controls should include field allowlist, approval tiers, TTL,
    local encryption, regional/user policy, minimal collection, and remote
    kill switches.
- SmartPerfetto impact:
  - High value for diagnostic evidence recommendations and privacy-aware
    missing-evidence language.
- Candidate target:
  - Reports should treat logs, traces, and diagnostic commands as separate
    evidence classes and recommend controlled evidence collection only with
    explicit bounds.
- Risks/caveats:
  - Source is still ready-for-review; use as architecture/methodology, not a
    final API reference.
- Status: read, high-value diagnostics-channel source.

### 418. `part5-app/ch26-observability/README.md`

- Type: Chapter 26 overview.
- Useful information:
  - Chapter 26 covers the closed loop from problem discovery, localization,
    remediation, to recurrence prevention.
  - It organizes observability around Crash, performance, ANR, troubleshooting,
    regression, release gates, case studies, versioned diagnostics, Vitals,
    storage/network, scoring, and logs/diagnostic commands.
- SmartPerfetto impact:
  - Low direct value; useful as observability chapter synthesis.
- Candidate target:
  - No direct Skill/strategy edit beyond maintaining the closed-loop framing.
- Risks/caveats:
  - Overview is shorter than individual sections.
- Status: read, low-value overview source.

### 419. `preface/how-to-use.md`

- Type: Book usage guidance.
- Useful information:
  - The wiki is designed for problem-driven reading rather than linear reading.
  - Real issues should start from the relevant problem chain, then backfill
    prerequisites.
  - App performance practice connects problem chapters, Perfetto, methodology,
    and online monitoring.
- SmartPerfetto impact:
  - Medium value for UX/strategy routing philosophy.
- Candidate target:
  - SmartPerfetto scene routing should preserve problem-first workflows and
    guide missing context instead of dumping generic background.
- Risks/caveats:
  - Meta guidance, not technical evidence.
- Status: read, useful routing-philosophy source.

### 420. `preface/intro.md`

- Type: Book introduction.
- Useful information:
  - The wiki aims to connect system mechanism, performance symptoms, tools, and
    executable judgment.
  - It frames the central question as moving from symptom to mechanism, then
    from mechanism back to actionable judgment and tools.
  - It intentionally keeps Android proper nouns such as Choreographer,
    SurfaceFlinger, Binder, and VSync in English.
- SmartPerfetto impact:
  - Medium value for report tone and structure.
- Candidate target:
  - SmartPerfetto final reports should stay mechanism-grounded and actionable,
    using Android terms consistently.
- Risks/caveats:
  - Meta guidance, not a direct data source.
- Status: read, useful methodology framing source.

### 421. `preface/reading-paths.md`

- Type: Role/problem reading paths.
- Useful information:
  - App performance route: fluency, responsiveness, ANR, Perfetto, and
    methodology.
  - Testing/quality route: metrics, testing best practices, Perfetto, tools,
    competitor analysis, and online monitoring.
  - Problem lookup table maps list jank, startup, ANR, memory growth, power, and
    Perfetto-reading confusion to chapter chains.
- SmartPerfetto impact:
  - Medium value for scene taxonomy and user-intent routing.
- Candidate target:
  - Strategy/scenario routing should map user problem statements to focused
    analysis chains rather than one broad Android-performance bucket.
- Risks/caveats:
  - Chapter numbers are wiki-local and should not be copied into SmartPerfetto
    user-facing output unless linked intentionally.
- Status: read, useful routing source.

### 422. `preface/target-audience.md`

- Type: Target audience.
- Useful information:
  - Target readers are experienced app engineers, performance engineers,
    framework/system engineers, and testing/quality/infrastructure engineers.
  - The book assumes familiarity with main thread, background threads, logs,
    trace, system services, and common Android components.
- SmartPerfetto impact:
  - Low to medium value for report depth and terminology assumptions.
- Candidate target:
  - SmartPerfetto should keep advanced Android terms precise but explain
    evidence gaps and next actions for mixed engineering audiences.
- Risks/caveats:
  - Audience framing only.
- Status: read, low-value audience source.

### 423. `preface/verification-standards.md`

- Type: Verification status and confidence standards.
- Useful information:
  - The wiki separates content status (`verified`, `draft`, `needs-review`,
    `outdated`) from confidence (`high`, `medium`, `low`).
  - Readers should treat draft/needs-review/outdated and lower-confidence
    content as starting points for verification, not firm rules.
  - Important judgments should expose whether they are backed by AOSP, official
    docs, device observation, or weaker experience.
- SmartPerfetto impact:
  - High value for report confidence and source-provenance contract.
- Candidate target:
  - SmartPerfetto final reports should classify conclusion confidence and
    evidence provenance, especially when recommendations rely on indirect or
    version-sensitive sources.
- Risks/caveats:
  - Meta standard, but strongly aligned with SmartPerfetto report quality.
- Status: read, high-value verification-standard source.

### 424. `preface/version-conventions.md`

- Type: Android version boundary conventions.
- Useful information:
  - Many Android performance conclusions are version-bound.
  - The wiki recommends explicit API/version ranges and explaining behavior
    before/after key version boundaries.
  - Readers should confirm applicability whenever using a judgment on a target
    device/version.
- SmartPerfetto impact:
  - High value for report and strategy guardrails.
- Candidate target:
  - SmartPerfetto reports should include Android/API applicability when using
    FrameTimeline, profiling, background limits, FGS/Job behavior, diagnostics,
    or other version-dependent observations.
- Risks/caveats:
  - Meta standard, but broadly applicable.
- Status: read, high-value version-boundary source.

## Synthesis

The 424-article pass yields one dominant reusable pattern for SmartPerfetto:
do not add more hardcoded conclusions. Improve the evidence contract used by
Skills and strategies:

- Classify the evidence source before drawing a conclusion: Perfetto timeline,
  Skill-derived metric, log/snapshot, external Play/Vitals or APM metric,
  app/system diagnostic API, privileged trace, or user-provided context.
- Classify the subsystem/stage before recommending a fix: startup TTID/TTFD vs
  business-ready, jank host vs producer vs SF, ANR system-confirmed vs watchdog
  stall, memory Java/native/graphics/RSS/PSS/LMK, storage file I/O vs SQLite vs
  capacity/corruption, network packet activity vs request-stage/client/server
  evidence, and power rail vs event-chain fallback.
- Preserve confidence and missing-evidence language. A trace can support a
  timeline/root-cause claim; it cannot by itself prove a 28-day Play Vitals
  violation, an A/B treatment effect, an online network DNS/TLS stage, or a
  production crash-rate regression.
- Preserve Android/API version boundaries for FrameTimeline, input events,
  monitor contention, ApplicationExitInfo, ApplicationStartInfo,
  ProfilingManager/ProfilingTrigger, foreground-service/job/power restrictions,
  and Vitals/App Performance Score policy references.
- Keep recommendations in the correct authority layer: App-layer fixes, system
  or OEM actions, measurement/trace recapture actions, or online observability
  instrumentation.

The existing codebase already has strong infrastructure for this: runtime-read
strategy templates, conclusion scene templates, Skill YAML display contracts,
and validation gates. The plan below uses those extension points rather than
adding TypeScript hardcoding.

## Implementation Plan

### Independent Plan Review Result

Read-only explorer review did not return LGTM. Required revisions:

- Verification scope was too narrow for ANR/memory/network/power changes because
  canonical trace regression mostly covers startup/scrolling/Flutter. Broad
  scene-strategy expansion needs matching fixtures or should be deferred.
- Network already contains older overclaims: packet data is used to infer DNS
  latency, conclusion templates request DNS/connect/TTFB evidence, and strategy
  capability metadata treats `network_packets` inconsistently. These must be
  corrected in the same change.
- Final-report continuation prompts must preserve the new evidence/confidence
  contract; testing only `strategyLoader.spdxHeader.test.ts` is not enough.
- Focused tests should be placed near the changed runtime surfaces:
  conclusion-scene template tests, prompt assembly/loader tests, and OpenAI
  continuation tests.

### Revised Scope

This implementation will be deliberately narrower than the first draft. It will
ship the reusable evidence contract and fix the known network/wakelock
overclaim surfaces now. Larger ANR/memory/power strategy expansions will be
deferred until the repo has direct fixture/e2e coverage for those scenes.

Exact external policy/API claims will not be newly hardcoded. If a prompt needs
to mention Play Vitals, App Performance Score, or Android-versioned diagnostic
APIs, it will phrase them as version/policy-sensitive external signals that
require current official-doc confirmation before being treated as release gates.

### Files to Change

1. `backend/strategies/prompt-output-format.template.md`
   - Add a global "evidence class / confidence / version boundary" rule to the
     finding and conclusion format.
   - Require high-severity conclusions to name whether evidence is direct trace,
     derived metric, log/snapshot, external aggregate, diagnostic API, or
     missing.
   - Require version-sensitive claims to include the applicable Android/API
     boundary or mark it as unknown.

2. `backend/strategies/prompt-methodology.template.md`
   - Add a short evidence taxonomy before scene-specific strategy injection.
   - Add "do not overclaim" rules for external metrics, online telemetry,
     privileged diagnostics, and empty trace data.
   - Point agents to `lookup_knowledge("evidence-provenance")` when a report
     needs background explanation.

3. `backend/strategies/knowledge-evidence-provenance.template.md`
   - New runtime-read knowledge template summarizing evidence classes,
     confidence levels, missing-evidence wording, and version-boundary handling.
   - Keep it generic and source-agnostic so it can be used by startup, jank,
     ANR, memory, storage, network, and power reports.

4. Focused scene strategies:
   - `backend/strategies/network.strategy.md`: correct capability metadata and
     explicitly state that `network_analysis` packet data supports
     packet/activity/traffic/power-correlation claims, not DNS/connect/TLS/TTFB
     request-stage root cause unless request-level telemetry or access-layer
     evidence is supplied.
   - `backend/strategies/general.strategy.md`: update generic network and
     storage/IO routing so ambiguous questions route by evidence class and
     stage, without implying request-stage evidence from packet traces.
   - `backend/strategies/startup.strategy.md`: make only a small boundary edit
     around TTID/TTFD/business-ready and external scoring/Vitals signals because
     startup has existing trace regression/e2e coverage.
   - Defer broad ANR and memory strategy expansion until corresponding
     fixtures/e2e coverage are available.

5. Final-report continuation prompts:
   - `backend/strategies/prompt-openai-final-report-continuation-zh.template.md`
   - `backend/strategies/prompt-openai-final-report-continuation-en.template.md`
   - Preserve evidence class, confidence/limitations, version/missing-evidence
     boundaries, and scene-specific Final Report Contract structure when a
     completed run needs a bounded final-report continuation.

6. `backend/skills/config/conclusion_scene_templates.base.yaml`
   - Add concise output requirements for startup, IO, network, and generic
     conclusions. Leave `conclusion_scene_templates.yaml` as the override/delta
     file unless a product-specific override is needed. Avoid tightening
     ANR/memory/power until scene-specific e2e coverage exists.

7. Skill YAML:
   - `backend/skills/composite/network_analysis.skill.yaml`: add a displayed
     evidence-scope row explaining that `android_network_packets` supports
     packet/activity/traffic claims, not DNS/TCP/TLS/TTFB stage root cause unless
     paired with request-level telemetry. Also downgrade the existing DNS-port
     diagnostic wording from "may cause network latency" to "DNS packet activity
     is frequent; request-stage latency is unproven".
   - `backend/skills/atomic/android_kernel_wakelock_summary.skill.yaml`: add
     observed-window fields and improve `vitals_hint` so short traces are marked
     as local evidence / partial-window reference instead of implying a full
     24-hour Play Vitals judgment.

8. Focused unit coverage:
   - `backend/src/agent/core/__tests__/conclusionSceneTemplates.test.ts`: assert
     conclusion scene templates include evidence-source/confidence requirements
     for the changed scenes.
   - `backend/src/agentv3/__tests__/strategyLoader.spdxHeader.test.ts`: keep a
     light loader smoke for the new knowledge topic and prompt text.
   - `backend/src/agentOpenAI/__tests__/openAiRuntime.test.ts`: assert the
     final-report continuation prompt preserves evidence class/version/missing
     evidence boundaries.
   - Add a focused Skill eval or validator-level assertion for the changed
     `network_analysis` and wakelock output fields if existing trace fixtures
     can exercise those Skills. If no fixture covers them, document that gap and
     rely on `validate:skills` plus source-level assertions in this batch.

### Change Order

1. Update runtime prompt/methodology templates and add the knowledge template.
2. Update final-report continuation prompts.
3. Update focused network/general/startup strategy boundaries.
4. Update conclusion-scene templates.
5. Update `network_analysis` and wakelock summary Skill YAML.
6. Add focused tests at the owning runtime surfaces.
7. Run validation/tests, fix failures, then perform the simplification pass and
   final review.

### Risks and Mitigations

- Prompt bloat: keep additions short and reusable; avoid copying the wiki into
  prompts.
- Over-broad requirements causing report verbosity: make confidence/source
  requirements concise and only mandatory for key findings/conclusions.
- Strategy validation failures: only reference existing Skill names, and keep
  new knowledge topic as `knowledge-*.template.md`, which is auto-discovered.
- Skill SQL regressions: keep SQL additions read-only, low-cardinality, and
  limited to summary/display fields; validate all Skills and run trace
  regression.
- Version/policy drift: exact Play/Vitals/App Performance Score thresholds are
  described as references requiring verification, not hardcoded final truth.
- Coverage gap: non-startup/scrolling scene-strategy expansion is deferred until
  ANR/network/memory/power fixture coverage exists.

## Verification Plan

The minimum gates after implementation are:

- `cd backend && npm run validate:skills` when Skill YAML changes.
- `cd backend && npm run validate:strategies` when strategy/template markdown
  changes.
- `cd backend && npm run build`.
- `cd backend && npm run test:scene-trace-regression`.
- Focused unit tests:
  - `cd backend && npx jest src/agent/core/__tests__/conclusionSceneTemplates.test.ts --runInBand`.
  - `cd backend && npx jest src/agentv3/__tests__/strategyLoader.spdxHeader.test.ts --runInBand`.
  - `cd backend && npx jest src/agentOpenAI/__tests__/openAiRuntime.test.ts --runInBand`.
- Agent SSE e2e checks from `.claude/rules/testing.md` for startup and
  scrolling strategy prompt changes, plus a network/power Skill smoke if an
  existing trace fixture exercises those data sources.
- `npm run verify:pr` before final landing.
