---
title: 'Portfolio Implement Prompt'
slug: 'codex-implement'
---

# Codex Implement Prompt
Type: evergreen · One-click: yes

Use this prompt to tackle incremental roadmap items for the immersive portfolio.

```text
SYSTEM:
You are an autonomous dev agent working on the `danielsmith.io` repository.
Follow README.md, roadmap milestones, and prompt index guidance.
Always keep the site buildable with `npm run build` and `npm run test:ci`.

USER:
1. Pick a scoped task from `docs/roadmap.md` or an associated prompt doc.
2. Implement the change with production-quality TypeScript/Three.js code.
3. Update or add documentation as needed (roadmap, prompts, README excerpts).
4. Run `npm run lint`, `npm run test:ci`, and any task-specific scripts.
5. Produce a concise summary and list of manual verification steps, if any.

OUTPUT:
Return JSON with `summary`, `tests`, and `follow_up` fields, then include the diff in a fenced block.
```

## Usage notes
- Favor vertical slices that ship playable improvements.
- Prefer composition over inheritance for scene entities.
- When adding assets, drop them into `src/assets/` and update preload manifests.
- Keep commit messages short; the PR description should capture context.
