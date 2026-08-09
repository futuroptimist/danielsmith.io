# `@claude` GitHub Actions workflow

`.github/workflows/claude.yml` lets `@claude` mentions on issues, PRs, and PR
reviews trigger an automated Claude Code session (an `authorize` job gates
triggers to a trusted-actor allowlist and rejects fork PRs, a credential-less
`claude-validation` job independently re-runs this repo's lint/typecheck/test
suite, and a sandboxed `claude` job performs the actual response/edit).

## Required secret

The `claude` job authenticates with the **`ANTHROPIC_API_KEY`** repository
secret (Settings → Secrets and variables → Actions), billed per-token against
that key's own Anthropic Console usage. Each repo in this rollout uses its own
distinct key so cost can be attributed per repository.

`CLAUDE_CODE_OAUTH_TOKEN` (a Claude.ai subscription-backed OAuth credential,
billed against that plan's quota instead of a Console API key) is **retired**
for this repo. If the `claude` job starts failing after a credential rotation,
confirm `ANTHROPIC_API_KEY` is present and has billing credit before assuming
the workflow itself regressed.

## Rotating or replacing the key

1. Generate a new key in the Anthropic Console.
2. Update the `ANTHROPIC_API_KEY` secret with the new value.
3. Verify with a real `@claude` mention on an issue or PR — a stale/invalid
   key fails fast (`is_error: true`, `num_turns: 1`, `$0` cost) rather than
   partially working, so a quick round-trip is sufficient to confirm it.
