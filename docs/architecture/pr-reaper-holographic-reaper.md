# PR Reaper holographic reaping installation design

P5a is documentation-only. It replaces the current design intent for the
`PrReaperConsole` with a procedural Three.js installation that later prompts can
implement without adding external models, textures, audio, network data, physics,
IK libraries, or recursive miniature behavior.

## Existing integration surface investigated

- Runtime builder: `src/scene/structures/prReaperConsole.ts` currently returns a
  `PrReaperConsoleBuild` with `group`, factory-owned `colliders`, and
  `update({ elapsed, delta, emphasis })`.
- Current tests: `src/tests/prReaperConsole.test.ts` assert semantic object names,
  rotation-aware colliders, accessibility pulse damping, animated emissive
  surfaces, incident-log canvas rendering, and teardown expectations.
- Main-scene integration: `src/main.ts` resolves the
  `pr-reaper-backyard-console` POI, calls `createPrReaperConsole(...)`, registers
  scene-object source metadata/colliders, attaches the group with
  `addPoiStructure(...)`, updates it every frame, and nulls the handle during
  immersive teardown.
- Placement/metadata: the POI registry places the project in the backyard at
  `{ x: 0, y: 0, z: 20 }` with heading `Math.PI * 0.35` and footprint
  `2.4 x 2.0`; the declarative scene-object migration test mirrors a factory
  placement at `{ x: 1.5, y: 0, z: 0.525 }` with the same heading.
- Shared dimensions: `WALL_HEIGHT = 6` and `CEILING_COVE_OFFSET = 0.35` live in
  `src/scene/structures/portfolioSceneLayout.ts`; LED strips mount at
  `WALL_HEIGHT - CEILING_COVE_OFFSET`.
- Deterministic procedural precedent: `src/scene/structures/tokenPlaceWorkstation.ts`
  defines a local `mulberry32(seed)` helper, threads the returned random source into
  row/glyph generation, and stores the generated terminal pattern as state. P5b-P5e
  should mirror the seeded-stream shape but expose the PR Reaper random source through
  the builder contract for tests.
- Procedural structure/detail precedent: `src/scene/structures/sugarkubeDeployment.ts`
  builds named Groups/Meshes, varies geometry/detail counts by `SceneDetailPolicy`,
  creates rotation-aware factory colliders, and animates owned emissive materials. It
  does not currently expose a `dispose()` method, so PR Reaper disposal must follow
  the stricter ownership contract below rather than copying that omission.
- Emissive/bloom precedent: `src/scene/lighting/ledStrips.ts` creates room-owned
  emissive strip materials, fill lights, and seasonal lighting targets. The PR Reaper
  laser should adapt the cool emissive/additive visual language without registering
  its beam materials or state in the room LED-strip arrays.
- Footprint/collider metadata: `src/scene/poi/physicalMetadata.ts` records POI
  `intendedSceneBounds`, bottom-center anchors, and clearance expectations where
  needed. `src/tests/sceneObjectColliderPolicies.test.ts` verifies migrated factory
  colliders register with scene-object metadata and purpose `factory-colliders`.
- Detail policy: `src/scene/graphics/sceneDetailPolicy.ts` defines five internal
  levels: Cinematic, Balanced, Performance, Low, and Micro.
- Miniature: `poiProxyRegistry.ts`, `sceneComponentRegistry.ts`,
  `portfolioMiniatureTable.ts`, and `docs/architecture/miniature-tabletop.md`
  establish static POI proxies, `sourceFiles`, `syncRevision`, generated manifest
  checks, and no recursive simulation inside the tabletop.
- Particle precedent: `src/scene/environments/backyard.ts` uses pooled
  `BufferGeometry`, `BufferAttribute`, `Points`, and `PointsMaterial` animation
  for motes/fireflies/barrier emitters. Future PR Reaper burst code should copy
  that pattern but replace the existing `Math.random()` construction-time usage
  with an injected seeded generator.

## Coordinate and physical-size contract

### Root, axes, and anchor

`PrReaperInstallation` is a bottom-center, unit-scale `Group` placed at the
resolved POI anchor and heading:

```ts
createPrReaperInstallation({
  position: {
    x: prReaperPoi.group.position.x,
    y: prReaperPoi.group.position.y,
    z: prReaperPoi.group.position.z,
  },
  orientationRadians: prReaperPoi.group.rotation.y ?? 0,
  detailPolicy: activeSceneDetailPolicy,
  seed: 'pr-reaper-holographic-reaper:v1',
});
```

Local axes after applying the POI heading:

```text
                 +Y up
                  |
                  |     hologram plane: local Z = 0
                  |
  -X left <-------O-------> +X right
                 /|
                / |
               /  +Z front, toward viewer/avatar/robot stand-off
              /
             -Z back, toward wall/projector rear

Root origin O: bottom-center of the active hologram glass at floor height on the screen
plane (`local Z = 0`), not the geometric center of the full footprint. The
footprint is intentionally asymmetric around this origin: rear projector allowance
extends toward `-Z`, and robot stand-off extends toward `+Z`.
Screen origin: bottom-center of active hologram glass, also centered on local X.
Robot base: in front of screen on +Z.
```

The installation must be authored entirely in local coordinates and transformed
through `installation.group.matrixWorld` so aiming and colliders remain correct
for the current nonzero POI heading (`Math.PI * 0.35`) and future headings.

### Shared dimensions and proposed constants

Use shared scene constants rather than unrelated magic heights:

```ts
const PR_REAPER_COVE_CLEARANCE = 0.18;
const PR_REAPER_DISPLAY_FLOOR_CLEARANCE = 0.42;
const PR_REAPER_PROJECTOR_HEIGHT = 0.32;
const PR_REAPER_PROJECTOR_SCREEN_GAP = 0.1;
const PR_REAPER_AVAILABLE_LED_SAFE_HEIGHT = WALL_HEIGHT - CEILING_COVE_OFFSET;
const PR_REAPER_SCREEN_TOP_MAX =
  PR_REAPER_AVAILABLE_LED_SAFE_HEIGHT - PR_REAPER_COVE_CLEARANCE;
const PR_REAPER_SCREEN_HEIGHT = Math.min(
  WALL_HEIGHT * 0.84,
  PR_REAPER_SCREEN_TOP_MAX - PR_REAPER_DISPLAY_FLOOR_CLEARANCE
);
const PR_REAPER_SCREEN_WIDTH = PR_REAPER_SCREEN_HEIGHT * (9 / 21);
const PR_REAPER_SCREEN_BOTTOM_Y = PR_REAPER_DISPLAY_FLOOR_CLEARANCE;
const PR_REAPER_SCREEN_CENTER_Y =
  PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT / 2;
const PR_REAPER_SCREEN_PLANE_Z = 0;
```

With current constants, `WALL_HEIGHT = 6` and `CEILING_COVE_OFFSET = 0.35`:

- LED/cove safe height: `5.65`.
- Maximum screen top: `5.47`.
- Proposed screen height: `min(5.04, 5.47 - 0.42) = 5.04`, which is `84%` of wall
  height and safely above the required ~82%.
- Screen top: `0.42 + 5.04 = 5.46`, leaving `0.19` below the LED/cove safe height
  and `0.54` below the wall top.
- Exact 9:21 width: `5.04 * 9 / 21 = 2.16`.

Projector placement:

```ts
const PR_REAPER_PROJECTOR_WIDTH = PR_REAPER_SCREEN_WIDTH * 0.72; // 1.5552
const PR_REAPER_PROJECTOR_DEPTH = 0.62;
const PR_REAPER_PROJECTOR_CENTER_Y = PR_REAPER_PROJECTOR_HEIGHT / 2; // 0.16
const PR_REAPER_PROJECTOR_CENTER_Z = -0.06;
```

The projector base is directly below the screen: its local X center equals the
screen X center (`0`), and its top (`0.32`) plus the `0.10` gap equals the screen
bottom (`0.42`). The base may extend slightly behind the screen plane in local Z
for stability, but the visual lens remains centered on local `Z = 0`.

### Robotic stand-off invariant and footprint expansion

The laser emitter/tool flange must remain at least half the hologram height away
from the hologram plane for every legal yaw/pitch pose:

```ts
const PR_REAPER_MIN_EMITTER_STANDOFF = PR_REAPER_SCREEN_HEIGHT / 2; // 2.52
```

Use a two-link-looking, single-pitch-axis arm where both rigid visual links stay
behind the tool flange, but only yaw and shoulder pitch are animated. Enforce the
invariant by setting the shoulder pivot and mechanical reach so the closest
possible emitter position remains in front of the screen plane:

```ts
const PR_REAPER_ROBOT_BASE_Z_REJECTED_DRAFT =
  PR_REAPER_MIN_EMITTER_STANDOFF + 0.72; // 3.24
const PR_REAPER_SHOULDER_Y = 0.84;
const PR_REAPER_SHOULDER_Z = PR_REAPER_ROBOT_BASE_Z_REJECTED_DRAFT;
const PR_REAPER_ARM_LINK_LENGTH = 0.64;
const PR_REAPER_TOOL_FORWARD = 0.18;
const PR_REAPER_EMITTER_LOCAL_Z = 0.06;
const PR_REAPER_EMITTER_MIN_LOCAL_Z =
  PR_REAPER_SHOULDER_Z - PR_REAPER_ARM_LINK_LENGTH - PR_REAPER_TOOL_FORWARD;
```

`PR_REAPER_EMITTER_MIN_LOCAL_Z = 2.42`, which is too small. Therefore the
current 2.0-depth footprint cannot satisfy the invariant, and even the first
expanded draft above is short by `0.10`. Increase base stand-off to:

```ts
const PR_REAPER_ROBOT_BASE_Z =
  PR_REAPER_MIN_EMITTER_STANDOFF +
  PR_REAPER_ARM_LINK_LENGTH +
  PR_REAPER_TOOL_FORWARD +
  0.08;
// 3.42, giving closest emitter Z = 2.60 >= 2.52
```

The smallest justified footprint depth is the maximum forward extent plus rear
projector allowance. Because the root remains on the screen plane, these are
asymmetric extents from `local Z = 0`; do not recenter the installation group to
the footprint midpoint. Collider centers should be offset by
`(PR_REAPER_FRONT_DEPTH - PR_REAPER_REAR_DEPTH) / 2` in local `+Z` before heading
rotation, while the screen stays at the POI anchor.

```ts
const PR_REAPER_REAR_DEPTH = 0.42;
const PR_REAPER_FRONT_DEPTH = PR_REAPER_ROBOT_BASE_Z + 0.38; // base radius/collider pad
const PR_REAPER_FOOTPRINT_DEPTH = PR_REAPER_REAR_DEPTH + PR_REAPER_FRONT_DEPTH; // 4.22
const PR_REAPER_FOOTPRINT_WIDTH = Math.max(PR_REAPER_SCREEN_WIDTH + 0.46, 2.62);
```

Documented tradeoff: keep the POI anchor fixed and expand only the factory
collider/metadata footprint from roughly `2.4 x 2.0` to `2.62 x 4.22`. The
backyard/studio path constraints must be remeasured in P5b. Move the POI only if
collider audits prove this expanded footprint blocks required traversal.

## Procedural model hierarchy

Stable names are part of the test contract. The implementation should create:

```text
PrReaperInstallation
├─ PrReaperProjectorBase
│  ├─ PrReaperProjectorLens
│  └─ PrReaperProjectorAccent-* (detail dependent)
├─ PrReaperHologramRoot
│  ├─ PrReaperHologramScreen
│  ├─ PrReaperHologramFrame-* (detail dependent)
│  └─ PrReaperPrCircleRoot
│     └─ PrReaperPrCircle-<stableId> (pooled circle meshes)
├─ PrReaperRobotBase
│  └─ PrReaperYawJoint              // animated Y rotation only
│     └─ PrReaperPitchJoint         // animated local X rotation only
│        ├─ PrReaperArmLink
│        └─ PrReaperToolFlange
│           └─ PrReaperLaserEmitter
│              ├─ PrReaperLaserCore (visible only while firing)
│              └─ PrReaperLaserGlow (detail/accessibility dependent)
└─ PrReaperParticleRoot
   └─ PrReaperParticleBurstPool-* (pooled Points)
```

The arm has exactly two animated rotational axes:

1. base yaw around local/world-up `Y` in `PrReaperYawJoint`;
2. shoulder pitch around `PrReaperPitchJoint` local `X`.

No animated elbow, wrist, hidden look-at group, beam-only correction joint, or
per-frame target parenting is allowed. Visual barrel alignment must derive from
these two angles; if a target is unreachable within clamps, it is skipped.

## Holographic PR stream model

Use real circle meshes in screen-local space. A red/green PR circle has an exact
center point that the robot can transform into arm-base space.

### Pure state

```ts
type PrReaperCircleType = 'red' | 'green';
type PrReaperCircleLifecycle = 'active';

interface PrReaperCircleState {
  id: number;
  type: PrReaperCircleType;
  normalizedX: number; // 0 left screen edge, 1 right screen edge
  progress: number; // 0 just above screen, 1 below screen
  center: { x: number; y: number; z: number };
  lifecycle: PrReaperCircleLifecycle;
}
```

P5c implements this as the pure `src/scene/structures/prReaperStream.ts`
module. Its public surface is `createPrReaperSeededRandom(...)`,
`createPrReaperStream(...)`, `PrReaperStreamState.writeActiveCandidates(...)`,
and the `PrReaperStreamState.getDebugState()` snapshot used by installation tests
and the future targeting pass. Runtime rendering uses `writeActiveCandidates(...)`
so the render loop can reuse a preallocated active-candidate buffer and avoid
cloning debug history every frame. P5c deliberately omits reaped/firing/burst
target states; red and green circles only descend and are removed after expiry.

Constants live in `src/scene/structures/prReaperInstallationContract.ts`:

```ts
const PR_REAPER_STREAM_CIRCLE_RADIUS = PR_REAPER_SCREEN_WIDTH * 0.055;
const PR_REAPER_STREAM_HORIZONTAL_MARGIN = PR_REAPER_SCREEN_WIDTH * 0.045;
const PR_REAPER_STREAM_START_Y = screenTop + PR_REAPER_STREAM_CIRCLE_RADIUS;
const PR_REAPER_STREAM_END_Y = screenBottom - PR_REAPER_STREAM_CIRCLE_RADIUS;
const PR_REAPER_STREAM_DESCENT_DURATION_SECONDS = 5.5;
const PR_REAPER_STREAM_SPAWN_INTERVAL_MIN_SECONDS = 0.5;
const PR_REAPER_STREAM_SPAWN_INTERVAL_MAX_SECONDS = 1.5;
const PR_REAPER_STREAM_MAX_CATCH_UP_SPAWNS = 8;
const PR_REAPER_PR_CIRCLE_POOL_CAPACITY =
  Math.ceil(
    PR_REAPER_STREAM_DESCENT_DURATION_SECONDS /
      PR_REAPER_STREAM_SPAWN_INTERVAL_MIN_SECONDS
  ) + PR_REAPER_STREAM_MAX_CATCH_UP_SPAWNS; // currently 19
```

Mapping from normalized state to screen-local center:

```ts
const x = -PR_REAPER_SCREEN_WIDTH / 2 + normalizedX * PR_REAPER_SCREEN_WIDTH;
const y = MathUtils.lerp(
  PR_REAPER_STREAM_START_Y,
  PR_REAPER_STREAM_END_Y,
  progress
);
const z = PR_REAPER_STREAM_Z;
```

### Deterministic randomness and 3:1 ratio

Randomness must be injectable and deterministic. Follow existing seeded-solver
patterns documented in `docs/architecture/poi-placement.md` and the `mulberry32`
usage in `src/scene/structures/tokenPlaceWorkstation.ts`; expose a small
repository-native PRNG such as `createSeededRandom(seed: string): () => number`.
Do not call `Math.random()` in the animation loop. The runtime default is
`createSeededRandom(seed ?? 'pr-reaper-holographic-reaper:v1')`; tests may pass
`random` directly. When both `random` and `seed` are provided, `random` wins and
`seed` is retained only for debug-state labeling.

Spawn order is an infinite sequence of shuffled batches containing exactly:

```ts
['red', 'red', 'red', 'green'];
```

Shuffling is deterministic per batch. The 3:1 ratio applies to the spawned
candidate stream, not the visible active set. In P5c both red and green circles
simply descend and expire; P5d will add red-circle targeting/reaping behavior.

For each candidate:

- interval = `lerp(0.5, 1.5, rng())` seconds;
- `normalizedX = lerp(PR_REAPER_CIRCLE_MARGIN_X, 1 - PR_REAPER_CIRCLE_MARGIN_X, rng())`;
- spawn due time advances by the interval even if detail policy is Micro;
- never drop red or green candidates solely for performance.
- negative and nonfinite deltas clamp to zero; suspended-tab catch-up clamps the
  effective delta to `PR_REAPER_STREAM_MAX_DELTA_SECONDS` and processes at most
  `PR_REAPER_STREAM_MAX_CATCH_UP_SPAWNS` spawns before recording a capped-spawn
  debug count and rescheduling from the current stream time.

### Pooling and active-count calculation

Worst case no red is reaped and all circles live for `DESCENT_SECONDS` plus one
spawn interval. At the minimum `0.5s` interval:

```ts
const PR_REAPER_MAX_ACTIVE_CIRCLES =
  Math.ceil(
    (PR_REAPER_DESCENT_SECONDS + PR_REAPER_SPAWN_INTERVAL_MAX) /
      PR_REAPER_SPAWN_INTERVAL_MIN
  ) + 2;
// ceil(8.7 / 0.5) + 2 = 20
```

Preallocate at least 20 circle meshes and 4 pending burst slots. Per frame, update
mesh transforms/material opacity only; do not allocate new meshes, arrays,
materials, geometries, colors, or vectors in the hot path.

## Reaping state machine

Pure controller state:

```ts
type PrReaperArmPhase =
  | 'idle'
  | 'acquire'
  | 'track'
  | 'fire'
  | 'burst'
  | 'recover';

interface PrReaperArmState {
  phase: PrReaperArmPhase;
  targetId: number | null;
  yaw: number;
  pitch: number;
  phaseStartedAt: number;
  lastShotTargetId: number | null;
  cooldownUntil: number;
  aimHoldStartedAt?: number;
}
```

Rules:

- Only red circles with `lifecycle === 'active'` and `targetState === 'none'` are
  candidates. Green circles are never targeted, removed, marked assigned, or used
  as fallback targets.
- Shooting band keeps red circles visible before removal:
  `0.18 <= progress <= 0.78`.
- Deterministic priority: choose the lowest visible reachable red circle
  (largest `progress` in the band); break ties by older `spawnTime`, then lower
  `id`.
- `idle`: if `now >= cooldownUntil`, acquire the priority target.
- `acquire`: mark `targetState = 'assigned'`; if target expires or leaves band,
  clear assignment and return to `idle`.
- `track`: damp yaw/pitch toward solved angles. Enter `fire` only when both axes
  are within tolerance for a brief hold.
- `fire`: set `targetState = 'firing'`, show laser for `0.10s`, and remove the red
  circle exactly once. `lastShotTargetId` prevents double fire.
- `burst`: run a deterministic particle burst for that target. Circle mesh stays
  hidden and lifecycle is `reaped`.
- `recover`: keep the arm smooth and return toward a parked pose or next target;
  impose `0.18s` cooldown.

Suggested timing and tolerances:

```ts
const PR_REAPER_AIM_YAW_SPEED = MathUtils.degToRad(360); // rad/s max
const PR_REAPER_AIM_PITCH_SPEED = MathUtils.degToRad(300);
const PR_REAPER_AIM_DAMPING = 14;
const PR_REAPER_AIM_TOLERANCE = MathUtils.degToRad(1.2);
const PR_REAPER_AIM_HOLD_SECONDS = 0.045;
const PR_REAPER_LASER_SECONDS = 0.1;
const PR_REAPER_RECOVER_SECONDS = 0.18;
```

At minimum spawn interval (`0.5s`), the arm has roughly `0.5s` per new candidate
and should keep up without snapping by solving nearest/lowest red candidates and
using high but clamped angular velocity. If a target expires before firing, its
assignment is cleared and the expired candidate is removed; the state machine
immediately reacquires the next deterministic red candidate.

## Two-axis aiming math

All math must be local-space and heading-safe.

1. Compute target circle center in screen local space using the stream formula.
2. Convert to world with `hologramRoot.localToWorld(targetWorld)`.
3. Convert to yaw-joint/robot-base space with
   `yawJoint.worldToLocal(targetInYawSpace.copy(targetWorld))`.
4. Solve yaw around Y:

```ts
const yawTarget = Math.atan2(targetInYawSpace.x, -targetInYawSpace.z);
```

The negative-Z convention means the arm aims back from its +Z stand-off toward
the screen plane. If implementation chooses the barrel's rest direction as +Z,
flip this formula once in a named constant and test the nonzero heading case.

5. Clamp yaw:

```ts
const yaw = MathUtils.clamp(
  yawTarget,
  -MathUtils.degToRad(42),
  MathUtils.degToRad(42)
);
const yawReachable = Math.abs(yaw - yawTarget) <= PR_REAPER_AIM_TOLERANCE;
```

6. Transform target into pitch-joint space after applying clamped yaw. Solve
   pitch around local X from the horizontal distance along barrel-forward and
   vertical delta:

```ts
const dz = -targetInPitchSpace.z;
const dy = targetInPitchSpace.y;
const pitchTarget = Math.atan2(dy, dz);
```

7. Clamp pitch:

```ts
const pitch = MathUtils.clamp(
  pitchTarget,
  MathUtils.degToRad(-28),
  MathUtils.degToRad(58)
);
const pitchReachable = Math.abs(pitch - pitchTarget) <= PR_REAPER_AIM_TOLERANCE;
```

8. Damping and velocity clamp:

```ts
const damped = MathUtils.damp(current, target, PR_REAPER_AIM_DAMPING, delta);
const maxStep = angularSpeed * delta;
const next = current + MathUtils.clamp(damped - current, -maxStep, maxStep);
```

9. Tool flange and emitter positions are authored as children of
   `PrReaperPitchJoint`. Use `emitter.getWorldPosition(emitterWorld)` every
   firing frame. The beam end is the target circle center from step 2. Verify:

```ts
const standoff = Math.abs(
  emitterLocalToInstallation.z - PR_REAPER_SCREEN_PLANE_Z
);
expect(standoff).toBeGreaterThanOrEqual(PR_REAPER_MIN_EMITTER_STANDOFF);
```

If yaw/pitch clamps make a target unreachable, leave it active and unassigned;
greens and unreachable reds descend normally.

## Laser geometry and glow

No new rendering dependency. Use reusable Three.js primitives:

- `PrReaperLaserCore`: thin `CylinderGeometry` or `BoxGeometry` with bright green
  `MeshBasicMaterial`, additive blending, depthWrite false.
- `PrReaperLaserGlow`: wider translucent green cylinder/box with additive
  blending, opacity controlled by detail/accessibility.

For each firing frame:

```ts
beamVector.subVectors(targetWorld, emitterWorld);
const length = beamVector.length();
beamWorldMidpoint.copy(emitterWorld).addScaledVector(beamVector, 0.5);

// Core/glow meshes are children of PrReaperLaserEmitter, so convert world-space
// firing geometry into that parent's local frame before writing transforms.
beam.parent.updateWorldMatrix(true, false);
beam.position.copy(beam.parent.worldToLocal(beamWorldMidpoint.clone()));
beamLocalTarget.copy(beam.parent.worldToLocal(targetWorld.clone()));
beamLocalEmitter.copy(beam.parent.worldToLocal(emitterWorld.clone()));
beamLocalVector.subVectors(beamLocalTarget, beamLocalEmitter).normalize();
beam.scale.set(coreRadius, length, coreRadius); // if cylinder height is unit-Y
beam.quaternion.setFromUnitVectors(Y_AXIS, beamLocalVector);
```

The target endpoint equals the exact center of the red circle every firing frame.
There is no dynamic point light and no full-screen flash. Emissive/bloom language
should match room LED strips visually (cool green, soft additive halo), but beam
materials are owned by the PR Reaper builder and are not coupled to LED-strip
arrays or seasonal lighting targets.

Cheaper representations:

- Performance: core plus one halo, lower segment count.
- Low: core only, wider flat rectangular beam acceptable.
- Micro: one short static green line/hint during fire; no halo pulse.

## Particle burst

Use deterministic pooled `Points`, following backyard pooled-points patterns.

```ts
interface PrReaperBurstState {
  slot: number;
  targetId: number;
  origin: Vector3Tuple;
  startedAt: number;
  duration: number; // uniform 0.25-0.50
  active: boolean;
}
```

On burst start:

- origin is the reaped circle center in world or installation-local space;
- duration = `lerp(0.25, 0.5, rng())`;
- velocities are deterministic radial/upward samples from the injected PRNG;
- write initial positions/velocities into preallocated typed arrays;
- do not create per-particle meshes during firing.

Per update:

- `age01 = clamp((now - startedAt) / duration, 0, 1)`;
- `age = now - startedAt`;
- `burstGravity = new Vector3(0, -1.15 * age * age, 0)` in meters;
- position = `origin + (velocity * age + burstGravity) * reducedMotionTravelScale`;
- opacity fades with `(1 - age01)`;
- hide slot and release it when age reaches 1.

Dispose every `BufferAttribute`, `BufferGeometry`, and `PointsMaterial`. No
particle dynamic lights.

## Detail policies and budgets

Semantic stream and exact 3:1 candidate ratio are preserved at all levels.
Performance reductions affect visual fidelity, never candidate correctness. P5c
varies the pooled `CircleGeometry` segment count and material intensity by detail
policy; it does not skip candidates, alter spawn intervals, or change descent
timing.

| Level       | Screen/frame                                                        | Circles   | Laser               | Burst particles          | Decorative details        | Target budget              |
| ----------- | ------------------------------------------------------------------- | --------- | ------------------- | ------------------------ | ------------------------- | -------------------------- |
| Cinematic   | 64 segment circles, translucent pane, frame ribs, projector accents | 20 pooled | core + 2 halos      | 96 x 4 slots             | cables, bolts, glow rings | ~3.8k tris / 18 draw calls |
| Balanced    | same structure, fewer ribs                                          | 20 pooled | core + 1 halo       | 64 x 4                   | fewer accents             | ~2.6k tris / 15 draw calls |
| Performance | 10-16 segment circles                                               | 20 pooled | core + 1 cheap halo | 32 x 3                   | no cables                 | ~1.2k tris / 10 draw calls |
| Low         | 8 segment circles                                                   | 20 pooled | core only           | 16 x 2, half-rate update | minimal base/screen/arm   | ~650 tris / 7 draw calls   |
| Micro       | octagonal discs or tiny planes                                      | 20 pooled | one line/box hint   | 8 x 1, coarse update     | no accents                | ~300 tris / 5 draw calls   |

Use `detailPolicy.geometry.*` segment counts and `detailPolicy.effects.*` to
select primitives. Do not skip candidates, avoid lowering spawn frequency, and do
not disable green-circle descent in low modes.

## Accessibility

Use `getPulseScale()` for breathing/glow scale and `getFlickerScale()` for rapid
emissive variation. Reduced-motion/flicker behavior must:

- preserve spawn intervals, 3:1 ratio, descent, targeting, and red removal;
- avoid strobing by clamping beam/halo opacity to steady values;
- suppress or soften laser halo pulses when `flickerScale` is low;
- reduce particle velocity/travel and brightness with `pulseScale`, but keep a
  short visible burst so the metaphor remains understandable;
- keep arm damping active and smooth rather than snapping to final angles;
- leave green immunity unchanged.

Suggested scales:

```ts
const pulseScale = getPulseScale();
const flickerScale = getFlickerScale();
const haloPulse = MathUtils.lerp(0, computedPulse, pulseScale * flickerScale);
const particleTravelScale = MathUtils.lerp(0.35, 1, pulseScale);
const particleOpacityScale = MathUtils.lerp(0.45, 1, flickerScale);
```

## Runtime and lifecycle integration

Final builder contract for P5b-P5e:

```ts
interface PrReaperInstallationBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
  getDebugState(): PrReaperDebugState;
  dispose(): void;
}

type PrReaperRandomSource = () => number;

interface PrReaperInstallationOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  detailPolicy: SceneDetailPolicy;
  seed?: string | number;
  random?: PrReaperRandomSource;
}
```

Integration requirements:

- Replace the old console builder in `main.ts` but keep `addPoiStructure(...)` so
  model roots, triangle metrics, and visual anchors remain registered.
- Pass `detailPolicy: activeSceneDetailPolicy`. Runtime may pass only `seed`; tests may
  inject `random?: PrReaperRandomSource` to assert exact streams/bursts while leaving
  production on the documented seeded generator. Use quality-triggered reloads
  to rebuild the installation at the new policy. Since scene detail changes
  already reload/recompose the immersive scene, no in-place policy mutation is
  required.
- The core stream advances in every `update(...)` call even when the POI is not
  focused. `emphasis` may raise screen brightness, halo opacity, and projector
  accents only.
- Colliders belong to the factory and should cover projector base plus robot base
  footprint, not individual moving arm links. Register via existing
  `registerSceneObjectColliders(...)` path.
- Builder owns all geometries/materials/textures it creates. `dispose()` is
  idempotent and must dispose circles, screen, beam, particles, projector, robot,
  and any canvas textures if retained.
- Full and partial immersive teardown must call `dispose()` before nulling the
  handle; P5b should improve current `prReaperConsole = null` behavior.
- `getDebugState()` should expose constants, active circles, upcoming batch
  sequence summary, arm phase, target id, yaw/pitch, beam endpoints, burst slots,
  and detail/accessibility flags for tests without mutating Three.js objects.

## Miniature synchronization

The tabletop proxy is static and recognizable only. It must not animate, run the
stream simulation, call the PRNG, or include recursive behavior. Proxy contents:

- projector base;
- tall translucent-blue 9:21 screen silhouette;
- three red circle hints and one green circle hint;
- two-axis arm silhouette with base, yaw column, pitched link, and tool flange;
- laser-gun/tool-flange silhouette;
- optional short green beam hint.

For P5b-P5e, update the `pr-reaper-backyard-console` entry in
`src/scene/miniature/poiProxyRegistry.ts` and keep its manifest in sync:

- Rename the display note from console to holographic reaper installation.
- Treat `sourceFiles` as the explicit dependency list for the proxy's geometry and
  semantics. Include these entries when the corresponding implementation PR lands:
  - Always for P5b+: `src/scene/poi/registry.ts`, `src/scene/poi/placements.ts`,
    `src/scene/poi/constants.ts`, `src/scene/level/portfolioLevel.ts`,
    `src/scene/structures/portfolioSceneLayout.ts`, and the implementation file
    (`src/scene/structures/prReaperConsole.ts` until renamed, then the renamed PR
    Reaper installation file). `portfolioSceneLayout.ts` is required because the
    proxy's 9:21 screen proportions and cove clearance depend on wall/cove constants.
  - P5b if added/changed: `src/scene/poi/physicalMetadata.ts` for footprint,
    intended bounds, marker height, or avatar clearance metadata.
  - P5c when split out: any new PR Reaper stream/random module that defines the
    3-red/1-green hint semantics. If the stream remains in the main installation
    file, do not add a nonexistent path.
  - P5d when split out: any new PR Reaper arm/kinematics/laser/burst module that
    defines the tool-flange or beam silhouette. If these stay in the main
    installation file, do not add a nonexistent path.
  - P5e if thresholds influence proxy geometry: `src/scene/graphics/sceneDetailPolicy.ts`.
- Bump `syncRevision` in the same PR as each semantic proxy change:
  - P5b: `3` for static hologram/projector/robot proxy, footprint, and screen
    proportions.
  - P5c: `4` for static 3-red/1-green stream hints and any stream sourceFiles.
  - P5d: `5` for beam/tool-flange silhouette and any kinematics/laser sourceFiles.
  - P5e: `6` only when final footprint/accessibility/performance hardening changes
    proxy geometry, sourceFiles, or detail semantics; otherwise leave it at the
    latest already-applied revision.
- After any implementation PR touches the proxy or its `sourceFiles`, run
  `npm run miniature:manifest:update` and commit the generated manifest changes in
  that same implementation PR. P5a does not touch the proxy or generated manifest
  because this PR is documentation-only.

## Testing matrix

Future PRs should add/adjust Vitest coverage for:

- geometry dimensions: exact `screenWidth / screenHeight === 9 / 21`;
- screen height at least 82% of `WALL_HEIGHT`;
- screen top below `WALL_HEIGHT - CEILING_COVE_OFFSET` with clearance;
- projector directly beneath screen and display clear of floor;
- stand-off invariant for parked and sampled legal yaw/pitch poses;
- footprint expansion and collider centers under nonzero POI rotation;
- deterministic PRNG sequences for the same seed and different sequences for
  different seeds;
- spawn intervals always within `0.5-1.5s`;
- exact 3:1 red/green ratio in every complete shuffled batch;
- horizontal positions keep full circles visible;
- descent progress and expiration at bottom;
- green immunity from assignment, firing, removal, and burst creation;
- target priority: lowest visible red, then oldest, then id;
- target expiration before firing returns state to idle/acquire safely;
- safeguards against firing twice at one target;
- two-axis kinematics under current `Math.PI * 0.35` heading and at another
  arbitrary heading;
- yaw/pitch clamp unreachable detection;
- exact beam core/glow endpoint equals red circle center each firing frame;
- laser duration and cooldown timing;
- particle burst duration always `0.25-0.50s` and deterministic velocities;
- detail-policy monotonic reductions in segments, particles, triangles, draw
  calls, and decorative features;
- reduced-motion/flicker scales reduce pulses/travel without changing stream
  semantics;
- colliders register with scene-object metadata;
- `dispose()` is idempotent and disposes owned geometry/material/attribute assets;
- miniature proxy includes projector, 9:21 screen, three red hints, one green hint,
  arm silhouette, tool flange, and optional beam hint;
- miniature manifest freshness after registry changes;
- full/partial immersive teardown calls dispose and clears handles.

## PR decomposition

### P5b — Static hologram/projector/robot installation

- Replace abstract console visuals with static procedural hierarchy, exact
  dimensions, footprint/colliders, detail variants, metadata, disposal, and
  static miniature proxy.
- No stream simulation, targeting, laser, or particles yet.
- Depends on P5a constants and hierarchy.

### P5c — Deterministic 3:1 descending PR stream

- Add pure seeded stream state, shuffled 3-red/1-green batches, spawn intervals,
  horizontal bounds, descent/expiration, circle mesh pool, debug state, and tests.
- No arm targeting or removal yet.
- Depends on P5b screen/circle root and debug contract.

### P5d — Two-axis targeting, laser reaping, and particles

- Add pure arm state machine, yaw/pitch math, red-only priority, exact-center
  beam endpoints, red removal, deterministic pooled bursts, and tests.
- Depends on P5c circle targets and P5b robot hierarchy.

### P5e — Hardening, accessibility, performance, miniature sync, final QA

- Finalize reduced-motion/flicker behavior, detail budgets, collider audits,
  disposal/teardown, quality reload behavior, miniature manifest updates,
  nonzero-heading integration tests, and full required quality gates.
- Depends on P5b-P5d implementation completeness.

## P5d targeting, laser, and particle implementation

P5d adds the runtime reaping layer without changing the P5c deterministic stream contract.
`src/scene/structures/prReaperStream.ts` now exposes `reapCandidate(id, now?)` and
`getCandidateById(id)` so only active red circles can leave the active set through reaping;
green, missing, expired, and repeated IDs fail safely and do not alter the future spawn
schedule, shuffled 3:1 batches, intervals, X positions, or descent speed.

Two-axis aiming lives in `src/scene/structures/prReaperArmKinematics.ts`. The solver converts
installation-local targets into yaw space, solves yaw around local Y and shoulder pitch around
local X, clamps to `PR_REAPER_YAW_LIMITS` / `PR_REAPER_PITCH_LIMITS`, reports reachability,
computes angular error, damps poses with `PR_REAPER_ARM_DAMPING`, and returns the parked pose.
The runtime still has exactly two animated joint groups: `PrReaperYawJoint` and
`PrReaperPitchJoint`; no `lookAt()`, elbow, wrist, correction target, or third axis is added.

`src/scene/structures/prReaperReapingController.ts` owns the pure state machine:
`idle -> acquire -> track -> fire -> burst -> recover`. It selects red circles only inside the
shooting band (`PR_REAPER_TARGET_PROGRESS_MIN = 0.12`,
`PR_REAPER_TARGET_PROGRESS_MAX = 0.9`), sorts by greatest progress and then smallest candidate
ID, tracks the chosen circle as it descends, requires
`PR_REAPER_AIM_TOLERANCE_RADIANS = 0.035` for `PR_REAPER_AIM_HOLD_SECONDS = 0.04`, fires for
`PR_REAPER_LASER_DURATION_SECONDS = 0.12`, and recovers for
`PR_REAPER_RECOVER_SECONDS = 0.18`. Fired IDs are remembered so duplicate firing cannot remove
the same candidate twice.

`src/scene/structures/prReaperConsole.ts` updates the stream first, writes current stream centers
into the pooled `PrReaperPrCircle-*` meshes, then runs the controller. On fire it reads the actual
world-space `PrReaperLaserEmitter` position and the actual red circle mesh center before hiding the
mesh and calling `reapCandidate(...)`. The reusable `PrReaperLaserCore` and
`PrReaperLaserGlow` meshes remain children of the emitter, so each firing frame converts the
world-space start, end, and midpoint into emitter-local space before writing beam transforms. The
beam therefore terminates at the exact removed mesh center even when the installation root is
rotated.

Particle confirmation uses a fixed `PrReaperParticleBurstPool-0..3` pool of `Points` objects with
preallocated `BufferGeometry` position attributes and deterministic seeded velocities. Burst
lifetimes are uniformly bounded from 0.25 to 0.50 seconds. Detail levels keep the semantics but
scale particle counts: Cinematic 32, Balanced 24, Performance 14, Low 8, and Micro 4. Reduced
pulse/flicker settings only soften beam opacity, halo visibility, and particle travel/brightness;
they do not pause the stream, alter the 3:1 ratio, retarget greens, or change spawn timing.

The tabletop miniature remains static. Its proxy source list and manifest include the runtime
kinematics/controller modules only for sync tracking, and the proxy continues to depict a static
3-red/1-green hologram snapshot rather than running the stream, controller, laser, or particles.
