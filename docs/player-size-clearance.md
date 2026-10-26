# Player size and movement clearance

This is a temporary playability adjustment. Body dimensions and translation speed
increase together so house travel is faster without another increase in gait-cycle
playback. A future reconciliation of realistic body height, house footprint and
furniture layout is separate work.

Baseline: `6345ce07cab168c94b9b65bf397bb7533290c679`.

| Quantity                                |      Baseline |       Revised |
| --------------------------------------- | ------------: | ------------: |
| Standing height (m)                     |          1.90 |          2.85 |
| Collision radius (m)                    |          0.75 |         1.125 |
| Conservative traversal height (m)       |          2.60 |          3.90 |
| Walking speed (m/s)                     | 1.11645299145 | 1.67467948718 |
| Running speed (m/s)                     | 4.26282051282 | 6.39423076923 |
| Standard door clear height (m)          |          2.10 |          3.15 |
| Garage vehicle door height (m)          |          2.40 |          3.60 |
| Room clear height (m)                   |          2.74 |          4.11 |
| Storey height including 0.30 m slab (m) |          3.04 |          4.41 |
| Stair rise, 18 steps (m)                | 0.16888888889 |         0.245 |
| Stair tread run / width (m)             |   0.28 / 2.40 |   0.28 / 2.40 |

The previous running-speed increase is already included in the baseline. The
walk/run animation playback ratios remain `1.1 / 0.85446` and `4.2 / 1.57199`.
The actual GLB is uniformly normalized on all axes and grounded before animation;
seated hip/foot offsets follow that normalization. Camera focus follows half the
new standing height. Basement/upper elevations, stair landings and floor-relative
fixtures derive from the same storey constants. The bus shelter's vertical parts
and sign scale by 1.5 while its horizontal anchor, roof footprint and solid
footprints remain unchanged.

## Clearance corrections

Authored standard door widths remain 2.40 m. Ordinary trim previously intruded into
that aperture, leaving 1.64 m visible clearance; trim now sits on the wall side of
the opening. Wall seam overlap also consumed 0.125 m per side, leaving 2.15 m of
collision clearance. Both legacy and declarative generators now stop overlap at
source doorway edges, while retaining overlap at wall joins. Rendered walls and
colliders share the corrected dimensions. The resulting diameter margin is
0.15 m total, not 0.15 m per side.

The stair descent region describes player centers. Its former minimum width of
55% of the stair half-width could admit an overhanging capsule and generated an
invalid upper void guard with the larger radius. Admission now honors the full
radius inset, leaving a 0.15 m center corridor on the unchanged 2.40 m stair.
Void guards remain present; collision checks are not bypassed.

Museum approach samples must stand outside each unchanged exhibit footprint plus
the current radius. This changes test walking targets, not exhibit positions or
collision envelopes. Hardware feel, camera occlusion and the tight stair corridor
still require human acceptance after automated traversal qualification.

## Review-only neighborhood dependency

The previously captured neighborhood images and measurements remain historical
review artifacts. The larger player does not qualify their old two-abreast lot
approaches and synthetic fence openings. Regression tests preserve single-file
qualification and explicitly reject the old passing-lane assumptions. No runtime
neighborhood activation or horizontal redesign is included. Home connection,
whole-layout query budgets and neighborhood runtime qualification remain separate
gates; this change does not claim those gates are complete.

## Qualification status

The source changes are not ready for merge. The upper landing bench now moves
0.34 m south with its visible and collision footprint. The doorway approach gap
increases from 2.0611626971 m to 2.4011626971 m, leaving 0.1511626971 m total
margin for the 2.25 m capsule. Its south-wall gap remains about 0.070 m.
The existing slight west-wall contact remains; no additional furniture or wall
contact is introduced. Regression coverage checks visible/collider alignment,
the full center crossing, and rejection of the previous bench position.

The integrated journey still exposes library approach obstructions. The sectional
leaves about 1.579 m between its south edge and the doorway wall; the round table
and reading lamp leave about 1.994 m diagonally. Both are below the 2.25 m capsule
diameter. These furniture positions remain unchanged pending a bounded layout
correction. Doorway-center checks alone do not establish room accessibility.

The basement suite passes ten consecutive round trips, coarse-frame handoffs,
side/back rail rejection, native keyboard/touch traversal and radius-adjusted
circulation samples. Stair/door test samples use the current full radius; collision
envelopes and pass/fail thresholds remain intact. Final browser qualification,
final-head CI, reviewer feedback and hardware acceptance remain outstanding.

The exact baseline commit reproduces all 13 local Windows failures in Python
script execution and symlink creation (47 tests passed in those three files).
They are distinct from the new traversal failures. No FPS, complete house
traversability, deployment or neighborhood activation is claimed.

The unchanged chair controller requires its authored front approach to be clear.
All three current source-derived approaches fail live full-radius occupancy:
the north lounge chair meets the west wall/pothos, the east lounge chair meets
the floor lamp, and the reading chair meets its side table. Seating therefore
remains unqualified; no alternate-approach runtime behavior is included in this
checkpoint. Enlarging or ignoring collision envelopes is not a proposed remedy.

Current local checkpoint: 2,261 unit tests pass; the 13 remaining failures match
the exact Windows baseline. Furniture checks pass 64/64. Typecheck, lint,
formatting, documentation/release checks, miniature manifest and static smoke
pass. The collider redundancy gate inspects 272 colliders with no failures and
117 warnings. Performance diagnostics pass four tests, with one software-renderer
skip; this is not a hardware frame-rate acceptance result. Full traversal remains
blocked by the library and chair approaches described above.

## Off-axis access and usability

The production-wall regression samples all 13 authored openings in both
directions, with 0.025 m spacing: centered, 0.05 m lateral offsets, and
centered +/-10 degree approaches. These geometric checks pass with the full
1.125 m radius. They do not establish arbitrary-angle usability. At a 2.40 m
opening, combining a 10 degree approach and 0.05 m lateral error collides.
For a circular capsule crossing a 0.50 m-thick wall on a straight line, the
minimum geometric aperture is
`2 * 1.125 / cos(10 degrees) + 0.50 * tan(10 degrees) + 2 * 0.05`,
or 2.4728733671 m: about 0.073 m wider than the current opening. This is a
wall-only lower bound, not a verified whole-scene widening recommendation.
No doorway width has changed.

Native keyboard maximum-speed checks pass from both directions at all three
exterior doors with 0.05 m offsets, including reduced-motion variants (12 tests).
The phone joystick round trip also passes with a nonzero approach offset.
Eight additional gamepad tests distinguish a closed automatic door from a
naturally preopened door. They derive the stick direction from the actual
camera pose, use real input and controller collisions, and retain motion/door
state JSON even on failure. Their initial placement does not cross a wall;
the preopened comparison moves sideways through the actual collision controller.

The four preopened-front-door cases pass at +/-10 degrees, across walking and
running and both directions. The four closed-door cases fail: their initial
motion follows the intended line, but the panel is still closed at first
contact. The player slides sideways until entering the narrow approach lane,
then the opened door leaves the displaced player against a jamb. Live blocking
metadata identifies `ground.living_room.east_wall`. The automatic controller
tests only the imminent movement segment against the aperture's center lane,
now just 0.15 m wide. This is an unresolved practical approach regression;
centered passability must not be reported as comfortable access. The same four closed-door tests pass against the exact baseline commit
`6345ce07cab168c94b9b65bf397bb7533290c679`, confirming a regression. The failing
acceptance tests remain enabled. No sensor, collision or movement behavior was
changed to make this checkpoint pass.

CI on implementation checkpoint `74b8131d147803e22dbeb21226fbe7f96e58a251`
passes all 2,274 unit tests, the miniature guard, collider redundancy gate,
performance diagnostics and smoke. The full local browser run on that checkpoint
passes 136 of 142 tests; three library and three seating journeys remain blocked.
The off-axis tests above are additional qualification, not included in that count.
Codex and Greptile found no additional blocking issue at that checkpoint;
Copilot's optional shared wall-seam-helper extraction is deferred while access
defects remain unresolved. Final-head CI/reviews and post-ready reviews remain
required before handoff as ready.

The test-only extension passes 2,262 local unit tests, with the same 13 reproduced
Windows baseline failures. All 14 production-wall clearance cases pass. Typecheck,
lint, targeted formatting, documentation/release checks and build/static smoke pass.
