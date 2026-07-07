# Performance budgets

These guardrails capture the renderer metrics we sampled while booting the
immersive scene on Chrome 124 (MacBook Pro M2 Pro). Update both the snapshot
and the Vitest assertions when measurable changes land.

| Metric           | Budget  | Baseline | Headroom |
| ---------------- | ------- | -------- | -------- |
| Unique materials | ≤ 36    | 28       | 8        |
| Draw calls       | ≤ 150   | 132      | 18       |
| Texture memory   | ≤ 24 MB | 18.0 MB  | 6.0 MB   |

- **Source** – [`src/assets/performance.ts`](../../src/assets/performance.ts)
  contains the structured data (`IMMERSIVE_PERFORMANCE_BUDGET` and
  `IMMERSIVE_SCENE_BASELINE`).
- **Assertion** – [`src/tests/performanceBudget.test.ts`](../../src/tests/performanceBudget.test.ts)
  enforces the headroom values so regressions fail fast in CI.
- **Headroom labels** – `createPerformanceBudgetReport(...)` now adds a `status` label
  (`within-budget`, `over-budget`, or `invalid`) plus a clamped `remainingPercent` so
  press-kit exports and dashboards surface budget health without recomputing ratios.
- **Narrative summaries** – `describePerformanceBudgetUsage(...)` formats the headroom
  into unit-aware labels (materials, draw calls, bytes) for press-kit output without
  duplicating formatter logic.
- **Runtime telemetry** – [`createInputLatencyTelemetry`](../../src/systems/performance/inputLatencyTelemetry.ts)
  monitors keyboard and pointer interactions, logging median/p95/max latency against the 200 ms
  INP budget whenever the session hides, unloads, or performance failover triggers.
  - Telemetry accumulators now cap rolling windows (360 latency events, 600 FPS samples) so long
    play sessions cannot inflate memory while percentiles stay accurate.
  - Event summaries now group counts by pointer, keyboard, manual, and other sources via the
    `eventCategoryCounts` field so analytics pipelines can separate coarse interaction drivers
    without reprocessing raw events.
  - Summary snapshots dispatch a `portfolio:input-latency-summary` CustomEvent containing the
    reason and raw summary payload so dashboards and failover hooks can consume telemetry
    without re-implementing monitor plumbing.

## Immersive launch runtime budgets

Playwright now enforces live launch diagnostics from
`window.portfolio.performance.getSnapshot()` with
`npm run perf:budget`. The thresholds are encoded in
[`IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET`](../../src/assets/performance.ts) and are
based on current local warm-launch measurements rounded up with conservative
headroom so small content additions have room while accidental scene bloat still
fails CI.

| Metric           | Budget | Local baseline | Headroom rationale                                      |
| ---------------- | ------ | -------------- | ------------------------------------------------------- |
| Draw calls       | ≤ 150  | 114            | ~30% room for small decor without returning to bloat.   |
| Triangles        | ≤ 50k  | 32k            | >50% room for mesh variance while catching large props. |
| Geometries       | ≤ 125  | 86             | Allows modest structure/POI growth.                     |
| Textures/proxies | ≤ 32   | 19             | Leaves room for a few atlases, not unbounded screens.   |
| p95 frame time   | ≤ 80ms | 40ms           | Hardware-only guard with 2× local warm-launch slack.    |

Software renderers such as SwiftShader still have to expose coherent renderer
counters and scene-detail diagnostics, but the p95 frame-time budget is skipped
because CI CPU contention makes that metric unreliable without a hardware GPU.
Failure messages include the actual value, budget, renderer risk level, and
quality level.

- **Workflow** – Capture static press-kit metrics via the Three.js inspector: open devtools,
  run `renderer.info.render` and `renderer.info.memory` after the camera settles
  at launch. Update the snapshot date and notes when refreshing numbers. Refresh
  runtime launch budgets by running `npm run perf:budget` locally, copying the
  warmed diagnostics from failures or `window.portfolio.performance.getSnapshot()`,
  and preserving documented headroom.

## Performance scene detail mode

Performance graphics quality now applies a centralized scene detail policy in
addition to DPR, bloom, exposure, mirror, and LED reductions. The intent is a
roughly 10× theoretical workload reduction on constrained tablets and mobile
GPUs; real FPS gains still depend on browser, thermal, and driver behavior.
Balanced and Cinematic continue to share the original high-detail scene policy.

When Performance is selected or reached adaptively, the low-detail policy:

- lowers procedural cylinder/sphere/ring/torus segments used by POI markers,
  the avatar mannequin, and major decorative structures;
- reduces Jobbot and media-wall canvas texture dimensions from 2048×1024 to
  512×256, and throttles performance-mode canvas redraws;
- disables nonessential transparent shader/overdraw effects such as backyard
  walkway mist, greenhouse pond ripples, flywheel glass/halo details, Jobbot
  data shards and telemetry panels, and media-wall glow planes;
- disables or hides nonessential point lights and skips/throttles unfocused
  decorative update loops;
- exposes renderer counters (`calls`, `triangles`, `points`, `lines`,
  `memory.geometries`, and `memory.textures`) plus the active scene-detail
  budget through `window.portfolio.performance.getSnapshot()`.

Fresh sessions on coarse-pointer, mobile/tablet-like, or constrained-memory/CPU
hardware start in Performance when no explicit graphics-quality preference is
persisted. Explicit user selections remain authoritative.

## Runtime low-FPS recovery

Runtime low-FPS recovery is user-directed. After immersive mode is already
running, sustained low FPS no longer automatically downgrades graphics, reduces
DPR, reloads the scene, or switches to text mode. The `LowFpsRecoveryMonitor`
shows a non-modal recovery popup instead, and the session stays in its current
graphics level until the visitor chooses an action.

The popup owns the runtime recovery path:

- **Dismiss** hides the popup and starts its cooldown without changing quality or
  mode.
- **Switch to Balanced/Performance** applies the next lower graphics quality only
  after the visitor chooses it. HUD, API, and popup-owned graphics changes use
  the scene-detail reload handoff so POI, mannequin, backyard, media-wall, and
  showpiece assets are rebuilt under the selected policy while the player's
  position is restored.
- **Use non-immersive mode** switches to the text portfolio only after the
  visitor explicitly clicks that action.

Startup safety remains separate from runtime low-FPS recovery. Fresh sessions may
still choose an initial graphics level based on device/software-renderer policy,
and true failovers for unsupported WebGL, low memory, fatal renderer errors, and
explicit text-mode actions remain intact. Diagnostics now report zero/null
adaptive downgrade state because immersive runtime no longer instantiates an
adaptive quality controller.

## Heavy assets & lazy loading

| Asset                                                      | Size            | Strategy                                                                                                                                          |
| ---------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Avatar GLTF variants (`src/scene/avatar/`)                 | ~4.5 MB decoded | Load once on boot; swap materials in place to avoid duplicate buffers. Future variants should stream textures via Basis or KTX2 before attaching. |
| Lightmap textures (`src/scene/lighting/bakedLightmaps.ts`) | 2048² RGBA      | Keep baked into a single atlas, lazy-attach only after renderer reports WebGL2 support. Fallback to gradient shader when unavailable.             |
| POI hologram textures (`public/textures/poi/*.png`)        | 512²            | Preload via `<link rel="preload">` once the POI registry resolves; defer animation clips until the player enters a POI radius.                    |

## Lightmap generation & validation

1. Author UV2 unwraps in Blender and bake a new lightmap at 2048² using the dusk
   HDRI rig.
2. Export the atlas to `public/lightmaps/interior.png` and update the reference
   in `createInteriorLightmapTextures`.
3. Run `npm run test:ci` to execute
   [`src/tests/bakedLightmaps.test.ts`](../../src/tests/bakedLightmaps.test.ts)
   which validates the gradient falloff.
4. Verify in the immersive build by launching
   `http://localhost:5173/?mode=immersive&disablePerformanceFailover=1` and
   toggling `Shift+L` to compare debug vs. cinematic passes.

## Outage notes

### 2026-05-29 text fallback clipping

- **Symptoms** – Staging visitors who were routed to text mode saw the fallback content start
  mid-page. The title and description were clipped above the viewport, and scrolling could not
  reach them.
- **Impact** – Explicit `?mode=text`, runtime performance failover, automated-client failover,
  and other fallback paths could hide the page introduction whenever the full portfolio/exhibits
  copy made the fallback card taller than the viewport.
- **Root cause** – The document and `#app` were fixed to `height: 100%`, while
  `#app[data-mode='text']` vertically centered the tall `.text-fallback` flex item. Once the
  card exceeded the viewport height, flex centering pushed the top into negative-Y overflow that
  was outside the scroll range.
- **Corrective action** – Text mode now switches the fallback document back to normal top-aligned
  flow: the fallback root uses `min-height: 100dvh`, `height: auto`, visible overflow, centered
  inline card sizing, and safe-area-aware padding so all content begins within the scrollable
  range.
- **Regression tests** – `playwright/text-fallback-layout.spec.ts` covers 1280×720 desktop,
  390×844 mobile, and automated-client runtime fallback. Each path asserts the title/description
  are visible at scroll position 0, the page scrolls to the final portfolio POI, and horizontal
  overflow stays within a 1 px tolerance.
- **Validation notes** – Run `npm run test:e2e -- --grep "text fallback"` alongside the standard
  format, lint, typecheck, Vitest, docs, and smoke checks before promoting the fallback layout.
