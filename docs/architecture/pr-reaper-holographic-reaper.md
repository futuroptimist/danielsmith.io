# PR Reaper holographic reaping installation architecture

P5a is documentation-only. It replaces no runtime behavior; it defines the
contract that P5b-P5e must implement when the current abstract PR Reaper console
is replaced by a procedural hologram, projector, two-axis robot, laser, PR
stream, and particle-burst installation.

## Existing integration inventory

The current implementation is a factory-owned POI showpiece:

- `createPrReaperConsole(options)` returns `{ group, colliders, update }`, builds
  a bottom-anchored `PrReaperConsole` group, applies `orientationRadians` to the
  root, owns custom factory colliders, and uses `getPulseScale()` for animated
  emphasis damping.
- `src/main.ts` resolves the `pr-reaper-backyard-console` POI instance, calls the
  factory at the resolved POI position/rotation, applies scene-object metadata,
  registers factory colliders into the POI collider target, adds the structure
  through `addPoiStructure(...)`, updates it every frame with
  `emphasis = max(activation, focus)`, and nulls the handle during immersive
  teardown.
- The POI registry places the PR Reaper in the backyard at `(0, 0, 20)` with
  heading `Math.PI * 0.35`, interaction radius `2.1`, and footprint
  `2.4 × 2.0`.
- Migrated scene-object tests currently validate custom factory-collider policy,
  factory placement parity, and source metadata for `pr-reaper-backyard-console`.
- The miniature proxy registry currently tracks `src/scene/structures/prReaperConsole.ts`
  and renders a static console proxy. P5b must replace this with the static
  holographic installation proxy and acknowledge manifest changes.
- The scene detail policy exposes five internal levels: Cinematic, Balanced,
  Performance, Low, and Micro. Builders should accept `detailPolicy` rather than
  inventing separate quality names.
- Backyard environmental particles use pooled `BufferGeometry`, `BufferAttribute`,
  and `PointsMaterial` arrays updated in place. The particle burst should follow
  that pattern rather than creating per-particle meshes.
- Accessibility animation preferences expose `getPulseScale()` and
  `getFlickerScale()`; P5d/P5e should use both for pulse and flicker-sensitive
  effects.

## Goals and non-goals

Goals:

1. Build one recognizable static/procedural installation rooted at the resolved
   POI anchor and heading.
2. Simulate an injectable deterministic PR stream with real circle meshes in
   hologram-local space.
3. Aim with exactly two animated robot axes: base yaw around Y and shoulder pitch
   around the shoulder's local horizontal axis.
4. Fire a green beam whose target endpoint is exactly the red circle center on
   every firing frame.
5. Preserve the semantic stream and exact 3:1 red-to-green candidate ratio at
   every detail level.

Non-goals:

- No external models, textures, audio, network data, GitHub text, third-party IK,
  physics libraries, or recursive miniature behavior.
- No runtime code changes in P5a.
- Do not touch `docs/assets/game-launch.png`.

## Coordinate and physical-size contract

### Root and local axes

The installation root is bottom-center, unit scale, and placed exactly at the
existing resolved POI anchor and heading.

```text
World placement:
  root.position = resolved pr-reaper-backyard-console POI position
  root.rotation.y = resolved pr-reaper-backyard-console POI heading
  root.scale = (1, 1, 1)

Installation local axes after root rotation:
  +Y  up
  +X  screen-right from viewer/robot perspective
  +Z  forward, away from the hologram plane toward the viewer/robot
  -Z  behind the hologram/projector side

Front view from +Z:

          +Y
          ↑
          │      PrReaperHologramScreen, centered on local X=0
          │      ┌──────────────────┐  top below LED/cove region
          │      │  9:21 blue pane  │
          │      │  red/green PRs   │
          │      └──────────────────┘
          │        projector base
          └───────────────→ +X
         root bottom center

Side view:

       screen plane z = 0
             │
   -Z  base  │  +Z robot stand-off, yaw base, shoulder, flange/emitter
             │───────────────→
```

### Shared dimensions and formulas

Use shared layout constants from `src/scene/structures/portfolioSceneLayout.ts`:

- `WALL_HEIGHT = 6`.
- `CEILING_COVE_OFFSET = 0.35`.
- Available non-cove wall height: `availableHeight = WALL_HEIGHT - CEILING_COVE_OFFSET = 5.65`.

Proposed constants and derived formulas:

```ts
const PR_REAPER_HOLOGRAM_HEIGHT_RATIO = 0.84;
const PR_REAPER_HOLOGRAM_ASPECT = 9 / 21;
const PR_REAPER_COVE_CLEARANCE = 0.12;
const PR_REAPER_FLOOR_CLEARANCE = 0.34;
const PR_REAPER_PROJECTOR_HEIGHT = 0.28;
const PR_REAPER_PROJECTOR_GAP = 0.06;

const hologramHeight = Math.min(
  WALL_HEIGHT * PR_REAPER_HOLOGRAM_HEIGHT_RATIO,
  WALL_HEIGHT -
    CEILING_COVE_OFFSET -
    PR_REAPER_COVE_CLEARANCE -
    PR_REAPER_FLOOR_CLEARANCE
); // min(5.04, 5.19) = 5.04
const hologramWidth = hologramHeight * PR_REAPER_HOLOGRAM_ASPECT; // 2.16
const hologramBottomY = PR_REAPER_FLOOR_CLEARANCE; // 0.34
const hologramTopY = hologramBottomY + hologramHeight; // 5.38
const coveSafeMaxY =
  WALL_HEIGHT - CEILING_COVE_OFFSET - PR_REAPER_COVE_CLEARANCE; // 5.53
const hologramCenterY = hologramBottomY + hologramHeight / 2; // 2.86
```

This makes the screen 84% of wall height, above the 82% minimum, with `0.15`
scene units of actual clearance below the cove-safe maximum and an exact `9:21`
width-to-height ratio. The screen remains visually clear of the floor with
`0.34` units of bottom clearance and the projector directly beneath it.

Projector placement:

```ts
const projectorWidth = hologramWidth * 0.72; // 1.5552
const projectorDepth = 0.52;
const projectorHeight = PR_REAPER_PROJECTOR_HEIGHT; // 0.28
const projectorCenter = new Vector3(0, projectorHeight / 2, -0.06);
const projectionLensCenter = new Vector3(0, projectorHeight + 0.06, 0.02);
```

The projector base is centered below the screen in X, close to the screen plane,
and never used as an aiming joint.

### Robot stand-off invariant and footprint

The laser emitter/tool flange must remain at least half the hologram height away
from the hologram plane for every legal yaw/pitch pose:

```ts
const minimumEmitterPlaneDistance = hologramHeight * 0.5; // 2.52
const emitterPlaneDistance = emitterWorldPosition
  .clone()
  .sub(hologramPlaneWorldPoint)
  .dot(hologramForwardWorldNormal); // +Z local normal in world space
expect(emitterPlaneDistance).toBeGreaterThanOrEqual(2.52);
```

Prefer satisfying this mechanically rather than only in the parked pose. Proposed
arm dimensions:

```ts
const robotBaseZ = 2.95;
const shoulderHeight = 0.82;
const upperLinkLength = 0.42;
const flangeForwardOffset = 0.18;
const emitterForwardOffset = 0.09;
const maxBackwardReachTowardScreen =
  upperLinkLength + flangeForwardOffset + emitterForwardOffset;
const minimumLegalZ = robotBaseZ - maxBackwardReachTowardScreen; // 2.26 (too close)
```

Because `2.26 < 2.52`, the current `2.4 × 2.0` footprint cannot guarantee the
invariant if the arm is allowed to pitch/yaw back toward the plane. The smallest
justified depth expansion is:

```ts
const requiredRobotBaseZ =
  minimumEmitterPlaneDistance + maxBackwardReachTowardScreen; // 3.21
const safetyMargin = 0.04;
const proposedRobotBaseZ = 3.25;
const proposedFootprintDepth = proposedRobotBaseZ + 0.38; // 3.63
```

P5b should expand the PR Reaper footprint from `2.4 × 2.0` to approximately
`2.6 × 3.7` only if room/path checks confirm it does not block the backyard route.
Do not move the POI unless measured path constraints require it. If path tests
fail, keep the screen at the POI anchor and move only the robot +Z within an
expanded custom collider envelope; POI relocation is the last resort.

## Procedural model hierarchy

P5b should replace `PrReaperConsole` with `PrReaperInstallation` while preserving
factory ownership and `addPoiStructure(...)` integration.

Stable semantic groups and meshes:

```text
PrReaperInstallation (Group, bottom-center root)
├─ PrReaperProjectorBase (Group/Mesh)
├─ PrReaperHologramRoot (Group, screen-local origin at screen center)
│  ├─ PrReaperHologramScreen (Mesh, translucent blue plane)
│  ├─ PrReaperHologramFrame/* (optional detail-level frame accents)
│  └─ PrReaperPrCircleRoot (Group, child circle meshes in screen-local X/Y)
├─ PrReaperRobotBase (Group/Mesh, fixed at local z = proposedRobotBaseZ)
│  └─ PrReaperYawJoint (Group, animated rotation.y only)
│     └─ PrReaperPitchJoint (Group, animated rotation.x only)
│        ├─ PrReaperArmLink (Mesh)
│        └─ PrReaperToolFlange (Group/Mesh)
│           └─ PrReaperLaserEmitter (Group/Mesh)
│              ├─ PrReaperLaserCore (Mesh, visible only while firing)
│              └─ PrReaperLaserGlow (Mesh, optional halo)
└─ PrReaperParticleRoot (Group/Points pool)
```

The arm has exactly two animated rotational axes:

- `PrReaperYawJoint.rotation.y` turns around local Y.
- `PrReaperPitchJoint.rotation.x` pitches around the shoulder's local horizontal
  X axis after yaw.

Do not add an animated elbow, wrist swivel, hidden look-at parent, beam-only aim
correction, or target-following third axis. The beam endpoint may be rebuilt to
connect the emitter to the target, but firing is legal only after the two-axis
pose is within tolerance.

## Holographic PR stream model

### Mesh representation

Use actual `CircleGeometry` or low-segment disc meshes under
`PrReaperPrCircleRoot`; do not bake circles into a canvas texture. Each circle's
center has a direct screen-local `Vector3(x, y, z)` and exact world target point.
Circle meshes are pooled and toggled visible/invisible.

Screen-local mapping:

```ts
const circleRadius = hologramWidth * 0.055; // 0.1188 at proposed size
const horizontalMargin = circleRadius + hologramWidth * 0.04;
const normalizedXToLocal = (u: number) =>
  MathUtils.lerp(
    -hologramWidth / 2 + horizontalMargin,
    hologramWidth / 2 - horizontalMargin,
    u
  );
const normalizedProgressToLocalY = (p: number) =>
  MathUtils.lerp(
    hologramHeight / 2 + circleRadius,
    -hologramHeight / 2 - circleRadius,
    p
  );
```

`progress = 0` starts just above the top edge; `progress = 1` ends just below the
bottom edge. Visible centers are within the display for approximately
`circleRadius / hologramHeight <= progress <= 1 - circleRadius / hologramHeight`.

### Pure simulation state

The stream simulation should be pure and testable without Three.js objects:

```ts
type PrCircleType = 'red' | 'green';
type PrCircleLifecycle = 'active' | 'reaped' | 'expired';
type TargetState = 'none' | 'candidate' | 'assigned' | 'firing' | 'resolved';

interface PrCircleState {
  id: number;
  type: PrCircleType;
  normalizedX: number;
  progress: number;
  spawnTime: number;
  lifecycle: PrCircleLifecycle;
  targetState: TargetState;
  reapedAt?: number;
  expiresAt?: number;
}

interface PrStreamState {
  seed: string;
  nextId: number;
  nextSpawnAt: number;
  active: PrCircleState[];
  spawnBatch: PrCircleType[];
  spawnBatchIndex: number;
}
```

Randomness must be deterministic and injectable. Use a small seeded generator
matching repository patterns for deterministic debug IDs and tests, e.g. a local
`createPrReaperRandom(seed): () => number` based on string hashing. The animation
loop must never call `Math.random()`.

Spawn rules:

- Intervals: uniform in `[0.5, 1.5]` seconds.
- Horizontal positions: uniform in `[0, 1]` and then mapped through the margin
  formula above so the whole circle stays visible.
- Ratio: shuffle repeated candidate batches `['red', 'red', 'red', 'green']`.
  This guarantees an exact 3:1 spawned candidate stream. The visible active set
  can deviate because red circles are reaped early.
- Descent speed: choose a constant visible travel time long enough for targeting,
  e.g. `descentDuration = 7.5s`; `progress = (elapsed - spawnTime) / descentDuration`.
- Expiration: when `progress > 1`, mark `expired`, release the mesh to the pool,
  and keep counters for debug state.

### Pooling and maximum active counts

Worst-case unreaped candidates occur at the minimum spawn interval and full
travel duration:

```ts
const maxSpawnRate = 1 / 0.5; // 2 per second
const descentDuration = 7.5;
const maxActiveCandidates = Math.ceil(descentDuration * maxSpawnRate) + 2; // 17
```

Allocate at least 20 circle mesh slots for Cinematic/Balanced. Keep the semantic
state for every spawned candidate at every detail level; lower levels may render
simpler circle geometry but must not drop candidates solely for triangle budgets.

## Reaping state machine

Use a pure controller with this sequence:

```text
idle → acquire → track → fire → burst → recover → idle
        ↑          │       │       │        │
        └──────────┴───────┴───────┴────────┘ on target expired/unreachable
```

State details:

- `idle`: no assigned target. Query active red circles only.
- `acquire`: choose a deterministic target, mark it `assigned`, compute yaw/pitch.
- `track`: damp yaw/pitch toward target until both angle error and endpoint error
  are within tolerance for the required hold time.
- `fire`: show the beam for `0.10s` to `0.16s`; endpoint equals the red circle
  center every frame. Mark target `firing` and prevent reassignment.
- `burst`: mark circle `reaped`, hide/release its circle mesh, start one pooled
  particle burst at its center for deterministic duration `0.25s` to `0.50s`.
- `recover`: hide beam, keep arm moving smoothly toward a neutral ready pose for
  `0.12s` to `0.22s`, then return to `idle`.

Targeting rules:

- Red targets only. Green circles are never targeted, reaped, removed, or altered
  by the arm and continue descending until expiration.
- Deterministic priority: among reachable red circles in the shooting band,
  choose the lowest visible circle; break ties by oldest `spawnTime`, then `id`.
- Shooting band: allow PRs to be noticed before reaping. Proposed band is
  `0.28 <= progress <= 0.86`.
- If a target expires or leaves the shooting band before firing, clear its
  `targetState` unless expired and return to `idle`.
- If multiple red targets are present, exactly one may be `assigned` or `firing`.
- Safeguard against double fire: a circle with `targetState` `firing`, `resolved`,
  `reaped`, or `expired` is ineligible.
- Keep-up: with minimum spawn interval `0.5s` and 3 red per 4 candidates, average
  red arrival at minimum interval is `1.5 red/s`. Aim + fire + recover should be
  approximately `0.45s` to `0.60s` while using smooth angular damping, allowing
  occasional backlog without unnatural snapping.

## Two-axis aiming math

All math must work at nonzero POI headings by converting through world matrices
rather than assuming world axes.

Definitions:

```ts
const targetWorld = hologramRoot.localToWorld(circleCenterLocal.clone());
const targetBase = yawJoint.worldToLocal(targetWorld.clone());
```

Yaw:

```ts
// local +Z is forward from screen to robot; target lies generally toward -Z
const yawTarget = Math.atan2(targetBase.x, -targetBase.z);
const yaw = clampAngle(yawTarget, yawMin, yawMax); // e.g. ±34°
```

Pitch after yaw:

```ts
const targetYawSpace = targetBase
  .clone()
  .applyAxisAngle(new Vector3(0, 1, 0), -yaw);
const shoulderY = shoulderHeight;
const dz = -targetYawSpace.z; // positive toward screen after yaw alignment
const dy = targetYawSpace.y - shoulderY;
const pitchTarget = Math.atan2(dy, dz);
const pitch = clampAngle(pitchTarget, pitchMin, pitchMax); // e.g. -28°..+52°
```

Reachability:

```ts
const yawReachable = yawTarget === yaw within epsilon;
const pitchReachable = pitchTarget === pitch within epsilon;
const emitterPlaneDistanceOk = minEmitterDistanceForPose(yaw, pitch) >= hologramHeight * 0.5;
const reachable = yawReachable && pitchReachable && emitterPlaneDistanceOk;
```

Damping:

```ts
const maxYawSpeed = MathUtils.degToRad(150); // rad/s
const maxPitchSpeed = MathUtils.degToRad(120);
const yawStep = clamp(
  shortestAngleDelta(currentYaw, yaw),
  -maxYawSpeed * delta,
  maxYawSpeed * delta
);
const pitchStep = clamp(
  pitch - currentPitch,
  -maxPitchSpeed * delta,
  maxPitchSpeed * delta
);
```

Tool pose:

- The shoulder/pitch group owns `PrReaperArmLink` and `PrReaperToolFlange`.
- Compute `flangeWorld` via `toolFlange.getWorldPosition(...)`.
- Compute `emitterWorld` via `laserEmitter.getWorldPosition(...)`.
- Tests should verify the emitter/tool-flange world positions and the plane
  stand-off at yaw/pitch clamp extremes, not only parked pose.

## Laser geometry and glow

No new renderer dependency is needed. The beam is two procedural meshes aligned
between emitter and target:

- `PrReaperLaserCore`: thin bright green cylinder or rectangular prism.
- `PrReaperLaserGlow`: wider translucent green cylinder/prism halo when detail
  and flicker settings allow.

Alignment helper:

```ts
function alignBeam(mesh: Object3D, start: Vector3, end: Vector3) {
  const delta = end.clone().sub(start);
  mesh.position.copy(start).addScaledVector(delta, 0.5);
  mesh.scale.set(1, delta.length(), 1); // if cylinder authored along +Y
  mesh.quaternion.setFromUnitVectors(Y_AXIS, delta.normalize());
}
```

The target endpoint must be exactly `targetWorld` from the red circle center on
every firing frame. The laser does not add a dynamic point light and does not
trigger a full-screen flash. Use room LED strip language for emissive green
materials and additive/translucent glow, but do not couple beam objects to the
room-light arrays.

Cheaper representations:

| Detail      | Laser representation                                                |
| ----------- | ------------------------------------------------------------------- |
| Cinematic   | Core plus halo, moderate radial segments, soft opacity pulse.       |
| Balanced    | Core plus single halo, fewer segments.                              |
| Performance | Core plus very cheap rectangular halo if `decorativeHalos` enabled. |
| Low         | Core only, no pulse.                                                |
| Micro       | Single line-like rectangular core, no halo, no pulse.               |

## Particle burst

Use one deterministic pooled `Points` system under `PrReaperParticleRoot`.

State:

```ts
interface PrParticleBurstSlot {
  active: boolean;
  circleId: number;
  startTime: number;
  duration: number; // deterministic uniform [0.25, 0.50]
  originWorld: Vector3;
  particleOffset: number;
  particleCount: number;
}
```

Implementation contract:

- Origin is the reaped red circle center.
- Duration is deterministic uniform `[0.25, 0.50]` seconds from the injected PRNG.
- Preallocate `Float32Array` positions, colors/alpha if needed, and velocities.
- Do not create per-particle meshes during firing.
- No dynamic lights.
- Fade opacity over finite lifetime; reduce travel distance and brightness under
  reduced motion/flicker settings.
- Dispose buffer attributes, `BufferGeometry`, and `PointsMaterial` exactly once.

Recommended max particle counts:

| Detail      | Burst particles | Update cadence                    |
| ----------- | --------------: | --------------------------------- |
| Cinematic   |              48 | every frame                       |
| Balanced    |              32 | every frame                       |
| Performance |              20 | every frame or policy throttle    |
| Low         |              10 | throttled to decorative cadence   |
| Micro       |               4 | throttled; minimal outward travel |

## Detail policies and budgets

Every level preserves spawned candidates, 3:1 ratio, descent, targeting, green
immunity, and red reaping semantics. Do not randomly drop candidates to hit
triangle budgets; instead reduce geometry.

| Level       | Visual reductions                                                                                | Triangle budget | Draw-call budget |
| ----------- | ------------------------------------------------------------------------------------------------ | --------------: | ---------------: |
| Cinematic   | Full frame, projector accents, 48-segment circles, core+halo laser, 48 particles, cable details. |         ≤ 4,500 |             ≤ 34 |
| Balanced    | Fewer frame ribs, 32-segment circles, core+halo laser, 32 particles.                             |         ≤ 3,200 |             ≤ 28 |
| Performance | Simplified base, 20-segment circles, cheap halo/core, 20 particles, fewer accents.               |         ≤ 2,100 |             ≤ 22 |
| Low         | Minimal frame, 12-segment circles, core only, 10 particles, no cables.                           |         ≤ 1,250 |             ≤ 16 |
| Micro       | Box base, translucent plane, 8-segment circles, line core, 4 particles.                          |           ≤ 700 |             ≤ 11 |

The reductions are monotonic in primitive segments, decorative frame details,
laser halo layers, particle count, particle update frequency, cable/detail meshes,
and projector accents.

## Accessibility

Use `getPulseScale()` for breathing/pulse scale and `getFlickerScale()` for
laser halo opacity modulation, screen shimmer, and burst brightness.

Reduced-motion/flicker behavior:

- Preserve candidate stream, spawn intervals, descent, exact 3:1 ratio, targeting,
  and reaping metaphor.
- Do not strobe. Suppress or soften laser halo pulses as flicker scale approaches
  zero.
- Reduce particle travel distance, size, and brightness; keep finite bursts.
- Keep the arm smooth using the same damping path; never snap as a reduced-motion
  shortcut.
- Do not change the required `0.5s` to `1.5s` spawn interval.

## Runtime and lifecycle integration

Proposed builder API:

```ts
export interface PrReaperInstallationBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
  getDebugState(): PrReaperInstallationDebugState;
  dispose(): void;
}

export interface PrReaperInstallationOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  detailPolicy: SceneDetailPolicy;
  random?: () => number;
  seed?: string;
}
```

Integration requirements:

- Continue using `addPoiStructure(prReaperPoi, installation.group)` so model
  triangles and visual anchors remain registered.
- Colliders are owned by the factory and registered with existing scene-object
  metadata. Start with projector/base and robot-base colliders; do not collide
  against individual circles, beams, or particles.
- Materials/geometries/textures owned by the installation must be disposed by an
  idempotent `dispose()` method. P5e should update `src/main.ts` teardown to call
  it during full and partial immersive disposal, mirroring existing structures
  with explicit disposal.
- Quality-triggered reload should rebuild with the active `detailPolicy`; the
  deterministic seed can remain stable per load so tests can reproduce streams.
- The stream advances even if the POI is unfocused. Emphasis may change screen
  brightness, halo intensity, and secondary accents, but never simulation
  correctness.
- `getDebugState()` should expose seed, elapsed stream time, spawn counters by
  type, active/reaped/expired IDs, current controller state, assigned target ID,
  current/target yaw/pitch, last beam start/end, burst durations, pool counts,
  and detail level.

## Miniature synchronization

The miniature proxy is static and recognizable; it must not animate or run the
full PR simulation. It should include:

- projector base;
- tall translucent blue screen;
- three red circle hints and one green circle hint;
- two-axis arm silhouette;
- laser-gun/tool-flange silhouette;
- optional short green beam hint.

P5b registry changes:

- Update the `pr-reaper-backyard-console` entry in
  `src/scene/miniature/poiProxyRegistry.ts`.
- Bump `syncRevision` from `2` to `3` and update `syncNote` to describe the
  holographic reaper proxy.
- Replace source tracking with all files that define visible/runtime semantics:
  - `src/scene/structures/prReaperConsole.ts` or the renamed
    `src/scene/structures/prReaperInstallation.ts`;
  - `src/scene/level/portfolioLevel.ts` if the footprint changes;
  - `src/scene/poi/registry.ts` if footprint/placement metadata changes;
  - `src/scene/poi/physicalMetadata.ts` if physical metadata changes;
  - `src/scene/graphics/sceneDetailPolicy.ts` if policy fields or budgets change;
  - `src/ui/accessibility/animationPreferences.ts` only if new preference helpers
    are introduced.
- Run `npm run miniature:manifest:update` after proxy/source changes, then
  `npm run docs:check`. If P5c-P5e alter source files without proxy geometry
  changes, bump `syncRevision` and add a meaningful `syncNote`, because the
  manifest script rejects source-only changes without acknowledgement.

## Testing matrix

P5b-P5e should add or update tests for:

| Area                | Assertions                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| Geometry bounds     | Root is bottom-center/unit-scale at resolved POI anchor and heading.                                   |
| Ratio               | Hologram width/height equals exactly `9 / 21`.                                                         |
| Ceiling clearance   | Top is below `WALL_HEIGHT - CEILING_COVE_OFFSET - clearance`.                                          |
| Floor clearance     | Bottom is above the floor and projector sits directly beneath.                                         |
| Stand-off           | Emitter/tool flange remains at least `hologramHeight / 2` from the screen plane at yaw/pitch extremes. |
| Determinism         | Same seed gives same spawn types, positions, intervals, burst durations, and target choices.           |
| Intervals           | Every spawn interval is within `0.5s` to `1.5s`.                                                       |
| Ratio               | Each shuffled four-candidate batch contains exactly three red and one green.                           |
| Horizontal bounds   | Circle centers keep the full circle visible within screen margins.                                     |
| Descent/expiration  | Progress advances with elapsed time and green/red candidates expire out of view.                       |
| Green immunity      | Green circles are never assigned, fired at, reaped, or hidden before expiration.                       |
| Kinematics          | Nonzero POI rotation still yields correct base-space yaw/pitch and clamps unreachable targets.         |
| Beam endpoints      | Firing beam starts at emitter and ends at exact red circle center every frame.                         |
| Particle duration   | Burst durations are deterministic and within `0.25s` to `0.50s`.                                       |
| Detail monotonicity | Triangles, draw calls, segments, halo layers, and particle counts reduce monotonically.                |
| Reduced motion      | Spawn semantics unchanged; pulses/halos/particles soften and arm remains damped.                       |
| Colliders           | Factory colliders register with scene-object metadata and do not include ephemeral effects.            |
| Disposal            | `dispose()` is idempotent and releases geometries/materials/buffers.                                   |
| Miniature           | Proxy contains projector, tall screen, 3 red hints, 1 green hint, arm, flange, and optional beam only. |
| Manifest            | Miniature manifest is fresh after proxy/source tracking changes.                                       |
| Integration         | Main update advances stream when unfocused and uses emphasis only for visuals.                         |

## PR decomposition after P5a

### P5b — Static procedural installation

Scope:

- Replace the abstract console model with static `PrReaperInstallation` geometry:
  projector, tall 9:21 blue screen, robot base, yaw/pitch arm silhouette, tool
  flange, laser emitter placeholder, colliders, detail variants, disposal, and
  static miniature proxy.
- Update footprint/physical metadata only as required by measured path tests.
- Keep PR circles, stream simulation, targeting, laser firing, and particles
  non-functional placeholders.

Depends on: P5a design.

### P5c — Deterministic 3:1 descending PR stream

Scope:

- Add pure seeded PR stream state, batched 3:1 red/green candidate generation,
  spawn intervals, horizontal bounds, descent/expiration, mesh pooling, debug
  state, and tests.
- Green and red circles descend; no arm targeting or reaping yet.

Depends on: P5b screen/circle roots and pools.

### P5d — Two-axis targeting, laser, and particle bursts

Scope:

- Add pure reaping state machine, two-axis yaw/pitch math, exact beam alignment,
  red removal, green immunity, particle burst pool, reduced-motion/flicker
  behavior, and tests.

Depends on: P5c deterministic stream and P5b robot hierarchy.

### P5e — Hardening, accessibility, performance, miniature sync, QA

Scope:

- Finalize detail budgets, disposal and partial teardown, quality reload behavior,
  collider metadata, accessibility edge cases, miniature manifest freshness,
  integration tests, smoke checks, and final documentation updates.

Depends on: P5b-P5d implementation complete.

## Recorded tradeoffs

- The stand-off invariant forces a footprint depth expansion if enforced for all
  legal poses. This is preferable to POI relocation because the screen remains at
  the authored anchor and only the custom factory collider envelope grows.
- The exact 3:1 ratio is defined over spawned candidates, not currently visible
  circles, because red candidates intentionally disappear early after reaping.
- Lower detail levels preserve simulation correctness and reduce only visual
  complexity; this avoids subtle quality-dependent gameplay/metaphor changes.
- The beam may geometrically connect emitter to target exactly during firing, but
  firing is gated by two-axis aim tolerance so the beam is not a hidden third
  aiming axis.
