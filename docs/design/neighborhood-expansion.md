# Residential neighborhood design

Status: design for review; no runtime implementation is authorized by this document.
The approved visual direction is neighborhood concept A and its foliage. The source
house and the bus stop beside it remain fixed anchors. Future movement and travel work
is separated in the [roadmap](../roadmap.md#neighborhood-and-exploration-dependencies).

## Reference and preservation contract

Inspected source: `31942402970dcb75f8c3a709d1e62b43f2decf1a`.
The approved `neighborhood-concept-a.png` was retrieved from Library and visually
inspected at 1536 x 1024. It uses gently curving residential streets, continuous pale
sidewalks, houses on both sides, individual front paths and mailboxes, warm wooden
fences, and mixed faceted broadleaf/conifer canopies with shrubs. Adopt that composition,
foliage language, varied setbacks and muted roof colors. The yellow highlighted house
is a location placeholder, not an architectural replacement. The reference remains
outside Git; including the image in the repository requires separate owner review.

Preserve the actual [level](../../src/scene/level/portfolioLevel.ts), not the
reference image's generic bungalow: living room, kitchen, studio, backyard, upstairs
landing/creator studio/library/focus pods, basement career museum, stairs, all POIs,
furnishings, current cutaways, lighting, entrances and attached garage. Preserve the
house's transform, dimensions, room connections and original launch framing. Existing
ceiling panels are a translucent cutaway system, not a conventional opaque pitched
roof. The pitched-roof kit below applies to every new neighboring house; do not retrofit
the central house to match it. Any proposed exterior roof treatment on the original
house needs a separate architectural review and cannot hide its playable features.

Only the original house, including its existing garage/interiors, remains enterable.
Neighbor windows are opaque recessed or colored panels; front doors are visibly closed
and solid. Neighbors have no interior geometry, door controller, interaction prompt,
room transition, POI or focus target. The original house's functional doors retain their
current behavior. Do not copy its interactive internals into the neighborhood kit.

### Fixed bus-stop and entry corridor

The authoritative [street layout](../../src/scene/level/streetLayout.ts) defines
`residential-bus-stop`, source `ground.busStop.shelter`, at plan `(25.6, 16)`.
Plan positions scale by `FLOOR_PLAN_SCALE`, approximately 2. The stop's semantic surface
is plan `x=23..26, z=13..19`; the adjacent sidewalk is `x=26..29, z=-18..20`.
Its actual [builder](../../src/scene/structures/residentialStreet.ts) places the roof
at world `(49, 4.5, 32)`, size `6.2 x 0.25 x 12.1`, with posts at
`x=46.4/51.6, z=26.4/37.6`, bench at `x=48.1, z=32`, and sign near
`x=51.85, z=36.7`. The semantic anchor and mesh center are intentionally not identical;
do not recompute the shelter from the anchor alone or double-scale world dimensions.

Retain shelter, bench, four posts, readable localized Coming Soon sign, roof cutaway,
colliders, passive accessibility text and full approach from the sidewalk. Preserve
the four shielded lamps and parked EV, front door at plan `(16,-7.5)`, garage footprint
`x=16..25, z=-4..8`, driveway and door operating clearances. New paths meet the existing
sidewalk smoothly. No tree, fence, mailbox, road widening or lot may occupy these
reserved surfaces or their current avatar clearance envelopes.

The stop is intended as a future main travel hub. Preserve its stable source ID and
an unobstructed approach as the extension seam; keep its current passive behavior.
No travel menu, destination, second stop, terrain destination or reservation-sized
speculative structure is part of the neighborhood implementation.

## Layout and asset plan

Use a deterministic source-authored street/lot graph around the fixed home parcel.
World east/north below means source coordinates, not WASD directions; movement remains
camera-relative. Begin with 24 neighboring lots, six frontages on each side of each
of two streets, in addition to the existing home. Corner setbacks may change spacing,
but acceptance requires at least two curved streets with homes on both sides and two
walkable connected block loops. Avoid rows ending as disconnected decorative strips.

- **Home street:** extend the existing eastern street at its north and south ends;
  hold its current segment beside the home, driveway and bus stop fixed. Introduce
  broad bends beyond that segment, then curve around the protected central parcel.
- **Outer street:** a second curved residential run outside the home block, with
  frontages on both sides. Two end connectors join it to Home street; an intermediate
  cross street subdivides the space into at least two blocks. Fit corner lots to the
  curves with trimmed setbacks rather than overlapping rectangular yards.
- **Walking network:** continuous sidewalks on both sides, visible level crossings at
  intersections, and a path from each front door to its sidewalk. Preserve the existing
  sidewalk's 3 plan-unit width where it meets the home; new clear paths must accommodate
  two avatar diameters plus collision tolerance. Mailboxes and planting sit outside that
  clear lane. Measure the narrowest inner curve and every fence opening, not only centers.
- **Central parcel:** preserve the full house, backyard, garage, entry/driveway and stop
  before placing lots. Existing artificial outer street boundary fences may be extended
  or replaced only where the new connected walkable network is validated. House guards
  and interior safety colliders are never repurposed as neighborhood boundaries.

Topology sketch (not a coordinate or architecture blueprint):

```text
                 Outer street: houses | sidewalk | curved road | sidewalk | houses
                 /                          |                              \
          connector                    cross street                    connector
                 \                          |                              /
                  Home street with frontages on both sides and broad bends
                          preserved sidewalk / original bus stop
                          original home + garage + yard parcel
```

The graybox review must produce a scaled plan from source bounds with all 24 lot IDs,
two closed block routes, curve radii, protected parcel and stop overlay, rather than
implementing this sketch literally. Orient each facade toward its street tangent; avoid
roads under buildings or curves that erase opposite-side lots. The original home need
not move to satisfy geometric symmetry. Final extent/lot spacing is a graybox decision,
subject to the fixed-anchor constraints and measured rendering envelope below.

Every new house has walls, visible windows, a closed front door, a pitched gable or hip
roof, front yard, mailbox and connected path in every supported detail tier. Use three
compatible shell variants, three roof profiles and a shared muted palette. Vary facade
width, setback, roof color and garden composition with stable seeded placement. Do not
scale a mailbox or door with whole-house width. At least six lots have low wooden
front-yard fences with clear path openings; use shared posts/rails rather than one
material or geometry per picket. Fence variants must remain visibly wooden at low detail.

Reuse two broadleaf crown silhouettes, one conifer, two shrubs and a hedge segment.
Favor opaque faceted crown volumes and trunks; vary rotation, bounded scale and vertex
or instance color. Front yards mix open grass, shrub clusters, one focal tree, small
beds and occasional fences; retain empty areas instead of filling every gap. Place trees
between frontages and along block edges without hiding doors, intersections or the stop.
No foliage animation, new texture pack or per-house dynamic lighting is required.

## Current rendering behavior and gaps

- [Scene detail policy](../../src/scene/graphics/sceneDetailPolicy.ts) provides
  cinematic/balanced/performance and low/micro tiers used by reduced representations.
  Cinematic and balanced share high geometry settings; performance reduces primitive
  segments, texture resolutions, decoration update rates and effects. The policy's
  `triangleHint` and `drawCallHint` are theoretical hints, not measured limits.
- [Graphics quality](../../src/scene/graphics/qualityManager.ts) changes DPR, bloom and
  lighting. The scene-detail reload handoff in `immersiveScene.ts` rebuilds assets and
  restores position when requested. Do not confuse quality selection with continuous
  neighborhood LOD. Do not add automatic quality switching or override user choice.
- No general neighborhood `THREE.LOD`, spatial cell culler or occlusion-query system was
  found in the inspected source. Ordinary meshes retain Three.js frustum culling.
  Animated avatar bounds deliberately disable it; debug meshes and world tooltip have
  specific exceptions. Do not copy those exceptions onto static neighborhood meshes.
- [Exterior](../../src/scene/structures/residentialExterior.ts) shares a box geometry
  and seven material palettes; street fixtures batch by source/palette/height role using
  `InstancedMesh` and computed bounding spheres. Extend the sharing pattern but partition
  neighborhood instances spatially, since a town-wide bound defeats useful culling.
- [Floor visibility](../../src/scene/floors/visibilityController.ts) hides inactive
  floors, lights and POIs while keeping adjacent connections. Shelter/house cutaways aid
  visibility; they are not general occlusion culling. Hidden renderables do not imply
  disposal or removal of colliders.
- [Diagnostics](../../src/scene/performance/performanceDiagnostics.ts) expose renderer
  calls/triangles and resource counts. Rolling frame samples exclude gaps of one second
  or longer. Record independent rAF gaps/long tasks too. Geometry/texture counts are not
  byte measurements, and last-render counters do not prove whole-frame multi-pass cost.

## Baseline evidence and proposed budgets

Retain current launch gates: 150 draw calls, 50,000 triangles, 125 geometries, 32 textures,
hardware p95 frame time 80 ms in [performance.ts](../../src/assets/performance.ts).
The older 114-call/32,000-triangle baseline is a launch reference, not an outdoor route
measurement. Its 2024 press-kit memory estimate is also not current GPU memory evidence.

The [corrected street history](../qa/performance/2026-10-03-door-wall-corrections/street.json)
has three attempts on `5d55f7ce78c11d666a30de41667415c1bc12cbf5`, software renderer,
performance quality, safe cadence. Spawn ranges are 117-122 calls and 4,992-5,212 triangles
on the common route; the extended bus-stop checkpoint is 50 calls and 4,164 triangles.
Resident geometry reaches 753-755 after the extended route, versus 74 at spawn; final
texture count is 18. Thus the 125-geometry launch gate cannot be applied to a fully
visited route. This is evidence of accumulated resources, not by itself proof of a leak.
See the [history limitations](../qa/performance/README.md) before comparing timings.

A fresh unchanged-source capture is recorded in the
[neighborhood baseline note](../qa/performance/neighborhood-baseline.md). It separates
current software counters from historical evidence and hardware qualification still due.

These are proposed allocation ceilings, not claims that the future neighborhood meets
them. Use the stricter of the additive allocation and whole-scene limit. If the measured
base leaves less room, reduce optional decoration or obtain a separately reviewed
optimization; do not silently raise the existing launch budget.

| Metric                                  | Proposed incremental neighborhood limit                                     | Whole-scene acceptance                                                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Visible submitted triangles             | Performance 12,000; balanced/cinematic 24,000                               | Existing launch <=50,000; outdoor route <=50,000 performance, <=75,000 balanced/cinematic                                 |
| Draw calls                              | Performance +24; balanced/cinematic +40, including any transition overlap   | Launch <=150 unchanged; outdoor <=150 performance, <=200 balanced/cinematic                                               |
| Resident resources after complete route | <=24 shared geometries, <=8 materials, <=2 textures                         | Same-profile base plus those limits; retain separate launch 125/32 gates                                                  |
| Geometry/instance buffer bytes          | <=4 MiB performance; <=8 MiB balanced/cinematic including all resident LODs | Deduplicated typed-array/instance buffers; total reported alongside baseline                                              |
| New texture allocation                  | <=2 MiB performance; <=4 MiB balanced/cinematic including mipmaps           | No full-size per-lot textures; unchanged press-kit budget is not a runtime measurement                                    |
| New render targets                      | 0                                                                           | No new mirrors, shadow maps or offscreen passes for neighbors                                                             |
| JS heap retained delta                  | <=8 MiB after warm complete route and comparable collection                 | No monotonic growth across 10 return/re-entry cycles; <=1 MiB drift after cycle 2                                         |
| Hardware frame p95                      | <=10% regression at matched existing checkpoints                            | Desktop target <=16.7 ms; low-end tablet qualification <=33.3 ms; existing launch <=80 ms remains a separate coarse guard |
| Hardware frame p99 / stalls             | Report full distribution, not only rolling diagnostics                      | Tablet <=50 ms steady-state p99; no neighborhood-attributed >100 ms stall after warmup                                    |

The +24 call allocation is intentionally below the historical spawn's 28-call minimum
headroom; the 12k triangle allocation leaves ample room below 50k even though house/POI
cost varies by view. The bus-stop pose has more room than spawn; do not spend it twice.
Byte and hardware-time caps are provisional engineering targets because available
software measurements cannot establish those quantities. Before implementation approval,
capture matching hardware base values and reject infeasible targets explicitly. An
already failing tablet base requires a measured optimization dependency, not a waiver.

For asset planning, cap each visible performance neighbor shell at 300 triangles,
tree at 80, shrub at 24 and mailbox at 24; balanced near shell at 700, tree at 180 and
shrub at 48. Include fences, paths, street surfaces and transition overlap in the total.
These limits constrain authored shapes, not just material complexity. A 24-house
full view needs coarser representations or fewer visible trees to fit the allocation;
instancing reduces calls, not triangle submissions.

## LOD, culling and lifecycle proposal

Use projected CSS-pixel size for an orthographic camera, with zoom/DPR recorded;
distance alone does not describe apparent size here. Start shell LOD0 above 120 px,
LOD1 from 40 to 120 px and LOD2 below 40 px projected height. Prototype thresholds
against phone/tablet views. Preserve footprint, ridge/eave profile, roof pitch, door,
window rhythm and tree crown/trunk silhouettes at every tier; remove trim and crown
facets before changing building mass. Mailboxes/path continuity cannot disappear at
normal walking views. Keep deterministic placement across quality reloads.

Promote at 132/44 px, demote at 108/36 px (10% hysteresis), require 300 ms dwell and
at least 500 ms between reversals. Prebuild shared variants; never rebuild a house
synchronously as the player crosses a threshold. Prefer matching silhouettes with a
150 ms bounded opaque dither transition where it is visually clean; allow only one
cell transition at once and account for double submission. Avoid transparent crossfades
of whole blocks. Performance/reduced-motion may use a stable single swap at the smaller
projected threshold; visual review must demonstrate no distracting pop or shimmer.
No camera movement or forced quality change is part of LOD transitions.

Partition static meshes into roughly 2-4 adjacent lots per spatial cell, then batch by
geometry/material/LOD within each cell. Measure 2 vs 4 lots before choosing; optimize
visible total calls, not only batch count. Preserve instance-to-source ID mapping for
debugging and collision audits. Recompute conservative cell/instance bounds after
transforms or LOD changes; include full roofs/canopies and transition variants. Cull
against the actual camera frustum including near/far planes and a small prefetch margin.
Test diagonal views and maximum zoom-out; never cull from avatar distance alone.

Start practical occlusion with existing floor visibility and neighbor interiors omitted
entirely. Frustum culling plus cells is the default outdoor strategy. Only add conservative
block/portal rejection after profiling shows a benefit: roofs or solid house masses may
occlude fully enclosed bounds, foliage/fences/translucent cutaways may not. Require all
bound corners safely hidden for consecutive observations, invalidate immediately on
camera/zoom/floor/door changes and fail open on uncertainty. Keep near-player and stop
cells visible. No synchronous GPU readback, naive center-point raycast or per-object
occlusion query is justified at this scale.

Use opaque foliage with no stacked alpha leaf cards, transmissive neighbor windows or
new shadow-casting lamps. Prefer vertex/baked shading or shared nonoverlapping ground
contact accents. Performance trees/shrubs cast no dynamic shadows; balanced may enable
only measured nearby casters within the existing shadow setup. Record shadow-pass calls
and canopy screen coverage separately; do not assume fewer triangles solve overdraw.
Require foliage-only GPU/whole-frame timing comparisons at the densest corner, with
foliage hidden as a diagnostic, without shipping a stripped visual target.

Own shared resources once and dispose on scene teardown; visible-cell changes must not
allocate new materials or geometry. Evict optional cached variants only with a bounded
policy, and retain collision data independently of render visibility. Compare JS heap,
renderer counts, estimated buffers/textures and browser GPU diagnostics where supported;
mark unavailable metrics explicitly. Never label `renderer.info.memory` as GPU bytes.

## Collision, accessibility and regression acceptance

Author simple source-owned solid footprints for closed houses, trunks, mailboxes and
fences. Shrub canopies can be decorative; intentional planters remain solid. Use
segment/convex proxies appropriate to curved streets rather than long axis-aligned
blockers that cut across turns. Share semantic placement data with render instances,
but keep stable colliders at all LODs and while cells are culled. Preserve current
avatar radius/height, stair substeps, door clearance and floor selection.

Keep every ordinary neighborhood route walkable without jumping. Maintain sightlines
to the house/stop, readable path contrast, keyboard and touch parity, remappable input,
reduced motion and text fallback. Identify only the original home as enterable through
existing navigation/help conventions; avoid deceptive prompts on neighbor doors. Do
not make mailboxes or decorative houses keyboard-focus stops. DOM accessibility scans
must be supplemented by human review of the 3D camera, depth and foliage occlusion.

Implementation regression plan:

1. Source invariants: unique lot/source IDs; every lot has complete required features;
   street graph has two curved runs, both-sided frontage and two connected block loops;
   no overlap with protected parcel, stop, driveway or sidewalk clearance. Closed
   neighbor doors never enter interaction registries; collision footprint is LOD-invariant.
2. Renderer tests: conservative bounds at every orientation; no disappearing roof/crown
   at frustum edges; hysteresis/dwell under slow zoom reversal; stable silhouettes and
   placement after reload; cell transitions stay inside all allocation ceilings.
3. Reuse existing basement/upstairs, exterior doors, garage, residential street,
   under-stair, keyboard, small-screen, decorative-lighting and avatar integration suites.
   Traverse both new block loops in both directions, diagonally and at run speed; brush
   fences/mailboxes/corners; return through both original home entrances. Test stop
   access and shelter cutaway from both sidewalk directions, all quality levels and
   touch/keyboard input. Teleport setup is not proof of an actual traversal.
4. Visual checkpoints: full neighborhood framing, each curve/intersection, every kit
   variant, nearest/farthest LOD, central house interior and facade, bus stop and
   densest planted yard. Inspect closed doors, roof silhouettes, shadows, path seams,
   clipping and occlusion. Compare original home crops separately from expected new
   background changes; do not overwrite the CI-owned launch image.
5. Lifecycle and access: ten home/neighborhood round trips, immersive/text cycles,
   quality reloads, seated reload, background/foreground, resize/orientation, slow asset
   load and WebGL loss. Retain errors, failed attempts, raw timing and memory evidence.

## Low-end qualification and review gates

The historically slow tablet scene is a blocking qualification concern. Record actual
device model, SoC/GPU, RAM, OS/browser version, battery/thermal state, quality, viewport,
DPR/drawing buffer, exact commit, asset readiness and camera/route. Use the owner's
previously slow tablet if available, plus a documented low-end tablet with roughly
3-4 GB RAM and an integrated/mobile GPU. Device selection requires owner confirmation;
desktop viewport emulation and software WebGL do not satisfy this gate.

For unchanged base and candidate, run three fresh-load attempts and three matched
5-minute warm routes with a 15-minute sustained traversal/thermal run. Keep defaults
and manually selected performance quality as separate profiles. Cover portrait and
landscape, entry/bus stop, full zoom-out, dense corner, both block loops, garage, chairs,
basement and upstairs, then return. Collect application-ready time, input latency,
per-frame counters including ancillary passes, external rAF p50/p95/p99/max and gaps,
CPU/GPU timing when supported, memory before/after and visible degradation. Warm up for
at least 5 seconds after assets/shaders settle; do not discard route stalls as warmup.

Compare equivalent poses on the same browser/hardware and same capture method; archive
three attempts separately before reruns. The new-area route has no old counterpart, so
compare it to the absolute cap and label it separately. Require input p95 <200 ms,
no traversal blocker, no unbounded resource growth, and the tablet frame targets above.
Keep the existing startup safety/text mode and user-selected low-FPS recovery behavior;
diagnostic overrides are not evidence that normal failover is correct.

Review sequence: approve this design and measurable envelope; approve a fixed-anchor
graybox plan; capture hardware base and resolve any existing tablet failure; only then
authorize separate implementation slices for source layout/collisions, reusable assets,
and measured rendering integration. Each slice needs functional regression and exact-head
CI; final completion requires the owner walkthrough and hardware qualification. This
document, approved concept, or passing software suite is not implementation approval.
No merge, deployment, destination work or fast-travel implementation is included.
