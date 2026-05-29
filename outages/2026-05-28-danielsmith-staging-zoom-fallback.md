# staging.danielsmith.io zoom afterimage and fallback incident

- **Date:** 2026-05-28
- **Environment:** staging.danielsmith.io on Sugarkube
- **Status:** Corrective patch prepared for deployment validation

## Symptoms

The immersive portfolio initially rendered normally, but mouse-wheel zooming the
orthographic camera caused prior full-scene frames to remain visible. Visitors
could see stacked or duplicated room geometry and trails from old camera
projections instead of a clean scale change. In production-like staging sessions
with runtime performance failover enabled, normal zoom eventually switched the
immersive scene into the text fallback after roughly 5–10 seconds.

A key field observation was that setting the in-app motion blur slider to zero
did **not** eliminate the artifact on staging.

## Impact

The staging immersive experience looked corrupted during normal zoom/pan
interactions and could exit to the text fallback during otherwise ordinary
browser input. The issue risked confusing validation because graphics corruption
could be mistaken for a broader WebGL or performance-failover problem.

## Detection

The bug was detected by manual staging validation of
`/?mode=immersive&disablePerformanceFailover=1` followed by mouse-wheel zooming,
then reproduced as an immersive-to-text transition in `/?mode=immersive` sessions
where runtime performance failover remained enabled. Regression coverage now
exercises both the clean-render zoom flow and a production-like failover-enabled
zoom flow in Playwright.

## Root cause

The postprocessing chain always added a Three.js `AfterimagePass` after render
and bloom. The motion blur controller mapped intensity `0` to `damp = 1`, but
Three's afterimage shader preserves more history as `damp` approaches `1` and
clears old pixels when `damp` is `0`. That inverted mapping meant the slider's
zero setting retained stale full-scene feedback instead of disabling motion
blur. The pass also stayed enabled at zero intensity, so it could continue
rendering stale feedback buffers across orthographic camera projection changes.
This confirmed the root cause was the AfterimagePass `damp` mapping and the
missing zero-intensity no-op/disable behavior. The observed text fallback was
likely a secondary reaction to sustained low FPS caused by the rendering bug,
not evidence that the runtime failover feature should be removed or weakened.

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
  failover bypass, drives wheel zoom longer than the 5-second low-FPS window,
  and fails on `performancefailover`, `html[data-app-mode="fallback"]`,
  `#app[data-mode="text"]`, console fallback warnings, or duplicate canvases.
- Runtime performance failover remains enabled for genuine sustained low FPS,
  unsupported WebGL, automated clients, explicit text mode, and related
  low-capability cases.

## Regression tests

- Vitest covers disabled zero intensity, invalid/nonfinite clamping, corrected
  damp mapping, toggle-to-zero history clearing, explicit history reset, and
  disposal.
- Vitest performance-failover coverage proves normal FPS for more than five
  seconds never triggers, intermittent low FPS resets when performance recovers,
  sustained very-low FPS triggers, and low-performance transitions dispatch a
  `performancefailover` event with reason `low-performance`.
- Playwright covers immersive startup with exactly one canvas, repeated wheel
  zoom in/out with failover disabled, setting motion blur to zero, motion-blur
  reset telemetry for the stale/duplicated-frame symptom, and toggling nonzero
  blur back to zero without revealing the text fallback.
- Playwright `performance failover runtime zoom coverage` covers a
  production-like `/?mode=immersive` session with runtime failover enabled and
  asserts normal wheel zoom/pan remains immersive for longer than the 5-second
  low-FPS window.

## Deployment and validation notes

Validate the deployed staging build at
`https://staging.danielsmith.io/?mode=immersive&disablePerformanceFailover=1`
and `https://staging.danielsmith.io/?mode=immersive`. Confirm the initial
render is clean, wheel zooming does not stack previous camera projections, the
motion blur slider at zero remains clean, returning from nonzero blur to zero
clears residual trails, and normal zoom does not reveal the text fallback while
runtime failover remains available for genuine low-performance cases.

Expected validation commands:

```bash
npm run format:write
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e -- --grep "zoom"
npm run test:e2e -- --grep "performance failover"
npm run smoke
```
