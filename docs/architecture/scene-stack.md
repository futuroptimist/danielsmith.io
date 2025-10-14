# Immersive scene stack

This module map shows how the immersive build composes the playable scene.
It mirrors the new directory layout so contributors can jump to the correct
layer without guessing where functionality lives.

## State flow overview

```
┌─────────────┐      ┌──────────────┐      ┌────────────┐      ┌──────────┐
│  Assets     │ ───▶ │   Systems    │ ───▶ │   Scene    │ ───▶ │    UI    │
│ data, copy, │      │ input, audio,│      │ Three.js   │      │ HUD +    │
│ layout,     │      │ physics,     │      │ composition │      │ overlays │
│ budgets     │      │ failover     │      │             │      │          │
└─────────────┘      └──────────────┘      └────────────┘      └──────────┘
```

1. **Assets** (`src/assets/`) expose static data such as floor plans, i18n
   strings, performance budgets, and theming tokens. They contain no browser
   side-effects and can safely be imported in both Vitest and Playwright
   contexts.
2. **Systems** (`src/systems/`) convert asset data into live behaviour. Input
   controls, collision checks, procedural audio, and failover heuristics live
   here. Systems never depend on UI primitives; they emit events and handles
   consumed by the scene.
3. **Scene** (`src/scene/`) builds the Three.js world. It composes assets and
   systems into meshes, lights, and avatar rigs. Scene modules may expose test
   hooks through `window.portfolio.world` but do not manipulate DOM overlays.
4. **UI** (`src/ui/`) mirrors in-world state via DOM overlays. It reads from
   assets and systems but never reaches back into scene objects directly. HUD
   components subscribe to system events (e.g. key bindings, POI selection) and
   publish accessible representations.

## Boot sequence

1. `src/main.ts` imports immutable data from `src/assets/` (floor plans,
   performance budgets, localisation strings) and feeds them into systems.
2. Systems initialise controllers (`KeyboardControls`, failover handlers,
   ambient audio) and expose typed handles back to the main module.
3. The Three.js scene graph is composed from `src/scene/**` factories using the
   handles created above. Each builder returns both the instantiated meshes and
   a lightweight API for updates.
4. UI bridges in `src/ui/` subscribe to the same handles so DOM overlays stay in
   sync with 3D state. Nothing inside `src/ui/` directly mutates Three.js
   objects; it reacts to system events instead.

## Module directories

- [`src/assets/`](../../src/assets/) – floor plans, localisation, theme, and
  performance budgets. Also exposes POI copy consumed across systems and UI.
- [`src/systems/`](../../src/systems/) – keyboard controls, audio pipelines,
  movement prediction, collision detection, mode failover, and HUD control
  handles. Systems never import from `src/ui/`.
- [`src/scene/`](../../src/scene/) – avatar importers, environmental builds,
  POI registries, lighting helpers, and structural meshes. Scene code consumes
  system handles and emits immutable references for UI/tests.
- [`src/ui/`](../../src/ui/) – HUD layout, accessibility bridges, immersive URL
  helpers, and stylesheet entry points. UI reads assets/systems and mirrors
  them for DOM accessibility.

## Module composition cheat sheet

- **Camera rig** – [`src/main.ts`](../../src/main.ts) and
  [`cameraRelativeMovement.ts`](../../src/systems/movement/cameraRelativeMovement.ts)
  keep the orthographic camera sized by `CAMERA_SIZE` and emit camera-relative
  vectors so avatar facing stays aligned with input.
- **Input controls** –
  [`KeyboardControls.ts`](../../src/systems/controls/KeyboardControls.ts),
  [`VirtualJoystick.ts`](../../src/systems/controls/VirtualJoystick.ts), and
  [`keyBindings.ts`](../../src/systems/controls/keyBindings.ts) emit movement
  vectors plus action events. Key bindings drive HUD prompts and focus
  announcers.
- **HUD overlays** – [`src/ui/hud`](../../src/ui/hud),
  [`src/ui/accessibility`](../../src/ui/accessibility), and
  [`src/ui/help`](../../src/ui/help) subscribe to key binding, accessibility
  preset, and POI selection handles. Each overlay follows the
  [accessibility checklist](../guides/accessibility-overlays.md).
- **POI orchestration** – The registry at
  [`src/scene/poi/registry.ts`](../../src/scene/poi/registry.ts), interactions in
  [`interactionManager.ts`](../../src/scene/poi/interactionManager.ts), and DOM
  mirroring in [`tooltipOverlay.ts`](../../src/scene/poi/tooltipOverlay.ts)
  propagate copy and analytics across Three.js markers, HUD tooltips, and the
  keyboard traversal macro. `PoiVisitedState` keeps visited/featured flags
  consistent across layers.

## Shared state contracts

- Systems emit typed handles (e.g. `HudFocusAnnouncerHandle`) that the scene
  registers during boot in `src/main.ts`. UI code only interacts with these
  handles or lightweight observables.
- Scene modules expose read-only helpers for tests through `window.portfolio`
  (e.g. `world.movePlayerTo`). Systems and UI never mutate `window` globals
  directly.
- Assets declare canonical IDs (floor, POI, presets). Other layers reference
  IDs instead of hard-coded literals so data changes remain single-sourced.

Keep this flow intact when adding new functionality—new data enters through
assets, propagates through systems, drives the scene, and finally reaches the
UI layer for accessibility parity.
