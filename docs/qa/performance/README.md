# Reproducible performance history

Keep only commit hashes, limited comparability metadata, and high-level checkpoint
metrics in Git. Detailed JSON, stdout/stderr, snapshots, traces, screenshots, and
isolated worktrees are generated under gitignored `.performance-history/`.
The [design requirements](../../design/house-expansion.md) and unchanged
[controlled-result v1 contract](../../ops/performance-results.md) still apply.

## Capture supplied commits

Use installed dependencies matching the current lockfile and the same supported
Playwright browser installation. Stop other local servers on port 5173 and avoid
concurrent browser workloads. First inspect compatibility without launching browsers:

```bash
npm run perf:history -- --check-only <first-commit> <second-commit>
```

Then capture those exact commits, with a new output directory for every invocation:

```bash
PLAYWRIGHT_BROWSERS_PATH=<installed-browser-dir> npm run perf:history -- \
  --output .performance-history/two-revisions <first-commit> <second-commit>
```

The command resolves immutable SHAs, rejects duplicate/invalid refs and existing
output directories, and creates its own detached worktrees. It never resets or
switches the caller's checkout. Dependencies are shared only when lockfiles match;
installation is never automatic. Missing or changed measurement harness/debug APIs
are reported as incompatible, not silently compared. The command records every
failed, missing, unsupported, and skipped result.

For a command-lifecycle check only, `--smoke` runs one suite and one route; its
result is explicitly non-authoritative and cannot replace the three-attempt series.

Each compatible commit runs the existing suite three times in separate contexts,
archiving each result before another run can replace it. Three common-route
captures follow, each with a fresh Vite development server. It records source, runner, and
helper hashes, caller commit/dirty state, environment/profile data, summaries, original outputs,
and per-file checksums.
Only owned, unchanged worktrees are removed; dirty or unexpected contents are kept
and reported. Generated evidence remains. Cancellation stops owned subprocesses;
interrupted worktrees may require inspection and ordinary manual Git cleanup.

For commits with the versioned basement route, request the supported stage addition:

```bash
npm run perf:history -- --route-profile basement <baseline-commit> <stage-commit>
```

The runner uses that commit's `--basement` helper when the helper and basement
connection exist. Older refs retain the common route and explicitly report the
basement addition as skipped. When that commit contains the career museum, its
helper uses the verified routes around the solid exhibits and records
`house-career-museum-route-v1`, including four named exhibit checkpoints. The
shell retains `house-basement-route-v1`; these extended routes are different
series. Run the default common profile separately for direct baseline and
predecessor comparisons. The helper hash and actual profile are recorded;
do not compare different routes as one series. Later stage additions must preserve
the common route and record their own capability/profile instead of teleporting.

Inspect generated `manifest.json` and `summary.json`. Copy only reviewed, high-level
metrics and comparability metadata into a new history entry; keep detailed outputs
ignored or in a private durable review archive. Record archive filename, SHA256,
and size without publishing private access tokens or links. No dashboard, automatic
historical backfill, upload, merge, or deployment is part of this command.

## Pre-expansion baseline

[Manifest](2026-10-02-pre-expansion-1ee6fcf0f75f/manifest.json) ·
[High-level metrics](2026-10-02-pre-expansion-1ee6fcf0f75f/summary.json) ·
[History](history.json)

Clean `1ee6fcf0f75fcc05f8087026f478cb80d02ca15e` was captured before implementation.
Three suite attempts each passed four tests and skipped the hardware-only case;
three complete common routes used real runtime collision steps. Application-ready
range was **1,268.5–1,313.5 ms**; dispatch-delay p95 was **0.6–90.2 ms**.
Spawn had **89 geometries/7 textures**; after the route, **637–658/9–13** remained
resident. These are resource counts, not GPU bytes or a new all-pose budget.

The full original baseline, including two launch failures, one blocked route,
resource/lifecycle exploration, original helper versions, logs, PNGs, traces, full
metadata, and per-file checksums is preserved in the private archive identified by
the manifest. Private availability is stated there; no public access is implied.
All former raw Git evidence was byte-verified before being moved out of the diff.

## Floor connection foundation: matched reference

[Foundation manifest](2026-10-02-floor-foundation-180aa537/manifest.json) ·
[Ranges and deltas](2026-10-02-floor-foundation-180aa537/summary.json)

Commit `180aa537` (PR #1118) and its baseline/base `1ee6fcf0` each completed three
suite attempts and three common routes in one coordinated quiet browser window.
This fresh matched series restarts Vite for every route; the older original
baseline remains preserved. Both tested source trees stayed clean.

Ready ranges overlap: **1,315–1,413 ms** for baseline and **1,317–1,371 ms** for
foundation. Dispatch p95 varies widely (**79.9–111.6 ms** versus **0.5–116.6 ms**),
so its lower mean is not evidence of a speedup. Upper-pose draw counts match;
post-route resident geometry ranges overlap (**647–660** versus **641–658**).

Returned-spawn calls changed from **84** to **84–97** (mean **+8.67 / +10.32%**).
Saved pose, camera, quality and legacy visibility agree, while screenshot animation
phases differ. The cause is unproven; retain the variation rather than claiming
strict equivalence. Foundation's worst spawn stays below unchanged launch budgets
with **53 calls, 45,336 triangles, 36 geometries and 25 textures** of observed counter
headroom. Hardware timing, lifecycle reclamation and owner walkthrough stay open.

## Corrected foundation: slow-frame safety

[Exact-source manifest](2026-10-02-floor-foundation-096be292/manifest.json) ·
[Ranges and deltas](2026-10-02-floor-foundation-096be292/summary.json)

The corrected runtime at `096be292` and baseline `1ee6fcf0` each completed three
controlled suites and three full common routes in a coordinated quiet capture.
All suites passed four software cases and skipped the hardware-only case; all
routes completed and all source trees stayed clean. The private archive also
retains the initial basement `eecba90b` series, which is historical if later
review fixes change that source.

Application-ready ranges were **1,366.1–1,379.8 ms** for baseline and
**1,303.3–1,490.3 ms** for the corrected foundation; the mean difference was
**+0.13 ms (+0.01%)**. Resource ranges overlap and dispatch/draw counters vary;
this is not evidence of a speedup or strict equivalence. Source launch headroom
remains **53 calls, 45,336 triangles, 36 geometries and 25 textures**. The compact
entry includes rolling frame and movement-phase summaries plus separate whole-route
stall ranges; it does not hide intervals omitted by the rolling sampler.

## Interpretation and gates

- The baseline is Node 24, headless software WebGL, performance quality, software
  warning visible, and Vite development. It is not CI Node 20, a phone, production
  startup, or hardware evidence. Synthetic navigator CPU/RAM hints are not hardware
- Five-second checkpoint dwell does not isolate the app's rolling 180-frame
  diagnostics, which omit deltas of one second or more. Preserve separate stall
  summaries; dispatch delay is not input-to-paint, CPU execution time, or GPU timing
- Preserve every repetition and report range, absolute/percentage deltas against
  baseline and predecessor, and unchanged launch-budget headroom. Label new series
  when conditions change. The initial entry has no predecessor delta
- Launch budgets stay **150 calls, 50,000 triangles, 125 geometries, 32 textures**;
  the **80 ms hardware p95** and owner walkthrough remain separate open gates
- Exploratory repeated routes approached 661 geometries/13 textures. Text teardown
  released some resources, but complete old-context reclamation remains unproven;
  low counters from a new renderer do not prove the previous one was freed
- Ordinary CI artifacts expire after 14 days. Preserve private review archives
  through final stack review; the runtime output directory alone is not durable
