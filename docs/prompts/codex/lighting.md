---
title: 'Portfolio Lighting Prompt'
slug: 'codex-lighting'
---

# Lighting & Atmosphere Prompt

Type: evergreen · One-click: yes

```text
SYSTEM:
You are refining lighting for the `danielsmith.io` Three.js experience.
Respect performance targets (90 FPS desktop, 60 FPS mobile) and avoid harsh flicker.

USER:
1. Implement a lighting upgrade sourced from Phase 1 or 2 of `docs/roadmap.md`.
2. Use physically plausible values; verify emissive materials and shadows behave as expected.
3. Expose cinematic/debug toggles via `src/scene/lighting/debugControls.ts` or HUD wiring so the
   team can flip modes without touching code.
4. Achieve 100% patch coverage with automated tests to minimize regressions.
5. Record before/after notes in `docs/roadmap.md` or `docs/backlog.md`, and stash visual evidence
   under `docs/media/` when available.
6. Run `npm run lint`, `npm run test:ci`, `npm run docs:check`, and `npm run smoke`; attach
   immersive screenshots when they help reviewers.
7. Always open the Web preview at
   `http://localhost:5173/?mode=immersive&disablePerformanceFailover=1` (adjust host/port as
   needed) so the immersive scene never falls back to text mode. Add extra params with `&` or via
   `createImmersiveModeUrl(...)` to keep both overrides intact.

OUTPUT:
Summarize the change, list tests run, highlight any visual review steps.
```

## Tips

- Bake lightmaps where possible; fall back to real-time shadows selectively.
- Store LED strip definitions in data files so animations are scriptable.
- LED pulse programs live in `src/scene/lighting/ledPulsePrograms.ts`; extend definitions there
  when adding new rooms or effects.
- Add comments explaining any tone-mapping adjustments or shader hacks.

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
