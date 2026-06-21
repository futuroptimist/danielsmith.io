# Resume hosting runbook

This runbook documents the stable resume artifact deployment path for
`resume.danielsmith.io`. It only covers publishing the repository-owned PDF to
the existing Google Cloud Storage object. It does not create buckets, change DNS,
change Cloudflare, change load balancers, change certificates, alter bucket
website settings, or modify the main `danielsmith.io` site deployment.

## Current hosting model

- Google Cloud project display name observed by the maintainer: `danielsmith io`.
- Bucket: `resume.danielsmith.io`.
- Object: `Daniel_Smith_Resume.pdf`.
- Upload destination: `gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf`.
- Public storage URL:
  `https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf`.
- Canonical public URL: `https://resume.danielsmith.io`.
- Public access is object-level. The object ACL includes `allUsers` with the
  `Reader` role.
- The buckets `danielsmith` and `danielsmith.io` are web-hosting buckets and are
  out of scope for this resume deployment path.

## Artifact lifecycle

P6 builds the resume from `docs/resume/**` and persists the stable artifact at
`public/resume.pdf` in the repository. P8 deploys that exact committed PDF
byte-for-byte to `gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf` without
regenerating TeX, touching `public/resume.docx`, or changing the PDF bytes.

The deployment workflow is `.github/workflows/resume-gcs.yml`. It runs on pushes
to `main` that change `public/resume.pdf` or the workflow, and it also supports
manual `workflow_dispatch` runs. Pull requests do not authenticate to Google
Cloud and do not deploy.

## Required repository variables

Configure these GitHub repository variables before the first deployment:

| Variable                         | Expected value                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `GCP_PROJECT_ID`                 | Google Cloud project ID for the `danielsmith io` project                       |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full Workload Identity Provider resource name                                  |
| `GCP_SERVICE_ACCOUNT`            | Deployment service account email                                               |
| `RESUME_GCS_DESTINATION`         | `gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf`                           |
| `RESUME_PUBLIC_URL`              | `https://resume.danielsmith.io`                                                |
| `RESUME_STORAGE_PUBLIC_URL`      | `https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf` |

The workflow fails before authentication or upload when any required variable is
missing or when `public/resume.pdf` is absent, empty, or not a PDF. If
`public/resume.pdf` is missing, run P6 first and let it commit the stable PDF to
`main`.

## Google Workload Identity Federation setup

Use GitHub OIDC with Google Workload Identity Federation instead of storing a
long-lived service-account JSON key in GitHub.

At a high level:

1. Create a dedicated Google service account for this resume deployment.
2. Configure a GitHub OIDC Workload Identity Provider.
3. Restrict provider trust to `futuroptimist/danielsmith.io` and the intended
   branch/event claims.
4. Allow that provider to impersonate the dedicated service account.
5. Grant the service account only the bucket-scoped object permissions needed to
   upload `Daniel_Smith_Resume.pdf`, update its metadata, and add or confirm the
   object ACL grant for `allUsers` `Reader`.

Prefer permissions scoped to the `resume.danielsmith.io` bucket. Do not use
project-wide storage admin except as a temporary troubleshooting step. Do not
store service-account JSON keys in GitHub secrets or variables.

## Automated deployment behavior

The workflow uploads only `public/resume.pdf` to
`$RESUME_GCS_DESTINATION`. It then sets object metadata:

- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="Daniel_Smith_Resume.pdf"`
- `Cache-Control: public, max-age=300, must-revalidate`

After upload, the workflow adds or confirms the object ACL grant with:

```bash
gcloud storage objects update "$RESUME_GCS_DESTINATION" \
  --add-acl-grant=entity=allUsers,role=READER
```

This preserves the object-level public-read model without making the whole
bucket public, granting public write access, changing bucket IAM, or changing
uniform bucket-level access settings.

The workflow computes the local SHA-256, downloads both public URLs with a
cache-busting query parameter, verifies that both unauthenticated responses are
non-empty PDF byte streams, checks that both content types include
`application/pdf`, and requires both downloaded SHA-256 values to match the local
file. `Content-Disposition` must be `inline` when present. If a public endpoint
omits `Content-Disposition`, the workflow warns in the job summary instead of
failing because Cloud Storage and custom-domain behavior can differ.

## Manual break-glass deployment

Use this only when the automated workflow is unavailable and you have already
authenticated locally with `gcloud` as an operator permitted to update the resume
object.

```bash
set -euo pipefail

local_path="public/resume.pdf"
destination="gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf"
storage_url="https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf"
canonical_url="https://resume.danielsmith.io"

if [ ! -s "${local_path}" ] || [ "$(head -c 5 "${local_path}")" != "%PDF-" ]; then
  echo "${local_path} must exist and be a non-empty PDF. Run P6 first." >&2
  exit 1
fi

local_sha256="$(sha256sum "${local_path}" | awk '{print $1}')"

gcloud storage cp "${local_path}" "${destination}"
gcloud storage objects update "${destination}" \
  --content-type="application/pdf" \
  --content-disposition='inline; filename="Daniel_Smith_Resume.pdf"' \
  --cache-control="public, max-age=300, must-revalidate"
gcloud storage objects update "${destination}" \
  --add-acl-grant=entity=allUsers,role=READER

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

for label in storage canonical; do
  if [ "${label}" = "storage" ]; then
    url="${storage_url}"
  else
    url="${canonical_url}"
  fi

  case "${url}" in
    *\?*) busted_url="${url}&manual_resume_deploy=$(date +%s)" ;;
    *) busted_url="${url}?manual_resume_deploy=$(date +%s)" ;;
  esac

  body="${tmp_dir}/${label}.pdf"
  headers="${tmp_dir}/${label}.headers"
  curl --fail --silent --show-error --location \
    --dump-header "${headers}" \
    --output "${body}" \
    "${busted_url}"

  test -s "${body}"
  test "$(head -c 5 "${body}")" = "%PDF-"
  grep -i '^content-type:.*application/pdf' "${headers}"
  test "$(sha256sum "${body}" | awk '{print $1}')" = "${local_sha256}"
  sed -n '/^HTTP\//p;/^[Cc]ontent-[Tt]ype:/p;/^[Cc]ontent-[Dd]isposition:/p;/^[Cc]ache-[Cc]ontrol:/p' \
    "${headers}"
done
```

## Run `workflow_dispatch`

1. Open the repository's **Actions** tab.
2. Select **Deploy resume to GCS**.
3. Choose **Run workflow** on `main`.
4. Confirm the run summary lists matching local, storage URL, and canonical URL
   SHA-256 values.

## Verify deployment from a shell

```bash
set -euo pipefail

local_path="public/resume.pdf"
local_sha256="$(sha256sum "${local_path}" | awk '{print $1}')"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

for url in \
  "https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf" \
  "https://resume.danielsmith.io"; do
  case "${url}" in
    *\?*) busted_url="${url}&verify_resume=$(date +%s)" ;;
    *) busted_url="${url}?verify_resume=$(date +%s)" ;;
  esac
  safe_name="$(printf '%s' "${url}" | tr -c 'A-Za-z0-9' '_')"
  body="${tmp_dir}/${safe_name}.pdf"
  headers="${tmp_dir}/${safe_name}.headers"
  curl --fail --silent --show-error --location \
    --dump-header "${headers}" \
    --output "${body}" \
    "${busted_url}"
  test -s "${body}"
  test "$(head -c 5 "${body}")" = "%PDF-"
  grep -i '^content-type:.*application/pdf' "${headers}"
  test "$(sha256sum "${body}" | awk '{print $1}')" = "${local_sha256}"
done
```

## Rollback

Use a normal pull request so the automated deployment path remains auditable:

- Revert to a prior Git commit containing the previous `public/resume.pdf`, or
- Copy a prior `public/docs/resume/<version>/resume.pdf` over the stable
  `public/resume.pdf` in a rollback PR.

After the rollback PR merges to `main`, the workflow redeploys that committed
PDF to the existing GCS object.

## Troubleshooting

- **Missing repository variables:** the first workflow step fails with the exact
  missing variable names. Configure all required `vars.*` values and rerun.
- **Missing `public/resume.pdf`:** P6 has not produced the stable PDF yet. Run P6
  first and wait for its commit to land on `main`.
- **OIDC trust failures:** confirm the Workload Identity Provider accepts tokens
  from `futuroptimist/danielsmith.io` for the intended branch and event.
- **Service account impersonation failures:** confirm the provider principal has
  permission to impersonate the deployment service account.
- **Bucket permission failures:** confirm the service account can write objects,
  update object metadata, and update object ACLs for `resume.danielsmith.io`.
- **Object ACL/public-read failures:** confirm object ACLs are enabled for the
  bucket and the service account can add `allUsers` `Reader` to the object.
- **Content-Type mismatch:** rerun the deployment so the workflow resets
  `Content-Type` to `application/pdf`. Check for intermediary header rewriting if
  only the canonical URL is wrong.
- **Content-Disposition mismatch:** the storage URL should expose the inline
  disposition after metadata update. If the canonical URL omits it but still
  serves `application/pdf`, treat the workflow warning as acceptable unless user
  experience changes.
- **Canonical URL not matching storage URL:** check custom-domain routing and
  cache behavior outside this workflow. Do not change DNS, Cloudflare, load
  balancers, certificates, or bucket website settings as part of this deployment
  path.
- **Cache propagation:** cache busters should bypass normal browser caches, but
  intermediaries may lag briefly. Recheck after the five-minute cache window.
- **Checksum mismatch:** stop deployments, compare the local committed
  `public/resume.pdf` to both downloaded endpoints, and verify that no stale cache
  or wrong object path is being served.
