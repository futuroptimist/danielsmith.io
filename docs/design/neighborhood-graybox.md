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

The drawings show 24 uniquely labeled lots, six frontages on each side of each
of two parallel residential runs. Two rounded walking loops share a cross street;
end crossings connect the outer sidewalks and the existing home-side sidewalk.
All new houses are closed simple masses with pitched roof silhouettes. Twelve
frontages have fences with 3.8 m authored openings. This is not the final asset kit:
windows, mailboxes, planting, lighting, LOD and street-surface integration remain
outside this review slice.

Blue overlays come from the current ground-floor source rooms. The gold bus-stop
overlay comes from the actual exterior builder's measured assembly bounds, not
its semantic anchor. House/garage/yard/driveway preservation uses the conservative
union of existing ground rooms; all candidate parcels stay outside that envelope.
The existing exterior audit is reused without modification.

`FLOOR_PLAN_SCALE` is imported from the current source. No historical scale or
copied bus-stop mesh coordinate is authoritative here. New proposal dimensions
are world metres: 18 m curve radii, 6 m walking surfaces, 20 m parcels, 12 by 14 m
house footprints and 24 m frontage spacing. Existing source positions are scaled
once; builder-local world dimensions are never rescaled. The isometric drawing
projects the same polygon coordinates and shows a projected 20 m scale bar.

## Measurement interpretation

**The new loops connect to each other, but the home connection is blocked.** The
current `ground.sidewalk.end0` and `ground.sidewalk.end1` walls obstruct both
existing-sidewalk exits. They remain in the query arrays and appear red in the
drawings. The JSON reports both approach traversals as failed. Opening these
artificial boundary gates would need a separate source-layout review and home
regressions; this proposal neither removes them nor claims integrated traversal.

The complete arrays passed to the review queries contain **4,297 solid rectangles**
and **1,289 navigation rectangles**. Solids comprise 2,688 house pieces, 1,560 fence
pieces, 14 existing exterior solids and 35 existing ground walls. Navigation
comprises 1,232 curved pieces, 36 straight pieces and 21 existing ground zones.
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
centres. The authored 3.8 m openings retain approximately 3.748 m physical width
and 2.248 m actor-centre width. The conservative curve physical strip is about
5.641 m. These are distinct from the avatar's existing 0.75 m radius and the
provisional extra clearance proposal.

The arrays include existing ground walls/nav and exterior solids, but are not a
complete live capture of dynamic doors, furniture or stair guards. Original-house
interior traversal, camera framing, visual kit acceptance, actual rendering costs
and low-end hardware remain unqualified. No new geometry is imported by the app.

## Reproduction

Use the repository's existing dependencies; no package or script changes are needed:

```sh
npx --no-install vitest run src/tests/prototypes/__tests__/neighborhoodGraybox.test.ts
npx --no-install tsx src/tests/prototypes/measureGraybox.ts /absolute/review-output
```

The capture tool requires an explicit output directory and writes only the JSON
and two SVGs there. It substitutes a null canvas context while running the actual
exterior builders, matching the existing geometry audit tests; sign paint is
omitted, geometry is measured. Capture provenance records the checked-out commit,
working-tree state and input hashes. A source commit followed by a separate
artifact commit avoids circular capture identities. Inspect the JSON's dirty
state and hashes before treating a capture as evidence for a later revision.
