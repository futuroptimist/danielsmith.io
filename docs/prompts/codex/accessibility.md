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
