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
4. Achieve 100% patch coverage with unit/integration tests for UI state reducers or hooks.
5. Update documentation/screenshot references in `docs/roadmap.md` or README.
6. Always open the Web preview at
   `http://localhost:5173/?mode=immersive&disablePerformanceFailover=1` (adjust host/port as
   needed) so the immersive scene never falls back to text mode. Add extra params with `&` or via
   `createImmersiveModeUrl(...)` to keep both overrides intact.

OUTPUT:
Summarize functionality, tests, and any UX research notes.
```

## UX guardrails

- Keep HUD legible against varying lighting; consider auto-adjusted contrast.
- Ensure touch targets meet 48px minimum sizing.
- Provide keyboard navigation order and visible focus rings.

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
