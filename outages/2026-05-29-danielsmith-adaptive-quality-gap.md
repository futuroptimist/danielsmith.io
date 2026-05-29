# Adaptive quality gap root cause

- **Date:** 2026-05-29
- **Overview:** [staging performance overview](./2026-05-29-danielsmith-staging-performance-overview.md)

## Symptom slice

Runtime performance failover could switch directly to text fallback after
sustained low FPS. It did not first force cheaper rendering settings for sessions
that might recover with reduced DPR, disabled bloom/composer, and disabled mirror
renders.

## Evidence

The failover monitor only accumulated low-FPS samples and transitioned to
fallback when the duration threshold was reached. There was no pre-fallback
quality callback, downgrade count, or last downgrade reason in diagnostics.

## Impacted files

- `src/systems/failover/performanceFailover.ts`
- `src/systems/performance/performanceDiagnostics.ts`
- `src/main.ts`
- `src/tests/performanceFailover.test.ts`
- `src/tests/performanceDiagnostics.test.ts`

## Fix summary

The low-FPS monitor now supports a pre-fallback adaptive callback. The immersive
scene uses it as a non-flapping ladder: downgrade to performance first, then
apply additional DPR reductions on later sustained low-FPS windows, while
recording downgrade count and reason. Text fallback remains enabled once the
adaptive budget is exhausted.

## Interaction with other fixes

The adaptive ladder reuses the concrete cheaper paths introduced by the other
fixes: performance quality disables bloom, composer skipping removes no-op
passes, DPR policy lowers drawing-buffer cost, and mirror policy disables the
extra render.

## Regression tests

Performance-failover tests assert the adaptive callback can consume a low-FPS
window without triggering fallback and that recovery/reset avoids immediate
flapping. Diagnostics tests assert adaptive state is observable.

## Validation commands

```bash
npm run test:ci -- src/tests/performanceFailover.test.ts src/tests/performanceDiagnostics.test.ts
npm run test:e2e -- --grep "adaptive"
```
