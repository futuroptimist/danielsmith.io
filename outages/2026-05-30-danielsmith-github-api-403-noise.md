# danielsmith.io GitHub API 403 console-noise cleanup

- **Date:** 2026-05-30
- **Environment:** hardware-accelerated staging performance validation
- **Status:** Mitigation prepared for deployment validation

## Symptoms

Hardware-accelerated immersive validation showed repeated browser Network panel
entries for unauthenticated GitHub REST API requests such as
`api.github.com/repos/futuroptimist/gabriel` returning HTTP 403. Similar entries
appeared for token.place, flywheel, danielsmith.io, pr-reaper, gitshelves,
wove, sigma, and f2clipboard while project cards still had static fallback copy.

The failures were not the primary FPS bottleneck, but the fan-out made
performance-investigation logs noisy and risked confusing console-budget and
fallback triage with unrelated repo metric availability.

## Root cause class

Project POI cards attempted unauthenticated client-side GitHub API requests for
live star counts. When GitHub rate-limited, forbade, or otherwise rejected the
anonymous requests, every repo could still be requested during page load. A
static site cannot safely ship credentials in the browser, so live metrics must
remain optional and best-effort.

## Mitigation

- GitHub repo metrics now keep project cards on their static metric fallback
  values unless live stats are available.
- Successful live metrics are cached in browser storage and reused as stale data
  when a later live request fails.
- HTTP 403 and 429 responses enter bounded backoff so subsequent repo metric
  requests are suppressed instead of fanning out across every project.
- Persisted backoff prevents repeated hard refreshes from immediately retrying
  the same unauthenticated fan-out.
- GitHub metric failures are reported through one concise warning/diagnostic path
  per app session, never through `console.error`.
- Diagnostics expose metric source (`live`, `cached`, or `static-fallback`), last
  error status, request count, suppressed request count, and backoff expiry via
  `window.portfolio.githubMetrics.getDiagnostics()`.
- GitHub metrics remain independent of renderer health, adaptive quality, and
  performance/text failover policy.

## Validation steps

1. Launch the immersive debug URL:
   `/?mode=immersive&disablePerformanceFailover=1&enableLiveGitHubMetrics=1`.
2. Mock or reproduce GitHub API HTTP 403/429 for `api.github.com/repos/**`.
3. Confirm immersive mode remains active and no `performancefailover` event is
   emitted.
4. Confirm project cards/POIs still render their static or cached metric text.
5. Confirm diagnostics report `source: "static-fallback"` or `source: "cached"`,
   the last HTTP status, request count, suppressed request count, and backoff
   expiration.
6. Hard-refresh during the backoff TTL and confirm the app does not fan out to
   every GitHub repo again.

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
