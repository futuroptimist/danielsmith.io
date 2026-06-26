# Flywheel kinetic energy installation and transfer network design

This P6a design is documentation-only. It defines the implementation contract for
turning `flywheel-studio-flywheel` into a grounded kinetic machine with a deterministic
blue energy-transfer packet network. P6b/P6c/P6d must preserve the existing POI
infrastructure and should not introduce external models, textures, audio, network data,
or upper-floor transfer arcs.

## 1. Current-state audit

### Builder and runtime contract

The current Flywheel runtime lives in `src/scene/structures/flywheel.ts` and exposes:

```ts
interface FlywheelShowpieceOptions {
  centerX: number;
  centerZ: number;
  roomBounds: Bounds2D;
  orientationRadians?: number;
  detailPolicy?: SceneDetailPolicy;
}

interface FlywheelShowpieceBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
}
```

`createFlywheelShowpiece(...)` builds a `Group` named `FlywheelShowpiece`, returns
factory-owned rectangular colliders, and returns an `update(...)` function that animates the
abstract rotor, counter ring, orbiting nodes, automation pillars, info panel, docs callout,
and tech-stack chips. It does not currently expose `dispose()`, `getDebugState()`, or an
energy-target setter.

### Current `centerX` / `centerZ` behavior

`main.ts` resolves the Flywheel POI, falls back to the studio room center if needed, and
passes `centerX`, `centerZ`, `roomBounds`, `orientationRadians`, and the active detail policy
to the builder. The builder then places many children at absolute world coordinates under a
root group that remains at the origin:

- `FlywheelDais`, `FlywheelPedestal`, `FlywheelAccent`, `FlywheelGlass`, and the rotor roots
  are positioned with `options.centerX` / `options.centerZ`.
- `FlywheelInfoPanelGroup` is clamped inside `roomBounds` using world-space target panel
  coordinates derived from `centerX`, `centerZ`, and `orientationRadians`.
- The base collider is computed as a world-space square around `centerX` / `centerZ`.
- The info-panel collider is computed from the world-space panel group position.

This is the key architectural issue P6b must fix: the current Flywheel builder authors many
child objects directly in world coordinates under a root group at the origin. Newer POIs
should use a bottom-centered unit-scale root at the POI anchor, with all child geometry
authored in local coordinates. Refactoring Flywheel to that contract keeps visual anchors,
factory colliders, miniature placement, and POI triangle accounting reliable.

### Current model root, visual anchor, placement, and colliders

`main.ts` uses the local `addPoiStructure(poi, group)` helper for Flywheel when the POI is
present. That helper chooses the ground or upper structure group from `getPoiFloorId(...)`,
adds the supplied group, registers it as the POI model root through `registerPoiModelRoot(...)`,
and registers it as the POI visual anchor with kind `floor` through `registerPoiVisualAnchor(...)`.
Because the current root remains at the origin while children are world-positioned, the model
root and visual anchor do not represent the physical center of the visible machine.

The Flywheel POI definition remains in `src/scene/poi/registry.ts` as a studio project at
`{ x: 10, y: 0, z: -2 }`, heading `0`, footprint `2 x 2`, with a hologram-style pedestal.
`src/scene/poi/placements.ts` can override POI placement from declarative scene objects and
manual placements. Flywheel currently relies on its registry/declarative placement rather than
a manual override. `src/scene/poi/physicalMetadata.ts` does not yet include Flywheel metadata,
so marker clearance and avatar path radius are not documented there.

Factory colliders are registered through `registerSceneObjectColliders(...)` when a matching
scene-object definition exists. Otherwise the builder colliders are pushed directly onto the
ground collider list. P6b should keep conservative physical colliders for the machine and
avoid colliders for future nonphysical energy arcs.

### Current miniature proxy

`src/scene/miniature/poiProxyRegistry.ts` defines the current static Flywheel proxy with
`syncRevision: 3`, source files including `src/scene/structures/flywheel.ts`, and primitives
for a small dais, rotor ring, spoke, and counterweight. The generated
`src/scene/miniature/miniatureManifest.generated.json` mirrors that entry. The proxy is a
static tabletop symbol and does not run Flywheel animation.

### Current animation and selection behavior

The builder listens to `poi:selected`, `poi:selected:analytics`, and `poi:selection-cleared`
DOM events when `window` exists. Selection increases `selectionStrength`, which reveals the
docs callout and tech-stack chips. Emphasis and selection affect rotor velocity, emissive
intensity, automation-pillar opacity/bobbing, panel reveal, and chip orbiting. In performance
detail, the update can early-return for unfocused Flywheel after rotating only the rotor.
`main.ts` currently gates the whole Flywheel `update(...)` call behind
`sceneDetailController.shouldRunDecorativeUpdate(...)`, so the core rotor may not advance every
rendered frame in throttled or unfocused modes.

## 2. Physical size and root contract

P6b should replace `FlywheelShowpiece` with a bottom-centered POI root:

```ts
const FLYWHEEL_ROOT_NAME = 'FlywheelEnergyInstallation';
```

Final root contract:

- `group.name = 'FlywheelEnergyInstallation'`.
- `group.position` equals the resolved Flywheel POI world anchor, including `y`.
- `group.rotation.y` equals the resolved Flywheel POI heading.
- `group.scale` remains `[1, 1, 1]`.
- The root origin is the bottom-center of the physical footprint at floor height.
- All visible child geometry is authored in root-local coordinates.
- Colliders are conservative world-space rectangles derived from local dimensions and root
  heading.
- Colliders cover the base, bearing/gearbox footprint, and crank clearance where physical.
- No colliders are created for energy arcs or energy packets.

Approximate final dimensions should fit the current studio route unless collider audits prove
a minimal footprint update is necessary:

```ts
export const FLYWHEEL_INSTALLATION_BOUNDS = {
  width: 2.8,
  depth: 2.25,
  height: 2.65,
} as const;

export const FLYWHEEL_BASE = {
  width: 2.55,
  depth: 1.55,
  height: 0.22,
} as const;

export const FLYWHEEL_WHEEL = {
  radius: 0.82,
  rimTubeRadius: 0.105,
  thickness: 0.22,
  centerY: 1.42,
  centerZ: -0.18,
} as const;

export const FLYWHEEL_GEARBOX = {
  radius: 0.46,
  centerX: -0.78,
  centerY: 1.34,
  centerZ: 0.34,
  depth: 0.2,
} as const;

export const FLYWHEEL_MARKER_MIN_HEIGHT = 2.8;
export const FLYWHEEL_AVATAR_PATH_RADIUS = 1.15;
```

These constants should live in a shared module such as
`src/scene/structures/flywheelEnergyContract.ts`. The builder, tests, physical metadata,
miniature proxy, and docs should import or mirror that single contract rather than duplicating
magic dimensions.

## 3. Physical assembly design

The installation should read as a physical machine, not a floating hologram. Use metal,
rubberized grip, bearing blocks, shafts, bolts, and restrained blue energy accents. Stable
semantic names are part of the test and QA contract:

```text
FlywheelEnergyInstallation
├─ FlywheelBase
├─ FlywheelBearingStandLeft
├─ FlywheelBearingStandRight
├─ FlywheelAxle
├─ FlywheelWheelGroup
│  ├─ FlywheelHeavyRim
│  ├─ FlywheelInnerHub
│  ├─ FlywheelSpoke-0..N
│  ├─ FlywheelCounterweight-0..M
│  └─ FlywheelEnergyGlowRing
├─ FlywheelCrankGroup
│  ├─ FlywheelCrankDisc
│  ├─ FlywheelCrankArm
│  └─ FlywheelCrankHandle
├─ FlywheelPlanetaryGearbox
│  ├─ FlywheelRingGear
│  ├─ FlywheelSunGear
│  ├─ FlywheelPlanetCarrier
│  ├─ FlywheelPlanetGear-0..2
│  └─ FlywheelOutputShaft
└─ FlywheelEnergyPort
```

Suggested spatial layout in local coordinates:

- Base centered at the root, wide on local X and deep on local Z.
- Wheel plane vertical, centered near local `x = 0.28`, `y = 1.42`, `z = -0.18`, with its axle
  running along local X so the wheel is clearly visible from the default isometric camera.
- Bearing stands straddle the wheel on local X, rise from the base, and cradle the axle.
- Gearbox is mounted to one side/front of the axle, not floating; it shares a bracket with the
  bearing stand.
- Hand crank is coaxial with the sun gear on the accessible gearbox face, with a handle offset
  by the crank radius.
- Output shaft visibly connects the carrier to the main flywheel axle.
- Energy port sits on the upper/front edge of the base or gearbox, using a small blue coil/ring
  target for P6c arc endpoints.

P6b may remove the old abstract glass cylinder, orbit chips, automation pillars, tech-stack
chips, and info panel if they conflict with the physical metaphor. Any retained old element must
be renamed and visually adapted so it serves the new physical machine.

## 4. Planetary gear math

Use a fixed-ring planetary gearset. The hand crank drives the sun gear; the ring gear is fixed
to the gearbox housing; the planet carrier becomes the high-torque output that drives the shaft
and flywheel. The initial shared constants should be:

```ts
export const FLYWHEEL_SUN_TEETH = 18;
export const FLYWHEEL_PLANET_TEETH = 24;
export const FLYWHEEL_RING_TEETH =
  FLYWHEEL_SUN_TEETH + FLYWHEEL_PLANET_TEETH * 2; // 66

export const FLYWHEEL_TORQUE_RATIO =
  1 + FLYWHEEL_RING_TEETH / FLYWHEEL_SUN_TEETH; // 4.666...
```

For a fixed ring, sun input, carrier output planetary set:

```ts
const crankAngle = elapsed * FLYWHEEL_CRANK_RADIANS_PER_SECOND;
const sunAngle = crankAngle;
const carrierAngle = sunAngle / FLYWHEEL_TORQUE_RATIO;
const planetOrbitAngle = carrierAngle;
const outputShaftAngle = carrierAngle;
const flywheelAngle = outputShaftAngle;
```

Planet local spin should counter-spin relative to the carrier so teeth appear to mesh with the
fixed ring and spinning sun. A testable visual approximation is:

```ts
const planetLocalSpin =
  -sunAngle * (FLYWHEEL_SUN_TEETH / FLYWHEEL_PLANET_TEETH) + carrierAngle;
```

If P6b implements the full kinematic derivation, document the final formula in this file and
keep the fixed-ring ratio invariant. The visual convention is more important than modeling every
tooth contact perfectly: teeth intermesh believably, planets orbit around the sun, planets
counter-spin relative to the carrier, and the flywheel turns more slowly than the crank with
implied higher torque. Emphasis may affect glow and a shared angular-speed multiplier, but it
must not desynchronize crank, sun, carrier, output shaft, or flywheel.

## 5. Detail-level plan

All five internal `SceneDetailPolicy` levels preserve semantic behavior. They only reduce
rendering cost.

| Internal level | Gear teeth / simplification                                          | Segments                                 | Spokes / bolts                      | Glow layers                  | Energy packet samples | Connectors / halo                      |
| -------------- | -------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------- | ---------------------------- | --------------------- | -------------------------------------- |
| Cinematic      | Full 18/24/66 tooth blocks; internal ring teeth                      | 48-64 rings/cylinders, 24-32 torus tubes | 8 spokes, counterweights, 16+ bolts | 3 glow layers plus port halo | 15 nodes              | Connectors and halo nodes              |
| Balanced       | Full tooth counts with simpler tooth boxes                           | 32-48 rings/cylinders, 16-24 torus tubes | 6 spokes, 8-12 bolts                | 2 glow layers                | 11 nodes              | Connectors, no extra halo beyond nodes |
| Performance    | Every second tooth or grooved rings while preserving ratio constants | 20-32 rings/cylinders                    | 5-6 spokes, 4 bolts                 | 1 glow layer                 | 8 nodes               | Short connectors only                  |
| Low            | Grooved sun/planet/ring silhouettes; no individual tooth blocks      | 12-20 cylinders                          | 4 spokes, no loose bolts            | 1 soft port/glow ring        | 5 nodes               | No connectors                          |
| Micro          | Iconic disks/rings only; semantic groups still named                 | 8-12 cylinders                           | 3-4 block spokes                    | Small port material only     | 3 nodes               | No connectors or halo                  |

Cinematic, Balanced, and Performance should have meaningfully different triangle counts. Low and
Micro should remain recognizable on the miniature/low-end path without building hidden high-detail
variants.

## 6. Energy-transfer concept

The P6c energy network makes Flywheel an exchange node for the ground floor:

- Every other ground-floor POI is eligible.
- `flywheel-studio-flywheel` is excluded.
- Upper-floor POIs are excluded for the baseline.
- Target positions come from resolved visual anchors or resolved POI positions at runtime, not
  hardcoded duplicate coordinates.
- Only one transfer is active at a time.
- The exact rhythm is five incoming transfers from selected ground-floor POIs into Flywheel,
  then one outgoing transfer from Flywheel to a selected ground-floor POI, then repeat.

Use a deterministic seeded selector in a pure module, for example
`src/scene/structures/flywheelEnergyNetwork.ts`. It should avoid `Math.random()` in runtime code,
use a default seed such as `'flywheel-energy-transfer:v1'`, be stable for tests, and avoid
immediate repeats when at least two eligible targets exist. The 5-in / 1-out rhythm is stateful
and exact; detail level, reduced motion, and focus must not alter target order or transfer
counts.

Expected ground-floor examples to appear when they are on the resolved ground floor include
Futur Optimist, token.place, Sugarkube, PR Reaper, DSPACE, Jobbot if placed on the ground floor,
Axel if placed on the ground floor, Wove, f2clipboard, Sigma, Gitshelves if placed on the ground
floor, and the `danielsmith.io` table. This is not a production target list. The implementation
must derive the exact set from resolved floor data.

## 7. Arc geometry and animation

Each active transfer is a parabolic packet moving from source to destination. The full arc is
never visible all at once.

Arc definition:

```ts
interface FlywheelArcPoint {
  x: number;
  y: number;
  z: number;
}

const source = liftedSourceWorldPoint;
const destination = liftedDestinationWorldPoint;
const midpoint = lerp(source, destination, 0.5);
const distance = horizontalDistance(source, destination);
const control = {
  x: midpoint.x,
  y: clamp(midpoint.y + Math.max(0.85, distance * 0.18), 1.15, 4.7),
  z: midpoint.z,
};
```

Sampling uses a quadratic Bezier:

```text
B(t) = (1 - t)^2 * source + 2 * (1 - t) * t * control + t^2 * destination
```

Use floor-safe and ceiling-safe heights. Lift source/target anchors to a readable height
(`anchor.y + 0.85` or the target's own visual-anchor height if higher), and clamp the control
point below the wall/cove safe zone. Convert sampled world points into Flywheel-local space (or
a stable packet root space) before writing mesh transforms so nonzero Flywheel heading works.

Visible packet rules:

- Incoming window: `0.10` of normalized arc phase.
- Outgoing window: `0.16` of normalized arc phase.
- Packet moves source-to-destination with `phase` from 0 to 1.
- Window start/end are clamped around the phase: `start = max(0, phase - window * 0.5)`,
  `end = min(1, start + window)`, then adjust start when end clamps.
- Nodes sample evenly inside `[start, end]`.
- Fade edges with a triangular or smoothstep envelope: middle nodes are brightest; first and
  last visible nodes have low opacity/scale.
- Outgoing packets use greater radius, opacity, and emissive intensity than incoming packets.

Rendering should be pooled procedural geometry:

- Preallocate glowing node meshes up to the detail-level maximum.
- Optionally preallocate connector cylinders/capsules between adjacent nodes for high detail.
- Optionally preallocate a halo node layer for Cinematic/Balanced.
- Do not allocate `TubeGeometry` per frame.
- Do not create materials/geometries per frame.
- Do not add dynamic point lights for packets.

## 8. Runtime integration design

P6b/P6c should converge on this builder API:

```ts
interface FlywheelShowpieceOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  roomBounds: Bounds2D;
  detailPolicy?: SceneDetailPolicy;
  seed?: string;
}

interface FlywheelEnergyTarget {
  poiId: string;
  label: string;
  floor: 'ground' | 'upper';
  worldPosition: { x: number; y: number; z: number };
}

interface FlywheelDebugState {
  detailLevel: SceneDetailPolicy['level'];
  crankAngle: number;
  sunAngle: number;
  carrierAngle: number;
  flywheelAngle: number;
  targetCount: number;
  diagnostics: readonly string[];
  activeTransfer?: {
    direction: 'incoming' | 'outgoing';
    targetPoiId: string;
    phase: number;
    windowStart: number;
    windowEnd: number;
    incomingCompletedInCycle: number;
    outgoingCompleted: number;
    activeNodeCount: number;
  };
}

interface FlywheelShowpieceBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: {
    elapsed: number;
    delta: number;
    emphasis: number;
    runDecorativeEffects?: boolean;
  }): void;
  setEnergyTargets(targets: readonly FlywheelEnergyTarget[]): void;
  getDebugState(): FlywheelDebugState;
  dispose(): void;
}
```

`main.ts` integration plan:

1. Resolve the Flywheel POI placement.
2. Build the Flywheel once using `position: flywheelPoi.group.position` and
   `orientationRadians: flywheelPoi.group.rotation.y`.
3. Attach the root with `addPoiStructure(...)` so model-root and visual-anchor registration use
   the unit-scale installation root.
4. Register factory colliders with scene-object metadata as today.
5. Build other POI structures and register their visual anchors.
6. After all ground-floor POI structures/anchors are registered, resolve Flywheel energy targets
   and call `flywheelShowpiece.setEnergyTargets(...)`.
7. Call `flywheelShowpiece.update(...)` every rendered frame so gears and energy packets advance
   smoothly.
8. Use `sceneDetailController.shouldRunDecorativeUpdate(...)` only to compute
   `runDecorativeEffects`; do not gate the core Flywheel update behind it.
9. On immersive teardown or quality reload, call `dispose()` idempotently and clear the handle.

## 9. Target resolution design

Add a helper such as `resolveFlywheelEnergyTargets(...)` near the runtime integration layer or in
a focused POI utility. It should not live inside `flywheel.ts` with hardcoded coordinates.

Required behavior:

- Inspect resolved `poiInstances`.
- Filter to `getPoiFloorId(poi.definition) === 'ground'`.
- Exclude `flywheel-studio-flywheel`.
- Prefer `resolvePoiVisualAnchor(poi.definition.id)` and read `object.getWorldPosition(...)`.
- Fall back to the resolved POI group world position or definition position if an optional anchor
  is missing.
- Include `poiId`, title/label, floor, and a copied world position.
- Return diagnostics for skipped/missing optional targets without throwing.
- Keep immersive mode loading even when optional target resolution fails.
- Avoid hardcoded duplicate ground-floor coordinate lists.

The helper should be tested with mixed floor data so upper-floor POIs are excluded and Flywheel
itself never becomes a target.

## 10. Accessibility

Use `getPulseScale()` and `getFlickerScale()` for presentation only. Reduced settings may soften
or slow visual presentation, but not the deterministic state machine.

Reduced-motion / reduced-flicker rules:

- Gear/crank/flywheel motion remains visible and synchronized; it may slow or smooth via a shared
  speed multiplier that preserves ratios.
- Energy packets continue moving and complete transfers.
- Glow and halo pulses soften; no strobing or abrupt full-bright flashes.
- Outgoing transfer remains visibly distinct through steady thickness/opacity, not sudden flashes.
- Target selection, target order, and 5-in / 1-out rhythm do not change.
- Reduced flicker may remove high-detail halos/connectors and lower emissive intensity, but it
  must not hide all energy-transfer feedback.

## 11. Miniature proxy design

The miniature proxy remains static. It should not animate gears, run the target selector, or
instantiate the energy network. Update `src/scene/miniature/poiProxyRegistry.ts` and regenerate
`src/scene/miniature/miniatureManifest.generated.json` when implementation lands.

Proxy contents:

- Heavy wheel and rim.
- Base and bearing silhouette.
- Crank arm/handle.
- Small gear cluster.
- Energy port/glow hint.
- One thin incoming blue arc hint.
- One thicker outgoing blue arc hint.

Source tracking should include the runtime Flywheel files and the shared contracts, for example:

```ts
sourceFiles: [
  ...baseFiles,
  'src/scene/structures/flywheel.ts',
  'src/scene/structures/flywheelEnergyContract.ts',
  'src/scene/structures/flywheelEnergyNetwork.ts',
];
```

Increment `syncRevision` whenever the proxy shape, source-file list, or miniature sync contract
changes. The `syncNote` should explicitly state whether it reflects the physical P6b assembly,
the P6c energy arcs, or the P6d hardening pass.

## 12. Tests and PR decomposition

### P6b scope: physical assembly and planetary train

- Create `src/scene/structures/flywheelEnergyContract.ts` with dimensions and gear constants.
- Refactor the builder to a bottom-centered local-coordinate root.
- Build the physical hierarchy and planetary animation.
- Update `main.ts` so Flywheel core motion updates every frame.
- Add conservative physical colliders and physical metadata.
- Add `dispose()` and `getDebugState()`.
- Update the static miniature proxy for the physical machine.
- Update this document with final physical constants and hierarchy corrections.

### P6c scope: energy-transfer arcs

- Create `src/scene/structures/flywheelEnergyNetwork.ts` as a pure deterministic state module.
- Add target resolution from runtime POI instances/visual anchors after all anchors are registered.
- Add `setEnergyTargets(...)` and one visible pooled parabolic packet at a time.
- Preserve gear motion from P6b.
- Update accessibility presentation and debug state for energy transfers.
- Update miniature proxy with incoming/outgoing arc hints.
- Update this document with final module names and transfer timings.

### P6d scope: hardening and final QA

- Audit integration, teardown, quality reloads, and stale target/material cleanup.
- Remove hot-path allocations and strengthen pooling tests.
- Consolidate accessibility/detail-policy tests.
- Verify collider/physical metadata and model-root triangle registration.
- Finalize miniature `syncRevision`, `syncNote`, manifest freshness, and docs.
- Complete manual QA in Cinematic, Balanced, and Performance.

### Test matrix

Required tests across P6b/P6c/P6d:

- Root anchoring and unit scale.
- Physical bounds and marker clearance.
- Shared gear constants, finite dimensions, and ring teeth equals `sun + 2 * planet`.
- Torque-ratio formula and synchronized crank/sun/planet/carrier/flywheel motion.
- Detail-level reductions and meaningful public-mode triangle deltas.
- Collider placement, rotation, source metadata, and no colliders for arcs.
- Target resolution from visual anchors/resolved runtime data.
- Flywheel and upper-floor target exclusion.
- Exact 5-in / 1-out deterministic cycle.
- Deterministic selector and immediate-repeat avoidance when possible.
- Incoming and outgoing directionality.
- Incoming arc window about 10%; outgoing window larger.
- Outgoing packet thicker/brighter than incoming without strobing.
- Exactly one packet visible; no all-arcs-visible spiderweb.
- Hot-path allocation and pooling: no per-frame geometry/material/TubeGeometry creation.
- Accessibility semantics under reduced pulse, reduced flicker, and both.
- Miniature proxy semantics and no miniature animation/selector.
- Manifest freshness.
- Idempotent disposal and quality-reload safety.
- Docs remain current.

## Non-goals

- No external models.
- No external textures.
- No audio.
- No real GitHub/network data.
- No upper-floor arcs in the baseline.
- No all-arcs-visible spiderweb.
- No runtime implementation in P6a.
- Do not touch `docs/assets/game-launch.png`.
