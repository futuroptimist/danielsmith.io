# Claude repository guidance

Follow [AGENTS.md](AGENTS.md) for repository conventions and quality gates.
For every site change, follow [the release policy](docs/ops/versioning.md): update
`docs/changelog.md`, advance the application `appVersion`, and advance the Helm chart
`version` whenever chart content changes (including `appVersion`). Private npm package
metadata is independent. Keep unmerged work unreleased and preserve human staging and
production approval gates.
