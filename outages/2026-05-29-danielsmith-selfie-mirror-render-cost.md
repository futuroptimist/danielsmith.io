# SelfieMirror render-cost root cause

- **Date:** 2026-05-29
- **Overview:** [staging performance overview](./2026-05-29-danielsmith-staging-performance-overview.md)

## Symptom slice

The SelfieMirror rendered the whole scene into a 512x512 render target every
animation frame, then the main camera rendered the scene again. That hidden second
scene render is disproportionate in software mode and wasteful when the mirror is
not near/important.

## Evidence

Code inspection confirmed `selfieMirror.render(renderer, scene)` ran every frame
with a fixed 512x512 target. New diagnostics expose mirror enabled/disabled
state, target size, update rate, and render count.

## Impacted files

- `src/scene/structures/selfieMirror.ts`
- `src/scene/graphics/performancePolicy.ts`
- `src/systems/performance/performanceDiagnostics.ts`
- `src/main.ts`
- `src/tests/selfieMirror.test.ts`
- `src/tests/rendererPerformancePolicy.test.ts`

## Fix summary

Mirror rendering is now policy-driven. Cinematic mode throttles to 15 FPS at
512px, balanced throttles to 8 FPS at 256px, performance mode disables mirror
renders at a 128px target, software renderers disable mirror renders, and distant
players do not update the mirror until they are back in range.

## Interaction with other fixes

The mirror policy consumes the same renderer classification and quality level as
DPR/postprocessing. Adaptive downgrades to performance also disable mirror work,
removing an entire extra scene render before text fallback is considered.

## Regression tests

Unit tests cover mirror policy for cinematic, balanced, performance, software,
and distance states. SelfieMirror tests verify render-target resizing and render
count diagnostics.

## Validation commands

```bash
npm run test:ci -- src/tests/selfieMirror.test.ts src/tests/rendererPerformancePolicy.test.ts
npm run test:e2e -- --grep "performance|adaptive"
```
