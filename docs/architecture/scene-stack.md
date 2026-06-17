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

- [`src/assets/`](../../src/assets/) – compatibility floor plans, localisation, theme, and
  performance budgets. Also exposes POI copy consumed across systems and UI. Current
  room bounds and wall topology are now authored in the declarative level source at
  [`src/scene/level/portfolioLevel.ts`](../../src/scene/level/portfolioLevel.ts);
  `src/assets/floorPlan/index.ts` adapts that source into legacy `FLOOR_PLAN`,
  `UPPER_FLOOR_PLAN`, and `FLOOR_PLAN_LEVELS` exports while the migration continues.
- [`src/systems/`](../../src/systems/) – keyboard controls, audio pipelines,
  movement prediction, collision detection, mode failover, HUD control handles,
  and the GitHub repo stats service that reads pod-local runtime metrics into POIs.
  Systems never import from `src/ui/`.
- [`src/scene/`](../../src/scene/) – avatar importers, environmental builds,
  POI registries, lighting helpers, and structural meshes. Scene code consumes
  system handles and emits immutable references for UI/tests.
- [`src/ui/`](../../src/ui/) – HUD layout, accessibility bridges, immersive URL
  helpers, and stylesheet entry points. UI reads assets/systems and mirrors
  them for DOM accessibility.

### State surfaces & consumers

| Source handle / data surface         | Origin                                                                                                   | Consumed by                                                                             | Notes                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `PORTFOLIO_LEVEL` declarative source | [`src/scene/level/portfolioLevel.ts`](../../src/scene/level/portfolioLevel.ts)                           | Legacy floor-plan adapter, level invariant tests                                        | Canonical current room and wall source for ground and upper floors.    |
| `FLOOR_PLAN` + POI metadata          | [`src/assets/floorPlan/index.ts`](../../src/assets/floorPlan/index.ts)                                   | Scene POI builders, keyboard traversal macro, HUD tooltip overlay                       | Compatibility exports adapted from `PORTFOLIO_LEVEL` during migration. |
| `KeyBindingRegistry`                 | [`src/systems/controls/keyBindings.ts`](../../src/systems/controls/keyBindings.ts)                       | HUD legend (`src/ui/hud/movementLegend.tsx`), help modal, Playwright macro              | Emits observable binding changes so overlays update instantly.         |
| `getCameraRelativeMovementVector`    | [`src/systems/movement/cameraRelativeMovement.ts`](../../src/systems/movement/cameraRelativeMovement.ts) | `src/main.ts` avatar update loop and movement/facing tests                              | Provides camera-relative planar vectors for movement and yaw.          |
| `PoiVisitedState`                    | [`src/scene/poi/visitedState.ts`](../../src/scene/poi/visitedState.ts)                                   | Scene halo/material toggles, DOM overlay badges, accessibility announcers               | Persists visited state between HUD and Three.js meshes.                |
| `HudFocusAnnouncerHandle`            | [`src/ui/accessibility/hudFocusAnnouncer.ts`](../../src/ui/accessibility/hudFocusAnnouncer.ts)           | HUD overlays, subtitles bridge, Playwright assertions                                   | Centralises live-region announcements and aria-live priorities.        |
| Performance budgets                  | [`src/assets/performance.ts`](../../src/assets/performance.ts)                                           | Vitest assertions (`src/tests/performanceBudget.test.ts`), Playwright diff budget, docs | Keeps render metrics and screenshot tolerances in sync.                |

### Data flow callouts

- **Camera framing** – `src/main.ts` resolves the initial orthographic zoom with
  [`resolveInitialAvatarCameraFraming`](../../src/scene/camera/initialFraming.ts)
  after constructing the camera. Resize behavior stays in `src/main.ts` through
  the local `onResize` handler, which refreshes projection, renderer, and
  postprocessing dimensions.
- **Avatar loop** – `src/main.ts` samples key bindings and joystick input each
  frame, then derives movement via
  [`getCameraRelativeMovementVector`](../../src/systems/movement/cameraRelativeMovement.ts).
  The same loop applies velocity, collision clamping, and yaw so HUD prompts can
  reflect active WASD axes without owning Three.js meshes.
- **POI orchestration** – The registry
  (`src/scene/poi/registry.ts`) hydrates data from
  [`src/assets/i18n/locales/en.ts`](../../src/assets/i18n/locales/en.ts) and now exposes
  room-aware lookups via `poiRegistry.getByRoom(...)`. Interaction handlers in
  `src/scene/poi/interactionManager.ts` emit POI selection events. UI layers
  listen via the shared observable to mirror selection state in
  [`src/scene/poi/tooltipOverlay.ts`](../../src/scene/poi/tooltipOverlay.ts), while
  [`src/scene/poi/githubMetrics.ts`](../../src/scene/poi/githubMetrics.ts)
  wires GitHub star counts into both the in-world tooltip and HUD overlay. Deployed pods serve
  a sidecar-refreshed `/runtime/github-metrics.json` file with no-store cache headers, and the
  static frontend treats that cache as the normal source of truth. The cache has a modest grace
  window beyond `expiresAt`
  so an hourly refresh that lands slightly late does not flicker metrics back to neutral copy;
  long-lived sessions retry the runtime file after that cache window instead of pinning the
  first successful response forever; failed refreshes clear expired runtime metrics and notify open
  UI so tooltips and the media wall return to neutral copy. Stale, invalid, missing, private, or
  rate-limited data falls back to localized neutral text
  such as “Syncing from GitHub…” rather than invented numbers. Browser live GitHub API fetches
  are disabled for normal visitors and require an explicit debug/test flag
  (`?enableLiveGitHubMetrics=1` or `window.__ENABLE_LIVE_GITHUB_METRICS__ = true`). No GitHub
  token or other secret is required or exposed for public star counts. Local preview builds include
  `public/runtime/github-metrics.json` as an expired, non-authoritative neutral placeholder so
  normal immersive startup can request the same pod-local path without producing browser 404
  console noise or pinning neutral metrics ahead of a real sidecar refresh.
- **Accessibility overlays** – `HudFocusAnnouncerHandle` flows from systems
  into DOM overlays: `src/ui/accessibility/ariaBridges.ts` registers live
  regions, while Playwright specs assert emitted announcements against
  `aria-live` mirrors. Focus order is enforced in HUD components using the
  helper metadata defined in `src/ui/accessibility/focusOrder.ts`.
- **Diagnostics & testing** – `window.portfolio` receives the world handle in
  `src/main.ts`, letting Vitest and Playwright reposition the avatar, validate
  draw calls, and sample HUD text without importing DOM code inside the scene
  layer.

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
- **HUD overlays** – [`src/ui/hud`](../../src/ui/hud) and
  [`src/ui/accessibility`](../../src/ui/accessibility) subscribe to key binding, accessibility
  preset, and POI selection handles. Each overlay follows the
  [accessibility checklist](../guides/accessibility-overlays.md).
- **POI orchestration** – The registry at
  [`src/scene/poi/registry.ts`](../../src/scene/poi/registry.ts) now includes
  room-scoped helpers such as `getPoiDefinitionsByRoom(...)`. Interactions in
  [`interactionManager.ts`](../../src/scene/poi/interactionManager.ts) and DOM
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
