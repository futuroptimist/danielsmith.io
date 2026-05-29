# staging.danielsmith.io zoom afterimage and fallback incident

- **Date:** 2026-05-28
- **Environment:** staging.danielsmith.io on Sugarkube
- **Component:** immersive Three.js renderer and postprocessing chain
- **Status:** Corrective patch prepared on 2026-05-29

## Symptoms

The immersive scene loaded normally at first, but mouse-wheel zooming caused previous
full-scene orthographic frames to remain visible. Users saw stacked or duplicated room
geometry, as if old camera projections were composited over the current frame.

## Impact

The corruption made normal zoom and pan interactions visually unreliable in staging and
could make the immersive experience appear broken. The text fallback itself was not removed,
but zoom-related rendering instability increased the risk of users interpreting the
experience as failed.

## Detection

A user reproduced the issue on staging.danielsmith.io while exercising normal mouse-wheel
zoom. The key observation was that setting the in-app motion blur slider to zero did **not**
eliminate the duplicated-frame symptom, proving the issue was not just an overly aggressive
default slider value.

## Root cause

The renderer always added Three.js `AfterimagePass` after the render and bloom passes. The
motion blur controller inverted `AfterimagePass` semantics: intensity `0` mapped to damp `1`,
but `AfterimageShader` multiplies the old frame by `damp` and composites `max(new, old)`, so
`damp: 1` preserves old bright scene pixels instead of clearing them. The pass also remained
active at zero intensity, so stale feedback buffers could continue participating after users
turned motion blur off.

Orthographic zoom and camera projection changes made the stale feedback obvious because old
full-scene projections no longer aligned with the new camera scale.

## Corrective action

- Corrected motion blur damp mapping so intensity `0` maps to `damp: 0`.
- Disabled the afterimage pass when effective intensity is zero.
- Added feedback-history reset behavior for zero-intensity transitions and camera changes.
- Removed the afterimage pass from the default `EffectComposer` path so the default immersive
  renderer keeps bloom but does not apply scene-wide feedback by default.
- Changed the accessibility preset manager's default base motion blur intensity to `0`, while
  preserving persisted user preferences and the slider state.

## Regression tests

- Vitest coverage now verifies zero-intensity no-op behavior, finite clamping, corrected damp
  mapping, history resets, and nonzero-to-zero toggles for `createMotionBlurController`.
- Playwright coverage loads `/?mode=immersive&disablePerformanceFailover=1`, asserts the
  immersive canvas remains active, dispatches repeated wheel zoom events, verifies the text
  fallback is not exposed, and confirms zero motion blur stays disabled with `damp: 0`.

## Deployment and validation notes

Validate the staging deployment with the immersive override URL:

```bash
npm run format:write
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e -- --grep "zoom"
npm run smoke
```

Manual validation should load
`https://staging.danielsmith.io/?mode=immersive&disablePerformanceFailover=1`, zoom in and
out with the mouse wheel, set the motion blur slider to zero, and repeat the zoom sequence.
Expected result: a single clean immersive canvas with no retained prior scene projections and
no unintended text fallback.
