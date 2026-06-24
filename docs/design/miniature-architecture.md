# Tabletop miniature architecture

The `danielsmith-portfolio-table` exhibit is a normal Three.js structure in the
immersive scene. It uses the existing renderer and builds procedural geometry;
it does not create a nested `Scene`, renderer, render target, texture capture,
audio system, collider set, or cloned overworld scene graph.

## Coordinate system

The miniature is authored from runtime world-space data. `PORTFOLIO_LEVEL` is
source data, while `FLOOR_PLAN`, `UPPER_FLOOR_PLAN`, and resolved POI positions
are already scaled to world units. The table builder therefore derives room
slabs, walls, POI proxies, floor elevations, and the player position from the
scaled runtime contracts instead of mixing scaled and unscaled coordinates.

A stable envelope is derived from the complete ground and upper floor bounds,
including the backyard-facing footprint and shared floor elevations. The model
origin is the X/Z center of that envelope at the ground-floor top elevation.
That origin is stable across graphics modes and POI redesigns, so a proxy edit
cannot unexpectedly recenter the entire dollhouse.

## Single miniature transform

The outer POI root remains bottom-center anchored with unit scale. The white
museum table is built directly in scene units. Only `MiniatureWorldRoot` uses a
uniform architectural scale, chosen once from the usable table bed width, depth,
and height. `MiniatureWorldContent` is translated by the negative stable world
origin, allowing architecture, POIs, scene components, and the tiny player to
retain their real overworld coordinates beneath the scaled root.

The exported transform maps world positions into table-local miniature space,
round-trips positions for tests, and preserves yaw without applying the outer
POI heading a second time. The tiny player root is updated every frame from the
actual bottom-anchored player world position and current mannequin yaw, with no
input-derived smoothing or lag.

## POI physical-size contract

`danielsmith-portfolio-table` has `PoiPhysicalMetadata` describing a white
museum display table holding an architectural scale model. The metadata is the
fit and clearance contract for the outer installation: the root anchor is
`bottom-center`, real-world reference dimensions are positive, intended scene
bounds cover the full visible build, and marker/avatar clearances keep the
route around the exhibit usable.

## Finite recursion boundary

The full builder composes a reusable nonrecursive white table shell and the
miniature world. The P4a POI proxy registry may use only the shell dimensions
and a blank display bed for `danielsmith-portfolio-table`; it never calls the
full builder and never creates another `MiniatureWorldRoot`, house, or player.
This makes the recursive visual moment finite: the real player approaches the
outer table while the tiny player approaches a plain inner table proxy.

## Future miniature updates

Future POI upgrades must update their miniature proxy descriptors and bump the
miniature manifest revision. Future scene components that become visible in the
immersive property must be classified in the scene-component coverage registry
as shared-source, proxy, or intentionally excluded nonvisual runtime behavior.
