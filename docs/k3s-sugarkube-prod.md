# K3s Sugarkube production runbook (danielsmith.io)

This guide covers production deployment for `danielsmith.io` on Sugarkube.

## Service profile

`danielsmith.io` is deployed as static web serving only:

- Static Vite + Three.js app.
- No API/backend/database/queue/worker services.
- Runtime: production container serving static files.
- Health endpoints: `/livez` and `/healthz`.
- SPA fallback is enabled for browser routes.

## Canonical deployment coordinates

- Image: `ghcr.io/futuroptimist/danielsmith.io`
- Chart: `oci://ghcr.io/futuroptimist/charts/danielsmith`
- Release: `danielsmith`
- Namespace: `danielsmith`

## Production values profile

Use:

- `docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.prod.yaml`

This prompt intentionally follows the current Sugarkube helper convention: use
`docs/examples/danielsmith.values.dev.yaml` as the shared/base layer and
`docs/examples/danielsmith.values.prod.yaml` as the production override. Ensure
production host/TLS/debug/resource settings are overridden in the prod file; any
neutral common/base values rename belongs in a separate Sugarkube follow-up PR.

Use immutable `main-<shortsha>` tags for rollout and sign-off. Reserve `main-latest` for
non-signoff convenience.

## Command examples (run in Sugarkube repo)

Prerequisite: ensure the Sugarkube checkout contains
`docs/apps/danielsmith.version` and the referenced values files under `docs/examples/`
before running the helpers below (or update `version_file`/`values` to existing paths).

First install:

```bash
just helm-oci-install release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.prod.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

Upgrade:

```bash
just helm-oci-upgrade release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.prod.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

Sugarkube wrapper commands can be adopted after the Sugarkube onboarding prompt sequence lands.

## Default production hostname

- `https://danielsmith.io`

Operators can override hostnames with Sugarkube values and Cloudflare routing updates.

## Validation

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
curl -fsS https://danielsmith.io/livez
curl -fsS https://danielsmith.io/healthz
curl -fsS https://danielsmith.io/
```

## Rollback

- Redeploy the prior immutable `main-<shortsha>` image tag using Sugarkube Helm OCI helpers.
- Keep previous known-good tags available and documented in deployment records.
- Helm revision rollback remains an additional safety option on Sugarkube.
