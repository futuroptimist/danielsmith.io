# Basement shell and stair graybox

The career museum is a declarative `careerMuseum` room on the `basement` floor,
with its walking surface at **-5 world units**. Its level bounds are X `[-16, 16]`,
Z `[-18, 8]`; only horizontal measurements are scaled by `FLOOR_PLAN_SCALE`.
The museum exhibits and furnishings are a separate content stage.

## Single connection source

[`BASEMENT_STAIR_CONNECTION`](../../src/scene/level/basementStair.ts) owns the
`basement-ground` connection. The shared
[builder](../../src/scene/structures/basementStaircase.ts) derives its treads,
landing, ground-floor cutouts, trim, rails, navigation zones, safety collider
identities, and the landing's visual cutaway from that descriptor. It reuses the
existing staircase constructor and movement controller.

The validated reservation remains level X `1.9`, width `2.4`, bottom Z `-14.65`,
positive-Z ascent to `-7`, and landing end `-4.4`. World coordinates are therefore
center X `3.8`, clear physical stair width `4.8`, bottom Z `-29.3`, top Z `-14`,
and landing end `-8.8`. The upper landing is entered from the west. The narrow gap
between the two parallel stair runs is not a circulation route.

The solid `living-room-slim-entry-console` was relocated from world `(3.2, -13)`
to `(-6.5, -10)`, retaining its `2.6 × 0.7` footprint and blocking policy. Its
former position occupied the new landing. No upstairs guard was moved or removed.
The nearby living-room wall segment stays at **80% opacity** while the avatar is
on or approaching this landing; its source-backed wall collider stays unchanged.
This keeps the avatar visible without moving the spawn or changing the fixed
camera orientation or initial framing. The wall restores on departure.
Its cloned material follows the shared wall's animated lightmap intensity while
keeping cutaway opacity, transparency, and depth-writing state independent.
The clone restores its original material settings on exit and is disposed once
on normal or interrupted scene teardown without disposing the shared wall material.

- The complete descending run is cut out of the ground slab; the shared landing
  top is exactly ground elevation
- Ground void rails prevent side/back entry; lower ramp parapets and visible
  landing supports prevent entering the landing from underneath
- All six safety colliders have positive area and rendered source-backed geometry
- Basement floor, structure, and POI groups are separate registry members. The
  unrelated upstairs connection is hidden in the basement
- The tabletop ground view uses the same stair opening; below-ground content is
  outside its ground-only presentation

## Rail surface seams

The ground-floor cutout includes the source-derived guard/trim footprints, so
the floor slab and brown trim cannot render the same long inner opening faces.
The final stepped parapets stop at the trim underside rather than extending
through the ground rails. Their safety colliders and continuous visible guard
coverage are unchanged; neither correction uses polygon offsets or depth bias.

[Surface audit tests](../../src/scene/structures/__tests__/meshSurfaceAudit.test.ts) cover the
two reported visual defects using actual generated stair and floor triangles.
Its reusable helper compares nearly coplanar, equally facing surfaces in world
space and clips the triangles to measure positive overlap area. It reports mesh
names, semantic source IDs, face indices, plane separation, and overlap area.
Fixtures cover transforms, indexed geometry, material groups, hidden ancestors,
near-plane tolerances, edge contacts, and ordinary perpendicular intersections.

This is a focused geometry check, not universal artifact detection. It does not
simulate occlusion, shader deformation, polygon offsets, instancing, or hardware
depth precision. Visual review must still inspect both rail junctions while in
the basement and the long trim from the ground landing, including small camera
movements that reveal shimmering. Revisit and leave the landing to check the
80% wall treatment, full-opacity restoration, and unchanged wall collision.

## Measured clearance

The avatar radius is `0.75` world units. Source calculations and dense live
occupancy grids measure avatar-center space after collision-radius expansion:

- Stair width: **3.3** units available, with a **3.1**-unit live-tested lane
- Lower-toe turn: **4.71** units between the extended museum boundary and rail toe;
  a **3 × 3**-unit turning pad is live-tested
- Ground landing turn: **3.85** units between rail ends and the living-room wall;
  a **3 × 3**-unit pad and **3 × 3** west-entry region are live-tested
- West circulation near spawn: **4.8** units between the existing portfolio
  exhibit and new rail; a **3.1**-unit lane is live-tested

The four planned exhibit footprints remain reserved at level centers `(-9, -9)`,
`(-9, 1)`, `(10, 1)`, and `(10, -10)`. Their future placement and furnishings still
require the museum stage's collision audit.

## Slow-frame movement safety

Runtime displacement is subdivided before the existing axis-separated collision,
connection-commit, and surface-height checks. Each substep is at most half the
avatar radius or half the narrowest connection transition margin, whichever is
smaller: **0.375 world units** for the current layout. Ordinary finite frame
travel is preserved. Work is capped at 64 substeps; extreme stalls discard excess
travel rather than increasing step size, tunneling through rails, or creating an
unbounded catch-up loop. Camera-relative controls and descent-intent rules stay
unchanged.

The regression uses the real speed and damping equation at 150, 160, and 350 ms
frame intervals, in both directions on both staircases. The original endpoint-only
path could skip the complete 1.2-unit descent trigger at 150/160 ms and remain on
the wrong floor above the stair void. Separate large-displacement attempts verify
that side rails and the landing support continue to block movement.

## Automated evidence and limits

[`immersive-basement-roundtrip.spec.ts`](../../playwright/immersive-basement-roundtrip.spec.ts)
uses the real axis-by-axis runtime movement path, never a teleport destination,
for its complete fresh-spawn journey and ten repeated basement round trips.
It visits all upper rooms and reverses the basement loop. Every dense step checks
floor/connection agreement, height bounds, floor visibility, and unrelated stair
visibility. Slow diagonal lips, stopped/reversed input, side/back attempts, live
clearance grids, and camera focus are covered.

Genuine browser keyboard and touch joystick round trips use an explicitly marked
start-only landing fixture. The actual crossings use real input. The separate
integrated route begins at fresh spawn. Coverage includes 1280×720, 1600×900,
390×844, 360×740, and 844×390 viewports, plus reduced motion. The original nine
upstairs cases remain enabled alongside keyboard and small-screen HUD suites.

```bash
npm run test:e2e -- playwright/immersive-basement-roundtrip.spec.ts \
  playwright/immersive-stairs-roundtrip.spec.ts \
  playwright/keyboard-traversal.spec.ts playwright/small-screen-hud.spec.ts \
  --workers=1 --retries=0 --trace=retain-on-failure
```

Named screenshots and JSON checkpoints are retained in traversal test artifacts.
The [floor diagram](../assets/floorplan-basement.svg) includes the connection.
No manual changes were made to the CI-owned launch screenshot.

The local environment uses software WebGL and Node 24 rather than CI Node 20.
Functional emulation is not hardware performance evidence or owner sign-off.
The owner walkthrough remains a distinct final human-review gate. The shell
alone does not close the basement milestone before museum content is integrated.
See the [performance history](performance/README.md) for raw measurement evidence.
