# Low FPS went straight to fallback without adaptive downgrade

[Back to overview](./2026-05-29-danielsmith-staging-performance-overview.md)

## Symptom slice

Performance failover watched sustained low FPS, but graphics quality did not automatically step down before text fallback. A later staging capture showed the opposite edge case on capable hardware: startup shader/asset warmup could downgrade a normal NVIDIA RTX path from balanced to performance even though it later stabilized near 60 FPS.

## Evidence

Diagnostics expose adaptive downgrade count, recovery count, warmup state, renderer risk, quality source, and last adaptive reasons; unit coverage drives slow-frame and stable-frame updates without requiring real SwiftShader in CI.

## Impacted files

- `src/main.ts`
- `src/scene/performance/*`
- `src/scene/graphics/qualityManager.ts`
- `src/scene/structures/selfieMirror.ts` where applicable
- `src/systems/failover/performanceFailover.ts` where adaptive reset is needed

## Fix summary

An adaptive ladder now lowers quality from cinematic to balanced to performance, then reduces base DPR, resetting failover samples after each adaptive action to prevent premature fallback or flapping. Normal renderers get a finite warmup grace period and rolling median/p95 hysteresis before downgrade; if they remain stable near 60 FPS after an adaptive downgrade, they can recover from performance back to balanced. Software and unknown-risk renderers stay conservative and do not auto-upshift.

## Interaction with other fixes

This fix works with DPR, postprocessing, mirror throttling, diagnostics, and the
adaptive ladder rather than hiding low FPS. If the environment remains too slow
after the cheaper path is applied, normal text fallback still occurs with a clear
last-failover reason.

## Regression tests

src/tests/performanceOptimization.test.ts covers warmup grace, sustained low-FPS downgrade, stable-FPS recovery, software-renderer no-upshift behavior, manual performance selection, the downgrade ladder, and no-flap behavior. performanceFailover reset support keeps fallback available after adaptive steps are exhausted.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run test:e2e -- --grep "performance|adaptive|immersive"`
- `npm run smoke`
