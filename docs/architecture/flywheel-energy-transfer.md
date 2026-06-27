# Flywheel kinetic energy installation and transfer network design

This documentation-only design specifies the architecture for
upgrading `flywheel-studio-flywheel` from the current abstract automation kiosk
into a grounded kinetic energy installation with a deterministic cross-POI energy
transfer packet. Follow-up implementation work should build this design without
adding external models, external textures, audio, live network data, upper-floor
arcs, or an
all-arcs-visible spiderweb.

## 1. Current-state audit

### Builder API and runtime contract

`src/scene/structures/flywheel.ts` currently exposes:

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

The build has no public `dispose()`, `setEnergyTargets(...)`, or debug-state
surface. It registers browser selection listeners internally when `window` exists
and removes them only when the root group receives a `removed` event. Follow-up
implementation should replace that implicit lifecycle with an idempotent
`dispose()` and keep any
selection-driven presentation secondary to the main mechanical animation.

### Current `group`, `colliders`, and update behavior

The current root group is named `FlywheelShowpiece` and is created at the origin.
Many child meshes and groups are then positioned with `options.centerX` and
`options.centerZ` baked directly into child transforms. Examples include the
`FlywheelDais`, `FlywheelPedestal`, `FlywheelRotorGroup`, `FlywheelCounterGroup`,
`FlywheelAutomationPillars`, `FlywheelTechStackGroup`, and the clamped
`FlywheelInfoPanelGroup`. The returned colliders are factory colliders for the
dais/showpiece and info panel footprint. The `update(...)` method animates the
rotor/counter rings, orbit chips, automation pillars, tech-stack chips, and the
selection-revealed docs callout.

Important architectural issue for implementation:

- The current Flywheel builder authors many child objects directly in world
  coordinates under a root group at the origin.
- Newer POIs should instead use a bottom-centered, unit-scale root at the POI
  anchor with child geometry authored in local coordinates.
- Implementation must refactor Flywheel to that contract so visual anchors,
  colliders, miniature placement, model-root triangle accounting, and target resolution
  remain reliable.

### Main-scene wiring

`src/main.ts` resolves `flywheel-studio-flywheel` from `poiInstances`, falls back
to the studio room center when the POI is missing, and calls
`createFlywheelShowpiece({ centerX, centerZ, roomBounds, orientationRadians,
detailPolicy })`. It then applies scene-object metadata, registers factory
colliders against the `flywheel-studio-flywheel` scene-object definition when
present, attaches the group with `addPoiStructure(...)` when the POI exists, and
stores the build in `flywheelShowpiece`.

`addPoiStructure(...)` adds the structure to the ground or upper structure group,
registers the group as the POI model root via `registerPoiModelRoot(...)`, and
registers the same group as the floor visual anchor via
`registerPoiVisualAnchor(...)`. Because the current root is still at the origin,
that visual anchor/model-root behavior is only correct by convention for triangle
counting and incorrect for position-based consumers. Implementation should make the root
itself the true anchor.

The frame loop currently gates the entire Flywheel `update(...)` behind
`sceneDetailController.shouldRunDecorativeUpdate(...)`. That is acceptable for the
old decorative rotor but not for the new machine. Implementation should call
`flywheelShowpiece.update(...)` every rendered frame for flywheel rotor and
packet phase progression; only expensive secondary glow/halo work should use a
`runDecorativeEffects` boolean.

The teardown path currently sets `flywheelShowpiece = null` but does not call a
Flywheel-owned disposer. Implementation must add `dispose()` and main teardown should call it
when available, including partial-initialization teardown.

### Placement, metadata, and scene objects

The POI registry defines `flywheel-studio-flywheel` in the studio at
`{ x: 10, y: 0, z: -2 }`, heading `0`, interaction radius `2.2`, and footprint
`2 x 2`. The Flywheel keeps a POI-specific blue/teal hologram pedestal as the
large readable body shell for the exhibit. The physical
`FlywheelEnergyInstallation` supplies the inner spinning rotor, energy port, and
energy-transfer packets, while the orb, halo, and label remain UI affordances.
The Flywheel pedestal explicitly opts into a simplified Performance-mode render
so low-detail graphics keep the large body silhouette; other hologram pedestals
remain hidden in Performance unless they opt in.
`src/scene/poi/placements.ts` can override placements from declarative scene
objects; Flywheel's effective production placement should always come from the
resolved POI instance rather than a hardcoded duplicate coordinate list.

`src/scene/poi/physicalMetadata.ts` does not currently define a Flywheel physical
metadata entry. Implementation should add one that references the shared Flywheel contract,
records bottom-center anchoring, marker height, avatar clearance, and intended
bounds.

The Flywheel is represented by both the intentional POI hologram body shell and
the physical `FlywheelEnergyInstallation` rotor. The body shell is not a gear
train; it is the large blue/teal visual envelope that makes the exhibit readable.
It uses reduced opacity and existing low-segment marker geometry in Performance
mode rather than disappearing entirely. Energy arcs continue to resolve their
endpoint through `FlywheelEnergyPort`.

### Visual anchors, model triangles, and miniature proxy

`src/scene/poi/visualAnchors.ts` stores a POI id to `Object3D` anchor map and
resolves world position/yaw with `getWorldPosition(...)` and
`getWorldQuaternion(...)`. Target resolution should use this machinery rather
than a duplicate coordinate table.

`src/scene/poi/modelTriangles.ts` tracks POI model roots and counts triangles via
`countObjectTriangles(root)`. Keeping a single true root is essential for future
triangle budgets.

The current miniature proxy in `src/scene/miniature/poiProxyRegistry.ts` is a
static abstract dais, rotor ring, spoke, and counterweight. The generated
manifest lists `src/scene/structures/flywheel.ts` as a source file with
`syncRevision: 3`. Follow-up implementation should update it for the physical
wheel body, add static arc hints, and bump
`syncRevision`, update `syncNote`, and regenerate the manifest.

### Current animation and selection behavior

Flywheel animation is presentation-driven: rotor rings spin, orbit chips rotate,
automation pillars pulse, and tech-stack chips/docs callouts are revealed by
emphasis plus `poi:selected`/`poi:selected:analytics` browser events.
Implementation should keep the new mechanical motion active at baseline even when
unfocused. Selection
may increase glow or reveal minor secondary details, but it must not desynchronize
mechanical ratios.

## 2. Physical-size and root contract

### Root contract

The production builder root is `FlywheelEnergyInstallation`, placed at the
resolved POI anchor with local +Y up and local +Z as the service/front axis after
POI heading. All visible geometry is authored in local coordinates, and child
mesh positions must not include resolved world `centerX`/`centerZ`. Conservative
physical colliders cover the compact base and wheel footprint only; energy arcs
are visual transfer effects and are not colliders.

### Approximate dimensions and constants

The shared source of truth is `src/scene/structures/flywheelEnergyContract.ts`.
That contract feeds the builder, physical metadata, colliders, tests, and
miniature proxy. Do not duplicate scene-unit numbers across files.

The current visible baseline is intentionally simplified for readability:

- a low physical base supports the installation;
- front/back bearing yokes cradle a Z-axis axle;
- the large wheel sits near the POI center with a dark heavy rim, hub, spokes,
  counterweights, and asymmetric rim motion ticks;
- a slim blue `FlywheelEnergyGlowRing` accents the rotor without replacing it;
- `FlywheelEnergyPort` remains the endpoint for transfer arcs;
- the POI-specific blue/teal hologram pedestal is intentional and provides the
  large Flywheel body shell around the simple rotor baseline.

## 3. Physical assembly design

Stable semantic names are part of the contract and are covered by tests:

```text
FlywheelEnergyInstallation
├─ FlywheelBase
├─ FlywheelBearingYokeFront
│  └─ FlywheelBearingYokeFrontBridge
├─ FlywheelBearingYokeBack
│  └─ FlywheelBearingYokeBackBridge
├─ FlywheelAxle
├─ FlywheelAxleCapFront
├─ FlywheelAxleCapBack
├─ FlywheelWheelGroup
│  ├─ FlywheelHeavyRim
│  ├─ FlywheelInnerHub
│  ├─ FlywheelSpoke-0..N
│  ├─ FlywheelCounterweight-0..N
│  ├─ FlywheelRimMotionTick-0..N
│  └─ FlywheelEnergyGlowRing
└─ FlywheelEnergyPort
```

The current implementation intentionally has no visible hand crank, planetary
gearbox, ring gear, sun gear, planet gears, gear teeth, gearbox pedestal, long
torque shaft, or couplers. Those mechanical concepts are deferred for a future
design pass. Tests assert those object names remain absent so a partial gear
layout cannot obscure the restored rotor body.

## 4. Rotor animation

Animation uses one stateful `flywheelAngle` accumulator advanced from nonnegative
`delta`. Emphasis may mildly increase `spinVelocity` and glow intensity, but it
does not affect the energy-transfer cadence or target selection.

`FlywheelWheelGroup.rotation.z` is the visible rotor motion. Counterweights and
`FlywheelRimMotionTick-*` markers are children of `FlywheelWheelGroup`, so their
world positions visibly move as the wheel rotates. Debug state exposes
`flywheelAngle`, `spinVelocity`, `triangleCount`, and the energy-network debug
state; gear-only debug fields are intentionally absent.

## 5. Detail-level plan

All detail levels preserve the same root contract, rotor semantics, target
selector, transfer cycle, direction, timings, and debug state. Lower detail
levels reduce only presentation cost through fewer segments, fewer spokes, and
fewer packet nodes/connectors. Accessibility pulse and flicker preferences are
read through `getPulseScale()` and `getFlickerScale()` for opacity/scale
presentation only; reduced settings do not pause the cycle or alter targets.

## 6. Energy-transfer concept

The energy network is added as follow-up implementation work. Eligible targets
are every other ground-floor POI at runtime:

- include POIs whose resolved floor is `ground`;
- exclude `flywheel-studio-flywheel`;
- exclude upper-floor POIs for this baseline;
- use actual visual anchors or resolved POI positions, not hardcoded duplicate
  coordinates;
- fail open if optional targets are missing and expose diagnostics rather than
  crashing immersive mode.

The exact production list must be resolved from runtime floor data. Expected
examples in the current scene may include Futur Optimist, token.place,
Sugarkube, PR Reaper, DSPACE, Jobbot if on ground floor, Axel if on ground floor,
Wove, f2clipboard, Sigma, Gitshelves if on ground floor, and the
danielsmith.io table. Some of those examples are currently upper-floor via manual
placements; the resolver must decide from current placement data rather than this
text.

### Deterministic selector

Create a pure module such as `src/scene/structures/flywheelEnergyNetwork.ts`.
It should use a seeded PRNG (for example mulberry32/xmur3 from a string seed) and
must not call `Math.random()` at runtime. Recommended defaults:

```ts
export const FLYWHEEL_ENERGY_DEFAULT_SEED = 'flywheel-energy:v1';
export const FLYWHEEL_INCOMING_BEFORE_OUTGOING = 5;
export const FLYWHEEL_INCOMING_WINDOW = 0.1;
export const FLYWHEEL_OUTGOING_WINDOW = 0.16;
export const FLYWHEEL_INCOMING_STRENGTH = 1;
export const FLYWHEEL_OUTGOING_STRENGTH = 1.65;
```

Selector rules:

- stable sequence for the same seed and target list;
- different seeds produce different orders when enough targets exist;
- avoid immediate repeats when at least two eligible targets exist;
- keep the exact rhythm: five completed incoming transfers followed by one
  completed outgoing transfer, then repeat;
- copy target data on input and debug output to prevent mutation leaks.

## 7. Arc geometry and animation

### Parabolic path

Each active transfer is a quadratic Bezier sampled between world source and
destination points:

```ts
const source = liftEndpoint(sourceWorld);
const destination = liftEndpoint(destinationWorld);
const midpoint = lerp(source, destination, 0.5);
const distance = horizontalDistance(source, destination);
const apexY = clamp(
  Math.max(source.y, destination.y) + 0.75 + distance * 0.08,
  1.15,
  WALL_HEIGHT - CEILING_COVE_OFFSET - 0.35
);
const control = { x: midpoint.x, y: apexY, z: midpoint.z };
```

Endpoint lifts should keep packets readable above furniture: target POIs can use
visual-anchor position plus `0.9-1.3` scene units; the Flywheel endpoint should be
`FlywheelEnergyPort` transformed to world space. The packet root may live under
`FlywheelEnergyInstallation`; if so, convert sampled world points to Flywheel
local space before writing mesh positions. Alternatively use a stable world-space
arc group attached to the same floor structure group, but keep ownership and
disposal in the Flywheel build.

### Visible packet window

Only a moving subsection is rendered:

```ts
const visibleWindow = direction === 'incoming' ? 0.1 : 0.16;
const head = clamp01(phase);
const start = clamp01(head - visibleWindow);
const end = head;
```

Sample only between `start` and `end`; never draw the full curve. Incoming
packets travel selected target -> Flywheel. Outgoing packets travel Flywheel ->
selected target and use the larger window, larger node scale, higher opacity, and
stronger blue emissive material.

Recommended fade rule for `N` visible samples:

```ts
const normalized = index / Math.max(1, N - 1);
const edgeFade = Math.sin(Math.PI * normalized); // 0 at tail/head, 1 mid-packet
const opacity = baseOpacity * (0.25 + 0.75 * edgeFade) * flickerScale;
const scale = baseScale * (0.65 + 0.35 * edgeFade) * strength;
```

Use pooled procedural geometry:

- preallocated node meshes, one maximum pool sized by detail level;
- optional preallocated connector cylinders/capsules between adjacent nodes;
- optional halo node pool in Cinematic/Balanced;
- no per-frame `TubeGeometry`;
- no per-frame material or geometry creation;
- no dynamic point lights.

Connector cylinders should be hidden when adjacent samples are hidden. Updating
connector transforms is acceptable; rebuilding geometry is not.

## 8. Runtime integration design

Recommended final builder API:

```ts
export interface FlywheelShowpieceOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  roomBounds: Bounds2D;
  detailPolicy?: SceneDetailPolicy;
  energySeed?: string;
}

export interface FlywheelEnergyTarget {
  poiId: string;
  label: string;
  floor: 'ground' | 'upper';
  worldPosition: { x: number; y: number; z: number };
}

export interface FlywheelDebugState {
  flywheelAngle: number;
  spinVelocity: number;
  triangleCount: number;
  energy: {
    direction: 'incoming' | 'outgoing' | null;
    selectedTargetId: string | null;
    phase: number;
    activeNodeCount: number;
  };
}

export interface FlywheelShowpieceBuild {
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

1. resolve the Flywheel POI instance from `poiInstances`;
2. build once from the resolved POI position and heading;
3. attach with `addPoiStructure(flywheelPoi, showpiece.group)` so model root and
   visual anchor share the true root;
4. register factory colliders with scene-object metadata exactly as today;
5. after all ground-floor POI structures and visual anchors are created, call
   `resolveFlywheelEnergyTargets(...)` and then
   `flywheelShowpiece.setEnergyTargets(...)`;
6. update Flywheel every rendered frame;
7. pass `runDecorativeEffects` from
   `sceneDetailController.shouldRunDecorativeUpdate(...)` for secondary glow/halo
   throttling only;
8. call `flywheelShowpiece.dispose()` during full and partial teardown.

Core mechanism updates that must run every frame: crank angle, sun gear, carrier,
planets, output shaft, flywheel, active transfer phase, and active packet
positions. Secondary effects that may be throttled: halo pulse opacity, decorative
bolt glints, optional labels, and other non-semantic glow layers.

## 9. Target resolution design

Create a helper such as `resolveFlywheelEnergyTargets(...)` near the runtime POI
integration or in a small POI-target resolver module. It should accept resolved
POI instances and return both targets and diagnostics:

```ts
interface ResolvedFlywheelEnergyTargets {
  targets: FlywheelEnergyTarget[];
  diagnostics: string[];
}
```

Resolver requirements:

- inspect the resolved `poiInstances` array;
- use the same floor resolver as the scene (`getPoiFloorId(...)`);
- include only ground-floor POIs;
- exclude `flywheel-studio-flywheel`;
- prefer `resolvePoiVisualAnchor(poi.definition.id)`;
- call `anchor.object.getWorldPosition(reusableVector)` or use the resolved
  anchor world position;
- fall back to the resolved POI group world position if the visual anchor is
  missing;
- include `poiId`, title/label, floor, and copied world position;
- add diagnostics for missing visual anchors, excluded upper-floor POIs if useful
  in debug, or zero eligible targets;
- never hardcode a production coordinate list.

If no eligible targets are available, the Flywheel machine should still animate
physically and hide the energy packet pool. `getDebugState()` should report zero
targets and diagnostics.

## 10. Accessibility

Use `getPulseScale()` and `getFlickerScale()` for presentation only. Reduced
settings must not alter the target order, transfer counts, direction, or 5-in /
1-out rhythm.

Reduced-motion/reduced-flicker behavior:

- flywheel motion remains visible but may use a lower shared speed
  scale or smoother interpolation;
- all gear ratios remain synchronized;
- energy packets continue moving;
- glow/halo pulses soften and opacity changes are eased;
- outgoing transfer remains distinct through stable size/thickness/opacity rather
  than sudden flashes;
- no strobing, no full-bright burst, no dynamic point-light flashes;
- connectors/halos may be reduced or hidden, but core packet nodes stay readable.

## 11. Miniature proxy design

The Flywheel miniature proxy remains static and must not run gear animation,
target selection, or the energy network. Follow-up implementation should update it to show:

- base and bearing silhouette;
- heavy flywheel rim/hub/spokes;
- deferred hand crank;
- small gear cluster;
- energy port/glow;
- one thin incoming blue arc hint;
- one thicker outgoing blue arc hint.

`sourceFiles` should include the shared contract and, once added, the energy
network module if proxy semantics depend on its constants. Each implementation PR
should bump `syncRevision`, write a concrete `syncNote`, and run
`npm run miniature:manifest:update` followed by `npm run miniature:check`.

## 12. Tests and PR decomposition

### Physical assembly and planetary gear train scope

Implement the bottom-centered root, shared contract module, physical hierarchy,
colliders, physical metadata, every-frame update integration, disposal,
miniature physical proxy, and related doc corrections. Do not implement runtime
cross-POI arcs.

Required tests:

- root anchoring and root scale `[1, 1, 1]`;
- no world-coordinate child placement for core geometry;
- semantic hierarchy names exist;
- obsolete abstract elements are removed or intentionally renamed;
- physical bounds and colliders fit the contract;
- physical metadata marker/path clearances;
- gear tooth constants and torque ratio formula;
- crank/sun/carrier/output/flywheel synchronization;
- planet orbit and counter-spin;
- all five detail levels build finite geometry;
- public detail levels reduce triangle counts meaningfully;
- update at zero emphasis still animates;
- no geometry/material rebuild during update;
- disposal is idempotent;
- miniature proxy contains wheel/crank/gear semantics;
- manifest freshness.

### Energy-transfer arcs scope

Add the pure `flywheelEnergyNetwork` module, deterministic seeded selector,
5-in/1-out state machine, target resolver, pooled one-packet arc renderer,
accessibility presentation scaling, debug state, miniature arc hints, and doc
updates.

Required tests:

- deterministic target sequence for the same seed;
- different seeds produce different orders when possible;
- Flywheel excluded and upper floors filtered by resolver/integration tests;
- immediate repeats avoided when enough targets exist;
- exactly five incoming transfers before one outgoing;
- direction, selected target, phase, and completion state;
- incoming visible window near `0.10` and outgoing window larger;
- outgoing strength/thickness greater than incoming;
- packet endpoints map to target visual anchor and Flywheel energy port;
- exactly one packet group visible, no full-arc spiderweb;
- bounded node counts by detail level;
- no per-frame mesh/geometry/material creation;
- nonzero Flywheel heading transforms correctly;
- reduced pulse/flicker preserves semantics;
- disposal is idempotent;
- miniature proxy contains incoming/outgoing arc hints;
- manifest freshness.

### Hardening and final QA scope

Audit runtime integration, quality reloads, partial teardown, performance hot
paths, accessibility combinations, colliders, physical metadata, triangle/model
root registration, miniature sync, and final documentation. Do not redesign the
concept.

Required tests/final matrix:

- root anchoring/unit scale;
- physical bounds;
- gear ratio math;
- synchronized crank/sun/planet/carrier/flywheel motion;
- detail-level reductions;
- collider placement and no arc colliders;
- target resolution from visual anchors;
- exact 5-in / 1-out deterministic cycle;
- arc window length;
- outgoing/incoming visual difference;
- one packet visible at a time and no all-arc spiderweb;
- hot-path allocation/pooling;
- accessibility semantics;
- miniature proxy semantics;
- manifest freshness;
- model-root triangle registration;
- disposal and quality-reload cleanup.

Manual QA for the complete baseline should use:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

and open:

```text
http://localhost:5173/?mode=immersive&disablePerformanceFailover=1
```

Confirm the machine reads as heavy and physical, gear motion is synchronized,
only one short blue parabolic packet is visible at a time, five incoming packets
precede one larger outgoing packet, reduced motion/flicker remains comfortable,
the POI marker clears the machine, the miniature proxy is static and current, and
there are no obvious frame spikes.

## Physical machine implementation update

The implementation presents the Flywheel as `FlywheelEnergyInstallation`, a
bottom-centered, physical rotor exhibit. The visible baseline is intentionally
simple: a low base, front/back bearing yokes, axle caps, a large heavy
`FlywheelWheelGroup`, `FlywheelHeavyRim`, `FlywheelInnerHub`, spokes,
asymmetric `FlywheelCounterweight-*` and `FlywheelRimMotionTick-*` markers, a
slim `FlywheelEnergyGlowRing`, and `FlywheelEnergyPort`. The wheel is the hero
object and rotates every update so the attached asymmetric markers make motion
readable from the normal camera.

The experimental gear and hand-crank assembly is deferred for a future design
pass. The current machine has no visible planetary gearbox, ring gear, sun gear,
planet gears, gear teeth, hand crank, gearbox pedestal, torque shaft, output
coupler, or long shaft. Tests assert those object names remain absent so the
readable rotor body cannot be obscured by a partially connected mechanism.

The energy-transfer arcs remain the metaphorical layer. `setEnergyTargets(...)`,
the deterministic target resolver, the five-in/one-out transfer cadence, visible
packet window, and energy timing semantics continue to resolve through
`FlywheelEnergyPort`; physical colliders describe only the compact base/wheel
footprint and do not include arcs. The miniature proxy mirrors the simplified
rotor body with static incoming/outgoing arc hints.

## 8. Energy-transfer implementation notes

The implemented energy-transfer layer is split between the pure state module and
runtime rendering integration:

- `src/scene/structures/flywheelEnergyNetwork.ts` owns deterministic seeded
  target selection, the five-in/one-out cycle, active-transfer phase, visible
  window math, parabolic arc sampling, and debug snapshots. It has no DOM,
  Three.js scene-object, or `main.ts` dependency and never uses `Math.random()`
  for runtime target choice.
- `src/scene/structures/flywheel.ts` owns the pooled presentation objects:
  one `FlywheelEnergyTransferPacket` group, preallocated packet nodes, and
  preallocated connector cylinders. The update loop advances the mechanical
  flywheel state and the active energy-transfer phase every rendered
  frame; `runDecorativeEffects` only gates secondary glow presentation.
- `src/main.ts` resolves targets after ground-floor structures and visual
  anchors have been created. It iterates the resolved `poiInstances`, uses the
  scene floor resolver to keep only ground-floor POIs, excludes
  `flywheel-studio-flywheel`, prefers `resolvePoiVisualAnchor(...)`, and reads
  target world coordinates through `Object3D.getWorldPosition(...)`. Missing
  optional anchors are diagnostics rather than immersive-mode blockers.

Transfer timing is deterministic: five incoming packets travel from eligible
POIs into the Flywheel energy port, followed by one outgoing packet from the port
to an eligible POI. Incoming transfers use an approximately `0.10` phase window,
while outgoing transfers use a wider `0.16` window and higher strength so they
render thicker and brighter. Only samples inside the moving window are visible;
the full curve is never rendered and all other potential arcs stay hidden.

All five scene-detail levels preserve target order, direction, phase, transfer
counts, and timing. Lower detail levels reduce only presentation cost by using
fewer packet nodes/connectors and softer opacity. Accessibility pulse and flicker
preferences are read through `getPulseScale()` and `getFlickerScale()` for
opacity/scale presentation only; reduced settings do not pause the cycle or alter
its targets.

`getDebugState()` now reports target count, target-resolution diagnostics, cycle
index, current direction/target/phase, visible window start/end, incoming and
outgoing completion counts, source/destination world and local positions, active
node count, detail level, and reduced pulse/flicker scale values. Returned arrays
and points are copies so callers cannot mutate internal network state.

## Geometry/readability correction

The readability correction is a simplification rather than another gear-layout
attempt. The physical Flywheel now reads as a large exposed rotor with a heavy
rim, hub, spokes, counterweights, rim ticks, modest glow, and an energy port. The
experimental hand-crank and planetary gear assembly was removed entirely from
the current visible implementation.

Regression tests build the actual showpiece, assert the restored rotor hierarchy
exists, assert deleted gear/crank/tooth/shaft/coupler object names are absent,
verify the asymmetric markers are children of the rotating wheel group, and check
that the glow ring remains smaller than the physical rim. The POI marker tests
also build the actual registry marker and assert the intentional Flywheel
pedestal body, accent, ring, orb, and label remain present in Cinematic,
Balanced, and the Flywheel opt-in Performance mode. A companion marker test
asserts hologram pedestals without the Flywheel opt-in remain hidden in
Performance.

The miniature proxy mirrors this baseline with a heavy wheel, spoke, motion tick,
energy port, and static incoming/outgoing arc hints. It does not include crank,
gearbox, shaft, or coupler primitives.
