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

Approach from either side within the aperture to reveal the localized DOM button,
or use the remappable Interact action. Sideways through-wall and inactive-floor
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

## Automated and owner checks

Run the normal repository gates, plus:

```bash
npm run typecheck
npm run i18n:guard
npm run miniature:check
npm run test:e2e -- playwright/immersive-exterior-doors.spec.ts --workers=1 --retries=0 --trace=retain-on-failure
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
and reduced motion. Browser cases cover leaving/re-entering range, overlay
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
