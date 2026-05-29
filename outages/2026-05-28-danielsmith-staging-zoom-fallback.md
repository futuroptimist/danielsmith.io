# staging.danielsmith.io zoom afterimage and fallback incident

- **Date:** 2026-05-28
- **Environment:** staging.danielsmith.io on Sugarkube
- **Status:** Corrective patch prepared for deployment validation

## Symptoms

The immersive portfolio initially rendered normally, but mouse-wheel zooming the
orthographic camera caused prior full-scene frames to remain visible. Visitors
could see stacked or duplicated room geometry and trails from old camera
projections instead of a clean scale change. After roughly 5-10 seconds of
normal zoom/pan interaction, staging could also switch from immersive mode into
the text fallback.

A key field observation was that setting the in-app motion blur slider to zero
did **not** eliminate the artifact on staging.

## Impact

The staging immersive experience looked corrupted during normal zoom/pan
interactions and could become unavailable when runtime failover replaced the
canvas with the text experience. The issue risked confusing validation because
graphics corruption could be mistaken for unsupported WebGL or a broken
failover policy.

## Detection

The bug was detected by manual staging validation of
`/?mode=immersive&disablePerformanceFailover=1` followed by mouse-wheel zooming
and by observing production-like staging sessions fall back to text after the
zoom corruption persisted. Regression coverage now exercises both the bypassed
zoom path and `/?mode=immersive` with runtime failover enabled in Playwright.

## Root cause

The postprocessing chain always added a Three.js `AfterimagePass` after render
and bloom. The motion blur controller mapped intensity `0` to `damp = 1`, but
Three's afterimage shader preserves more history as `damp` approaches `1` and
clears old pixels when `damp` is `0`. That inverted mapping meant the slider's
zero setting retained stale full-scene feedback instead of disabling motion
blur. The pass also stayed enabled at zero intensity, so it could continue
rendering stale feedback buffers across orthographic camera projection changes.
This confirmed the root cause was the AfterimagePass `damp` mapping and the
missing zero-intensity no-op/disable behavior. The text fallback was likely a
secondary reaction to sustained low FPS caused by the rendering bug rather than
a reason to remove or weaken genuine performance failover.

## Corrective action

- Default immersive rendering now creates the motion blur controller at zero
  intensity so scene-wide afterimage is not active by default.
- Intensity zero now disables the `AfterimagePass`, maps to clearing damp `0`,
  and schedules feedback-history reset.
- Nonzero intensity maps upward toward the configured maximum damp.
- History reset is scheduled when motion blur toggles to/from zero, when the
  orthographic camera zoom/projection changes, and at camera-pan start/release
  boundaries so continuous pan does not clear every frame.
- A narrow `window.portfolio.graphics` test hook exposes motion-blur state and a
  production-safe setter for browser regression tests.
- Production-like regression coverage now loads `/?mode=immersive` without the
  failover bypass, drives wheel zoom longer than the 5000 ms low-FPS window,
  and fails on `performancefailover`, fallback mode, text mode, or duplicate
  canvases.
- Runtime failover remains enabled for genuine low performance, unsupported
  WebGL, automated clients, and explicit text mode.

## Regression tests

- Vitest covers disabled zero intensity, invalid/nonfinite clamping, corrected
  damp mapping, toggle-to-zero history clearing, explicit history reset, and
  disposal.
- `src/tests/performanceFailover.test.ts` proves normal FPS for more than five
  seconds never triggers failover, intermittent low FPS resets the timer,
  sustained very-low FPS triggers fallback, and low-performance transitions
  dispatch a `performancefailover` event with reason `low-performance`.
- `playwright/performance-failover-zoom.spec.ts` covers immersive startup with
  runtime performance failover enabled, zoom in/out for longer than the 5000 ms
  failover window, no `performancefailover` event, no fallback/text mode, and
  exactly one canvas.
- Existing Playwright zoom coverage still checks repeated wheel zoom in/out with
  failover disabled, setting motion blur to zero, motion-blur reset telemetry
  for the stale/duplicated-frame symptom, and toggling nonzero blur back to zero
  without revealing the text fallback.

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
npm run test:e2e -- --grep "performance failover"
npm run test:e2e -- --grep "zoom"
npm run smoke
```
