# SelfieMirror renders an extra scene too often

- **Date:** 2026-05-29
- **Overview:** [staging performance overview](./2026-05-29-danielsmith-staging-performance-overview.md)
- **Status:** Corrective patch prepared for deployment validation

## Symptom slice

SelfieMirror previously rendered the full scene into a 512x512 render target every animation frame, effectively adding another scene render before the main render.

## Evidence

Code inspection of SelfieMirror found an unconditional render target render called every frame from the main loop. Diagnostics now expose mirror enabled state, target size, update rate, render count, and skipped count.

## Impacted files

- `src/scene/structures/selfieMirror.ts`
- `src/scene/structures/selfieMirrorPolicy.ts`
- `src/main.ts`
- `src/systems/performance/immersiveDiagnostics.ts`

## Fix summary

Mirror rendering is now policy-driven: cinematic nearby updates are throttled, balanced uses a lower update rate and smaller target, distant mirrors are skipped, and performance/adaptive-disabled modes skip mirror rendering entirely.

## Interaction with other fixes

Mirror throttling is one rung in the adaptive ladder and benefits from software/performance quality selection. Diagnostics make its render/skip behavior visible during manual benchmarks.

## Regression tests

- `src/tests/selfieMirror.test.ts`
- `src/tests/selfieMirrorPolicy.test.ts`
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
