# Main Preview candidate build

The [candidate workflow](../../.github/workflows/main-preview-candidate.yml) prepares a static
artifact for an exact `main` push commit or pull request head; a pull request artifact is validation
only and is not a main candidate. The checkout is checked against the full expected SHA. This job
uses no deployment credentials and does not publish a website, change DNS, or call Sugarkube.

The workflow stages Vite output without source maps, writes `site/runtime/main-preview.json` with
the full source SHA, and records a sorted SHA-256 inventory for all staged files, including that
stamp. Playwright serves the staged `site/` directory on loopback, checks its JSON identity and opens
`/studio` directly in immersive mode, then checks that the avatar asset is served and loaded. Browser
requests outside the loopback origin are blocked. This tests local static serving, not a future Pages
host, edge routing, or live integrations.

A passing run attaches `main-preview.tar.gz` containing just `site/` and `SHA256SUMS.json`. The job
verifies the same staged files again after browser smoke and checks a fresh extraction before
attachment. You can also verify an extracted artifact with:

```bash
node .github/scripts/main-preview-bundle.cjs verify <full-source-sha> <extracted-bundle-directory>
```

Artifacts expire after 14 days. They are neither a durable rollback store nor proof of promotion.
Design and authorization for a stable URL, a hosting provider, ordered promotion and durable rollback
storage are separate from this workflow.

## Generated commits and recovery

A push made by a workflow token does not fire another push workflow. After a successful `main`
push, the launch-screenshot and floor-plan generators call the same read-only builder with
the commit they actually pushed. No-change, failed and non-main jobs do not hand off a candidate.
The builder rejects a malformed SHA or a commit not on `main`'s first-parent history. It allows an
earlier main commit if another push completed while the job was queued. Each generated commit gets
its own SHA-named artifact; a newer handoff does not replace an older one.

The artifact and the build job summary identify the generated commit. The surrounding workflow
run's event SHA is the commit that started the generator; it is not the generated artifact's source.

Favicon and resume generation, including resume GCS publishing, are unchanged. They do **not** hand
off preview automatically. To recover one of their commits or any other missed candidate, select
**Run workflow**
under **Main Preview candidate**, keep branch `main`, and enter the exact missing full source SHA.
Recovery also requires that SHA to be on `main`'s first-parent history and contain the existing
preview tooling. It only rebuilds and tests that commit, and does not replay a generator, trigger
production checks, or publish anything outside the Actions run.
