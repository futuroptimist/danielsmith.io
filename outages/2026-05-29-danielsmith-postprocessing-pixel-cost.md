# Postprocessing and DPR multiplied pixel cost

[Back to overview](./2026-05-29-danielsmith-staging-performance-overview.md)

## Symptom slice

The renderer capped DPR at 2, cinematic quality used full scale, and EffectComposer stayed active even when no visual pass was needed.

## Evidence

Diagnostics expose DPR, drawing-buffer size, bloom state, composer state, and active pass count. Tests assert DPR policy and feature state expectations.

## Impacted files

- `src/main.ts`
- `src/scene/performance/*`
- `src/scene/graphics/qualityManager.ts`
- `src/scene/structures/selfieMirror.ts` where applicable
- `src/systems/failover/performanceFailover.ts` where adaptive reset is needed

## Fix summary

The default desktop path now starts balanced with a 1.25 DPR cap. Performance quality disables bloom, and the main loop bypasses composer entirely when bloom and motion blur are inactive.

## Interaction with other fixes

This fix works with DPR, postprocessing, mirror throttling, diagnostics, and the
adaptive ladder rather than hiding low FPS. If the environment remains too slow
after the cheaper path is applied, normal text fallback still occurs with a clear
last-failover reason.

## Regression tests

src/tests/performanceOptimization.test.ts covers DPR clamping; playwright/immersive-performance.spec.ts asserts the runtime DPR cap and composer/bloom state.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run test:e2e -- --grep "performance|adaptive|immersive"`
- `npm run smoke`
