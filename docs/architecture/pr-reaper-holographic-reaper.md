# PR Reaper holographic reaping installation architecture

P5a is documentation-only. P5b-P5e replace the current abstract PR Reaper console
with a procedural Three.js installation that keeps the existing POI id,
resolved anchor, and heading while adding a static hologram/projector/robot
assembly, a deterministic PR stream, and a testable two-axis reaping loop.

## Existing integration surface

The current PR Reaper runtime is `createPrReaperConsole(...)` in
`src/scene/structures/prReaperConsole.ts`. It returns `{ group, colliders,
update(...) }`, owns canvas textures/materials/geometries, and exposes named
children beginning with `PrReaperConsole*`. Tests currently validate structure,
rotation-aware custom colliders, emphasis pulses, accessibility pulse damping,
canvas-rendered incident logs, and material updates in
`src/tests/prReaperConsole.test.ts`.

`src/main.ts` resolves the live POI instance with id
`pr-reaper-backyard-console`, builds the console from the POI group's position
and `rotation.y`, applies scene-object source metadata for the declarative
`pr-reaper-backyard-console` scene object, registers factory colliders on the
POI collider target, calls `addPoiStructure(prReaperPoi, console.group)`, stores
`prReaperConsole`, and advances `prReaperConsole.update({ elapsed, delta,
emphasis })` in the immersive update loop. Full and partial immersive teardown
must dispose and null the build, matching the portfolio miniature and Sugarkube
patterns.

The declarative scene object placement in `src/scene/level/portfolioLevel.ts`
uses `{ x: 1.5, y: 0, z: 0.525 }` with heading `Math.PI * 0.35`; the public POI
registry in `src/scene/poi/registry.ts` keeps the backyard POI id at
`{ x: 0, y: 0, z: 20 }` with the same heading and a `2.4 x 2.0` footprint. P5
must not move the POI unless measured room/path constraints prove necessary.
The replacement should continue through `addPoiStructure(...)` so model triangle
metrics, visual anchors, POI focus, and miniature source tracking stay aligned.

Related patterns to preserve:

- `src/scene/structures/tokenPlaceWorkstation.ts` uses an injectable
  `mulberry32(seed)` generator for deterministic procedural rows; P5 should use
  the same generator shape instead of `Math.random()` in animation.
- `src/scene/environments/backyard.ts` contains pooled `Points` animations;
  particle bursts should follow that preallocated `BufferGeometry`/material
  pattern instead of spawning meshes during firing.
- `src/scene/lighting/ledStrips.ts` establishes emissive cyan/blue language and
  bloom-friendly materials; the reaper beam may visually rhyme with it but must
  not register itself in the room LED arrays.
- `src/ui/accessibility/animationPreferences.ts` exposes `getPulseScale()` and
  `getFlickerScale()`; laser halos, hologram scanlines, and particles must
  respect these scales.
- `src/scene/graphics/sceneDetailPolicy.ts` is the source of internal detail
  tiers; the new builder takes its detail policy from the same caller flow as
  other structures.
- The miniature architecture is registry driven by
  `src/scene/miniature/poiProxyRegistry.ts`,
  `src/scene/miniature/sceneComponentRegistry.ts`,
  `scripts/miniatureManifest.ts`, and
  `docs/architecture/miniature-tabletop.md`.

## Coordinate and physical-size contract

### Root and axes

The installation root is bottom-center, unit scale, and located at the existing
resolved POI visual anchor and heading. P5b may rename the returned root from
`PrReaperConsole` to `PrReaperInstallation`, but the POI id remains
`pr-reaper-backyard-console`.

Local axes after applying the root heading:

```text
                  +Y up
                   |
                   |
       screen top  |      hologram plane: local X/Y at local Z = 0
        +----------+----------+  +X right across screen
        |                     |
        | descending circles  |
        +----------+----------+
                   |
                   o root at floor, screen bottom-center projection
                  / \
                 /   \
        -Z robot/visitor side, +Z behind the hologram
```

All dimensions below are local scene units. The exact proposed constants are:

```ts
const PR_REAPER_CLEARANCE_BELOW_COVE = 0.12;
const PR_REAPER_SCREEN_BOTTOM_CLEARANCE = 0.36;
const PR_REAPER_SCREEN_HEIGHT =
  WALL_HEIGHT -
  CEILING_COVE_OFFSET -
  PR_REAPER_CLEARANCE_BELOW_COVE -
  PR_REAPER_SCREEN_BOTTOM_CLEARANCE;
const PR_REAPER_SCREEN_WIDTH = PR_REAPER_SCREEN_HEIGHT * (9 / 21);
const PR_REAPER_SCREEN_THICKNESS = 0.045;
const PR_REAPER_PROJECTOR_HEIGHT = 0.28;
const PR_REAPER_PROJECTOR_WIDTH = PR_REAPER_SCREEN_WIDTH * 0.62;
const PR_REAPER_PROJECTOR_DEPTH = 0.58;
const PR_REAPER_ROBOT_Z = -3.0;
const PR_REAPER_ROBOT_BASE_HEIGHT = 0.42;
const PR_REAPER_SHOULDER_HEIGHT = 1.18;
const PR_REAPER_ARM_LENGTH = 1.38;
const PR_REAPER_TOOL_LENGTH = 0.42;
const PR_REAPER_EMITTER_FORWARD_OFFSET = 0.22;
const PR_REAPER_MIN_EMITTER_STANDOFF = PR_REAPER_SCREEN_HEIGHT * 0.5;
```

With the current shared layout constants (`WALL_HEIGHT = 6`,
`CEILING_COVE_OFFSET = 0.35`), the screen height is
`6 - 0.35 - 0.12 - 0.36 = 5.17`, which is `86.17%` of wall height and therefore
above the required approximate `82%`. The top is at
`0.36 + 5.17 = 5.53`, leaving `0.12` below the cove/LED safe region at
`5.65`. The width is exactly `5.17 * 9 / 21 = 2.2157142857`.

The screen center is `(0, 0.36 + PR_REAPER_SCREEN_HEIGHT / 2, 0)`. The
projector base is centered directly below it at local
`(0, PR_REAPER_PROJECTOR_HEIGHT / 2, -0.02)`, with its lens aperture at
`(0, PR_REAPER_PROJECTOR_HEIGHT + 0.05, -0.08)` aimed upward into the
hologram root. The screen bottom clearance keeps the display visually clear of
the floor and leaves the physical projector underneath the translucent plane.

### Stand-off invariant and footprint

The robotic laser gun must remain at least half the hologram height away from
the hologram plane for every legal yaw/pitch pose, not only the parked pose:

```ts
Math.abs(emitterWorldPoint projected into root-local Z) >=
  PR_REAPER_MIN_EMITTER_STANDOFF;
```

Because the screen plane is local `Z = 0` and the robot is on the visitor side,
this is enforced as:

```ts
emitterLocal.z <= -PR_REAPER_MIN_EMITTER_STANDOFF;
```

For the values above, the required stand-off is `2.585`. The current POI
registry footprint depth is `2.0`, which cannot contain a robot positioned at
`z = -3.0` while preserving visitor clearance and legal arm motion. The smallest
justified footprint expansion is therefore:

```ts
const requiredVisitorClearance = 0.35;
const requiredDepth =
  PR_REAPER_MIN_EMITTER_STANDOFF +
  requiredVisitorClearance +
  PR_REAPER_PROJECTOR_DEPTH / 2;
// 2.585 + 0.35 + 0.29 = 3.225, round up to 3.3
```

P5b should update only PR Reaper physical metadata/footprint to `width: 3.0,
depth: 3.3` if collider/path audits pass. It should not move the POI. If the
studio/backyard path audit fails, use the existing heading and move the root
only along its local `+Z` by the smallest value that clears the avatar path,
documenting the measured collider delta in that PR.

The legal yaw/pitch envelope must be chosen so the emitter never crosses the
stand-off plane. Proposed limits:

```ts
const YAW_MIN = -0.46; // radians, left edge plus margin
const YAW_MAX = 0.46; // radians, right edge plus margin
const PITCH_MIN = -0.18; // slightly downward for low targets
const PITCH_MAX = 0.72; // upward for top-band acquisition
```

With a yaw-only base at `z = -3.0`, the forward component of the arm/tool can
never reduce the emitter stand-off below `2.585`; tests should sample yaw/pitch
limits and assert the invariant.

## Procedural model hierarchy

P5b should create stable semantic groups and meshes. Names are part of the test
contract and miniature debugging surface:

```text
PrReaperInstallation                Group; bottom-center POI root
  PrReaperProjectorBase             Group/Meshes; physical base below screen
  PrReaperHologramRoot              Group; local screen-space transform
    PrReaperHologramScreen          Mesh; translucent 9:21 blue plane
    PrReaperPrCircleRoot            Group; pooled circle meshes in screen space
  PrReaperRobotBase                 Group/Meshes; non-animated pedestal
    PrReaperYawJoint                Group; animated Y rotation only
      PrReaperPitchJoint            Group; animated local X rotation only
        PrReaperArmLink             Mesh/Group; rigid link
        PrReaperToolFlange          Group; rigid flange at link end
          PrReaperLaserEmitter      Group; emitter transform
            PrReaperLaserCore       Mesh; visible only while firing
            PrReaperLaserGlow       Mesh; optional translucent halo
  PrReaperParticleRoot              Points; pooled bursts
```

The arm has exactly two animated rotational axes:

1. base yaw around local `Y` on `PrReaperYawJoint`;
2. shoulder pitch around local `X` on `PrReaperPitchJoint`.

Do not add an elbow, wrist swivel, hidden billboard target, or per-frame mesh
look-at that creates a third aiming axis. The tool flange is rigidly derived
from the yaw/pitch chain.

## Holographic PR stream model

The PR stream uses actual `CircleGeometry` meshes parented beneath
`PrReaperPrCircleRoot`; it is not baked into a canvas texture. Every circle has
an exact Three.js center point by converting screen-local coordinates through
`PrReaperHologramRoot.localToWorld(...)`.

Pure simulation state:

```ts
type PrCircleType = 'red' | 'green';
type PrCircleLifecycle = 'active' | 'reaped' | 'expired';
type PrCircleTargetState =
  | 'none'
  | 'candidate'
  | 'assigned'
  | 'firing'
  | 'spent';

interface PrCircleState {
  id: number;
  type: PrCircleType;
  normalizedX: number; // 0..1 inside screen-safe margins
  normalizedProgress: number; // 0 at spawn above top, 1 at bottom expiry
  spawnTime: number;
  lifecycle: PrCircleLifecycle;
  targetState: PrCircleTargetState;
}
```

Randomness is deterministic and injectable:

```ts
interface PrReaperRandomSource {
  next(): number;
}
interface PrReaperStreamOptions {
  seed?: number; // default 0x0b10_0d3d
  random?: PrReaperRandomSource;
}
```

Use the same `mulberry32(seed)` algorithm shape already used by Token Place.
The animation loop may consume the injected generator through the stream
scheduler, but must never call `Math.random()` directly.

Spawn rules:

- Intervals are uniform in `[0.5, 1.5]` seconds.
- Circle radius is `0.075 * PR_REAPER_SCREEN_HEIGHT` for Cinematic/Balanced,
  with lower segment counts at lower detail levels but the same world radius.
- Horizontal positions are uniform in `[margin, 1 - margin]`, where
  `margin = circleRadius / PR_REAPER_SCREEN_WIDTH` so the whole mesh is visible.
- Vertical progress maps to screen-local Y as
  `screenY = PR_REAPER_SCREEN_HEIGHT * (0.5 - normalizedProgress)`; spawn may
  start at `-circleRadius / height` and expire at `1 + circleRadius / height`
  so circles enter/leave cleanly.
- Candidate types are produced in repeated batches of four entries containing
  exactly three `'red'` and one `'green'`; shuffle each batch with the same
  injected PRNG. The 3:1 ratio is defined over the spawned candidate stream,
  not visible active circles, because red circles disappear early after reaping.

Pooling and maximum active counts:

```ts
const MIN_INTERVAL = 0.5;
const MAX_VISIBLE_TRAVEL_SECONDS = 7.0;
const EXPIRE_GRACE_SECONDS = 0.5;
const MAX_ACTIVE_CIRCLES =
  Math.ceil(
    (MAX_VISIBLE_TRAVEL_SECONDS + EXPIRE_GRACE_SECONDS) / MIN_INTERVAL
  ) + 4; // 19, round to 20 pooled circle slots
```

Allocate `20` circle meshes up front. Store state in arrays and mutate in
place. Do not allocate vectors/materials per frame; use module-local or build
-local scratch `Vector3`, `Quaternion`, and array slots.

## Reaping state machine

The robotic state machine is pure and testable:

```text
idle -> acquire -> track -> fire -> burst -> recover -> idle
        ^          |         |       |
        |          v         v       v
        +------ target lost / expired / unreachable ------+
```

State responsibilities:

- `idle`: no assigned target; immediately scans deterministic red candidates.
- `acquire`: selects one red circle and marks `targetState = 'assigned'`.
- `track`: damps yaw/pitch toward the target until aim tolerance and hold pass.
- `fire`: shows laser for the fixed laser duration and keeps the beam endpoint
  equal to the red circle center every firing frame.
- `burst`: marks the red circle `reaped`, hides/releases its circle mesh, starts
  a pooled particle burst at the exact circle center, and prevents refiring.
- `recover`: enforces a short cooldown, then clears the assigned target.

Targeting rules:

- Red targets only. Green circles are never assigned, targeted, reaped, removed,
  or used as fallback targets.
- Deterministic priority is the lowest reachable active red circle inside the
  shooting band; tie-break by oldest `spawnTime`, then smallest `id`.
- Shooting band: `normalizedProgress` in `[0.28, 0.82]`. This keeps red circles
  visible before reaping and avoids shooting at entry/exit edges.
- Aim tolerance: `0.018` radians yaw and pitch.
- Optional aim hold: `0.08` seconds continuously inside tolerance.
- Laser duration: `0.11` seconds.
- Recover/cooldown: `0.18` seconds. Total fire cycle remains below the minimum
  `0.5` second spawn interval while still damping naturally.
- If a target expires before firing, clear its assignment and return to
  `acquire` without firing.
- If multiple red targets are present, do not switch while the current target is
  valid and reachable; the next cycle re-runs deterministic priority.
- A target with `targetState` of `'firing'` or `'spent'` is ineligible, which
  prevents double firing.

Arm angular speed should use critically damped interpolation with capped
velocity, not snapping:

```ts
const MAX_YAW_SPEED = 3.4; // rad/s
const MAX_PITCH_SPEED = 3.0; // rad/s
const DAMPING = 14;
```

These speeds can traverse the proposed yaw envelope in under `0.3` seconds and
still look mechanical.

## Two-axis aiming math

All math is performed in installation-local or arm-base-local space so nonzero
POI headings remain correct.

1. Resolve the target point:

   ```ts
   screenLocalTarget.set(
     (normalizedX - 0.5) * PR_REAPER_SCREEN_WIDTH,
     PR_REAPER_SCREEN_HEIGHT * (0.5 - normalizedProgress) +
       PR_REAPER_SCREEN_BOTTOM_CLEARANCE,
     0
   );
   const targetWorld = hologramRoot.localToWorld(screenLocalTarget.clone());
   const targetInBase = yawJoint.worldToLocal(targetWorld.clone());
   ```

2. Calculate yaw from the horizontal vector in base space. The robot faces
   local `+Z` from its shoulder toward the hologram; if implementation authors
   choose the opposite visual convention, keep this formula and rotate only the
   static mesh art.

   ```ts
   const yaw = Math.atan2(targetInBase.x, targetInBase.z);
   ```

3. Calculate pitch after removing yaw. Let `shoulder` be the pitch-joint origin
   in yaw-joint space. Rotate the target by `-yaw` around Y, subtract shoulder,
   then solve vertical angle:

   ```ts
   yawRemoved.copy(targetInBase).applyAxisAngle(Y_AXIS, -yaw).sub(shoulder);
   const horizontalDistance = Math.hypot(yawRemoved.z, yawRemoved.x);
   const pitch = Math.atan2(yawRemoved.y, horizontalDistance);
   ```

4. Clamp mechanical limits:

   ```ts
   const clampedYaw = MathUtils.clamp(yaw, YAW_MIN, YAW_MAX);
   const clampedPitch = MathUtils.clamp(pitch, PITCH_MIN, PITCH_MAX);
   const reachable =
     Math.abs(clampedYaw - yaw) <= 1e-4 &&
     Math.abs(clampedPitch - pitch) <= 1e-4 &&
     targetInBase.z > 0;
   ```

5. Damping toward target angles:

   ```ts
   const alpha = 1 - Math.exp(-DAMPING * delta);
   yawJoint.rotation.y = dampWithSpeedCap(
     yawJoint.rotation.y,
     clampedYaw,
     alpha,
     MAX_YAW_SPEED * delta
   );
   pitchJoint.rotation.x = dampWithSpeedCap(
     pitchJoint.rotation.x,
     clampedPitch,
     alpha,
     MAX_PITCH_SPEED * delta
   );
   ```

6. Tool flange and emitter positions are not solved independently. They are
   read from the scene graph after yaw/pitch updates:

   ```ts
   toolFlange.getWorldPosition(toolWorld);
   laserEmitter.getWorldPosition(emitterWorld);
   ```

Tests should run the same formulas with root headings `0`, `Math.PI * 0.35`,
and at least one negative heading to prove heading independence.

## Laser geometry and glow

No rendering dependency is added. The beam is reusable procedural geometry:

- `PrReaperLaserCore`: `CylinderGeometry` with a small radius and green
  `MeshBasicMaterial` or emissive `MeshStandardMaterial`.
- `PrReaperLaserGlow`: a wider translucent cylinder using additive-style
  transparency (`transparent: true`, low opacity, `depthWrite: false`).
- Optional second halo only at Cinematic.

Each firing frame aligns both cylinders between the current emitter world point
and the exact current target world point:

```ts
beamVector.subVectors(targetWorld, emitterWorld);
beamLength = beamVector.length();
beamMidpoint.addVectors(emitterWorld, targetWorld).multiplyScalar(0.5);
beam.position.copy(installation.worldToLocal(beamMidpoint));
beam.scale.set(1, beamLength, 1); // if cylinder local Y is unit height
beam.quaternion.setFromUnitVectors(Y_AXIS, beamVector.normalize());
```

The endpoint must equal the exact red circle center every firing frame. There is
no dynamic point light and no full-screen flash. Visual brightness adapts the
cyan/green emissive and bloom language used by room LED strips, but the beam is
owned entirely by the PR Reaper build.

Cheaper representations:

- Performance: core plus one halo with lower radial segments.
- Low: core only, slightly translucent and no halo pulse.
- Micro: a single thin green line/cylinder, visible only during `fire`, with no
  glow material and no pulse.

## Particle burst

Particle bursts are deterministic and pooled. Use one `Points` object under
`PrReaperParticleRoot` with preallocated attributes:

```ts
interface BurstParticle {
  active: boolean;
  age: number;
  lifetime: number;
  origin: Vector3;
  velocity: Vector3;
  color: Color;
}
```

Burst rules:

- Emitter origin is the reaped red circle's exact center.
- Burst duration is uniform in `[0.25, 0.50]` seconds using the injected PRNG.
- Velocities are deterministic radial/upward vectors generated once at burst
  start and written into existing typed arrays.
- Opacity fades as `1 - age / lifetime`; particle scale may shrink similarly.
- No per-particle meshes are created during firing.
- No dynamic lights are created.
- Reduced-motion/flicker reduces travel distance and opacity but not the reaped
  state or burst lifetime contract.

Detail particle counts:

```text
Cinematic 72 particles
Balanced  48 particles
Performance 28 particles
Low       12 particles
Micro      4 particles or one tiny fading Points cluster
```

`dispose()` must dispose the `BufferGeometry`, every buffer attribute owned by
it if manually replaced, and the `PointsMaterial`. It must be idempotent.

## Detail policies and budgets

The stream semantics and exact 3:1 candidate ratio are preserved at every
internal detail level. Detail changes reduce visual complexity only; they never
drop random red or green candidates to hit triangle targets.

| Level       | Screen/frame                           | Beam                | Particles | Arm/projector detail      | Est. triangles | Est. draw calls |
| ----------- | -------------------------------------- | ------------------- | --------- | ------------------------- | -------------: | --------------: |
| Cinematic   | 48-seg circles, frame rails, scanlines | core + 2 halos      | 72        | cables, bolts, lens rings |       <= 7,500 |           <= 32 |
| Balanced    | 32-seg circles, simple frame           | core + 1 halo       | 48        | simplified cables         |       <= 4,900 |           <= 25 |
| Performance | 24-seg circles, no scan mesh           | core + 1 cheap halo | 28        | no small bolts            |       <= 3,100 |           <= 19 |
| Low         | 16-seg circles, plane only             | core only           | 12        | blocky silhouette         |       <= 1,700 |           <= 13 |
| Micro       | 10-12-seg circles                      | single thin beam    | 4         | static silhouette         |         <= 850 |            <= 9 |

Monotonic reductions apply to primitive segments, decorative frame details,
laser halo layers, particle count, particle update frequency, arm cable/details,
and optional projector accents. Circle radius, spawn cadence, circle type order,
descent/expiration, green immunity, and target math stay unchanged.

## Accessibility

Use `getPulseScale()` for rhythmic size/brightness pulses and
`getFlickerScale()` for scanline/halo intensity changes. Reduced-motion and
reduced-flicker behavior must:

- preserve the candidate stream, 0.5-1.5 second spawn interval, 3:1 batched
  ratio, target selection, and reaping state machine;
- avoid strobing by disabling rapid opacity oscillation when flicker scale is
  near zero;
- suppress or soften laser halo pulses while leaving the core readable;
- reduce particle travel distance and brightness;
- keep the arm smooth through the same damping path rather than snapping or
  teleporting;
- leave green circles descending normally and never targeted.

## Runtime and lifecycle integration

Final builder API:

```ts
export interface PrReaperInstallationBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: {
    elapsed: number;
    delta: number;
    emphasis: number;
    detailPolicy?: SceneDetailPolicy;
  }): void;
  getDebugState(): PrReaperInstallationDebugState;
  dispose(): void;
}

export interface PrReaperInstallationOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  detailPolicy: SceneDetailPolicy;
  seed?: number;
  random?: PrReaperRandomSource;
}
```

`getDebugState()` should expose serializable data for tests: dimensions,
stand-off samples, active circle states, upcoming batch order if useful,
state-machine state, assigned target id, current yaw/pitch, reachability result,
laser endpoints while firing, particle pool counts, detail budget, and disposed
status.

Lifecycle requirements:

- Collider ownership stays with the build, returned through `colliders`, then
  registered with scene-object metadata in `src/main.ts` just like today.
- Material and geometry ownership stays inside the build; shared static
  geometries may be module-level only if they are never disposed by an instance.
- `dispose()` must be idempotent and safe after partial immersive teardown,
  quality-triggered reloads, and full app teardown.
- Quality-triggered reload behavior should rebuild the installation with the
  new detail policy and preserve only intentional state if a future caller asks;
  P5 should default to a fresh deterministic stream from the same seed.
- The core stream advances regardless of POI focus. Emphasis affects brightness,
  halo opacity, scanline strength, and optional accents only, not spawn timing,
  candidate type order, or target correctness.
- Continue using `addPoiStructure(...)` so model triangles and visual anchors
  remain registered.

## Miniature synchronization

The miniature proxy is static and recognizable. It must not animate or run the
full simulation. Proposed proxy content:

- projector base block;
- tall translucent-blue 9:21 screen slab;
- three red circle hints and one green circle hint arranged vertically;
- two-axis arm silhouette with base, shoulder link, and tool flange;
- laser-gun/tool-flange silhouette;
- optional short green beam hint from the tool toward one red hint.

P5b should update `src/scene/miniature/poiProxyRegistry.ts` for
`pr-reaper-backyard-console`:

- `displayName`: `PR Reaper holographic reaper proxy`;
- `syncRevision`: bump from `2` to `3`;
- `syncNote`: note the static hologram/projector/robot proxy;
- `sourceFiles`: include base POI files plus
  `src/scene/structures/prReaperConsole.ts` or its renamed replacement,
  `src/scene/structures/portfolioSceneLayout.ts`,
  `src/scene/graphics/sceneDetailPolicy.ts`, and
  `src/ui/accessibility/animationPreferences.ts`.

P5c should bump to revision `4` and add any new deterministic stream source
file to `sourceFiles`. P5d should bump to revision `5` and add any new aiming,
laser, or particle source files. P5e should bump to revision `6` if integration,
accessibility, performance, or lifecycle files change. After each source/proxy
change, run `npm run miniature:manifest:update` and include the generated
manifest diff unless the PR is docs-only like P5a.

`src/scene/miniature/sceneComponentRegistry.ts` does not need a new component
entry unless P5 introduces shared non-POI scene components outside the PR Reaper
proxy. The manifest script already audits `src/scene/structures`,
`src/scene/environments`, `src/scene/level`, `src/scene/avatar`,
`src/scene/lighting`, and `src/scene/poi`; stale source fingerprints require a
proxy change or a revision/note acknowledgment.

## Testing matrix

P5b-P5e should add or update tests covering:

- geometry root is bottom-center at the resolved POI anchor and heading;
- exact screen ratio `width / height === 9 / 21` within floating tolerance;
- screen height derives from `WALL_HEIGHT` and `CEILING_COVE_OFFSET` and remains
  at least ~82% of wall height;
- top clearance below cove/LED region;
- display bottom clearance above floor and projector directly below screen;
- robot emitter/tool-flange stand-off invariant across sampled legal yaw/pitch;
- documented footprint expansion and collider registration metadata;
- deterministic random sequences from a fixed seed;
- spawn intervals always in `[0.5, 1.5]`;
- exact batched 3:1 red-to-green candidate ratio over many batches;
- horizontal positions keep circles fully visible;
- descent progress and expiration behavior;
- green immunity: green circles are never assigned, targeted, reaped, or
  removed early;
- deterministic priority with multiple red targets;
- target expiration before firing returns to acquire/idle safely;
- no double firing at one target;
- two-axis kinematics and no hidden animated elbow/wrist axes;
- nonzero POI rotation, including `Math.PI * 0.35`, keeps beam endpoints exact;
- beam midpoint/length/quaternion align core and glow from emitter to target;
- target endpoint equals exact red circle center during every firing frame;
- particle duration lies in `[0.25, 0.50]` and pooled slots recycle;
- detail tiers monotonically reduce triangles/draw calls/segments/particles;
- reduced motion/flicker softens effects without changing stream correctness;
- collider ownership and debug source metadata;
- idempotent disposal of geometries, materials, textures, and attributes;
- miniature proxy contains the required static semantic hints and no animation;
- miniature manifest freshness after source/proxy updates;
- full and partial immersive teardown do not leak live update handles.

## PR decomposition

### P5b -- static installation replacement

Scope: replace the abstract console visuals with the static
`PrReaperInstallation`, projector base, 9:21 hologram screen, robot silhouette,
colliders, dispose path, detail-aware static geometry, updated tests, updated
miniature proxy revision 3, and manifest update. No descending stream or firing
logic yet.

Depends on P5a only.

### P5c -- deterministic descending PR stream

Scope: add pure stream state, injectable seeded randomness, exact shuffled 3:1
candidate batches, 0.5-1.5 second spawn intervals, visible circle mesh pool,
descent/expiration, debug state, tests, source-file tracking, proxy revision 4,
and manifest update. No laser or particle burst yet.

Depends on P5b.

### P5d -- two-axis targeting, laser reaping, and particles

Scope: add the idle/acquire/track/fire/burst/recover state machine, red-only
targeting, two-axis yaw/pitch math, stand-off invariant tests, exact-center
laser core/glow, pooled deterministic particle bursts, green immunity tests,
relevant accessibility scaling, proxy revision 5, and manifest update.

Depends on P5c.

### P5e -- hardening, accessibility, performance, miniature sync, final QA

Scope: complete integration hardening in `src/main.ts`, quality-triggered reload
checks, reduced-motion/flicker polish, detail budget tests, collider audits,
miniature semantics, manifest freshness, docs updates for any implementation
tradeoffs, final QA, and proxy revision 6 if implementation source files change.

Depends on P5d.

## Ambiguities and tradeoffs

- The current `2.4 x 2.0` POI footprint is too shallow for the requested
  half-screen-height gun stand-off. This design expands the footprint to
  `3.0 x 3.3` rather than moving the POI, but P5b must confirm path clearance
  with collider audits.
- The robot is intentionally a two-axis theatrical mechanism, not a physical IK
  arm. Some target points may be unreachable; the correct behavior is to skip
  unreachable red candidates until they expire or enter reach, not to add a
  hidden joint.
- The candidate ratio is exact over spawned candidates, not visible circles.
  Visible red counts will be lower because successful reaping removes them.
- The miniature proxy is symbolic and static by design; recursive live PR streams
  inside the tabletop are a non-goal.
