# Scene units and dimensional migration

Runtime physical dimensions use **one world unit per metre**, seconds for movement,
and radians for angles. `src/scene/units.ts` records the target avatar and room
clearance. The legacy scene does **not yet consistently satisfy this contract**.
Plan X/Z coordinates use `FLOOR_PLAN_SCALE` (approximately 2) exactly once; elevations
are already world coordinates. A plan conversion is not a physical metre conversion.
Never apply either transform again to generated meshes or colliders.

Run `npm run scale:audit` to measure the GLB and production furniture/installation
builders, including individual aquarium bucket instances. This is a read-only
inventory, not a claim that every legacy dimension passes a realism gate.

## Player normalization

The approved GLB bind bounds are X 0.93799978, Y 1.87200035, Z 0.40150003.
Its feet are within 0.000001 of zero. It was already approximately human-sized in
metres; the surrounding architecture made it look small. Treating the 6-unit walls
as 2.74 m instead would imply a player height of 0.85488 m, explaining the impression.
That interpretation cannot be applied globally: the aquarium water volume and
chair cushions are already authored in metres.

The runtime body is normalized from measured bounds to **1.90 m** with an outer
wrapper that authored animation tracks cannot overwrite. X and Z grow uniformly
by approximately 1.014957 (width 0.95203 m, depth 0.40751 m). No model binary changes.
The placeholder and recursive miniature player marker use measured bounds too;
the miniature's existing world-to-table transform remains separate.

Walking changes from 1.1 to **1.116453 m/s**; running from 2.5 to **2.537393 m/s**.
Stride reference speeds, transition thresholds, seated hip retreat and foot-origin
height use the same ratio. The collision radius remains 0.75 m: the normalized standing body fits inside it with margin.
This is deliberately a conservative navigation footprint, not shoulder width. Scaling that already-oversized envelope by 1.5% would consume existing tangent route clearances without improving body containment.
The existing 2.6 m stair exclusion envelope stays explicit until architectural
clearances and routes are migrated together. Reducing it with the visual height
would silently open routes beneath stairs. Camera focus is at half standing height;
the existing orthographic zoom constraints still limit the requested framing.

Running is the default. Caps Lock off selects run, on selects walk. Every reported
keyboard modifier state is observed, including repeat, keyup, UI-owned keys and
the first key after focus returns. Shift, letter case and keyboard layout do not
create additional modes. Browsers have no general API for querying the lock at
startup or focus alone: the first keyboard event supplies it. If modifier reporting
is absent, a guarded one-toggle-per-press fallback is used. The visible gait button
writes the same state for touch and accessibility; the next keyboard event restores
the physical lock state. Locomotion blends toward that selected clip; actual speed
controls idle and stride playback, including analog input and collisions.

## Measured legacy conflicts

All values below are current world units, not inferred physical measurements.

| Component                  | Measured/authored value                          | Conflict or disposition                                                     |
| -------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| Main walls                 | 6 high                                           | Target clear room height is 2.74 m; not migrated here                       |
| Basement walls             | 4.2 high                                         | Separate construction path must migrate too                                 |
| Ceiling slab               | centre 5.85, thickness 0.30                      | Underside 5.70; wall top and clear ceiling height are distinct              |
| Floor tops                 | basement -5, ground 0, upper 5                   | Must migrate with floor slabs and both stair controllers                    |
| Upper stair                | 9 rises of 0.51333, tread 1.70, width 6.20       | Cannot fix by changing wall height only                                     |
| Front/house-garage door    | width 6, height 3.5                              | Taller than the proposed room; includes sliding pocket and collider logic   |
| Garage opening             | width 14, height 4.8, minimum headroom 3.1       | Needs a separate residential garage contract                                |
| Existing parked EV         | 4.6 wide, 9.2 long                               | Oversized relative to metre-authored people/props                           |
| Lounge seats               | cushion 0.47                                     | Keep physical geometry and rotate anchors from actual transforms            |
| Reading chair              | cushion 0.62                                     | Keep explicit tall-seat compensation and foot IK                            |
| Aquarium water             | 1.83 × 0.61 × 0.509                              | Approximately 568 L / 150 US gal; already metre-authored                    |
| Bucket shells              | nominal diameter 0.34, height 0.37               | Already plausible 5-gallon containers; faceted X bounds are 0.32336         |
| Aquarium collider envelope | three local solid blocks; declared POI 6.4 × 2.4 | Do not confuse marker/installation envelope with tank volume                |
| Workshop benches           | top around 1.71, installation 3.70 high          | Too tall for ordinary benches and the target ceiling                        |
| Workshop machines          | band saw 3.50, drill press 3.20 high             | Must resize with their source-backed collision boxes                        |
| Kitchen west counter       | 1.52 high                                        | Furniture is mixed-scale, not uniformly oversized                           |
| Kitchen island             | approximately 1.04 high                          | Much closer to physical scale; assess independently                         |
| Portfolio table            | 4.35 × 3.9, tabletop 1.32                        | Declared reference 1.4 × 0.9 × 1.25 has nonuniform ratios                   |
| Reaper display             | derived from wall height and cove offset         | Installation reach and collider footprint depend on architectural migration |

The house footprint is approximately 64 × 64 world units. Halving all world
geometry would also halve already-correct seats, tank volume dimensions, buckets
and the avatar. Changing only `FLOOR_PLAN_SCALE` moves plan-anchored objects but
leaves world-authored furnishings and colliders behind. Neither is a safe fix.

## Dependency-aware split

1. **Units audit and player/input foundation (this change):** establish the metre
   contract, normalize the player, scale movement/stride/seating consistently,
   preserve the conservative traversal envelope and normalize the miniature marker.
   Keep existing routes and dimensional evidence reproducible.
2. **House structure and navigation:** migrate plan positions, room clear height,
   floor-top/slab elevations, doors/pockets, both stair flights, openings, guards,
   roofs/ceilings, LED strips, camera bounds and source-backed colliders atomically.
   Place the ceiling underside at 2.74 m, then derive its top and next floor from
   slab thickness. Choose stair rise/count/run against the available footprint;
   do not retain nine half-metre risers. Require grounded traversal through every
   door and both stairs in both directions before accepting new clearances.
3. **Furnishings and installations, on the structural branch:** classify each
   asset as metre-authored or legacy before transforming it. Migrate oversized
   counters, benches, machines and table with their interactions, anchors, POI
   envelopes, debug metadata and colliders. Preserve tank/bucket physical sizes.
   Revalidate all three chairs, blocked exits, camera occlusion, reduced motion,
   quality tiers and recursive snapshots. Do not release the structural migration
   alone with floating/tall furnishings.
4. **Exterior and future neighborhood, after the shared contract:** migrate the
   existing yard, garage, EV, fences, landscaping and street navigation together.
   New neighborhood construction must consume the completed metre contract rather
   than copy legacy dimensions. Preserve intentional architectural models and
   display enlargements as named, documented transforms with matching proxies.

Steps 2 and 3 can be reviewed as stacked PRs but form one release unit. Staging and
production remain unchanged until the owner approves the combined verified result.
The expanded room/world correction remains outstanding; this foundation must not
be presented as a completed scene-wide scale migration.
