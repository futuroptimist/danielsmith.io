# Sugarkube onboarding for danielsmith.io

This document describes the canonical Sugarkube deployment flow for `danielsmith.io`.

## Architecture summary

- `danielsmith.io` is a **static Vite + Three.js web app**.
- It has **no API, backend, database, queue, worker, or stateful runtime service**.
- Runtime delivery is static web serving from the production container image.
- The web server layer serves health endpoints at:
  - `/livez`
  - `/healthz`
- Browser route navigation uses SPA fallback.

## Canonical deploy artifacts

- Container image: `ghcr.io/futuroptimist/danielsmith.io`
- OCI Helm chart: `oci://ghcr.io/futuroptimist/charts/danielsmith`
- Preferred image tags:
  - Immutable signoff tags: `main-<shortsha>`
  - Convenience-only tag: `main-latest` (not for signoff)

## Sugarkube command examples

> Run the following commands from a **Sugarkube checkout**, not from this app repo.

First staging install:

```bash
just helm-oci-install release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

Existing staging upgrade:

```bash
just helm-oci-upgrade release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

Production deploys use the same helpers, swapping staging values for prod values:

```text
docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.prod.yaml
```

Sugarkube-specific wrappers are expected after the Sugarkube onboarding prompts land.

## Default hostnames

- Staging default hostname: `https://staging.danielsmith.io`
- Production default hostname: `https://danielsmith.io`

Operators can override hostnames through Sugarkube values and Cloudflare routes.

## Post-deploy validation

Staging examples:

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
curl -fsS https://staging.danielsmith.io/livez
curl -fsS https://staging.danielsmith.io/healthz
curl -fsS https://staging.danielsmith.io/
```

Production equivalents use `https://danielsmith.io`.

## Rollback

- Redeploy a previously known-good immutable image tag (`main-<shortsha>`) with Sugarkube Helm OCI helpers.
- Keep prior known-good immutable tags available for quick rollback.
- Helm revision rollback can also be used from Sugarkube when appropriate.
