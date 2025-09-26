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
4. Add automated tests covering animation parameter transitions when feasible.
5. Document tuning knobs (speeds, blend times) and manual QA steps.

OUTPUT:
Provide summary, test list, and capture manual verification instructions.
```

## Best practices
- Use animation events sparingly; prefer state machine logic.
- Keep clip lengths optimized and loopable.
- Capture reference GIFs or frame captures for reviewers.
