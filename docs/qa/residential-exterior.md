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
from closed HUD/door focus; open Settings pauses movement. Held keyboard input and
residual motion clear on tab/window blur.

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
No destination teleport establishes traversal. Isolated controller unit tests
cover repeats, interrupted reversal, occupancy during closing, non-finite delta,
and reduced motion. Browser cases cover leaving/re-entering range, overlay
focus, reload, and 1280×720, 1920×1080, 390×844, 360×720 and landscape layouts.

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
runtime. Both garage doors reuse the front-door controller and input binding. Operable
apertures explicitly belong to their custom frame factory, so generic interior
doorway trim is never built through the moving panels or their clear openings.

The driveway spans plan X `[25, 29]`; its paved surface ends where the continuous
sidewalk starts at X `26`. This keeps the pedestrian lane flat, visible and clear
without coplanar pavement. A solid workbench and storage cabinet occupy the back
of the garage, clear of the full-width vehicle threshold and house approach.
The existing translucent ceiling treatment preserves the interior cutaway. While
the avatar is inside, the overhead panel becomes translucent so it cannot hide
the avatar; its progress and solid blocker are unchanged. Outside it is opaque.
The nearby DOM control stays below the measured HUD rectangle, including phone
portrait and landscape, rather than being covered by the Text or Settings controls.

The overhead shutter retracts into an opaque top housing. Its panel's lower edge
is `progress × 4.8` world units above the ground; the aperture becomes passable
only at **3.1 units of headroom**, above the 2.6-unit avatar. Closing checks the
whole threshold before the collision gate can reactivate. The slat instances,
shared geometry and materials are explicitly disposed with the exterior.

Run `playwright/immersive-garage-loop.spec.ts` alongside the front-entry suite.
It covers house → garage → driveway → sidewalk → front entrance → house and the
reverse, closed blockers, native keyboard vehicle-door crossing, operations from
both sides, occupancy and reduced-motion touch. Keep the fixture's input method
and actual result in the evidence; opening an animated panel alone does not prove
passage. The original tabletop model still uses its house/backyard envelope,
while the shared house wall shows the new pedestrian opening.
