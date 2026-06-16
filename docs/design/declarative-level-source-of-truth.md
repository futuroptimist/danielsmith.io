# Declarative level source of truth

This document defines the migration path for making the immersive house layout a
floor-plan-first, declarative source of truth. It is a design document only: the
current runtime pipeline remains unchanged until later migration prompts move one
layer at a time.

## Goals

- Keep the authoritative level data focused on the intended current scene.
- Generate visual meshes, gameplay colliders, and debug metadata downstream from
  that data.
- Give every authored level feature a stable semantic source ID that survives
  generator refactors and debug-label churn.
- Preserve the existing scene output throughout the migration until source-data
  edits intentionally change geometry.
- Treat the text data layer as the current editor before any in-game editor is
  built.

## Current pipeline

The immersive scene is already partly data-driven, but its source of truth is
spread across room data, derived wall segments, scene orchestration, and debug
registration code.

### Floor-plan room data

`src/assets/floorPlan/index.ts` defines the current room model:

- room bounds, names, categories, LED colors, and doorway ranges;
- scaled floor-plan coordinates;
- doorway width validation;
- generated room-wall and combined-wall segment helpers.

This file is the closest thing to an authored floor-plan source today. However,
it primarily describes broad room rectangles and openings, not every current
wall, railing, floor surface, invisible constraint, or visible object policy.

### Wall segment instances and IDs

`src/assets/floorPlan/wallSegments.ts` turns combined wall segments into wall or
fence instances. It calculates dimensions, centers, collider rectangles,
thickness, height, and whether a segment is a shared interior wall or exterior
fence.

Current `segmentId` values are generated from orientation, endpoints, attached
rooms, and the iteration index. They are useful for correlating meshes with
source segments today, but they are still derived implementation labels. Because
part of the ID depends on generated order, changes to segmentation can churn IDs
even when the authored wall intent is unchanged.

### Generated wall meshes

`src/scene/structures/wallSegmentsMesh.ts` converts wall segment instances into
Three.js box meshes. The mesh builder stores compact `segmentId` metadata on
`mesh.userData` and records whether a segment is a fence, shared interior wall,
and which thickness it used. This is generated visual geometry; it should remain
downstream from authored level data.

### Generated floor tiles and cutouts

`src/scene/structures/floorTiles.ts` builds floor meshes from room bounds. It can
include or skip exterior rooms, apply insets, and subtract global or per-room
cutouts before generating renderable box pieces. This splitting is a useful
implementation detail, especially for stair openings and other voids, but the
authored source should describe the floor surfaces and intentional voids rather
than preserving legacy rectangles only to subtract them later.

### Scene orchestration and manual additions

`src/main.ts` composes the scene and still owns many layout-affecting decisions:

- calls to create wall segment instances and wall meshes;
- calls to create room floor tiles and pass floor cutouts;
- manually pushed gameplay colliders;
- stair guards, landing guards, void blockers, and boundary constraints;
- debug registration names for colliders and solids;
- POI, showpiece, and visible-object collider policies;
- final scene object placement and orchestration.

These imperative additions are valid runtime code today, but they make it hard
to answer a simple authoring question: "what level geometry and constraints are
supposed to exist?" The migration should move those answers into declarative
source data while keeping `main.ts` as orchestration glue.

### Debug metadata

`src/scene/debug/colliderVisualizer.ts`, `src/scene/debug/solidVisualizer.ts`,
and `src/scene/debug/colliderDebugIds.ts` are downstream debug systems. They
register collider and solid metadata, derive short visible debug IDs, reserve
some declared IDs, filter debug-only objects, and expose lookup APIs.

Debug IDs are operational labels for inspection and screenshots. They should not
become the primary source identity for authored geometry. The target system
should feed these visualizers from semantic source IDs, then let them allocate
short display references as a downstream concern.

## Target pipeline

The target architecture is a one-way pipeline:

```text
Declarative level data
  -> validation and semantic source-ID registry
  -> generated visual geometry
  -> generated gameplay colliders
  -> generated debug metadata
  -> invariant tests and inventory tooling
```

The authoritative level data describes the current intended scene. Generated
geometry and debug labels may change shape internally as generators improve, but
the semantic source IDs and authored intent remain stable.

## Intended source layers

The declarative source can live as TypeScript data during the migration. It does
not need a custom editor or file format before the model stabilizes.

### Rooms

Rooms define semantic zones, labels, floor assignment, broad bounds, category,
and presentation hooks such as lighting groups. They remain useful for UI,
navigation, audio, POI grouping, and broad floor generation. Room data should not
be the only way to express precise wall, rail, object, or safety geometry.

### Walls, railings, and fences

Wall source data declares the current wall, railing, fence, trim, threshold, or
other fixed architectural geometry that should exist. Generators may split a
single authored run into multiple meshes or colliders, but the source entry owns
the semantic identity.

Examples:

- `ground.livingRoom.mediaWall`
- `ground.backyard.northFence`
- `upper.loftLibrary.southWall.left`

### Floor surfaces

Floor surface data declares current walkable or rendered floor pieces and
intentional voids. A generator may clip a surface into renderable boxes or
triangulated meshes, but source data should communicate the desired floor, not a
history of rectangles that used to exist.

### Safety colliders

Safety colliders declare invisible constraints that should exist, each with a
purpose. Stairwell blockers, landing guards, void guards, and boundary helpers
should have explicit source IDs, floor assignment, bounds, and rationale.

Example:

- `upper.stairwell.westBannister.safetyCollider`

### Scene objects

Scene objects declare visible and interactable placements and their collider
policies. POI pedestals, showpieces, furniture, exhibits, and architectural
props should define whether they contribute gameplay collision, pointer hit
areas, debug registration, or purely visual meshes.

Example:

- `ground.livingRoom.mediaWall.sceneObject`

### Room connections

Room connections are optional semantic adjacency records for UI, navigation,
analytics, narration, and accessibility. They are not a second geometry system.
If a connection has a visible threshold, trim, door, or blocker, that visible or
collidable element belongs in wall, floor, safety-collider, or scene-object
source data.

## No subtractive confusion

The source data should be positive and current, but generators can still use
subtractive implementation techniques.

Allowed generator internals:

- split a declared wall run into segments around an intentional opening;
- clip a declared floor surface into renderable pieces around a stair void;
- merge adjacent compatible collider pieces for runtime efficiency;
- allocate short debug labels from stable semantic source IDs.

Disallowed production source patterns:

- former wall bounds that exist only so another layer can remove them;
- removed collider bounds or tombstone lists;
- debug-ID skip lists as the way to express current layout;
- visualizer filters as the mechanism for hiding authored scene geometry;
- higher-layer patches that subtract blockers instead of declaring the open
  passage directly.

Door and passage handling should stay simple. If a passage is open, do not
preserve an old blocker just to remove it later. If a visible door, trim,
threshold, rail, or wall exists, declare it as current geometry or a scene
object. Door openings can still be authored as part of a wall run when that is
the simplest model; the generator may split the run around the opening.

## Semantic source IDs

Primary identity should be a human-readable hierarchical source ID. IDs should
encode floor, zone or feature, and the authored element without depending on
array position, generated mesh order, or debug display labels.

Examples:

- `upper.loftLibrary.southWall.left`
- `upper.stairwell.westBannister.safetyCollider`
- `ground.livingRoom.mediaWall.sceneObject`

Guidelines:

- IDs are stable authoring contracts and should be reviewed like public API.
- IDs should describe intent, not generator implementation details.
- Generated meshes, colliders, and debug metadata should carry the originating
  source ID.
- Short hex IDs may remain for debug overlays and screenshots, but they are
  downstream display references.
- If one source element generates many runtime artifacts, each artifact should
  retain the same source ID plus a generator-owned part label when needed.

## Migration risks

- **Debug ID churn:** existing screenshots and workflows may rely on short
  labels. Preserve bridge mappings while semantic IDs roll out.
- **Order-dependent wall segment IDs:** current segment IDs include an index, so
  harmless generator changes can alter labels. Stabilize current IDs before
  replacing them with source IDs.
- **Stair safety regressions:** stair, landing, and void guards are easy to
  disturb because they mix collision, traversal, and floor visibility concerns.
- **Visible object collider regressions:** POI/showpiece collision and pointer
  policies need explicit source data so visual-only and blocking objects do not
  swap behavior accidentally.
- **Overly literal positive-only modeling:** the no-tombstone rule should not
  make doors harder than necessary. It is acceptable to author an intended wall
  run with openings and let a generator split it.

## Migration phases

1. Add stable semantic source-ID primitives, validation, and helper functions.
2. Expose source IDs through debug collider and solid APIs without changing
   runtime behavior.
3. Stabilize current generated wall and fence IDs as an interim bridge.
4. Add a declarative level schema for rooms, walls, floor surfaces, safety
   colliders, scene objects, and room connections.
5. Migrate current room and wall data into the declarative source while
   preserving generated output.
6. Generate wall meshes, wall colliders, and wall debug metadata from source
   wall data.
7. Generate floor surfaces from source data, using generator-owned splitting or
   clipping where useful.
8. Move stair, landing, and void safety colliders into source-ID-backed
   definitions.
9. Move scene object placements and collider policies into declarative source
   data.
10. Add invariant tests and geometry inventory tooling to prevent hidden
    overrides, debug-ID tombstones, and accidental generated-output churn.
11. Remove legacy scaffolding once direct source edits reliably regenerate final
    scene geometry and collision.

## Testing and invariant strategy

The migration should add checks before relying on the new source model:

- validate unique semantic source IDs;
- validate source IDs match the allowed hierarchy and floor prefixes;
- assert every generated wall mesh and wall collider has a source ID;
- assert every safety collider has a declared purpose;
- inventory generated walls, floors, colliders, and debug metadata by source ID;
- snapshot current geometry counts and key bounds during bridge phases;
- detect debug-ID tombstones, removed-ID lists, and production visualizer filters
  that hide intended geometry;
- keep doorway width and traversal invariants in place while wall generation
  changes;
- add focused stair safety regression cases before moving stair guards.

The final proof point is direct source editing: changing a declarative wall,
floor surface, safety collider, or scene-object policy should regenerate the
matching visual geometry, gameplay collision, and debug metadata without a
manual patch elsewhere.
