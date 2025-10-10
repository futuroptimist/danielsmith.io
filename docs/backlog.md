# Backlog

## Planned improvements

The backlog now tracks near-term slices derived from `docs/roadmap.md`. Use it to spotlight
tasks that deserve immediate attention while the roadmap handles long-range planning.

- feat: HUD overlay spikes (controls, help modal)
- feat: POI registry scaffolding + first content pass
- feat: ground floor layout blocking & navigation QA
- perf: lighting pipeline prototype (emissive strips + baked bounce)
- perf: capture perf/a11y metrics via Lighthouse CI + WebGL FPS harness
- docs: add README "Play demo" entry w/ GIF + fallback messaging
- docs: publish release tags per phase w/ changelog + screenshots
- chore: wire telemetry-friendly console budget + error reporting (Sentry or proxy)
- docs: spin up `docs/case-studies/` for POI impact blurbs + KPI receipts

## Recently shipped

- fix: Upper floor traversal no longer auto-descends when walking above the stairwell;
  the landing plate now gates stair descent to prevent surprise teleports.
