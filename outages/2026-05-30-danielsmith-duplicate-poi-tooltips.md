# danielsmith.io duplicate POI tooltip surfaces

- **Date:** 2026-05-30
- **Environment:** staging forced-immersive preview
- **Status:** Mitigation prepared for deployment validation

## Symptoms

Hovering a POI in immersive mode could show three information surfaces at once:

1. The intended bottom-right 2D viewport overlay with full POI details.
2. A rich in-world POI tooltip card above the hovered exhibit.
3. A second in-world marker label with overlapping POI detail copy.

The stacked 3D cards were most visible on exhibits such as Gitshelves and made
the scene feel noisy even though the rich details were already available in the
accessible overlay.

## Root cause class

Two separate in-world POI systems rendered overlapping metadata surfaces. The
world tooltip and pedestal marker labels both included rich details such as
summaries, outcomes, metrics, status text, or helper copy that should be
reserved for the 2D viewport overlay.

## Corrective action

- Keep the 2D POI overlay as the only rich detail surface.
- Reduce `PoiWorldTooltip` to a compact title-only in-world cue.
- Reduce pedestal marker label textures to title-only copy.
- Suppress the pedestal marker label for the active hovered, selected, or guided
  recommendation POI while the world tooltip is responsible for that active cue.
- Expose a narrow read-only `window.portfolio.poi.getTooltipState()` validation
  hook so browser tests can verify the active in-world tooltip count without
  inspecting WebGL internals.

## Manual validation

1. Open `https://staging.danielsmith.io/?mode=immersive&disablePerformanceFailover=1`.
2. Hover Gitshelves or cycle to it with keyboard traversal.
3. Confirm the bottom-right 2D overlay remains visible and includes title,
   status, summary, outcome, metrics, links, and visited/recommended badges when
   applicable.
4. Confirm exactly one in-world surface appears near the active POI.
5. Confirm the in-world surface contains only the POI title and does not include
   summary, outcome, metrics, status, links, or helper copy.

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
