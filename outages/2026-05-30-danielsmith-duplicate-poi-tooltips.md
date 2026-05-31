# Duplicate POI tooltips cluttered immersive hover states

## Symptom

Staging screenshots showed three POI information surfaces at the same time: the
bottom-right 2D viewport overlay plus two overlapping in-world cards above the
hovered POI. Gitshelves was especially noisy because both in-world surfaces
repeated rich details that belonged in the overlay.

## Root cause

Pedestal POI marker labels and `PoiWorldTooltip` both rendered in-world cards,
and both surfaces included rich metadata such as summaries, outcomes, metrics,
status, or helper copy. Hover and recommendation emphasis made the marker label
visible while the world tooltip also appeared, creating duplicate 3D detail
layers for the same POI.

## Fix summary

- The 2D viewport overlay remains the only rich-details surface for title,
  status, summary, outcome, metrics, links, and visited/recommended badges.
- In-world POI canvases now render title-only cues.
- The active POI marker label yields while the anchored world tooltip is visible,
  leaving exactly one in-world cue for hovered, selected, and recommended POIs.
- A narrow read-only Playwright hook exposes overlay/world tooltip state and the
  active in-world tooltip count for regression coverage.

## Validation steps

- Open `/?mode=immersive&disablePerformanceFailover=1`.
- Hover or focus Gitshelves.
- Confirm the bottom-right 2D overlay still shows full details.
- Confirm the scene shows one title-only in-world cue near the POI.
- Confirm the in-world cue does not include summary, outcome, metrics, status,
  links, or helper copy such as “Interact to inspect” or “Next highlight”.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run test:e2e -- --grep "tooltip|POI|immersive"`
- `npm run docs:check`
- `npm run smoke`
