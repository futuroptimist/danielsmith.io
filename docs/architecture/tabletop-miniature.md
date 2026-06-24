# danielsmith.io tabletop miniature

The `danielsmith-portfolio-table` POI is a finite recursive exhibit: the outer
POI remains a bottom-center anchored, unit-scale museum table while its tabletop
contains a scaled procedural miniature of the property. The inner
`MiniatureSelfProxy` is intentionally only the plain white table shell, so it
never creates another `MiniatureWorldRoot` or nested property model.

## Coordinate contract

The miniature uses runtime world-space data only. `FLOOR_PLAN` and
`UPPER_FLOOR_PLAN` are the scaled floor-plan adapters used for rendering, while
POI definitions are placement-resolved world coordinates. The builder does not
mix those values with unscaled `PORTFOLIO_LEVEL` source coordinates.

A stable envelope is computed from the complete ground and upper floor outlines,
including the backyard, plus the shared ground and upper floor elevations. The
world origin is the X/Z center of that envelope at the ground-floor top. A single
uniform scale is selected from the usable model-bed width, depth, and height.
`MiniatureWorldRoot` owns that architectural-model scale; all child house,
backyard, POI proxy, scene-component, and player nodes stay in overworld scene
units beneath a `MiniatureWorldContent` offset by the negative world origin.

The outer `PortfolioMiniatureTable` root must stay at scale `[1, 1, 1]`. Its
physical dimensions come from the POI physical-size contract shared by metadata,
tests, and the builder. `MiniatureWorldRoot` is the only intentional non-unit
scale because it represents the architectural model transform.

## Runtime behavior

Every current POI is instantiated exactly once through the miniature POI proxy
registry using the two-step-down miniature detail policy. Future POI visual
upgrades must update their miniature proxy and bump the sync revision so the
manifest check catches source drift.

The live tiny player is a dedicated low-poly humanoid, not a clone of the
mannequin. Each frame, after movement and facing resolve, `main.ts` passes the
bottom-anchored player world position and canonical visual yaw to the table
build. The miniature player root is set directly in world units beneath
`MiniatureWorldContent`, so the parent transform maps it exactly with no lag or
floor snapping. Palette changes are applied in place to the tiny player without
rebuilding the miniature.
