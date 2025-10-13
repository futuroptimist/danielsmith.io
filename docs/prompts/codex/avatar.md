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
3. Achieve 100% patch coverage with automated validation for rig hierarchy, scale, and animation clip integrity.
4. Document asset preparation steps for future custom models.
5. Run visual smoke tests (screenshots/video) and record known issues.
6. Always open the Web preview at
   `http://localhost:5173/?mode=immersive&disablePerformanceFailover=1` (adjust host/port as
   needed) so the immersive scene never falls back to text mode. Add extra params with `&` or via
   `createImmersiveModeUrl(...)` to keep both overrides intact.

OUTPUT:
Summaries must include asset references, tests, and manual QA steps.
```

## Technical notes

- Normalize units (1 unit = 1 meter) when importing GLTF/GLB files.
- Use `createAvatarImporter` (`src/avatar/importer.ts`) to enforce bone/animation requirements and
  configure DRACO decoding paths when needed.
- Keep animation blending configurable for future gameplay states.
- Drive placeholder interaction gestures through `createAvatarInteractionAnimator`
  (`src/avatar/interactionAnimator.ts`) so POI selections trigger expressive beats even before the
  hero avatar swap lands.
- Store temporary mannequin assets separately to ease replacement.
- Update `src/avatar/variants.ts` and the HUD avatar style control when introducing new outfits
  so palettes, analytics, and persistence stay aligned.

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
