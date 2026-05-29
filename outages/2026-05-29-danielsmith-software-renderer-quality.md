# Software renderer defaulted to expensive quality

[Back to overview](./2026-05-29-danielsmith-staging-performance-overview.md)

## Symptom slice

Chrome with hardware acceleration disabled used software WebGL while the app still began on a high-cost graphics path.

## Evidence

Renderer diagnostics now read WEBGL_debug_renderer_info when available and classify SwiftShader, llvmpipe, WARP, and other software strings. Unit coverage verifies the classification and startup policy.

## Impacted files

- `src/main.ts`
- `src/scene/performance/*`
- `src/scene/graphics/qualityManager.ts`
- `src/scene/structures/selfieMirror.ts` where applicable
- `src/systems/failover/performanceFailover.ts` where adaptive reset is needed

## Fix summary

Software renderers now start in performance mode before the first expensive frames, cap DPR at 1, disable bloom/composer extras, and disable mirror rendering.

## Interaction with other fixes

This fix works with DPR, postprocessing, mirror throttling, diagnostics, and the
adaptive ladder rather than hiding low FPS. If the environment remains too slow
after the cheaper path is applied, normal text fallback still occurs with a clear
last-failover reason.

## Regression tests

src/tests/performanceOptimization.test.ts covers software classification and startup policy; Playwright reads window.portfolio.performance diagnostics during immersive interaction.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run test:e2e -- --grep "performance|adaptive|immersive"`
- `npm run smoke`
