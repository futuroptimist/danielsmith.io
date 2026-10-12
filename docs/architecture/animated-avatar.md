# Animated portfolio avatar

The immersive player loads `public/assets/avatar/daniel-animated-avatar.glb` after validating its
skin, required bones, clips, and unit scale. A muted, static ground ring and direction pointer mark the controllable player while loading;
the procedural body stays hidden until a failure or a 15-second loading timeout. Once GPU preparation
finishes, the approved avatar fades in over 450 ms as the cue fades out, at the player's current
position and facing. A late successful download crossfades from the usable mannequin fallback.
The handoff changes opacity only and preserves movement and Caps Lock gait state. Reduced motion
skips the fade (including when enabled mid-transition), retaining a stable idle pose.
Re-entering immersive mode or reloading retries the asset with a fresh marker and timeout.
The text portfolio remains independent of the model download.
Opaque and transparent reveal shaders for the avatar, accessories, and recovery body, plus the
pixel atlas, are prepared before the visible swap. The fade respects software-safe frame cadence. Parallel shader polling
is cancellable on scene teardown and bounded to five seconds, revealing the mannequin on failure.

The approved asset has 2,976 triangles, one skinned mesh/material, 20 bones, an embedded 128 px
atlas, and an authored standing height of approximately 1.872 meters. Runtime normalizes measured
bounds to 1.90 meters and uses nearest filtering. See [scene units](scene-units.md) for the
measured dimensional inventory and outstanding architecture migration.
It contains no raw reference photograph. Keep model revisions separate from controller changes.

## Animation contract

The model is Y-up, faces +Z, uses unit root scale, and includes `Hips` and `Spine`. Required clips
are `Idle`, `Walk`, `Run`, `SitDown`, `Seated`, and `StandUp`. The loader subtracts the shared
first-key time from each clip to remove the frame-one leading hold. Translation and yaw belong
to the existing camera-relative movement controller; locomotion clips remain in place.

Walking is 1.116453 metres/second; running is 3.044872 (20% faster than the previous run pace).
The gait constants are 1.1 and 3.0 metres/second multiplied by the 1.90 / 1.872 body scale ratio.
Exported stride references (0.85446 and 1.57199 before body scaling) remain unchanged;
the animation playback ceiling is 2.0 so the faster run cadence is not clamped.
**Caps Lock off means running (the default); on means walking.** Modifier state is observed on
keyboard events without consuming UI-owned or remapped keys. Repeat cannot toggle again, and the
first keyboard event after focus returns resynchronizes the physical lock. The touch gait button
writes the same state; the next keyboard event restores the physical lock state. The selected gait
also owns the animation clip, while actual speed controls idle blending and stride playback.
Automatic doors
use the same maximum run speed as movement when calculating proximity lead and opening motion.

Reduced motion retains movement control but presents a stable idle pose; seating transitions
snap between validated positions. Camera framing and mirror height use the loaded model height.
The conservative collision radius remains 0.75 metres and contains the normalized body. The conservative 2.6 metre
traversal-height envelope remains separate from visual height, preserving unsafe-route exclusions
below stairs until the architectural migration is complete.
Placeholder foot offsets are detached for the skeletal model. Seated foot grounding rotates
the two-bone leg chains while retaining bone lengths.

## Supported seating

The two living-room lounge chairs and the studio reading chair expose seat anchors derived
from their actual transforms and cushion heights (0.47 m and 0.62 m). The authored animation's
0.40 m cushion height and 0.395 m hip retreat are scaled with the body and compensated at runtime. Other furniture keeps
its existing interaction behavior until individual seat and clearance metadata is supplied.
Taller cushions shift the seated root forward by the extra height so grounded knees clear the
front edge instead of passing through the cushion.

Near a supported chair, use the displayed **Sit in chair (Interact)** button or the existing
Interact binding. The controller approaches a clear standing point, enters the seat, holds the
seated pose, and stands on interaction or movement input. Movement cancels an unfinished approach.
Every transition samples its path against the current floor and colliders. Only the chosen
chair's collider is excluded during entry/exit; neighboring furniture and doors remain solid.
Exit candidates are rechecked before standing. An obstructed exit leaves the player seated.
Graphics reloads persist a checked standing position rather than the seated root; if all nearby
standing points are blocked, reload uses the default spawn. The accessory owner retains the
loaded avatar's drone baseline across animation updates.

## Validation

- `npm run test:ci -- src/tests/animatedAvatar.test.ts src/tests/chairController.test.ts src/systems/controls/gaitToggle.test.ts`
- `npm run test:e2e -- playwright/avatar-integration.spec.ts --workers=1`
- Run repository type, lint, format, docs, smoke, miniature and performance checks before review.
- Preview with `?mode=immersive&disablePerformanceFailover=1`; inspect front/side movement,
  each supported chair, blocked exits, reduced motion, touch controls and text fallback.

`window.portfolio.avatar` exposes animation, gait and seating snapshots for browser regression
checks. The GLB remains replaceable without changing the interaction state machine.
