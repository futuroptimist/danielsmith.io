# Upstairs stairs QA runbook

Use this runbook when reviewing stairwell, landing, and second-floor edits. Load the
immersive scene with failover disabled:

```text
http://localhost:5173/?mode=immersive&disablePerformanceFailover=1
```

## Enable debug coordinates

1. Open **Settings** with the `H` key or the Settings button.
2. Turn **Debug coordinates** on.
3. Confirm the overlay shows `XYZ`, `Active floor`, `Predicted stair floor`,
   `Stair zone`, and `Room`.

## Stair reference coordinates

Approximate current world coordinates:

| Area                         | Expected floor         | XYZ / zone to check                              |
| ---------------------------- | ---------------------- | ------------------------------------------------ |
| Stair base                   | Ground                 | `x≈12.40`, `z≈-10.30`, lower stair entrance      |
| Stair middle                 | Ground while ascending | `x≈12.40`, `z≈-18.25`, stair ramp body           |
| Stair top / landing          | Upper                  | `x≈12.40`, `z≈-26.00`, upper landing             |
| Landing edge regression spot | Upper                  | `x≈16.70`, `z≈-25.20`, safe upper floor          |
| Intentional descent corridor | Ground handoff         | `x≈12.40`, `z≈-25.20`, explicit descent corridor |
| Loft Library                 | Upper                  | `x≈12.00`, `z≈-4.00`, room `loftLibrary`         |
| Focus Pods                   | Upper                  | `x≈0.00`, `z≈20.00`, room `focusPods`            |

## QA steps

1. **Stairs up:** Start downstairs, walk to the stair base, then continue up the
   stairs. The overlay should switch from `ground` to `upper` only near the top
   stair / landing zone.
2. **Landing:** Stand near the landing edge regression spot (`x≈16.70`,
   `z≈-25.20`) and nudge toward the lower stairs. `Active floor` and
   `Predicted stair floor` should remain `upper` unless the avatar is centered
   in the explicit descent corridor.
3. **Second-floor rooms:** Walk from the landing into Loft Library and Focus
   Pods. The overlay should stay on `upper` and report the expected room when
   inside each room.
4. **Ground POI / LED bleed-through:** While upstairs, verify ground POI labels,
   visited checkmarks, and room LEDs are hidden. No ground marker tooltip should
   appear when moving around upstairs rooms.
5. **Stairwell visibility from upstairs:** From the upper landing, confirm the
   stair opening shows usable stairs down, not a solid cuboid or closed floor.
6. **Intentional descent:** Move to the center of the stairwell at
   `x≈12.40`, `z≈-25.20`, then continue down the ramp. The active floor should
   change to `ground`, and it should remain ground at the stair base.
