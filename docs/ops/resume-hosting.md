# Resume hosting runbook

This runbook documents the stable resume deployment path for `resume.danielsmith.io`.
It only covers the resume object and must not be used to change the `danielsmith` or
`danielsmith.io` web-hosting buckets, DNS, Cloudflare, load balancers, certificates,
bucket website settings, or bucket-level IAM.

## Current hosting model

The resume host is an existing Google Cloud Storage bucket and object:

- Bucket: `resume.danielsmith.io`
- Object: `Daniel_Smith_Resume.pdf`
- GCS destination: `gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf`
- Public storage URL:
  `https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf`
- Canonical URL: `https://resume.danielsmith.io`

The bucket currently uses object-level ACLs instead of uniform bucket-level public
access. The deployed object must include an object ACL grant for `allUsers` with the
`Reader` role. Do not make the whole bucket public and never grant public write access.

## Automated deployment model

P6 produces and persists the stable repository artifact at `public/resume.pdf`. P8
then deploys that exact PDF byte-for-byte to the existing GCS object named
`Daniel_Smith_Resume.pdf`. The deploy workflow does not compile TeX, regenerate resume
artifacts, deploy `public/resume.docx`, edit resume content, or edit generated PDF
bytes.

The deployment workflow is `.github/workflows/resume-gcs.yml`. It runs on pushes to
`main` that change `public/resume.pdf` or the workflow itself, and it also supports
manual `workflow_dispatch` runs. It does not run on `pull_request`, so pull requests
never authenticate to Google Cloud or deploy.

## Required GitHub repository variables

Configure these repository variables before enabling the workflow:

| Variable                         | Expected value or purpose                                                      |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `GCP_PROJECT_ID`                 | Google Cloud project ID for the observed `danielsmith io` project.             |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full Workload Identity Provider resource name used by GitHub OIDC.             |
| `GCP_SERVICE_ACCOUNT`            | Dedicated deploy service account email to impersonate.                         |
| `RESUME_GCS_DESTINATION`         | `gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf`                           |
| `RESUME_PUBLIC_URL`              | `https://resume.danielsmith.io`                                                |
| `RESUME_STORAGE_PUBLIC_URL`      | `https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf` |

The workflow fails before authentication or upload if any variable is missing. It also
checks that the three resume destination variables match the known production target.

## Google Workload Identity Federation setup

Use GitHub OIDC through Google Workload Identity Federation; do not store a
service-account JSON key in GitHub.

At a high level, the setup should include:

1. A dedicated service account for this resume deployment path.
2. A GitHub OIDC Workload Identity Provider.
3. A repository-scoped trust condition for `futuroptimist/danielsmith.io`.
4. Service account impersonation by that trusted GitHub principal.
5. Bucket-scoped object permissions on `resume.danielsmith.io` sufficient to upload the
   object, set object metadata, describe the object, and add or confirm the object ACL.

Prefer permissions scoped to the `resume.danielsmith.io` bucket. Do not grant
project-wide Storage Admin except as a temporary troubleshooting step, and remove that
broad access immediately after diagnosis.

## Metadata and public-read behavior

The workflow uploads only `public/resume.pdf` to
`gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf` with this metadata:

- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="Daniel_Smith_Resume.pdf"`
- `Cache-Control: public, max-age=300, must-revalidate`

After upload, it runs:

```bash
gcloud storage objects update \
  "gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf" \
  --add-acl-grant=entity=allUsers,role=READER
```

This preserves existing object ACL grants while adding or confirming public read access.
Do not replace object ACLs with `--predefined-acl=publicRead` unless a future runbook
change explicitly explains why replacing other object ACL grants is acceptable.

## Running `workflow_dispatch`

1. Open GitHub Actions for `futuroptimist/danielsmith.io`.
2. Select **Deploy resume to GCS**.
3. Choose **Run workflow** on `main`.
4. Wait for the job summary to report matching local, storage URL, and canonical URL
   SHA-256 values.

## Manual break-glass deployment

Use this only when GitHub Actions is unavailable. Authenticate locally with `gcloud`
using an identity that has bucket-scoped object write and ACL permissions for
`resume.danielsmith.io`.

```bash
set -euo pipefail

LOCAL_RESUME_PATH="public/resume.pdf"
DESTINATION="gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf"
STORAGE_URL="https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf"
CANONICAL_URL="https://resume.danielsmith.io"

if [ ! -s "${LOCAL_RESUME_PATH}" ]; then
  echo "${LOCAL_RESUME_PATH} is missing or empty. P6 must run first." >&2
  exit 1
fi

local_sha256="$(sha256sum "${LOCAL_RESUME_PATH}" | awk '{print $1}')"

gcloud storage cp "${LOCAL_RESUME_PATH}" "${DESTINATION}" \
  --content-type="application/pdf" \
  --content-disposition='inline; filename="Daniel_Smith_Resume.pdf"' \
  --cache-control="public, max-age=300, must-revalidate"

gcloud storage objects update "${DESTINATION}" \
  --add-acl-grant=entity=allUsers,role=READER

for url in "${STORAGE_URL}" "${CANONICAL_URL}"; do
  tmp="$(mktemp)"
  curl --location --fail --silent --show-error "${url}?resume_verify=$(date +%s)" \
    --output "${tmp}"
  test -s "${tmp}"
  test "$(head -c 5 "${tmp}")" = "%PDF-"
  remote_sha256="$(sha256sum "${tmp}" | awk '{print $1}')"
  rm -f "${tmp}"
  test "${remote_sha256}" = "${local_sha256}"
done
```

## Shell verification

After any deployment, verify both public endpoints are reachable without authentication
and match the repository PDF:

```bash
set -euo pipefail

LOCAL_RESUME_PATH="public/resume.pdf"
STORAGE_URL="https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf"
CANONICAL_URL="https://resume.danielsmith.io"
local_sha256="$(sha256sum "${LOCAL_RESUME_PATH}" | awk '{print $1}')"

for label in storage canonical; do
  case "${label}" in
    storage) url="${STORAGE_URL}" ;;
    canonical) url="${CANONICAL_URL}" ;;
  esac

  tmpdir="$(mktemp -d)"
  curl --location --fail --silent --show-error \
    --dump-header "${tmpdir}/${label}.headers" \
    --output "${tmpdir}/${label}.pdf" \
    "${url}?resume_verify=$(date +%s)"

  test -s "${tmpdir}/${label}.pdf"
  test "$(head -c 5 "${tmpdir}/${label}.pdf")" = "%PDF-"
  grep -Ei '^content-type:.*application/pdf' "${tmpdir}/${label}.headers"
  remote_sha256="$(sha256sum "${tmpdir}/${label}.pdf" | awk '{print $1}')"
  test "${remote_sha256}" = "${local_sha256}"
  rm -rf "${tmpdir}"
done
```

`Content-Disposition` should be `inline` when surfaced. Some Cloud Storage custom-domain
paths may omit it; treat absence as a warning if the response is still a non-empty PDF
with an `application/pdf` content type and matching SHA-256.

## Rollback

Rollback by restoring a prior stable resume artifact in Git, then letting the workflow
redeploy it:

- Revert or check out a prior Git commit that contains the previous `public/resume.pdf`,
  or
- Copy a prior `public/docs/resume/<version>/resume.pdf` over `public/resume.pdf` in a
  rollback PR.

Do not edit generated PDF bytes by hand. After the rollback PR merges to `main`, the
workflow redeploys the restored file to the same GCS object.

## Troubleshooting

- **Missing repository variables:** the workflow fails before authentication and lists each
  missing variable. Configure all required `vars.*` values and rerun.
- **OIDC trust failures:** confirm the Workload Identity Provider resource name and the
  repository-scoped trust condition for `futuroptimist/danielsmith.io`.
- **Service account impersonation failures:** confirm the GitHub OIDC principal can
  impersonate the dedicated service account.
- **Bucket permission failures:** confirm the service account has bucket-scoped object
  permissions for `resume.danielsmith.io`; avoid broad project roles except temporarily
  during diagnosis.
- **Object ACL/public-read failures:** confirm uniform bucket-level access is not blocking
  object ACLs and that the deploy identity can update object ACLs. The target object must
  have `allUsers` `Reader`, not public write access.
- **Content-Type mismatch:** re-run the workflow and confirm the upload command sets
  `application/pdf`. The verification step fails if either public endpoint lacks a PDF
  content type.
- **Content-Disposition mismatch:** the object should be uploaded as inline with the
  `Daniel_Smith_Resume.pdf` filename. Absence may be tolerated for public endpoints, but a
  non-inline value is a deployment failure.
- **Canonical URL not matching storage URL:** compare both SHA-256 values in the workflow
  summary. Check custom-domain routing and caching before changing the bucket or object.
- **Cache propagation:** the workflow appends cache-busting query parameters and sets a
  five-minute cache policy. If humans still see stale bytes, wait for cache expiry and
  re-check with a cache-busting URL.
- **Checksum mismatch:** stop and do not retry blindly. Confirm `public/resume.pdf` in the
  checked-out commit, the GCS object destination, and any custom-domain cache behavior.
