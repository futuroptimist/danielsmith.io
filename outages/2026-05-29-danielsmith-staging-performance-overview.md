# danielsmith.io staging immersive-scene performance overview

## Symptom

After the zoom/pan frame-trail corruption was fixed, the immersive scene on
`staging.danielsmith.io` still rendered at roughly 5 FPS by user observation and
switched to the text fallback after a few seconds. The clearest reproduction was
Chrome on a powerful gaming PC with hardware acceleration disabled, which forces
software WebGL.

## Confirmed root causes

- [Software renderer used the expensive default quality path](./2026-05-29-danielsmith-software-renderer-quality.md).
- [Postprocessing and DPR multiplied full-screen pixel cost](./2026-05-29-danielsmith-postprocessing-pixel-cost.md).
- [SelfieMirror rendered the full scene every frame](./2026-05-29-danielsmith-selfie-mirror-render-cost.md).
- [Adaptive quality did not downgrade before text fallback](./2026-05-29-danielsmith-adaptive-quality-gap.md).
- [Text fallback recovery trapped immersive debugging](./2026-05-30-danielsmith-mode-fallback-recovery.md).

## Disproven or unconfirmed theories

- Broad per-frame JavaScript update cost remains unconfirmed as the primary
  outage driver. The code now exposes sampled phase timings for movement,
  avatar/audio, POI/HUD/tooltips, decorative structures, lighting, mirror, and
  main render so future captures can confirm or disprove specific JS buckets.
  The targeted changes focused on confirmed render/pixel/mirror waste.

## Optimization summary

The fix starts risky software renderers in performance mode, defaults normal
desktop rendering to balanced quality, caps DPR to an explicit lower bound, skips
EffectComposer when bloom and motion blur are inactive, disables bloom in
performance mode, throttles or disables SelfieMirror work by quality tier, and
adds a non-flapping adaptive downgrade ladder before low-FPS fallback.

Diagnostics are available in DevTools at:

```js
window.portfolio.performance.getSnapshot();
window.portfolio.performance.getFrameStats();
window.portfolio.performance.getRendererInfo();
window.portfolio.performance.getQualityState();
window.portfolio.performance.getFeatureState();
window.portfolio.performance.getLastFailoverReason();
```

## Manual benchmark steps

1. Open Chrome with hardware acceleration enabled.
2. Visit `https://staging.danielsmith.io/?mode=immersive`.
3. Run `window.portfolio.performance.getSnapshot()` in DevTools.
4. Zoom and pan for at least 10 seconds.
5. Confirm the document remains `data-app-mode="immersive"`, one canvas remains,
   and rolling frame times stay comfortably above the fallback threshold.
6. Repeat with Chrome hardware acceleration disabled.
7. Confirm the snapshot shows a software renderer classification, performance
   quality, DPR clamping, bloom/composer disabled, mirror disabled, and only then
   a fallback if the environment is still incapable.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npx playwright install --with-deps chromium`
- `npm run test:e2e -- --grep "performance|adaptive|immersive"`
- `npm run smoke`

## 2026-05-30 local verification note

- `npm run format:write` completed with no file changes, and `npm run lint`
  completed successfully.
- `npm run test:ci` completed with 128 test files and 841 tests passing.
- `npx playwright install --with-deps chromium` completed, then
  `npm run test:e2e -- --grep "performance|adaptive|immersive"` completed with
  9 passing and 2 skipped tests. The skips are hardware-only normal-desktop
  failover assertions because this container exposes software WebGL; the
  diagnostics path with `disablePerformanceFailover=1` still ran.
- `npm run docs:check` and `npm run smoke` completed successfully after the
  verification note was updated.
- `npm run typecheck` still fails before reaching this PR's targeted immersive
  performance files. Representative unchanged repo-wide errors include the i18n
  `../poi/types` import, `src/main.ts` string-to-`PoiId` calls,
  `src/main.ts` nullable audio node wiring, avatar accessory API shape, GLTF
  loader typing, backyard/LED possibly-undefined samples, POI registry
  `interactionPrompt` requirements, and existing DOM/Canvas/PoiId test mock
  typings. No `src/scene/performance/*`, `src/scene/structures/selfieMirror.ts`,
  or `playwright/immersive-performance.spec.ts` typecheck errors were reported.
- `git fetch origin main` could not run the requested base comparison in this
  checkout because no `origin` remote is configured; the command failed before
  any branch switch or base typecheck could occur.
