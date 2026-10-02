# Floor connection foundation

The [house expansion contract](../design/house-expansion.md) uses an explicit
floor registry and adjacent stair connections. The foundation built `ground` and `upper`, joined by `ground-upper`. The
[basement shell](basement-stairs.md) now registers `basement`, joined to ground by
`basement-ground`. Reserving an elevation alone never registers navigation or
permits teleporting to an unbuilt floor.

## Runtime contracts

- `src/scene/floors/floorRegistry.ts` owns each built floor's world elevation,
  plan, visual/light groups, POI/structure groups, collision collections, and
  navigation mesh. Unknown and unbuilt IDs throw rather than selecting a fallback
- `src/systems/movement/floorConnections.ts` resolves only adjacent connections
  inside explicit transition zones. Construction rejects overlapping selectors
  on each shared floor, including entrance/landing margins and inclusive edges,
  while applying the lower or upper role of each connection. Collision checks
  preview a candidate; only accepted X/Z movement commits its floor, active
  connection, and descent origin
- `src/systems/movement/movementSubsteps.ts` bounds each runtime displacement
  piece by half the avatar radius and half the narrowest connection transition
  margin. Each piece uses the same axis-separated collision, floor, visibility,
  and height path, so slow frames cannot skip a descent trigger or tunnel through
  a rail. Ordinary displacement is preserved; extreme overflow beyond 64 pieces
  is discarded rather than enlarging pieces or creating unbounded catch-up work
- Stair sampling adds the connection's lower world elevation exactly once.
  Off-stair samples retain the current floor, including negative elevations.
  Upper-origin lip blending persists through slow steps and reversals
- Floor visibility and connection visibility are separate. A stair and its rails
  stay visible on either adjoining floor and hide on nonadjacent floors. Hidden
  floor POIs remain excluded by the shared selection/raycast visibility predicate
- Safety generators accept role-local floor/source identities. Positive-Z stairs
  mirror the established negative-Z guards, including a positive-area lower
  corner guard. Original upstairs geometry and stable collider identities remain
  unchanged

Horizontal geometry is already in world units when passed to the controller.
Do not scale floor elevations by `FLOOR_PLAN_SCALE`.

## Read-only diagnostic snapshots

With the immersive preview running, the existing world API provides:

```js
window.portfolio.world.getFloorRegistrySnapshot();
window.portfolio.world.getFloorConnectionSnapshot();
window.portfolio.world.getStairMetrics('ground-upper');
window.portfolio.world.getFloorVisibilitySnapshot();
window.portfolio.debugCoordinates.getState();
```

Registry snapshots contain each built floor's elevation, rooms, navigation,
collider count, and visibility. Connection snapshots contain all connections,
adjacency, source identities, transition zones, visibility, and active descent
context. Returned geometry, navigation bounds, and source lists are copies.
The no-argument stair metrics and zone helpers retain their upstairs meaning;
zone queries may specify an explicit `connectionId`.

## Regression checks

```bash
npm run typecheck
npm run lint
npm run test:ci
npx vitest run src/systems/movement/__tests__/floorConnections.test.ts \
  src/systems/movement/__tests__/movementSubsteps.test.ts \
  src/scene/performance/__tests__/performanceHistoryRunner.test.ts
npm run miniature:check
npm run i18n:guard
npm run test:e2e -- playwright/immersive-stairs-roundtrip.spec.ts \
  playwright/keyboard-traversal.spec.ts playwright/small-screen-hud.spec.ts \
  --workers=1 --retries=0 --trace=retain-on-failure
```

The Tests workflow runs these focused traversal suites in their own serial
WebGL job and retains failure traces separately from performance evidence.
The original nine upstairs cases remain in place. Their walked ascent also
checks the registry and explicit connection snapshot. Additional regressions
walk upstairs round trips using displacements from 150, 160, and 350 ms frames
and attempt large side/back rail crossings. Only isolated starting fixtures use
teleports; destination floor and height must come from runtime movement.

Synthetic unit fixtures cover three floors, both stair directions, negative and
nonzero base elevations, exact lips, slow descent, lip reversal, off-stair
retention, landing-edge nudges, mirrored side/back guards, invalid/overlapping
connections, and visibility of adjacent versus unrelated stairs. Those foundation fixtures do not replace the runtime basement coverage recorded
in the [basement graybox report](basement-stairs.md).

Continue the [upstairs walkthrough](upstairs-stairs.md) for owner review and use
the [retained performance history](performance/README.md) for measurement
provenance. Software-renderer functional results do not close the owner hardware
frame-time or actual-browser walkthrough gates.
