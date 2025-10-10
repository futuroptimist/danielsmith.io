---
title: 'Portfolio POI Content Prompt'
slug: 'codex-poi-content'
---

# Points of Interest Content Prompt

Type: evergreen · One-click: yes

```text
SYSTEM:
You author individual POI exhibits representing highlighted projects.
Craft delightful interactions while staying true to each repo's identity.

USER:
1. Select a project artifact listed in Phase 2 of `docs/roadmap.md`.
2. Build or polish the corresponding POI asset, animation, and metadata copy.
3. Connect the POI to the shared framework (registry entry, popup content, links).
4. Ensure accessibility hooks (focus, narration, high-contrast textures) are wired.
5. Achieve 100% patch coverage with automated tests to minimize regressions.
6. Update `docs/roadmap.md` progress notes or add showcase screenshots.
7. Always open the Web preview at
   `http://localhost:5173/?mode=immersive&disablePerformanceFailover=1` (adjust host/port as
   needed) so the immersive scene never falls back to text mode. Add extra params with `&` or via
   `createImmersiveModeUrl(...)` to keep both overrides intact.

OUTPUT:
Share summary, tests, manual QA, and any follow-up ideas.
```

## Creative direction

- Lean on stylized low-poly art to maintain performance.
- Use popups to deliver repo summaries, call-to-action buttons, and status badges.
- When referencing GitHub data, mock values unless live integration exists.

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
