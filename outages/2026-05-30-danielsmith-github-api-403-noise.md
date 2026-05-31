# danielsmith.io GitHub API 403 noise during repo metrics fetches

- **Date:** 2026-05-30
- **Environment:** hardware-accelerated staging validation with immersive mode
- **Status:** Mitigation prepared for deployment validation

## Symptoms

Staging validation showed repeated browser network failures for unauthenticated
GitHub API repo metric requests such as
`https://api.github.com/repos/futuroptimist/gabriel`, `token.place`,
`flywheel`, `danielsmith.io`, `pr-reaper`, `gitshelves`, `wove`, `sigma`, and
`f2clipboard`. The browser Network panel reported HTTP 403 responses for many
repositories during a single page load, which made performance investigation
noisy and risked confusing console-budget based fallback triage.

## Root cause class

The project cards and POI metric wiring fanned out unauthenticated browser
requests to the GitHub REST API for live star counts. GitHub can reject those
requests because of unauthenticated rate limits, access behavior, or transient
network failures. Live GitHub metrics are nice-to-have metadata; they are not a
renderer health signal and should not affect immersive stability.

## Mitigation

- Repo metric fetches keep static project fallback values when live metrics are
  unavailable.
- Successful live responses are cached in browser storage and reused on later
  loads, including as stale data when a later request fails.
- HTTP 403 and 429 responses, plus network failures, place the metrics service
  into a bounded backoff so a single failure stops additional unauthenticated
  fan-out for the current session/window and repeated reloads during the TTL.
- HTTP failures are grouped into at most one concise app-level warning per
  session. The first browser Network-panel failure can still appear because the
  browser made that request, but subsequent repo requests are suppressed while
  backoff is active.
- `window.portfolio.githubMetrics.getDiagnostics()` exposes the concise metrics
  source, request count, suppressed request count, last error status, cache size,
  and backoff expiration for validation.
- GitHub metric availability remains independent from performance diagnostics,
  renderer policy, and text-mode failover criteria.

## Manual validation

1. Open `/?mode=immersive&disablePerformanceFailover=1&enableLiveGitHubMetrics=1`
   with `https://api.github.com/repos/**` mocked to return 403 or 429.
2. Confirm the immersive scene reaches `document.documentElement.dataset.appMode
=== "immersive"` and no `performancefailover` event is emitted.
3. Confirm project/POI content remains usable with static fallback metric text.
4. Confirm `window.portfolio.githubMetrics.getDiagnostics()` reports
   `source: "static-fallback"` (or `"cached"` when stale data exists), the last
   error status, one live request, suppressed follow-up requests, and a backoff
   expiration.
5. Hard refresh during the backoff TTL and confirm additional repo requests are
   suppressed instead of fanning out to every configured repository.
6. Remove the API mock and clear the backoff key to confirm successful live
   metrics still render and cache.

## Expected validation commands

```bash
npm run format:write
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e -- --grep "github|metrics|fallback|immersive"
npm run docs:check
npm run smoke
```
