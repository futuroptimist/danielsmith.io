# GitHub API 403 noise during repo metrics fetches

## Symptom

Hardware-accelerated staging validation showed repeated browser console/network
entries for unauthenticated GitHub repository API requests. The noisy fan-out
covered portfolio repos such as `gabriel`, `token.place`, `flywheel`,
`danielsmith.io`, `pr-reaper`, `gitshelves`, `wove`, `sigma`, and
`f2clipboard`, making performance investigations harder to read.

## Root cause

Live POI metrics requested GitHub stars directly from the static browser app.
Unauthenticated GitHub API calls can hit rate-limit, forbidden, unavailable, or
private-repo paths, and the old refresh path attempted every public repo bucket
on each page load even after a first failure proved the session was already
blocked.

## Fix summary

- GitHub repo metrics now stay optional: failed live fetches leave static POI
  fallback values or stale cached successes in place.
- Successful responses are cached in browser storage and reused before any live
  request, so stale stars can render while the network is unavailable.
- 403, 404, 429, timeout, and network failures enter bounded backoff; subsequent
  repo requests are suppressed during that window instead of fanning out.
- Failures emit at most one grouped session warning and expose concise
  diagnostics through `window.portfolio.github.getRepoMetricsDiagnostics()`.
- Repo metric availability is not connected to performance health or text-mode
  failover decisions.

## Validation steps

- Mock `https://api.github.com/repos/**` to return 403, load
  `/?mode=immersive&disablePerformanceFailover=1&enableLiveGitHubMetrics=1`, and
  confirm immersive mode stays active.
- Confirm only the first GitHub request is attempted before backoff suppresses
  the rest of the repo fan-out.
- Confirm project/POI UI still renders with static fallback metric labels.
- Inspect `window.portfolio.github.getRepoMetricsDiagnostics()` and verify the
  source is `static-fallback`, the last status is `403`, request counts are
  bounded, and a backoff expiration is present.
- Reload during the backoff TTL and confirm live GitHub requests are skipped.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run test:e2e -- --grep "github|metrics|fallback|immersive"`
- `npm run docs:check`
- `npm run smoke`
