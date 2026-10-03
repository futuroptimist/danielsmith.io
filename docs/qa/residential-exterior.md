# Front entrance and residential exterior QA

The front entrance is the positive-X living-room facade at plan `(16, -7.5)`.
This is below the stair core on the bottom-right side of the normal isometric
view. The original house outline still controls launch framing; the larger
runtime outline only extends navigation. The selfie mirror keeps its existing
world footprint `(28.8, -22.8)` and now derives it from corrected source data.
A second living/studio passage spans world X `[23.5, 29.5]` at Z `-8`,
providing a clear route into the eastern entry bay. The original aperture and
all stair safety guards remain intact. The original lower-corner guard reaches
X `22.18`; radius-adjusted free centers in the new passage span `[24.25, 28.75]`,
leaving 4.5 units of circulation rather than squeezing through the stair guard.

## Sources and door contract

`src/scene/level/exteriorLayout.ts` owns the semantic zones, surfaces, planted
borders, current boundary walls and door measurements. X/Z are authored in level
units and converted once; door height and animation duration are world/time
measurements. The front path has a six-world-unit width and leads to a continuous
six-world-unit sidewalk. No existing backyard fence or route is removed.

The original procedural exterior shares a single box geometry and six materials,
with static parts instanced by source identity/material. It uses no downloaded
assets or new textures. Plant beds are solid. Foliage belongs to the same visible
footprint; the grass and paving are walking surfaces rather than blockers.

`src/systems/doors/controller.ts` owns the only door progress value. The panel
slides into a visible wall pocket. Collision stays closed until full travel;
closing checks the avatar radius against both the threshold and sweep before
any progress or collider activation. Occupancy reopens/holds the door and triggers
one polite status announcement. Same-target requests coalesce, reversals retain
progress, and reduced motion applies the same safety check before an instant
transition. State is session-local and resets closed on a safe fresh spawn.

Approaching the aperture from either side opens the front door automatically.
The lead distance derives from the native maximum speed and time needed for the
panel to clear. The same-frame intended movement also detects late turns and
coarse frames; when less lead time remains, the visible panel accelerates to its
clearance position before collision tests the movement. Collision never opens
before the panel clears. The full path across a coarse frame is checked against
the aperture, so crossing its sensor between rendered frames still opens it.

The localized DOM button and remappable Interact action remain available nearby.
A manual close while stationary persists; moving inward again or leaving and
re-entering the approach reopens the door. Doors do not close automatically. Sideways through-wall and inactive-floor
activation are excluded. Native button activation/navigation keys do not reach
movement or activate a second target. Ordinary gameplay and remapped letters work
from closed HUD/door focus and from nonmodal Tutorial/Controls buttons. Remapped
exhibit interaction remains available while those nonmodal panels are open;
desktop panels leave the exhibit details and close control reachable alongside
them. Settings pauses gameplay. Overlapping Interact bindings leave movement and Help
available and do not operate a door. Held keyboard input and residual motion clear
on tab/window blur. Door button dimensions are remeasured on label, HUD-size,
layout and viewport changes; unchanged frames do not rewrite its DOM state or
force layout reads.

Exterior model resources, door UI observers, keyboard/blur listeners, and the
scene's world API are owned from allocation through teardown. Early and late
initialization failures release that ownership through the same idempotent
cleanup used when leaving immersive mode. Synchronous initializer exceptions
also use the renderer-aware failure handler; cleanup is not dependent on the
optional console-error failover monitor.
The earliest renderer canvas, input telemetry and debug FPS panel are owned
from allocation onward, including failures during locale/debug storage reads
before scene construction. Targeted faults verify real listener removal,
renderer disposal and DOM release through the initial fallback handler.
The full fatal handler also guarantees renderer-aware fallback when a resource
disposer throws; synchronous and asynchronous fault cases retain exact resource
disposal and renderer assertions. Scope failures are recorded as `cleanup-error`
breadcrumbs alongside the original fatal error, and teardown continues through
later owned structures and the final disposed lifecycle. Late-initialization
and ready-scene faults cover both initialization and exterior scopes, including
museum resource equality, miniature and PR-Reaper disposal events, and ready-scene
keyboard release and active joystick reset.

## Automated and owner checks

Run the normal repository gates, plus:

```bash
npm run typecheck
npm run i18n:guard
npm run miniature:check
npm run test:e2e -- playwright/immersive-exterior-doors.spec.ts \
  --workers=1 --retries=0 --trace=retain-on-failure
npm run collider:audit:geometry -- --source-id ground.frontEntry.door --json
npm run collider:audit:reachability -- --source-id ground.frontEntry.door --json
npm run collider:audit:redundancy
npm run perf:budget
```

The browser journey starts at fresh spawn, plans using read-only occupancy
queries, and walks through the real runtime collision path. Its actual front-door
crossing also uses native keyboard interaction and camera-relative movement.
The exterior route planner and performance capture driver anchor their grid to
the actual player pose; they never round a valid position into a nearby solid.
A planter-edge regression reaches a fractional free pose through movement, proves
that its globally rounded neighbor collides, then walks onward to the sidewalk.
No destination teleport establishes traversal. Isolated controller unit tests
cover repeats, interrupted reversal, occupancy during closing, non-finite delta,
and reduced motion. Proximity regressions sweep the full movement path at the
native maximum speed from both sides with 60 Hz, 100 ms, 400 ms and 1.5 s frames;
they also cover late sideways entry, re-approach and stationary manual closure.
`playwright/immersive-door-proximity.spec.ts` verifies automatic opening during
uninterrupted trusted native movement without using Interact to cross. Browser cases cover leaving/re-entering range, overlay
focus, reload, and 1280×720, 1920×1080, 390×844, 360×720 and landscape layouts.
Fault-injection cases retain the real builders and DOM while exercising direct
fatal-handler calls and actual throws after the exterior build and after control
registration. They verify resource disposal events, listener removal, world API
release, renderer disposal and repeated-cleanup safety; these are simulated
failure-path checks, not claims about every possible allocation failure.

Review the screenshots and the floor-plan diagram, then use the normal controls
in a WebGL browser to walk house → front door → path → sidewalk and reverse.
Try closing from both sides while standing in the threshold. Check the door
location at normal framing, both lips, plant clearance, focus and touch behavior.
Repeat with reduced motion and performance quality; revisit basement and upstairs.

Automated software-WebGL evidence and the final owner walkthrough/hardware p95
check are separate gates. Record actual results, served tree/commit, renderer,
viewport and limitations in the stage handoff/performance record; do not treat
text fallback or missing render tools as a successful walkthrough.

## Attached garage and driveway

The garage is a ground-floor interior at plan X `[16, 25]`, Z `[-4, 8]`.
`garageLayout.ts` owns the house door at `(16, -1)` and the vehicle door at `(25, 2)`.
The studio wall contains the pedestrian opening between the existing monstera
and dresser, which retain their positions and solid colliders; the garage's east wall contains
a fourteen-world-unit vehicle aperture. The garage south wall replaces the
corresponding yard fence run explicitly in source. The remaining fence segment
continues to the sidewalk. No overlapping obsolete wall or guard is removed at
runtime. Both garage doors reuse the front-door controller and input binding. Each opens
automatically on approach from either side, using the same maximum-speed lead
and same-frame aperture clearance as the front entry. Operable
apertures explicitly belong to their custom frame factory, so generic interior
doorway trim is never built through the moving panels or their clear openings.

The driveway spans plan X `[25, 29]`; its paved surface ends where the continuous
sidewalk starts at X `26`. This keeps the pedestrian lane flat, visible and clear
without coplanar pavement. A solid workbench and storage cabinet occupy the back
of the garage, clear of the full-width vehicle threshold and house approach.
The existing translucent ceiling treatment preserves the interior cutaway. While
the avatar is inside, the overhead panel stays 80% opaque so the closed door
remains legible while revealing the avatar. Its progress and solid blocker are
unchanged. Outside the cutaway it restores full opacity and depth writing; the
owned cloned panel materials do not alter the frame or other doors.
The nearby DOM control stays below the measured HUD rectangle, including phone
portrait and landscape, rather than being covered by the Text or Settings controls.

The overhead shutter retracts into an opaque top housing. Its panel's lower edge
is `progress × 4.8` world units above the ground; the aperture becomes passable
only at **3.1 units of headroom**, above the 2.6-unit avatar. Closing checks the
whole threshold before the collision gate can reactivate. The slat instances,
shared geometry and materials are explicitly disposed with the exterior.

Run `playwright/immersive-garage-loop.spec.ts` alongside the front-entry suite.
`playwright/immersive-door-proximity.spec.ts` approaches all three initially closed
doors from both sides with uninterrupted native movement, at normal and reduced
motion. The shared controller sweep repeats maximum-speed passage at 60 Hz,
100 ms, 400 ms and 1.5 s frames, including late entry and closing reversals.
It covers house → garage → driveway → sidewalk → front entrance → house and the
reverse, closed blockers, native keyboard vehicle-door crossing, operations from
both sides, occupancy and reduced-motion touch. The native occupied-closing
case begins at a verified protected threshold edge before requesting closure;
it proves protection while crossing, without racing an unoccupied close during
browser command dispatch. A deterministic overhead-controller regression covers
an occupant arriving after closing has started and before the headroom gate.
Keep the fixture's input method
and actual result in the evidence; opening an animated panel alone does not prove
passage. The original tabletop model still uses its house/backyard envelope,
while the shared house wall shows the new pedestrian opening.

## Residential street and future bus stop

The final ground-floor expansion adds a flat residential road at plan X `[29, 40]`,
a flush pale curb, and a planted verge with a separate paved shelter pad. The
existing continuous sidewalk is unchanged. Source-authored outer fences end the
road and verge; the old sidewalk-edge fence is replaced in source, and the
backyard's existing fences remain intact. Road, curb, lawn and shelter surfaces
partition their areas without coplanar overlaps.

The original unbranded 2040 sedan has a closed nose, restrained light bars,
four-door proportions and simple shared low-poly wheels. Its conservative solid
footprint is 4.6 by 9.2 world units, centered at `(66, -20)`. It is more than five
units from the sidewalk and seven from the driveway's turning corridor. It is
parked scenery; driving and traffic are outside this stage.

Four evenly spaced fixtures have opaque hoods and single-sided emissive
undersides. Their spotlights target the point directly below each fixture, use a
36-degree half-angle entirely below horizontal, and cast no shadows. Realtime
lights are active only near the ground-floor street at compatible quality tiers.
Shared static downward ground pools stay visible at every quality tier, including
approach, passing and departure. Realtime light augments those pools instead of
removing them at the proximity boundary. No omnidirectional lamps or upward
bulbs are introduced. The street asset pool owns seven geometries, eleven
materials and one static sign texture. Sign pixels update only when locale copy
changes. Repeated boxes, wheels, lamp undersides and pools are instanced; all
instances, textures, lights, materials and geometries are disposed on teardown.

The shelter has four solid posts and a solid bench. Its roof and sign are above
avatar headroom. The roof becomes translucent when the avatar enters the pad;
its cutaway source is included in camera diagnostics. Shelter dimensions are
explicit world units for the current two-to-one plan, not an arbitrary-scale
factory contract.

`residential-bus-stop` identifies passive scenery with availability `coming-soon`.
The physical world sign, screen-reader description and text fallback share the
same nine-locale sign wording. There is no button, tooltip, disclosure, destination
reference, keyboard/touch handler or travel suggestion. The screen-reader text is
available on the ground floor and removed with the immersive scene.

An idempotent disposal scope owns street geometry, lighting and the passive
text description immediately after allocation. Both handled initialization
failures and synchronous throws release those resources, detach the remaining
door control and description, and clear only their own published world API.
Browser fault-injection cases count the real remaining control, its capture key
listener and projected-layout resize listener separately from the passive text.
They retain exact geometry/material/texture/light disposal equality, blur cleanup,
renderer disposal and repeated-failure assertions. Ordinary text transitions and
re-entry retain their separate lifecycle assertions.

Run `playwright/immersive-residential-street.spec.ts` with the existing entry,
garage, basement, upstairs, accessibility and launch-budget suites. Inspect the
named normal/minimum/maximum-zoom screenshots, parked sedan, shelter cutaway and
localized passive sign text and touch movement. The versioned `--street` performance profile preserves
all common, museum, entry and garage legs before appending the parked EV, bus stop,
shelter interior and return to spawn. Browser lifecycle assertions separately
verify disposal and a fresh bounded resource pool after text-mode re-entry.

Record failures and reruns honestly. Automated software-WebGL traversal, local
structural documentation checks, hosted link checks, hardware frame-time gates
and the owner's deferred final manual walkthrough are distinct evidence.

The traced Chromium native-movement helper queues trusted CDP key events so
per-key Playwright snapshots cannot turn a diagonal chord into single-axis
steering. It preserves focus, requested hold duration, collision goals and
movement deadlines. Bounded event/pose diagnostics print on failure as well as
being attached, so analysis does not depend on downloading a large trace ZIP.
This Chromium-only harness path is distinct from physical-keyboard validation.
