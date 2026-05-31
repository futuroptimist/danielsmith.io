# danielsmith.io duplicate POI tooltip cleanup

- **Date:** 2026-05-30
- **Environment:** staging forced-immersive POI hover validation
- **Status:** Mitigation prepared for deployment validation

## Symptoms

Hovering a POI, including the Gitshelves living-room exhibit, could show three
information surfaces at once: the expected 2D viewport details card plus two
overlapping in-world 3D cards above the POI. The stacked 3D cards repeated
summary, outcome, metrics, status, and helper copy that should live only in the
2D overlay.

## Root cause class

Two in-world POI surface systems were carrying rich metadata: pedestal marker
labels and the camera-facing world tooltip. When hover, selection, or guided-tour
state emphasized a POI, those 3D surfaces could overlap while the accessible 2D
overlay also rendered the same details.

## Corrective action

- Preserve the bottom-right 2D POI overlay as the only rich details surface for
  title, status, summary, outcome, metrics, links, visited badges, and guided
  recommendation badges.
- Simplify the camera-facing in-world POI cue to title-only copy.
- Simplify pedestal marker textures to title-only copy so inactive nearby labels
  cannot duplicate details.
- Hide the active POI pedestal label while the camera-facing world cue is active,
  leaving exactly one active in-world POI surface.
- Add a read-only Playwright hook at `window.portfolio.poi.getTooltipState()` so
  browser coverage can verify the active in-world surface count without
  inspecting WebGL internals.

## Validation

1. Open `/?mode=immersive&disablePerformanceFailover=1`.
2. Hover or keyboard-focus a POI such as Gitshelves.
3. Confirm the bottom-right 2D overlay remains visible and still contains rich
   details.
4. Confirm exactly one in-world surface is visible for the active POI.
5. Confirm the in-world surface contains only the POI title, with no summary,
   outcome, metrics, status, links, or helper copy.
6. Confirm selected and guided-tour recommendation states do not create duplicate
   in-world POI cards.

## Expected validation commands

```bash
npm run format:write
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e -- --grep "tooltip|POI|immersive"
npm run docs:check
npm run smoke
```
