# Declarative level source-of-truth design

## Objective

The immersive scene should move to a floor-plan-first, declarative level source of truth. The
source data must describe the intended current scene, while generated meshes, gameplay
colliders, debug metadata, inventory reports, and tests flow downstream from that data. This
migration is documentation-only for now: no TypeScript runtime behavior, generated geometry,
collider generation, debug ID generation, movement, stairs, POIs, or rendering should change in
this step.

The text data layer is the current editor. Before building an in-game editor, the project needs a
stable declarative model that a human or automation task can edit directly and then regenerate
scene outputs from predictable source IDs.

## Current pipeline

The current level pipeline is split across reusable floor-plan helpers and scene orchestration:

1. `src/assets/floorPlan/index.ts` defines room bounds, room labels, categories, LED colors,
   doorways, floor plan scaling, doorway width validation, and generated combined wall segments.
   Room rectangles are the closest thing to current source data, while doorways are expressed as
   intentional openings on room walls.
2. `src/assets/floorPlan/wallSegments.ts` converts combined wall segments into wall or fence
   instances with dimensions, centers, colliders, fence flags, shared-interior flags, and current
   `segmentId` strings. Those IDs encode generated geometry coordinates and room/wall membership,
   with an index fallback when generated data would otherwise collide.
3. `src/scene/structures/wallSegmentsMesh.ts` turns wall segment instances into Three.js box
   meshes, applies lightmap UV2 data, and writes downstream metadata such as `segmentId`, fence
   status, shared-interior status, and thickness into mesh `userData`.
4. `src/scene/structures/floorTiles.ts` turns room bounds into floor tile meshes. It can subtract
   global or per-room cutouts, split a tile into renderable rectangular pieces, name the pieces,
   and return their bounds for downstream systems.
5. `src/main.ts` orchestrates the scene. It wires floor plans into ground and upper floor groups,
   adds generated wall meshes, pushes generated wall colliders into floor collider arrays, creates
   stair and landing geometry, manually pushes stair guards and safety colliders, supplies upper
   floor cutouts, registers debug names, and adds POI/showpiece objects with their own colliders.
6. `src/scene/debug/colliderVisualizer.ts`, `src/scene/debug/solidVisualizer.ts`, and
   `src/scene/debug/colliderDebugIds.ts` consume runtime objects and collider registrations to
   produce debug metadata. Stable-looking short hex debug labels are downstream display references,
   not authoritative source identity.

This pipeline already has good generated pieces, but the intended level can be hard to audit
because some layout facts live as room definitions, some as generator output, and some as manual
runtime patches in scene assembly.

## Target pipeline

The target architecture keeps source intent upstream and makes every generated artifact traceable:

```text
declarative level data
  -> semantic source IDs and validation
  -> visual geometry generators
  -> gameplay collider generators
  -> debug metadata generators
  -> invariant tests and inventory tooling
```

The authoritative level data should describe the geometry and constraints that should exist now.
Generators may split, clip, merge, or subtract internally when that creates simpler meshes or
colliders, but those implementation details should not become production source intent.

## Intended source layers

### Rooms

Rooms describe semantic zones: source ID, label, floor assignment, category, broad bounds, and
presentation metadata such as lighting affiliation. Room bounds remain useful for broad placement,
containment checks, narration, HUD labels, and default floor generation, but they should not be
the only way to infer all visible geometry.

### Walls, railings, and fences

Wall source records describe current wall, railing, bannister, and fence geometry that should
exist. Each record should have a semantic source ID, floor, endpoints or bounds, kind, material or
style hint, height policy, collider policy, and optional doorway/threshold annotations. Generated
wall meshes, wall colliders, and wall debug records should derive from these records.

### Floor surfaces

Floor surface records describe current walkable or rendered floor pieces that should exist. They
may start as broad rectangles for rooms and landings. A generator can clip those rectangles around
stair voids or split them into renderable boxes, but the source layer should state the intended
surface and the intentional void or opening rather than preserving obsolete floor pieces and
removing them later.

### Safety colliders

Safety colliders describe invisible constraints that should exist, each with a purpose. Examples
include stair run guards, upper void blockers, bannister protection, landing edge guards, and
unfinished-area barriers. Each record should state why it exists, what floor it applies to, and
whether it is gameplay-only, debug-visible, or paired with visible geometry.

### Scene objects

Scene object records describe visible or interactable object placements and collider policies.
Examples include POI pedestals, showcase workbenches, looms, trim, thresholds, signs, doors,
lanterns, or other authored objects. Their collider policy should be explicit: no collider,
generated footprint collider, authored collider bounds, or delegated colliders returned by an
object factory.

### Room connections

Room connections are optional semantic adjacency records for UI, navigation hints, narration, or
future editor affordances. They are not a second geometry system. A connection can say that the
living room connects to the kitchen through an open passage, but the visible walls, trim,
thresholds, and empty passage geometry still come from walls, floor surfaces, or scene objects.

## No subtractive confusion

The production source should model the intended current scene, not a history of what used to be
there.

Allowed generator behavior:

- split a wall run into multiple generated wall segments around an intentional doorway;
- merge adjacent compatible source runs before producing optimized meshes;
- clip a floor rectangle around a stairwell opening or other declared void;
- split a clipped floor surface into multiple renderable rectangular meshes;
- produce multiple colliders from one source record when that is easier to validate or render.

Disallowed production source patterns:

- former wall bounds kept in source so a later layer can remove the open passage;
- removed collider bounds or tombstone lists that express layout by subtracting old blockers;
- debug-ID skip lists or visualizer filters as the mechanism for saying something should not
  exist;
- higher-layer runtime patches that silently override source geometry instead of changing source
  data.

Door and passage handling should stay simple. If a passage is open, source data should declare the
current wall runs on either side and, when useful, a semantic room connection for UI/navigation. It
should not declare a full old blocker just to remove the doorway later. If a visible door, trim,
threshold, rail, or wall exists, declare it as current geometry or as a scene object with its own
source ID.

## Semantic source IDs

Primary identity should be human-readable hierarchical source IDs. They should be stable under
array reordering, generator refactors, and harmless coordinate formatting changes.

Example source IDs:

- `upper.loftLibrary.southWall.left`
- `upper.stairwell.westBannister.safetyCollider`
- `ground.livingRoom.mediaWall.sceneObject`
- `ground.kitchen.backyardThreshold.floorSurface`
- `upper.landing.stairVoid.floorOpening`

Recommended rules:

- Use floor or level as the first namespace segment.
- Use the semantic zone or object family as the next segment.
- End with a role such as `northWall`, `floorSurface`, `safetyCollider`, `sceneObject`,
  `threshold`, or `connection`.
- Treat source IDs as API-like identifiers: rename only when the authored intent changes.
- Keep short generated or hashed IDs as downstream display labels only.

Short hex IDs may remain in debug visualizers for screenshot readability, but they should be
allocated from or linked back to semantic source IDs. Debug labels are not the source of truth.

## Migration phases

1. **Design and inventory**: document the desired architecture, inventory current geometry and
   colliders, and identify manual runtime patches that need source homes.
2. **Source-ID primitives**: add source ID types, validation helpers, uniqueness checks, and
   conversion helpers without changing generated output.
3. **Debug API bridge**: expose source IDs through collider and solid debug metadata while keeping
   current short debug labels for visual continuity.
4. **Stable wall/fence bridge**: stabilize current generated wall/fence IDs as interim aliases so
   later source IDs can be introduced without immediate debug churn.
5. **Declarative schema**: add source data for rooms, walls, floor surfaces, safety colliders,
   scene objects, and room connections.
6. **Room and wall migration**: move current room and wall data into declarative source records and
   prove generated output is unchanged.
7. **Wall generation**: generate wall meshes, wall colliders, and wall debug metadata directly from
   source wall records.
8. **Floor generation**: generate floor surfaces from source records, with generator-owned
   splitting and clipping for stair voids and other declared openings.
9. **Safety collider migration**: move stair, landing, bannister, and void guards into
   source-ID-backed safety collider definitions.
10. **Scene object migration**: move object placements and collider policies into source data while
    preserving the existing object factories.
11. **Invariant and inventory tooling**: add tests and reports that prevent hidden overrides,
    missing source IDs, debug-ID tombstones, and unowned colliders.
12. **Legacy cleanup**: remove bridge scaffolding after direct source edits demonstrably regenerate
    final scene geometry and collision.

## Migration risks

- **Debug ID churn**: screenshots and debugging workflows may depend on short hex labels. Preserve
  aliases during migration and report source IDs beside display IDs before removing bridges.
- **Order-dependent wall segment IDs**: current generated wall segment IDs can include index data,
  so reordering source arrays may change downstream IDs unless semantic IDs are introduced first.
- **Stair safety regressions**: invisible stair, landing, and void colliders are easy to miss in a
  visual review. Migrate them with explicit purpose fields and movement-focused regression tests.
- **Visible object collider regressions**: POI/showpiece colliders currently come from runtime
  object creation paths. Source collider policies must preserve those footprints or explicitly
  delegate to existing factories.
- **Overly literal positive-only modeling**: source data should not make doors harder than
  necessary. It is acceptable to declare a wall run with intentional openings and let the generator
  split it; the rule is to avoid preserving obsolete blockers and tombstones as production intent.

## Testing invariants and inventory tooling

The migration should add checks that answer these questions automatically:

- Does every generated wall mesh, wall collider, floor tile, safety collider, and authored object
  collider have a source ID or documented temporary bridge alias?
- Are source IDs unique, hierarchical, and valid?
- Can a source array be reordered without changing generated geometry or semantic IDs?
- Do generated debug records include both semantic source IDs and short display IDs where needed?
- Are there any removed-ID lists, visualizer filters, or runtime overrides that express intended
  layout outside the source data?
- Do stair zones, landing guards, and void blockers still protect the same navigation boundaries?
- Does a geometry inventory diff explain every intentional change in meshes and colliders?

The end state is a source-editable level: change the declarative data, regenerate downstream
geometry/collision/debug metadata, and review a clear inventory diff rather than chasing hidden
runtime patches.
