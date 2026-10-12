# Scene units and dimensional migration

Runtime physical dimensions use **one world unit per metre**, seconds for movement,
and radians for angles. `src/scene/units.ts` records the target avatar and room
clearance. The room assemblies and player follow this contract; the exterior layout retains legacy spacing.
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

Walking is **1.116453 m/s** (1.1 before body scaling); running is **3.044872 m/s**
(3.0 before body scaling), a 20% increase over the previous run pace.
Stride reference speeds, transition thresholds, seated hip retreat and foot-origin
height use the same ratio. The collision radius remains 0.75 m: the normalized standing body fits inside it with margin.
This is deliberately a conservative navigation footprint, not shoulder width. Scaling that already-oversized envelope by 1.5% would consume existing tangent route clearances without improving body containment.
The 2.6 m stair exclusion envelope remains a conservative navigation constraint,
independent of standing body height. Reducing it with visual height would silently
open routes beneath stairs. Camera focus is at half standing height;
the existing orthographic zoom constraints still limit the requested framing.

Running is the default. Caps Lock off selects run, on selects walk. Every reported
keyboard modifier state is observed, including repeat, keyup, UI-owned keys and
the first key after focus returns. Shift, letter case and keyboard layout do not
create additional modes. Browsers have no general API for querying the lock at
startup or focus alone: the first keyboard event supplies it. If modifier reporting
is absent, a guarded one-toggle-per-press fallback is used. The visible gait button
writes the same state for touch and accessibility. The keyup completing an Enter
button activation preserves that choice; subsequent keyboard input restores the
physical lock state. Locomotion blends toward that selected clip; actual speed
controls idle and stride playback, including analog input and collisions.

## Coordinated room dimensions

The vertical room assembly is 2.74 m clear plus a 0.30 m slab, giving 3.04 m
between finished floors. Basement, ground and upper floor tops are -3.04, 0 and
3.04 m. Each ceiling underside follows its floor; staircase apertures remain open.
The previous runtime ceiling was centred at 5.85 with **0.32 m** thickness, so its
underside was 5.69 m (the old factory default of 0.30 was not the runtime override).

| Assembly                        | Before                                            | Current                                             |
| ------------------------------- | ------------------------------------------------- | --------------------------------------------------- |
| Ground and upper walls          | 6 m                                               | 2.74 m                                              |
| Basement walls                  | 4.2 m                                             | 2.74 m                                              |
| Floor-to-floor height           | 5 m                                               | 3.04 m                                              |
| Upper stair                     | 9 rises, 0.51333 m rise, 1.70 m run, 6.20 m width | 18 rises, 0.168889 m rise, 0.28 m run, 2.40 m width |
| Basement stair                  | 9 rises, 1.70 m run, 4.80 m width                 | 18 rises, 0.168889 m rise, 0.28 m run, 2.40 m width |
| Front and house/garage doors    | 6 x 3.5 m                                         | 2.4 x 2.1 m                                         |
| Garage opening                  | 14 x 4.8 m; 3.1 m clearance gate                  | 5 x 2.4 m; 2.05 m clearance gate                    |
| Ordinary room openings          | 8 m wide                                          | 2.4 m wide                                          |
| Workshop bench surface          | about 1.71 m                                      | about 0.855 m                                       |
| Workshop band saw / drill press | 3.50 / 3.20 m                                     | 1.75 / 1.60 m                                       |
| Miniature table top             | 4.35 x 3.90 m; centre 1.32 m                      | 1.40 x 0.90 m; finished surface 1.25 m              |
| Selfie mirror frame             | 3.40 x 4.10 m                                     | 1.70 x 2.05 m                                       |

The upper flight ends at z=-21.8. Its 9.3 m level corridor connects the existing
west rooms while retaining the ground crossing at z=-23 with 2.74 m underside
clearance. Keeping the former flight endpoint with normal treads would put that
crossing under low steps. The basement flight ends at z=-14 and its lower end is
z=-19.04. Both final treads meet their landing slab tops exactly.

The 0.75 m collision radius is preserved. A 0.9 m single doorway could not pass
that conservative footprint, so room and sliding entries use generous 2.4 m
openings. Stair void exclusions retain the 2.6 m conservative traversal envelope;
the overhead garage gate uses the actual 1.90 m body plus 0.15 m clearance. Guards
must distinguish player-centre corridors from physical edges and add the radius
only once. Door pockets, trim, wall apertures and moving panels share definitions.

Wall art is resized and remounted below the new ceiling, with the rocket frame
above its 1.43 m dresser. The mirror frame is 2.05 m high above its 0.32 m base,
so its measured top is 2.37 m. The Reaper display follows available wall clearance; its
arm finishes fine aim at firing so the closer display does not amplify tracking
lag. Workshop local geometry and colliders use the same named 0.5 conversion.
Table dimensions are authored directly because the former width/depth ratios did
not match its declared physical reference. The world-to-table transform and player
marker follow the new bed dimensions without applying another metre conversion.

Museum stands and furniture use a uniform 0.6 body scale: exhibit tables are
0.87 m high, the tallest dioramas and gallery art fit below 2.74 m, and collider
footprints shrink with the visible solids. Their interaction anchors remain
0.75 m above the floor, 0.90 m beyond the stand edge. The media wall scales by
0.6 around its mounting point (top 4.25 to 2.55 m); Gitshelves scales by 0.65,
including signage, with its collision footprint measured from the resulting body.
These adjustments apply to museum dioramas, not the metre-authored Aquiloop.

## Preserved metre-authored assets

Aquarium water remains 1.83 x 0.61 x 0.509 m (about 568 litres / 150 US gallons).
Bucket shells remain nominally 0.34 m diameter by 0.37 m tall; faceted X bounds are
0.32336 m. Lounge cushions remain 0.47 m and the tall reading chair 0.62 m, retaining
seat alignment and foot IK. The kitchen counter's 1.52 m overall bound includes
its backsplash; its actual worktop is about 1.02 m, and the island is about 1.04 m.
These assets must not be halved to compensate for oversized architecture.

The standing player remains 1.90 m after normalization from its measured 1.872 m
bind pose. Walk/run remain 1.116453 / 3.044872 m/s, with proportional stride and seat
offsets. The orthographic camera retains its framing bounds and 0.95 m focus.

## Remaining exterior scope

The property X/Z footprint remains approximately 64 x 64 world units. Plan
coordinates still convert once through `FLOOR_PLAN_SCALE` (approximately 2).
Changing that factor alone would move plan-anchored objects while leaving physical
furnishings and colliders behind; a global scene scale would shrink the player,
chairs and aquarium too. Exterior layout, the existing 4.6 x 9.2 m EV envelope,
yard, street and future neighbourhood need their own coordinated horizontal
migration. Existing exterior routes must continue to pass during this room change.
This room correction is not a claim that the entire property is metre-calibrated.
