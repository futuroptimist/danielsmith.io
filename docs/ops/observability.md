# Static-site observability

`danielsmith.io` is deployed as a static nginx application. The first
observability layer should therefore be public blackbox checks plus Kubernetes
control-plane metrics, not application telemetry.

## First-layer signals

Use blackbox probes for externally visible behavior:

- `/` must return the current application HTML, not a legacy placeholder.
- `/healthz` must return a small `application/json` health response with HTTP
  200 and `Cache-Control: no-store`.
- `/livez` must return a small `application/json` liveness response with HTTP
  200 and `Cache-Control: no-store`.
- `/resume.pdf` must resolve through redirects, if any, to a PDF response.

Use Kubernetes metrics for deploy health and capacity:

- Deployment availability and rollout status from kube-state-metrics.
- Pod readiness, restart counts, and container waiting/terminated reasons.
- CPU and memory usage compared with the chart's conservative requests and
  limits.
- Immutable image tag or digest evidence from deployment records, not from an
  unbounded Kubernetes label.

These signals match the architecture: nginx serves static files, and the cluster
already knows whether the desired pods are running and ready.

## Paging-critical checks

Page on production user-impacting availability failures:

- Production `/` cannot serve the app HTML.
- Production `/healthz` is not HTTP 200 JSON for several consecutive probes.
- Production `/livez` is not HTTP 200 JSON for several consecutive probes.
- Production `/resume.pdf` does not reach a PDF final response after redirects.
- The production Deployment has unavailable replicas or repeated crash loops.

Staging checks should block promotion, but they should not page production
responders by themselves.

## Release checks, not paging signals

These checks are useful release evidence but are not service-health metrics:

- Text fallback and immersive-mode browser smoke checks.
- Accessibility, keyboard traversal, and visual review evidence.
- GitHub metrics cache freshness for project metadata panels.
- Documentation link checks, linting, unit tests, and build verification.

They can fail a release candidate, but they should not claim the live static
site is unavailable when the public endpoints and Kubernetes rollout are healthy.

## Privacy boundaries

Do not add a bespoke Prometheus endpoint, browser analytics collector, hidden
beacon, visitor identifier, or client telemetry export. GitHub metadata and
browser events are not service-health metrics: GitHub data describes repository
activity, while browser events describe individual client behavior. Neither is
required to prove nginx can serve the static site, and collecting browser events
would expand the privacy surface without improving uptime detection.

Promotion evidence must never record cookies, IP addresses, credentials,
browser fingerprints, or user-provided data. It records only endpoint URLs,
final URLs, status codes, selected safe response headers, content types, and
pass/fail results.

## Promotion smoke

Run the read-only promotion smoke after deploying the immutable image to
staging:

```bash
npm run smoke:promotion
```

Run the same smoke against production after promoting the exact image that
passed staging:

```bash
npm run smoke:promotion -- --base-url=https://danielsmith.io
```

For local preview-only review, a temporary server can be checked with an
explicit base URL. Use `--skip-resume` only when that local server cannot serve
the stable resume artifact:

```bash
npm run smoke:promotion -- --base-url=http://127.0.0.1:5173 --skip-resume
```

The command writes deterministic machine-readable evidence to
`test-results/promotion-smoke/promotion-smoke-evidence.json`. Attach that JSON
to the release record with the immutable image tag or digest that was tested.
