# Upstairs and stairs manual QA

Use this runbook when reviewing stair, landing, second-floor room, or debug
coordinate changes. Keep the immersive preview URL forced to immersive mode:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://localhost:5173/?mode=immersive&disablePerformanceFailover=1`.

## Enable debug coordinates

1. Open Settings from the HUD.
2. Toggle **Debug coordinates** on.
3. Confirm the non-interactive overlay appears and reports:
   - `XYZ`
   - `Active floor`
   - `Predicted floor`
   - stair width / landing / stair nav booleans
   - stair zone and room id

## Stairs up

1. Start on the ground floor near spawn; `Active floor` should be `ground`.
2. Walk to the living-room stairs around `X 12.40`, `Z -10.60`.
3. Walk up the stair run toward `Z -25.90`.
4. Verify `Active floor` changes to `upper` only near the top or landing.
5. Verify the avatar height rises smoothly instead of snapping.

## Upper landing regression point

1. With Debug coordinates on, place the avatar near the upper landing edge:
   `X 12.40`, `Z -22.90`, `Active floor upper`.
2. Nudge slightly downward/toward the stair opening without entering the stair
   centerline.
3. Verify `Active floor` and `Predicted floor` remain `upper`.
4. Verify the stair opening shows usable stairs down, not a solid cuboid.

## Second-floor rooms

1. From the upper landing, walk west into Creators Studio.
2. Walk north/east into Loft Library.
3. Walk north into Focus Pods.
4. Confirm `Active floor` remains `upper` and `Room` updates when crossing room
   boundaries.
5. Confirm walls, floors, LEDs, and labels look second-floor-specific.

## Ground POI and LED bleed-through

1. While upstairs, look for downstairs POI labels, visited checkmarks, and LED
   strips.
2. Press `E` to cycle POIs; ground-floor markers should not appear as in-world
   labels while `Active floor upper`.
3. Confirm no backyard, kitchen, studio, or living-room ground markers ghost
   through the second floor.

## Intentional descent

1. Return to the stair centerline near `X 12.40`, `Z -24.50`.
2. Step into the stair opening and continue down the ramp.
3. Verify `Active floor` changes to `ground` only after entering the descent
   corridor.
4. Continue to the stair base around `Z -10.60`; verify the avatar stays on the
   ground floor.
