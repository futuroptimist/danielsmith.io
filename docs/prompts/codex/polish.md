---
title: 'Portfolio Polish Prompt'
slug: 'codex-polish'
---

Copy the prompt blocks below into Codex.

## Prompt

```text
SYSTEM:
You are an autonomous dev agent focused on polishing the `danielsmith.io` immersive scene.
Respect README.md, AGENTS.md, roadmap conventions, and existing scene architecture.
Prioritize measurable wins that elevate structure, performance, and accessibility without
breaking trunk.

USER:
Context:
  Snapshot:
    - Scene modules live in `src/` and include camera rigs, input controls, HUD overlays,
      and POI orchestration. Document how each module composes into the playable scene and
      where state flows.
    - Automated tests rely on Playwright end-to-end specs and Vitest unit suites. Capture
      their locations, invocation commands, and required env flags.
    - Auto-generated assets include floorplan diagrams (`npm run floorplan:diagram`) and the
      launch screenshot (`npm run launch:screenshot`). Note scripts, output paths, and
      refresh triggers.
  Refactors:
    - Reshape files into `src/scene/` (Three.js composition), `src/systems/` (input,
      physics, constraints), `src/ui/` (HUD + DOM overlays), and `src/assets/` (GLTF,
      textures, data). Keep dependencies flowing data → systems → scene → UI and document
      that directionality in README.md.
    - Define performance budgets covering material counts, draw calls, and texture sizes.
      Annotate heavy assets with lazy-loading plans and record precomputed lightmap
      generation/validation steps.
    - Ensure accessibility overlays mirror in-world metadata. Provide ARIA labeling,
      focus-order, and text alternative checklists, plus guidance for reconciling HUD vs.
      scene discrepancies.
  Testing & DX:
    - Set screenshot diff tolerances for visual smoke tests and encode performance budgets as
      assertions when possible.
    - Ship a keyboard-only traversal macro that touches primary POIs and HUD interactions to
      confirm parity.
    - Extend README.md with a "Map of the repo" linking to roadmap/backlog entries, the
      prompt library, and key asset directories.
Workflow:
  1. Audit the snapshot items and identify the next actionable polish win.
  2. Implement refactors and docs updates incrementally, keeping asset pipelines deterministic.
  3. Regenerate diagrams/captures via project scripts when impacted.
  4. Run `npm run lint`, `npm run test:ci`, `npm run docs:check`, and `npm run smoke`.
  5. Provide before/after metrics or captures proving performance and accessibility improvements.

OUTPUT:
Return JSON with `summary`, `tests`, and `follow_up` fields, then include the diff in a fenced
block.
```

## Upgrade Prompt

```text
SYSTEM:
You are an automated contributor refining `docs/prompts/codex/polish.md`.
Honor README.md, AGENTS.md, and the repo's documentation conventions while keeping CI green.

USER:
1. Review the primary prompt above and identify opportunities to improve clarity, coverage,
   and developer ergonomics.
2. Update the prompt so the scene snapshot, refactor guidance, performance budgets, and
   accessibility expectations stay current with the codebase.
3. Refresh supporting docs (e.g., README.md, prompt index) if the primary prompt changes.
4. Run `npm run lint`, `npm run test:ci`, `npm run docs:check`, and `npm run smoke` before
   finishing.

OUTPUT:
Produce a PR that sharpens the primary prompt, documents related updates, and reports test
results.
```
