# K3s Sugarkube staging runbook (danielsmith.io)

This guide covers staging deployment of the static `danielsmith.io` site on Sugarkube.

## Service profile

- Runtime type: static Vite + Three.js site served by a web server.
- Stateful dependencies: none.
- Backend/API components: none.
- Health endpoints: `/livez` and `/healthz`.
- Browser navigation supports SPA fallback.

## Artifacts

- Image: `ghcr.io/futuroptimist/danielsmith.io`
- Chart: `oci://ghcr.io/futuroptimist/charts/danielsmith`
- Release: `danielsmith`
- Namespace: `danielsmith`

## Preferred image tag strategy

- Use immutable `main-<shortsha>` for validation and sign-off.
- Use `main-latest` only for convenience checks.

## Install/upgrade commands (run in Sugarkube repo)

Prerequisite: ensure the Sugarkube checkout contains `docs/apps/danielsmith.version`
and the referenced values files under `docs/examples/` before running the
helpers below (or update `version_file`/`values` to existing paths).

First install:

```bash
just helm-oci-install release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

Upgrade:

```bash
just helm-oci-upgrade release=danielsmith namespace=danielsmith chart=oci://ghcr.io/futuroptimist/charts/danielsmith values=docs/examples/danielsmith.values.dev.yaml,docs/examples/danielsmith.values.staging.yaml version_file=docs/apps/danielsmith.version default_tag=main-REPLACE_SHORTSHA
```

Sugarkube wrapper commands can replace these once onboarding tasks are complete.

## Default staging hostname

- `https://staging.danielsmith.io`

Hostname/routing can be overridden through Sugarkube values and Cloudflare routes.

## Validation

```bash
kubectl -n danielsmith get deploy,po,svc,ingress
kubectl -n danielsmith rollout status deploy/danielsmith --timeout=180s
curl -fsS https://staging.danielsmith.io/livez
curl -fsS https://staging.danielsmith.io/healthz
curl -fsS https://staging.danielsmith.io/
```

## Rollback

- Re-run `just helm-oci-upgrade ... default_tag=main-<previous-shortsha>` with the previous known-good immutable tag.
- Keep known-good immutable tags recorded and available.
- If needed, perform a Helm revision rollback from Sugarkube.
