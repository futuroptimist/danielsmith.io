# Testing and asset automation

This guide captures how automated checks validate the immersive scene and how
auto-generated artifacts stay up to date.

## Test suites

| Suite                    | Location                     | Command                             | Notes                                                                                                              |
| ------------------------ | ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Unit & integration tests | `src/tests/` (Vitest)        | `npm run test:ci`                   | Run with `CI=1` locally to mirror pipeline timeouts and disable watch mode.                                        |
| End-to-end + visual      | `playwright/` (Playwright)   | `npm run test:e2e`                  | Uses the same immersive URL overrides as production. Set `CI=1` to lock workers to 1 for deterministic WebGL boot. |
| Smoke build check        | Vite production build output | `npm run smoke`                     | Ensures `npm run build` succeeds and that `dist/index.html` exists.                                                |
| Linting & types          | Source TypeScript            | `npm run lint`, `npm run typecheck` | Linting runs ESLint; `npm run check` chains lint, tests, and docs validation.                                      |

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

| Script                      | Output path                   | Trigger                                                                                             |
| --------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run floorplan:diagram` | `docs/assets/floorplan-*.svg` | Run after floor geometry or labels change. CI refreshes the diagrams post-merge.                    |
| `npm run launch:screenshot` | `docs/assets/game-launch.png` | Run after lighting, HUD, or camera framing changes. CI captures a fresh launch pose on every merge. |

Regenerate affected assets locally before committing so diffs stay deterministic.
Document the update in commit messages when budgets or captures shift.

`npm run press-kit` now emits a `performance.report` payload that mirrors the
headroom calculations from `createPerformanceBudgetReport(...)`, including
`status` labels and clamped `remainingPercent` values so distribution artifacts
call out budget health at a glance.
