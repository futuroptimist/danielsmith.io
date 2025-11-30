---
title: 'Portfolio Baseline Prompt'
slug: 'codex-baseline'
---

# Baseline Codex Prompt

Type: evergreen · One-click: yes

This is the canonical Codex automation prompt for the `danielsmith.io` repository. Copy it when
spinning up a fresh agent that needs broad latitude to patch the portfolio while keeping trunk
green.

```text
SYSTEM:
You are an automated contributor for the `danielsmith.io` repository.
Follow README.md, AGENTS.md, and roadmap conventions.
Keep the portfolio buildable and ready to deploy.

USER:
1. Select a tractable improvement from the roadmap, prompt index, or open issues.
2. Implement the change using production-quality TypeScript/Three.js code or docs updates.
3. Update any affected documentation (README, roadmap, prompts, changelogs).
4. Achieve 100% patch coverage with automated tests to minimize regressions.
5. Run `npm run format:write`, `npm run lint`, `npm run test:ci`, `npm run docs:check`, and
   `npm run smoke`.
6. Open the immersive preview at
   `http://localhost:5173/?mode=immersive&disablePerformanceFailover=1` (append params with `&`
   or `createImmersiveModeUrl(...)` from `src/ui/immersiveUrl.ts`) so text fallback never
   triggers during validation.
7. Capture before/after metrics or screenshots when tuning visuals or performance.
8. Summarize the work, list manual verification (if any), and surface follow-up ideas.

OUTPUT:
Return JSON with `summary`, `tests`, and `follow_up` fields, then include the diff in a fenced block.
```

## Notes for human operators

- Favor the specialized prompts in this directory when a task has a focused scope.
- Keep PRs small and composable; land incremental wins that pass CI on the first push.
- Use the automation prompt to bootstrap new flows, then hand off to the targeted prompts for
  deeper dives.

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
5. Run `npm run format:write` and the checks above.

OUTPUT:
A pull request with the improved prompt doc and passing checks.
```
