# k3s Sugarkube production runbook (danielsmith.io)

This runbook covers production deployments for danielsmith.io on Sugarkube.

## Service model

danielsmith.io is a static site deployment:

- Static Vite + Three.js assets
- No API/backend/database/queue/worker/stateful service
- Web-server-owned health endpoints:
  - `/livez`
  - `/healthz`
- SPA fallback for browser routes

## Artifacts and release identity

- Image: `ghcr.io/futuroptimist/danielsmith.io`
- Chart: `oci://ghcr.io/futuroptimist/charts/danielsmith`
- Release: `danielsmith`
- Namespace: `danielsmith`

Tag policy:

- Preferred: immutable `main-<shortsha>`
- Convenience only: `main-latest`

## Production deploy command (from Sugarkube checkout)

Production uses dev + prod values:

- `docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.prod.yaml`

Example command:

```bash
just helm-oci-upgrade release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.prod.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

Sugarkube wrappers for this app are planned in the follow-up Sugarkube prompts.

## Production hostname

Default production URL: `https://danielsmith.io`

Operators can override hostname through Sugarkube values and Cloudflare routing rules.

## Post-deploy validation

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
curl -fsS https://danielsmith.io/livez
curl -fsS https://danielsmith.io/healthz
curl -fsS https://danielsmith.io/
```

## Rollback

- Redeploy a previous immutable `main-<shortsha>` with Sugarkube Helm OCI helpers.
- Keep previously known-good tags available for fast rollback.
- Use Helm revision rollback from Sugarkube when revision restore is preferred.
