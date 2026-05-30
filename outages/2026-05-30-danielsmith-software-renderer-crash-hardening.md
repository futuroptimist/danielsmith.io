# danielsmith.io software-renderer crash hardening

- **Date:** 2026-05-30
- **Environment:** local forced-immersive Chrome with hardware acceleration off
- **Status:** Mitigation prepared for deployment validation

## Symptoms

Forced immersive validation with Chrome hardware acceleration disabled selected
`ANGLE (Microsoft, Microsoft Basic Render Driver ..., D3D11)`. The app correctly
identified a software renderer, downgraded to performance quality, reduced DPR
to roughly 0.56, disabled bloom/composer/mirror work, and kept runtime text
failover disabled for the debug run. JavaScript phase timings stayed tiny while
`mainRender` dominated the frame budget, and JS heap movement did not show a
clear monotonic leak. Even with those reductions, the Chrome tab crashed after
several seconds.

The same machine with hardware acceleration enabled selected
`ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 ..., D3D11)`, stayed near 60 FPS, and
did not crash.

## Root cause class

The evidence points to dangerous software/CPU WebGL renderer instability under
continuous animation rather than a general memory leak or a normal hardware GPU
path bug. The risky class now includes Microsoft Basic Render Driver,
SwiftShader, WARP, llvmpipe, softpipe, Mesa offscreen, and other strings already
covered by the software-renderer classifier.

## Mitigation

- Dangerous software renderers are classified separately from ordinary hardware
  and unknown renderers.
- Forced immersive debug URLs still load the immersive scene, but dangerous
  software renderers start in software-safe immersive mode by default.
- Software-safe immersive mode starts at ultra-low DPR, disables expensive
  post-processing and mirror rendering, and caps render cadence to 12 FPS while
  still rendering the first frame and responding to user input for screenshots
  and debugging.
- A visible warning explains that Chrome is using software rendering / Basic
  Render Driver, recommends enabling browser hardware acceleration, and offers
  actions to continue safely, opt into continuous rendering anyway, or switch to
  text mode.
- Continuous software rendering is available only through an explicit debug
  override: `?softwareRendererMode=continuous` or `?forceContinuousRendering=1`.
- Crash breadcrumbs persist to bounded browser storage (`localStorage`, with
  `sessionStorage` as the browser fallback when local writes fail, even when
  `localStorage` is passed explicitly). Exports choose the newest readable log
  across providers so stale local entries cannot hide newer fallback writes.
  `window.portfolio.performance.exportCrashLog()` exports that bounded JSON;
  `copyCrashLog()` copies it when Clipboard API access is available.
- `webglcontextlost` records an immediate breadcrumb before switching to the
  recoverable text fallback, while preserving the existing “Try immersive
  again” path and crash-log export helper after cleanup.

## Manual validation

1. Disable browser hardware acceleration and launch Chrome.
2. Open `/?mode=immersive&disablePerformanceFailover=1`.
3. Confirm the page remains immersive, shows the software-renderer warning, and
   reports `softwareRendererPolicy.safeMode === true` from
   `window.portfolio.performance.getSnapshot()`.
4. Export `window.portfolio.performance.exportCrashLog()` and confirm it includes
   renderer info, software-safe state, snapshots, URL, and timestamps; reload and
   confirm the bounded log can still be exported from browser storage.
5. Open `/?mode=immersive&disablePerformanceFailover=1&softwareRendererMode=continuous`
   only for short debugging runs and confirm the snapshot reports continuous
   mode.
6. Re-enable browser hardware acceleration, open the normal forced-immersive URL,
   and confirm the NVIDIA path remains continuous and is not forced into
   software-safe mode.

## Expected validation commands

```bash
npm run format:write
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e -- --grep "software|crash|renderer|immersive"
npm run docs:check
npm run smoke
```
