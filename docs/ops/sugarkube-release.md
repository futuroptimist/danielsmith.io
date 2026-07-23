# Sugarkube GHCR/Helm release runbook for danielsmith.io

Use this runbook to release `danielsmith.io` to Sugarkube without local image builds. The
application remains a static Vite/Three.js site served by nginx on port `8080`; it exposes
`/livez` and `/healthz` and does not include any backend, database, API, queue, or compute-node
components.

## Release contract

- Image repository: `ghcr.io/futuroptimist/danielsmith.io`
- Deploy image tag: immutable `main-<shortsha>` from GitHub Actions
- Convenience image tag: `main-latest` for rendering and ad hoc checks only
- SHA alias: `sha-<shortsha>`
- Helm chart: `danielsmith`
- Helm chart reference: `oci://ghcr.io/futuroptimist/charts/danielsmith`
- Helm chart version: immutable; bump `charts/danielsmith/Chart.yaml` when chart content changes
- Runtime: nginx static-site container listening on port `8080`
- Health endpoints: `/livez` and `/healthz`
- Runtime build info: `/runtime/build-info.json` served by nginx, rendered by Helm from the
  deploy-time ingress host and chart `AppVersion`
- Optional runtime GitHub metrics cache: `/runtime/github-metrics.json` served by nginx

Cloudflare DNS, tunnel, and route setup are separate from Helm deployment. Confirm those routes
outside this app repo before expecting the public hostnames to resolve.

## Runtime build-info contract

The chart renders `/runtime/build-info.json` into a ConfigMap, then an init container seeds it
into the runtime `emptyDir` that nginx mounts read-only for every Sugarkube deployment. The browser
reads this JSON to show the Settings & Help footer release identity. Because the same immutable
image is promoted from staging to production, this file is resolved at deploy time rather than baked
into the Vite build.

The JSON contract is:

- `schemaVersion: 1`
- `environment`: `staging`, `prod`, or `dev`, derived from the deployed ingress host
- `tag`: staging shows the immutable image tag (`main-<shortsha>`); production shows the semver
  chart application version (`v<Chart.AppVersion>`)

When chart behavior changes, bump `charts/danielsmith/Chart.yaml` so production's displayed version
advances with the published Helm chart. The deployment template includes a `checksum/build-info` pod
annotation, so changing only the ingress host, image tag, or chart app version still rolls pods and
refreshes the seeded file. After staging or production deploys, validate the public file alongside
health checks:

```bash
curl -fsS https://staging.danielsmith.io/runtime/build-info.json
curl -fsS https://danielsmith.io/runtime/build-info.json
```

Expected staging output includes `"environment":"staging"` and `"tag":"main-<shortsha>"` for the
selected immutable image. Expected production output includes `"environment":"prod"` and a semver
`"tag":"v<Chart.AppVersion>"`. Treat stale or mismatched values as release blockers because the
Settings & Help footer uses this endpoint as operator-visible release identity.

## Runtime GitHub metrics cache

The chart includes an optional `githubMetricsCache` sidecar for Sugarkube environments that should
serve project star/fork metadata without requiring each browser to call GitHub directly. It is off
by default so local `helm template` and existing releases keep rendering exactly one app container
unless environment values opt in.

When enabled, the sidecar uses the public GitHub REST API without a token, GitHub App credential,
or Kubernetes Secret. On startup and then every `githubMetricsCache.refreshIntervalSeconds`
(default `3600`), it fetches the configured public repositories, writes an atomic JSON cache to the
same runtime `emptyDir`, and nginx serves that file at `githubMetricsCache.publicPath` (default
`/runtime/github-metrics.json`) with `Cache-Control: no-store`. The sidecar mounts the runtime
volume read-write at its output directory while nginx keeps read-only access. Runtime public paths
must be absolute, normalized, under `/runtime/`, and inside a non-root directory so the shared
cache volume cannot hide the nginx document root. `githubMetricsCache.requestTimeoutSeconds` caps each GitHub
request, while `githubMetricsCache.startupTimeoutSeconds` caps only the first whole refresh before a
neutral cache is written. If GitHub is unavailable during startup, the sidecar writes a valid neutral
JSON document when no prior cache exists so nginx readiness is not held hostage by GitHub.

After enabling the sidecar in Sugarkube staging or production values, verify the public cache shape
without adding secrets:

```bash
curl -fsS https://staging.danielsmith.io/runtime/github-metrics.json
curl -fsS https://danielsmith.io/runtime/github-metrics.json
```

The response should include `schemaVersion`, `generatedAt`, `expiresAt`, `source`, `repos`, and
`errors`. A populated `repos` object indicates successful unauthenticated GitHub refreshes; an empty
`repos` object with `errors` is a safe neutral state to investigate without rotating credentials.

## 1. Pick the immutable image tag

1. Open the GitHub Actions workflow **Build and publish GHCR image** (`ci-image.yml`).
2. Choose a successful run on `main` for the commit you want to release.
3. In the workflow summary, copy the published immutable tag:

   ```text
   ghcr.io/futuroptimist/danielsmith.io:main-REPLACE_SHORTSHA
   ```

4. Use only the tag suffix in Sugarkube commands:

   ```text
   main-REPLACE_SHORTSHA
   ```

`pull_request` and `workflow_dispatch` run build and smoke-test the static image but do not publish
deployable tags. Only `push` runs on `main` publish `main-<shortsha>`, `main-latest`, and
`sha-<shortsha>`.

## 2. Confirm the chart is available

1. Open the GitHub Actions workflow **Publish Helm chart** (`ci-helm.yml`).
2. Confirm the matching `main` run validates the chart named `danielsmith`.
3. Confirm the workflow summary reports the chart reference:

   ```text
   oci://ghcr.io/futuroptimist/charts/danielsmith
   ```

The chart publisher skips unchanged chart content when the same version already exists. If chart
content changes and the existing version differs, bump `charts/danielsmith/Chart.yaml` before
publishing. Manual `workflow_dispatch` chart runs validate the selected ref and publish only when
that ref is `main`/`refs/heads/main`.

## 3. Deploy staging from Sugarkube

Run deployment commands from the Sugarkube repository checkout, not from this app repository.
Replace `main-REPLACE_SHORTSHA` with the immutable tag copied from `ci-image.yml`.

Current app-specific staging command:

```bash
just danielsmith-oci-deploy env=staging tag=main-REPLACE_SHORTSHA
```

Future generic staging command:

```bash
just app-deploy app=danielsmith env=staging tag=main-REPLACE_SHORTSHA
```

### Legacy staging helper fallback

Older Sugarkube checkouts that do not yet include the wrapper recipes can use the explicit Helm
OCI helper flow. Ensure the checkout contains `docs/apps/danielsmith.version` and the referenced
values files under `docs/examples/` before running these helpers. If that checkout uses different
paths, update `version_file` and `values` to match the files present there.

First install:

```bash
just helm-oci-install \
  release=danielsmith \
  namespace=danielsmith \
  chart=oci://ghcr.io/futuroptimist/charts/danielsmith \
  values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml \
  version_file=docs/apps/danielsmith.version \
  default_tag=main-REPLACE_SHORTSHA
```

Upgrade an existing release:

```bash
just helm-oci-upgrade \
  release=danielsmith \
  namespace=danielsmith \
  chart=oci://ghcr.io/futuroptimist/charts/danielsmith \
  values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml \
  version_file=docs/apps/danielsmith.version \
  default_tag=main-REPLACE_SHORTSHA
```

## 4. Validate staging

Capture promotion smoke evidence from this repository checkout after the immutable image is
serving on staging. The check defaults to staging and writes JSON evidence under
`test-results/promotion-smoke/`.

```bash
npm run smoke:promotion
```

Use the same spec for alternate hosts by changing only the base URL. Local Vite previews can skip
the stable resume gate until `/resume.pdf` exists in that preview.

```bash
npm run smoke:promotion -- --base-url=https://danielsmith.io
npm run smoke:promotion -- --base-url=http://127.0.0.1:5173 --skip-resume
```

The legacy curl probes remain valid for quick triage, but the Playwright smoke command is the
preferred release evidence because it covers the public endpoints, text fallback, immersive access,
status codes, headers, final URLs, and resume contract in one repeatable artifact.

```bash
curl -fsS https://staging.danielsmith.io/livez
curl -fsS https://staging.danielsmith.io/healthz
curl -fsS https://staging.danielsmith.io/runtime/build-info.json
curl -fsS https://staging.danielsmith.io/
```

If these fail, first check the Sugarkube release status and ingress/Cloudflare routing separately.
Do not rebuild images locally as a release workaround; pick a known-good immutable GitHub Actions
tag and redeploy it.

## 5. Promote production

After staging sign-off, promote the same immutable image tag to production from the Sugarkube
repository checkout.

Current app-specific production promotion command:

```bash
just danielsmith-oci-promote-prod tag=main-REPLACE_SHORTSHA
```

Future generic production promotion command:

```bash
just app-promote-prod app=danielsmith tag=main-REPLACE_SHORTSHA
```

### Legacy production helper fallback

Older Sugarkube checkouts that do not yet include the promotion wrapper recipes can use the
explicit Helm OCI helper flow. Use only the production values file for production promotion so
production does not inherit dev-only settings or chart defaults. If the production release has not
been installed yet, run the same command with `helm-oci-install` instead of `helm-oci-upgrade`.

```bash
just helm-oci-upgrade \
  release=danielsmith \
  namespace=danielsmith \
  chart=oci://ghcr.io/futuroptimist/charts/danielsmith \
  values=docs/examples/danielsmith.values.prod.yaml \
  version_file=docs/apps/danielsmith.version \
  default_tag=main-REPLACE_SHORTSHA
```

## 6. Validate production

Capture the same promotion smoke evidence against production before closing the release record.
Record the immutable `main-<shortsha>` image tag beside the JSON evidence file path.

```bash
npm run smoke:promotion -- --base-url=https://danielsmith.io
```

Legacy curl probes remain useful for triage:

```bash
curl -fsS https://danielsmith.io/livez
curl -fsS https://danielsmith.io/healthz
curl -fsS https://danielsmith.io/runtime/build-info.json
curl -fsS https://danielsmith.io/
```

## Rollback

Redeploy or promote the previous known-good immutable `main-<shortsha>` tag from Sugarkube. Helm
revision rollback remains available on the cluster side, but the preferred app-level rollback is to
return to a previously published immutable GHCR image tag.
