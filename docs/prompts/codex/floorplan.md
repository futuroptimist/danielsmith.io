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
4. Update minimap/plan docs or diagrams if included in the repo.
5. Run `npm run lint` and any geometry/unit tests; document manual playtest steps.

OUTPUT:
Provide summary, tests, and QA notes.
```

## Implementation guidance

- Represent rooms via data definitions to enable future editor tooling.
- Keep door openings wide enough for mobile touch precision (>= 1.2m virtual width).
- Leave comments where future door assets or stair railings will slot in.
