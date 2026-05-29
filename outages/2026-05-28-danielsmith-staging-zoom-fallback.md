# staging.danielsmith.io zoom afterimage and fallback incident

- **Date:** 2026-05-28
- **Environment:** staging.danielsmith.io on Sugarkube
- **Status:** Fixed in this changeset; pending staging deployment and validation.

## Symptoms

Wheel zoom in the immersive orthographic scene initially rendered a normal room, then retained prior
full-scene projections as the camera zoom changed. The result looked like duplicated geometry,
stacks of old frames, and scene-wide trails instead of a clean orthographic scale change.

A key reproduction detail was that manually setting the in-app motion blur slider to zero on staging
did **not** eliminate the corruption, so the issue was not limited to a nonzero default preference.

## Impact

Visitors using the immersive staging preview could see persistent afterimages while zooming or
panning. This made the scene appear graphically corrupted and risked confusion with performance
fallback behavior during validation.

## Detection

The issue was reported from manual staging validation of
`/?mode=immersive&disablePerformanceFailover=1`, then reproduced by repeated mouse-wheel zooming.
The motion blur slider was also set to zero during reproduction to confirm the old-frame persistence
continued with the control in the off position.

## Root cause

`createMotionBlurController` inverted Three.js `AfterimagePass` damp semantics. The shader multiplies
old pixels by `damp`, so `damp = 0` clears history and higher values preserve more old frames. The
previous controller mapped intensity `0` to `damp = 1`, leaving an active full-screen feedback pass in
its most persistent state. The pass also remained enabled at zero intensity, so stale feedback buffers
continued to render even when the UI displayed motion blur as off.

The standard accessibility preset also applied nonzero scene-wide afterimage by default, making normal
camera projection changes more likely to expose old full-scene frames.

## Corrective action

- Remapped motion blur intensity directly to afterimage damp (`0 => 0`, `1 => maxDamp`).
- Disabled the afterimage pass entirely at intensity zero.
- Added feedback-target clearing when motion blur is disabled, re-enabled, resized, zoomed, or panned.
- Changed the default base motion blur preference to off while preserving the optional slider for
  visitors who explicitly choose trails.
- Added a small graphics debug API so browser tests can assert that zero intensity is a true no-op.

## Regression tests

- Vitest coverage now asserts zero intensity disables the pass, invalid values clamp safely, damp
  mapping is not inverted, and toggling to zero clears feedback history.
- Playwright zoom coverage loads `/?mode=immersive&disablePerformanceFailover=1`, verifies the app
  stays immersive with a single canvas, performs repeated wheel zooms, sets motion blur to zero via
  the production-safe graphics API, and repeats the zoom sequence without falling back to text mode.

## Deployment and validation notes

Validate staging after deployment with:

```bash
npm run format:write
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e -- --grep "zoom"
npm run smoke
```

Then open `https://staging.danielsmith.io/?mode=immersive&disablePerformanceFailover=1`, perform
repeated wheel zoom-in/zoom-out gestures, set motion blur to zero, and repeat the zoom sequence. The
scene should remain immersive and each zoomed frame should render cleanly without retained prior
projections.
