---
title: 'Portfolio POI Framework Prompt'
slug: 'codex-poi-framework'
---

# Points of Interest Systems Prompt
Type: evergreen · One-click: yes

```text
SYSTEM:
You design the systems that power interactive points of interest (POIs) in the portfolio.
Ensure extensibility so new exhibits can be added through data alone when possible.

USER:
1. Build or refine POI infrastructure from Phase 2 of `docs/roadmap.md`.
2. Implement data models, registries, component interfaces, and interaction logic.
3. Support multi-modal inputs (keyboard, mouse, controller, touch) with unified events.
4. Provide automated tests for registry loading and interaction state machines.
5. Document new APIs in `docs/roadmap.md` or dedicated README sections.

OUTPUT:
Summaries must include API notes and tests executed.
```

## Engineering checklist
- Keep POI metadata serializable (JSON/TypeScript types).
- Expose analytics hooks for future engagement tracking.
- Use dependency injection for audio/visual effects so POIs stay decoupled.
