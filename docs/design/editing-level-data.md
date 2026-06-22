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

## Inspect runtime colliders from the CLI

Before proposing a collider removal, resolve the runtime collider through the
immersive debug API instead of searching generated arrays by hand. The on-demand
inspector launches or reuses the local Vite runtime, opens immersive mode with
performance failover disabled, reads `window.portfolio.debugColliders`, and
prints the collider identity, source provenance, policy metadata, normalized
bounds, dimensions, ID kind, and active overlap count. It does not write an
inventory file or participate in CI.

```bash
npm run collider:inspect -- --id 101A
npm run collider:inspect -- --source-id upper.stairwell.landingGuard.shoulderEast
npm run collider:inspect -- --name UpperStairNorthBannisterGuard
npm --silent run collider:inspect -- --id 101A --json > /tmp/collider-101A.inspect.json
```

Use `--json` for machine-readable output. When redirecting JSON or piping it to
`jq`, run through `npm --silent` so npm script banners do not dirty the capture.
Selectors accept exactly one of `--id`, `--source-id`, or `--name`; prefer source
IDs over generated screenshot IDs for long-term review references.

By default the runtime target is local, usually `http://127.0.0.1:5173`; the
collector starts Vite there when needed. Set `PLAYWRIGHT_BASE_URL` to inspect an
already-running target such as staging, and unset it before local verification if
it was previously exported:

```bash
PLAYWRIGHT_BASE_URL=https://staging.danielsmith.io npm run collider:inspect -- --id 101A
unset PLAYWRIGHT_BASE_URL
```

The inspect and geometry-audit CLIs use that environment variable for non-local
targets. The reachability audit also supports `--base-url` when a one-off target
is clearer than an exported environment variable.

## Audit collider geometry from the CLI

When two colliders look redundant, run the opt-in geometry audit against one
candidate at a time. The audit reuses the same runtime debug collector and
selector matching as the inspector, then compares only colliders on compatible
floors and in the same category so unrelated floors do not create false
evidence. It reports exact duplicates, containment in either direction,
pairwise overlap percentages, deterministic sample-grid union coverage, and
nearby edge adjacency. Geometry overlap is supporting evidence only and never by
itself proves deletion is safe, especially for outer walls, stair safety guards,
and secondary backstops that protect traversal edge cases.

```bash
npm run collider:audit:geometry -- --id 101A
npm run collider:audit:geometry -- --source-id ground.backyard.perimeter.backFence.boundary
npm --silent run collider:audit:geometry -- --id 101A --json > /tmp/collider-101A.geometry.json
```

Classification guide:

- `exact duplicate`: another same-floor/category collider has matching bounds.
- `fully contained`: the candidate is contained by another reviewed collider.
- `highly overlapped`: the sample-grid union covers at least 95% of the
  candidate.
- `partially covered`: some overlap exists, but coverage is below the high bar.
- `ambiguous`: nearby edge adjacency exists without meaningful coverage.
- `isolated`: no same-review-group duplicate, containment, overlap, or adjacency
  evidence was found.

Use `--samples <count>` to tune the deterministic per-axis union-coverage grid
and `--tolerance <world-units>` to adjust nearby-edge or nearly-identical bounds
matching. Audit output is not persisted and is not part of required CI.

## Audit collider reachability from the CLI

When static geometry is not enough, run the opt-in reachability audit for one
candidate. The audit asks whether a player starting from known legal anchors can
reach an approach region and encounter the candidate as the first meaningful
blocker. It combines bounded occupancy path proposals with normal runtime
movement stepping, then reports direct load-bearing hits, dominating blockers,
outside-navmesh evidence, visual-only source policies, secondary backstop intent,
or ambiguity.

```bash
npm run collider:audit:reachability -- --id 101A
npm run collider:audit:reachability -- --source-id ground.backyard.perimeter.backFence.boundary
npm --silent run collider:audit:reachability -- --id 101A --json --max-nodes 4000 --timeout-ms 180000 > /tmp/collider-101A.reachability.json
npm run collider:audit:reachability -- --id 101A --base-url https://staging.danielsmith.io
```

Classification guide:

- `directly-load-bearing`: at least one confirmed approach hits the candidate
  first; do not remove it without changing the level/collision plan and adding
  tests.
- `dominated`: every reachable approach was blocked by other colliders; this is
  stronger removal evidence when the report names concrete source-backed
  dominating colliders.
- `outside-reachable-navmesh`: sampled approaches were unreachable from legal
  starts.
- `visual-only-by-policy`: the selected source policy intentionally emits no
  runtime collider.
- `secondary-backstop`: source intent says this collider is a backup blocker.
- `ambiguous`: the bounded search did not prove first-blocker or domination
  behavior; keep reviewer judgment in the loop.

The output includes grid resolution, maximum explored nodes, tested starts, and
tested approach samples. `blocked-by-other` rows with generic blocker names and
no source IDs usually indicate a metadata/provenance gap, not a deletion green
light. The audit is review evidence only: it does not scan every collider in CI,
delete anything, persist snapshots, or replace screenshots and maintainer
judgment when the result is ambiguous.

## Conservative collider redundancy gate

Run the CI-safe redundancy gate before merging collider-heavy changes:

```bash
npm run collider:audit:redundancy
npm run collider:audit:redundancy -- --json
npm run collider:audit:redundancy -- --max-nodes 3000 --timeout-ms 120000
```

The gate starts or reuses the local immersive runtime, collects active debug
colliders, and scans a bounded number of records for high-confidence redundancy.
It fails only when the finding is source-backed and actionable, such as exact
duplicate active colliders with equivalent floor/category/source semantics or a
source-backed collider fully contained by source-backed collider(s) in the same
review group. Anonymous/generated colliders, isolated colliders, ambiguous edge
adjacency, and runtime-only reachability uncertainty remain warnings or manual
follow-up by default. Use `--fail-on-anonymous` only for an explicit stricter
local audit; CI should not enable it unless the current source tree already
passes.

A failure names the candidate collider, source ID when available,
classification, dominating colliders, evidence, and remediation: remove the
duplicate, merge the source policy, mark an intentional secondary/backstop
collider, or add missing source metadata. This gate is deliberately conservative
and is not a substitute for maintainer judgment on ambiguous collision behavior.

## Lightweight collider removal workflow

For a possible removal, keep the review centered on the active source policy. If
a screenshot label names `101A`, use the generated ID only as the entry point:

```bash
npm run collider:inspect -- --id 101A
npm --silent run collider:inspect -- --id 101A --json > /tmp/collider-101A.inspect.json
npm --silent run collider:audit:geometry -- --id 101A --json > /tmp/collider-101A.geometry.json
npm --silent run collider:audit:reachability -- --id 101A --json --max-nodes 4000 --timeout-ms 180000 > /tmp/collider-101A.reachability.json
```

Then search by the reported durable identity instead of continuing to cite the
overlay label:

```bash
npm run collider:inspect -- --source-id <reported-source-id>
npm run collider:inspect -- --name <reported-runtime-name>
```

If `sourceId` is missing, identify the declaration, factory, or collider push
site that generates the runtime record and add source metadata before making a
removal decision. Generated overlay IDs are useful screenshot anchors, but
source IDs are the durable debugging and review handles.

Decision guide:

- If geometry says `isolated` and reachability says `ambiguous`, do not remove
  the collider based on CLI evidence alone.
- If reachability says `dominated` and names concrete source-backed dominating
  colliders, that is stronger removal evidence.
- If reachability says `directly-load-bearing`, do not remove the collider
  without changing the level/collision plan and adding tests.
- Prefer source IDs over generated screenshot IDs in docs, tests, review notes,
  and follow-up tasks.

After deciding, edit the active source policy or declaration that emits the
collider. Rely on behavior checks and generic declaration contracts; do not add
historical deletion records or full-scene snapshots for the removal itself.

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
npx playwright test playwright/immersive-stairs-roundtrip.spec.ts
npm run docs:check
npm run build
npm run smoke
```

For source-ID and runtime metadata changes, also run focused tests:

```bash
npx vitest run src/scene/level/__tests__/generateWalls.test.ts
npx vitest run src/scene/level/__tests__/generateFloorSurfaces.test.ts
npx playwright test playwright/immersive-stairs-roundtrip.spec.ts
```

## Immersive test taxonomy

Keep immersive Playwright assertions behavior-first unless a test is explicitly
about debug provenance, generator output, or debug-ID registry behavior:

1. **Behavior / interaction tests** should assert player-facing promises: the
   player can traverse intended routes, cannot occupy meaningful voids or
   blocked regions, and authored openings remain open. Prefer helpers such as
   `expectSamplesOccupiable(...)`, `expectSamplesBlocked(...)`,
   `expectNoBlockingCollidersAt(...)`, and `expectPathTraversable(...)` instead
   of pinning production collider names, short debug IDs, or exact generated
   bounds.
2. **Debug / provenance tests** should be narrow and visibly separate from
   behavior checks. Use source-ID helpers such as
   `expectSourceBackedColliderPresent(...)` and
   `expectSourceBackedSolidPresent(...)` when the contract is that authored
   source metadata remains discoverable through debug APIs.
3. **Generator tests** may assert exact bounds and geometry for tiny synthetic
   fixtures. Avoid exact production-scene collider or solid pinning unless it is
   a deliberate regression test with a comment explaining why that exact shape is
   part of the test's purpose.
4. **Registry / ID tests** may assert raw debug IDs only for source-backed
   declaration and visualizer API contracts. Stable IDs for stair and landing
   safety colliders live beside the active collider declarations that emit them;
   deleting or disabling a source declaration removes both the runtime collider
   and its debug ID without tombstones, negative historical assertions, or
   Playwright inventory edits. Do not use raw IDs to prove normal movement
   behavior; player-facing tests should describe the route, open area, blocked
   void, or source-backed feature instead.

Source-owned collider declarations should use the shared policy contract in
`src/scene/level/sourceCollision.ts` when they need stable runtime provenance.
Active policies carry intent, purpose, required runtime name, and optional debug
ID, while emitted source-backed colliders also preserve their source role; visual-only policies carry a concise no-collision rationale. For example,
the Futuroptimist media wall declares its wall-mounted visual media policy in
`src/scene/level/mediaWallPolicy.ts`, so its shelf, screen, and clearance
highlight remain rendered while no floor-level collider is emitted. Emitted
records should pass that source metadata through to runtime registration directly
rather than rebuilding source IDs, purposes, or debug IDs in `src/main.ts`.
Use `validateSourceCollisionPolicy(...)` and
`validateSourceCollisionRecords(...)` from
`src/scene/level/sourceCollisionValidation.ts` for focused family tests instead
of repeating one-off policy shape checks or snapshotting the full scene.

Production-coordinate regression tests should obtain canonical room or floor
bounds through the narrow production fixture helpers in
`src/tests/helpers/productionLevelFixtures.ts`. Request the semantic floor and
room IDs needed by the test, and keep exact geometry literals limited to small
synthetic fixtures where the generator output itself is under test.
