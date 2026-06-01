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

Cloudflare DNS, tunnel, and route setup are separate from Helm deployment. Confirm those routes
outside this app repo before expecting the public hostnames to resolve.

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

```bash
curl -fsS https://staging.danielsmith.io/livez
curl -fsS https://staging.danielsmith.io/healthz
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

```bash
curl -fsS https://danielsmith.io/livez
curl -fsS https://danielsmith.io/healthz
curl -fsS https://danielsmith.io/
```

## Rollback

Redeploy or promote the previous known-good immutable `main-<shortsha>` tag from Sugarkube. Helm
revision rollback remains available on the cluster side, but the preferred app-level rollback is to
return to a previously published immutable GHCR image tag.
