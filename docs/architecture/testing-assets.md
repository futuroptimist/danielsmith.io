# Testing and asset automation

This guide captures how automated checks validate the immersive scene and how
auto-generated artifacts stay up to date.

## Test suites

| Suite                    | Location                     | Command                             | Notes                                                                                                                                          |
| ------------------------ | ---------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit & integration tests | `src/tests/` (Vitest)        | `npm run test:ci`                   | Run with `CI=1` locally to mirror pipeline timeouts and disable watch mode.                                                                    |
| End-to-end + visual      | `playwright/` (Playwright)   | `npm run test:e2e`                  | Uses the same immersive URL overrides as production. Set `CI=1` to lock workers to 1 for deterministic WebGL boot.                             |
| Smoke build check        | Vite production build output | `npm run smoke`                     | Ensures `npm run build` succeeds, `dist/index.html` exists, and built JS/CSS references resolve in `dist/`; also runs through `npm run check`. |
| Linting & types          | Source TypeScript            | `npm run lint`, `npm run typecheck` | `npm run check` includes both linting and TypeScript type checking before tests, docs, and smoke.                                              |

### Visual diff budgets

Playwright screenshot assertions inherit tolerances from
[`VISUAL_SMOKE_DIFF_BUDGET`](../../src/assets/performance.ts). `maxDiffPixelRatio`
(1.5%) and `maxDiffPixels` (1,200) balance bloom noise against meaningful scene
changes. Update both the asset and this doc if thresholds move.

## Telemetry sampling

Input latency and FPS monitors reuse the shared `createSampleAccumulator(...)`
utility to keep percentiles and averages cached between polls. The accumulator
now compacts its rolling buffer after long eviction streaks so long-running
sessions do not hold onto trimmed samples or churn the GC. Use the optional
`onCompact` hook in tests when validating max sample caps or memory behavior.

## Keyboard traversal macro

[`playwright/keyboard-traversal.spec.ts`](../../playwright/keyboard-traversal.spec.ts)
exercises the WASD onboarding loop, POI focus order, HUD announcements, and text
mode failover. Extend this spec whenever new POIs or HUD modals ship so keyboard
coverage remains comprehensive.

## Auto-generated assets

| Script                      | Output path                   | Trigger                                                                                              |
| --------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run floorplan:diagram` | `docs/assets/floorplan-*.svg` | Run after floor geometry or labels change. CI refreshes the diagrams post-merge.                     |
| `npm run launch:screenshot` | `docs/assets/game-launch.png` | Review-only local capture after lighting, HUD, or camera framing changes; CI owns the committed PNG. |

Regenerate affected committable assets locally before committing so diffs stay deterministic.
Do not stage or commit `docs/assets/game-launch.png`; use local launch captures only for review,
then let the Launch screenshot workflow refresh the committed PNG after merge. Document the
update in commit messages when budgets or captures shift.

## Manual binary runtime assets

Static runtime binaries (for example `favicon.ico`, resume PDFs, and similar
media artifacts) are Daniel-managed and may be absent during automation updates.
`npm run smoke` reports missing manual binaries as warnings by default so
text/code-only changes stay unblocked.

After those binary assets are added manually, run:

```bash
REQUIRE_MANUAL_STATIC_ASSETS=1 npm run smoke
```

Strict mode fails when required binary runtime assets are missing from either
the source path or final `dist/` artifact.

`npm run press-kit` now emits a `performance.report` payload that mirrors the
headroom calculations from `createPerformanceBudgetReport(...)`, including
`status` labels and clamped `remainingPercent` values so distribution artifacts
call out budget health at a glance.
