# Software renderer crash hardening

## Symptom

On May 30, 2026, forced immersive testing with Chrome hardware acceleration
disabled showed the renderer string
`ANGLE (Microsoft, Microsoft Basic Render Driver ..., D3D11)`. The app correctly
identified the path as software rendered, lowered quality to performance mode,
reduced DPR to roughly `0.56`, disabled bloom/composer work, and disabled the
mirror, yet the Chrome tab still crashed after several seconds.

The same scene on the same workstation with browser hardware acceleration
enabled reported `ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 ..., D3D11)`, held
near 60 FPS, and did not crash.

## Evidence

- Software-renderer logs showed low JavaScript phase timings while `mainRender`
  dominated frame cost.
- JS heap readings fluctuated but did not show a clear monotonic leak.
- The crash reproduced only on the Microsoft Basic Render Driver path, not the
  NVIDIA hardware path.

## Root cause class

The failure is treated as dangerous software-renderer instability under
continuous WebGL animation. Microsoft Basic Render Driver, SwiftShader, WARP,
llvmpipe, softpipe, and Mesa offscreen strings are classified as dangerous
software renderers.

## Mitigation

Dangerous renderers now enter software-safe immersive mode unless the URL
explicitly opts into continuous rendering:

- `?mode=immersive&disablePerformanceFailover=1` still loads immersive mode for
  debugging, but applies software-safe guardrails.
- `softwareRendererMode=safe` keeps ultra-low DPR, disables expensive features,
  and caps the render cadence.
- `softwareRendererMode=continuous` is the explicit debugging override for full
  continuous animation on dangerous software renderers.

The warning UI explains that Chrome is using a software renderer / Basic Render
Driver, recommends enabling browser hardware acceleration, and offers safe
immersive, continuous immersive, or text mode choices.

Crash breadcrumbs are persisted to localStorage/sessionStorage with bounded ring
buffers. Use `window.portfolio.performance.exportCrashLog()` to retrieve JSON or
`window.portfolio.performance.copyCrashLog()` to copy it when clipboard access is
available. Breadcrumbs include recent diagnostics snapshots, renderer info,
quality/adaptive state, WebGL context loss events, JS memory when available, the
page URL, timestamps, and the last renderer warning.

## Manual validation

1. Disable Chrome hardware acceleration and open
   `http://localhost:5173/?mode=immersive&disablePerformanceFailover=1`.
2. Confirm the software-renderer warning is visible and the scene reaches first
   frame without immediate text fallback.
3. Run `window.portfolio.performance.getSnapshot()` and confirm
   `dangerousRenderer: true`, `softwareSafeMode: "safe"`, no mirror, no bloom,
   and a capped render cadence.
4. Run `window.portfolio.performance.exportCrashLog()` and confirm the renderer
   warning and snapshots are present after reload.
5. For a deliberate high-risk debug run, append
   `&softwareRendererMode=continuous` and confirm the snapshot reports
   `softwareSafeMode: "continuous"`.
6. Re-enable hardware acceleration and confirm the NVIDIA path reports
   `dangerousRenderer: false` and is not forced into software-safe mode.
