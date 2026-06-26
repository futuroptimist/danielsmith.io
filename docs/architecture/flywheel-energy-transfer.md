# Flywheel kinetic energy installation and transfer network

This P6a design is documentation-only. It defines the implementation contract for
upgrading the `flywheel-studio-flywheel` POI into a grounded kinetic machine with a
metaphorical blue energy-transfer layer. P6b, P6c, and P6d should implement this
without adding external models, textures, audio, live network data, or all-arcs-visible
spiderweb effects.

## 1. Current-state audit

### Builder API and runtime contract

The current implementation lives in `src/scene/structures/flywheel.ts` and exposes:

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

`createFlywheelShowpiece(...)` currently returns a `FlywheelShowpiece` root group,
factory-owned rectangular colliders, and an `update(...)` method. The update loop animates
an abstract rotor, counter ring, orbiting points, automation pillars, tech-stack chips, and
selection-only documentation callouts. The builder attaches browser `poi:selected`,
`poi:selected:analytics`, and `poi:selection-cleared` listeners when `window` is present;
those listeners are removed when the root receives a `removed` event.

### `centerX` / `centerZ` and world-coordinate children

The builder accepts `centerX` and `centerZ` rather than a bottom-centered POI root position.
Many child objects are authored directly in world coordinates while the root group remains at
the origin:

- `FlywheelDais`, `FlywheelPedestal`, `FlywheelAccent`, and `FlywheelGlass` set positions
  with `options.centerX` and `options.centerZ`.
- `FlywheelRotorGroup`, `FlywheelCounterGroup`, `FlywheelOrbitGroup`, and
  `FlywheelTechStackGroup` copy that world-space center into child groups.
- `FlywheelInfoPanelGroup` computes and clamps a world-space panel location from
  `centerX`, `centerZ`, `orientationRadians`, and `roomBounds`.
- Factory colliders are emitted in world coordinates around the dais and info panel.

This is the main architectural issue to fix in P6b. Newer POIs should use a bottom-centered,
unit-scale root at the POI anchor, with all visible child geometry authored in local
coordinates. P6b should refactor Flywheel to match that contract so visual anchors,
colliders, miniature placement, and model-triangle accounting remain reliable.

### Main-scene creation, visual anchor, and model root

`src/main.ts` resolves `flywheel-studio-flywheel` from `poiInstances`, falls back to the
studio room center if the POI is unavailable, and builds the current showpiece with
`centerX`, `centerZ`, `roomBounds`, `orientationRadians`, and the active detail policy. If
there is a scene-object definition, source metadata is applied and factory colliders are
registered; otherwise colliders are appended directly to `groundColliders`.

When the POI exists, `addPoiStructure(...)` attaches the Flywheel group to the ground or
upper structure group based on `getPoiFloorId(...)`, calls `registerPoiModelRoot(...)`, and
calls `registerPoiVisualAnchor(..., 'floor')`. Because the current root is still at the
origin and child geometry is offset in world space, the registered model root/visual anchor
is not a reliable physical anchor for the visible machine.

The update loop currently gates the whole Flywheel update behind
`sceneDetailController.shouldRunDecorativeUpdate(...)`. That is acceptable for the existing
abstract decorative rotor, but P6b/P6c core crank/gear/flywheel and energy-transfer state
must update every rendered frame. Only secondary glow/halo work should be throttled.

Teardown currently sets `flywheelShowpiece = null`; the build has no explicit `dispose()`.
P6b must add idempotent disposal and `main.ts` must call it during immersive teardown and
quality reloads.

### Placement, physical metadata, and colliders

The registry defines `flywheel-studio-flywheel` as a studio project with a `2 x 2`
footprint, interaction radius `2.2`, heading `0`, and a hologram pedestal style. Runtime
placement may be overridden by scene-object placement in `src/scene/poi/placements.ts`.
Physical metadata currently has entries for some POIs, but not Flywheel. P6b should add
Flywheel metadata with real-world reference, intended scene bounds, marker clearance, and
avatar path clearance.

Current colliders cover the circular dais footprint and the old info-panel kiosk. P6b should
replace them with conservative physical colliders for the base/flywheel footprint and
crank/gearbox as needed. P6c must not add colliders for energy arcs.

### Miniature proxy and triangle accounting

`src/scene/miniature/poiProxyRegistry.ts` currently represents Flywheel with a teal dais,
rotor ring, spoke, and counterweight. It tracks `src/scene/structures/flywheel.ts` as a
source file and appears in `miniatureManifest.generated.json`. P6b/P6c should update the
proxy to the physical machine and static arc hints, bump `syncRevision`, refresh
`syncNote`, and regenerate the manifest.

`src/scene/poi/modelTriangles.ts` counts triangles from the registered model root. Because
the current root is not the visible bottom-center anchor, P6b should make the root itself the
placed installation so triangle accounting reflects the actual POI model.

### Current animation and selection behavior

The existing animation is metaphorical: a glowing rotor spins, a counter ring counter-rotates,
orbiting nodes move, pillars bob, and canvas-based labels/callouts fade in. Selection events
increase reveal strength and show the docs callout. P6b may remove these abstract elements if
they conflict with the physical machine, or rename/adapt retained glow language so it reads as
part of the installation.

## 2. Physical-size and root contract

P6b should introduce a shared contract module, for example
`src/scene/structures/flywheelEnergyContract.ts`, and keep dimensions/mechanics there rather
than duplicating constants across builder, tests, physical metadata, and miniature proxy.

Final root contract:

```ts
const FLYWHEEL_POI_ID = 'flywheel-studio-flywheel';
const FLYWHEEL_ROOT_NAME = 'FlywheelEnergyInstallation';
```

- Root name: `FlywheelEnergyInstallation`.
- Anchor: bottom-center of the full physical installation footprint.
- `group.position` equals the resolved Flywheel POI world anchor, including `y`.
- `group.rotation.y` equals the resolved Flywheel POI heading.
- `group.scale` remains `[1, 1, 1]`.
- All visible geometry is authored in local coordinates beneath the root.
- Factory colliders are conservative, physical, and world/heading-aware.
- Energy arcs are nonphysical and never emit colliders.

Proposed physical constants:

```ts
export const FLYWHEEL_INSTALLATION_BOUNDS = {
  width: 3.25,
  depth: 2.35,
  height: 2.65,
} as const;

export const FLYWHEEL_BASE = { width: 3.1, depth: 1.35, height: 0.22 } as const;
export const FLYWHEEL_WHEEL = {
  radius: 0.82,
  rimTube: 0.11,
  thickness: 0.2,
} as const;
export const FLYWHEEL_AXLE = {
  radius: 0.08,
  length: 2.55,
  centerY: 1.32,
} as const;
export const FLYWHEEL_BEARING_STAND = {
  width: 0.2,
  depth: 0.36,
  height: 1.22,
} as const;
export const FLYWHEEL_CRANK = { radius: 0.38, handleLength: 0.22 } as const;
export const FLYWHEEL_GEARBOX = { radius: 0.48, depth: 0.18 } as const;
export const FLYWHEEL_ENERGY_PORT = {
  position: { x: 0, y: 1.95, z: 0.62 },
} as const;
export const FLYWHEEL_MARKER_MIN_HEIGHT = 2.85;
```

These dimensions are wide enough for a visually heavy wheel plus side gearbox/crank, tall
enough to be impressive, and still below normal wall/ceiling visual clutter. The current
studio footprint should fit unless implementation measurement shows a minimal registry
footprint increase is needed; if so, update the POI footprint and physical metadata together.

## 3. Physical assembly design

Build a stable semantic hierarchy that tests and future docs can inspect:

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
│  ├─ FlywheelCounterweight-0..N
│  └─ FlywheelEnergyGlowRing
├─ FlywheelCrankGroup
│  ├─ FlywheelCrankDisc
│  ├─ FlywheelCrankArm
│  └─ FlywheelCrankHandle
├─ FlywheelPlanetaryGearbox
│  ├─ FlywheelRingGear
│  ├─ FlywheelSunGear
│  ├─ FlywheelPlanetCarrier
│  └─ FlywheelPlanetGear-0..2
├─ FlywheelOutputShaft
└─ FlywheelEnergyPort
```

The base should be visibly grounded: dark metal skid/base, bolted bearing uprights, axle
crossing the wheel, a crank on one side, gearbox on the opposite or front side, and an energy
port mounted to the machine. The machine should read from the default isometric camera as a
mechanical installation, not as a floating hologram. Blue glow is allowed as accents on the
rim/energy port, but the massing should remain metallic and physically plausible.

## 4. Planetary gear math

Use a fixed ring gear, hand crank driving the sun gear, and planet carrier as the high-torque
output. Shared constants:

```ts
export const FLYWHEEL_SUN_TEETH = 18;
export const FLYWHEEL_PLANET_TEETH = 24;
export const FLYWHEEL_RING_TEETH =
  FLYWHEEL_SUN_TEETH + FLYWHEEL_PLANET_TEETH * 2; // 66

export const FLYWHEEL_TORQUE_RATIO =
  1 + FLYWHEEL_RING_TEETH / FLYWHEEL_SUN_TEETH; // 4.666666...

export const FLYWHEEL_PLANET_COUNT = 3;
export const FLYWHEEL_CRANK_RADIANS_PER_SECOND = Math.PI * 0.72;
```

Animation formulas, all derived from one deterministic crank angle:

```ts
const crankAngle = elapsed * crankRadiansPerSecond;
const sunAngle = crankAngle;
const carrierAngle = sunAngle / FLYWHEEL_TORQUE_RATIO;
const outputShaftAngle = carrierAngle;
const flywheelAngle = outputShaftAngle;

const planetOrbitAngle = carrierAngle + (Math.PI * 2 * planetIndex) / 3;
const planetLocalSpin =
  -((FLYWHEEL_SUN_TEETH / FLYWHEEL_PLANET_TEETH) * sunAngle) +
  (FLYWHEEL_RING_TEETH / FLYWHEEL_PLANET_TEETH) * carrierAngle;
```

Visual convention:

- Ring teeth are fixed and point inward.
- Sun teeth rotate with the crank.
- Planets orbit the sun on `FlywheelPlanetCarrier`.
- Planets counter-spin relative to the carrier so their tooth motion reads as meshing.
- Output shaft and wheel rotate more slowly than the crank, implying increased torque.
- Gear teeth may be simplified procedural blocks/grooves; they must not rebuild during
  `update(...)`.

## 5. Detail-level plan

Semantic behavior must not change by detail level. Only rendering cost changes.

| Internal level |                                    Gear teeth |                Segments | Spokes | Bolts |       Glow layers | Packet nodes | Connectors / halos                         |
| -------------- | --------------------------------------------: | ----------------------: | -----: | ----: | ----------------: | -----------: | ------------------------------------------ |
| Cinematic      |                    Full 18/24/66 tooth blocks | 48 cylinders / 64 torus |      8 |   16+ | rim + port + halo |           14 | capsules + halo nodes                      |
| Balanced       |             Full tooth blocks, simpler bevels | 32 cylinders / 48 torus |      6 |    10 |        rim + port |           11 | capsules, no extra halo on reduced flicker |
| Performance    |             Every other tooth or grooved ring | 24 cylinders / 32 torus |      5 |     6 |   single rim/port |            8 | short capsules only                        |
| Low            | Grooved disks/rings, no individual ring teeth | 16 cylinders / 24 torus |      4 |   0-4 |         port only |            6 | no capsules; nodes only                    |
| Micro          |                       Iconic disks/rings only | 12 cylinders / 16 torus |      3 |     0 |        muted port |            4 | nodes only, no halo                        |

Cinematic, Balanced, and Performance should produce meaningfully different triangle counts.
Low and Micro should remain recognizable and preserve the same gear ratio/cycle state.

## 6. Energy-transfer concept

The energy network is a deterministic state machine, implemented in P6c as a pure module such
as `src/scene/structures/flywheelEnergyNetwork.ts`.

Eligibility rules:

- Every other ground-floor POI is eligible.
- `flywheel-studio-flywheel` is excluded.
- Upper-floor POIs are excluded for this baseline.
- Target positions come from resolved visual anchors or resolved POI world positions, never a
  duplicate hardcoded coordinate list.
- Only one transfer is active at a time.
- Cycle is exactly five incoming transfers followed by one outgoing transfer, then repeat.

Suggested types:

```ts
export type FlywheelEnergyDirection = 'incoming' | 'outgoing';

export interface FlywheelEnergyTarget {
  poiId: PoiId;
  label: string;
  floor: 'ground' | 'upper';
  worldPosition: { x: number; y: number; z: number };
}
```

Use a deterministic seeded selector, for example `mulberry32(hashSeed(seed))` or another
small pure PRNG. Do not call `Math.random()` in runtime energy-network code. The selector
should support a default seed (`'flywheel-energy-network:v1'`), produce stable test
sequences, optionally avoid immediate repeats when at least two targets exist, and keep the
5-in / 1-out rhythm exact.

## 7. Arc geometry and animation

Represent each active transfer as a parabolic packet, not a full arc.

For source `S` and destination `D` in world coordinates:

```ts
const source = liftEndpoint(S);
const destination = liftEndpoint(D);
const distance = horizontalDistance(source, destination);
const apexY = clamp(
  Math.max(source.y, destination.y) + 0.9 + distance * 0.08,
  1.3,
  3.8
);
const control = midpoint(source, destination);
control.y = apexY;

function sample(t: number) {
  return quadraticBezier(source, control, destination, clamp01(t));
}
```

Endpoint lift should keep packets readable above the floor: target POIs can use visual anchor
height plus `0.55`; Flywheel uses `FlywheelEnergyPort` world position. Clamp the apex so the
arc is floor-safe and ceiling/cove-safe.

Visible packet rules:

- Incoming window: approximately `0.10` of normalized curve phase.
- Outgoing window: approximately `0.16`.
- Packet travels source to destination as phase progresses `0 -> 1`.
- Full arc is never visible all at once.
- Outgoing packet is thicker, brighter, and stronger than incoming without full-bright flashes.
- Leading/trailing samples fade using a triangular or smoothstep falloff; center samples are
  strongest.

Rendering strategy:

- Preallocate node meshes per detail level.
- Optionally preallocate connector capsules/cylinders between adjacent nodes.
- Optionally preallocate halo nodes for Cinematic/Balanced.
- Convert sampled world points into Flywheel local space or a dedicated stable arc root before
  writing transforms.
- No per-frame `TubeGeometry`, material creation, geometry creation, dynamic point lights, or
  canvas redraws.

## 8. Runtime integration design

Final builder API:

```ts
interface FlywheelShowpieceOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  roomBounds: Bounds2D;
  detailPolicy?: SceneDetailPolicy;
  energySeed?: string;
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

`main.ts` integration:

1. Resolve Flywheel POI placement.
2. Build Flywheel once with `position` and `orientationRadians`.
3. Attach with `addPoiStructure(...)` so model root and visual anchor point to the placed root.
4. Register factory colliders with scene-object metadata if available.
5. After all ground-floor POI structures and anchors are registered, resolve energy targets and
   call `flywheelShowpiece.setEnergyTargets(...)`.
6. Call `flywheelShowpiece.update(...)` every rendered frame.
7. Pass `runDecorativeEffects` from
   `sceneDetailController.shouldRunDecorativeUpdate(...)` so only expensive secondary effects
   are throttled.
8. Call `dispose()` during full and partial immersive teardown/quality reloads.

## 9. Target resolution design

Add a helper such as `resolveFlywheelEnergyTargets(...)` near the runtime integration or in a
small module that can be tested. It should:

- Inspect resolved `poiInstances`.
- Use the same `getPoiFloorId(...)` floor resolver as the scene.
- Filter to ground-floor POIs.
- Exclude `flywheel-studio-flywheel`.
- Prefer `resolvePoiVisualAnchor(poiId)` and `Object3D.getWorldPosition(...)`.
- Fall back to `poi.group.getWorldPosition(...)` when an optional visual anchor is missing.
- Include `poiId`, title/label, floor, world position, and diagnostics for fallback/missing data.
- Fail open: missing optional targets should reduce target count and emit diagnostics, not crash
  immersive mode.
- Avoid any hardcoded production coordinate list.

Expected ground-floor examples, subject to current resolved floor data rather than hardcoding:
Futur Optimist, token.place, Sugarkube, PR Reaper, DSPACE, Jobbot if ground-floor, Axel if
ground-floor, Wove, f2clipboard, Sigma, Gitshelves if ground-floor, and the danielsmith.io
miniature table.

## 10. Accessibility

Use `getPulseScale()` and `getFlickerScale()` for presentation only.

Reduced-motion / reduced-pulse behavior:

- Gear/crank/flywheel motion remains synchronized; it may slow or smooth presentation but must
  not change ratios.
- Energy packets continue moving and keep the exact 5-in / 1-out rhythm.
- Glow/halo pulses soften; decorative halos may be disabled.
- No strobing, sudden full-bright flashes, or high-frequency flicker.
- Outgoing transfer remains distinct via width, opacity, and stable color, not flashing.
- Target selection and cycle order do not change.

## 11. Miniature proxy design

The miniature proxy remains static and must not run animation or the energy network. Update the
Flywheel proxy to show:

- heavy wheel and rim;
- crank;
- small gear cluster;
- base/bearing silhouette;
- energy port/glow;
- one thin incoming blue arc hint;
- one thicker outgoing blue arc hint.

Track source files:

- `src/scene/structures/flywheel.ts`;
- `src/scene/structures/flywheelEnergyContract.ts` after P6b;
- `src/scene/structures/flywheelEnergyNetwork.ts` after P6c;
- `docs/architecture/flywheel-energy-transfer.md` if the registry convention accepts docs as
  source context.

Bump `syncRevision` for each implementation phase that changes proxy semantics, update
`syncNote`, then run `npm run miniature:manifest:update` and `npm run miniature:check`.

## 12. Tests and PR decomposition

### P6b scope: physical machine

- Refactor root anchoring to bottom-center unit-scale local geometry.
- Add shared contract module and physical metadata.
- Build semantic hierarchy, planetary gear train, crank, bearings, wheel, and energy port.
- Update colliders, main integration, disposal, miniature physical proxy, and tests.
- Do not add cross-POI arcs yet.

### P6c scope: energy-transfer arcs

- Add pure deterministic energy-network module.
- Resolve targets from runtime ground-floor visual anchors.
- Add pooled parabolic packet rendering and `setEnergyTargets(...)`.
- Add accessibility presentation scaling, debug state, miniature arc hints, docs, and tests.

### P6d scope: hardening and final QA

- Audit lifecycle, quality reloads, hot-path allocations, detail reductions, accessibility,
  colliders, target resolution, model-root triangle registration, miniature sync, docs, and
  manual verification.
- Remove stale design alternatives that contradict final implementation.

### Test matrix

Implementation passes should cover:

- root anchoring and unit scale;
- physical bounds and marker clearance;
- planetary gear constants and finite torque ratio;
- `ringTeeth === sunTeeth + 2 * planetTeeth`;
- crank/sun/carrier/output/flywheel synchronization;
- planet orbit and counter-spin;
- all five detail levels and triangle/cost reductions;
- collider placement and scene-object collider metadata;
- physical metadata consistency;
- target resolution from visual anchors;
- Flywheel exclusion and upper-floor exclusion;
- exact 5 incoming / 1 outgoing cycle;
- deterministic selector and repeat avoidance;
- arc window length and outgoing/incoming visual difference;
- one visible packet and no full-arc spiderweb;
- hot-path allocation/pooling and no per-frame geometry/material creation;
- reduced pulse/flicker semantics;
- miniature proxy semantics and manifest freshness;
- idempotent disposal.

## Non-goals

- No external models.
- No external textures.
- No audio.
- No real GitHub/network data.
- No upper-floor arcs in the baseline.
- No all-arcs-visible spiderweb.
- No runtime implementation in P6a.
- Do not touch `docs/assets/game-launch.png`.
