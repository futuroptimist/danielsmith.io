# staging.danielsmith.io immersive performance overview

- **Date:** 2026-05-29
- **Environment:** staging.danielsmith.io; Chrome desktop, including a hardware-acceleration-disabled software WebGL path
- **Status:** Corrective patch prepared for deployment validation
- **Related incident:** [2026-05-28 zoom afterimage and fallback](./2026-05-28-danielsmith-staging-zoom-fallback.md)

## Symptom

After the zoom afterimage/trails fix, staging no longer showed stacked prior
frames during zoom/pan. The immersive scene still performed extremely poorly in
one reported environment: roughly 5 FPS by user observation, then automatic
switching to the text fallback after a few seconds. The most important field
clue was that the reproduction used Chrome with hardware acceleration disabled,
which routes WebGL through a software renderer such as SwiftShader on many
systems.

## Confirmed root causes

- [Software renderer started on expensive quality](./2026-05-29-danielsmith-software-renderer-quality.md)
- [Postprocessing and DPR multiplied pixel cost](./2026-05-29-danielsmith-postprocessing-pixel-cost.md)
- [SelfieMirror rendered an extra full scene every frame](./2026-05-29-danielsmith-selfie-mirror-render-cost.md)
- [Adaptive quality did not run before failover](./2026-05-29-danielsmith-adaptive-quality-gap.md)

## Disproven or unconfirmed theories

- **Per-frame JS work as the primary root cause:** not confirmed in this patch.
  The scene does update many systems every frame, so diagnostics now record broad
  phase timings for input/camera, avatar/audio, POI/HUD, decorative structures,
  lighting, mirror, and main render. The targeted fixes addressed confirmed
  renderer/pixel/mirror/adaptive waste first. If future snapshots show
  decorative or POI/HUD buckets dominating after the render-side fixes, that
  should become a separate incident rather than being conflated here.

## Fix summary and interaction

The patch adds `window.portfolio.performance` diagnostics with renderer/vendor
classification, DPR, drawing-buffer size, quality state, postprocessing state,
mirror policy, adaptive downgrade count, rolling frame stats, sampled phase
timings, and last failover reason. Diagnostics are available even when
`disablePerformanceFailover=1` is used for preview validation.

The default quality path now starts balanced on normal hardware and performance
on known software renderers. DPR caps are explicit and visible: cinematic caps
at 1.5, balanced at 1.25, performance at 1.0, and software renderers at 0.75
before any additional adaptive reductions. Performance/software mode disables
bloom, skips the composer entirely when no postprocessing pass is active, and
turns off the SelfieMirror render.

The fixes compound intentionally: early software classification avoids the first
expensive frames, DPR policy reduces all full-screen work, composer skipping
removes no-op postprocessing overhead, mirror policy removes the hidden second
scene render, and adaptive downgrade gives overloaded sessions a cheaper path
before text fallback remains available for truly incapable environments.

## Manual benchmark steps

1. Open Chrome with hardware acceleration enabled.
2. Visit `https://staging.danielsmith.io/?mode=immersive`.
3. In DevTools, run `window.portfolio.performance.getSnapshot()`.
4. Zoom in/out and pan/move for at least 10 seconds.
5. Confirm the app remains immersive, only one canvas exists, average FPS stays
   above the failover threshold on normal desktop hardware, and no
   `performancefailover` event fires.
6. Repeat with Chrome hardware acceleration disabled.
7. Confirm diagnostics classify the renderer as software where the browser
   exposes that string, quality starts or drops to performance, DPR is capped,
   bloom/composer extras are off, mirror rendering is disabled, and fallback only
   occurs after those reductions still cannot sustain the threshold.

## Validation commands

```bash
npm run format:write
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e -- --grep "performance|adaptive|immersive"
npm run smoke
```
