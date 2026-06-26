# Flywheel kinetic energy installation and transfer network

This P6a design is documentation-only. It defines the implementation contract for
upgrading `flywheel-studio-flywheel` from the current abstract automation showpiece
into a physical kinetic installation plus a deterministic blue energy-transfer network.
P6b/P6c/P6d should implement this design without external models, external textures,
audio, runtime network data, upper-floor arcs, or an all-arcs-visible spiderweb.

## 1. Current-state audit

### Existing Flywheel builder

`src/scene/structures/flywheel.ts` currently exports:

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

The builder creates `group.name = 'FlywheelShowpiece'`, owns a local `colliders`
array, registers browser `poi:selected`, `poi:selected:analytics`, and
`poi:selection-cleared` listeners when `window` exists, and removes those listeners
when the root is removed. The current update contract animates the rotor, orbiting
chips, automation pillars, and selection callout intensity from `elapsed`, `delta`,
and `emphasis`; it has no `dispose()`, `getDebugState()`, `setEnergyTargets(...)`,
or `runDecorativeEffects` split.

### Current `centerX` / `centerZ` issue

The current builder accepts `centerX` and `centerZ` and authors many child objects
directly in world coordinates while the root group stays at the origin. Examples
include the dais, pedestal, glass cylinder, rotor group, automation pillars, info
panel, and docs callout placing themselves at `options.centerX` / `options.centerZ`.
That means the root is not the model's bottom-center anchor, child coordinates are
not local to the POI, and root rotation/translation semantics are only partially
expressed in the hierarchy.

This is the major architectural issue P6b must fix: newer POIs use a bottom-centered,
unit-scale root placed at the resolved POI anchor, with all visible geometry authored
in local coordinates. Flywheel must be refactored to that contract so visual anchors,
factory colliders, miniature placement, model-root triangle accounting, and future
energy arc endpoint transforms stay reliable.

### Main-scene creation, visual anchors, and updates

`src/main.ts` resolves `flywheelPoi` from `poiInstances`, falls back to the studio
room center when absent, and calls `createFlywheelShowpiece({ centerX, centerZ,
roomBounds, orientationRadians, detailPolicy })`. It applies scene-object metadata,
registers factory colliders, then uses `addPoiStructure(flywheelPoi, showpiece.group)`
when the POI exists. `addPoiStructure(...)` attaches the root to the ground or upper
structure group, registers the group as the POI model root, and registers the same
group as the floor visual anchor.

Current frame-loop behavior gates the entire `flywheelShowpiece.update(...)` behind
`sceneDetailController.shouldRunDecorativeUpdate(..., 'flywheel')`. That is acceptable
for purely decorative rotor accents but not for P6b/P6c, where crank, gears, flywheel,
and packet phase are core mechanism state. Future integration must call Flywheel every
rendered frame and pass a boolean such as `runDecorativeEffects` for throttled secondary
presentation only.

### Placement and physical metadata

The POI registry places `flywheel-studio-flywheel` in the studio at `{ x: 10, y: 0,
z: -2 }`, heading `0`, interaction radius `2.2`, and footprint `2 x 2`. The Flywheel
entry still has hologram-pedestal styling from the old abstract model. Placement may
also be overridden through scene-object migration helpers in `placements.ts`; P6b/P6c
must use the resolved runtime POI instance rather than duplicating coordinates.

`physicalMetadata.ts` currently has generic POI physical-size contracts and no shared
Flywheel energy-installation contract module. P6b should add/update Flywheel metadata
using the final dimensions below, retaining the bottom-center anchor and marker
clearance conventions used by other upgraded POIs.

### Miniature proxy

`src/scene/miniature/poiProxyRegistry.ts` defines a static Flywheel proxy with a dais,
rotor ring, spoke, and counterweight. Its `sourceFiles` currently track
`src/scene/structures/flywheel.ts`; `syncRevision` is `3` in the audited state. The
proxy represents the old abstract rotor, not a physical flywheel/crank/gearbox or the
future energy-transfer hints. P6b should update the physical proxy; P6c should add the
static incoming/outgoing arc hints; P6d should finalize source files, `syncRevision`,
`syncNote`, and generated manifest freshness.

### Current tests and selection behavior

`src/tests/flywheelShowpiece.test.ts` asserts the current root name, rotor group, info
panel, docs callout canvas text, selection reveal behavior, stack chips, and automation
pillars. Those tests intentionally describe the old implementation and should be
rewritten around the new contract. The current selection behavior is an internal
window-event listener that reveals `FlywheelDocsCallout`; future behavior should prefer
`emphasis` passed from `main.ts`, with any direct selection listener either removed or
covered by disposal tests.

## 2. Physical-size and root contract

### Root contract

P6b should replace the root with:

```ts
const FLYWHEEL_ROOT_NAME = 'FlywheelEnergyInstallation';
```

The root contract is:

- bottom-center anchor at local `[0, 0, 0]`;
- `group.position` equals the resolved Flywheel POI world anchor;
- `group.rotation.y` equals the resolved Flywheel POI heading;
- `group.scale` remains `[1, 1, 1]`;
- all visible geometry is authored in local coordinates;
- colliders are conservative physical footprints for the base and gearbox/crank reach;
- energy arcs are nonphysical and must not create colliders.

### Approximate dimensions

Use one shared module, `src/scene/structures/flywheelEnergyContract.ts`, for dimensions,
gear constants, animation constants, detail-level budgets, marker clearance, and arc
rendering budgets. Proposed starting constants:

```ts
export const FLYWHEEL_INSTALLATION_WIDTH = 2.8;
export const FLYWHEEL_INSTALLATION_DEPTH = 2.25;
export const FLYWHEEL_INSTALLATION_HEIGHT = 2.75;
export const FLYWHEEL_BASE_WIDTH = 2.55;
export const FLYWHEEL_BASE_DEPTH = 1.35;
export const FLYWHEEL_BASE_HEIGHT = 0.22;
export const FLYWHEEL_WHEEL_RADIUS = 0.78;
export const FLYWHEEL_WHEEL_THICKNESS = 0.18;
export const FLYWHEEL_AXLE_RADIUS = 0.09;
export const FLYWHEEL_AXLE_HEIGHT = 1.28;
export const FLYWHEEL_GEARBOX_RADIUS = 0.48;
export const FLYWHEEL_GEARBOX_DEPTH = 0.24;
export const FLYWHEEL_CRANK_RADIUS = 0.36;
export const FLYWHEEL_MARKER_MIN_HEIGHT = 3.05;
```

The visual footprint should remain within the current studio route unless collider
audits prove that a small POI footprint update is needed. The machine should be wide
enough for a heavy wheel and gearbox, tall enough to read as an installation, but well
below wall/ceiling/LED-cove safe heights used elsewhere in the scene.

## 3. Physical assembly design

The model should read as a grounded physical machine, not a floating hologram. Stable
semantic names are test contracts:

```text
FlywheelEnergyInstallation
├─ FlywheelBase
├─ FlywheelBearingStandLeft
├─ FlywheelBearingStandRight
├─ FlywheelAxle
├─ FlywheelWheelGroup
│  ├─ FlywheelHeavyRim
│  ├─ FlywheelInnerHub
│  ├─ FlywheelSpoke-*
│  ├─ FlywheelCounterweight-*
│  └─ FlywheelEnergyGlowRing
├─ FlywheelCrankGroup
│  ├─ FlywheelCrankDisc
│  ├─ FlywheelCrankArm
│  └─ FlywheelCrankHandle
├─ FlywheelPlanetaryGearbox
│  ├─ FlywheelRingGear
│  ├─ FlywheelSunGear
│  ├─ FlywheelPlanetCarrier
│  ├─ FlywheelPlanetGear-*
│  └─ FlywheelOutputShaft
└─ FlywheelEnergyPort
```

Suggested layout: place the heavy wheel vertically on the local `X/Y` plane with its
axle along local `Z`; mount bearing stands on the base left/right of the wheel; mount
the gearbox on the viewer-facing/front side of the axle; place the hand crank on the
gearbox input face; and place `FlywheelEnergyPort` near the top/front of the output
housing for P6c arcs. Metallic rough materials, visible bolts, brackets, and a modest
blue glow ring should make it flashy without turning it into a hologram.

## 4. Planetary gear math

Use a fixed ring gear, hand crank driving the sun gear, and planet carrier as the
high-torque output:

```ts
export const FLYWHEEL_SUN_TEETH = 18;
export const FLYWHEEL_PLANET_TEETH = 24;
export const FLYWHEEL_RING_TEETH =
  FLYWHEEL_SUN_TEETH + FLYWHEEL_PLANET_TEETH * 2; // 66

export const FLYWHEEL_TORQUE_RATIO =
  1 + FLYWHEEL_RING_TEETH / FLYWHEEL_SUN_TEETH; // 4.666...
```

With fixed ring and sun input, carrier output speed is:

```ts
const crankAngle = elapsed * FLYWHEEL_CRANK_RADIANS_PER_SECOND;
const sunAngle = crankAngle;
const carrierAngle = sunAngle / FLYWHEEL_TORQUE_RATIO;
const outputShaftAngle = carrierAngle;
const flywheelAngle = outputShaftAngle;
```

Planet centers orbit with the carrier:

```ts
const planetOrbitAngle =
  carrierAngle + planetIndex * ((Math.PI * 2) / planetCount);
```

For a fixed-ring visual approximation, each planet counter-spins relative to the
carrier and sun. A stable procedural convention that tests can assert is:

```ts
const planetLocalSpin =
  -sunAngle * (FLYWHEEL_SUN_TEETH / FLYWHEEL_PLANET_TEETH) +
  carrierAngle * (FLYWHEEL_RING_TEETH / FLYWHEEL_PLANET_TEETH);
```

The exact mesh rotations may include model-axis offsets, but debug state should expose
canonical `crankAngle`, `sunAngle`, `carrierAngle`, `planetOrbitAngles`,
`planetLocalSpinAngles`, `outputShaftAngle`, and `flywheelAngle`. Teeth may be
simplified procedural blocks, but visually they must intermesh believably, planets must
orbit the sun, planets must counter-spin relative to the carrier, and the flywheel must
turn more slowly than the crank with implied higher torque.

## 5. Detail-level plan

Semantic behavior does not change by detail level. Build only the chosen detail level;
do not create all variants and hide unused ones.

| Level       | Teeth / gear simplification                                    | Segments                    | Spokes / bolts                      | Glow                      | Energy packet budget            |
| ----------- | -------------------------------------------------------------- | --------------------------- | ----------------------------------- | ------------------------- | ------------------------------- |
| Cinematic   | full 18/24/66 tooth blocks, internal ring teeth                | 32-48 cylinders/rings/torus | 8 spokes, 16+ bolts, counterweights | 2-3 glow-ring/halo layers | 14 nodes, connectors, halo      |
| Balanced    | full tooth counts with simpler boxes                           | 20-32                       | 6 spokes, 10-12 bolts               | 2 glow layers             | 11 nodes, connectors, soft halo |
| Performance | every-other tooth visual or grooved ring while math stays full | 12-20                       | 4-6 spokes, 4-6 bolts               | 1 glow layer              | 8 nodes, limited connectors     |
| Low         | simplified grooved discs, no individual internal teeth         | 8-12                        | 4 spokes, no small bolts            | single faint ring         | 6 nodes, no connectors          |
| Micro       | iconic wheel/crank/gear silhouettes only                       | 6-8                         | 3-4 spokes, no bolts                | tiny port glow            | 4 nodes, no connectors/halo     |

## 6. Energy-transfer concept

P6c should add a deterministic network where every other ground-floor POI is eligible,
Flywheel itself is excluded, and upper-floor POIs are excluded. Target positions must
come from resolved runtime POI instances and visual anchors, not hardcoded duplicate
coordinate lists. Only one transfer is active at a time: five incoming transfers from
random eligible ground-floor POIs into Flywheel, followed by one larger/brighter/thicker
outgoing transfer from Flywheel to a random eligible POI, repeating exactly.

Use a pure seeded selector in `src/scene/structures/flywheelEnergyNetwork.ts` with a
default seed such as `flywheel-energy:v1`. Use a small deterministic PRNG (for example
mulberry32 or xorshift32) and never call `Math.random()` in runtime network code. The
selector should be stable for tests, support explicit seeds, avoid immediate repeats
when at least two targets exist, exclude Flywheel defensively even if passed, and keep
the 5-in / 1-out rhythm exact.

## 7. Arc geometry and animation

Each transfer defines a parabolic curve between world points:

```ts
source = selectedTarget.worldPosition or flywheelEnergyPortWorldPosition;
destination = flywheelEnergyPortWorldPosition or selectedTarget.worldPosition;
midpoint = (source + destination) * 0.5;
control.y = clamp(
  max(source.y, destination.y) + 0.8 + distanceXZ * 0.12,
  1.1,
  4.6
);
```

Lift POI endpoints to readable anchor heights and keep arcs floor-safe and ceiling-safe.
Convert source, control, and destination into the Flywheel root's local space, or into a
stable dedicated arc root space, before writing mesh transforms.

The full arc is never rendered. Render only a moving packet window:

- incoming window: `0.10` of normalized curve phase;
- outgoing window: `0.16` of normalized curve phase;
- window start/end are clamped to `[0, 1]` around the packet phase;
- nodes sample evenly inside that window;
- lead/trail nodes fade with a triangular or smoothstep envelope;
- outgoing nodes use greater radius/opacity/emissive intensity and optional extra halo;
- packet travels from source to destination for both directions.

Use pooled procedural geometry: preallocated glowing spheres/nodes, optional connector
cylinders/capsules between adjacent nodes, and optional halo nodes at high detail. Do
not allocate `TubeGeometry`, geometries, materials, arrays of meshes, or dynamic point
lights per frame.

## 8. Runtime integration design

Recommended final builder API:

```ts
interface FlywheelShowpieceOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  roomBounds: Bounds2D;
  detailPolicy?: SceneDetailPolicy;
  energySeed?: string | number;
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

`main.ts` should build Flywheel once from the resolved POI placement, attach it with
`addPoiStructure(...)`, and register factory colliders. After all ground-floor POI
structures and visual anchors have been created, resolve energy targets and call
`setEnergyTargets(...)`. The frame loop must call `flywheelShowpiece.update(...)` every
rendered frame. `sceneDetailController.shouldRunDecorativeUpdate(...)` should only
compute `runDecorativeEffects` for throttled secondary glows/halos.

## 9. Target resolution design

Add a helper such as `resolveFlywheelEnergyTargets(...)`. It should inspect resolved
POI instances, filter to ground-floor POIs with the same floor resolver used by the
scene, exclude `flywheel-studio-flywheel`, prefer `resolvePoiVisualAnchor(...)`, call
`Object3D.getWorldPosition(...)`, and return `{ poiId, label, floor, worldPosition }`.
It should fail open when optional anchors are missing, collect diagnostics, and avoid
hardcoded production coordinate lists.

Expected current ground-floor examples include Futur Optimist, token.place, Sugarkube,
PR Reaper, DSPACE, Jobbot if resolved on ground floor, Axel if resolved on ground
floor, Wove, f2clipboard, Sigma, Gitshelves if resolved on ground floor, and the
danielsmith.io table. The exact production list must come from resolved floor data, not
from this document.

## 10. Accessibility

Use `getPulseScale()` and `getFlickerScale()` for presentation only. Reduced-motion and
reduced-flicker preferences may slow/smooth gear presentation, soften glow/halo pulses,
lower opacity, and remove strobing connector highlights. They must not pause the machine,
change target selection, change incoming/outgoing counts, alter direction, or hide all
energy-transfer feedback. The outgoing transfer remains distinct via stable size,
window, and opacity differences instead of sudden full-bright flashes.

## 11. Miniature proxy design

The miniature proxy stays static and must not run the gear animation, target selector,
or energy-network update. P6b should update it to show a heavy wheel, crank, small gear
cluster, base/bearing silhouette, and energy port/glow. P6c should add one thin incoming
blue arc hint and one thicker outgoing blue arc hint. Track source files including:

- `src/scene/structures/flywheel.ts`;
- `src/scene/structures/flywheelEnergyContract.ts` after P6b;
- `src/scene/structures/flywheelEnergyNetwork.ts` after P6c;
- `src/scene/miniature/poiProxyRegistry.ts`.

Increment `syncRevision` whenever the proxy semantics change and regenerate
`src/scene/miniature/miniatureManifest.generated.json` with the existing manifest tool.

## 12. Tests and PR decomposition

### P6b scope: physical assembly

- Add `flywheelEnergyContract.ts`.
- Refactor root anchoring to `FlywheelEnergyInstallation`.
- Build the physical wheel, crank, planetary gearbox, base, bearings, colliders, debug
  state, disposal, metadata, miniature physical proxy, and physical tests.
- Update this document with final constants and hierarchy corrections.

### P6c scope: energy transfers

- Add `flywheelEnergyNetwork.ts`.
- Resolve runtime targets from visual anchors.
- Render pooled blue parabolic packet windows.
- Add `setEnergyTargets(...)`, energy debug state, accessibility presentation handling,
  miniature arc hints, manifest update, and energy-network tests.

### P6d scope: hardening

- Audit integration, hot-path allocations, detail-level reductions, accessibility,
  lifecycle/disposal, colliders, physical metadata, miniature sync, docs, and final QA.
- Consolidate tests and remove stale design alternatives from this document.

### Test matrix

Required coverage across P6b/P6c/P6d:

- root anchoring and unit scale;
- physical bounds;
- gear ratio math;
- synchronized crank/sun/planet/carrier/output/flywheel motion;
- detail-level reductions and bounded triangle counts;
- collider placement and no arc colliders;
- target resolution from runtime visual anchors;
- exact 5-in / 1-out cycle;
- deterministic selector and no immediate repeats when possible;
- incoming window approximately 10% and outgoing window larger;
- outgoing/incoming thickness, brightness, and strength differences;
- one packet visible and no full-arc spiderweb;
- hot-path allocation/pooling, including no per-frame gear/arc geometry creation;
- reduced-motion/reduced-flicker semantics;
- miniature proxy semantics and manifest freshness;
- idempotent disposal and stale-target cleanup.
