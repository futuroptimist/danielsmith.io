# Declarative level source-of-truth design

## Purpose

This document records the completed migration from the original floor-plan and
scene-orchestration fragments to a floor-plan-first declarative level source of
truth for migrated walls, floor surfaces, major safety colliders, and migrated
scene-object placements. Runtime behavior, debug UI behavior, stair movement,
POIs, and rendering remain intentionally preserved while source data now owns
the current scene intent.

The core principle is that authoritative level data describes the intended
current scene. Generated meshes, gameplay colliders, debug metadata, validation,
and inventory reports flow downstream from that data. Generator internals may
split, clip, subtract, or batch geometry when that is the simplest way to build a
runtime artifact, but production source data should not preserve former bounds,
removed-ID lists, or higher-layer patches as the way to change layout.

## Current pipeline after migration

The current level is assembled from declarative source data plus downstream
generators and a small amount of scene orchestration:

1. `src/assets/floorPlan/index.ts`
   - Defines room bounds, room labels, LED colors, categories, and doorway ranges
     in `BASE_FLOOR_PLAN` before scaling them into `FLOOR_PLAN`.
   - Doorways are attached to room walls and are validated by width, but they are
     not first-class semantic connections.
   - Legacy consumers can still derive room wall segments from room bounds and
     doorway-compatible wall gaps.
2. `src/scene/level/generateWalls.ts`
   - Splits declarative wall runs around current topology gaps, room boundaries,
     and seams, then emits wall/fence instances with source IDs.
   - Computes wall/fence dimensions, center points, colliders, shared-interior
     status, and generator-owned seam extension without requiring removed-bounds
     lists or visualizer filters.
3. `src/assets/floorPlan/wallSegments.ts`
   - Retains the legacy combined-wall adapter for compatibility tests and
     non-migrated consumers.
   - Computes wall/fence dimensions, center points, colliders, shared-interior
     status, and current `segmentId` values.
   - Current segment IDs are generated from segment data plus the segment order,
     so they are useful runtime correlation labels but are not yet stable source
     identities.
4. `src/scene/structures/wallSegmentsMesh.ts`
   - Builds Three.js wall and fence meshes from wall segment instances.
   - Copies compact metadata such as `segmentId`, `isFence`,
     `isSharedInterior`, and `thickness` into mesh `userData`.
5. `src/scene/structures/floorTiles.ts`
   - Builds room floor tile meshes from room bounds.
   - Supports generator-owned cutout subtraction and room-specific cutouts, then
     emits renderable tile pieces.
6. `src/main.ts`
   - Orchestrates the scene and stitches together generated assets with manual
     runtime additions.
   - Creates floor tiles, source-generated wall segment instances, wall meshes, lightmaps,
     ceilings, backyard environment pieces, stair geometry, POIs, and showpieces.
   - Pushes manually assembled colliders into ground, upper, and static collider
     lists, including wall colliders, backyard colliders, stair guards, landing
     and stairwell constraints, mirrors, media wall/showpiece colliders, and
     other object policies.
   - Supplies names and debug registrations for generated and manual colliders.
7. `src/scene/debug/colliderVisualizer.ts`,
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

Floor surfaces describe current walkable and rendered floor pieces and now carry
stable semantic source IDs through generated meshes and debug solids. They may be
large source rectangles or polygons while the generator clips them into smaller
renderable meshes around stairs, voids, thresholds, or material regions. Source
floor data should describe the intended current surface, not the history of a
former full floor plus a list of removed holes. Current stairwell clipping remains
generator-owned so authored production data names the present landing surfaces
rather than preserving historical missing-floor artifacts.

### Safety colliders

Safety colliders are invisible constraints that should exist, each with a stated
purpose such as preventing stairwell falls, preserving stair approach lanes,
blocking unfinished zones, or protecting showpiece footprints. They are distinct
from physical wall colliders: walls describe visible layout boundaries and emit
wall meshes/debug metadata, while safety colliders describe intentional invisible
runtime constraints that keep traversal safe around voids, stairs, landings, and
other no-floor areas. They should carry source IDs, floor assignment, bounds, and
purpose text so reviewers can tell why the invisible constraint exists instead of
mistaking it for hidden post-hoc layout geometry.

Stair and landing safety colliders are source-backed even when their bounds are
generated from stair layout measurements. Their source IDs and stable debug IDs
should stay beside the active declarations or segment policies that emit each
runtime collider, and their purpose strings should explain the constraint (for
example preserving a descent corridor edge or guarding a hidden stair-run
no-floor area) without masquerading as room-wall geometry. Removed colliders do
not leave debug-ID tombstones or negative historical tests; generator and
registry tests validate the currently active declarations generically, while
behavior tests pin player-facing traversal promises.

### Scene objects

Scene objects describe visible or interactable objects and their collider
policies. Examples include media walls, mirrors, POI pedestals, showpieces,
barriers, and decorative objects that influence navigation. Object collider
policies are source data: a visible solid-looking object should declare a
`solid`, `custom`, or other blocking policy, while pass-through exhibits must
declare `decorativeNoCollision` or `interactionOnly` with a reason. Absence of
a collider is therefore an explicit authored policy, not an accidental omission.
The first migrated subset covers the Flywheel showpiece/info panel, Axel
navigator, Jobbot terminal, PR Reaper console, and Wove loom. Scene-object
positions are authored in level-space coordinates and validated against their
declared room bounds; POI placement adapters scale them to the runtime world
coordinates used by the current immersive scene. Scene object placement and
collider policy are declarative source data rather than shadow runtime constants.
Objects that intentionally have no collider must
be explicitly marked with a no-collider policy and authored reason instead of
silently disappearing from collider generation. These objects continue to use
their existing structure-factory collider bounds, but the source object owns the
stable source ID, room/floor placement, purpose, and `custom`
`factory-colliders` policy that debug collider and solid metadata can expose.

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

## Declarative schema adapter (phase 5)

The first code-level source contract lives in `src/scene/level/schema.ts`. It is
not wired into runtime scene construction yet; `FLOOR_PLAN`,
`UPPER_FLOOR_PLAN`, generated wall meshes, generated colliders, and compact debug
IDs remain unchanged in this phase. The schema exists so future edits have a
small, hand-authored shape to migrate toward before any runtime generator changes.

The schema models a `LevelDefinition` with one or more `FloorDefinition` entries.
Each floor has an outline plus explicit arrays for semantic rooms, current walls,
floor surfaces, and optional safety colliders, scene objects, and semantic room
connections. All source-backed entities carry a `sourceId` using the semantic ID
helpers from `src/scene/level/sourceIds.ts`, and validation checks global source
ID uniqueness across layers. Per-layer `id` fields are unique within their floor
namespace so editor-friendly IDs can stay short while source IDs remain globally
stable.

Wall authoring supports two current-state representations:

- explicit positive wall `segments` for authors who want to spell out each
  visible/collidable piece;
- a current wall `run` with intentional `gaps` for doors or open passages when
  the run is easier to edit as one boundary.

Those gaps describe present topology only. They are not removed-wall records.
Validation rejects source IDs with whole tombstone-like path segments such as
`former`, `removed`, or `debugonlyremoval`, including when those words are the
final segment. Doorway gaps use local distances measured from `run.start`
toward `run.end`; the adapter projects those local distances into absolute
legacy doorway ranges. Doorway gaps must be finite, positive, axis-aligned,
within that local wall-run span, non-overlapping, sorted or normalizable, and
wide enough for the legacy doorway checks. A visible door,
arch, trim, threshold, or rail should be declared as a scene object or current
wall/railing; a walkable opening does not need a former blocker record.

Current ground and upper room bounds, wall runs, intentional wall-run gaps,
floor surfaces with source IDs, and semantic room connections now live in
`src/scene/level/portfolioLevel.ts`. The temporary adapter in
`src/scene/level/compileLegacyFloorPlan.ts` compiles a declarative floor
back to the existing `FloorPlanDefinition` shape for migration checks and
narrow compatibility. By default it copies room metadata only. When
`includeDoorwaysFromWallGaps` is explicitly enabled, it derives legacy room
`doorways` from current wall-run gaps. That derivation is compatibility glue for
old room-wall generators, not the canonical future scene-construction path, and
semantic `roomConnections` intentionally do not create or remove geometry.

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
6. **Migrate room and wall data.** Current room and wall intent now lives in
   `src/scene/level/portfolioLevel.ts`; legacy floor-plan exports still compile
   through the adapter until downstream generators consume source data directly.
7. **Generate wall outputs from source.** Wall meshes, wall colliders, and
   wall debug metadata now derive from `FloorDefinition.walls` via
   `src/scene/level/generateWalls.ts`; the legacy room-doorway wall generator is
   retained only as a compatibility reference while later phases migrate floors,
   safety colliders, and inventory tooling.
8. **Generate floor outputs from source.** Floor meshes now derive from
   `FloorDefinition.floorSurfaces` via
   `src/scene/level/generateFloorSurfaces.ts`, with generator-owned splitting
   and clipping preserving the current stairwell void while propagating
   `floorSurface` source metadata to debug solids.
9. **Move stair and void safety.** Convert stair, landing, and void guard
   colliders into purpose-labeled source-ID-backed safety colliders.
10. **Move scene objects and policies.** Place visible/interactable objects and
    their collider policies in declarative source data.
11. **Add invariants and inventory tooling.** Prevent hidden overrides, duplicate
    source IDs, debug-ID tombstones, and unowned colliders or visible solids.
12. **Remove legacy scaffolding.** Completed for migrated walls, floor
    surfaces, major safety colliders, and migrated scene objects. Direct source
    edit tests now prove that adding or deleting wall definitions changes final
    generated meshes/colliders, and semantic room connections do not act as a
    parallel geometry system.

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

## Completion status and remaining edges

The migration is complete for current room definitions, wall/fence generation,
floor surfaces, stair/void safety colliders, and the migrated scene-object
placements with collider policies. Direct source edits regenerate generated wall
meshes and colliders, browser debug APIs expose source IDs for known wall, floor,
and safety-collider artifacts, and semantic room connections remain metadata
rather than geometry.

Remaining edge cases are limited to compatibility surfaces that still exist for
comparison or non-level runtime systems: the legacy floor-plan wall adapter in
`src/assets/floorPlan/wallSegments.ts` is retained for regression comparisons,
not as the production authoring path, and compact hex debug IDs remain downstream
labels. Hardcoded bounds that remain in production code should be either explicit
source data, stair-derived safety geometry, or documented object-factory collider
policies. See `docs/design/editing-level-data.md` for the current human editing
workflow.

### Backyard perimeter policies

Backyard perimeter collision now uses source-owned semantic policies in
`src/scene/level/backyardCollisionPolicies.ts`. The left, right, and back
fence visual runs and their physical-boundary colliders derive from the same
segment declarations so a future fence edit updates visuals and collision from
one source. The retained back fence boundary declares debug ID `1006`,
while the hologram barrier declares `1007`, so each source-backed collider keeps
its historical manual-debug label.
