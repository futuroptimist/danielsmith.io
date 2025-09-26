# danielsmith.io

Production-ready Vite + Three.js playground for the future danielsmith.io experience.
The scene renders an orthographic isometric room with keyboard-driven sphere movement so
we can iterate on spatial UX while keeping repo hygiene tight. The project was originally
bootstrapped from the [`flywheel`](https://github.com/futuroptimist/flywheel) template and
keeps the familiar conventions while focusing purely on the web stack.

## Key resources

- **Roadmap** – Long-term milestones are sequenced in [docs/roadmap.md](docs/roadmap.md)
  covering lighting, environment, HUD work, accessibility, and avatar polish.
- **Backlog** – Near-term scene tasks, including deferred touch controls, live in
  [docs/backlog.md](docs/backlog.md).
- **Résumé** – Latest résumé source is
  [`daniel-smith-resume-2025-09.tex`][resume-src].
  CI renders PDF and DOCX artifacts.
- **Prompt library** – Automation-ready Codex prompts are summarized in
  [`summary.md`][prompt-summary] and expanded across topical files in
  `docs/prompts/codex/` (automation, lighting, avatar, HUD, POIs, accessibility, and more).

## Getting started

```bash
npm install
npm run dev
```

### Project scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create a production build (also used by CI smoke tests). |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint on the TypeScript sources. |
| `npm run format:check` / `npm run format:write` | Check or apply Prettier formatting. |
| `npm run test` / `npm run test:ci` | Execute the Vitest suite (CI uses `:ci`). |
| `npm run typecheck` | Type-check with TypeScript without emitting files. |
| `npm run docs:check` | Ensure required docs (including Codex prompts) exist. |
| `npm run smoke` | Build and assert that `dist/index.html` exists. |
| `npm run check` | Convenience command chaining lint, test:ci, and docs:check. |

### Local quality gates

Run the Flywheel-style checks before pushing to stay aligned with CI:

```bash
npm run lint
npm run test:ci
npm run docs:check
npm run smoke
```

Pre-commit mirrors these commands alongside formatting hooks. Compared to the full
Flywheel stack, we skip the Python-heavy aggregate hook to keep this web-focused repo
lightweight.

## Architecture notes

- **Camera** – Orthographic camera with constant world height (`CAMERA_SIZE = 20`). Resizes
  recompute the left/right bounds based on aspect ratio before calling
  `updateProjectionMatrix()`.
- **Lighting** – Ambient and directional key lights are supported by emissive LED cove
  strips plus a lightweight bloom pass for soft gradient glow without heavy shadows.
- **Controls** – `KeyboardControls` listens for `keydown`/`keyup` events (WASD + arrows) and
  clamps movement to the room bounds.

## Controls

- **Movement** – Use `WASD` or arrow keys to roll the sphere.
- **Touch** – Not implemented yet; see the backlog entry for the planned joystick.

## Automation prompts

The canonical Codex automation prompt lives at
[`automation.md`][automation-prompt] and feeds both docs
checks and CI routines. Additional specialized prompts (lighting, avatar, HUD, POIs, i18n,
performance, modes, animation, and more) provide ready-to-run task scaffolding for agents.

## Smoke testing

`npm run build` generates distributable assets, and CI asserts that `dist/index.html`
exists as part of the smoke suite.

[resume-src]: docs/resume/2025-09/daniel-smith-resume-2025-09.tex
[prompt-summary]: docs/prompts/summary.md
[automation-prompt]: docs/prompts/codex/automation.md
