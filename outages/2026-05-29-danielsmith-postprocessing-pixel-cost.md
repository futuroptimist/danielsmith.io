# postprocessing and DPR multiply pixel cost

- **Date:** 2026-05-29
- **Overview:** [staging performance overview](./2026-05-29-danielsmith-staging-performance-overview.md)
- **Status:** Corrective patch prepared for deployment validation

## Symptom slice

Full-screen composer passes and high DPR multiply drawing-buffer pixels during normal zoom/pan, especially on software WebGL.

## Evidence

Code inspection confirmed EffectComposer, RenderPass, UnrealBloomPass, and AfterimagePass were always assembled, while DPR was based on devicePixelRatio up to 2. Diagnostics now report DPR, viewport, drawing-buffer size, bloom state, composer state, and active pass count.

## Impacted files

- `src/main.ts`
- `src/systems/performance/rendererCapabilities.ts`
- `src/systems/performance/immersiveDiagnostics.ts`
- `src/scene/graphics/qualityManager.ts`

## Fix summary

Hardware defaults to balanced quality with a 1.25 DPR cap, software to performance with 0.75 DPR, bloom is disabled in performance mode, and the main loop renders directly when no active postprocessing pass is needed.

## Interaction with other fixes

Lower DPR reduces both main and mirror render cost. Composer disablement combines with adaptive quality and software detection before runtime fallback is considered.

## Regression tests

- `src/tests/rendererCapabilities.test.ts`
- `src/tests/immersiveDiagnostics.test.ts`
- `playwright/immersive-performance.spec.ts`
- `playwright/adaptive-quality.spec.ts`

## Validation commands

```bash
npm run format:write
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e -- --grep "performance|adaptive|immersive"
npm run smoke
```
