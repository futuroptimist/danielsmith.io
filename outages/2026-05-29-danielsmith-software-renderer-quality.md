# Daniel Smith software renderer quality — 2026-05-29

Links back to [performance overview](./2026-05-29-danielsmith-staging-performance-overview.md).

## Symptom slice

The immersive scene could spend multiple seconds below the runtime failover FPS threshold during ordinary desktop interaction, especially on Chrome when hardware acceleration was disabled.

## Evidence

Diagnostics and source inspection confirmed this root cause was plausible and addressed in code: renderer/vendor strings, DPR, drawing-buffer size, postprocessing state, mirror state, quality level, and sampled frame phases are now available from `window.portfolio.performance.getSnapshot()`.

## Impacted files

- `src/main.ts`
- `src/scene/graphics/qualityManager.ts`
- `src/scene/graphics/rendererCapabilities.ts`
- `src/scene/graphics/dprPolicy.ts`
- `src/scene/structures/selfieMirror.ts`
- `src/scene/structures/selfieMirrorPolicy.ts`
- `src/systems/performance/performanceDiagnostics.ts`

## Fix summary

- Software renderer classification starts risky renderers on performance quality.
- DPR is capped explicitly and can be adaptively reduced.
- Composer work is skipped when no active postprocessing pass is enabled.
- Bloom is disabled in performance quality.
- SelfieMirror rendering is throttled, resized, or disabled by quality and renderer capability.
- Sustained low FPS triggers an adaptive downgrade before text fallback.

## Interaction with other fixes

This root cause fix is intentionally coupled with the other 2026-05-29 performance fixes. Lower DPR reduces composer and mirror target cost; mirror throttling reduces render pressure so adaptive quality has a chance to recover; software classification avoids expensive first frames before the failover window accumulates.

## Regression tests

- Unit coverage for renderer classification, DPR clamping, diagnostics aggregation, and mirror policy.
- Playwright immersive performance coverage reads diagnostics after zoom/move interactions and asserts the app remains immersive in the normal CI path.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run test:e2e -- --grep "performance|adaptive|immersive"`
- `npm run smoke`
