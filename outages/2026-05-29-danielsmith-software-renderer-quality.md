# Software renderer quality root cause

- **Date:** 2026-05-29
- **Overview:** [staging performance overview](./2026-05-29-danielsmith-staging-performance-overview.md)

## Symptom slice

The reported 5 FPS reproduction used Chrome with hardware acceleration disabled.
That makes software WebGL a likely path, where full-resolution postprocessing and
extra scene renders are much more expensive than on a GPU-backed desktop.

## Evidence

The app previously had no WebGL vendor/renderer diagnostics and always began from
the persisted/default quality path. New diagnostics read
`WEBGL_debug_renderer_info` when available and classify SwiftShader, llvmpipe,
softpipe, software, WARP, and related renderer strings as software.

## Impacted files

- `src/scene/graphics/rendererCapabilities.ts`
- `src/scene/graphics/performancePolicy.ts`
- `src/main.ts`
- `src/tests/rendererPerformancePolicy.test.ts`
- `playwright/adaptive-quality.spec.ts`

## Fix summary

Known software renderers now start in performance quality before the render loop
begins. Their DPR is capped aggressively, bloom is disabled by the performance
preset, composer work is skipped when no passes are active, and mirror rendering
is disabled.

## Interaction with other fixes

Software classification feeds the DPR policy, postprocessing policy, mirror
policy, and adaptive downgrade ladder. It prevents expensive software-only frames
instead of waiting for failover to observe low FPS after the fact.

## Regression tests

Unit tests cover renderer classification and initial quality selection. A
Playwright software override verifies performance quality, low DPR,
software-tier diagnostics, no bloom/composer, and disabled mirror state.

## Validation commands

```bash
npm run test:ci -- src/tests/rendererPerformancePolicy.test.ts
npm run test:e2e -- --grep "adaptive quality"
```
