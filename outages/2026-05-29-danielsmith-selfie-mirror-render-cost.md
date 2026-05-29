# SelfieMirror doubled scene rendering work

[Back to overview](./2026-05-29-danielsmith-staging-performance-overview.md)

## Symptom slice

SelfieMirror rendered the full scene into a 512x512 render target on every animation frame before the main scene render.

## Evidence

Diagnostics expose mirror enabled state, render target size, update rate, and render count so captures can compare mirror cost by quality tier.

## Impacted files

- `src/main.ts`
- `src/scene/performance/*`
- `src/scene/graphics/qualityManager.ts`
- `src/scene/structures/selfieMirror.ts` where applicable
- `src/systems/failover/performanceFailover.ts` where adaptive reset is needed

## Fix summary

SelfieMirror now has a render policy. It is 512px/15 FPS only in cinematic, 320px/8 FPS in balanced, and disabled in performance or software mode.

## Interaction with other fixes

This fix works with DPR, postprocessing, mirror throttling, diagnostics, and the
adaptive ladder rather than hiding low FPS. If the environment remains too slow
after the cheaper path is applied, normal text fallback still occurs with a clear
last-failover reason.

## Regression tests

src/tests/selfieMirror.test.ts covers throttling, disabling, render target resizing, and render count behavior.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run test:e2e -- --grep "performance|adaptive|immersive"`
- `npm run smoke`
