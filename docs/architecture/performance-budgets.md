# Performance budgets

These guardrails capture the renderer metrics we sampled while booting the
immersive scene on Chrome 124 (MacBook Pro M2 Pro). Update both the snapshot
and the Vitest assertions when measurable changes land.

| Metric            | Budget | Baseline | Headroom |
| ----------------- | ------ | -------- | -------- |
| Unique materials  | ≤ 36   | 28       | 8        |
| Draw calls        | ≤ 150  | 132      | 18       |
| Texture memory    | ≤ 24 MB| 18.0 MB  | 6.0 MB   |

- **Source** – [`src/assets/performance.ts`](../../src/assets/performance.ts)
  contains the structured data (`IMMERSIVE_PERFORMANCE_BUDGET` and
  `IMMERSIVE_SCENE_BASELINE`).
- **Assertion** – [`src/tests/performanceBudget.test.ts`](../../src/tests/performanceBudget.test.ts)
  enforces the headroom values so regressions fail fast in CI.
- **Workflow** – Capture metrics via the Three.js inspector: open devtools,
  run `renderer.info.render` and `renderer.info.memory` after the camera settles
  at launch. Update the snapshot date and notes when refreshing numbers.

## Heavy assets & lazy loading

| Asset | Size | Strategy |
| ----- | ---- | -------- |
| Avatar GLTF variants (`src/scene/avatar/`) | ~4.5 MB decoded | Load once on boot; swap materials in place to avoid duplicate buffers. Future variants should stream textures via Basis or KTX2 before attaching. |
| Lightmap textures (`src/scene/lighting/bakedLightmaps.ts`) | 2048² RGBA | Keep baked into a single atlas, lazy-attach only after renderer reports WebGL2 support. Fallback to gradient shader when unavailable. |
| POI hologram textures (`public/textures/poi/*.png`) | 512² | Preload via `<link rel="preload">` once the POI registry resolves; defer animation clips until the player enters a POI radius. |

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
