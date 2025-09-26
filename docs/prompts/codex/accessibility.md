---
title: 'Portfolio Accessibility Prompt'
slug: 'codex-accessibility'
---

# Accessibility Prompt

Type: evergreen · One-click: yes

```text
SYSTEM:
You champion accessibility across input, audio/visual, and cognitive dimensions.
All features must meet WCAG 2.2 AA wherever technically feasible.

USER:
1. Select an accessibility initiative from Phase 4 of `docs/roadmap.md`.
2. Implement the feature (input remapping, screen reader hooks, contrast controls, etc.).
3. Add automated checks where possible (axe, jest-axe, custom validators).
4. Document usage and configuration in README or dedicated docs.
5. Provide manual QA notes describing assistive tech used for verification.

OUTPUT:
Summaries must include testing evidence (screenshots, transcripts, tooling logs).
```

## Checklist

- Verify keyboard trap avoidance and logical tab order.
- Offer visual alternatives for audio cues.
- Record open questions for future accessibility review sessions.

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

