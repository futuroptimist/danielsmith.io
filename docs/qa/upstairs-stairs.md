# Upstairs/stairs manual QA

Use this runbook when changing stair geometry, upper-floor rooms, POI visibility, or debug
coordinate reporting. Keep the preview URL in immersive mode with failover disabled:

```text
http://localhost:5173/?mode=immersive&disablePerformanceFailover=1
```

## Enable debug coordinates

1. Open Settings from the HUD.
2. Toggle **Debug coordinates** on.
3. Confirm the non-interactive overlay shows:
   - `XYZ`
   - `Active floor`
   - `Predicted stair floor`
   - `Stair zone`
   - `Room`

You can also enable it from the console for a local QA session:

```js
window.portfolio.debugCoordinates.setEnabled(true);
```

## Stairs up

1. Start on the ground floor (`Active floor: ground`).
2. Walk to the stair base near `XYZ 12.40, 0.75, -10.60`.
3. Walk north/away from the camera up the visible stairs.
4. Near the top (`Z ≈ -25.90`), confirm `Active floor` changes to `upper`.
5. Confirm the avatar height rises smoothly and does not snap back to ground.

## Upper landing regression

1. Stand on the upper landing edge near `XYZ 13.40, 4.91, -28.50`.
2. Nudge south/toward the camera with `S` or `ArrowDown`.
3. Confirm `Active floor` stays `upper` unless the avatar is centered in the stairwell
   descent corridor.
4. Confirm `Stair zone` reads a safe upper-floor/landing state at the edge, not an
   accidental ground transition.

## Intentional descent

1. From the landing, move to the center of the stair opening near
   `XYZ 12.40, 4.91, -25.20`.
2. Continue south/down the stairwell.
3. Confirm `Active floor` changes to `ground` only after entering the descent corridor.
4. Continue to the base near `XYZ 12.40, 0.75, -10.60` and confirm the floor remains
   `ground`.

## Second-floor rooms

Check each upstairs room after ascending:

- **Upper Landing:** around `X 4.00–20.80`, `Z -32.00–-16.00`.
- **Creators Studio:** around `X -20.00–4.00`, `Z -32.00–0.00`.
- **Loft Library:** around `X 4.00–24.00`, `Z -16.00–12.00`.
- **Focus Pods:** around `X -20.00–24.00`, `Z 12.00–28.00`.

For each room, confirm the overlay reports `Active floor: upper`, the room name/id is
reasonable, and normal movement does not teleport to the ground floor.

## Ground POI, LED, and marker bleed-through

While upstairs:

1. Confirm ground POI labels, visited checkmarks, and in-world tooltip markers are not
   visible through the upper floor.
2. Confirm ground-room LED strips/fill lights are suppressed and upstairs lighting remains
   visible.
3. In the console, confirm there are no ghost ground markers:

```js
window.portfolio.poi.getTooltipState();
```

Expected upstairs state when no upstairs POI is active:

- `overlayVisiblePoiId: null`
- `worldTooltipPoiId: null`
- `visibleMarkerLabelCount: 0`
- `visibleMarkerLabelPoiIds: []`
- `activeInWorldTooltipCount: 0`

## Stairwell visibility from upstairs

From the upper landing, look at the stair opening and confirm usable stairs down are visible.
The opening should not be blocked by a solid cuboid, floor slab, or ground-floor-only visual.
