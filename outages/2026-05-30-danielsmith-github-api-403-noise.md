# danielsmith.io GitHub API 403 metrics noise

- **Date:** 2026-05-30
- **Environment:** hardware-accelerated staging validation with live GitHub repo metrics enabled
- **Status:** Mitigation prepared for deployment validation

## Symptoms

Hardware-accelerated immersive validation showed repeated browser console/network
entries for unauthenticated GitHub repository API requests, including
`api.github.com/repos/futuroptimist/gabriel`, `token.place`, `flywheel`,
`danielsmith.io`, `pr-reaper`, `gitshelves`, `wove`, `sigma`, and
`f2clipboard`. The scene itself could continue rendering, but the repeated 403
resource messages made performance investigations noisy and risked confusion
with console-budget or runtime failover signals.

## Root cause class

The live project-card metrics used unauthenticated browser requests to the
GitHub REST API. When GitHub rejected the first request because of rate limits,
access policy, or unauthenticated quota behavior, the existing refresh path could
fan out across the remaining repositories on the same page load. Those failures
were not required for core portfolio content because every project already ships
with static fallback copy and metric labels.

## Mitigation

- GitHub repo metrics remain optional browser-only enhancements; no token,
  secret, proxy, or backend was introduced.
- Successful live responses are cached in browser storage and reused as stale
  project metrics on later loads.
- A 403 or 429 response enters a bounded browser-storage backoff so later repo
  requests are suppressed during the TTL instead of fanning out through the full
  project list.
- Network failures and timeouts also enter the same bounded backoff to avoid
  repeated unavailable API attempts during a session.
- Project cards keep rendering static fallback metric values when live metrics
  are unavailable.
- The metrics service exposes concise diagnostics: source (`live`, `cached`, or
  `static-fallback`), last error status, request count, suppressed request count,
  and backoff expiration.
- App-level logging is grouped into at most one `console.warn` per metrics
  service instance and never uses `console.error`, keeping repo metric failures
  out of performance-failover and console-budget criteria.

## Validation steps

1. Open `/?mode=immersive&disablePerformanceFailover=1&enableLiveGitHubMetrics=1`
   with GitHub API requests mocked to return 403.
2. Confirm the immersive scene reaches `document.documentElement.dataset.appMode
=== 'immersive'` and no `performancefailover` event fires.
3. Confirm only the first GitHub repo request is attempted before backoff
   suppresses the remaining repo fan-out.
4. Confirm the POI overlay/project content still shows fallback metric values.
5. Inspect `window.portfolio.github.getRepoMetricsDiagnostics()` and confirm it
   reports `source: 'static-fallback'`, `lastErrorStatus: 403`, one live request,
   and a backoff expiration timestamp.
6. Repeat with a successful GitHub API response and confirm live values cache and
   render.

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
