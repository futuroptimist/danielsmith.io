# danielsmith.io

[![Lint & Format](https://img.shields.io/github/actions/workflow/status/futuroptimist/danielsmith.io/.github/workflows/01-lint-format.yml?label=lint%20%26%20format)](https://github.com/futuroptimist/danielsmith.io/actions/workflows/01-lint-format.yml)
[![Tests](https://img.shields.io/github/actions/workflow/status/futuroptimist/danielsmith.io/.github/workflows/02-tests.yml?label=tests)](https://github.com/futuroptimist/danielsmith.io/actions/workflows/02-tests.yml)
[![Docs](https://img.shields.io/github/actions/workflow/status/futuroptimist/danielsmith.io/.github/workflows/03-docs.yml?label=docs)](https://github.com/futuroptimist/danielsmith.io/actions/workflows/03-docs.yml)
[![Launch screenshot](https://img.shields.io/github/actions/workflow/status/futuroptimist/danielsmith.io/.github/workflows/04-launch-screenshot.yml?label=launch%20screenshot)](https://github.com/futuroptimist/danielsmith.io/actions/workflows/04-launch-screenshot.yml)
[![Floorplan Diagram](https://img.shields.io/github/actions/workflow/status/futuroptimist/danielsmith.io/.github/workflows/floorplan-diagram.yml?label=floorplan)](https://github.com/futuroptimist/danielsmith.io/actions/workflows/floorplan-diagram.yml)
[![Resume](https://img.shields.io/github/actions/workflow/status/futuroptimist/danielsmith.io/.github/workflows/resume.yml?label=resume)](https://github.com/futuroptimist/danielsmith.io/actions/workflows/resume.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Production-ready Vite + Three.js playground for the future danielsmith.io experience.
The scene renders an orthographic isometric room with keyboard-driven sphere movement so
we can iterate on spatial UX while keeping repo hygiene tight. The project was originally
bootstrapped from the [`flywheel`](https://github.com/futuroptimist/flywheel) template and
keeps the familiar conventions while focusing purely on the web stack.

## Launch state

![Launch-ready room at initial load](docs/assets/game-launch.png)

> The `Launch screenshot` workflow regenerates and auto-commits this asset after merges to
> `main`, keeping the README image in sync without storing binaries in feature branches.

## Key resources

- **Roadmap** – Long-term milestones are sequenced in [docs/roadmap.md](docs/roadmap.md)
  covering lighting, environment, HUD work, accessibility, and avatar polish.
- **Backlog** – Near-term scene tasks, including deferred touch controls, live in
  [docs/backlog.md](docs/backlog.md).
- **UI placement guide** – Compare in-world vs. overlay treatments in
  [docs/guides/in-world-vs-overlay.md](docs/guides/in-world-vs-overlay.md).
- **Résumé** – Latest résumé source is
  [`resume.tex`][resume-src].
  CI renders PDF and DOCX artifacts.
- **Prompt library** – Automation-ready Codex prompts are summarized in
  [`summary.md`][prompt-summary] and expanded across topical files in
  `docs/prompts/codex/` (automation, lighting, avatar, HUD, POIs, accessibility, and more).

## Getting started

```bash
npm install
npm run dev
```

## Floor plan

The ground level now opens up dramatically—the living room, studio, kitchen, and backyard each
double their footprint so the scene has space for larger set pieces and navigation experiments. A
new staircase carries the player to an upper landing that fans out into the Creators Studio, Loft
Library, and a ring of Focus Pods for heads-down work.

Each floor has its own auto-generated diagram (regenerated locally with
`npm run floorplan:diagram` and in CI whenever layouts change):

![Ground floor plan](docs/assets/floorplan-ground.svg)
![Upper floor plan](docs/assets/floorplan-upper.svg)

## Project scripts

| Script                                          | Purpose                                                     |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `npm run dev`                                   | Start the Vite development server.                          |
| `npm run build`                                 | Create a production build (also used by CI smoke tests).    |
| `npm run preview`                               | Preview the production build locally.                       |
| `npm run lint`                                  | Run ESLint on the TypeScript sources.                       |
| `npm run format:check` / `npm run format:write` | Check or apply Prettier formatting.                         |
| `npm run test` / `npm run test:ci`              | Execute the Vitest suite (CI uses `:ci`).                   |
| `npm run typecheck`                             | Type-check with TypeScript without emitting files.          |
| `npm run docs:check`                            | Ensure required docs (including Codex prompts) exist.       |
| `npm run smoke`                                 | Build and assert that `dist/index.html` exists.             |
| `npm run check`                                 | Convenience command chaining lint, test:ci, and docs:check. |

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

- **Camera** – Orthographic camera with a constant world height (`CAMERA_SIZE = 20`). On resize we recompute the left/right bounds from the new aspect ratio and call `updateProjectionMatrix()` to keep scale consistent.
- **Lighting** – Ambient + directional key lights now pair with emissive LED cove strips and baked
  gradient lightmaps so the room inherits a dusk bounce wash without heavy shadows.
  A Shift+L debug toggle disables bloom/LED accents to compare raw material response.
- **Controls** – `KeyboardControls` listens for `keydown`/`keyup` using `event.key` strings (WASD + arrow keys) and feeds the movement loop, which clamps the player inside the room bounds.
- **HUD overlay** – The floating movement legend now reacts to the most recent input method
  (keyboard, mouse, or touch) and swaps the interact hint to match, so visitors always see the
  action verb that applies to their device.
- **Points of Interest** – A data-driven registry spawns holographic pedestals with animated
  tooltips for featured repos. Proximity-based halos ease the labels in so players sense each
  interaction radius without clutter, and a DOM overlay mirrors the metadata so screen readers and
  keyboard users receive the same context. A cognitive load-aware interaction timeline now staggers
  live region announcements so discovery prompts never rapid-fire when players browse exhibits.
  Metadata is authored in TypeScript so future automations
  can extend exhibits by updating data alone, and the studio desk now hosts a Jobbot holographic
  terminal that pulses in sync with the new automation POI.
- **Localization** – UI chrome and POI copy are centralized in `src/i18n/index.ts`, letting future
  locales load structured strings while keeping Vitest coverage in
  `src/tests/i18n.test.ts` to guard against regressions. HUD overlays and the
  text fallback now tag their containers with locale direction metadata so RTL
  languages flow correctly even before full translations land.
- **Audio captions** – A subtitles overlay now calls out ambient beds and POI narration with
  cooldown-aware timing so visitors who mute audio or rely on captions still catch the
  story beats.
- **Backyard installations** – The dusk courtyard now features a DSPACE-inspired model rocket on a
  lit launch pad with a safety halo, tying the exterior exhibits into the narrative while the nav
  colliders keep players clear of the ignition zone.
- **Avatar pipeline** – `createAvatarImporter` validates GLTF bone and animation requirements and can
  attach a DRACO decoder path so future mannequins load consistently.
- **Backlog** – Future scene work is tracked in [`docs/backlog.md`](docs/backlog.md).

## Controls

- **Movement** – Use `WASD` or arrow keys to roll the sphere.
- **Key remapping** – Use `portfolio.input.keyBindings.setBinding('interact', ['e'])`
  in the browser console to try alternate bindings. HUD prompts update instantly and
  the mapping persists locally.
- **Touch** – Drag the on-screen joysticks (left: movement, right: camera pan) on touch devices.
- **Lighting debug** – Press `Shift` + `L` to toggle bloom and LED strips for comparison captures.
- **Mode toggle** – Press `T` or select the "Text mode" overlay button to jump into the
  lightweight portfolio view at any time.
- **Accessibility presets** – Pick Standard, Calm, High contrast, or Photosensitive-safe modes
  from the HUD to soften bloom, boost readability, reduce motion cues, and tune emissive
  lighting. The
  Photosensitive-safe preset now also smooths greenhouse grow lights, walkway lanterns, and
  holographic beacons so emissive pulses settle into a steady glow for flicker-sensitive players.
- **Help** – Use the help key (default `H` or `?`), or tap the HUD Help button to
  open a modal with controls, accessibility tips, and failover guidance.
- **Failover** – Append `?mode=text` to the URL to load the lightweight text view.
  Automatic detection now covers missing WebGL support and sustained frame rates below 30 FPS;
  `?mode=immersive&disablePerformanceFailover=1` forces the full scene even on
  throttled preview clients. Screen readers now announce each switch so assistive
  technology users know which mode is active.

## Automation prompts

The canonical Codex automation prompt lives at
[`automation.md`][automation-prompt] and feeds both docs
checks and CI routines. Additional specialized prompts (lighting, avatar, HUD, POIs, i18n,
performance, modes, animation, and more) provide ready-to-run task scaffolding for agents.

## Smoke testing

`npm run build` generates distributable assets, and CI asserts that `dist/index.html`
exists as part of the smoke suite.

[resume-src]: docs/resume/2025-09/resume.tex
[prompt-summary]: docs/prompts/summary.md
[automation-prompt]: docs/prompts/codex/automation.md
