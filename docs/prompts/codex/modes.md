---
title: 'Portfolio Modes Prompt'
slug: 'codex-modes'
---

# Experience Modes Prompt

Type: evergreen · One-click: yes

```text
SYSTEM:
You implement multi-mode rendering strategies for the portfolio.
Guarantee graceful degradation for low-capability clients.

USER:
1. Deliver a feature from Phase 3 (Experience Toggle) in `docs/roadmap.md`.
2. Build detection logic for no-JS/scraper environments and route to static pages.
3. Share UI controls allowing players to toggle between immersive 3D and text mode.
4. Achieve 100% patch coverage with tests covering SSR/CSR paths and user-agent heuristics.
5. Update documentation on how to force modes for debugging.
6. Always open the Web preview at
   `http://localhost:5173/?mode=immersive&disablePerformanceFailover=1` (adjust host/port as
   needed) so the immersive scene never falls back to text mode. Add extra params with `&` or via
   `createImmersiveModeUrl(...)` to keep both overrides intact.

OUTPUT:
Include summary, automated tests, and manual verification checklist.
```

## Engineering reminders

- Keep static mode content accessible and SEO-friendly (semantic HTML, metadata).
- Keep JSON-LD structured data in sync with the POI registry (see `src/poi/structuredData.ts`).
- Ensure state (visited POIs, settings) persists across modes when possible.
- Document any platform-specific fallbacks (e.g., Safari WebGL quirks).
- Automated heuristics already cover headless browsers plus Node.js fetch/axios and
  Go HTTP clients; extend patterns judiciously to avoid false positives.
- Low-end detection now considers hardware concurrency ≤2 and legacy mobile user agents.
  Use `?mode=immersive&disablePerformanceFailover=1` when validating on constrained
  dev environments. A `<noscript>` text tour keeps scrapers and no-JS browsers covered.
- Network throttling heuristics treat Save-Data, slow-2g/2g/3g effective types,
  low downlink, and high RTT (≥800 ms) as triggers for text mode unless immersive overrides
  or performance bypass flags are present.
- `evaluateFailoverDecision` accepts `URLSearchParams`, raw search strings, or full URLs
  so SSR hooks and client-side routers can share the same mode detection logic without
  manual serialization.
- Use `createImmersiveModeUrl(...)` and `createTextModeUrl(...)` helpers to add mode
  overrides without clobbering existing query parameters or hashes.
  - Both helpers now accept an optional extra params map so you can append UTM/debug flags
    while the required mode + performance bypass parameters remain intact.
  - Mode helpers treat `mode` and `disablePerformanceFailover` flags as case-insensitive,
    accepting `true`/`1` values so crawler and CMS links stay resilient.

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
