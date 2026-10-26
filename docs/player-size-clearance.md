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

The source changes are not ready for merge. The enlarged player exposes a concrete
furnished-doorway conflict: the upper landing bench ends at z = -21.4167568262,
while the adjacent doorway wall begins at z = -19.3555941291. Their 2.0611626971 m
gap is 0.1888373029 m narrower than the 2.25 m collision diameter. The focused
`playerFurnishedDoorways` regression intentionally remains failing at that opening.
The other three upper doorway centers pass with actual furniture colliders.

A 0.34 m southward bench move would leave approximately 0.151 m total diameter
margin, but furniture relocation is outside the current fixed-layout scope and
has not been applied. The full browser journey confirms the same obstruction
after successfully traversing the basement and climbing to the upper floor.

Existing browser fixtures also need current-radius approach samples and final
qualification. Passing unit geometry checks alone do not establish complete house
traversability. Hardware acceptance, final-head CI and reviewer feedback remain
required. No deployment, release or neighborhood activation is implied.

Local checkpoint (before review qualification): full unit suite 2,259 passed,
14 failed. One failure is the new furnished-doorway acceptance regression; the
other 13 are Windows Python-script execution and symlink limitations. The scoped
browser run completed 87 passed / 15 failed, so traversal is not qualified.
Typecheck, lint, documentation/release checks, static build smoke and miniature
manifest validation passed. Browser failures beyond the confirmed bench conflict
still require fixture/current-radius triage and rechecks; no FPS claim is made.
