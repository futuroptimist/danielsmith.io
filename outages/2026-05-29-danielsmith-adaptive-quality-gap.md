# Low FPS went straight to fallback without adaptive downgrade

[Back to overview](./2026-05-29-danielsmith-staging-performance-overview.md)

## Symptom slice

Performance failover watched sustained low FPS, while the adaptive policy either failed to step down before fallback or stepped down too eagerly during startup. Hardware-accelerated staging evidence showed an NVIDIA RTX path stabilized near 60 FPS after warmup, yet transient shader/asset spikes could leave it stuck in performance mode.

## Evidence

Diagnostics expose warmup state, adaptive downgrade/recovery counters, last downgrade/recovery reasons, quality source, renderer classification, and recent median/p95 policy samples. Unit coverage drives warmup, sustained low-FPS, recovery, software-renderer, user-choice, and no-flap paths without requiring real SwiftShader in CI.

## Impacted files

- `src/main.ts`
- `src/scene/performance/*`
- `src/scene/graphics/qualityManager.ts`
- `src/scene/structures/selfieMirror.ts` where applicable
- `src/systems/failover/performanceFailover.ts` where adaptive reset is needed

## Fix summary

The adaptive ladder now applies a finite warmup grace period for normal hardware, requires sustained median/p95 low-FPS evidence before downgrading, ignores isolated low-min-FPS outliers, and recovers an adaptive performance downgrade back to balanced after sustained near-60-FPS stability. Software renderers remain conservative, start in performance mode, and do not auto-upshift unless the user explicitly chooses a higher quality level.

## Interaction with other fixes

This fix works with DPR, postprocessing, mirror throttling, diagnostics, and the
adaptive ladder rather than hiding low FPS. If the environment remains too slow
after the cheaper path is applied, normal text fallback still occurs with a clear
last-failover reason. The Microsoft Basic Render Driver / SwiftShader crash path
remains a separate crash-hardening follow-up.

## Regression tests

src/tests/performanceOptimization.test.ts covers startup warmup, sustained downgrades, normal-hardware recovery, conservative software renderers, explicit user performance choices, and no-flap boundary behavior; performanceFailover reset support keeps fallback available after adaptive steps are exhausted. src/tests/performanceDiagnostics.test.ts covers the expanded adaptive snapshot fields.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run test:e2e -- --grep "performance|adaptive|immersive"`
- `npm run smoke`
