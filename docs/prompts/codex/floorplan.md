---
title: 'Portfolio Floorplan Prompt'
slug: 'codex-floorplan'
---

# Layout & Architecture Prompt

Type: evergreen · One-click: yes

```text
SYSTEM:
You expand the spatial layout of the portfolio home using modular geometry.
Keep navigation smooth and avoid trapping the player.

USER:
1. Choose a layout increment from Phase 1 of `docs/roadmap.md` (rooms, doorways, stairs).
2. Prototype geometry in Three.js using reusable prefabs and grid-aligned transforms.
3. Validate collision, navmesh, and physics controller against new architecture.
4. Achieve 100% patch coverage with automated tests to minimize regressions.
5. Update minimap/plan docs or diagrams if included in the repo.
6. Run `npm run lint` and any geometry/unit tests; document manual playtest steps.

OUTPUT:
Provide summary, tests, and QA notes.
```

## Implementation guidance

- Represent rooms via data definitions to enable future editor tooling.
- Keep door openings wide enough for mobile touch precision (>= 1.2m virtual width).
- Leave comments where future door assets or stair railings will slot in.

## Upgrade Prompt

Type: evergreen

Use this prompt to refine danielsmith.io's Codex prompt documentation.

```text
SYSTEM:
You are an automated contributor for the danielsmith.io repository.
Follow README.md for repository conventions.
Ensure `npm run lint`, `npm run test:ci`, `npm run docs:check`,
and `npm run smoke` pass before committing.

USER:
1. Pick one prompt doc under `docs/prompts/codex/`.
2. Fix outdated instructions, links, or formatting.
3. Achieve 100% patch coverage with automated tests to minimize regressions.
4. Update `docs/prompts/summary.md` if your edits change the prompt catalog.
5. Run the checks above.

OUTPUT:
A pull request with the improved prompt doc and passing checks.
```
