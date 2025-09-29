# Agent Playbook

Welcome to `danielsmith.io`. Follow these guardrails when working inside this repository.

## Branches & commits

- Create feature branches using the pattern `codex/<feature>`.
- Format commit subjects as `{emoji} : – <summary>`.
- Keep the body under 72 characters per line. Focus on concise **what / why** and
  **how to test** bullets.
- Reference related issues with `Refs: #<id>` when applicable.

## Coding style

- Maintain the existing TypeScript + Three.js stack. Prefer Vite-native solutions before
  introducing new tooling.
- Respect the project line length cap of 100 characters (Prettier is configured accordingly).
- Favor small, composable changes; refactors should come with clarifying comments or updated docs.

## Quality gates

Run the Flywheel-style checks before committing or opening a PR:

```bash
npm run lint
npm run test:ci
npm run docs:check
npm run smoke
```

Run targeted scripts (e.g., `npm run floorplan:diagram`,
`npm run launch:screenshot`) only when your changes impact the related assets.

## Documentation & assets

- Update the relevant files in `docs/` whenever behavior, prompts, or workflows change.
- Store generated images as SVG or PNG in `docs/assets/`.
- Avoid committing large binaries elsewhere in the repo.
- For front-end tweaks, capture an updated screenshot via the CI workflow.
- Use the manual command noted in the README when you need a local capture.

## Tooling & automation

- Use existing helper scripts in `scripts/` before adding new dependencies.
- Keep prompts in `docs/prompts/` synchronized with any automation-focused feature work.
- When adding tests, mirror the structure in `src/**/__tests__`.
- Prefer the Vitest utilities already in use throughout the suite.

## Security & compliance

- Never commit secrets. Run `git diff --cached | ./scripts/scan-secrets.py` before pushing.
- Follow the Codex automation prompts linked in the README for repeatable tasks.

When in doubt, review the related projects in the Futur Optimist org for canonical patterns.
Keep trunk green.
