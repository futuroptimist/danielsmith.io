# runtime fallback lacked an adaptive quality ladder

- **Date:** 2026-05-29
- **Overview:** [staging performance overview](./2026-05-29-danielsmith-staging-performance-overview.md)
- **Status:** Corrective patch prepared for deployment validation

## Symptom slice

Sustained low FPS could proceed directly to text fallback instead of first trying cheaper rendering features.

## Evidence

Failover handled sustained low FPS, but there was no production-safe downgrade sequence tied to diagnostics. The new adaptive controller records sustained low-FPS windows and exposes downgrade counts and reasons.

## Impacted files

- `src/systems/performance/adaptiveQuality.ts`
- `src/main.ts`
- `src/systems/performance/immersiveDiagnostics.ts`
- `src/systems/failover/performanceFailover.ts`

## Fix summary

The scene now downgrades cinematic/balanced quality, lowers DPR, disables composer/bloom, throttles/disables mirror, and throttles decorative updates before low-performance fallback is allowed to consume low-FPS frames. A failover-duration double-counting bug was also fixed.

## Interaction with other fixes

The ladder orchestrates the other fixes and avoids flapping with a cooldown. It does not disable diagnostics when disablePerformanceFailover=1 is used.

## Regression tests

- `src/tests/adaptiveQuality.test.ts`
- `src/tests/performanceFailover.test.ts`
- `playwright/adaptive-quality.spec.ts`
- `playwright/immersive-performance.spec.ts`

## Validation commands

```bash
npm run format:write
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e -- --grep "performance|adaptive|immersive"
npm run smoke
```
