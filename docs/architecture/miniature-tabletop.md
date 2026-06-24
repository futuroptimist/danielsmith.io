# danielsmith.io tabletop miniature

The `danielsmith-portfolio-table` POI is a unit-scale, bottom-center anchored
museum display table. Its outer shell is authored directly in scene units and is
sized by the shared `PORTFOLIO_MINIATURE_TABLE_CONTRACT`; the POI root must stay
at scale `[1, 1, 1]`.

The miniature content under `MiniatureWorldRoot` is the only intentionally scaled
subtree. It uses the canonical two-step-lower miniature detail policy so public
quality modes map as Cinematic → Performance, Balanced → Low, and Performance →
Micro. The table shell itself uses the active overworld detail policy.

## World-space transform

Miniature coordinates are derived from runtime-scaled world data, not from raw
`PORTFOLIO_LEVEL` source coordinates. The stable envelope combines the scaled
ground and upper floor outlines, uses the ground-floor top elevation as Y origin,
and includes the upper-floor elevation plus architectural height. The transform
uses one uniform scale that fits the envelope into the tabletop model bed.

The hierarchy is:

- `PortfolioMiniatureTable` at the resolved POI position and heading;
- `MiniatureWorldRoot` at the model-bed origin with one uniform scale;
- `MiniatureWorldContent` translated by the negative stable world origin;
- architecture, scene-component proxies, POI proxies, and `MiniaturePlayer` in
  overworld world units.

Future floor-plan or visible component changes must update the miniature proxy or
manifest entry that owns the changed geometry.

## Finite recursion boundary

The outer exhibit contains the complete interactive miniature. The inner
`MiniatureSelfProxy` intentionally reuses only the plain white table shell
silhouette / blank model bed proxy from the miniature POI registry. It must never
instantiate `MiniatureWorldRoot`, another house, another player, a renderer, a
scene, a render target, or the full `createPortfolioMiniatureTable` builder.

## Live player mapping

`MiniaturePlayer` is a dedicated low-poly humanoid built at the canonical
mannequin visual height before parent scaling. Each frame, `main.ts` passes the
resolved bottom-anchored player world position and visual player yaw. The mapped
root has no smoothing; palette changes are pushed into the tiny player materials
without rebuilding the miniature world.

## Physical-size and marker contract

`PoiPhysicalMetadata` includes the danielsmith.io table reference, intended scene
bounds, bottom-center anchor, marker minimum height, and avatar path radius. The
intended bounds are a maximum fit and clearance contract, not a request to scale
proxies to fill the table. Generic marker placement should use the metadata
clearance instead of one-off POI offsets.
