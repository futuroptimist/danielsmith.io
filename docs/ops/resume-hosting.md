# Resume custom-domain hosting runbook

This runbook covers the dedicated resume host at `resume.danielsmith.io`. It does not cover the
main `danielsmith.io` static-site deployment, Cloudflare DNS, load balancers, certificates, bucket
website settings, or any bucket creation.

## Current hosting model

- Google Cloud Storage bucket: `resume.danielsmith.io`.
- Deployed object: `Daniel_Smith_Resume.pdf`.
- Upload destination: `gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf`.
- Public Cloud Storage URL:
  `https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf`.
- Canonical public URL: `https://resume.danielsmith.io`.
- Public access is object-level. The object ACL includes `allUsers` with `Reader` access.
- The `danielsmith` and `danielsmith.io` buckets are separate web-hosting targets and are out of
  scope for this workflow.

P6 produces and persists the stable `public/resume.pdf` artifact in this repository. P8 deploys
that exact PDF byte-for-byte to the existing Cloud Storage object above. The deployment must not
compile TeX, regenerate resume artifacts, deploy `public/resume.docx`, rename the Cloud Storage
object, or edit generated PDF bytes.

## Automated deployment

The **Deploy resume to GCS** workflow (`.github/workflows/resume-gcs.yml`) runs on:

- pushes to `main` that change `public/resume.pdf` or the workflow file; and
- manual `workflow_dispatch` runs.

The workflow never runs on `pull_request`. It checks that `public/resume.pdf` exists before Google
Cloud authentication so a missing stable artifact fails with a clear message that P6 must run first.
It authenticates with GitHub OIDC and Google Workload Identity Federation, uploads only
`public/resume.pdf`, sets PDF metadata, adds or confirms the `allUsers` `Reader` object ACL, and
verifies both public URLs by downloading them without authentication and comparing SHA-256 checksums
against the committed file.

Required repository variables:

| Variable                         | Expected value                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `GCP_PROJECT_ID`                 | Google Cloud project ID for the observed `danielsmith io` project              |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full Workload Identity Provider resource name                                  |
| `GCP_SERVICE_ACCOUNT`            | Deployment service account email                                               |
| `RESUME_GCS_DESTINATION`         | `gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf`                           |
| `RESUME_PUBLIC_URL`              | `https://resume.danielsmith.io`                                                |
| `RESUME_STORAGE_PUBLIC_URL`      | `https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf` |

### Google Workload Identity Federation setup

At a high level, configure:

1. A dedicated Google service account for this resume deployment.
2. A GitHub OIDC Workload Identity Provider.
3. A repository-scoped trust condition for `futuroptimist/danielsmith.io`.
4. Service account impersonation from that provider to the dedicated service account.
5. Bucket-scoped permissions sufficient to write and update the object in
   `resume.danielsmith.io`, including object ACL updates.

Least-privilege guidance:

- Prefer permissions scoped only to bucket `resume.danielsmith.io`.
- Do not use project-wide Storage Admin except as a temporary troubleshooting measure.
- Do not store service-account JSON keys or access tokens in GitHub.
- Do not grant public write access.
- Do not change bucket IAM or uniform bucket-level public access settings from this workflow.

## Manual break-glass deployment

Use this only when GitHub Actions is unavailable. Authenticate locally with `gcloud` as an identity
that has bucket-scoped object write and ACL update permissions, then run from the repository root:

```bash
set -euo pipefail

destination='gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf'
storage_url='https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf'
canonical_url='https://resume.danielsmith.io'
local_pdf='public/resume.pdf'

[ -s "${local_pdf}" ]
head -c 5 "${local_pdf}" | grep -q '%PDF-'
local_sha256="$(sha256sum "${local_pdf}" | awk '{print $1}')"

gcloud storage cp "${local_pdf}" "${destination}" \
  --content-type='application/pdf' \
  --content-disposition='inline; filename="Daniel_Smith_Resume.pdf"' \
  --cache-control='public, max-age=300, must-revalidate'

gcloud storage objects update "${destination}" \
  --add-acl-grant=entity=allUsers,role=READER

for url in "${storage_url}" "${canonical_url}"; do
  separator='?'
  case "${url}" in *\?*) separator='&' ;; esac
  tmp_pdf="$(mktemp)"
  tmp_headers="$(mktemp)"
  curl --fail --silent --show-error --location \
    --dump-header "${tmp_headers}" \
    --output "${tmp_pdf}" \
    "${url}${separator}cb=$(date +%s)"
  grep -i '^content-type:.*application/pdf' "${tmp_headers}"
  head -c 5 "${tmp_pdf}" | grep -q '%PDF-'
  test "$(sha256sum "${tmp_pdf}" | awk '{print $1}')" = "${local_sha256}"
  rm -f "${tmp_pdf}" "${tmp_headers}"
done
```

The upload command sets:

- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="Daniel_Smith_Resume.pdf"`
- `Cache-Control: public, max-age=300, must-revalidate`

The ACL command adds or confirms `allUsers` `Reader` on the object without intentionally replacing
other object ACL grants.

## Run `workflow_dispatch`

1. Open GitHub Actions for `futuroptimist/danielsmith.io`.
2. Select **Deploy resume to GCS**.
3. Choose **Run workflow** on `main`.
4. Confirm the summary reports matching local, storage URL, and canonical URL SHA-256 values.

## Verify from a shell

```bash
set -euo pipefail
local_pdf='public/resume.pdf'
local_sha256="$(sha256sum "${local_pdf}" | awk '{print $1}')"
for url in \
  'https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf' \
  'https://resume.danielsmith.io'; do
  tmp_pdf="$(mktemp)"
  tmp_headers="$(mktemp)"
  separator='?'
  case "${url}" in *\?*) separator='&' ;; esac
  curl --fail --silent --show-error --location \
    --dump-header "${tmp_headers}" \
    --output "${tmp_pdf}" \
    "${url}${separator}cb=$(date +%s)"
  grep -i '^content-type:.*application/pdf' "${tmp_headers}"
  head -c 5 "${tmp_pdf}" | grep -q '%PDF-'
  test "$(sha256sum "${tmp_pdf}" | awk '{print $1}')" = "${local_sha256}"
  rm -f "${tmp_pdf}" "${tmp_headers}"
done
```

`Content-Disposition` should be `inline` when surfaced. Some public Cloud Storage or custom-domain
paths may omit that header; treat absence as a warning if the response is a non-empty PDF with the
expected checksum and `application/pdf` content type.

## Rollback

Rollback by changing the repository artifact and letting the workflow redeploy:

- revert or cherry-pick a prior Git commit that contains the previous `public/resume.pdf`; or
- copy a prior `public/docs/resume/<version>/resume.pdf` over `public/resume.pdf` in a rollback PR.

After merge to `main`, the deployment workflow uploads that committed PDF byte-for-byte to the
existing object. Do not roll back by editing the GCS object name, DNS, bucket settings, or resume
custom-domain behavior.

## Troubleshooting

- **Missing repository variables**: the first workflow step fails before authentication and lists
  each missing variable. Configure the variables in repository settings.
- **OIDC trust failures**: confirm the Workload Identity Provider resource name and the trust
  condition for `futuroptimist/danielsmith.io`.
- **Service account impersonation failures**: confirm the GitHub principal set can impersonate the
  deployment service account.
- **Bucket permission failures**: confirm the service account has bucket-scoped object write and
  metadata update permissions on `resume.danielsmith.io`.
- **Object ACL/public-read failures**: confirm the bucket allows object-level ACLs and that the
  service account can update object ACLs. The workflow should add `allUsers` `Reader`, not bucket
  IAM.
- **Content-Type mismatch**: rerun the workflow or manual upload so the object metadata is set to
  `application/pdf`.
- **Content-Disposition mismatch**: rerun upload metadata updates. Absence can be a warning for
  some public paths, but a non-inline value should be fixed.
- **Canonical URL does not match storage URL**: check custom-domain routing and cache layers outside
  this repo; do not change DNS or Cloudflare as part of this workflow.
- **Cache propagation**: the workflow appends cache-busting query parameters and sets
  `Cache-Control: public, max-age=300, must-revalidate`; wait for short-lived caches to expire if a
  browser still sees old bytes.
- **Checksum mismatch**: stop rollout, compare the downloaded files with `public/resume.pdf`, and
  redeploy the committed stable artifact once the source of byte drift is understood.
