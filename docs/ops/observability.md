# Static-site observability contract

`danielsmith.io` is a static Vite application served by nginx. The first
observability layer should therefore measure the public service contract and the
Kubernetes workload that serves it, not browser identity, GitHub portfolio data,
or custom application metrics.

## First layer: blackbox and Kubernetes metrics

Use blackbox checks for the externally visible HTTP contract:

- `GET /` proves the public host serves this application instead of a legacy
  placeholder.
- `GET /healthz` proves the nginx readiness contract returns deterministic JSON.
- `GET /livez` proves the nginx liveness contract returns deterministic JSON.
- `GET /resume.pdf` proves the stable resume URL serves or redirects to a PDF.

Use Kubernetes metrics for the runtime that backs those checks:

- Deployment desired, available, and unavailable replica counts.
- Pod readiness, restart count, and CrashLoopBackOff state.
- Container CPU and memory usage compared with requests and limits.
- Helm release metadata and the deployed immutable `main-<shortsha>` image tag.

This keeps the monitoring model aligned with a static nginx site: if the public
paths work and the Kubernetes workload is healthy, the service is healthy.

## Paging-critical paths

Page production responders only for user-visible service-health failures:

- `https://danielsmith.io/`
- `https://danielsmith.io/healthz`
- `https://danielsmith.io/livez`
- `https://danielsmith.io/resume.pdf`

Recommended blackbox assertions are HTTP success, expected content type, no HTML
fallback body for health endpoints, redirect-followed PDF success for the resume,
latency, and TLS certificate expiry. Tune alert windows after staging baselines
exist; avoid paging on staging-only failures.

## Release checks that are not paging signals

Promotion smoke also opens text mode and immersive mode so a release record can
show that the application remains accessible and launchable. Those browser checks
are release gates, not production paging signals, because they depend on the test
browser and environment capabilities such as WebGL.

`/runtime/github-metrics.json` is portfolio content. It may be checked during a
release when GitHub metadata panels change, but it is not uptime, readiness,
latency, saturation, or release-identity evidence.

## What is not a service-health metric

GitHub repository metadata, workflow metadata, browser events, performance marks,
local failover events, cookies, IP addresses, user agents, browser fingerprints,
navigation history, and visitor identifiers are not service-health metrics for
this static site. Do not export them as Prometheus labels, analytics beacons, or
hidden telemetry. Any future client telemetry would need a separate privacy
review covering aggregation, consent, retention, deletion, and operator access.

## Promotion smoke evidence

The promotion smoke is read-only against production. It accepts a base URL,
checks root, health, liveness, resume, text fallback, and immersive launch, then
writes deterministic machine-readable evidence to
`test-results/promotion-smoke/promotion-smoke-evidence.json`. The artifact records
step names, pass/fail/skip status, final URLs, HTTP status codes, and selected
safe headers (`cache-control`, `content-length`, `content-type`, `etag`,
`last-modified`, and `location`). It does not record cookies, IP addresses,
credentials, browser fingerprints, or visitor identifiers.

Run staging evidence from this repository checkout after deploying the immutable
image to staging:

```bash
npm run smoke:promotion
```

Run production evidence with an explicit production base URL after promoting the
same immutable image:

```bash
npm run smoke:promotion -- --base-url=https://danielsmith.io
```

For local nginx/container triage, pass the local URL. Only skip the resume check
for local previews that do not include the stable PDF artifact:

```bash
npm run smoke:promotion -- --base-url=http://127.0.0.1:8080
npm run smoke:promotion -- --base-url=http://127.0.0.1:5173 --skip-resume
```
