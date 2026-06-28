# Flywheel kinetic energy installation and transfer network

The Flywheel POI is a production kinetic installation attached to the
`flywheel-studio-flywheel` POI. The implementation lives in
`src/scene/structures/flywheel.ts` and uses shared dimensions and ratios from
`src/scene/structures/flywheelEnergyContract.ts`.

## Builder API and root contract

`createFlywheelShowpiece(...)` returns a build with:

- `group`: the bottom-centered, unit-scale `FlywheelEnergyInstallation` root.
- `colliders`: one physical base collider; energy arcs are visual only.
- `update({ elapsed, delta, emphasis, runDecorativeEffects })`: advances core
  flywheel, crank, gear, and packet state every rendered frame.
- `setEnergyTargets(targets, diagnostics)`: replaces runtime-resolved ground
  floor targets and records non-fatal diagnostics.
- `getDebugState()`: exposes mechanical angles, triangle count, and energy
  transfer state for tests and QA.
- `dispose()`: idempotently disposes owned setup-time geometries/materials.

`main.ts` creates exactly one installation, attaches it with `addPoiStructure(...)`
when the POI exists, and therefore uses the same root as the POI visual anchor and
model root. Target resolution happens after ground-floor visual anchors exist.
Missing optional anchors fall back to the POI group and become diagnostics instead
of crashing immersive mode. Quality reload teardown calls `dispose()` so stale
meshes, materials, targets, and colliders are not retained.

## Physical dimensions and metadata

`flywheelEnergyContract.ts` is the source of truth. The visible machine is a
2.6 × 2.2 × 2.55 scene-unit installation with a compact 2.25 × 1.35 base,
front/back bearing yokes, a Z-axis axle, a heavy rimmed wheel, exposed crank,
planetary gearbox, output shaft, and blue energy port. Physical metadata uses a
bottom-center anchor, marker clearance above the machine, and an avatar path
radius that leaves routes around the base usable.

## Mechanical hierarchy and animation math

The semantic hierarchy includes:

- `FlywheelBase`
- `FlywheelBearingYokeFront` / `FlywheelBearingYokeBack`
- `FlywheelAxle` and axle caps
- `FlywheelWheelGroup` with heavy rim, hub, spokes, counterweights, motion ticks,
  and glow ring
- `FlywheelCrankGroup` with disc, arm, and handle
- `FlywheelPlanetaryGearbox` with ring gear, sun gear, planet carrier, and planet
  gears
- `FlywheelOutputShaft`
- `FlywheelEnergyPort`

The accumulator `flywheelAngle` advances from nonnegative `delta`. The public
ratio constants keep all presentation modes semantically identical:

- crank → sun: `1:1`
- sun → planet spin: `-2:1` counter-spin
- sun → carrier/output: `0.25:1`
- carrier/output → flywheel: `1:1`

Emphasis can slightly raise velocity for presentation, but it does not alter the
ratio, target sequence, or transfer cadence. Reduced motion/flicker settings
soften glow and packet opacity without pausing the machine or changing the
mechanical debug angles.

## Energy network state machine

`flywheelEnergyNetwork.ts` owns the deterministic transfer cycle. Sanitization
excludes the Flywheel itself, upper-floor targets, duplicates, and invalid target
positions. With the default seed, the network repeats an exact cycle of five
incoming packets followed by one outgoing packet.

Incoming packets travel from the selected POI anchor to `FlywheelEnergyPort`.
Outgoing packets travel from `FlywheelEnergyPort` back to the selected POI. Only
one packet is active at a time. Full parabolic arcs are never rendered; the packet
pool samples only the active visible window. Incoming windows are about 10% of an
arc, while outgoing packets use a larger, stronger window so the return pulse
reads as brighter and thicker.

## Arc rendering and pooling

Arc packet nodes and connectors are created once during setup. The frame loop
reuses `Vector3` instances, pooled meshes, geometries, and materials. Updates move
and scale the pooled packet nodes, hide unused nodes/connectors, and never create
per-frame `TubeGeometry`, materials, canvases, or all-variant LOD trees.
`getDebugState()` may allocate defensive snapshots for tests and diagnostics.

## Detail policy

All detail levels preserve:

- the same root/anchor contract;
- the same gear ratio;
- the same five-in/one-out cycle;
- deterministic target order for the same seed;
- the same incoming/outgoing directionality.

Rendering cost decreases by lowering cylinder/torus segments, spoke counts,
planet count in micro detail, packet sample count, connector count, decorative
halo/glow emphasis, and small fastener/decorative layers. Tests assert monotonic
triangle reductions across public detail modes and verify updates do not rebuild
geometry.

## Accessibility behavior

Normal, reduced pulse, reduced flicker, and combined reduced settings all keep the
installation readable. Reduced settings avoid strobing by lowering pulse and
flicker multipliers, soften glow/halo presentation, and keep transfer packets
visible enough to preserve the five-in/one-out rhythm. They must not pause the
machine, alter target selection, reverse direction, hide all transfer feedback, or
introduce sudden flashes.

## Miniature proxy rule

The miniature table proxy is static. It shows the heavy flywheel, crank, planetary
gear cluster, base/bearings, energy port/glow, a thin incoming arc hint, and a
thicker outgoing arc hint. It does not run gear animation, target resolution, or
energy network updates. Changes to the runtime installation require updating the
proxy `sourceFiles`, `syncRevision`, `syncNote`, and generated manifest.

## Manual QA checklist

Launch the immersive scene with:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

Open:

```text
http://localhost:5173/?mode=immersive&disablePerformanceFailover=1
```

Inspect Cinematic, Balanced, and Performance modes:

- Flywheel reads as a heavy kinetic machine.
- Hand crank, sun gear, planet gears, carrier, output shaft, and wheel stay
  synchronized.
- Energy packets visibly travel from other ground-floor POIs to Flywheel.
- After five incoming packets, one larger outgoing packet leaves Flywheel.
- Only a short arc section is visible; no all-arc spiderweb appears.
- Reduced pulse/flicker settings remain comfortable.
- POI orb and label clear the installation.
- Miniature table shows the static Flywheel proxy with arc hints.
- No obvious frame spikes, runaway effects, stale colliders, or stale targets
  appear after quality reloads.
