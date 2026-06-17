# Declarative level source-of-truth design

## Purpose

This document defines the migration path from the current floor-plan and
scene-orchestration pipeline to a floor-plan-first declarative level source of
truth. It is intentionally documentation-only: the current TypeScript runtime,
rendered geometry, colliders, debug IDs, movement, stairs, POIs, and rendering
must remain unchanged until later migration prompts.

The core principle is that authoritative level data describes the intended
current scene. Generated meshes, gameplay colliders, debug metadata, validation,
and inventory reports flow downstream from that data. Generator internals may
split, clip, subtract, or batch geometry when that is the simplest way to build a
runtime artifact, but production source data should not preserve former bounds,
removed-ID lists, or higher-layer patches as the way to change layout.

## Current pipeline

The current level is assembled from several authoritative fragments plus runtime
orchestration code:

1. `src/assets/floorPlan/index.ts`
   - Defines room bounds, room labels, LED colors, categories, and doorway ranges
     in `BASE_FLOOR_PLAN` before scaling them into `FLOOR_PLAN`.
   - Doorways are attached to room walls and are validated by width, but they are
     not first-class semantic connections.
   - Wall generation starts from room bounds and doorways via room wall segments
     and combined wall segments.
2. `src/assets/floorPlan/wallSegments.ts`
   - Converts combined wall segments into wall or fence instances.
   - Computes wall/fence dimensions, center points, colliders, shared-interior
     status, and current `segmentId` values.
   - Current segment IDs are generated from segment data plus the segment order,
     so they are useful runtime correlation labels but are not yet stable source
     identities.
3. `src/scene/structures/wallSegmentsMesh.ts`
   - Builds Three.js wall and fence meshes from wall segment instances.
   - Copies compact metadata such as `segmentId`, `isFence`,
     `isSharedInterior`, and `thickness` into mesh `userData`.
4. `src/scene/structures/floorTiles.ts`
   - Builds room floor tile meshes from room bounds.
   - Supports generator-owned cutout subtraction and room-specific cutouts, then
     emits renderable tile pieces.
5. `src/main.ts`
   - Orchestrates the scene and stitches together generated assets with manual
     runtime additions.
   - Creates floor tiles, wall segment instances, wall meshes, lightmaps,
     ceilings, backyard environment pieces, stair geometry, POIs, and showpieces.
   - Pushes manually assembled colliders into ground, upper, and static collider
     lists, including wall colliders, backyard colliders, stair guards, landing
     and stairwell constraints, mirrors, media wall/showpiece colliders, and
     other object policies.
   - Supplies names and debug registrations for generated and manual colliders.
6. `src/scene/debug/colliderVisualizer.ts`,
   `src/scene/debug/solidVisualizer.ts`, and
   `src/scene/debug/colliderDebugIds.ts`
   - Consume collider and solid metadata after geometry and collider generation.
   - Allocate or validate compact debug labels for screenshots and debugging.
   - These debug references are downstream metadata, not the desired future
     source identity for level geometry.

The practical result is that the intended level is spread across room bounds,
doorway ranges, generated segment ordering, main-scene manual collider pushes,
object-specific collider policies, and debug-name conventions.

## Target pipeline

The target architecture makes the declarative level source the upstream contract:

```text
Declarative level data
  -> source validation and semantic source IDs
  -> generated visual geometry
  -> generated gameplay colliders
  -> generated debug metadata
  -> invariant tests and geometry inventory tooling
```

The declarative source should describe what exists in the current scene. Runtime
builders should derive their wall meshes, floor meshes, safety colliders,
interactable object colliders, debug names, and inventory reports from that
source. Generated artifacts may still use optimized shapes, split meshes, clipped
floor pieces, shared materials, or compact debug labels, but those details should
be downstream products.

## Intended source layers

### Rooms

Rooms define semantic zones, labels, floor assignment, broad bounds, and category
metadata. They are the spatial anchors for floor-plan editing, lighting zones,
POI placement validation, narration, and UI labels. Room bounds can remain broad
rectangles where that matches the current scene, but rooms should not be the only
place where walls, floors, and connections are implied.

### Walls, railings, and fences

Walls describe current wall, railing, bannister, and fence geometry that should
exist. A wall source item owns its semantic identity and can generate visual
meshes, gameplay colliders, and debug registrations. Doorway gaps and open
passages should be modeled as intentional absences or generator-split openings,
not as old blockers that are removed later.

### Floor surfaces

Floor surfaces describe current walkable and rendered floor pieces. They may be
large source rectangles or polygons while the generator clips them into smaller
renderable meshes around stairs, voids, thresholds, or material regions. Source
floor data should describe the intended current surface, not the history of a
former full floor plus a list of removed holes.

### Safety colliders

Safety colliders are invisible constraints that should exist, each with a stated
purpose such as preventing stairwell falls, preserving stair approach lanes,
blocking unfinished zones, or protecting showpiece footprints. They should carry
source IDs, floor assignment, bounds, and purpose text so reviewers can tell why
the invisible constraint exists.

### Scene objects

Scene objects describe visible or interactable objects and their collider
policies. Examples include media walls, mirrors, POI pedestals, showpieces,
barriers, and decorative objects that influence navigation. Object collider
policies should define whether colliders are generated from the object footprint,
custom declarative bounds, or intentionally absent.

### Room connections

Room connections describe optional semantic adjacency for UI, navigation,
narration, and editor affordances. They are not a second geometry system. A
connection may reference the rooms it links and the wall opening, threshold, or
scene object that represents it, but geometry still comes from the wall, floor,
and object layers.

## No subtractive confusion rule

Subtractive algorithms are allowed inside generators; subtractive production
source data is not the level-editing model.

Allowed generator behavior:

- Split a declared wall run into multiple mesh and collider segments around an
  intentional doorway.
- Clip or tile a declared floor surface into renderable pieces around a stair
  void, landing, threshold, or material seam.
- Merge adjacent compatible source items for draw-call efficiency while retaining
  source-ID provenance in debug metadata.

Disallowed production source patterns:

- `formerWallBounds`, `removedColliderBounds`, or equivalent tombstones that keep
  obsolete blockers in the source and remove them later.
- Debug-ID skip lists, visualizer filters, or higher-layer collider removal lists
  as the way to express the intended layout.
- Preserving an old wall, fence, or floor area solely so another layer can cut it
  away during normal production scene assembly.

Door and passage handling should stay simple. If a visible door, trim, threshold,
rail, or wall exists, declare it as current geometry or as a scene object. If a
passage is open, the source should declare the walls and floor surfaces that
currently exist around the passage; it should not preserve an old blocker just to
remove it later. A future door object can be added as a scene object without
turning semantic room connections into a parallel collision system.

## Semantic source IDs

Primary identity should be human-readable hierarchical source IDs. They should be
stable across generator ordering changes and meaningful in review diffs, debug
labels, test failures, and inventory reports.

Examples:

- `upper.loft_library.south_wall.left`
- `upper.stairwell.west_bannister.safety_collider`
- `ground.living_room.media_wall.scene_object`
- `ground.kitchen.north_threshold.floor_surface`
- `backyard.greenhouse_path.east_fence.section03`

Source ID guidance:

- Include floor or area first, then room/zone, then the object or boundary, then
  a specific part when needed.
- Prefer names that match user-facing or editor-facing concepts over generated
  array positions.
- Keep IDs stable when dimensions move slightly.
- Require uniqueness across all source layers unless a child artifact is using an
  explicit suffix derived from its owning source item.
- Allow downstream artifacts to append generated suffixes such as `.mesh.0`,
  `.collider.1`, or `.debug_label` when a source item produces multiple runtime
  pieces.

Short hex IDs may remain as debug display references for screenshot readability
or compact overlays, but they are downstream labels. Debug labels should point
back to semantic source IDs rather than becoming the source of truth.

The debug visualizer APIs now expose optional `sourceId`, `sourceType`, and
`purpose` metadata on collider and solid metadata responses while preserving the
existing visible hex IDs and label text. Collider registrations can pass those
fields directly, and solid debug metadata reads them from
`object.userData.levelSourceId` or `object.userData.levelSource`. Consumers can
use `getColliderBySourceId(...)`, `getCollidersBySourceId(...)`,
`getSolidBySourceId(...)`, and `getSolidsBySourceId(...)` to inspect downstream
artifacts by authoritative source identity without reverse-engineering compact
labels.

The foundation helpers for this migration live in
`src/scene/level/sourceIds.ts`. New source-backed level data should use the
`LevelSourceId` branded type, `assertLevelSourceId(...)`,
`joinLevelSourceId(...)`, and `makeLevelSourceId(...)` instead of passing raw
strings through generators. The helper validates lowercase dot-separated paths
with no empty segments, whitespace, or slash-style paths, and
`getLevelSourceDebugRef(...)` provides deterministic short uppercase hex
references for future debug metadata without changing current visible debug IDs.

## Migration phases

1. **Document the architecture.** Establish this source-of-truth model and the
   migration vocabulary without runtime behavior changes.
2. **Add source-ID primitives.** Introduce typed semantic source IDs, validation,
   and helper functions while preserving current generated outputs.
3. **Expose source IDs downstream.** Thread source IDs through debug collider and
   solid APIs as optional metadata without changing visual or collision behavior.
4. **Stabilize interim wall/fence IDs.** Bridge current generated wall and fence
   IDs so debug references do not churn while source IDs are introduced.
5. **Add the declarative schema.** Define rooms, walls, floor surfaces, safety
   colliders, scene objects, and room connections as source data.
6. **Migrate room and wall data.** Move current room and wall intent into the
   declarative source while proving generated output remains equivalent.
7. **Generate wall outputs from source.** Derive wall meshes, wall colliders, and
   wall debug metadata from source-backed wall definitions.
8. **Generate floor outputs from source.** Derive floor surfaces from source data,
   allowing generator-owned splitting and clipping where useful.
9. **Move stair and void safety.** Convert stair, landing, and void guard
   colliders into purpose-labeled source-ID-backed safety colliders.
10. **Move scene objects and policies.** Place visible/interactable objects and
    their collider policies in declarative source data.
11. **Add invariants and inventory tooling.** Prevent hidden overrides, duplicate
    source IDs, debug-ID tombstones, and unowned colliders or visible solids.
12. **Remove legacy scaffolding.** Delete bridge code once direct source edits are
    proven to regenerate final scene geometry and collision.

## Migration risks

- **Debug ID churn:** Compact labels and screenshot anchors may change when
  allocation order changes. Mitigation: carry semantic source IDs through debug
  metadata first, then stabilize or regenerate compact references deliberately.
- **Order-dependent wall segment IDs:** Current segment IDs depend partly on
  generated segment order. Mitigation: add semantic IDs before changing wall
  generation order and assert bridge mappings during migration.
- **Stair safety regressions:** Stair and landing colliders protect traversal and
  fall prevention. Mitigation: migrate them behind invariant tests that cover
  stair approach lanes, landing bounds, and stairwell void guards.
- **Visible object collider regressions:** Media walls, mirrors, pedestals, and
  showpieces can block movement in subtle ways. Mitigation: give every object a
  declared collider policy and inventory checks for unowned object colliders.
- **Overly literal positive-only modeling:** Modeling every door, threshold, or
  clip as tiny source rectangles could make editing harder than necessary.
  Mitigation: allow generator-level splitting and clipping while requiring the
  production source to describe current intent rather than historical removals.

## Testing and invariant goals

Future phases should add tests and tooling that make source ownership auditable:

- Every generated mesh, gameplay collider, debug collider, and debug solid has a
  semantic source ID or an explicit generated-child ID derived from one.
- Source IDs are unique, human-readable, and stable across generation order.
- No production level source contains tombstone fields, removed-bounds lists, or
  visualizer-only filters used to express layout.
- Wall/fence inventory reports compare source wall definitions to generated wall
  meshes, colliders, and debug metadata.
- Floor inventory reports compare source floor surfaces to generated renderable
  pieces and walkable/collision assumptions.
- Stair and safety-collider tests assert purpose-labeled constraints exist on the
  expected floor and within expected bounds.
- Scene object inventory checks assert visible/interactable objects have explicit
  collider policies.
- Room connection checks assert semantic adjacency references real rooms and real
  current geometry or scene objects, without creating duplicate collision rules.

## Definition of success

The migration is complete when a direct edit to declarative source data is enough
to regenerate the final visual geometry, gameplay collision, and debug metadata;
legacy patches, removed-ID lists, and manually pushed unowned colliders are gone;
and inventory tooling can explain every runtime level artifact by semantic source
ID.

## Declarative schema adapter added in phase 5

The first TypeScript schema now lives in `src/scene/level/schema.ts`. It defines
`LevelDefinition` and per-floor source layers for semantic rooms, current walls,
floor surfaces, safety colliders, scene objects, and optional room connections.
Every source-backed item carries a stable semantic `sourceId`, while local `id`
values stay unique within their layer on a floor so hand-edited diffs remain
small and readable.

Walls can be authored as explicit segment lists or as one current-state run with
intentional gaps. A gap means “this opening exists now”; it is not a former wall,
removed bounds record, or debug-ID tombstone. Visible doors, trims, thresholds,
rails, and similar passage details should be declared as current wall geometry or
scene objects. Purely walkable openings can remain as absences in the wall layer,
with an optional `RoomConnectionDefinition` for semantic adjacency.

`validateLevelDefinition(...)` enforces the initial source invariants:

- valid, unique semantic source IDs across all source layers;
- unique local object IDs inside each floor/layer namespace;
- positive wall segment or run length;
- positive floor-surface and safety-collider area;
- non-empty safety-collider purpose text;
- room references that resolve on the owning floor; and
- no source IDs containing `.former.`, `.removed.`, or `.debugOnlyRemoval.`.

The temporary compatibility adapter in
`src/scene/level/compileLegacyFloorPlan.ts` compiles declarative rooms into the
existing `FloorPlanDefinition` shape for transitional tests and legacy helpers.
It derives legacy room `doorways` only from intentional wall-run gaps so current
room-wall splitting can continue during migration. This is compatibility glue,
not canonical scene construction: semantic `roomConnections` are ignored by the
adapter and must not create, remove, or patch geometry by themselves.
