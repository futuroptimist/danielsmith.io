# Flywheel kinetic energy installation and transfer network

The Flywheel POI is now a production kinetic-energy installation. The scene uses
one `FlywheelEnergyInstallation` root per runtime load, attached through
`addPoiStructure(...)` so the same unit-scale root is the POI model root, visual
anchor, and lifecycle owner. Geometry is authored in local space; world placement
comes from the resolved POI instance.

## Builder API and lifecycle

`createFlywheelShowpiece(...)` accepts a POI position, room bounds, orientation,
and optional scene detail policy. It returns the root group, physical colliders,
`setEnergyTargets(...)`, `update(...)`, `getDebugState()`, and idempotent
`dispose()`. Main-scene teardown calls `dispose()` so quality reloads and partial
initialization failures release pooled geometries/materials and leave no stale
energy targets, meshes, or colliders.

Core machine motion and energy phase advance every rendered frame. The
`runDecorativeEffects` flag only gates secondary glow presentation.

## Root, dimensions, and physical metadata

Shared constants live in `src/scene/structures/flywheelEnergyContract.ts` and feed
the builder, physical metadata, colliders, tests, and miniature proxy. The root is
bottom-centered, unit scale, and the visible machine fits the documented
installation bounds. Colliders cover the physical base/gear footprint only; the
parabolic energy-transfer arcs are visual effects and never block avatar routing.
The POI orb and label clear the visible machine via the shared marker height.

## Mechanical assembly and animation math

The installation contains a heavy rim, hub, spokes, bearing yokes, crank,
planetary gearbox, output shaft, and energy port. The mechanical debug state
exposes crank, sun, carrier, planet orbit, planet counter-spin, and flywheel
angles. The ratio is fixed by `FLYWHEEL_GEAR_RATIO`:

- crank drives the sun gear 1:1;
- carrier/output follows the sun at `0.25` torque ratio;
- flywheel follows the carrier 1:1;
- planet gears orbit with the carrier and counter-spin relative to the sun.

Emphasis can raise the comfortable spin velocity, but it never changes the gear
ratio. Reduced pulse/flicker settings soften glow and packet opacity without
pausing the machine, changing the target order, or hiding all transfer feedback.
No gear geometry is rebuilt during update.

## Energy network state machine

`createSeededFlywheelEnergyNetwork(...)` owns the deterministic 5-in/1-out cycle.
Targets are sanitized to exclude Flywheel, upper-floor anchors, invalid positions,
and duplicates. The seeded selector avoids immediate repeats when multiple
targets are available and keeps a bounded debug sequence.

For each cycle, five incoming packets travel from other ground-floor POIs to the
Flywheel port, then one stronger outgoing packet leaves the port for a target.
Only a short pooled packet window is visible at once: incoming windows are about
10% of the arc and outgoing windows are larger, brighter, and thicker. Full arcs
are not rendered, preventing a spiderweb of all connections.

## Target resolution and arc rendering

Main runtime resolves targets only after ground-floor visual anchors exist. It
uses the visual-anchor registry/world transforms rather than duplicated position
tables, excludes Flywheel and upper-floor POIs, and records diagnostics for
optional missing anchors instead of crashing immersive mode.

The renderer preallocates packet node/connector meshes, geometry, and materials
at setup. Per-frame updates reuse vectors and pooled meshes, sample the current
parabolic packet window, and move the packet from source to destination according
to the logical transfer direction.

## Detail policy and accessibility

All scene detail levels preserve the same semantic cycle, target ordering for a
given seed, incoming/outgoing counts, directionality, and gear ratio. Lower levels
reduce cost by lowering cylinder/torus segments, gear teeth, spokes,
counterweights, packet sample count, connectors, and decorative glow layers.

Accessibility preferences affect presentation only:

- reduced pulse lowers scale/glow modulation;
- reduced flicker lowers opacity modulation;
- both reductions keep readable packet feedback and comfortable continuous motion;
- neither setting changes the five-in/one-out rhythm or target selection.

## Miniature proxy rule

The tabletop proxy is static. It shows the heavy flywheel, crank, planetary gear
cluster, base/bearings, energy port glow, a thin incoming arc hint, and a thicker
outgoing arc hint. It must not run gear animation, target selection, or energy
network updates. The generated miniature manifest records the source files and
sync revision for this static proxy.

## Manual QA checklist

Run `npm run dev -- --host 127.0.0.1 --port 5173` and open
`http://localhost:5173/?mode=immersive&disablePerformanceFailover=1`. Inspect
Cinematic, Balanced, and Performance modes and confirm:

- the Flywheel reads as a heavy kinetic machine;
- crank, sun gear, planet carrier, and flywheel motion stay synchronized;
- packets visibly travel from POIs to Flywheel and then out after five incoming
  packets;
- only a short arc section is visible at a time, with no all-arc spiderweb;
- reduced motion/flicker remains comfortable;
- the POI orb/label clears the installation;
- the miniature table shows the static Flywheel proxy;
- no obvious frame spikes or runaway effects appear.
