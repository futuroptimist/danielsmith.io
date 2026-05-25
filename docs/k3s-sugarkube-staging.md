# k3s Sugarkube staging runbook: danielsmith.io

## Purpose

Deploy the static `danielsmith.io` web app into the staging k3s/Sugarkube environment.

## Deployment model

- Static web app only (Vite + Three.js).
- No API/backend/database/queue/worker/stateful service.
- Runtime is static container serving with SPA fallback.
- Health checks are served by the web-server layer at `/livez` and `/healthz`.

## Artifact references

- Image: `ghcr.io/futuroptimist/danielsmith.io`
- Chart: `oci://ghcr.io/futuroptimist/charts/danielsmith`
- Release: `danielsmith`
- Namespace: `danielsmith`
- Hostname default: `https://staging.danielsmith.io`

Use immutable `main-<shortsha>` tags for validation and signoff. Use `main-latest` only for convenience.

## Commands (run from Sugarkube repo)

First install:

```bash
just helm-oci-install release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

Upgrade existing release:

```bash
just helm-oci-upgrade release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

Sugarkube wrappers for danielsmith are expected after the Sugarkube onboarding sequence completes.

## Validation

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
curl -fsS https://staging.danielsmith.io/livez
curl -fsS https://staging.danielsmith.io/healthz
curl -fsS https://staging.danielsmith.io/
```

## Rollback

1. Identify previous known-good immutable tag (`main-<shortsha>`).
2. Re-run staging upgrade with that tag as `default_tag`.
3. Optionally use Helm revision rollback from Sugarkube tooling.
