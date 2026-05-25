# Sugarkube onboarding (danielsmith.io)

This runbook documents how to deploy `danielsmith.io` to Sugarkube as a static web app.

## Architecture

`danielsmith.io` is a static Vite + Three.js site:

- No API service.
- No backend workers.
- No database, queue, or stateful compute.
- Runtime is static file serving from the production container image.
- The web-server layer exposes health endpoints:
  - `/livez`
  - `/healthz`
- Browser routes are handled with SPA fallback.

## Canonical artifacts

- Container image: `ghcr.io/futuroptimist/danielsmith.io`
- Helm chart (OCI): `oci://ghcr.io/futuroptimist/charts/danielsmith`
- Preferred image tags:
  - `main-<shortsha>` for immutable staging/prod validation and sign-off.
  - `main-latest` only for convenience and non-signoff checks.

## Sugarkube command flow

Run the following commands from a Sugarkube repository checkout (not from this repo).

Prerequisite: before running these commands, ensure the Sugarkube checkout contains
`docs/apps/danielsmith.version` and the referenced values files under `docs/examples/`
(or update `version_file`/`values` to paths that exist in that checkout).

### First staging install

```bash
just helm-oci-install release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

### Existing staging upgrade

```bash
just helm-oci-upgrade release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

### First production install

```bash
just helm-oci-install release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.prod.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

### Existing production upgrade

```bash
just helm-oci-upgrade release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.prod.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

> Note: Production commands intentionally use only
> `docs/examples/danielsmith.values.prod.yaml` so production does not inherit
> any settings from development values files.

Sugarkube-specific wrapper commands are expected after Sugarkube onboarding prompts land.

## Hostnames

Default routes:

- Staging: `https://staging.danielsmith.io`
- Production: `https://danielsmith.io`

Operators can override hostnames via Sugarkube values and Cloudflare routing.

## Validation checks

Staging:

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
curl -fsS https://staging.danielsmith.io/livez
curl -fsS https://staging.danielsmith.io/healthz
curl -fsS https://staging.danielsmith.io/
```

Production:

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
curl -fsS https://danielsmith.io/livez
curl -fsS https://danielsmith.io/healthz
curl -fsS https://danielsmith.io/
```

## Rollback

- Redeploy the previous immutable `main-<shortsha>` image tag through Sugarkube Helm OCI
  helpers.
- Keep previously validated tags available so rollback is immediate.
- Helm revision rollback is also available from the Sugarkube side when needed.
