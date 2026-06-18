# Editing level data

The immersive house layout is authored from declarative current-state data in
`src/scene/level/portfolioLevel.ts`. Edit that file first when changing rooms,
walls, floor surfaces, safety colliders, visible scene objects, or semantic room
connections. Generators may split, clip, or derive render/collision artifacts,
but source files should describe what exists now rather than keeping deleted
bounds or debug IDs for later removal.

## Naming and source IDs

Every authored entity has a stable `sourceId` validated by
`src/scene/level/sourceIds.ts`:

- Use dot-separated semantic paths: `<floor>.<area>.<feature>`.
- Prefer existing floor and room terms, such as `ground.livingRoom` and
  `upper.upperLanding`, when extending nearby data.
- End IDs with a useful type hint when it improves readability:
  `.room`, `.floor.main`, `.safetyCollider`, `.scene_object`, or `.connection`.
- Do not use tombstone wording such as `former`, `removed`, or
  `debugonlyremoval` in source IDs. A missing wall or collider should be absent
  from source data.

## Add or remove a wall

Walls live in each floor's `walls` array. Add a `WallDefinition` with:

- `id`: kebab-case local name.
- `sourceId`: semantic ID for debug lookup and generated colliders.
- `floorId`: the owning floor.
- `wallKind`: `wall`, `fence`, or `railing`.
- `rooms`: adjacent room IDs when known.
- `run`: an axis-aligned start/end pair, plus optional current-state `gaps` for
  openings.

Remove a wall by deleting its wall definition. Do not leave a skip list, old
bounds record, visualizer filter, or room connection to cancel it. Semantic
`roomConnections` are documentation/navigation metadata only; they do not create
or remove wall geometry.

## Add or remove a floor surface

Floor surfaces live in `floorSurfaces`. Add a `FloorSurfaceDefinition` with
`id`, `sourceId`, `floorId`, `bounds`, and optional `roomId`/`purpose`. The floor
surface generator owns downstream tile splitting and cutouts. Remove floor area
by editing current surface bounds or cutout source data, not by storing a former
full floor and subtracting it later.

## Add a safety collider

Safety colliders live in `safetyColliders` for source-authored level blockers or
in `src/scene/level/stairSafetyColliders.ts` for stair-derived guard geometry.
Use `sourceId`, `floorId`, `bounds`, and a short `purpose`. Hardcoded bounds are
acceptable only when they are explicit current safety geometry and are covered by
focused tests.

## Add visible doors, trim, or props

Visible non-wall details live in `sceneObjects`. Add a scene object with
`sourceId`, `kind`, `position`, optional `orientation`, and a `colliderPolicy`.
Use `decorativeNoCollision` for visual trim/doors that should not block the
player, `bounds` for explicit blocking footprints, or `interactionOnly` for POI
objects that are selectable without physical collision.

## Add a room connection

Use `roomConnections` for semantic adjacency, navigation intent, or docs. A
connection can describe why rooms relate, but it must not be relied on as wall or
floor geometry. If an opening should exist, model the wall as absent or add a
current-state wall `gap`; if a blocker should exist, add a wall or safety
collider.

## Inspect source IDs in the browser

Launch the immersive scene with the required preview overrides:

```bash
npm run preview
# Open http://localhost:5173/?mode=immersive&disablePerformanceFailover=1
```

Then inspect debug metadata from DevTools:

```js
window.portfolio.debugSolids.setEnabled(true);
window.portfolio.debugColliders.setEnabled(true);
window.portfolio.debugSolids.getSolidsBySourceId(
  'upper.upper_landing.south_wall'
);
window.portfolio.debugColliders.getCollidersBySourceId(
  'upper.stairwell.hiddenRun.safetyCollider'
);
window.portfolio.debugColliders.getBlockingCollidersAt({
  x: 6.2,
  z: -16,
  floorId: 'upper',
});
```

Source IDs are the primary review handles. Short hexadecimal debug IDs are
secondary references for screenshots and low-level debugging.

## Verification commands

Run the standard checks before opening a PR:

```bash
npm run format:write
npm run lint
npm run test:ci
npm run docs:check
npm run build
npm run smoke
```

For source-ID and stair-focused review, also run:

```bash
npx vitest run src/scene/level/__tests__/sourceEditProof.test.ts src/scene/level/__tests__/generateWalls.test.ts src/scene/level/__tests__/generateFloorSurfaces.test.ts
npx playwright test playwright/immersive-stairs-roundtrip.spec.ts
```
