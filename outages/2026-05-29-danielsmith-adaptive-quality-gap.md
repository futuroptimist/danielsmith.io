# Low FPS went straight to fallback without adaptive downgrade

[Back to overview](./2026-05-29-danielsmith-staging-performance-overview.md)

## Symptom slice

Performance failover watched sustained low FPS, but graphics quality did not automatically step down before text fallback.

## Evidence

Diagnostics expose adaptive downgrade count and last adaptive reason; unit coverage drives slow-frame updates without requiring real SwiftShader in CI.

## Impacted files

- `src/main.ts`
- `src/scene/performance/*`
- `src/scene/graphics/qualityManager.ts`
- `src/scene/structures/selfieMirror.ts` where applicable
- `src/systems/failover/performanceFailover.ts` where adaptive reset is needed

## Fix summary

An adaptive ladder now lowers quality from cinematic to balanced to performance, then reduces base DPR, resetting failover samples after each downgrade to prevent premature fallback or flapping.

## Interaction with other fixes

This fix works with DPR, postprocessing, mirror throttling, diagnostics, and the
adaptive ladder rather than hiding low FPS. If the environment remains too slow
after the cheaper path is applied, normal text fallback still occurs with a clear
last-failover reason.

## Regression tests

src/tests/performanceOptimization.test.ts covers the downgrade ladder and no-flap behavior; performanceFailover reset support keeps fallback available after adaptive steps are exhausted.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run test:e2e -- --grep "performance|adaptive|immersive"`
- `npm run smoke`
