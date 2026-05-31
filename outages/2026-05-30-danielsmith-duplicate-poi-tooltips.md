# Duplicate POI tooltips cluttered immersive hover states

## Symptom

Staging hover validation showed three POI information surfaces at once: the
intended rich 2D viewport overlay in the bottom-right corner plus two overlapping
in-world cards above the active POI. For Gitshelves and other pedestal POIs, the
stacked 3D surfaces repeated summary, outcome, metric, status, and helper copy
that should have stayed in the overlay.

## Root cause

Two in-world POI systems were rendering rich details for the same active state.
The pedestal marker label texture included title, summary, metrics, and status,
while `PoiWorldTooltip` also rendered a detailed hover/selected/recommended card.
When hover or keyboard focus raised the marker emphasis, both 3D surfaces became
visible near the same anchor.

## Corrective action

- Reserve full POI details for the accessible 2D overlay.
- Simplify the in-world tooltip canvas to a compact title-only cue.
- Simplify pedestal marker label textures to title-only content.
- Suppress the pedestal marker label whenever the active world tooltip owns that
  POI, keeping one in-world surface visible for hover, selection, and guided-tour
  recommendations.
- Add a narrow read-only `window.portfolio.poi.getTooltipState()` hook for E2E
  checks to count active in-world POI cues without inspecting WebGL internals.

## Validation steps

- Open `/?mode=immersive&disablePerformanceFailover=1`.
- Hover or keyboard-focus a POI such as Gitshelves.
- Confirm the bottom-right 2D overlay still contains title, status, summary,
  outcome, metrics, links, and badges.
- Confirm the 3D scene shows exactly one active in-world title-only cue.
- Confirm the in-world cue does not show summary, outcome, metrics, status,
  links, or helper copy such as “Interact to inspect” or “Next highlight”.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run test:e2e -- --grep "tooltip|POI|immersive"`
- `npm run docs:check`
- `npm run smoke`
