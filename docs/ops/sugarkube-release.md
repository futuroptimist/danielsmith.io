# Sugarkube GHCR/Helm release runbook for danielsmith.io

This runbook is the copy-pasteable release path for deploying `danielsmith.io` to
Sugarkube. The app remains a static Vite + Three.js site served by unprivileged
nginx on port `8080`; the runtime exposes `/livez` and `/healthz` and has no
backend, database, API, queue, or compute-node dependency.

## Release contract

| Artifact              | Contract                                               |
| --------------------- | ------------------------------------------------------ |
| Image                 | `ghcr.io/futuroptimist/danielsmith.io`                 |
| Immutable image tag   | `main-<shortsha>` from a successful `ci-image.yml` run |
| Convenience image tag | `main-latest` for rendering/lint convenience only      |
| Chart name            | `danielsmith`                                          |
| Chart ref             | `oci://ghcr.io/futuroptimist/charts/danielsmith`       |
| Chart version         | Immutable SemVer from `charts/danielsmith/Chart.yaml`  |

GitHub Actions owns artifact publication. Operators should not use local Docker
builds for Sugarkube releases; Sugarkube deploys the already-published GHCR image
by immutable tag through the OCI Helm chart.

## 1. Find the immutable image tag

1. Open the `Build and publish GHCR image` workflow (`ci-image.yml`) in GitHub
   Actions.
2. Select the successful run for the commit you want to release.
3. Confirm it is a `push` run on `main`. Pull requests and manual dispatches
   build and smoke-test the image but do not publish it.
4. Copy the immutable deploy tag from the workflow summary:

```text
ghcr.io/futuroptimist/danielsmith.io:main-REPLACE_SHORTSHA
```

Use only the tag portion with Sugarkube deploy commands:

```text
main-REPLACE_SHORTSHA
```

The image workflow also publishes these companion tags for `main` pushes:

- `ghcr.io/futuroptimist/danielsmith.io:main-<shortsha>`
- `ghcr.io/futuroptimist/danielsmith.io:main-latest`
- `ghcr.io/futuroptimist/danielsmith.io:sha-<shortsha>`

## 2. Confirm the chart is published

1. Open the `Publish Helm chart` workflow (`ci-helm.yml`) in GitHub Actions.
2. Confirm a successful run for the chart content you plan to deploy.
3. Verify the workflow summary references:

```text
oci://ghcr.io/futuroptimist/charts/danielsmith
```

The chart publication step skips an already-published identical chart version. If
changed chart content reuses an existing version, CI requires a version bump
instead of overwriting the immutable OCI chart.

## 3. Deploy staging from Sugarkube

Run deployment commands from a Sugarkube checkout, not from this app repository.
Replace `main-REPLACE_SHORTSHA` with the immutable image tag copied from
`ci-image.yml`.

Current app-specific command:

```bash
just danielsmith-oci-deploy env=staging tag=main-REPLACE_SHORTSHA
```

Future generic command after the Sugarkube generic app recipes land:

```bash
just app-deploy app=danielsmith env=staging tag=main-REPLACE_SHORTSHA
```

## 4. Validate staging

```bash
curl -fsS https://staging.danielsmith.io/livez
curl -fsS https://staging.danielsmith.io/healthz
curl -fsS https://staging.danielsmith.io/
```

If the cluster is directly accessible, also check rollout state from the
Sugarkube environment:

```bash
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
kubectl -n danielsmith get deploy,po,svc,ingress
```

## 5. Promote production

Promote the exact immutable tag that passed staging validation.

Current app-specific command:

```bash
just danielsmith-oci-promote-prod tag=main-REPLACE_SHORTSHA
```

Future generic command after the Sugarkube generic app recipes land:

```bash
just app-promote-prod app=danielsmith tag=main-REPLACE_SHORTSHA
```

## 6. Validate production

```bash
curl -fsS https://danielsmith.io/livez
curl -fsS https://danielsmith.io/healthz
curl -fsS https://danielsmith.io/
```

If the cluster is directly accessible, also check rollout state from the
Sugarkube environment:

```bash
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
kubectl -n danielsmith get deploy,po,svc,ingress
```

## Cloudflare routes are separate

Cloudflare tunnel DNS, hostnames, and route setup are operational prerequisites
that remain separate from the Helm deployment. Configure or verify Cloudflare
routing before rollout when introducing a new hostname, but do not couple route
changes to the chart render or image publication steps.

## Rollback

Redeploy or promote the previous known-good immutable image tag through the same
Sugarkube commands. Do not roll back to `main-latest`; it is mutable and intended
only as a chart render convenience.
