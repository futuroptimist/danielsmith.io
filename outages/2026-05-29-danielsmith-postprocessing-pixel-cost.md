# Postprocessing and DPR pixel-cost root cause

- **Date:** 2026-05-29
- **Overview:** [staging performance overview](./2026-05-29-danielsmith-staging-performance-overview.md)

## Symptom slice

The scene was visually simple but could still spend too much time in full-screen
work. DPR up to 2 plus composer and bloom multiplied every frame's pixel cost,
which is especially harmful on software renderers.

## Evidence

The previous renderer setup used `Math.min(devicePixelRatio, 2)` and always
created/rendered an EffectComposer chain even when motion blur was disabled and
performance quality disabled bloom. New diagnostics expose DPR, viewport,
drawing-buffer size, bloom state, composer state, and active pass count.

## Impacted files

- `src/scene/graphics/performancePolicy.ts`
- `src/scene/graphics/qualityManager.ts`
- `src/systems/performance/performanceDiagnostics.ts`
- `src/main.ts`
- `src/tests/rendererPerformancePolicy.test.ts`
- `src/tests/performanceDiagnostics.test.ts`

## Fix summary

Default quality is balanced on normal hardware. DPR caps are explicit by quality
and renderer tier. Rendering now bypasses EffectComposer entirely when bloom and
motion blur are inactive, so performance/software mode renders the scene directly
instead of paying for no-op full-screen passes.

## Interaction with other fixes

Lower DPR reduces both the main render and any remaining render-target work.
Composer skipping depends on the quality preset and motion-blur state; it also
makes software and adaptive performance downgrades immediately cheaper.

## Regression tests

Unit tests cover DPR clamping and composer enable/disable decisions. Diagnostics
tests verify snapshots include frame stats, quality/DPR, renderer data, and
feature state.

## Validation commands

```bash
npm run test:ci -- src/tests/rendererPerformancePolicy.test.ts src/tests/performanceDiagnostics.test.ts
npm run test:e2e -- --grep "immersive performance diagnostics"
```
