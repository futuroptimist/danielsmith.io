# Static-site observability contract

`danielsmith.io` is a static Vite/Three.js application served by nginx. The first observability
layer should therefore measure the public service contract and the Kubernetes release that serves
it, not browser behavior or repository activity.

## First layer: blackbox and Kubernetes metrics

Use public blackbox probes for the user-visible HTTP contract. They verify DNS, TLS, ingress,
Cloudflare routing, the nginx container, and the static files as one path. Pair those probes with
Kubernetes metrics from kube-state-metrics, kubelet, and cAdvisor so operators can join endpoint
failures to Deployment readiness, pod restarts, and CPU or memory pressure.

The Helm chart labels Deployments, Pods, Services, ServiceAccounts, and related ConfigMaps with the
standard `app.kubernetes.io/*` keys. Join on bounded labels such as `app.kubernetes.io/name`,
`app.kubernetes.io/instance`, `app.kubernetes.io/component`, and `app.kubernetes.io/part-of`.
Use the immutable image tag or digest from pod/container metadata as release evidence, but do not
copy unbounded image digests into Kubernetes labels.

## Paging-critical paths

Page on production failures for paths that represent the runtime contract:

- `https://danielsmith.io/` must return this application, not the legacy placeholder or a generic
  HTML fallback from another deployment.
- `https://danielsmith.io/healthz` must return a small JSON health response with HTTP 200 and
  `Cache-Control: no-store`.
- `https://danielsmith.io/livez` must return a small JSON liveness response with HTTP 200 and
  `Cache-Control: no-store`.
- `https://danielsmith.io/resume.pdf` must return or redirect to the stable PDF artifact with a PDF
  content type.

Staging probes for the same paths are release gates and early warnings. They should notify release
operators during a promotion, but they are not production paging signals.

## Release checks that are not paging signals

Promotion smoke evidence is a release record, not a long-running monitor. Run it before staging
sign-off and again after production promotion. The artifact records final URL, status, selected safe
headers, content type, and pass/fail for root, health, liveness, and resume checks. It intentionally
omits cookies, IP addresses, credentials, browser fingerprints, and user-provided data.

Text-mode and immersive browser checks are useful release checks for accessibility and launch
confidence. They should remain synthetic and read-only in production. Any browser state mutation
belongs only in staging and must use synthetic data.

## Non-health signals

GitHub repository metadata, star counts, release workflow state, and browser events are not service
health metrics. They can support portfolio content, release audit trails, or product analytics after
separate privacy review, but they do not prove that `danielsmith.io` is serving traffic correctly.
Do not add browser analytics collectors, hidden beacons, visitor identifiers, or client telemetry
exports as part of this static-site health contract.

## Running promotion smoke

From this repository checkout, install dependencies and run the promotion smoke with an explicit
base URL when possible:

```bash
npm run smoke:promotion -- --base-url=https://staging.danielsmith.io
npm run smoke:promotion -- --base-url=https://danielsmith.io
```

The staging command may also be run without `--base-url` because staging is the default:

```bash
npm run smoke:promotion
```

For a local preview or container mapped to localhost, use the local base URL. Only skip the resume
check for previews that intentionally do not expose the stable resume artifact:

```bash
npm run smoke:promotion -- --base-url=http://127.0.0.1:8080
npm run smoke:promotion -- --base-url=http://127.0.0.1:5173 --skip-resume
```

Evidence is written to `test-results/promotion-smoke/promotion-smoke-evidence.json` for release
attachment.
