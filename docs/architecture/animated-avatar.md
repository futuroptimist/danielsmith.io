# Animated portfolio avatar

The immersive player loads `public/assets/avatar/daniel-animated-avatar.glb` after validating its
skin, required bones, clips, and unit scale. Loading or validation failure retains the existing
mannequin. The text portfolio remains independent of the model download.

The approved asset has 2,976 triangles, one skinned mesh/material, 20 bones, an embedded 128 px
atlas, and a standing height of approximately 1.872 meters. Runtime uses nearest filtering.
It contains no raw reference photograph. Keep model revisions separate from controller changes.

## Animation contract

The model is Y-up, faces +Z, uses unit root scale, and includes `Hips` and `Spine`. Required clips
are `Idle`, `Walk`, `Run`, `SitDown`, `Seated`, and `StandUp`. The loader subtracts the shared
first-key time from each clip to remove the frame-one leading hold. Translation and yaw belong
to the existing camera-relative movement controller; locomotion clips remain in place.

Walking starts at 1.1 world units/second; running is 2.5. Playback follows the exported foot travel
and loop duration (reference stride speeds 0.85446 and 1.57199), reducing foot sliding.
**Caps Lock** toggles the game-local
gait, independent of the operating system's Caps Lock state. Key repeat cannot toggle again.
Text inputs and settings retain their keys. Losing focus clears the held-key latch and preserves
the chosen gait. The controls and help list include the shortcut.

Reduced motion retains movement control but presents a stable idle pose; seating transitions
snap between validated positions. Camera framing and mirror height use the loaded model height.
The existing controller collision radius and height remain unchanged so replacing the visual
asset cannot open unsafe low-headroom routes below stairs.
Placeholder foot offsets are detached for the skeletal model. Seated foot grounding rotates
the two-bone leg chains while retaining bone lengths.

## Supported seating

The two living-room lounge chairs and the studio reading chair expose seat anchors derived
from their actual transforms and cushion heights (0.47 m and 0.62 m). The authored animation's
0.40 m cushion height and 0.395 m hip retreat are compensated at runtime. Other furniture keeps
its existing interaction behavior until individual seat and clearance metadata is supplied.

Near a supported chair, use the displayed **Sit in chair (Interact)** button or the existing
Interact binding. The controller approaches a clear standing point, enters the seat, holds the
seated pose, and stands on interaction or movement input. Movement cancels an unfinished approach.
Every transition samples its path against the current floor and colliders. Only the chosen
chair's collider is excluded during entry/exit; neighboring furniture and doors remain solid.
Exit candidates are rechecked before standing. An obstructed exit leaves the player seated.

## Validation

- `npm run test:ci -- src/tests/animatedAvatar.test.ts src/tests/chairController.test.ts src/systems/controls/gaitToggle.test.ts`
- `npm run test:e2e -- playwright/avatar-integration.spec.ts --workers=1`
- Run repository type, lint, format, docs, smoke, miniature and performance checks before review.
- Preview with `?mode=immersive&disablePerformanceFailover=1`; inspect front/side movement,
  each supported chair, blocked exits, reduced motion, touch controls and text fallback.

`window.portfolio.avatar` exposes animation, gait and seating snapshots for browser regression
checks. The GLB remains replaceable without changing the interaction state machine.
