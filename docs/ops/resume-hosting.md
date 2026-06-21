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

The **Resume artifacts** workflow (`.github/workflows/resume.yml`) produces and
persists the stable repository artifact at `public/resume.pdf`. The **Deploy resume
to GCS** workflow then deploys that exact PDF byte-for-byte to the existing GCS object
named `Daniel_Smith_Resume.pdf`. The deploy workflow does not compile TeX, regenerate
resume artifacts, deploy other resume formats, edit resume content, or edit generated PDF bytes.

The deployment workflow is `.github/workflows/resume-gcs.yml`. It runs on successful
`Resume artifacts` workflow completions that were started by a `push` to `main`, direct
pushes to `main` that change `public/resume.pdf` or the deployment workflow itself,
and manual `workflow_dispatch` runs from `main`. The `workflow_run` handoff is required
because GitHub suppresses follow-on workflow runs for commits that `Resume artifacts`
pushes with `GITHUB_TOKEN`. For `workflow_run` events, the deploy job checks out the
current `main` branch after the artifact commit exists and records `git rev-parse HEAD`
in the job summary as the deployed source commit SHA. It does not run on
`pull_request`, so pull requests never authenticate to Google Cloud or deploy.

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

The workflow fails before authentication or upload if any required variable is missing.
Manual `workflow_dispatch` runs also fail before checkout or Google authentication
unless the selected branch is `main`. The resume destination, canonical URL, and storage
URL remain repository variables, but the workflow validates them against the production
object and URLs so operators cannot accidentally point a deployment elsewhere.

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
- `Cache-Control: no-cache, max-age=0, s-maxage=0, must-revalidate, proxy-revalidate`

After upload, it runs:

```bash
gcloud storage objects update \
  "gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf" \
  --add-acl-grant=entity=allUsers,role=READER
```

This preserves existing object ACL grants while adding or confirming public read access.
Do not use canned public-read ACL replacement flags unless a future runbook change
explicitly explains why replacing other object ACL grants is acceptable.

Because `resume.danielsmith.io` is a stable URL whose bytes can change when the resume
is updated, the object intentionally uses a no-stale cache policy:
`no-cache, max-age=0, s-maxage=0, must-revalidate, proxy-revalidate`. This allows
browsers and shared caches to store a response only if they revalidate it before reuse.
Do not replace this with a short public `max-age` policy for the stable alias.

## Running `workflow_dispatch`

1. Open GitHub Actions for `futuroptimist/danielsmith.io`.
2. Select **Deploy resume to GCS**.
3. Choose **Run workflow** on `main`. A run started from any other branch is expected
   to fail immediately with a `Resume GCS deploys must run from main` error before
   checkout or Google authentication.
4. Wait for the job summary to report the checked-out source commit SHA plus matching
   local, storage URL, and canonical URL SHA-256 values.

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
  echo "${LOCAL_RESUME_PATH} is missing or empty. Run Resume artifacts first." >&2
  exit 1
fi

local_sha256="$(sha256sum "${LOCAL_RESUME_PATH}" | awk '{print $1}')"

gcloud storage cp "${LOCAL_RESUME_PATH}" "${DESTINATION}" \
  --content-type="application/pdf" \
  --content-disposition='inline; filename="Daniel_Smith_Resume.pdf"' \
  --cache-control="no-cache, max-age=0, s-maxage=0, must-revalidate, proxy-revalidate"

gcloud storage objects update "${DESTINATION}" \
  --add-acl-grant=entity=allUsers,role=READER

for mode in cache_busted bare; do
  for url in "${STORAGE_URL}" "${CANONICAL_URL}"; do
    tmpdir="$(mktemp -d)"
    case "${mode}" in
      cache_busted) verify_url="${url}?resume_verify=$(date +%s)" ;;
      bare) verify_url="${url}" ;;
    esac

    curl --location --fail --silent --show-error \
      --connect-timeout 10 \
      --max-time 60 \
      --retry 3 \
      --retry-delay 2 \
      --retry-connrefused \
      --dump-header "${tmpdir}/headers" \
      "${verify_url}" \
      --output "${tmpdir}/resume.pdf"
    test -s "${tmpdir}/resume.pdf"
    test "$(head -c 5 "${tmpdir}/resume.pdf")" = "%PDF-"
    grep -Ei '^content-type:.*application/pdf' "${tmpdir}/headers"
    remote_sha256="$(sha256sum "${tmpdir}/resume.pdf" | awk '{print $1}')"
    test "${remote_sha256}" = "${local_sha256}"
    if [ "${mode}" = "bare" ]; then
      grep -Ei '^cache-control:.*(no-cache|max-age=0)' "${tmpdir}/headers"
    fi
    rm -rf "${tmpdir}"
  done
done
```

## Shell verification

After any deployment, verify both public endpoints are reachable without authentication
and match the repository PDF. Check cache-busted URLs first for immediate object integrity, then bare URLs for actual public readiness:

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
  for mode in cache_busted bare; do
    case "${mode}" in
      cache_busted) verify_url="${url}?resume_verify=$(date +%s)" ;;
      bare) verify_url="${url}" ;;
    esac

    curl --location --fail --silent --show-error \
      --connect-timeout 10 \
      --max-time 60 \
      --retry 3 \
      --retry-delay 2 \
      --retry-connrefused \
      --dump-header "${tmpdir}/${label}-${mode}.headers" \
      --output "${tmpdir}/${label}-${mode}.pdf" \
      "${verify_url}"

    test -s "${tmpdir}/${label}-${mode}.pdf"
    test "$(head -c 5 "${tmpdir}/${label}-${mode}.pdf")" = "%PDF-"
    grep -Ei '^content-type:.*application/pdf' "${tmpdir}/${label}-${mode}.headers"
    remote_sha256="$(sha256sum "${tmpdir}/${label}-${mode}.pdf" | awk '{print $1}')"
    test "${remote_sha256}" = "${local_sha256}"
    if [ "${mode}" = "bare" ]; then
      grep -Ei '^cache-control:.*(no-cache|max-age=0)' "${tmpdir}/${label}-${mode}.headers"
      grep -Ei '^(cache-control|age|etag|last-modified|cf-cache-status|server):' \
        "${tmpdir}/${label}-${mode}.headers" || true
    fi
  done
  rm -rf "${tmpdir}"
done
```

`Content-Disposition` should be `inline` when surfaced. Some Cloud Storage custom-domain
paths may omit it; treat absence as a warning if the response is still a non-empty PDF
with an `application/pdf` content type and matching SHA-256.

## Rollback

Rollback by restoring a prior stable resume artifact in Git, then letting the
`Resume artifacts` to `Deploy resume to GCS` handoff redeploy it:

- Revert or check out a prior Git commit that contains the previous `public/resume.pdf`,
  or
- Copy a prior `public/docs/resume/<version>/resume.pdf` over `public/resume.pdf` in a
  rollback PR.

Do not edit generated PDF bytes by hand. After the rollback PR merges to `main`, wait
for **Resume artifacts** to complete successfully, then confirm **Deploy resume to GCS**
starts from that `workflow_run`. Verify the deploy summary source commit SHA matches
the current `main` commit containing the restored `public/resume.pdf`, both public URL
SHA-256 values match the local file, and object ACL verification reports
`allUsers Reader present; no public write grants observed`.

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
  have `allUsers` `Reader`. Any public `Owner`, `Writer`, or other public-write-like
  grant is a deployment failure and must be removed before considering the object safe.
- **Content-Type mismatch:** re-run the workflow and confirm the upload command sets
  `application/pdf`. The verification step fails if either public endpoint lacks a PDF
  content type.
- **Content-Disposition mismatch:** the object should be uploaded as inline with the
  `Daniel_Smith_Resume.pdf` filename. Absence may be tolerated for public endpoints, but a
  non-inline value is a deployment failure.
- **Canonical URL not matching storage URL:** compare both SHA-256 values in the workflow
  summary. Check custom-domain routing and caching before changing the bucket or object.
- **Stale bare URL despite cache-busted success:** a previous response with
  `cache-control: public, max-age=3600` can remain stale at the bare URL after a
  successful upload. A cache-busted URL may show the new object while the bare URL
  still serves old bytes. Cloudflare purge may not help when `cf-cache-status` is
  `DYNAMIC`, because the stale response can be coming from GCS, Google edge, or
  origin-side public-object caching. The deploy workflow now retries bare storage and
  canonical URLs and fails unless the bare canonical SHA matches the local SHA.
- **Checksum mismatch:** stop and do not retry blindly. Confirm `public/resume.pdf` in the
  checked-out source commit shown in the deploy summary, the GCS object destination, and
  any custom-domain cache behavior. For generated artifact commits, compare the summary
  source SHA to current `main` rather than the earlier `workflow_run` triggering SHA.
