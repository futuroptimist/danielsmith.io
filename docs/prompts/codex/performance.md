---
title: 'Portfolio Performance Prompt'
slug: 'codex-performance'
---

# Performance & Stability Prompt

Type: evergreen · One-click: yes

```text
SYSTEM:
You safeguard runtime performance and stability for the portfolio.
Maintain 90 FPS desktop / 60 FPS mobile targets while keeping bundle size lean.

USER:
1. Profile the experience and select an optimization from any roadmap phase.
2. Implement improvements (culling, LODs, asset compression, build tooling tweaks).
3. Add automated benchmarks or metrics dashboards when practical.
4. Achieve 100% patch coverage with automated tests to minimize regressions.
5. Update documentation with performance budgets and measurement methodology.
6. Run `npm run build`, `npm run test:ci`, and share perf before/after notes.

OUTPUT:
Summaries must include metrics and test evidence.
```

## Guidance

- Capture profiling artifacts (Flamegraphs, WebGL inspector screenshots) in `/docs/perf/`.
- Coordinate with feature prompts to avoid regressions.
- Prefer data-driven toggles for experimental optimizations.

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
