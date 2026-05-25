# danielsmith.io on k3s Sugarkube staging

This runbook covers staging deployment of the static **danielsmith.io** web app.

## Staging architecture summary

- Static Vite + Three.js application.
- Runtime serves static assets from `ghcr.io/futuroptimist/danielsmith.io`.
- No API/backend/database/queue/worker/stateful components.
- Health probes are web-server endpoints: `/livez` and `/healthz`.
- SPA fallback supports browser route refresh/deep links.

## Staging defaults

- Release: `danielsmith`
- Namespace: `danielsmith`
- Hostname: `https://staging.danielsmith.io`
- Chart: `oci://ghcr.io/futuroptimist/charts/danielsmith`
- Tag policy: prefer immutable `main-<shortsha>`; avoid signoff on `main-latest`.

## Commands (run from Sugarkube checkout)

First install:

```bash
just helm-oci-install release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

Upgrade:

```bash
just helm-oci-upgrade release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

Sugarkube-specific wrapper commands may be added later; these generic helpers remain canonical.

## Validation checklist

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
curl -fsS https://staging.danielsmith.io/livez
curl -fsS https://staging.danielsmith.io/healthz
curl -fsS https://staging.danielsmith.io/
```

## Rollback

- Redeploy last known-good immutable tag: `main-<shortsha>`.
- Keep prior good tags available to avoid blocked restores.
- Optional: use Helm revision rollback in Sugarkube for chart revision reverts.
