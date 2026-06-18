# Editing level data

`src/scene/level/portfolioLevel.ts` is the human-edited source of truth for the
current immersive level layout. The scene builders may split wall runs, clip
floor surfaces, or derive compact debug IDs, but edits to intended rooms, walls,
floors, safety colliders, scene objects, and room connections should start in
that declarative file.

## Naming and source IDs

Use stable, dot-separated semantic source IDs:

- Start with the floor or area: `ground`, `upper`, or `backyard`.
- Add the room or zone in editor terms: `living_room`, `upperLanding`,
  `stairwell`.
- Add the authored thing: `south_wall`, `floor.main`, `scene_object`, or
  `safetyCollider`.
- Add a part only when the same source concept produces multiple authored
  entries, for example `.left` or `.section03`.

Examples:

- `ground.living_room.south_wall`
- `ground.livingRoom.floor.main`
- `upper.stairwell.westBannister.safetyCollider`
- `ground.flywheel.scene_object`

Source IDs must remain unique across all level layers. Do not include words such
as `former`, `removed`, or `tombstone`; open space is represented by the absence
of wall/floor geometry or by an intentional current wall-run gap.

## Rooms

Edit room bounds, names, LED colors, and categories in the `rooms` array for the
floor. Rooms are semantic zones and placement anchors. They do not implicitly
create walls or floors by themselves; add those in the dedicated arrays.

## Add or remove a wall

Walls live in each floor's `walls` array.

To add a wall:

1. Add a `WallDefinition` with a stable `id` and `sourceId`.
2. Set `floorId`, `wallKind`, and `rooms`.
3. Use a `run` for a straight wall, or `segments` when spelling out pieces is
   clearer.
4. Add `run.gaps` only for current open passages or doorways.

To remove a wall, delete the wall definition. Do not keep the old bounds in a
removal list, debug filter, or visualizer skip list.

## Add or remove a floor surface

Floor surfaces live in `floorSurfaces`. Most room floors are created by
`floorSurfaceForRoom(...)`, and special pieces can be appended in `buildFloor`.
Add the source ID to `FLOOR_SURFACE_SOURCE_IDS`, then ensure the bounds describe
the current walkable/rendered surface. The floor generator owns downstream
splitting and stairwell clipping.

## Add a safety collider

Safety colliders live in `safetyColliders` for authored fixed colliders, and
stair-derived colliders are defined in `src/scene/level/stairSafetyColliders.ts`.
Every safety collider needs:

- `id`
- `sourceId`
- `floorId`
- `bounds`
- a clear `purpose`

Use safety colliders for invisible constraints such as stairwell void guards or
approach-lane protection, not as a hidden substitute for visible wall geometry.

## Add visible doors, trim, or showpieces

Visible non-wall objects live in `sceneObjects`. Use a scene object for a door,
trim, threshold, media wall, showpiece, or terminal that is visible or
interactable. Pick an explicit `colliderPolicy`:

- `custom` when an existing factory supplies colliders.
- `bounds` or `solid` for straightforward blocking footprints.
- `decorativeNoCollision` or `interactionOnly` when the object intentionally
  should not block movement; include the reason.

## Add semantic room connections

Use `roomConnections` only for semantic adjacency, navigation, narration, or
editor affordances. A room connection does not create or remove wall geometry or
colliders. If the connection needs an opening, edit the wall run/gap or delete
that wall source data. If it needs a visible threshold or door, add a scene
object.

## Inspect source IDs in the browser

Launch immersive mode with performance failover disabled:

```bash
npm run preview -- --host 0.0.0.0
# open http://localhost:5173/?mode=immersive&disablePerformanceFailover=1
```

In DevTools, enable and query debug APIs:

```js
window.portfolio.debugSolids.setEnabled(true);
window.portfolio.debugColliders.setEnabled(true);
window.portfolio.debugSolids.getSolidsBySourceId(
  'ground.livingRoom.floor.main'
);
window.portfolio.debugColliders.getCollidersBySourceId(
  'upper.stairwell.westBannister.safetyCollider'
);
```

Short hex IDs are useful overlay labels, but source IDs are the primary review
and test assertions.

## Verification commands

Run the standard checks before committing level-data edits:

```bash
npm run format:write
npm run lint
npm run test:ci
npm run docs:check
npm run smoke
```

For source-ID and runtime metadata changes, also run focused tests:

```bash
npx vitest run src/scene/level/__tests__/generateWalls.test.ts
npx vitest run src/scene/level/__tests__/generateFloorSurfaces.test.ts
npx playwright test playwright/immersive-stairs-roundtrip.spec.ts
```
