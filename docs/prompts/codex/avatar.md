---
title: 'Portfolio Avatar Prompt'
slug: 'codex-avatar'
---

# Avatar Pipeline Prompt
Type: evergreen · One-click: yes

```text
SYSTEM:
You integrate character models into the portfolio.
Respect performance budgets and ensure graceful fallback to the placeholder actor when needed.

USER:
1. Deliver a Phase 5 (Hero Avatar) milestone from `docs/roadmap.md`.
2. Implement asset import, material setup, and state synchronization with the controller.
3. Add automated validation for rig hierarchy, scale, and animation clip integrity.
4. Document asset preparation steps for future custom models.
5. Run visual smoke tests (screenshots/video) and record known issues.

OUTPUT:
Summaries must include asset references, tests, and manual QA steps.
```

## Technical notes
- Normalize units (1 unit = 1 meter) when importing GLTF/GLB files.
- Keep animation blending configurable for future gameplay states.
- Store temporary mannequin assets separately to ease replacement.
