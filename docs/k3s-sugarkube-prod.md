# k3s Sugarkube production runbook: danielsmith.io

## Purpose

Deploy `danielsmith.io` to production with immutable static-site artifacts.

## Deployment model

- Static Vite + Three.js web serving only.
- No API, backend, database, queue, worker, or other stateful runtime service.
- Runtime container serves static assets plus SPA fallback routes.
- Health endpoints are served by the web server:
  - `/livez`
  - `/healthz`

## Artifact references

- Image: `ghcr.io/futuroptimist/danielsmith.io`
- Chart: `oci://ghcr.io/futuroptimist/charts/danielsmith`
- Release: `danielsmith`
- Namespace: `danielsmith`
- Default hostname: `https://danielsmith.io`

Preferred tags:

- Signoff: immutable `main-<shortsha>`
- Convenience/non-signoff only: `main-latest`

## Commands (run from Sugarkube repo)

Production install/upgrade uses prod values:

```bash
just helm-oci-upgrade release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.prod.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

(For first-time cluster bootstrap, use `helm-oci-install` with the same prod values set.)

Sugarkube wrappers are expected after the Sugarkube onboarding prompt sequence lands.

## Validation

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
curl -fsS https://danielsmith.io/livez
curl -fsS https://danielsmith.io/healthz
curl -fsS https://danielsmith.io/
```

## Rollback

- Redeploy a previous known-good immutable image tag via Sugarkube Helm OCI helper commands.
- Keep previous known-good `main-<shortsha>` tags available.
- Use Helm revision rollback from Sugarkube when revision history rollback is preferred.

## Hostname overrides

Operators may override production hostnames using Sugarkube values and Cloudflare routes.
