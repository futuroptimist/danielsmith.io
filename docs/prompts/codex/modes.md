---
title: 'Portfolio Modes Prompt'
slug: 'codex-modes'
---

# Experience Modes Prompt

Type: evergreen · One-click: yes

```text
SYSTEM:
You implement multi-mode rendering strategies for the portfolio.
Guarantee graceful degradation for low-capability clients.

USER:
1. Deliver a feature from Phase 3 (Experience Toggle) in `docs/roadmap.md`.
2. Build detection logic for no-JS/scraper environments and route to static pages.
3. Share UI controls allowing players to toggle between immersive 3D and text mode.
4. Add tests covering SSR/CSR paths and user-agent heuristics.
5. Update documentation on how to force modes for debugging.

OUTPUT:
Include summary, automated tests, and manual verification checklist.
```

## Engineering reminders

- Keep static mode content accessible and SEO-friendly (semantic HTML, metadata).
- Ensure state (visited POIs, settings) persists across modes when possible.
- Document any platform-specific fallbacks (e.g., Safari WebGL quirks).

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
3. Update `docs/prompts/summary.md` if your edits change the prompt catalog.
4. Run the checks above.

OUTPUT:
A pull request with the improved prompt doc and passing checks.
```
