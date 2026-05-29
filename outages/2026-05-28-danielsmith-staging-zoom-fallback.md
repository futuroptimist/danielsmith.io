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
could be mistaken for a broader WebGL or performance-failover problem. In a
production-like session with runtime performance failover enabled, the sustained
rendering slowdown could also switch the visitor into the text fallback after
roughly 5-10 seconds of normal zooming.

## Detection

The bug was detected by manual staging validation of
`/?mode=immersive&disablePerformanceFailover=1` followed by mouse-wheel zooming.
A related production-like check uses `/?mode=immersive` without the failover
bypass so runtime performance failover remains active while zoom/pan behavior is
exercised beyond the 5,000 ms low-FPS window.

## Root cause

The postprocessing chain always added a Three.js `AfterimagePass` after render
and bloom. The motion blur controller mapped intensity `0` to `damp = 1`, but
Three's afterimage shader preserves more history as `damp` approaches `1` and
clears old pixels when `damp` is `0`. That inverted mapping meant the slider's
zero setting retained stale full-scene feedback instead of disabling motion
blur. The pass also stayed enabled at zero intensity, so it could continue
rendering stale feedback buffers across orthographic camera projection changes.
This confirmed the root cause was the AfterimagePass `damp` mapping and the
missing zero-intensity no-op/disable behavior. The text fallback was likely
reacting correctly to sustained low FPS caused by that rendering bug, so the
failover feature remains enabled for genuine low-performance conditions.

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
- Production-like performance-failover coverage now loads `/?mode=immersive`
  without `disablePerformanceFailover=1`, records `performancefailover` events,
  zooms beyond the low-FPS window, and asserts the page remains immersive with a
  single canvas.
- The runtime failover path remains active for real low-performance sessions,
  explicit text mode, unsupported WebGL, automated clients, and scraper/data
  saver routes.

## Regression tests

- Vitest covers disabled zero intensity, invalid/nonfinite clamping, corrected
  damp mapping, toggle-to-zero history clearing, explicit history reset, and
  disposal.
- Playwright covers immersive startup with exactly one canvas, repeated wheel
  zoom in/out with failover disabled, setting motion blur to zero, motion-blur
  reset telemetry for the stale/duplicated-frame symptom, and toggling nonzero
  blur back to zero without revealing the text fallback.
- `playwright/performance-failover-zoom.spec.ts` covers a production-like
  immersive session with runtime failover enabled and fails on a
  `performancefailover` event, text fallback, fallback app mode, or extra
  canvases while normal wheel zoom runs for more than 5,000 ms.
- `src/tests/performanceFailover.test.ts` covers normal FPS beyond the failover
  window, intermittent low FPS recovery, sustained very-low-FPS fallback, and
  the `performancefailover` event reason `low-performance`.

## Deployment and validation notes

Validate the deployed staging build at
`https://staging.danielsmith.io/?mode=immersive&disablePerformanceFailover=1`.
Confirm the initial render is clean, wheel zooming does not stack previous
camera projections, the motion blur slider at zero remains clean, and returning
from nonzero blur to zero clears residual trails. Then validate
`https://staging.danielsmith.io/?mode=immersive` without the bypass to confirm
normal zoom/pan remains immersive while runtime failover is still available for
real low-performance sessions.

Expected validation commands:

```bash
npm run format:write
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e -- --grep "performance failover"
npm run smoke
```
