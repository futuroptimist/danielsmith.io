# Flywheel kinetic energy installation and transfer network

The Flywheel POI is a bottom-anchored `FlywheelEnergyInstallation` built by
`createFlywheelShowpiece(...)`. The build returns `{ group, colliders,
setEnergyTargets, update, getDebugState, dispose }`. Runtime attaches the root
through `addPoiStructure(...)`, so the same unit-scale root is the POI visual
anchor and model root for triangle accounting.

## Builder and lifecycle contract

- Geometry is authored in local coordinates under the root; the root carries the
  resolved POI position and heading.
- `update(...)` runs every rendered frame for core machine motion and packet
  phase progression.
- `runDecorativeEffects` only gates secondary glow/pulse work.
- `setEnergyTargets(...)` may be called after all ground-floor visual anchors are
  available; missing optional anchors are recorded as diagnostics instead of
  throwing.
- `dispose()` is idempotent and releases builder-owned geometries/materials, so
  quality reload and partial initialization teardown can safely clean up.

## Physical dimensions and metadata

`src/scene/structures/flywheelEnergyContract.ts` is the shared source for bounds,
marker clearance, base collider footprint, rotor size, and gear ratios. The root
scale remains `[1, 1, 1]`. Physical colliders cover the compact base/gear machine
only; blue energy arcs are visual effects and do not block avatar routing.

## Mechanical assembly and animation math

The installation contains a heavy flywheel, base, front/back bearing yokes, axle,
energy port, hand crank, planetary gearbox, planet carrier, planet gears, and a
short torque shaft. The documented ratio is:

- crank and sun gear rotate at `4x` the flywheel phase;
- planet carrier/output follows the flywheel phase;
- planet gears counter-spin from the crank by the contract counter-spin factor;
- emphasis may increase speed, but the ratios remain synchronized.

Reduced motion changes presentation comfort only. It does not pause the machine,
change target order, or desynchronize the crank/sun/planet/carrier/flywheel
relationship. Gear geometry is created once at build time and reused on every
frame.

## Energy network state machine

`createSeededFlywheelEnergyNetwork(...)` owns deterministic target selection. It
sanitizes runtime targets by excluding Flywheel itself, upper-floor POIs, invalid
coordinates, and duplicate IDs after the first valid target. The cycle is exactly
five incoming transfers followed by one outgoing transfer. Incoming packets move
from the selected POI visual-anchor position to `FlywheelEnergyPort`; outgoing
packets move from the port back to the selected POI.

Only a pooled packet subsection is visible at a time. The incoming visible window
is approximately 10% of the arc; outgoing uses a larger, brighter, stronger
packet. Full parabolic arcs are never drawn at once, avoiding an all-arc
spiderweb.

## Arc rendering and hot-path policy

Packet nodes and connector meshes, geometries, and materials are allocated during
setup and pooled. Frame updates reuse vectors and existing meshes; debug snapshots
may clone small plain objects for tests/inspection. There is no per-frame
`TubeGeometry`, per-transfer material construction, canvas redraw, or hidden
all-variant LOD tree.

## Detail-level matrix

All detail levels preserve the same semantics: gear ratio, 5-in/1-out cycle,
target order for a given seed, directionality, and debug state. Rendering cost is
reduced by lowering rotor/gear segment counts, spoke counts, packet sample counts,
connector visibility, glow layers, and decorative detail.

| Level       | Mechanical semantics | Rendering reductions                 |
| ----------- | -------------------- | ------------------------------------ |
| Cinematic   | Full ratio/cycle     | Highest segments and packet samples  |
| Balanced    | Full ratio/cycle     | Moderate segments and samples        |
| Performance | Full ratio/cycle     | Fewer segments, spokes, and samples  |
| Low         | Full ratio/cycle     | Minimal rotor/packet detail          |
| Micro       | Full ratio/cycle     | Smallest packet and connector budget |

## Accessibility behavior

Normal, reduced pulse, reduced flicker, and combined reduced settings keep the
machine readable without strobing. Reduced settings soften glow/halo opacity and
packet modulation while preserving transfer feedback, target selection, rhythm,
and direction. They must not hide all energy motion or introduce sudden flashes.

## Miniature proxy rule

The miniature table uses a static proxy only. It shows a heavy flywheel, crank,
planetary gear cluster, base/bearings, energy port/glow, a thin incoming arc hint,
and a thicker outgoing arc hint. It does not run gear animation, target selection,
or energy-network updates. `syncRevision` and the generated manifest must be
updated whenever the production Flywheel or proxy contract changes.

## Manual QA checklist

1. Launch `npm run dev -- --host 127.0.0.1 --port 5173`.
2. Open `http://localhost:5173/?mode=immersive&disablePerformanceFailover=1`.
3. Inspect Cinematic, Balanced, and Performance.
4. Confirm the Flywheel reads as a heavy kinetic machine with synchronized crank,
   gear train, and flywheel.
5. Confirm five incoming packets arrive from other ground-floor POIs, then one
   larger outgoing packet leaves Flywheel.
6. Confirm only short arc sections are visible and no spiderweb appears.
7. Confirm reduced motion/flicker remain comfortable.
8. Confirm the POI orb/label clears the installation and the miniature table shows
   the static Flywheel proxy.
