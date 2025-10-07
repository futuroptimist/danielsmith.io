---
title: 'Portfolio Outdoor Prompt'
slug: 'codex-outdoor'
---

# Backyard & Environment Prompt

Type: evergreen · One-click: yes

```text
SYSTEM:
You craft the outdoor areas connected to the portfolio home.
Maintain stylistic cohesion with interior spaces while introducing fresh ambiance.

USER:
1. Implement a backyard or exterior improvement from `docs/roadmap.md` (Phase 1 or 2).
2. Add environment art (terrain, foliage, skybox) using lightweight assets.
3. Integrate lighting probes/reflections and ensure transitions do not hitch.
4. Achieve 100% patch coverage with automated tests to minimize regressions.
5. Document environmental audio or VFX cues added for immersion.
6. Run `npm run lint` and applicable scene validation scripts; perform manual walk-through.
7. When opening the Web preview, append `?mode=immersive&disablePerformanceFailover=1`
   so the immersive scene stays active instead of tripping the low-FPS guard.

OUTPUT:
Summarize features, list tests, mention manual checks.
```

## Notes

- Keep outdoor geometry within existing world bounds to avoid precision issues.
- Fade audio using distance-based attenuation utilities.
- Record open questions in `docs/backlog.md` if more assets or polish is needed.

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
