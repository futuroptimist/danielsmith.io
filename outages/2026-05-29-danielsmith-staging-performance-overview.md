# staging.danielsmith.io immersive performance overview

- **Date:** 2026-05-29
- **Environment:** staging.danielsmith.io, Chrome desktop, including a repro
  with Chrome hardware acceleration disabled
- **Status:** Corrective patch prepared for deployment validation

## Symptom

After the May 28 zoom afterimage fix removed stacked frame trails, the
immersive scene still ran at roughly 5 FPS by user observation and switched to
non-immersive text fallback after a few seconds. The issue reproduced on a
powerful gaming PC when Chrome hardware acceleration was disabled. The scene is
simple enough that hardware-accelerated desktop browsers should remain
immersive during normal zoom/pan, while software-rendered paths should reduce
quality before giving up.

## Confirmed root-cause sub-entries

- [Software renderer starts too expensive](./2026-05-29-danielsmith-software-renderer-quality.md)
- [Postprocessing and DPR multiply pixel cost](./2026-05-29-danielsmith-postprocessing-pixel-cost.md)
- [Selfie mirror doubles scene render work](./2026-05-29-danielsmith-selfie-mirror-render-cost.md)
- [Nonessential per-frame update cost](./2026-05-29-danielsmith-per-frame-update-cost.md)
- [Missing adaptive quality before fallback](./2026-05-29-danielsmith-adaptive-quality-gap.md)

## Disproven or bounded theories

- **Text fallback removal as a fix:** rejected. Fallback is still required for
  unsupported WebGL, automated clients, console-error budgets, and truly
  incapable devices.
- **Threshold-only fix:** rejected. The runtime threshold remains 30 FPS; the
  patch reduces real rendering/update work and adds a downgrade ladder before
  text fallback.
- **Motion blur as the only cause:** bounded by the May 28 outage. Afterimage
  trails were fixed separately, but slow software-rendered sessions remained.

## Optimization summary

- WebGL vendor/renderer diagnostics now classify software and risky renderers.
- Hardware paths default to balanced quality with an explicit 1.25 DPR cap;
  software paths start in performance quality with a 0.75 DPR cap.
- Composer rendering is skipped when bloom and motion blur are inactive, so
  performance mode avoids no-op full-screen passes.
- SelfieMirror rendering is throttled by quality level and distance, reduced to
  a smaller target outside cinematic quality, and disabled in performance mode.
- Broad sampled phase timings expose input/camera, avatar/audio, POI/HUD,
  decorative, lighting, mirror, and render buckets without per-frame heavy
  allocations.
- Adaptive quality tries quality reduction, DPR reduction, postprocessing
  disablement, mirror throttle/disablement, and decorative throttling before
  runtime text fallback can proceed.

## Diagnostics

Use the production-safe console hook:

```js
window.portfolio.performance.getSnapshot();
window.portfolio.performance.getFrameStats();
window.portfolio.performance.getRendererInfo();
window.portfolio.performance.getQualityState();
window.portfolio.performance.getFeatureState();
window.portfolio.performance.getLastFailoverReason();
```

The snapshot includes FPS/frame statistics, DPR, viewport and drawing-buffer
sizes, renderer strings, quality/adaptive state, bloom/composer state, mirror
state, phase timings, and the last failover reason.

## Manual benchmark steps

1. Open `https://staging.danielsmith.io/?mode=immersive` in Chrome with
   hardware acceleration enabled.
2. Open DevTools and capture
   `window.portfolio.performance.getSnapshot()` after the first frame.
3. Zoom and pan for at least 10 seconds.
4. Confirm `document.documentElement.dataset.appMode === "immersive"`, exactly
   one `#app canvas` exists, and the rolling FPS stays comfortably above the
   30 FPS failover threshold on normal hardware.
5. Repeat with Chrome hardware acceleration disabled.
6. Confirm quality drops to performance, DPR/postprocessing/mirror work reduces
   before fallback, and `getSnapshot()` explains any final fallback.

## Validation commands

```bash
npm run format:write
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e -- --grep "performance|adaptive|immersive"
npm run smoke
```
