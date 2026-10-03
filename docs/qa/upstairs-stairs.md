# Upstairs and stair QA runbook

Use this checklist when reviewing stairwell, upper landing, second-floor room, or debug-coordinate
changes. Keep the immersive preview URL pinned to:

```text
http://localhost:5173/?mode=immersive&disablePerformanceFailover=1
```

## Enable debug coordinates

1. Open **Settings** in the HUD.
2. Press **Debug coordinates off**.
3. Confirm the overlay appears with position, active floor, predicted floor, stair zone, and room.
4. Optional console check: `window.portfolio.debugCoordinates.getState()` should mirror the overlay.

## Stairs up

1. Start on the ground floor and walk to the stair base near **X 12.40, Z -10.60**.
2. Move north/up the stair ramp through **X 12.40, Z -18.25**.
3. Continue to the top handoff near **X 12.40, Z -26.00**.
4. Verify **Active floor** becomes `upper`, **Predicted floor** stays `upper`, and the avatar height
   sits on the second-floor landing instead of clipping through the ground floor.

## Upper landing regression

1. With the active floor `upper`, stand on the landing edge near **X 17.40, Z -25.20**.
2. Nudge slightly downward along the landing edge, sampling around **Z -25.35**, **Z -25.50**, and
   **Z -25.65**.
3. Verify the active floor remains `upper`; this is the screenshot-4 accidental-teleport guard.
4. Move back to the center of the stair opening near **X 12.40, Z -25.20** and verify intentional
   descent still switches the active floor to `ground`.

## Second-floor rooms

1. From the upper landing, walk west into **Creators Studio** around **X -8.00, Z -20.00**.
2. Walk east/south into **Loft Library** around **X 10.00, Z -4.00**.
3. Walk south into **Focus Pods** around **X 0.00, Z 18.00**.
4. Verify the debug overlay reports `upper`, each room name/id changes as expected, and movement does
   not snap back to the ground floor while crossing upper-floor doorways.

## Floor-specific visuals and labels

1. While upstairs, scan the ground-floor POI locations from the landing and upper rooms.
2. Verify ground POI labels, visited checkmarks, LEDs, and tooltip markers do not bleed through the
   second floor.
3. Optional console check: `window.portfolio.poi.getTooltipState()` should show no visible ground
   marker IDs while the active floor is `upper`.

## Stairwell visibility from upstairs

1. Stand on the upper landing and look toward the stair opening.
2. Verify the opening shows the usable stairs down, not a solid cuboid or blocked floor patch.
3. Walk through the center of the opening to descend, then walk back up to confirm round-trip travel.

## Ground passage beneath the upper flight

The front-entry bay connects beneath the high part of the upper staircase. Walk
west from X 23, Z -23 across the stair footprint, then east back into the entry bay.
The avatar must stay on `ground` at Y 0, with no active stair connection, throughout
both crossings, including full-speed keyboard movement and coarse frames.

Headroom comes from the actual tread undersides. With the 2.6-unit avatar and
0.75-unit horizontal collision radius, the ground centerline must remain north
of Z -21.55 while inside the stair footprint: tread 6 starts at Y 2.567, which
is too low, while tread 7 starts at Y 3.08. Walking south beneath the stairs
must stop at this headroom boundary without lifting or teleporting the avatar.
The landing underside is Y 4.62 and can be crossed on the ground as well.

Side guards follow each tread's elevation, so they block walking off the flight
while allowing a grounded avatar beneath sufficiently high treads. The former
wide east-side safety rectangle is replaced by the actual stair volumes; the
visibly open entry floor east of the low flight is walkable. Low treads and side
guards, basement void rails, and the upper landing's safety guards remain solid.
Only the lower approach admits a new upstairs ascent; crossing below a high
flight or its landing cannot select the upstairs connection.

Run `playwright/immersive-under-stair-passage.spec.ts` alongside the upstairs and
basement roundtrip suites. Inspect the generated ground-under-upper-stair image
and native movement samples; repeat ordinary ascent and descent after crossing
underneath. Collider diagnostics place elevated bounds at their actual underside
and use the same avatar-height filtering as movement.

The preserved inter-flight exit lane has a **0.92-unit avatar-center bottleneck**:
upper side safety begins at X 8.86, the basement east rail ends at X 6.44, and the
two 0.75-radius clearances consume 1.50 units. Its safe center interval is
X [7.19, 8.11]; X 8 continues south to Z -11 and west into the basement landing.
This intentionally preserves the chosen floor plan and is an exception to the
original 2.5-unit circulation target. The unrendered lower-corner barrier 4002
and its empty approach-side companion are removed entirely; they have no solid
mesh footprint to protect.
