# staging.danielsmith.io zoom afterimage and fallback incident

- **Date:** 2026-05-28
- **Environment:** staging.danielsmith.io on Sugarkube
- **Status:** Corrective patch prepared for deployment validation

## Symptoms

The immersive portfolio initially rendered normally, but mouse-wheel zooming the
orthographic camera caused prior full-scene frames to remain visible. Visitors
could see stacked or duplicated room geometry and trails from old camera
projections instead of a clean scale change.

A key field observation was that setting the in-app motion blur slider to zero
did **not** eliminate the artifact on staging.

## Impact

The staging immersive experience looked corrupted during normal zoom/pan
interactions. The issue risked confusing validation because graphics corruption
could be mistaken for a broader WebGL or performance-failover problem.

## Detection

The bug was detected by manual staging validation of
`/?mode=immersive&disablePerformanceFailover=1` followed by mouse-wheel zooming.
Regression coverage now exercises the same flow in Playwright.

## Root cause

The postprocessing chain always added a Three.js `AfterimagePass` after render
and bloom. The motion blur controller mapped intensity `0` to `damp = 1`, but
Three's afterimage shader preserves more history as `damp` approaches `1` and
clears old pixels when `damp` is `0`. That inverted mapping meant the slider's
zero setting retained stale full-scene feedback instead of disabling motion
blur. The pass also stayed enabled at zero intensity, so it could continue
rendering stale feedback buffers across orthographic camera projection changes.

## Corrective action

- Default immersive rendering now creates the motion blur controller at zero
  intensity so scene-wide afterimage is not active by default.
- Intensity zero now disables the `AfterimagePass`, maps to clearing damp `0`,
  and schedules feedback-history reset.
- Nonzero intensity maps upward toward the configured maximum damp.
- History reset is scheduled when motion blur toggles to/from zero and when the
  orthographic camera zoom/projection or pan changes.
- A narrow `window.portfolio.graphics` test hook exposes motion-blur state and a
  production-safe setter for browser regression tests.

## Regression tests

- Vitest covers disabled zero intensity, invalid/nonfinite clamping, corrected
  damp mapping, toggle-to-zero history clearing, explicit history reset, and
  disposal.
- Playwright covers immersive startup with exactly one canvas, repeated wheel
  zoom in/out with failover disabled, setting motion blur to zero, and toggling
  nonzero blur back to zero without revealing the text fallback.

## Deployment and validation notes

Validate the deployed staging build at
`https://staging.danielsmith.io/?mode=immersive&disablePerformanceFailover=1`.
Confirm the initial render is clean, wheel zooming does not stack previous
camera projections, the motion blur slider at zero remains clean, and returning
from nonzero blur to zero clears residual trails.

Expected validation commands:

```bash
npm run format:write
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e -- --grep "zoom"
npm run smoke
```
