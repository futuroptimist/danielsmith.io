# danielsmith.io tabletop miniature

The table projects the production scene's visual geometry after all house,
property and POI builders have finished. `sourceSnapshot.ts` captures world
transforms and source colors once, batches triangles by floor and surface
opacity, and reduces curved tessellation. It does not create another world,
light set, texture set, animation loop, collider set or navigation mesh.

All three floors are represented. The dollhouse cutaway follows the active
floor, just like the overworld. The property envelope is computed across all
source floors, including the garage, front yard, sidewalk and street; it stays
fixed when the visible floor changes. One uniform transform fits that envelope
inside the existing table bed. The physical table and its collision footprint
remain unchanged. The live marker uses the player's world position and visual
yaw, including stair elevations, without clamping to the original house bounds.

Furniture, stairs, the solar growing frame and wall colors come from their
actual rendered resources. Box geometry is preserved; curved primitives have
bounded tessellation and dense custom decorations use their source bounds.
Textures and shader-driven effects are omitted. Emissive fixtures are baked
into unlit colored batches. Camera distance never removes the miniature, so
zooming does not introduce new pop-in. Quality controls only its tessellation.

The recursion boundary is the shared white table shell. Snapshot traversal
rejects an existing `MiniatureWorldRoot` or `PortfolioMiniatureTable`; it never
invokes a scene builder. There is one dedicated low-poly player marker.
The snapshot owns and disposes only its generated buffers and batch materials.
It never disposes production geometry, materials or textures.

The production regression checks limit the snapshot to 64 batches and the
whole table to 40,000 triangles, across all stored floors. The browser debug
API exposes `world.getMiniatureSnapshot()` for coverage and budget inspection.
Structural tests cover property fit, floor coverage, source transforms/colors,
stairs/furnishings, marker round trips, recursion and resource ownership.

The nearby solar growing frame is a stationary, open aluminum rectangle with
side-leaning dark solar panels, fabric grow bags and a galvanized tub. Its
collider is derived from the rotated visual bounds. The east corner backyard
shrub has a separate source-backed collider matching its visible crown; other
vegetation is unchanged.
