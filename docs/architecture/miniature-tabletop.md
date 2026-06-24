# danielsmith.io tabletop miniature

The `danielsmith-portfolio-table` POI is a finite recursive exhibit: the real
POI root is a unit-scale white museum table, while its tabletop contains a
single `MiniatureWorldRoot` using the architectural scale transform. The inner
self-proxy is only the nonrecursive white table shell, so it cannot build a
nested house, nested player, or second proxy catalog.

## Coordinate and sizing contract

Miniature content is authored in world-space scene units beneath
`MiniatureWorldContent`. The stable envelope is derived from the runtime-scaled
`FLOOR_PLAN` and `UPPER_FLOOR_PLAN` outlines plus shared floor elevations; do
not mix these with unscaled `PORTFOLIO_LEVEL` source coordinates. The root
origin is the X/Z center of the complete property envelope at the ground-floor
top elevation.

The model uses one uniform scale chosen from the tabletop model-bed width,
depth, and represented height. Positions map as:

1. subtract the stable world origin;
2. apply the single uniform scale on `MiniatureWorldRoot`;
3. place the root at the model-bed offset on the physical table.

The outer `PortfolioMiniatureTable` root remains bottom-center anchored with
scale `[1, 1, 1]`. Only `MiniatureWorldRoot` is intentionally scaled.

## Content rules

All current POIs are instantiated once from the P4a miniature proxy registry
using placement-resolved `PoiDefinition` world positions and headings. Future POI
visual upgrades must update their miniature proxy and manifest entry. Visible
non-POI components continue to be tracked by the miniature scene-component
coverage registry.

The live tiny player is a dedicated low-poly humanoid, not a clone of the
runtime avatar. Each frame it receives the canonical player bottom position and
resolved visual yaw, so stair heights and facing remain exact inside the single
affine transform. Palette changes are forwarded to the tiny player materials.

The POI physical-size contract in `physicalMetadata.ts` records the real-world
museum-table reference, intended scene bounds, marker height clearance, and avatar
path radius. Marker placement and collision should use that generic contract
instead of special-casing the POI.
