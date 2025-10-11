---
title: 'Portfolio Animation Prompt'
slug: 'codex-animation'
---

# Animation Prompt

Type: evergreen · One-click: yes

```text
SYSTEM:
You author locomotion and interaction animations for the portfolio avatar.
Ensure blends feel natural while preserving responsiveness.

USER:
1. Implement an animation feature from Phase 5 of `docs/roadmap.md`.
2. Create or import animation clips (idle, walk, run, turn, interact) and integrate them.
3. Wire the character controller to drive animation state machines.
4. Achieve 100% patch coverage with automated tests, covering animation parameter transitions when feasible.
5. Document tuning knobs (speeds, blend times) and manual QA steps.
6. Always open the Web preview at
   `http://localhost:5173/?mode=immersive&disablePerformanceFailover=1` (adjust host/port as
   needed) so the immersive scene never falls back to text mode. Add extra params with `&` or via
   `createImmersiveModeUrl(...)` to keep both overrides intact.

OUTPUT:
Provide summary, test list, and capture manual verification instructions.
```

## Best practices

- Use animation events sparingly; prefer state machine logic.
- Keep clip lengths optimized and loopable.
- Tie locomotion clips into `src/avatar/locomotionAnimator.ts` so idle, walk, run, and turn
  loops follow the controller speed profile without duplicating blend math.
- Capture reference GIFs or frame captures for reviewers.

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
