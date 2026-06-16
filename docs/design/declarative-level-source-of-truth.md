# Declarative level source-of-truth design

This document defines the target architecture and migration map for moving the
immersive scene to floor-plan-first, declarative level data. It is a design-only
plan: the current runtime remains unchanged until later migration prompts move
one layer at a time.

## Goals

- Make the authoritative level data describe the intended current scene.
- Generate visual meshes, gameplay colliders, debug metadata, and invariant tests
  downstream from that data.
- Keep source edits human-readable so the text data layer can act as the current
  editor before an in-game editor exists.
- Preserve current geometry and collision output during migration unless a later
  prompt explicitly changes behavior.
- Remove hidden overrides, debug-ID tombstones, and higher-layer removal patches
  from the production model.

## Current pipeline

The current scene already has several structured sources, but authority is split
across generated data and orchestration code.

1. `src/assets/floorPlan/index.ts`
   - Defines room bounds, labels, LED colors, categories, and doorways.
   - Scales the base plan into world units.
   - Generates room wall segments and combined wall segments from room bounds and
     doorway ranges.
   - Doorways are open gaps in generated wall runs rather than first-class source
     entities.
2. `src/assets/floorPlan/wallSegments.ts`
   - Converts combined wall segments into `WallSegmentInstance` records.
   - Derives current wall/fence dimensions, colliders, thickness, shared-interior
     flags, and compact segment IDs.
   - Segment IDs are tied to generation order, so layout edits can churn debug and
     mesh references even when the semantic wall did not change.
3. `src/scene/structures/wallSegmentsMesh.ts`
   - Builds Three.js box meshes from wall segment instances.
   - Copies compact segment IDs into `mesh.userData` for downstream correlation.
4. `src/scene/structures/floorTiles.ts`
   - Builds rendered floor tiles from room bounds.
   - Applies insets and cutouts, then splits floor rectangles into renderable
     pieces when a cutout overlaps a room tile.
5. `src/main.ts`
   - Orchestrates the scene by wiring the floor plan, generated wall meshes,
     generated colliders, staircase structures, upper-floor pieces, POIs,
     showpieces, debug toggles, and rendering systems.
   - Also manually pushes several gameplay colliders, stair/void guards, floor
     cutouts, debug names, POI colliders, and visible object collider policies.
   - This makes some level intent live outside the floor-plan source.
6. `src/scene/debug/colliderVisualizer.ts`,
   `src/scene/debug/solidVisualizer.ts`, and
   `src/scene/debug/colliderDebugIds.ts`
   - Consume runtime collider/solid data to create debug overlays and labels.
   - Current short debug IDs are useful display handles, but they are downstream
     metadata rather than durable semantic source identity.

## Target pipeline

The target architecture is a one-way data flow:

```text
declarative level data
  -> semantic source-ID validation
  -> visual geometry generators
  -> gameplay collider generators
  -> debug metadata generators
  -> invariant tests and inventory tooling
```

The production source declares what exists now. Generators may derive the exact
runtime shapes needed by Three.js, collision, and debug views, but generated
artifacts should not become the place where design intent is patched.

## Intended source layers

### Rooms

Rooms describe semantic zones, not every renderable shape. Each room should have:

- a human-readable source ID;
- a label/name for UI, debug output, and narration;
- floor assignment, such as `ground` or `upper`;
- broad bounds or footprint hints used by generators;
- optional category metadata, such as interior/exterior.

Rooms should remain useful for navigation, labels, lighting, and grouping even
when later wall or floor generation splits the final geometry into many pieces.

### Walls, railings, and fences

Walls declare the current physical barriers that should exist. This layer should
include interior walls, exterior shell walls, fences, railings, bannisters, trim
that blocks traversal, and any other barrier-like level geometry.

Generators may split a declared run around a doorway, clip it against stair
voids, or create several meshes/colliders from one semantic wall. The source
identity remains attached to the declared run and may be extended with stable
part IDs when the split pieces need individual references.

### Floor surfaces

Floor surfaces declare the current walkable or rendered surfaces that should
exist. A broad floor surface can generate several renderable tiles, especially
around stair openings, atriums, or room-specific cutouts.

The source should describe intended floor area, material/visual grouping, floor
assignment, and semantic room ownership. Generator-owned clipping and splitting
are acceptable implementation details.

### Safety colliders

Safety colliders declare invisible constraints that intentionally exist. Each
one needs a source ID, floor assignment, bounds/shape, and purpose, for example
"keeps the player out of the upper stairwell void" or "prevents cutting the
landing corner." Safety colliders should not be anonymous blockers pushed from
orchestration code.

### Scene objects

Scene objects declare visible or interactable placements and their collider
policies. Examples include POIs, showpieces, media walls, greenhouse objects,
props, and future interactables.

The source should distinguish visible geometry placement from collision policy:
no collider, generated bounds collider, custom authored collider, trigger-only,
or safety blocker. This prevents visible-object collision regressions when the
scene is reorganized.

### Room connections

Room connections are optional semantic adjacency records for UI, navigation, and
narration. They can say that the living room connects to the kitchen through a
named passage, or that the upper landing connects to a loft library.

Connections are not a second geometry system. A connection may reference a wall
opening, threshold object, or open passage, but blockers and floor surfaces still
come from the wall/floor/safety layers.

## No subtractive confusion rule

Subtraction is allowed inside generators when it is the cleanest way to produce
runtime geometry. Subtractive production source is not allowed.

Allowed generator behavior:

- split a wall run into left/right segments around an intentional doorway;
- clip a floor rectangle around a stair void;
- subdivide a large floor surface into renderable tiles;
- derive wall colliders and debug records from a declared wall;
- derive a short display ID from a stable source ID.

Disallowed production source patterns:

- keeping "former wall bounds" and deleting them later;
- keeping "removed collider bounds" as tombstones;
- using debug-ID skip lists to express layout intent;
- filtering visualizer output so obsolete geometry appears gone;
- adding higher-layer patches in `main.ts` as the primary way to change layout.

If a visible door, trim, threshold, rail, fence, bannister, or wall exists, it
should be declared as current geometry or as a scene object. If a passage is
open, the source should not preserve an old blocker just to remove it later.
Door handling should stay simple: declare the current barrier runs and the
intentional opening/connection, then let wall generators split the mesh and
collider pieces around that opening.

## Semantic source IDs

Primary identity should be stable, human-readable, hierarchical source IDs. They
should describe the floor, zone, object, and purpose without depending on array
order or generated geometry indexes.

Examples:

- `upper.loftLibrary.southWall.left`
- `upper.stairwell.westBannister.safetyCollider`
- `ground.livingRoom.mediaWall.sceneObject`

Source IDs should be unique across the level data set and should remain stable
when generator internals change. Derived artifacts can append deterministic part
suffixes, such as `.mesh.1`, `.collider.left`, or `.debugLabel`, but the base
source ID remains the durable identity.

Short hexadecimal IDs may remain in debug overlays as compact display
references. They are downstream labels, not source authority. A future debug
lookup should be able to map a short hex label back to a semantic source ID and
show both when useful.

## Migration phases

1. **Design and inventory**
   - Document the desired architecture and the current ownership split.
   - Inventory runtime-generated walls, floors, colliders, solids, and debug IDs.
2. **Source-ID primitives**
   - Add semantic source-ID types, validation, normalization helpers, and test
     fixtures without changing runtime behavior.
3. **Debug API bridge**
   - Expose source IDs through collider and solid debug APIs while preserving
     current labels and runtime behavior.
4. **Stable generated wall/fence bridge**
   - Stabilize current generated wall and fence IDs as an interim layer so later
     data moves do not cause avoidable debug churn.
5. **Declarative level schema**
   - Add schema/data structures for rooms, walls, floor surfaces, safety
     colliders, scene objects, and room connections.
6. **Move rooms and walls into source data**
   - Migrate current room bounds and wall data while proving generated output is
     unchanged.
7. **Generate walls downstream**
   - Generate wall meshes, wall colliders, and wall debug metadata from source
     wall data.
8. **Generate floors downstream**
   - Generate floor surfaces from source data, including generator-owned
     splitting/clipping around intentional voids and openings.
9. **Move safety colliders**
   - Move stair, landing, and void guards into source-ID-backed safety collider
     definitions.
10. **Move scene objects**
    - Move visible object placements and collider policies into declarative
      source data.
11. **Add invariants and inventory tooling**
    - Prevent hidden overrides, debug-ID tombstones, duplicate IDs, and geometry
      drift with tests and inventory reports.
12. **Remove legacy scaffolding**
    - Delete bridge code once direct source edits demonstrably regenerate final
      scene geometry, collision, and debug metadata.

## Migration risks

- **Debug ID churn:** short labels are visible in screenshots and debugging
  workflows; bridge mappings should minimize churn while source IDs become
  authoritative.
- **Order-dependent wall segment IDs:** current generated segment IDs can change
  when earlier segments are inserted, removed, or split.
- **Stair safety regressions:** stair, landing, and void guards are easy to break
  if invisible constraints move before tests encode their purpose.
- **Visible object collider regressions:** POIs and showpieces may depend on
  manually authored collider choices that need explicit source policies.
- **Overly literal positive-only modeling:** forcing every door into many small
  authored wall pieces can make editing harder. It is acceptable to declare a
  wall run plus intentional opening and let the generator split it.

## Testing and invariants

Later migration prompts should add tests and tooling that prove the declarative
source remains the single authority:

- source IDs are unique, stable-looking, and hierarchical;
- generated meshes, colliders, solids, and debug records all trace back to a
  source ID;
- short debug IDs are unique and map back to source IDs;
- no production source contains removed-ID lists, tombstones, or visualizer
  filters as layout intent;
- wall/floor generation snapshots remain unchanged during pure data migration;
- stair and landing safety colliders preserve current traversability constraints;
- scene object collider policies are explicit and covered by regression tests;
- inventory tooling reports unowned generated geometry or colliders as failures.

## Editor posture

No in-game editor should be built until the declarative text data layer is the
source of truth. The current editor is the text data itself: small source edits
should regenerate final scene geometry, collision, and debug metadata through the
pipeline above.
