# nonessential per-frame update work had no performance mode throttle

- **Date:** 2026-05-29
- **Overview:** [staging performance overview](./2026-05-29-danielsmith-staging-performance-overview.md)
- **Status:** Corrective patch prepared for deployment validation

## Symptom slice

Decorative systems, POI/HUD work, lighting, mirror, avatar, audio, and rendering all ran every frame regardless of current quality pressure.

## Evidence

Main-loop inspection showed many decorative structure updates running every frame even when performance mode was needed. The new sampled phase buckets expose broad update costs for input/camera, avatar/audio, POI/HUD, decorative structures, lighting, mirror, and render.

## Impacted files

- `src/main.ts`
- `src/systems/performance/immersiveDiagnostics.ts`
- `src/systems/performance/adaptiveQuality.ts`

## Fix summary

Adaptive quality can throttle decorative updates, and diagnostics record phase timings every tenth frame to identify future bottlenecks without heavy allocation.

## Interaction with other fixes

Decorative throttling is intentionally later in the ladder so gameplay-relevant movement/camera remains responsive and visual reductions happen before update-rate reductions.

## Regression tests

- `src/tests/adaptiveQuality.test.ts`
- `src/tests/immersiveDiagnostics.test.ts`
- `playwright/immersive-performance.spec.ts`

## Validation commands

```bash
npm run format:write
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e -- --grep "performance|adaptive|immersive"
npm run smoke
```
