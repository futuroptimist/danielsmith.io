# Sugarkube release runbook for danielsmith.io

Use this runbook to release the static `danielsmith.io` site through the shared Sugarkube
GHCR/Helm contract. The application remains static-site only: the runtime image serves the
Vite build with nginx on port `8080`, exposes `/livez` and `/healthz`, and does not require a
backend, database, queue, worker, API, or compute-node service.

## Contract summary

| Artifact                   | Canonical value                                  |
| -------------------------- | ------------------------------------------------ |
| Image repository           | `ghcr.io/futuroptimist/danielsmith.io`           |
| Immutable deploy image tag | `main-<shortsha>`                                |
| Convenience image tag      | `main-latest`                                    |
| SHA alias                  | `sha-<shortsha>`                                 |
| Helm chart name            | `danielsmith`                                    |
| Helm chart ref             | `oci://ghcr.io/futuroptimist/charts/danielsmith` |
| Release and namespace      | `danielsmith`                                    |
| Runtime port               | `8080`                                           |
| Health endpoints           | `/livez`, `/healthz`                             |

GitHub Actions owns publishing. Operators should not build or tag images locally for Sugarkube
rollouts.

## 1. Find the published immutable image tag

1. Open the `Build and publish GHCR image` workflow (`ci-image.yml`) for the commit you want to
   release.
2. Confirm the run succeeded on `main`.
3. Copy the immutable deploy tag from the workflow summary:

   ```text
   ghcr.io/futuroptimist/danielsmith.io:main-REPLACE_SHORTSHA
   ```

Pushes to `main` publish all three image tags:

- `ghcr.io/futuroptimist/danielsmith.io:main-<shortsha>`
- `ghcr.io/futuroptimist/danielsmith.io:main-latest`
- `ghcr.io/futuroptimist/danielsmith.io:sha-<shortsha>`

Pull requests build and smoke-test the image without publishing. Manual `workflow_dispatch` runs
also build and smoke-test the selected ref; they are validation-only for the image workflow and do
not publish GHCR image tags.

## 2. Confirm the OCI chart is available

1. Open the `Publish Helm chart` workflow (`ci-helm.yml`) for the same commit or the current chart
   version.
2. Confirm the workflow succeeded and the summary references:

   ```text
   oci://ghcr.io/futuroptimist/charts/danielsmith
   ```

The chart workflow lints, renders a staging-like template with `image.tag=main-deadbee`, packages
`charts/danielsmith`, and publishes the immutable chart version to GHCR when needed. If an
identical chart version already exists, publication may be skipped; if chart content changed under
an existing version, bump `charts/danielsmith/Chart.yaml` before publishing.

## 3. Deploy staging from the Sugarkube checkout

Run deployment commands from a Sugarkube repository checkout, not from this app repo.

Current app-specific command:

```bash
just danielsmith-oci-deploy env=staging tag=main-REPLACE_SHORTSHA
```

Future generic command after the Sugarkube generic recipes land:

```bash
just app-deploy app=danielsmith env=staging tag=main-REPLACE_SHORTSHA
```

## 4. Validate staging

```bash
curl -fsS https://staging.danielsmith.io/livez
curl -fsS https://staging.danielsmith.io/healthz
curl -fsS https://staging.danielsmith.io/
```

If you also need cluster-side confirmation from Sugarkube, use the standard namespace checks:

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
```

## 5. Promote production

After staging sign-off, promote the same immutable image tag to production.

Current app-specific command:

```bash
just danielsmith-oci-promote-prod tag=main-REPLACE_SHORTSHA
```

Future generic command after the Sugarkube generic recipes land:

```bash
just app-promote-prod app=danielsmith tag=main-REPLACE_SHORTSHA
```

## 6. Validate production

```bash
curl -fsS https://danielsmith.io/livez
curl -fsS https://danielsmith.io/healthz
curl -fsS https://danielsmith.io/
```

Optional cluster-side confirmation:

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
```

## Cloudflare routing is separate

Helm deployment should only install or upgrade the Kubernetes release. Keep Cloudflare DNS, tunnel,
and route setup in the Sugarkube/network runbooks so application release steps remain repeatable and
can be re-run without changing public routing.

## Rollback

Redeploy or promote the previous known-good immutable `main-<shortsha>` image tag from the
Sugarkube checkout. Do not roll back by using mutable tags for sign-off.
