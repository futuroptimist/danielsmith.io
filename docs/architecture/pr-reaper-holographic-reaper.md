# PR Reaper holographic reaping installation architecture

Prompt P5a is documentation-only. It replaces no runtime behavior; it defines the
contract for P5b-P5e to replace the current `PrReaperConsole` with a procedural
hologram, projector base, two-axis robot arm, laser, deterministic PR stream, and
pooled particle burst.

## Existing integration points and constraints

The current PR Reaper POI is `pr-reaper-backyard-console`, uses a bottom-center
visual anchor, and is resolved through normal POI placement before the builder is
called. The registry anchor is at `{ x: 0, y: 0, z: 20 }`, heading
`Math.PI * 0.35`, with a current `2.4 x 2.0` footprint. The compiled scene object
for collision/source metadata is already `showpiece.pr_reaper_console` and uses
factory-owned colliders. `main.ts` creates the structure from the resolved POI
world position and `group.rotation.y`, applies source metadata, registers
factory colliders, adds it with `addPoiStructure(...)`, and updates it every
frame with `elapsed`, `delta`, and emphasis. Teardown currently nulls the build
but does not dispose the console because the existing build has no `dispose()`.

Relevant existing patterns to preserve:

- Shared vertical dimensions live in `portfolioSceneLayout.ts`: `WALL_HEIGHT = 6`
  and `CEILING_COVE_OFFSET = 0.35`.
- The room LED strip language places upper LEDs at
  `WALL_HEIGHT - CEILING_COVE_OFFSET`; the hologram top must stay below that cove
  region instead of inventing a separate ceiling number.
- `SceneDetailPolicy` has five internal levels: `cinematic`, `balanced`,
  `performance`, `low`, and `micro`, with monotonic reductions in geometry,
  effects, throttles, triangle hints, and draw-call hints.
- `tokenPlaceWorkstation.ts` already uses a local `mulberry32(seed)` generator
  and range helpers; P5 should extract or mirror that deterministic pattern
  rather than using `Math.random()` in animation.
- `backyard.ts` demonstrates pooled `BufferGeometry` + `PointsMaterial` +
  `Points` effects for motes, pollen, fireflies, and emitters. The PR burst
  should use the same repository-native pattern, but deterministic.
- Accessibility animation controls are read through `getPulseScale()` and
  `getFlickerScale()` from `animationPreferences.ts`.
- Miniature proxies are static registry data in `poiProxyRegistry.ts`; the
  manifest script hashes tracked source/proxy files and requires `syncRevision`
  bumps or proxy geometry changes when source fingerprints change.

## 1. Coordinate and physical-size contract

### Root and local axes

Build a single bottom-center, unit-scale `PrReaperInstallation` root at the
existing resolved POI anchor and heading. Do not move the POI for P5b unless a
measured room/path audit proves the footprint cannot fit.

```text
World Y: up
Root origin: bottom center of whole installation, at resolved POI group position
Root rotation.y: resolved POI group heading

Local +X: installation right when facing the hologram
Local +Y: up
Local +Z: viewer / robot side / away from hologram plane
Local -Z: behind the screen, toward projector rear

Front view in local space:

      +Y
       |
       |       PrReaperHologramScreen (9:21)
       |          width = screenHeight * 9 / 21
       |          topY < WALL_HEIGHT - CEILING_COVE_OFFSET
       |
       +---- +X
      origin at floor below screen center

Side view in local space:

        hologram plane z = 0
             |
   -Z rear   |   +Z robot/viewer side
 projector   |       robot base, arm, laser emitter
 base below  |       emitter stand-off >= screenHeight / 2
```

### Proposed constants and formulas

Use these exported constants in the future implementation module so tests can
import them directly:

```ts
const PR_REAPER_SCREEN_HEIGHT_RATIO = 0.86;
const PR_REAPER_LED_COVE_CLEARANCE = 0.16;
const PR_REAPER_FLOOR_CLEARANCE = 0.32;
const PR_REAPER_PROJECTOR_HEIGHT = 0.28;
const PR_REAPER_PROJECTOR_TOP_GAP = 0.08;
const PR_REAPER_SCREEN_ASPECT = 9 / 21;
const PR_REAPER_SCREEN_PLANE_Z = 0;
const PR_REAPER_ROBOT_BASE_Z = 2.85;
const PR_REAPER_MIN_EMITTER_STANDOFF_RATIO = 0.5;
```

Derived dimensions:

```ts
const coveBottomY = WALL_HEIGHT - CEILING_COVE_OFFSET; // 5.65 with current constants
const maxScreenTopY = coveBottomY - PR_REAPER_LED_COVE_CLEARANCE; // 5.49
const preferredScreenHeight = WALL_HEIGHT * PR_REAPER_SCREEN_HEIGHT_RATIO; // 5.16
const screenHeight = Math.min(
  preferredScreenHeight,
  maxScreenTopY - PR_REAPER_FLOOR_CLEARANCE
);
const screenWidth = screenHeight * PR_REAPER_SCREEN_ASPECT; // 2.2114285714 with current constants
const screenBottomY = PR_REAPER_FLOOR_CLEARANCE; // 0.32
const screenCenterY = screenBottomY + screenHeight / 2; // 2.90
const screenTopY = screenBottomY + screenHeight; // 5.48
const projectorHeight = PR_REAPER_PROJECTOR_HEIGHT; // 0.28
const projectorTopY = Math.min(
  projectorHeight,
  screenBottomY - PR_REAPER_PROJECTOR_TOP_GAP
);
```

With current room constants, `screenHeight = 5.16`, which is 86% of wall height
and above the required approximately 82%. `screenTopY = 5.48`, leaving `0.17`
units of clearance under the cove/LED bottom at `5.65`. The exact screen ratio is
`screenWidth / screenHeight === 9 / 21`.

Projector placement:

- `PrReaperProjectorBase` is centered directly under the screen:
  `position = [0, projectorHeight / 2, 0]`.
- Projector footprint: `width = screenWidth * 0.72 = 1.592`, `depth = 0.56`,
  `height = 0.28`.
- Hologram bottom clears the floor and projector by `0.04` units minimum:
  `screenBottomY - projectorTopY >= 0.04`.

### Stand-off invariant and footprint expansion

The laser emitter/tool flange must remain at least half the hologram height away
from the hologram plane for every legal yaw/pitch pose:

```ts
const minEmitterPlaneDistance =
  screenHeight * PR_REAPER_MIN_EMITTER_STANDOFF_RATIO; // 2.58
const emitterWorldPlaneDistance = Math.abs(
  emitterWorldLocalToRoot.z - PR_REAPER_SCREEN_PLANE_Z
);
expect(emitterWorldPlaneDistance).toBeGreaterThanOrEqual(
  minEmitterPlaneDistance
);
```

Prefer a mechanical design that enforces this geometrically instead of testing
only the parked pose:

- Put `PrReaperRobotBase` at local `[0, 0, PR_REAPER_ROBOT_BASE_Z]`.
- Place the yaw joint center at `[0, 0.68, 0]` relative to the robot base.
- Place the shoulder/pitch joint at `[0, 0.22, 0]` relative to the yaw joint.
- Use one arm link of length `0.42` along local `-Z` and a tool/flange extension
  of `0.12` along local `-Z`.
- Clamp shoulder pitch to `[-34°, +34°]` and yaw to `[-31°, +31°]`.
- The shortest possible emitter z distance is approximately
  `2.85 - (0.42 + 0.12) * cos(34°) = 2.402`, which is less than `2.58`.

Therefore the current `2.0` depth cannot satisfy the invariant if the arm reaches
toward the screen. The smallest justified depth increase keeps the same POI
anchor but expands the footprint depth to `3.25` and uses
`PR_REAPER_ROBOT_BASE_Z = 3.05`:

```ts
const minRobotBaseZ =
  minEmitterPlaneDistance + (armLinkLength + toolLength) * Math.cos(maxPitch);
// 2.58 + 0.54 * cos(34°) = 3.0277; round up to 3.05
```

P5b should update the PR Reaper footprint from `2.4 x 2.0` to `2.8 x 3.25` only
if collider/path tests confirm there is still a navigable backyard/studio path.
The width expands modestly to fit the screen width, side posts, and robot base;
the POI position and heading stay unchanged.

## 2. Procedural model hierarchy

Create stable semantic groups/meshes so tests, colliders, miniature tracking, and
debug tooling can inspect intent:

```text
PrReaperInstallation (Group, bottom-center root)
├─ PrReaperProjectorBase (Group)
│  ├─ PrReaperProjectorBody (Mesh)
│  ├─ PrReaperProjectorLens (Mesh)
│  └─ PrReaperProjectorAccent-* (Mesh, omitted/reduced by detail)
├─ PrReaperHologramRoot (Group, position [0, screenCenterY, 0])
│  ├─ PrReaperHologramScreen (Mesh, translucent 9:21 plane)
│  ├─ PrReaperHologramFrame-* (Mesh, decorative)
│  └─ PrReaperPrCircleRoot (Group, screen-local circle meshes)
├─ PrReaperRobotBase (Group, position [0, 0, robotBaseZ])
│  ├─ PrReaperRobotBasePedestal (Mesh)
│  └─ PrReaperYawJoint (Group, animated rotation.y only)
│     ├─ PrReaperYawHousing (Mesh)
│     └─ PrReaperPitchJoint (Group, animated rotation.x only)
│        ├─ PrReaperPitchHousing (Mesh)
│        ├─ PrReaperArmLink (Mesh)
│        └─ PrReaperToolFlange (Group)
│           ├─ PrReaperLaserEmitter (Mesh)
│           ├─ PrReaperLaserCore (Mesh, visible while firing)
│           └─ PrReaperLaserGlow (Mesh, visible while firing except reduced)
└─ PrReaperParticleRoot (Group)
   └─ PrReaperParticleBurstPool-* (Points)
```

Only two animated rotational axes are allowed:

1. Base yaw: `PrReaperYawJoint.rotation.y`.
2. Shoulder pitch: `PrReaperPitchJoint.rotation.x` around the local horizontal X
   axis after yaw.

Do not add an elbow, hidden tool yaw, hidden screen-space reticle steering, or
laser endpoint cheats. The laser endpoint follows the exact center of the target
circle; the arm reaches as closely as its two axes and tolerance allow.

## 3. Holographic PR stream model

Use real circle meshes, not a canvas texture, so every circle has an exact
Three.js target point. Circles are children of `PrReaperPrCircleRoot`, which is
screen-local under `PrReaperHologramRoot`.

Screen-local mapping:

```ts
const x = lerp(
  -screenWidth / 2 + circleRadius,
  screenWidth / 2 - circleRadius,
  normalizedX
);
const y = lerp(
  screenHeight / 2 + circleRadius,
  -screenHeight / 2 - circleRadius,
  progress
);
const z = 0.012; // slight front offset from translucent screen
const centerScreenLocal = new Vector3(x, y, z);
```

Pure state shape:

```ts
type PrCircleType = 'red' | 'green';
type PrCircleLifecycle = 'active' | 'reaped' | 'expired';
type TargetState = 'none' | 'candidate' | 'assigned' | 'firing' | 'completed';

interface PrReaperCircleState {
  id: number;
  type: PrCircleType;
  normalizedX: number;
  progress: number;
  spawnTime: number;
  lifecycle: PrCircleLifecycle;
  targetState: TargetState;
  reapedAt?: number;
  expiredAt?: number;
}
```

Randomness contract:

- Accept `seed?: number` and `random?: () => number` builder options; tests may
  inject either. Runtime defaults to `mulberry32(0x5a0b_2025)`.
- Do not call `Math.random()` from update loops.
- Spawn intervals: `0.5 + random() * 1.0`, inclusive by test tolerance.
- Horizontal margin: `circleRadius / screenWidth + 0.035`, so the whole circle
  stays visible even at Low/Micro larger simplified radii.
- Exact 3:1 candidate stream: generate batches `['red', 'red', 'red', 'green']`,
  shuffle each batch with deterministic Fisher-Yates, then consume in order. The
  ratio is defined over spawned candidates, not active visible circles, because
  red circles are removed early.

Descent and capacity:

```ts
const descendDurationSeconds = 7.2;
const spawnIntervalMin = 0.5;
const maxSimultaneousFromSpawn =
  Math.ceil(descendDurationSeconds / spawnIntervalMin) + 2; // 17
const maxParticleBursts = 4;
const circlePoolSize = 20; // includes one batch of slack
```

Allocate `circlePoolSize` circle meshes once, then assign them to active state
records. Use scratch vectors/quaternions owned by the build, not created per
frame. Expired green circles and unreaped red circles become reusable only after
leaving the screen.

## 4. Reaping state machine

Use a pure, testable controller state:

```ts
type ReaperPhase = 'idle' | 'acquire' | 'track' | 'fire' | 'burst' | 'recover';

interface ReaperState {
  phase: ReaperPhase;
  targetId: number | null;
  phaseStartedAt: number;
  lastShotAt: number;
  yaw: number;
  pitch: number;
  assignedTargetIds: Set<number>; // implementation can expose as array in debug state
}
```

Rules:

- Red targets only. Green circles never receive `candidate`, `assigned`,
  `firing`, or `completed` and are never removed by the arm.
- Shooting band: only red circles with `progress >= 0.22 && progress <= 0.82`
  are candidates. This lets red circles visibly enter before reaping and avoids
  firing at nearly expired circles.
- Priority: choose the reachable candidate with greatest `progress`; break ties
  by lowest `spawnTime`, then lowest `id`. This is deterministic and approximates
  "lowest/oldest reachable".
- `idle -> acquire`: when a reachable red candidate exists.
- `acquire -> track`: mark `targetState = 'assigned'`, store `targetId`, and
  compute desired yaw/pitch.
- `track -> fire`: arm is within `0.025 rad` yaw and pitch error for
  `0.08 seconds`.
- `fire`: show beam for `0.12 seconds`; every firing frame recomputes the target
  center and beam endpoint. At fire start set `targetState = 'firing'` and guard
  against duplicate shots by rejecting targets in `assignedTargetIds`.
- `fire -> burst`: at fire end set target lifecycle to `reaped`, hide/release its
  circle mesh, spawn one deterministic burst at the exact center, and set
  `targetState = 'completed'`.
- `burst`: lasts the burst duration, randomly chosen in `[0.25, 0.50]`.
- `recover`: `0.10 seconds` cooldown with the laser hidden; then return to idle.
- If the target expires or becomes unreachable before firing, clear assignment,
  do not fire, and return through `recover` for `0.05 seconds`.
- If multiple reds are present, the current target remains locked until it fires,
  expires, or becomes unreachable; no target switching in `track`.

Arm motion should be fast but not snapping:

```ts
const yawSpeed = MathUtils.degToRad(220); // rad/s
const pitchSpeed = MathUtils.degToRad(190);
angle = dampAngle(current, desired, speed, delta);
```

At minimum spawn interval, a red appears at most every 0.5s on average in the
candidate stream; the track + fire + burst + recover cadence remains readable
without requiring impossible instant motion.

## 5. Two-axis aiming math

All math must be local-space and therefore correct for nonzero POI headings.

1. Update matrix worlds for `PrReaperInstallation`, `PrReaperHologramRoot`, and
   robot joints.
2. Convert a circle center from screen-local to root-local:

```ts
screenCircleCenter.set(x, y, z);
hologramRoot.localToWorld(targetWorld.copy(screenCircleCenter));
installation.worldToLocal(targetRootLocal.copy(targetWorld));
```

3. Convert root-local target into yaw-base space. If `PrReaperRobotBase` is at
   `robotBaseRoot` and the yaw joint center is `yawOriginRoot`, then:

```ts
const targetInYawBase = targetRootLocal.clone().sub(yawOriginRoot);
```

Use preallocated vectors instead of `clone()` in runtime.

4. Desired yaw, with local `-Z` as the arm's forward direction:

```ts
const desiredYaw = Math.atan2(-targetInYawBase.x, -targetInYawBase.z);
const clampedYaw = MathUtils.clamp(desiredYaw, yawMin, yawMax);
```

5. Rotate the target into pitch-joint space after yaw:

```ts
const yawInverse = new Quaternion().setFromAxisAngle(Y_AXIS, -clampedYaw);
const targetInPitch = targetInYawBase
  .applyQuaternion(yawInverse)
  .sub(pitchJointOffsetFromYaw);
const horizontalDistance = Math.hypot(targetInPitch.z, targetInPitch.x);
const desiredPitch = Math.atan2(targetInPitch.y, -targetInPitch.z);
const clampedPitch = MathUtils.clamp(desiredPitch, pitchMin, pitchMax);
```

Because there is no elbow, "reachable" means the clamped two-axis ray passes
close enough to the target center rather than the flange physically touching it:

```ts
const aimRay = new Vector3(0, 0, -1).applyEuler(
  new Euler(clampedPitch, clampedYaw, 0, 'YXZ')
);
const toTarget = targetRootLocal.sub(emitterRootLocal).normalize();
const angularError = aimRay.angleTo(toTarget);
const reachable = angularError <= MathUtils.degToRad(3.5) && standOffOk;
```

6. Damping:

```ts
function dampAngle(
  current: number,
  target: number,
  speed: number,
  delta: number
) {
  const diff =
    MathUtils.euclideanModulo(target - current + Math.PI, Math.PI * 2) -
    Math.PI;
  return current + MathUtils.clamp(diff, -speed * delta, speed * delta);
}
```

7. Emitter/tool position is computed from actual joint transforms, not duplicated
   state:

```ts
toolFlange.updateMatrixWorld(true);
laserEmitter.getWorldPosition(emitterWorld);
installation.worldToLocal(emitterRootLocal.copy(emitterWorld));
```

## 6. Laser geometry and glow

Do not add dependencies, point lights, or full-screen flash. Use two reusable
procedural meshes:

- `PrReaperLaserCore`: a thin cylinder or box, bright green emissive/basic
  material, radius/width `0.018`.
- `PrReaperLaserGlow`: wider translucent green cylinder/box, radius/width
  `0.07`, `depthWrite = false`, additive-looking opacity without custom shaders.

Align both between emitter and target each firing frame:

```ts
const start = emitterWorld;
const end = targetWorld; // exact center of red circle
const direction = end.clone().sub(start);
const length = direction.length();
beam.position.copy(start).addScaledVector(direction, 0.5);
beam.scale.set(1, length, 1); // if cylinder height axis is local Y
beam.quaternion.setFromUnitVectors(Y_AXIS, direction.normalize());
```

The endpoint must equal the exact center of the target circle in every firing
frame. The glow language should borrow the cyan/green emissive feel of the room
LED strips but remain independent from LED strip arrays/animators.

Detail representations:

| Level       | Laser representation                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| Cinematic   | core + glow, 16 radial segments, mild opacity pulse scaled by `getPulseScale()` and `getFlickerScale()` |
| Balanced    | core + glow, 12 segments, softer pulse                                                                  |
| Performance | core + single rectangular halo billboard/cylinder with 6-8 segments                                     |
| Low         | core only plus very faint static halo if budget allows                                                  |
| Micro       | one thin green line/box, no halo pulse                                                                  |

## 7. Particle burst

Use deterministic pooled particles at the reaped circle center:

```ts
interface BurstState {
  active: boolean;
  startedAt: number;
  duration: number; // random uniform [0.25, 0.50]
  originRootLocal: Vector3;
  seed: number;
}
```

Implementation pattern:

- Preallocate one `BufferGeometry` per burst pool item with `position`, `color`
  or `alpha`-encoded attributes as needed.
- Use one `PointsMaterial` per detail class or per active pool item when opacity
  must differ; dispose all attributes, geometries, and materials.
- Precompute deterministic velocity vectors from the injected generator at burst
  spawn. No per-particle meshes during firing.
- Update positions from `origin + velocity * age + gravity * age^2 * 0.5`, fade
  opacity to zero, and hide the `Points` when `age >= duration`.
- No dynamic lights.
- Reduced motion: scale velocity by `0.35`, opacity by `0.55`, and avoid sharp
  size pulses; do not change burst duration range.

Particle counts by level: Cinematic 48, Balanced 32, Performance 18, Low 10,
Micro 4. Update every frame for Cinematic/Balanced, every other frame or through
`detailPolicy.throttles.decorativeThrottleMs` for Performance/Low/Micro while
still expiring by absolute elapsed time.

## 8. Detail policies and budgets

The semantic stream and exact 3:1 spawned candidate ratio are preserved at every
level. Never drop random red or green candidates solely to meet triangle targets;
instead reduce representation.

| Level       | Screen/frame                                       | Circles        | Arm/details                   | Laser           | Particles | Expected triangles | Expected draw calls |
| ----------- | -------------------------------------------------- | -------------- | ----------------------------- | --------------- | --------- | -----------------: | ------------------: |
| Cinematic   | translucent screen, frame rails, projector accents | 32 segments    | cylinders, housings, cable    | core + glow     | 48        |           <= 2,800 |               <= 28 |
| Balanced    | same shape, fewer accents                          | 24 segments    | simplified cable              | core + glow     | 32        |           <= 2,100 |               <= 24 |
| Performance | simple screen/frame                                | 16 segments    | box/cylinder hybrid, no cable | core + one halo | 18        |           <= 1,250 |               <= 18 |
| Low         | screen + projector body only                       | 10-12 segments | blocky silhouette             | core mostly     | 10        |             <= 760 |               <= 14 |
| Micro       | static planes/boxes                                | 6-8 segments   | minimal silhouette            | single line     | 4         |             <= 420 |               <= 10 |

Reductions apply to primitive segments, decorative frame details, laser halo
layers, particle counts/update frequency, arm cable/details, and projector
accents. Simulation state, spawn timing, target immunity, and debug state remain
identical.

## 9. Accessibility

Use `getPulseScale()` for rhythmic scale/opacity breathing and
`getFlickerScale()` for any fast opacity/noise variation.

Reduced motion/flicker behavior:

- Preserve the 0.5-1.5s spawn interval, exact 3:1 ratio, red reaping, and green
  immunity.
- Avoid strobing; laser opacity becomes steady or slowly eased.
- Suppress/soften laser halo pulses when flicker scale is `0`.
- Reduce particle travel and brightness, not duration semantics.
- Keep the arm smooth with lower angular speeds if necessary; never snap to avoid
  motion.
- Emphasis may increase brightness only through scaled pulse/flicker values; it
  must not alter simulation correctness.

## 10. Runtime and lifecycle integration

Final builder API:

```ts
export interface PrReaperInstallationOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  detailPolicy?: SceneDetailPolicy;
  seed?: number;
  random?: () => number;
}

export interface PrReaperInstallationBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
  getDebugState(): PrReaperDebugState;
  dispose(): void;
}
```

Integration requirements:

- P5b should either replace `createPrReaperConsole` in-place or introduce
  `createPrReaperInstallation` and update imports/tests consistently.
- Pass `detailPolicy: sceneDetailController.getPolicy()` when building.
- Continue `addPoiStructure(prReaperPoi, build.group)` so model triangles and
  visual anchors remain registered.
- Keep factory collider registration through `registerSceneObjectColliders(...)`.
  Colliders should cover the projector/robot footprint, not the hologram screen.
- `getDebugState()` should expose dimensions, seed, active circles, next spawn
  time, reaper phase, current/desired yaw-pitch, target id, beam endpoints,
  particle pool activity, detail level, and accessibility scales for tests.
- `dispose()` must be idempotent and dispose owned geometries, materials,
  textures if any, `BufferAttribute`s/`BufferGeometry`s, and `PointsMaterial`s.
- Full immersive teardown must call `prReaperInstallation.dispose()` before
  nulling it. Partial/reload quality paths should dispose and rebuild with the
  new `detailPolicy`, preserving the same seed unless a full scene reload resets
  all POI structures.
- The core stream advances whenever immersive mode is running, even if the POI is
  not focused. Focus/emphasis affects brightness and secondary effects only.

## 11. Miniature synchronization

The miniature proxy remains static and recognizable; it must not run the full PR
stream or reaping simulation. Proxy contents:

- projector base;
- tall translucent-blue screen silhouette;
- three red circle hints and one green circle hint;
- two-axis arm silhouette;
- laser-gun/tool-flange silhouette;
- optional short green beam hint.

P5b should update the `pr-reaper-backyard-console` entry in
`MINIATURE_POI_PROXY_REGISTRY`:

- `displayName`: `PR Reaper holographic reaper proxy`.
- `syncRevision`: bump from `2` to `3`.
- `syncNote`: mention static hologram, 3:1 circle hints, and two-axis arm.
- `sourceFiles`: include
  - `src/scene/poi/registry.ts`
  - `src/scene/poi/placements.ts`
  - `src/scene/poi/constants.ts`
  - `src/scene/structures/prReaperConsole.ts` or the renamed installation file
  - any new stream/state/kinematics modules added in P5c/P5d
  - `src/scene/graphics/sceneDetailPolicy.ts` if detail-driven constants move
    outside the structure module
  - `src/ui/accessibility/animationPreferences.ts` once P5d/P5e use it directly
- `proxyFiles`: keep `src/scene/miniature/poiProxyRegistry.ts`.

Manifest behavior:

- P5b must run `npm run miniature:manifest:update` if the proxy registry/source
  files change, then include the generated manifest diff.
- P5c-P5e must bump `syncRevision` and update `syncNote` whenever tracked source
  behavior changes without an equivalent proxy geometry change.
- `npm run docs:check` includes link/manifest freshness checks through existing
  documentation tooling; `npm run miniature:check` is a focused check when only
  miniature tracking changes.

## 12. Testing matrix

| Area                     | Required tests                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Geometry/physical bounds | root at resolved POI anchor; bottom-center semantics; projector directly below screen; footprint colliders source-backed                       |
| Ratio                    | `screenWidth / screenHeight === 9 / 21` within floating tolerance                                                                              |
| Ceiling clearance        | screen height derives from `WALL_HEIGHT` and top is below `WALL_HEIGHT - CEILING_COVE_OFFSET` by clearance                                     |
| Stand-off                | emitter/tool flange z-plane distance >= `screenHeight / 2` for min/max yaw and pitch poses                                                     |
| Randomness               | identical seed produces identical candidate types, intervals, x positions, burst durations/velocities; no `Math.random()` in animation modules |
| Intervals                | spawned intervals always within 0.5-1.5 seconds                                                                                                |
| Ratio                    | every complete shuffled four-candidate batch has exactly three red and one green                                                               |
| Horizontal bounds        | generated x positions keep whole circle visible at all detail radii                                                                            |
| Descent/expiration       | progress advances by elapsed time; green/red expire after leaving view if not reaped                                                           |
| Green immunity           | green circles never assigned, fired at, reaped, or removed early                                                                               |
| Kinematics               | yaw/pitch math is correct for zero and nonzero POI headings; clamps mark unreachable targets                                                   |
| Beam endpoints           | firing beam start equals emitter world position and end equals target circle center each frame                                                 |
| Particles                | burst origin equals reaped center; duration is 0.25-0.50s; pool reuses and disposes attributes/materials                                       |
| Detail monotonicity      | triangles/draw calls/segments/particles decrease monotonically from Cinematic to Micro while state counts remain stable                        |
| Reduced motion/flicker   | pulse/flicker scales reduce halo/particle intensity without changing spawn timing or ratio                                                     |
| Colliders                | registered factory colliders match structure footprint and source metadata; no fake hologram collider                                          |
| Disposal                 | repeated dispose is safe and frees owned geometries/materials/attributes                                                                       |
| Miniature proxy          | static proxy contains projector, tall blue screen, 3 red hints, 1 green hint, arm, flange/gun, beam hint                                       |
| Manifest                 | generated miniature manifest is fresh after proxy/source changes                                                                               |
| Integration              | `main.ts` updates every frame while unfocused; teardown disposes; quality reload rebuilds; nonzero heading remains correct                     |

## P5 implementation decomposition

### P5b — Static hologram/projector/robot installation

Scope:

- Replace abstract console geometry with static `PrReaperInstallation` hierarchy.
- Implement dimensions, 9:21 screen, projector base, robot two-axis silhouette,
  footprint colliders, detail-policy geometry reductions, `dispose()`, and basic
  tests for bounds/ratio/clearance/stand-off parked/extreme poses.
- Update `main.ts` to call `dispose()` on teardown and pass `detailPolicy`.
- Update miniature proxy and manifest.

Dependencies: P5a design only.

### P5c — Deterministic 3:1 descending PR stream

Scope:

- Add pure seeded stream simulation, circle mesh pool, deterministic intervals,
  horizontal bounds, descent/expiration, debug state, and tests for exact 3:1
  batches and green persistence.
- Preserve P5b static robot; no firing/particles yet.

Dependencies: P5b hierarchy and screen-local coordinates.

### P5d — Two-axis targeting, laser reaping, and particles

Scope:

- Add reaping state machine, two-axis yaw/pitch math, target priority, reachable
  checks, laser core/glow, exact beam endpoints, deterministic particle pool, and
  tests for green immunity, duplicate-fire safeguards, endpoints, and burst
  duration.

Dependencies: P5c stream state and P5b robot hierarchy.

### P5e — Hardening, accessibility, performance, miniature sync, final QA

Scope:

- Finish detail-level budgets, reduced motion/flicker tuning, quality reload
  behavior, disposal audits, collider audits, miniature `syncRevision`/manifest
  updates, nonzero-heading integration tests, and final QA docs.
- Run full quality gates including smoke.

Dependencies: P5b-P5d implementation complete.

## Recorded tradeoffs and ambiguities

- The screen is nearly ceiling height but deliberately starts at `0.32` units to
  keep it visually clear of the floor and projector. This yields `86%` of wall
  height and a safe `0.17` cove clearance with current constants.
- The strict stand-off invariant cannot be satisfied by the current `2.0` depth
  if the emitter reaches toward the screen. The minimum calculated robot-base z
  is `3.0277`; the design rounds to `3.05` and proposes a `3.25` depth footprint
  instead of moving the POI.
- The two-axis arm is an aiming sculpture, not an IK chain. Reachability is an
  angular tolerance to the circle center from the real emitter position.
- The exact 3:1 ratio is over spawned candidates, not visible active circles,
  because red candidates are intentionally removed early.
