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

## 2026-05-29 text fallback clipping incident

- **Symptoms** – When staging switched to the text fallback, the portfolio card started
  mid-page with its heading clipped above the viewport. Users could scroll down through
  content, but scroll position `0` could not reveal the missing title or introductory copy.
- **Impact** – Explicit `?mode=text`, runtime performance failover, automated-client
  fallback, and other rendered text-mode paths could hide the first fallback content on
  short desktop viewports once the full exhibit list made the card taller than the window.
- **Root cause** – `html`, `body`, and `#app` used fixed `height: 100%` sizing while
  `#app[data-mode='text']` vertically centered the tall `.text-fallback` flex item.
  Centering a flex child taller than its fixed-height container created negative-Y overflow
  above the document scroll range.
- **Corrective action** – Fallback mode now lets `html`/`body` grow in normal document
  flow, top-aligns the text-mode app container, preserves the centered card width with
  logical/safe-area padding, and keeps vertical overflow on the document rather than inside
  a clipped fixed-height parent.
- **Regression tests** – `playwright/text-fallback-layout.spec.ts` covers 1280×720 and
  390×844 viewports, asserting the title is fully visible at scroll top, the document can
  scroll to the final exhibit card, and horizontal overflow stays within a one-pixel
  rounding tolerance.
- **Validation notes** – Run `npm run test:e2e -- --grep "text fallback"` alongside the
  normal lint, typecheck, unit, docs, and smoke checks after layout changes touching the
  fallback experience.
