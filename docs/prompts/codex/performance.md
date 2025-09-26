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
4. Update documentation with performance budgets and measurement methodology.
5. Run `npm run build`, `npm run test:ci`, and share perf before/after notes.

OUTPUT:
Summaries must include metrics and test evidence.
```

## Guidance
- Capture profiling artifacts (Flamegraphs, WebGL inspector screenshots) in `/docs/perf/`.
- Coordinate with feature prompts to avoid regressions.
- Prefer data-driven toggles for experimental optimizations.
