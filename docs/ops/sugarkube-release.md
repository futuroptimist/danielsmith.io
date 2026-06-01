# Sugarkube GHCR/Helm release runbook (danielsmith.io)

Use this runbook to release the static `danielsmith.io` site to Sugarkube without
local container builds. GitHub Actions publishes the image and OCI Helm chart;
Sugarkube deploys an immutable image tag.

## Static-site contract

`danielsmith.io` stays within the static-site-only deployment profile:

- Runtime: nginx serving the built Vite + Three.js assets on port `8080`.
- Health endpoints: `/livez` and `/healthz`.
- No backend service, API server, database, queue, worker, or compute-node dependency.
- Browser routes use the static container's SPA fallback.

## Canonical artifacts

- Image repository: `ghcr.io/futuroptimist/danielsmith.io`
- Immutable deploy tag format: `main-<shortsha>`
- Convenience tag: `main-latest` (rendering and quick checks only; do not use for sign-off)
- Extra SHA tag: `sha-<shortsha>`
- Helm chart: `oci://ghcr.io/futuroptimist/charts/danielsmith`
- Chart name: `danielsmith`

## GitHub Actions release sources

1. Open the `Build and publish GHCR image` workflow for the commit you want to deploy:
   <https://github.com/futuroptimist/danielsmith.io/actions/workflows/ci-image.yml>
2. Choose a successful run from `main`. Pull requests only build and smoke-test; they do
   not publish GHCR tags. Manual `workflow_dispatch` runs validate a selected ref but also
   do not publish image tags.
3. Copy the immutable deploy tag from the workflow summary:

   ```text
   ghcr.io/futuroptimist/danielsmith.io:main-REPLACE_SHORTSHA
   ```

4. Confirm the `Publish Helm chart` workflow for the same commit succeeded:
   <https://github.com/futuroptimist/danielsmith.io/actions/workflows/ci-helm.yml>
5. In the chart workflow summary, confirm the chart reference is:

   ```text
   oci://ghcr.io/futuroptimist/charts/danielsmith
   ```

   Chart publishing skips unchanged chart content. If chart content changed and the existing
   immutable chart version has different content, bump `charts/danielsmith/Chart.yaml` and
   rerun CI.

## Deploy staging from Sugarkube

Run commands from a Sugarkube repository checkout, not from this app repo.

Current app-specific command:

```bash
just danielsmith-oci-deploy env=staging tag=main-REPLACE_SHORTSHA
```

Future generic command after the Sugarkube generic app recipes land:

```bash
just app-deploy app=danielsmith env=staging tag=main-REPLACE_SHORTSHA
```

## Validate staging

```bash
curl -fsS https://staging.danielsmith.io/livez
curl -fsS https://staging.danielsmith.io/healthz
curl -fsS https://staging.danielsmith.io/
```

## Promote production

Promote only after the same immutable tag passes staging validation.

Current app-specific command:

```bash
just danielsmith-oci-promote-prod tag=main-REPLACE_SHORTSHA
```

Future generic command after the Sugarkube generic app recipes land:

```bash
just app-promote-prod app=danielsmith tag=main-REPLACE_SHORTSHA
```

## Validate production

```bash
curl -fsS https://danielsmith.io/livez
curl -fsS https://danielsmith.io/healthz
curl -fsS https://danielsmith.io/
```

## Rollback

Redeploy or promote the previous known-good immutable `main-<shortsha>` tag from the
Sugarkube checkout. Avoid mutable tags for rollback sign-off.

## Cloudflare routing

Keep Cloudflare Tunnel, DNS, and route setup separate from Helm deployment. Helm rollout
selects the image tag and Kubernetes resources; Cloudflare route changes should be handled
by the Sugarkube networking/runbook process for the target environment.
