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

## Enable collider visualization

1. Open `http://localhost:5173/?mode=immersive&disablePerformanceFailover=1&debugColliders=1`.
2. Open **Settings** in the HUD and confirm **Collider overlay on** is pressed.
3. Confirm thin debug rectangles are visible for the active floor only.
4. Toggle **Collider overlay on/off** and confirm `window.portfolio.debugColliders.getState()`
   switches between visible collider counts and zero visible colliders without changing movement.

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
