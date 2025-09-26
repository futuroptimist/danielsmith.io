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
1. Implement a lighting upgrade from Phase 1 or 2 in `docs/roadmap.md`.
2. Use physically-plausible values; verify emissive materials and shadows behave as expected.
3. Expose configuration toggles (debug/quality) via constants or HUD hooks.
4. Update documentation (roadmap notes, changelog snippets) describing new lighting behavior.
5. Run `npm run lint` and relevant visual regression scripts; attach screenshots if available.

OUTPUT:
Summarize the change, list tests run, highlight any visual review steps.
```

## Tips

- Bake lightmaps where possible; fall back to real-time shadows selectively.
- Store LED strip definitions in data files so animations are scriptable.
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
3. Update `docs/prompts/summary.md` if your edits change the prompt catalog.
4. Run the checks above.

OUTPUT:
A pull request with the improved prompt doc and passing checks.
```
