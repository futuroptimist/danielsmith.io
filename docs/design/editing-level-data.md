# Editing level data

`src/scene/level/portfolioLevel.ts` is the current source of truth for authored
level intent. Generators may split wall runs, clip floor surfaces, and derive
colliders, but authors should edit the declarative source instead of adding
runtime filters or debug-ID removal lists.

## Naming and source IDs

Use stable semantic `sourceId` values for every authored entity:

- Rooms: `<floor>.<room>.room`
- Walls: `<floor>.<room_or_area>.<direction_or_role>_wall`
- Floors: `<floor>.<room>.floor.<piece>`
- Safety colliders: `<floor>.<area>.<role>.safetyCollider`
- Scene objects: `<floor>.<object>.scene_object`
- Room connections: `<floor>.<room_a>_to_<room_b>.connection`

IDs are dot-separated and validated by `src/scene/level/sourceIds.ts`. Do not use
source IDs that describe deleted history, such as `former` or `removed`; describe
only current layout intent.

## Add or remove a wall

Edit the floor's `walls` array in `src/scene/level/portfolioLevel.ts`.

- Add a `WallDefinition` with `id`, `sourceId`, `floorId`, `wallKind`, optional
  `rooms`, and either a `run` or explicit `segments`.
- Use `run.gaps` for current open passages in a wall run. Gaps are present-day
  topology, not records of removed geometry.
- Remove a wall by deleting its `WallDefinition`. The wall mesh, collider, and
  debug solid metadata are regenerated from the remaining definitions.

## Add or remove a floor surface

Edit the floor's `floorSurfaces` array. Each surface owns a rectangular `bounds`
value, optional `roomId`, optional `elevation`, and optional `purpose`. Generator
cutouts and splits are downstream of those current source surfaces.

## Add a safety collider

Use the floor's `safetyColliders` array for authored level blockers and
`src/scene/level/stairSafetyColliders.ts` for stair-specific guard geometry. Give
each collider a semantic `sourceId`, explicit `bounds`, and a short `purpose` so
QA can understand why the blocker exists.

## Add a visible door, trim, or prop

Add a `SceneObjectDefinition` to `sceneObjects` with a `kind`, `position`, and
optional `orientation`. Set `colliderPolicy` to the intended behavior:

- `solid` or `bounds` for blocking objects.
- `decorativeNoCollision` or `none` for purely visual trim.
- `interactionOnly` for POI or showpiece affordances that should not block
  movement.

## Add a semantic room connection

Add a `RoomConnectionDefinition` to `roomConnections` when rooms are narratively
or semantically adjacent. Connections do not add or remove wall geometry. If the
layout needs an opening, edit the wall source data with a current `run.gaps`
entry or remove the wall definition.

## Inspect source IDs in the browser

Open the immersive preview with the required overrides:

```bash
npm run preview -- --host 0.0.0.0
```

Then browse to `/?mode=immersive&disablePerformanceFailover=1` and inspect:

```js
window.portfolio.debugSolids.setEnabled(true);
window.portfolio.debugColliders.setEnabled(true);
window.portfolio.debugSolids.getSolidsBySourceId(
  'upper.upper_landing.south_wall'
);
window.portfolio.debugColliders.getCollidersBySourceId(
  'upper.stairwell.westBannister.safetyCollider'
);
```

Use source IDs as primary assertions. Hex debug IDs are useful short references
but should not be the authored contract.

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
