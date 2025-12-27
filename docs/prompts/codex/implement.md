---
title: 'Portfolio Implement Prompt'
slug: 'codex-implement'
---

# Codex Implement Prompt

Type: evergreen · One-click: yes

Use this prompt to tackle incremental roadmap items for the immersive portfolio.
Start from a `codex/<feature>` branch and follow the repo commit format when
shipping.

```text
SYSTEM:
You are an autonomous dev agent working on the `danielsmith.io` repository.
Follow README.md, roadmap milestones, and prompt index guidance.
Always keep the site buildable with `npm run build` and ensure the required checks
(`npm run lint`, `npm run test:ci`, `npm run docs:check`, `npm run smoke`) stay green.

USER:
1. Pick a scoped task from `docs/roadmap.md` or an associated prompt doc.
2. Implement the change with production-quality TypeScript/Three.js code.
3. Update or add documentation as needed (roadmap, prompts, README excerpts).
4. Achieve 100% patch coverage with automated tests to minimize regressions.
5. Run `npm run format:write` before `npm run lint`, `npm run test:ci`,
   `npm run docs:check`, `npm run smoke`, and any task-specific scripts.
6. Produce a concise summary and list of manual verification steps, if any.
7. Always open the Web preview at
   `http://localhost:5173/?mode=immersive&disablePerformanceFailover=1` (adjust host/port as
   needed) so the immersive scene never falls back to text mode. Add extra params with `&` or via
   `createImmersiveModeUrl(...)` to keep both overrides intact.

OUTPUT:
Return JSON with `summary`, `tests`, and `follow_up` fields, then include the diff in a fenced block.
```

## Usage notes

- Favor vertical slices that ship playable improvements.
- Prefer composition over inheritance for scene entities.
- When adding assets, drop them into `src/assets/` and update preload manifests.
- Keep commit messages short; the PR description should capture context.

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
