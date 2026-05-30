# Low FPS went straight to fallback without adaptive downgrade

[Back to overview](./2026-05-29-danielsmith-staging-performance-overview.md)

## Symptom slice

Performance failover originally watched sustained low FPS, but graphics quality did
not automatically step down before text fallback. Follow-up staging on May 29,
2026 showed the opposite edge case on good hardware: `ANGLE (NVIDIA, NVIDIA
GeForce RTX 4090 ..., D3D11)` stabilized near 60 FPS after startup, while the
adaptive ladder still reacted to warmup spikes and could leave the session in
performance mode.

## Evidence

Diagnostics expose adaptive warmup state, selection source, downgrade/recovery
counts, and the last adaptive action reason; unit coverage drives slow-frame and
recovery updates without requiring real SwiftShader in CI.

## Impacted files

- `src/main.ts`
- `src/scene/performance/*`
- `src/scene/graphics/qualityManager.ts`
- `src/scene/structures/selfieMirror.ts` where applicable
- `src/systems/failover/performanceFailover.ts` where adaptive reset is needed

## Fix summary

An adaptive ladder lowers quality from cinematic to balanced to performance,
then reduces base DPR, resetting failover samples after each downgrade. Normal
renderers now get a warmup grace period plus sustained-frame hysteresis before
downgrades, and can recover from performance to balanced after a stable
near-60-FPS window. Software renderers stay conservative and do not auto-upshift.

## Interaction with other fixes

This fix works with DPR, postprocessing, mirror throttling, diagnostics, and the
adaptive ladder rather than hiding low FPS. If the environment remains too slow
after the cheaper path is applied, normal text fallback still occurs with a clear
last-failover reason.

## Regression tests

src/tests/performanceOptimization.test.ts covers warmup suppression, sustained
downgrade, stable recovery, software-renderer conservatism, user-selected
quality, and no-flap behavior; performanceFailover reset support keeps fallback
available after adaptive steps are exhausted.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run test:e2e -- --grep "performance|adaptive|immersive"`
- `npm run smoke`
