# Flywheel energy transfer implementation

The `flywheel-studio-flywheel` POI is a completed kinetic installation built by
`createFlywheelShowpiece(...)` in `src/scene/structures/flywheel.ts`. The builder
returns the bottom-centered `FlywheelEnergyInstallation` root, its physical
colliders, a per-frame `update(...)` hook, `setEnergyTargets(...)`,
`getDebugState()`, and an idempotent `dispose()` method.

## Runtime integration and root contract

`main.ts` creates exactly one Flywheel showpiece during immersive scene assembly,
positions it at the Flywheel POI placement, copies the POI rotation, applies
scene-object source metadata, registers its physical colliders, and attaches the
root via `addPoiStructure(...)`. That helper registers the same root as both the
POI visual anchor and model root, so marker placement, target resolution, and
triangle accounting all reference the visible installation.

Energy targets are resolved after ground-floor structures have registered their
visual anchors. Resolution excludes the Flywheel itself and upper-floor POIs,
prefers `resolvePoiVisualAnchor(...)`, falls back to the POI group when an
optional anchor is missing, and records diagnostics instead of throwing. The
showpiece stores sanitized target snapshots, so quality reloads can dispose the
old root, materials, geometries, colliders, and target state before a fresh build.

## Physical dimensions and colliders

Shared dimensions live in `src/scene/structures/flywheelEnergyContract.ts`:

- installation bounds: 2.6m wide, 2.2m deep, 2.55m high;
- base: 2.25m × 1.35m × 0.22m;
- wheel: 0.82m radius with a 0.1m tube and 0.24m thickness;
- energy port: `(0.48, 1.58, 0.34)` with a 0.13m radius;
- marker minimum height: 2.75m.

The root scale remains `[1, 1, 1]`. The collider set covers the physical base
and gear footprint, not the nonphysical energy arcs, preserving avatar routing
around the installation while keeping marker/orb clearance above the machine.

## Gear ratio and animation math

The crank is the input shaft and drives the sun gear directly. The documented
planetary reduction is `FLYWHEEL_GEAR_RATIO.sunToCarrier = 4`, so:

```text
crankAngle = sunGearAngle = flywheelAngle * 4
planetCarrierAngle = outputShaftAngle = flywheelAngle
planetGearAngle = -(sunGearAngle - planetCarrierAngle) * 2
```

`update(...)` advances a single flywheel angle from nonnegative `delta` and the
base spin velocity. Emphasis increases speed by the contract boost but does not
change ratios. Reduced pulse/flicker settings soften glow and packet opacity;
they do not pause the machine or alter crank, sun, planet, carrier, output, or
flywheel synchronization.

## Energy network state machine

`src/scene/structures/flywheelEnergyNetwork.ts` owns the deterministic network.
For a given seed and sanitized target list it selects targets in a stable order,
avoids immediate repeats when multiple targets are available, and runs exactly
five incoming transfers before one outgoing transfer. Incoming transfers move
from POI anchor to Flywheel port. The outgoing transfer moves from the port back
to the selected POI, uses a larger window, and has stronger/brighter rendering.

Only the active packet window is rendered. Incoming windows are about 10% of the
arc; outgoing windows are larger. Full parabolic arcs are never instantiated as
visible geometry, preventing an all-target spiderweb.

## Arc rendering, pooling, and performance

All Flywheel geometry, materials, packet nodes, and packet connectors are built
at setup time. Per-frame work reuses vectors, packet meshes, connector meshes,
and materials. No `TubeGeometry`, transfer material, gear geometry, or canvas is
created in `update(...)`. `getDebugState()` returns cloned snapshots and is the
only intentionally allocation-friendly diagnostic path.

Detail policy reduces rendering cost while preserving semantics: every level
keeps the same gear ratio, five-in/one-out energy cycle, target ordering,
directionality, and root contract. Lower levels reduce cylinder/torus segments,
spokes, teeth, packet sample nodes, connector visibility, and decorative glow
layers.

## Accessibility behavior

Normal, reduced pulse, reduced flicker, and combined reduced settings preserve
the transfer rhythm and target sequence. Reduced pulse dampens scale changes;
reduced flicker lowers opacity modulation and avoids flashes. The core crank,
gear train, output shaft, flywheel, and packet direction remain readable and
continuous.

## Miniature proxy rule

The miniature table uses the static proxy in
`src/scene/miniature/poiProxyRegistry.ts`. It depicts the heavy wheel, crank,
planetary gear cluster, base, bearings, energy port, a thin incoming arc hint,
and a thicker outgoing arc hint. It intentionally does not run gear animation,
target selection, or energy-network updates. The generated manifest must be
refreshed whenever the runtime or proxy sources change.

## Lifecycle and QA checklist

- Build exactly one Flywheel root and attach it through `addPoiStructure(...)`.
- Confirm the root is the visual anchor and model root.
- Confirm crank, sun gear, planets, carrier, output shaft, and flywheel stay in
  ratio in Cinematic, Balanced, and Performance detail modes.
- Confirm five incoming packets precede one larger outgoing packet.
- Confirm only a short packet subsection is visible and no arc spiderweb appears.
- Confirm reduced pulse/flicker settings remain comfortable without pausing the
  machine or hiding all transfer feedback.
- Confirm the POI marker/orb clears the physical bounds.
- Confirm colliders cover only physical machine areas.
- Confirm miniature proxy remains static and manifest checks pass.
- Confirm `dispose()` is safe to call repeatedly and after partial setup.
