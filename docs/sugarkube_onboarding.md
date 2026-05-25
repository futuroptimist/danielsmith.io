# danielsmith.io Sugarkube onboarding

This guide documents the **danielsmith.io** deployment model used by Sugarkube.

## Architecture

`danielsmith.io` is a static web application built with Vite + Three.js.

- No API service.
- No backend service.
- No database.
- No queue or worker tier.
- No stateful runtime component.

Runtime delivery is a production container that serves static web assets.

The web server layer exposes health endpoints and SPA routing support:

- `GET /livez`
- `GET /healthz`
- SPA fallback for browser routes to the app entrypoint.

## Artifacts

Sugarkube deploys the app using these app-owned artifacts:

- Container image: `ghcr.io/futuroptimist/danielsmith.io`
- OCI chart: `oci://ghcr.io/futuroptimist/charts/danielsmith`

Preferred image tags:

- `main-<shortsha>` for immutable staging/prod validation and signoff.
- `main-latest` for convenience only (non-signoff workflows).

## Release/namespace defaults

- Release: `danielsmith`
- Namespace: `danielsmith`

Default hostnames:

- Staging: `https://staging.danielsmith.io`
- Production: `https://danielsmith.io`

Operators can override hostnames through Sugarkube values and Cloudflare routing.

## Deploy from Sugarkube checkout

Run deployment commands from a **Sugarkube repository checkout**, not from this repo.

### First staging install

```bash
just helm-oci-install release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

### Existing staging upgrade

```bash
just helm-oci-upgrade release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

### Production upgrade

Use prod values while keeping the same release/chart/tag pattern:

```bash
just helm-oci-upgrade release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.prod.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

> Sugarkube convenience wrappers for danielsmith.io can be layered on top of these generic Helm
> OCI helper commands after Sugarkube onboarding prompts are completed.

## Validation

Staging validation:

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
curl -fsS https://staging.danielsmith.io/livez
curl -fsS https://staging.danielsmith.io/healthz
curl -fsS https://staging.danielsmith.io/
```

Production validation (host swap only):

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
curl -fsS https://danielsmith.io/livez
curl -fsS https://danielsmith.io/healthz
curl -fsS https://danielsmith.io/
```

## Rollback

Rollback options are operationally simple because the app is static web serving:

1. Redeploy a previous known-good immutable image tag (`main-<shortsha>`) via the Sugarkube Helm
   OCI helper.
2. Keep at least one prior known-good immutable tag available for fast restore.
3. Use Helm revision rollback from Sugarkube if a chart/app revision revert is preferred.
