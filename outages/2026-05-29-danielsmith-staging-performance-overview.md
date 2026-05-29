# Daniel Smith staging immersive performance overview — 2026-05-29

## Symptom

After the zoom/pan frame-trail rendering bug was fixed, the immersive scene on
`staging.danielsmith.io` still rendered at an observed ~5 FPS and could switch to
the text fallback after a few seconds. The user reproduced the worst behavior in
Chrome on a powerful gaming PC with hardware acceleration disabled.

## Environment

- Staging URL: `https://staging.danielsmith.io/?mode=immersive`.
- Worst confirmed path: Chrome with hardware acceleration disabled, which routes
  WebGL through software renderers such as SwiftShader/llvmpipe/WARP.
- Expected path: normal hardware-accelerated desktop Chrome should remain
  immersive during ordinary zoom/pan and stay above the failover threshold.

## Confirmed root causes

- [Software renderer started on an expensive quality path](./2026-05-29-danielsmith-software-renderer-quality.md).
- [Postprocessing plus DPR multiplied full-screen pixel cost](./2026-05-29-danielsmith-postprocessing-pixel-cost.md).
- [SelfieMirror rendered an extra full scene every animation frame](./2026-05-29-danielsmith-selfie-mirror-render-cost.md).
- [Missing adaptive-quality downgrade before text fallback](./2026-05-29-danielsmith-adaptive-quality-gap.md).

## Disproven or not-yet-confirmed theories

- Per-frame JS update cost is instrumented but not yet confirmed as a dominant
  root cause. Phase timings are now exposed in
  `window.portfolio.performance.getSnapshot().phaseTimings`; no sub-entry was
  created because this patch did not need to remove or rewrite gameplay update
  logic to address the confirmed render-path bottlenecks.
- The original zoom trails were not caused solely by the in-app motion blur
  slider; that was handled in the 2026-05-28 zoom-fallback incident and linked
  here as related context instead of duplicated.

## Fix interaction summary

The fixes reduce expensive work before failover has to intervene. Renderer
classification chooses a safer initial quality for software paths. The DPR policy
bounds the drawing buffer, and the render loop bypasses EffectComposer when bloom
and motion blur are inactive. The mirror policy removes the second scene render
from performance/software paths and throttles it elsewhere. Adaptive quality then
has a non-flapping downgrade ladder before the existing text fallback remains
available for genuinely incapable environments.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run test:e2e -- --grep "performance|adaptive|immersive"`
- `npm run smoke`

## Manual benchmark steps after deploy

1. Open Chrome with hardware acceleration enabled.
2. Visit `https://staging.danielsmith.io/?mode=immersive`.
3. In DevTools, run `window.portfolio.performance.getSnapshot()`.
4. Zoom and pan for at least 10 seconds.
5. Confirm the page remains immersive, exactly one canvas is present, DPR is
   bounded, and frame stats are comfortably above the failover threshold for the
   local machine.
6. Disable Chrome hardware acceleration, restart Chrome, and repeat.
7. Confirm diagnostics classify the software renderer and show performance
   quality, low DPR, disabled bloom/composer extras where possible, and disabled
   or throttled mirror rendering before fallback occurs.

## Before/after metrics

Before this patch, the user-observed software-rendered staging path was around
5 FPS and fell back after a few seconds. Automated CI uses conservative browser
thresholds and asserts the scene remains immersive with diagnostics present;
stronger local hardware numbers should be captured from
`window.portfolio.performance.getSnapshot()` during staging validation.
