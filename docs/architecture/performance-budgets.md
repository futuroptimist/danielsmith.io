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
- **Workflow** – Capture metrics via the Three.js inspector: open devtools,
  run `renderer.info.render` and `renderer.info.memory` after the camera settles
  at launch. Update the snapshot date and notes when refreshing numbers.

## Adaptive quality warmup and recovery

Staging on May 29, 2026 showed two renderer classes that need different
adaptive-quality behavior:

- Hardware acceleration (`ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 ..., D3D11)`)
  stabilized near 60 FPS with main render time warming down toward roughly
  1–2 ms after startup. The previous policy could still downgrade balanced
  quality to performance during shader/asset warmup and leave capable hardware
  permanently reduced.
- Software rendering (`ANGLE (Microsoft Basic Render Driver)`) remained around
  30–40 FPS with DPR reduced, bloom/composer and the mirror disabled, and still
  needs the separate crash-hardening follow-up.

Normal renderers now collect warmup metrics before adaptive downgrades, require
sustained low FPS/high frame time hysteresis before stepping down, and recover
from performance to balanced after a sustained stable window near 60 FPS. The
recovery path is disabled for software renderers and for explicit user-selected
quality so manual performance choices are not silently upshifted. Diagnostics
from `window.portfolio.performance.getSnapshot()` include warmup state,
selection source, downgrade/recovery counts, and the last adaptive action reason
so staging can distinguish startup spikes from steady-state overload.

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
