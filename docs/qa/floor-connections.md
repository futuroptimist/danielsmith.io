# Floor connection foundation

The [house expansion contract](../design/house-expansion.md) uses an explicit
floor registry and adjacent stair connections. The runtime currently builds only
`ground` and `upper`, joined by `ground-upper`. Reserving the `basement` elevation
does not register navigation, create a room, or permit teleporting to an unbuilt
floor.

## Runtime contracts

- `src/scene/floors/floorRegistry.ts` owns each built floor's world elevation,
  plan, visual/light groups, POI/structure groups, collision collections, and
  navigation mesh. Unknown and unbuilt IDs throw rather than selecting a fallback
- `src/systems/movement/floorConnections.ts` resolves only adjacent connections
  inside explicit transition zones. Collision checks preview a candidate; only
  accepted X/Z movement commits its floor, active connection, and descent origin
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
npm run miniature:check
npm run i18n:guard
npm run test:e2e -- playwright/immersive-stairs-roundtrip.spec.ts \
  playwright/keyboard-traversal.spec.ts playwright/small-screen-hud.spec.ts \
  --workers=1 --retries=0 --trace=retain-on-failure
```

The Tests workflow runs these focused traversal suites in their own serial
WebGL job and retains failure traces separately from performance evidence.
The original nine upstairs cases remain in place. Their walked ascent also
checks the registry and explicit connection snapshot; teleporting to a destination
does not establish successful traversal.

Synthetic unit fixtures cover three floors, both stair directions, negative and
nonzero base elevations, exact lips, slow descent, lip reversal, off-stair
retention, landing-edge nudges, mirrored side/back guards, invalid/overlapping
connections, and visibility of adjacent versus unrelated stairs. They prepare the
basement contract without claiming that an unbuilt basement has browser coverage.

Continue the [upstairs walkthrough](upstairs-stairs.md) for owner review and use
the [retained performance history](performance/README.md) for measurement
provenance. Software-renderer functional results do not close the owner hardware
frame-time or actual-browser walkthrough gates.
