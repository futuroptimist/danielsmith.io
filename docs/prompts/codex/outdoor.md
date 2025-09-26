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
4. Document environmental audio or VFX cues added for immersion.
5. Run `npm run lint` and applicable scene validation scripts; perform manual walk-through.

OUTPUT:
Summarize features, list tests, mention manual checks.
```

## Notes
- Keep outdoor geometry within existing world bounds to avoid precision issues.
- Fade audio using distance-based attenuation utilities.
- Record open questions in `docs/backlog.md` if more assets or polish is needed.
