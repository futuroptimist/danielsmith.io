# Static-site observability contract

`danielsmith.io` is a static Vite and Three.js application served by nginx. The
first observability layer should therefore verify public behavior and Kubernetes
runtime state before adding any application-specific collector. The app should
not expose a custom Prometheus endpoint, browser analytics collector, hidden
beacon, visitor identifier, or client telemetry export.

## First layer: blackbox and Kubernetes metrics

Blackbox probes answer the question visitors and release operators care about
first: can the public static routes be reached, do they return the expected
status and content type, and is TLS valid? Kubernetes metrics answer the next
operator questions: is the Deployment available, are Pods ready, are restarts
increasing, and are CPU or memory requests and limits still conservative enough
for nginx static serving.

Use Sugarkube Prometheus, blackbox exporter, kube-state-metrics, and kubelet or
cAdvisor metrics for this layer. Join Kubernetes metrics on bounded Helm labels
such as `app.kubernetes.io/name`, `app.kubernetes.io/instance`, and
`app.kubernetes.io/component`. Do not rely on labels that contain image digests,
GitHub event payloads, arbitrary URLs, or other unbounded values.

## Paging-critical public paths

Page on production signals only when they represent visitor-impacting service
health:

- `/` must serve the application HTML from this repository rather than a legacy
  placeholder.
- `/healthz` must return static nginx JSON with HTTP 200 and `Cache-Control:
no-store`.
- `/livez` must return static nginx JSON with HTTP 200 and `Cache-Control:
no-store`.
- `/resume.pdf` must return or redirect to a final PDF response with a PDF
  content type.

For staging, alert to release owners or the active deployer, not production
receivers, unless the staging failure also proves a shared routing or cluster
incident.

## Release checks that are not paging signals

Promotion smoke evidence is required for release records, but several checks are
release gates rather than production paging signals:

- Text-mode fallback rendering and navigation.
- Immersive WebGL bootstrapping with
  `mode=immersive&disablePerformanceFailover=1`.
- Resume redirect target and final PDF signature evidence.
- Safe response-header capture for release audit trails.
- `/runtime/github-metrics.json` shape or freshness when the optional GitHub
  metrics cache is enabled.

Failures in these checks should block or roll back a release when they are caused
by the promoted image or deployment, but they should not wake production
receivers by themselves if the paging-critical public paths remain healthy.

## Non-health metadata and browser events

GitHub repository metadata is portfolio content. It can help render project
cards, but it is not uptime, latency, readiness, saturation, scrape health, or
release identity evidence. GitHub API outages, rate limiting, stale cache data,
or missing stars/forks should not page for `danielsmith.io` service health.

Browser events and performance/failover decisions stay local by default. They
can be useful during manual QA, but they are not service-health metrics unless a
future privacy-reviewed design defines aggregation, consent, retention, deletion,
operator access, and the minimum safe dimensions before any data leaves a
visitor's browser.

## Promotion smoke evidence

Run promotion smoke from this repository checkout after the target environment is
serving the immutable image selected for release. The command is read-only
against production. It records final URL, status, selected safe headers, content
type, and pass/fail in deterministic JSON under `test-results/promotion-smoke/`.
It must not record cookies, IP addresses, credentials, browser fingerprints, or
user-provided data.

Staging defaults to `https://staging.danielsmith.io`:

```bash
npm run smoke:promotion
```

Use an explicit base URL for production:

```bash
npm run smoke:promotion -- --base-url=https://danielsmith.io
```

For local container verification, build and run the image, then point the same
smoke at the published port:

```bash
docker build -t danielsmith-io:observability .
docker run --rm -p 127.0.0.1:8080:8080 danielsmith-io:observability
npm run smoke:promotion -- --base-url=http://127.0.0.1:8080
```

Attach `test-results/promotion-smoke/promotion-smoke-evidence.json` to the
release record with the immutable `main-<shortsha>` image tag, Helm release, and
rollout timestamp.
