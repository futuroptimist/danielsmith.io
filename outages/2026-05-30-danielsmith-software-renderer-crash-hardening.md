# Software renderer crash hardening

## Symptom slice

Chrome tabs crashed after several seconds when hardware acceleration was disabled and WebGL reported `ANGLE (Microsoft, Microsoft Basic Render Driver ..., D3D11)`. The same scene stayed stable at about 60 FPS on `ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 ..., D3D11)` with hardware acceleration enabled.

## Evidence

Forced immersive debug runs showed the app correctly identified the Microsoft Basic Render Driver as software rendering. Adaptive quality reached performance mode, DPR dropped to about 0.56, bloom/composer and the selfie mirror were disabled, JS phase timings stayed small, and `mainRender` dominated the frame cost. JS heap readings fluctuated without a monotonic leak trend, pointing to software renderer instability under continuous WebGL animation rather than an application memory leak.

## Root cause class

Known CPU/software WebGL paths such as Microsoft Basic Render Driver, SwiftShader, WARP, and llvmpipe can be unstable under continuous immersive rendering even after expensive scene features are disabled.

## Mitigation

Dangerous software renderers now enter software-safe immersive guardrails by default: ultra-low DPR, no bloom/composer extras, no mirror rendering, and a capped render cadence that still paints the first frame and responds to user input. The forced debug URL `?mode=immersive&disablePerformanceFailover=1` still bypasses immediate text fallback, but it keeps these guardrails unless `softwareRendererMode=continuous` is added for explicit investigation.

A visible warning explains that Chrome is using software rendering / Basic Render Driver, recommends enabling browser hardware acceleration, and offers safe immersive, continuous immersive, and text-mode choices. Crash breadcrumbs persist bounded renderer, quality, diagnostic, memory, warning, URL, and WebGL context-loss data to storage and are retrievable through `window.portfolio.performance.exportCrashLogJson()` or `copyCrashLog()`.

## Manual validation steps

1. Disable Chrome hardware acceleration and open `http://localhost:5173/?mode=immersive&disablePerformanceFailover=1`.
2. Confirm the software-renderer warning appears and the scene remains in safe immersive mode.
3. Run `window.portfolio.performance.getSnapshot()` and verify `dangerousRenderer` and `softwareSafeMode` are true.
4. Run `window.portfolio.performance.exportCrashLogJson()` and verify bounded breadcrumbs include renderer warning details.
5. Add `&softwareRendererMode=continuous` only when debugging continuous software rendering.
6. Re-enable hardware acceleration and confirm the NVIDIA path does not enter software-safe mode.

## Regression tests

- Unit tests cover dangerous renderer classification, ultra-low safe policy, cadence override behavior, and bounded crash log serialization.
- Diagnostics tests assert snapshots include dangerous-renderer and software-safe state.
- Playwright mocks a Basic Render Driver classification to verify the warning, force-immersive safe path, and crash-log export helper without depending on CI hardware.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run test:e2e -- --grep "software|crash|renderer|immersive"`
- `npm run docs:check`
- `npm run smoke`
