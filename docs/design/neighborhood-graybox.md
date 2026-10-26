# Scaled neighborhood graybox review

This is an offline layout proposal, not a visible live neighborhood. The normal
scene, production entrypoints, engine, dependencies and release versions are unchanged.
The [neighborhood design](neighborhood-expansion.md) remains the broader proposal;
this slice supplies review geometry and measurements, not rendering integration.

## Drawings and evidence

- [Scaled overhead plan](../assets/neighborhood-graybox-overhead.svg)
- [Isometric massing](../assets/neighborhood-graybox-isometric.svg)
- [Measurement JSON](../qa/performance/neighborhood-graybox.json)
- [Review source](../../src/tests/prototypes/neighborhoodGraybox.ts)
- [Capture tool](../../src/tests/prototypes/measureGraybox.ts)
- [Exterior mesh model](../../src/tests/prototypes/grayboxMassing.ts)

The drawings show 24 uniquely labeled lots, six frontages on each side of each
of two parallel residential runs. Two rounded walking loops share a cross street;
end crossings connect the outer sidewalks and the existing home-side sidewalk.
All new houses are closed simple masses with pitched roof silhouettes. Twelve
frontages have fences with 3.8 m authored openings. This is not the final asset kit:
windows, mailboxes, planting, lighting, LOD and street-surface integration remain
outside this review slice.

Pale blue shows the protected ground parcel, including yards and circulation.
Dark blue shows the projected built house and attached garage, including the
upper-floor overhang. These are deliberately different shapes. The gold bus-stop
overlay comes from the actual exterior builder's measured assembly bounds, not
its semantic anchor. House/garage/yard/driveway preservation uses the conservative
union of existing ground rooms; all candidate parcels stay outside that envelope.
The existing exterior audit is reused without modification.

The built reference unions the current ground and upper interior room bounds
and their actual generated wall bounds, in world coordinates. It excludes the
underground basement, yard, driveway, sidewalk, street and fences; it neither
uses the protected polygon as a building nor sums overlapping storey areas.
Ground rooms occupy 1,752 m²; the above-ground room projection is 2,016 m².
Including wall geometry gives **2,100.18 m²**, within a **58.73 by 43.43 m**
bounding box. The upper focus-pod room projects beyond the ground rooms and must
not be lost when deriving this reference.

Each neighbor is an exterior-only, equal-area rectangular shell based on that
built reference's aspect ratio, with six modest width/depth variants. Their
footprints are **2,013.65–2,227.87 m²**, or **95.88–106.08%** of the built union.
Tests require every area within 90–110% and each horizontal dimension within
85–115% of the actual built bounds. Room layouts and interior assets are absent.

`FLOOR_PLAN_SCALE` is imported from the current source. No historical scale or
copied bus-stop mesh coordinate is authoritative here. New proposal dimensions
are world metres: 18 m curve radii and 6 m walking surfaces. Parcels and frontage
spacing derive from the largest variant plus explicit setbacks: approximately
68.49 by 51.77 m parcels and 57.77 m frontage spacing. The loops and parallel
street corridors expand with those parcels; their arrangement stays the same.
The full review extent is about 352.21 by 465.19 m. Existing source positions are scaled
once; builder-local world dimensions are never rescaled. The isometric drawing
projects the same polygon coordinates and shows a projected 20 m scale bar.

## Measurement interpretation

**The new loops connect to each other, but the home connection is blocked.** The
current `ground.sidewalk.end0` and `ground.sidewalk.end1` walls obstruct both
existing-sidewalk exits. They remain in the query arrays and appear red in the
drawings. The JSON reports both approach traversals as failed. Opening these
artificial boundary gates would need a separate source-layout review and home
regressions; this proposal neither removes them nor claims integrated traversal.

The complete arrays passed to the review queries contain **12,297 solid rectangles**
and **1,293 navigation rectangles**. Solids comprise 7,616 house pieces, 4,632 fence
pieces, 14 existing exterior solids and 35 existing ground walls. Navigation
comprises 1,236 curved pieces, 36 straight pieces and 21 existing ground zones.
The merged rectangular feasibility decomposition is reused unchanged. Its local
piece limits do not bound these combined arrays.

The proposed 256/256 query targets therefore fail for this representation. The
0.20 m additional clearance target and query counts remain provisional, not
accepted production limits. No broadphase, engine extension, limit increase or
runtime activation is included. Any production optimization is a separately
reviewed prerequisite; these drawings are not authorization to place final lots.

The JSON records all route outcomes, source hashes, exact arrays' counts, opening
widths, boundary deviation and three raw CPU timing attempts. CPU batches perform
128 collision and 128 navigation misses against the complete arrays to force
full scans. This is an offline stress measurement on the recorded Windows/Node
host, not a frame-time, mobile, renderer or low-end hardware qualification.

Both loops are checked in both directions using current avatar radius and run
speed, existing movement subdivision and X-then-Z occupancy. Additional passing
lanes use offsets of +/-0.85 m, sparse diagonal curve samples and 250 ms frames
to exercise subdivision. The shared cross street, every door approach and the
preserved sidewalk's north/south approaches are separately measured. The tests
also demonstrate rejection of an obstructed join and missing navigation.

Fence clear strips are measured over every emitted rectangle, not at their
centres. The authored 3.8 m openings retain approximately 3.623 m physical width
and 2.123 m actor-centre width. The conservative curve physical strip is about
5.641 m. These are distinct from the avatar's existing 0.75 m radius and the
provisional extra clearance proposal.

The arrays include existing ground walls/nav and exterior solids, but are not a
complete live capture of dynamic doors, furniture or stair guards. Original-house
interior traversal, camera framing, visual kit acceptance, actual rendering costs
and low-end hardware remain unqualified. No new geometry is imported by the app.

## Exterior rendering model and remaining performance gates

The offline Three.js model builds closed exterior shells with **16 triangles per
house**, or **384 for all 24 houses**, independent of footprint scale. Scaling the
same mesh changes vertex positions, not topology. It contains no rooms, stairs,
furniture, interior floors, windows or textures. The SVG massing uses the same
footprint and wall/roof height proportions. Tests verify closed topology, outward
winding, footprint comparability and complete overhead/isometric framing.

Counting actual geometry buffers and instances yields **2,188 proposed triangles**:
384 house, 288 fence, 72 straight-walkway, 1,440 curved-walkway and 4 street triangles.
There are four shared geometries, five materials and no textures. An all-visible,
single-base-pass instancing scenario has five batches; separate meshes would need
94 calls. This is a CPU-created review model, not measured renderer.info output or
an implemented production optimization. Shadows, additional passes and per-lot
culling are not modeled.

| Source budget        | Static-baseline scenario                      |
| -------------------- | --------------------------------------------- |
| 150 draw calls       | 119 instanced; 208 unbatched (exceeds budget) |
| 50,000 triangles     | 32,000 + 2,188 = 34,188                       |
| 125 geometries       | 86 + 4 = 90 shared buffers                    |
| 32 textures          | 19 + 0 = 19                                   |
| 36 materials         | General baseline 28 + 5 = 33                  |
| 24 MiB texture bytes | General baseline remains 18 MiB               |
| 80 ms p95 frame time | Unqualified; no live frame measurement        |

These values import the existing budget and static baseline definitions from
`src/assets/performance.ts`; they do not replace a live integrated capture.
The larger neighborhood covers about 163,844 m² of bounding area and 50,855 m² of
house footprint. Larger visible surfaces can increase fragment work and shadows
even with fixed triangle counts. A global instance batch can submit every house
when any part of its bounds is visible. Camera routes, visibility, LOD, lighting,
shadow passes, texture memory and target-device frame timing still need independent
qualification. The substantially larger collider arrays remain a separate failure
of the provisional query targets. No FPS or production-readiness claim follows.

## Reproduction

Use the repository's existing dependencies; no package or script changes are needed:

```sh
npx --no-install vitest run src/tests/prototypes/__tests__/neighborhoodGraybox.test.ts
npx --no-install tsx src/tests/prototypes/measureGraybox.ts /absolute/review-output
```

The capture tool requires a clean repository and an explicit output directory.
It writes only the JSON and two SVGs there. It substitutes a null canvas context while running the actual
exterior builders, matching the existing geometry audit tests; sign paint is
omitted, geometry is measured. Capture provenance records the checked-out commit,
working-tree state and input hashes before building or measuring. It verifies the
same identity again after generating the measurements and drawings, and rejects
any intervening change before writing output. A source commit followed by a separate
artifact commit avoids circular capture identities. Inspect the JSON's dirty
state and hashes before treating a capture as evidence for a later revision.
