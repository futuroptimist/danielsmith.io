# Sugarkube onboarding for danielsmith.io

This guide documents how to onboard **danielsmith.io** to Sugarkube as a static web app.

## Architecture summary

- danielsmith.io is a **static Vite + Three.js site**.
- It has **no API, backend, database, queue, worker, or other stateful service**.
- Runtime delivery is static web serving from the production container image.
- Health checks are exposed by the web-server layer at:
  - `/livez`
  - `/healthz`
- Browser routes are supported via SPA fallback.

## Canonical deployment artifacts

- Container image: `ghcr.io/futuroptimist/danielsmith.io`
- Helm chart (OCI): `oci://ghcr.io/futuroptimist/charts/danielsmith`

Preferred image-tag policy:

- Use immutable `main-<shortsha>` tags for staging/prod validation and sign-off.
- Use `main-latest` only for convenience or non-signoff testing.

## Sugarkube Helm OCI commands

> Run these commands from a **Sugarkube checkout**, not from this repository.

### First staging install

```bash
just helm-oci-install release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

### Existing staging upgrade

```bash
just helm-oci-upgrade release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

### Production upgrade pattern

Production uses the same release/chart flow with prod values:

- `docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.prod.yaml`

Sugarkube-specific wrapper commands will be added in Sugarkube onboarding follow-up prompts.

## Hostnames

Default endpoints:

- Staging: `https://staging.danielsmith.io`
- Production: `https://danielsmith.io`

Operators can override hostnames through Sugarkube values and Cloudflare routing.

## Validation checklist

After install/upgrade, validate rollout and HTTP endpoints.

### Staging

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
curl -fsS https://staging.danielsmith.io/livez
curl -fsS https://staging.danielsmith.io/healthz
curl -fsS https://staging.danielsmith.io/
```

### Production

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
curl -fsS https://danielsmith.io/livez
curl -fsS https://danielsmith.io/healthz
curl -fsS https://danielsmith.io/
```

## Rollback

If a release needs to be reverted:

1. Redeploy a previous immutable `main-<shortsha>` image tag via Sugarkube Helm OCI helper.
2. Keep at least one previously known-good immutable tag available for fast recovery.
3. Optionally use Helm revision rollback from Sugarkube if you need to restore a prior Helm state.
