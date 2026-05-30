# Software renderer crash hardening — 2026-05-30

## Symptom

Forced immersive validation with browser hardware acceleration disabled showed Chrome using
`ANGLE (Microsoft, Microsoft Basic Render Driver ..., D3D11)`. The page correctly entered the
software-renderer performance path, disabled bloom/composer/mirror, and reduced DPR, but the tab
still crashed after several seconds of continuous WebGL rendering.

The same scene on `ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 ..., D3D11)` stayed near 60 FPS and did
not crash.

## Root cause class

The evidence points to dangerous software renderer instability under continuous WebGL animation,
not a normal hardware GPU leak or a monotonic JavaScript heap leak. Microsoft Basic Render Driver,
SwiftShader, WARP, llvmpipe, softpipe, and Mesa offscreen renderer strings are treated as dangerous
software renderers.

## Mitigation

- Dangerous renderers start in software-safe immersive mode instead of full continuous rendering.
- Safe mode uses an ultra-low DPR cap, performance graphics, disabled bloom/composer/mirror, and a
  capped render cadence (15 FPS by default).
- The warning panel explains the software renderer risk and offers:
  - continue in safe immersive;
  - enable continuous immersive anyway;
  - use text mode.
- `?mode=immersive&disablePerformanceFailover=1` still loads immersive mode for debugging, but the
  software-safe guardrails remain active.
- Continuous rendering can be explicitly requested with
  `?mode=immersive&disablePerformanceFailover=1&softwareRendererMode=continuous` or
  `?mode=immersive&disablePerformanceFailover=1&forceContinuousRendering=1`.
- Crash breadcrumbs persist bounded renderer, quality, feature, performance, context-loss, URL, and
  timestamp snapshots in localStorage/sessionStorage. Export them from the console with
  `window.portfolio.performance.exportCrashLog()` or copy them with
  `window.portfolio.performance.copyCrashLog()`.

## Manual validation

1. Disable browser hardware acceleration and open
   `/?mode=immersive&disablePerformanceFailover=1`.
2. Confirm the warning panel names software rendering / Basic Render Driver and offers the three
   actions.
3. Confirm `window.portfolio.performance.getSnapshot().softwareRenderer.softwareSafeMode` is true
   and the render cadence is capped.
4. Reload with `&softwareRendererMode=continuous` and confirm the cadence cap is removed.
5. Confirm `window.portfolio.performance.exportCrashLog()` returns bounded JSON with renderer info
   and recent snapshots after reload.
6. Re-enable browser hardware acceleration and confirm the NVIDIA path is not marked dangerous and
   does not enter software-safe mode.
