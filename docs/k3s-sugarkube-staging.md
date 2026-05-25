# k3s Sugarkube staging runbook (danielsmith.io)

This runbook covers staging deployments for danielsmith.io on Sugarkube.

## Service model

danielsmith.io is deployed as static web serving only:

- Static Vite + Three.js assets
- No API/backend/database/queue/worker/stateful tier
- Health endpoints from the web server:
  - `/livez`
  - `/healthz`
- SPA browser route fallback enabled

## Artifacts

- Image: `ghcr.io/futuroptimist/danielsmith.io`
- Chart: `oci://ghcr.io/futuroptimist/charts/danielsmith`
- Release: `danielsmith`
- Namespace: `danielsmith`

Use immutable `main-<shortsha>` tags for staging sign-off. Use `main-latest` only for convenience.

## First install (from Sugarkube checkout)

```bash
just helm-oci-install release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

## Upgrade (from Sugarkube checkout)

```bash
just helm-oci-upgrade release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

Sugarkube-specific wrapper shortcuts are expected in later Sugarkube onboarding work.

## Staging hostname

Default staging URL: `https://staging.danielsmith.io`

Operators may override hostname via Sugarkube values and Cloudflare route configuration.

## Post-deploy validation

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
curl -fsS https://staging.danielsmith.io/livez
curl -fsS https://staging.danielsmith.io/healthz
curl -fsS https://staging.danielsmith.io/
```

## Rollback

- Redeploy a prior immutable `main-<shortsha>` tag with `just helm-oci-upgrade ... default_tag=...`.
- Keep previous known-good tags available.
- If needed, run a Helm revision rollback from Sugarkube.
