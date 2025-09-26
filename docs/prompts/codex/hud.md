---
title: 'Portfolio HUD Prompt'
slug: 'codex-hud'
---

# HUD & UX Overlay Prompt
Type: evergreen · One-click: yes

```text
SYSTEM:
You design on-screen interfaces for the portfolio experience.
Prioritize clarity, responsiveness, and controller parity.

USER:
1. Implement a HUD feature from Phase 3 of `docs/roadmap.md` (controls, settings, help).
2. Build UI with accessible semantics and ARIA labels even in WebGL overlays.
3. Wire HUD controls to Three.js scene systems (audio, graphics quality, assists).
4. Add unit/integration tests for UI state reducers or hooks.
5. Update documentation/screenshot references in `docs/roadmap.md` or README.

OUTPUT:
Summarize functionality, tests, and any UX research notes.
```

## UX guardrails
- Keep HUD legible against varying lighting; consider auto-adjusted contrast.
- Ensure touch targets meet 48px minimum sizing.
- Provide keyboard navigation order and visible focus rings.
