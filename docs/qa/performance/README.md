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

## Basement shell and stairs

[Common manifest](2026-10-02-basement-b07fc96c/manifest.json) ·
[Common ranges/deltas](2026-10-02-basement-b07fc96c/summary.json) ·
[Extended manifest](2026-10-02-basement-b07fc96c/extended-6ac34f19-manifest.json) ·
[Extended checkpoints](2026-10-02-basement-b07fc96c/extended-6ac34f19-summary.json)

Runtime source `b07fc96c` completed three controlled suites and three common routes;
`6ac34f19` changes only the capture helper and separately completed three suites and
three extended basement routes. Every suite has four passes and one hardware-only
skip. All detached source trees stayed clean and all movement routes completed.
The shared profile records exact baseline/predecessor comparisons and cross-batch
limits; raw archives and prior failed attempts remain privately retained.

Common spawn counters are **111 calls / 4,832 triangles / 66 geometries / 7 textures**.
The draw-call increase versus the baseline is explicit, while geometry counts fall;
launch headroom remains **39 calls, 45,168 triangles, 59 geometries and 25 textures**.
Upper-pose calls/triangles match the baseline. Timing variation and changed scene
populations do not establish causal speedups or equivalence.

The extended route covers **3,973 real movement steps**, seven named checkpoints,
the basement toe/perimeter and both upper poses. The ground landing records
**144 calls**, and basement poses record **51 calls**. Returned residency is
**653–656 geometries / 10–13 textures**; it is not compared with the launch-only
125-geometry ceiling. Each run retains its separate >=1-second stall observation.
Actual camera position/focus/cutaway IDs are captured at every extended checkpoint;
older common captures omitted that available API and remain labeled not captured.
Hardware timing, full old-renderer reclamation and owner walkthrough remain open.

## Career museum

[Common manifest](2026-10-02-museum-25679bb1/manifest.json) ·
[Common ranges/deltas](2026-10-02-museum-25679bb1/summary.json) ·
[Extended manifest](2026-10-02-museum-25679bb1/extended-a22fb9bd-manifest.json) ·
[Career checkpoints](2026-10-02-museum-25679bb1/extended-a22fb9bd-summary.json)

Measured common source `25679bb1` and same-runtime extended source `a22fb9bd`
each completed three suites and three routes. Common application-ready duration
was **1,385.1–1,412.3 ms**, above the baseline rerun's **1,366.1–1,379.8 ms**;
the cross-batch mean difference is **+21.47 ms (+1.56%)**, with workload/pose
limitations retained instead of an equivalence claim. Spawn resource counts and
launch headroom match the basement common checkpoint.

The extended **5,471-step**, eleven-checkpoint museum route visits all four
careers before the upper floor and return. The four exhibit views record
**40/41/40/39 calls** and **9/10/11/12 textures**. Returned residency is
**662–665 geometries / 17 textures**, explicitly reported rather than substituted
for launch counters. All raw attempts and separate stall probes are preserved.
The historical helper omitted actual camera state despite the API being available;
that limitation remains visible. Later metadata fixes do not retroactively change
these measured source identities. Functional disposal and repeated-route tests
remain separate from hardware timing and complete old-renderer reclamation.

## October résumé

[Common manifest](2026-10-02-resume-f53f3d71/manifest.json) ·
[Common ranges/deltas](2026-10-02-resume-f53f3d71/summary.json) ·
[Extended manifest](2026-10-02-resume-f53f3d71/extended-f53f3d71-manifest.json) ·
[Extended comparison](2026-10-02-resume-f53f3d71/extended-f53f3d71-summary.json)

Exact source `f53f3d71` completed three controlled suites and three routes in each
common/extended series. This stage changes no immersive runtime. The extended
museum route and helper match the preceding museum capture; all four career
call/triangle/texture counts match. Ready and resident-resource ranges overlap,
with returned **650–666 geometries / 16–17 textures** versus **662–665 / 17**.
Three descriptive samples, sequential capture times and missing actual camera
state do not establish a speedup or strict equivalence. All original attempts,
separate stalls and source identities remain retained; budgets are unchanged.

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

## Front entrance route addition

Use the same isolated multi-commit runner for the stage addition:

```bash
npm run perf:history -- --route-profile exterior <predecessor> <entry-commit>
```

Older commits without a versioned exterior helper and front-door source retain
the common route and explicitly report the exterior portion as unavailable.
Each result and summary records the actual route version; compare common profiles
separately rather than ranking unlike extended routes.

`node scripts/capture-performance-route.cjs <new-output-directory> --exterior`
selects `house-front-entry-route-v2`. It preserves the complete museum and common
upper/spawn route, then appends closed/open entrance, sidewalk, outside-close and
returned-spawn checkpoints. Version 2 handles proximity opening: door actions
inspect the requested target before toggling the visible DOM control, and closed
checkpoints explicitly close the door while the avatar stays at the named pose.
Each open/closed checkpoint asserts its expected door state before and after the
dwell and records that expectation alongside actual snapshots. Historical v1
helpers stay labeled v1 and are supported for their original manual-door source;
a v1 helper paired with automatic-door source is skipped, as are unknown versions. Read-only
occupancy planning supplies waypoints to the unchanged runtime movement sampler;
no teleport establishes a passage. Every route checkpoint also records the
available read-only door state. The common and basement profile names and their
legs are unchanged. New exterior poses are additions, not baseline comparisons.

Run the predecessor's common/museum profiles under the same browser, server and
quality conditions. Retain all three attempts and the separate native keyboard /
touch functional traces; a completed software route does not close hardware p95
or the owner's final manual review.
