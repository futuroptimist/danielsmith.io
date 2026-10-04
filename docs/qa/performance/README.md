# Reproducible performance history

## Corrected software history, October 3

The corrected October 3 series uses exact clean source commits and one frozen common
driver. Each profile has three controlled suites and three routes. Earlier allocations
and pre-feedback captures remain historical; their samples are not pooled here.

This branch includes the checkpoints below. The shared profile records the environment,
reproduction commands, archive identities and limitations. Detailed originals are
privately retained; Git keeps aggregate ranges, medians and comparisons.

| Checkpoint                  | Ready range; median (ms) | Spawn calls / geometries |
| --------------------------- | -----------------------: | -----------------------: |
| [Baseline][ph-baseline]     |   1,473.3–1,650.7; 1,616 |                  97 / 89 |
| [Foundation][ph-foundation] |   1,384.8–1,515.7; 1,399 |                  97 / 89 |
| [Basement][ph-basement]     | 1,356.1–1,483.8; 1,409.7 |                 114 / 69 |
| [Museum][ph-museum]         |   1,499.3–1,575.9; 1,508 |                 114 / 69 |
| [Résumé][ph-resume]         | 1,482.2–1,578.3; 1,566.7 |                 114 / 69 |
| [Entry][ph-entry]           | 1,511.3–1,582.7; 1,516.3 |                 116 / 71 |
| [Garage][ph-garage]         |   1,787–1,929.1; 1,888.4 |                 103 / 71 |

[Shared profile][ph-profile]. Each linked record retains its baseline and predecessor deltas.

Extended profiles included here have 7, 11, 11, 16, 21 checkpoints in stage order. Each
completed three routes and three controlled suites. Exterior profiles are version 2,
with explicit automatic/manual door states; the street version retains only the passive
sign.

Garage readiness is above the entry range. Its lower spawn draw count has no
demonstrated camera, floor-visibility, door-state or framing explanation. The sequential
observations establish neither a causal slowdown nor a speedup.

Every recorded route has a ≥1-second external rAF interval already present by spawn. The
probe includes startup, helper work and screenshots. Rolling frame diagnostics omit
≥1-second gaps and cannot establish stall-free traversal.

These captures use software WebGL, performance quality and a 12 fps safe cap. The
software-warning panel remains visible. Hardware p95, real-phone performance and the
corrected owner walkthrough remain separate. Finite functional disposal checks do not
measure teardown/re-entry performance or prove complete old-renderer/GPU reclamation.

[ph-profile]: 2026-10-03-corrected-software-history/profile.json
[ph-baseline]: 2026-10-03-corrected-software-history/baseline.json
[ph-foundation]: 2026-10-03-corrected-software-history/foundation.json
[ph-basement]: 2026-10-03-corrected-software-history/basement.json
[ph-museum]: 2026-10-03-corrected-software-history/museum.json
[ph-resume]: 2026-10-03-corrected-software-history/resume.json
[ph-entry]: 2026-10-03-corrected-software-history/entry.json
[ph-garage]: 2026-10-03-corrected-software-history/garage.json

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

## Attached garage route addition

`--garage` selects `house-attached-garage-route-v3` and implies the complete
front-entry/museum route. The prior returned-spawn checkpoints and all existing
legs are retained, then the route visits the house/garage door, garage interior,
closed/open vehicle doorway and driveway before returning through the front
entrance. The museum portion cannot overwrite this more-specific profile label.
New garage poses remain separately named additions; compare common poses using
matched predecessor/baseline series. The future street remains unavailable.

### Attached-garage checkpoint

```bash
npm run perf:history -- --route-profile garage <entry-commit> <garage-commit>
```

The runner selects the versioned `--garage` helper only when the historical
commit contains the authored garage door definition. Earlier refs explicitly
fall back to their common route and record the unavailable capability. The
`house-attached-garage-route-v3` route retains the common, basement/museum and front-entry
checkpoints before exercising both garage doors and the driveway. Compare shared
named checkpoints separately from new route legs; each result retains its actual
profile and camera state when the historical API exposes it.

The garage v3 profile inherits the front-entry v2 door-state contract. It manually
closes the overhead door at the stationary interior pose before the closed-door
checkpoint and records/asserts closed and open states at both ends of each dwell.
On the return from the driveway, it adds a real outside approach to the front
entrance at `(35, -15)` and waits for automatic opening before planning the existing
return leg through the aperture. Doors can close after departure, so an earlier
opening cannot establish a later passage. The extra approach/wait changes the route
profile; checkpoint positions/order, dwell, common/interior legs, live occupancy
planning and runtime movement assertions remain unchanged. Historical garage v1
and v2 captures keep their original labels and remain supported for their original
sources; v1 is skipped with automatic-door source. Unknown versions are explicitly
skipped.

## Door departure and shared-wall correction evidence

The [capture profile](2026-10-03-door-wall-corrections/profile.json) and
[reference records](2026-10-03-door-wall-corrections/references.json) retain the
matched baseline, preceding stage and before-correction identities. Each source
completed three controlled suites and three common routes; each corrected stage
also has a separate three-attempt extension. Later test/QA-only descendants are
not relabeled as measured commits. Detailed originals, screenshots and excluded
attempts are durably archived; public metadata contains only filenames, sizes
and checksums. Reproduce with the existing `perf:history` command from the recorded
driver commit, writing to a new ignored directory.

These are sequential software-WebGL observations. Ready-duration and dispatch
ranges overlap their matched before-correction ranges; dispatch is not
input-to-paint latency. Near-zero reference medians make percentage changes
misleading without the absolute ranges. The rolling frame diagnostic is not an
arrival-isolated sample and omits intervals of at least one second. Separate
whole-route probes retain those stalls. No hardware timing or causal performance
claim follows from these samples, and the launch budgets are unchanged.

### Front-entry correction

[Entry metrics](2026-10-03-door-wall-corrections/entry.json) measure `02fe6cd8`.
The common route has 2,147 movement steps; exterior v2 has 16 checkpoints and
6,875 steps per attempt. Worst launch counts are 116 calls, 4,892 triangles,
71 geometries and 7 textures, with unchanged median counts against the
before-correction source. The extension returns with 687–692 resident geometries;
route residency is distinct from the 125-geometry launch ceiling.

### Attached-garage correction

[Garage metrics](2026-10-03-door-wall-corrections/garage.json) measure `e9814056`.
Garage v3 completes 21 checkpoints and 8,553 movement steps per attempt, including
the automatic-door return approach. Worst launch counts are 116 calls, 4,892
triangles, 71 geometries and 7 textures; matched common launch counts are unchanged
from before the correction. The extension returns with 738–742 geometries and
17 textures. Its later capture window is separately recorded.
