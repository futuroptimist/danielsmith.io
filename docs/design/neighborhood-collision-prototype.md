# Rectangular neighborhood feasibility prototype

Status: unreleased, isolated test tooling; no neighborhood runtime activation.
This implements the first feasibility gate in the
[neighborhood design](neighborhood-expansion.md#collision-accessibility-and-regression-acceptance).
It does not finalize a parcel, stop anchor, street graph or lot layout. The existing
exterior metric audit and footprint migration own accepted site geometry. A later
protected-parcel fixture must consume their integrated results, not these synthetic
coordinates. The original house/garage remains the only enterable home; the existing
adjacent bus stop and all live scene dimensions, gameplay and loading remain unchanged.

## Isolation and method

All executable additions are in `src/tests/prototypes/`, with regression cases in its
`__tests__` directory. They use the current `RectCollider`, `SourceBackedCollider`,
`createNavMesh`, collision predicate and movement-subdivision helper. No production
entry point imports this tooling. There are no engine, polygon-support, dependency,
package-script or release-version changes. The repository's
[test/tooling exclusion](../ops/versioning.md) applies to these paths; verify it with
`npm run release:check -- --base origin/main` rather than assuming an exemption.

The deterministic grid emits horizontal runs of axis-aligned cells. Each piece keeps
its synthetic source ID and stable source/role/index piece ID. Walkable cells are
accepted only when the entire rectangle supports the 0.75 m actor disk within an
annular sector: nearest-point radius checks cover the concave inner edge, farthest
corners cover the outer edge, and half-plane checks cover the sector ends. Runs share
a 1 mm overlap; the test verifies a single connected union as well as actual movement
across row seams in both directions.

For rotated closed frontages and fences, an offline separating-axis intersection test
selects every cell touched by the physical rectangle. Its full extent is retained as
an ordinary `RectCollider`. This covers the solid continuously; it does not add a new
collision primitive. The maximum overcoverage is bounded by a cell's diagonal including
overlap. Tests additionally sample physical interiors/corners across rotations and
attempt movement through thin barriers using the existing substep planner. Short-frame
cases run until they reach the barrier; long frames include the 64-substep truncation.
The driver's X-then-Z order matches the live scene. Its radius/2 step ceiling is the
live upper bound; actual stair-aware subdivision can only be smaller.

The intersection and protected-stop approach are synthetic corridors. Their center
zones are inset by actor radius. The fixture preserves a 3.8 m physical corridor and
traverses its join, intersection, diagonal and approach. It is not a replacement or
audit of the actual bus stop. Sector endcaps are actor-eroded independently: final
curved-to-straight joins are **not** qualified by this prototype and require union-level
clearance tests when accepted layout data exists.

## Measured evidence and proposed limits

The [machine-readable report](../qa/performance/neighborhood-collision-prototype.json)
records the accepted base, prototype source hashes, environment, all three timing
attempt summaries and the opening-width sweep. The
[read-only overlay](../assets/neighborhood-collision-prototype.svg) shows physical
surfaces, collision rectangles and actor footprints. It is a synthetic diagnostic,
not a concept revision or a proposed world layout.

Measurements used Windows x64, Node 18.17.1 and an i9-13900K host. These are standalone
CPU probe results, **not** a tablet, browser frame-time or hardware qualification claim.
Each size receives 100 warmup batches, then three attempts of 300 measured batches.
Each batch runs 128 collision and navigation queries, representing both axis candidates
for the capped 64-substep long frame. All queries deliberately miss and scan every
candidate; the 32-collider case is a same-method baseline, not the live-house baseline.

| Geometry measurement                              | Result                                            |
| ------------------------------------------------- | ------------------------------------------------- |
| Selected grid / seam overlap                      | 0.125 m / 0.001 m                                 |
| Inner curve                                       | 6.0 m physical width; 154 walkable rectangles     |
| Guaranteed interior radial actor-center strip     | 4.141 m, excluding sector endcaps                 |
| Rotated frontage plus fence fixture               | 204 solid rectangles                              |
| Measured frontage boundary deviation              | 0.1773 m or less                                  |
| Measured fence boundary deviation                 | 0.1777 m or less                                  |
| Analytical maximum boundary deviation             | 0.1797 m or less                                  |
| 3.8 m authored fence opening, tested orientations | At least 3.4678 m guaranteed physical clear strip |
| Corresponding full actor-center strip             | At least 1.9678 m after both 0.75 m radii         |

Clear width is computed by projecting every emitted solid corner onto the opening
axis. The remaining strip is unobstructed across the entire fence depth, so it is a
conservative physical width, not a point-containment proxy. Two actors on parallel
lanes also cross the gap in both directions. The 0.25 m pilot grid reduced the worst
tested 3.8 m opening to 3.1341 m; the finer grid recovers useful clearance. An authored
3.0 m opening is not automatically a 3.0 m collision-clear opening: the width sweep
retains these failures instead of declaring all nominally wide gaps feasible.
Independently of the sampled rotations, the cell-diagonal proof gives a conservative
3.4406 m strip for a 3.8 m parallel opening when generation stays within its caps:
subtract at most one 0.1797 m deviation on each side. This does not establish clearance
at unrelated corners or at joins to a future site layout.

| Collision / navigation candidates    | Observed batch p95 range, three attempts |
| ------------------------------------ | ---------------------------------------- |
| 32 / 16 baseline                     | 0.097-0.102 ms                           |
| 128 / 64                             | 0.256-0.273 ms                           |
| 256 / 128                            | 0.484-0.624 ms                           |
| 512 / 256                            | 0.947-0.990 ms                           |
| 1,024 / 512                          | 1.895-1.969 ms                           |
| 2,048 / 1,024 bounded stress maximum | 3.769-4.063 ms                           |

Recommended **review targets**, not accepted runtime budgets:

- Keep the 0.125 m grid, 1 mm seam overlap and <=0.18 m boundary-deviation ceiling.
  Generation fails closed above 262,144 candidate cells or 512 emitted rectangles per
  source. These are preprocessing bounds; reaching one is not permission to enlarge it.
- Use <=512 solid candidates and <=256 walkable rectangles per occupancy query for the
  next synthetic slice. The present fixture fits; this says nothing about 24 full lots.
  At that cap, propose <=1.1 ms p95 and <=1.3 ms p99 for this exact host probe. Observed
  p99 was <=1.182 ms. The 1,024+ cases exceed the proposed p95 ceiling; do not adopt them
  without a separately measured candidate-reduction strategy.
- The live scene must still meet the design's matched <=10% frame regression gate and
  real low-end qualification. The standalone CPU ceiling does not establish either.
- Preserve at least 3.0 m physical clear width **plus the separately agreed collision
  allowance**. That allowance was not provided with this slice. A 0.20 m total allowance
  is proposed for review; it is not recorded as approved. The measured 3.8 m fixtures
  support up to 0.4678 m above the 3.0 m minimum in the tested orientations. Acceptance
  remains conditional on the agreed value and equivalent proofs at every final corner.

These results support continued rectangular feasibility for the tested synthetic
fixtures. They do not qualify arbitrary curves or approve final placements. If accepted
geometry cannot preserve the required physical strip within the deviation/count/CPU
limits, stop and propose a separate capability change rather than narrowing the route.

## Reproduce and review

From the repository root, using existing locked dependencies:

```bash
npx vitest run src/tests/prototypes/__tests__/rectangularNeighborhood.test.ts
npx tsx src/tests/prototypes/measureNeighborhood.ts /absolute/review-output-directory
npm run release:check -- --base origin/main
```

The measurement command writes only `report.json` and `overlay.svg` to the explicit
output directory. It does not launch the app, update layouts or contact a provider.
Keep timing reruns separate; record source hashes and environment rather than pooling
different grids or machines. Inspect the overlay alongside numeric results. Full house,
garage, stair, avatar, navigation and traversal regressions remain required CI gates;
these fixtures do not replace them.

The later 24-lot graybox, kit/foliage, LOD/instancing, scene activation and hardware
qualification remain separate scopes. Jumping, hiking, fast travel, a second bus stop,
EV resizing, deployment and release publication are not included.
