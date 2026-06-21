# Résumé hosting runbook

This runbook covers the dedicated résumé host at `resume.danielsmith.io`. It does
not change the `danielsmith` or `danielsmith.io` website buckets, DNS,
Cloudflare, load balancers, certificates, bucket website settings, bucket-level
IAM, or the static-site deployment.

## Current hosting model

- Cloud Storage bucket: `resume.danielsmith.io`.
- Deployed object: `Daniel_Smith_Resume.pdf`.
- GCS destination: `gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf`.
- Public storage URL:
  `https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf`.
- Canonical public URL: `https://resume.danielsmith.io`.
- Public access is object-level. The object ACL includes `allUsers` with the
  `READER` role.

P6 produces and persists `public/resume.pdf` in this repository. P8 deploys that
exact PDF byte-for-byte to the existing GCS object above. The deployment does not
compile TeX, regenerate artifacts, deploy `public/resume.docx`, or edit the PDF
bytes.

## Automated deployment

The **Deploy resume to GCS** workflow (`.github/workflows/resume-gcs.yml`) runs
on:

- pushes to `main` that change `public/resume.pdf` or the workflow itself; and
- manual `workflow_dispatch` runs.

Pull requests never authenticate to Google Cloud and never deploy. The workflow
uses GitHub OIDC with Google Workload Identity Federation, `gcloud storage`, and
repository variables only. It does not use `gsutil`, long-lived service account
JSON keys, or `contents: write`.

The workflow uploads only `public/resume.pdf` to
`gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf` with this metadata:

```text
Content-Type: application/pdf
Content-Disposition: inline; filename="Daniel_Smith_Resume.pdf"
Cache-Control: public, max-age=300, must-revalidate
```

After upload, it adds or confirms the object ACL grant with:

```bash
gcloud storage objects update \
  "gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf" \
  --add-acl-grant=entity=allUsers,role=READER
```

This preserves the object-level public-read model without making the bucket
public, granting public write access, changing bucket IAM, or replacing other
object ACL grants with `--predefined-acl=publicRead`.

## Required repository variables

Configure these repository variables before running the deployment workflow:

| Variable                         | Expected value                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `GCP_PROJECT_ID`                 | Google Cloud project ID for the `danielsmith io` project                       |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full Workload Identity Provider resource name                                  |
| `GCP_SERVICE_ACCOUNT`            | Dedicated deploy service account email                                         |
| `RESUME_GCS_DESTINATION`         | `gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf`                           |
| `RESUME_PUBLIC_URL`              | `https://resume.danielsmith.io`                                                |
| `RESUME_STORAGE_PUBLIC_URL`      | `https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf` |

Missing variables fail before any authentication or upload step.

## Workload Identity Federation setup

At a high level, Google Cloud should have:

1. A dedicated service account for résumé deployment.
2. A GitHub OIDC Workload Identity Provider.
3. A repository-scoped trust condition for `futuroptimist/danielsmith.io`.
4. Permission for the trusted GitHub principal to impersonate the service
   account.
5. Bucket-scoped object write permissions for `resume.danielsmith.io`.

Prefer least privilege scoped to the `resume.danielsmith.io` bucket. Do not use
project-wide Storage Admin except as a temporary troubleshooting step, and do not
store service-account JSON keys in GitHub.

## Manual break-glass deployment

Use this only when the workflow cannot run and an operator has authenticated
locally with `gcloud`.

```bash
set -euo pipefail

local_pdf="public/resume.pdf"
destination="gs://resume.danielsmith.io/Daniel_Smith_Resume.pdf"
storage_url="https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf"
canonical_url="https://resume.danielsmith.io"

local_sha256=$(sha256sum "${local_pdf}" | awk '{print $1}')

gcloud storage cp "${local_pdf}" "${destination}" \
  --content-type="application/pdf" \
  --content-disposition='inline; filename="Daniel_Smith_Resume.pdf"' \
  --cache-control="public, max-age=300, must-revalidate"

gcloud storage objects update "${destination}" \
  --add-acl-grant=entity=allUsers,role=READER

for url in "${storage_url}" "${canonical_url}"; do
  separator='?'
  case "${url}" in *\?*) separator='&' ;; esac
  tmp_pdf=$(mktemp)
  tmp_headers=$(mktemp)
  curl --fail --silent --show-error --location \
    --dump-header "${tmp_headers}" \
    --output "${tmp_pdf}" \
    "${url}${separator}resume_manual_cache_bust=$(date +%s)"
  test -s "${tmp_pdf}"
  head -c 5 "${tmp_pdf}" | grep -q '%PDF-'
  grep -i '^content-type:.*application/pdf' "${tmp_headers}"
  remote_sha256=$(sha256sum "${tmp_pdf}" | awk '{print $1}')
  test "${remote_sha256}" = "${local_sha256}"
  rm -f "${tmp_pdf}" "${tmp_headers}"
done
```

## Run `workflow_dispatch`

1. Open **Actions** in GitHub.
2. Select **Deploy resume to GCS**.
3. Choose **Run workflow** on `main`.
4. Confirm the job summary reports matching SHA-256 values for the local file,
   storage URL, and canonical URL.

## Verify from a shell

```bash
set -euo pipefail

local_pdf="public/resume.pdf"
local_sha256=$(sha256sum "${local_pdf}" | awk '{print $1}')

for url in \
  "https://storage.googleapis.com/resume.danielsmith.io/Daniel_Smith_Resume.pdf" \
  "https://resume.danielsmith.io"; do
  separator='?'
  case "${url}" in *\?*) separator='&' ;; esac
  tmp_pdf=$(mktemp)
  tmp_headers=$(mktemp)
  curl --fail --silent --show-error --location \
    --dump-header "${tmp_headers}" \
    --output "${tmp_pdf}" \
    "${url}${separator}resume_verify_cache_bust=$(date +%s)"
  test -s "${tmp_pdf}"
  head -c 5 "${tmp_pdf}" | grep -q '%PDF-'
  grep -i '^content-type:.*application/pdf' "${tmp_headers}"
  remote_sha256=$(sha256sum "${tmp_pdf}" | awk '{print $1}')
  test "${remote_sha256}" = "${local_sha256}"
  printf '%s %s\n' "${remote_sha256}" "${url}"
  rm -f "${tmp_pdf}" "${tmp_headers}"
done
```

`Content-Disposition` should be `inline; filename="Daniel_Smith_Resume.pdf"`
when surfaced. Some custom-domain paths may omit it; treat that as a warning if
the response is otherwise an unauthenticated non-empty PDF with matching bytes.

## Rollback

Rollback by changing the stable repository artifact and letting the workflow
redeploy it:

- restore `public/resume.pdf` from a prior Git commit that contained the desired
  PDF; or
- copy a prior `public/docs/resume/<version>/resume.pdf` over the stable
  `public/resume.pdf` in a rollback PR.

Do not edit generated PDF bytes manually. Merge the rollback PR to `main`; the
workflow will publish the restored stable PDF to the existing GCS object.

## Troubleshooting

- **Missing repository variables:** the first validation step lists every missing
  variable and exits before authentication.
- **OIDC trust failures:** confirm the provider resource in
  `GCP_WORKLOAD_IDENTITY_PROVIDER` and the repository-scoped condition for
  `futuroptimist/danielsmith.io`.
- **Service account impersonation failures:** confirm the GitHub OIDC principal
  can impersonate `GCP_SERVICE_ACCOUNT`.
- **Bucket permission failures:** grant only the bucket-scoped object permissions
  needed to write `resume.danielsmith.io/Daniel_Smith_Resume.pdf`.
- **Object ACL/public-read failures:** confirm uniform bucket-level access is not
  blocking object ACLs and rerun the `gcloud storage objects update` ACL grant.
- **Content-Type mismatch:** reapply the upload metadata and verify the storage
  URL headers before debugging the canonical URL.
- **Content-Disposition mismatch:** reapply metadata. If only the canonical URL
  omits the header but the bytes and PDF content type match, treat it as custom
  domain behavior rather than a failed deployment.
- **Canonical URL not matching storage URL:** compare checksums from both public
  endpoints and inspect cache or custom-domain routing before changing storage.
- **Cache propagation:** wait at least the five-minute cache window implied by
  `Cache-Control: public, max-age=300, must-revalidate`, then verify with a new
  cache-busting query parameter.
- **Checksum mismatch:** stop and compare the local `public/resume.pdf` SHA-256
  with both downloaded files. Do not deploy `public/resume.docx` or regenerate
  artifacts in this workflow.
