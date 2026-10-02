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
basement addition as skipped. The helper hash and actual profile are recorded;
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
