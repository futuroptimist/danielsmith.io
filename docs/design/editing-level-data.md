# Editing declarative level data

The immersive house layout is authored from current-state declarative data in
`src/scene/level/portfolioLevel.ts`. Runtime generators may split, clip, or
derive meshes and colliders, but level intent should be edited in source data,
not by adding removal lists, former bounds, visualizer filters, or debug-ID
hacks.

## Source ID conventions

Use `sourceId(...)` with dot-separated semantic IDs:

- Rooms: `<floor>.<room>.room`
- Walls: `<floor>.<room-or-area>.<direction-or-feature>_wall`
- Floor surfaces: `<floor>.<room>.floor.main` or another descriptive suffix
- Safety colliders: `<floor>.<area>.<purpose>.safetyCollider`
- Scene objects: `<floor>.<object>.scene_object`
- Room connections: `<floor>.<room_a>_to_<room_b>.connection`

IDs must be stable and human-readable. Do not use whole path segments such as
`former`, `removed`, or `debugonlyremoval`; current openings are represented by
the absence of a wall span or by a current wall `gaps` range.

## Add or remove a wall

Edit the target floor's `walls` array. A wall definition needs an `id`,
`sourceId`, `floorId`, `wallKind`, optional `rooms`, and either a `run` or
explicit `segments`. Use `run.gaps` for current open passages. Removing a wall
means deleting that source wall definition; do not keep a tombstone or a hidden
skip entry.

The wall generator in `src/scene/level/generateWalls.ts` owns downstream splits
and produces wall meshes, gameplay colliders, and debug metadata with the same
wall source ID.

## Add or remove a floor surface

Edit the floor's `floorSurfaces` array. Each surface has bounds, a source ID,
and optional `roomId`, `elevation`, and `purpose`. Removing a floor surface means
removing that source entry. Generator-owned cutouts are allowed when they derive
from current source data such as stairwell openings.

## Add a safety collider

Prefer source-backed definitions in `stairSafetyColliders.ts` for stair and void
protection. Give every collider a precise `purpose` and a
`*.safetyCollider` source ID. Hardcoded bounds are acceptable only when they are
the explicit collider definition or derived from stair geometry.

## Add a visible door, trim, or object

Add visible, non-wall affordances as `sceneObjects` with a `*.scene_object`
source ID and an explicit `colliderPolicy`. A semantic `roomConnection` can
explain adjacency, but it must not be relied on to create or remove collision
geometry.

## Inspect runtime source IDs

Open the immersive scene with the required overrides:

```text
http://localhost:5173/?mode=immersive&disablePerformanceFailover=1
```

Then use the browser console:

```js
window.portfolio.debugSolids.setEnabled(true);
window.portfolio.debugColliders.setEnabled(true);
window.portfolio.debugSolids.getSolidsBySourceId(
  'upper.upper_landing.south_wall'
);
window.portfolio.debugColliders.getCollidersBySourceId(
  'upper.stairwell.northBannister.safetyCollider'
);
```

Hex debug IDs are useful labels, but source IDs are the primary assertions for
walls, floors, safety colliders, and scene-object colliders.

## Verification commands

Run these before opening a PR:

```bash
npm run format:write
npm run lint
npm run test:ci
npx playwright test playwright/immersive-stairs-roundtrip.spec.ts
npm run docs:check
npm run build
npm run smoke
```
