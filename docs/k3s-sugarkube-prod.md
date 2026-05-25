# danielsmith.io on k3s Sugarkube production

This runbook covers production deployment of the static **danielsmith.io** web app.

## Production architecture summary

- Static Vite + Three.js application.
- Runtime serves static assets from `ghcr.io/futuroptimist/danielsmith.io`.
- No API/backend/database/queue/worker/stateful components.
- Health probes are web-server endpoints: `/livez` and `/healthz`.
- SPA fallback supports browser route refresh/deep links.

## Production defaults

- Release: `danielsmith`
- Namespace: `danielsmith`
- Hostname: `https://danielsmith.io`
- Chart: `oci://ghcr.io/futuroptimist/charts/danielsmith`
- Tag policy: prefer immutable `main-<shortsha>`; avoid signoff on `main-latest`.

Operators can override hostnames via Sugarkube values and Cloudflare routes.

## Commands (run from Sugarkube checkout)

Upgrade using prod values:

```bash
just helm-oci-upgrade release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.prod.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

(If you need an initial bootstrap flow, use the equivalent `helm-oci-install` pattern with the
same release, namespace, chart, and prod values files.)

Sugarkube-specific wrapper commands may be added later; these generic helpers remain canonical.

## Validation checklist

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
curl -fsS https://danielsmith.io/livez
curl -fsS https://danielsmith.io/healthz
curl -fsS https://danielsmith.io/
```

## Rollback

- Redeploy last known-good immutable tag: `main-<shortsha>`.
- Keep prior good tags available to avoid blocked restores.
- Optional: use Helm revision rollback in Sugarkube for chart revision reverts.
