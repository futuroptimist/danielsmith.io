# Tutorial panel architecture

The Tutorial panel is an explicit onboarding HUD panel for immersive mode. It
replaces removed implicit guidance with a localized, user-controlled panel that
can stay open while the visitor continues moving, zooming, and interacting with
points of interest (POIs). This document is design-only: it names the modules,
state contracts, and test coverage needed for implementation, but it does not
add runtime Tutorial behavior.

## Current architecture inventory

### HUD panels and menu chrome

- `src/ui/hud/hudPanelCoordinator.ts` currently coordinates two top-level HUD
  panels: `controls` and `settings`. It owns active-panel state, button
  `aria-expanded`/`aria-pressed` synchronization, Escape-to-close behavior, and
  the Text action. Opening Controls closes Settings; opening Settings closes
  Controls; activating Text closes all panels.
- `src/ui/hud/responsiveControlOverlay.ts` implements the non-modal Controls
  popover. It sets `role="dialog"`, `aria-modal="false"`, owns the Controls
  button metadata, exposes `open`/`close`/`toggle`, and leaves gameplay shortcuts
  available while open.
- `src/ui/hud/helpModal.ts` implements Settings as a conservative modal dialog
  with a backdrop and focusable content. Settings is intentionally stricter than
  Controls and currently blocks gameplay shortcuts through shared shortcut
  gating.
- `src/immersiveScene.ts` wires the Controls, Text, and Settings menu buttons,
  creates the HUD coordinator, and clears POI detail state when Settings opens.
- `src/ui/styles.css` owns the visual placement of HUD menu buttons, panel
  popovers, combined Controls + POI mobile layouts, POI overlays, safe-area
  spacing, and button styling that the Tutorial panel should reuse where
  practical.

### Keybindings and keyboard handlers

- `src/systems/controls/keyBindings.ts` defines central gameplay actions and
  defaults. Existing defaults include movement, `interact`, Settings/help (`H`
  and `?`), and Controls (`C`).
- `src/immersiveScene.ts` loads persisted keybinding overrides from
  `danielsmith.io:keyBindings`, uses `KeyBindings` for movement and Controls,
  and has dedicated keyboard handlers for Controls, Settings/help, POI cycling,
  POI interaction, zoom, debug tools, and manual text-mode fallback.
- `src/ui/hud/gameplayShortcutGating.ts` blocks gameplay shortcuts for text-entry
  targets and while Settings is active. Controls is gameplay-permissive.

### Movement inputs

- Keyboard movement is derived from `moveForward`, `moveBackward`, `moveLeft`,
  and `moveRight` keybinding actions in `src/immersiveScene.ts`.
- Touch movement comes from `src/systems/controls/VirtualJoystick.ts`; the left
  half of the screen creates a movement joystick and exposes normalized x/y
  values via `getMovement()`.
- `src/systems/movement/cameraRelativeMovement.ts` converts combined keyboard
  and joystick input into world movement using the active camera basis. Tutorial
  movement tracking must use the same camera-relative canonical directions as
  gameplay: north/forward is away from the camera, south/backward is toward the
  camera, west/left and east/right are camera-relative lateral directions.
- `src/systems/movement/facing.ts` provides camera-relative yaw helpers used to
  face the avatar without assuming floor-plan world axes.

### Zoom inputs

- `src/systems/camera/zoomControls.ts` centralizes keyboard, wheel, and pinch
  zoom math. It includes `applyCameraZoomStep`, `applyWheelCameraZoomStep`,
  `applyPinchCameraZoom`, `clampCameraZoom`, `getKeyboardZoomDirection`, and
  `isTextEntryTarget`.
- `src/immersiveScene.ts` currently defines runtime zoom bounds as
  `MIN_CAMERA_ZOOM = 0.65` and `MAX_CAMERA_ZOOM = 12`, tracks
  `cameraZoomTarget`, and exposes camera zoom state through the debug/test
  portfolio API.
- Keyboard zoom uses `Shift + =` / `Shift + -` plus numpad variants; wheel zoom
  listens on the renderer canvas; touch pinch zoom tracks two pointer positions.

### POI visited state

- `src/scene/poi/visitedState.ts` already defines a general, persisted POI
  visited primitive. It stores a JSON array of stable POI ids in
  `danielsmith.io::poi::visited::v1`, safely falls back when storage is
  unavailable, exposes `markVisited`, `snapshot`, `reset`, and `subscribe`, and
  notifies listeners with a `ReadonlySet<PoiId>`.
- `src/immersiveScene.ts` creates the visited state, subscribes to it, mirrors
  visited flags onto POI instances, and passes visited ids into the DOM tooltip.
- `src/scene/poi/interactionManager.ts` dispatches selection and hover events.
  `src/immersiveScene.ts` marks a POI visited when the selection listener fires,
  so clicking, tapping, keyboard selection, and explicit POI selection paths
  share one visited-state source.
- `src/scene/poi/tooltipOverlay.ts` renders the localized DOM “Visited” badge.
  `src/scene/poi/markers.ts` and `src/scene/poi/visitedBadge.ts` render the
  in-world visited ring/badge based on the same mirrored visited flags.

### Localization guardrails

- UI copy and POI copy are centralized under `src/assets/i18n/`. Supported
  locales include the default English locale, localized locale modules, and the
  pseudo/Latin override path used for translation QA.
- `scripts/check-hardcoded-ui-strings.cjs`, `npm run i18n:guard`,
  `src/tests/i18n.test.ts`, and `npm run docs:check` enforce that HUD, Settings,
  scene, and future HUD-panel text stays in typed locale data rather than
  runtime hardcoded English.
- Tutorial implementation must extend the i18n type definitions and every
  supported locale file before rendering user-visible Tutorial strings.

### Z-fighting and geometry audit guardrails

- The Tutorial work is UI/state-only and must not touch scene geometry,
  colliders, miniature manifests, or `docs/assets/game-launch.png`.
- Existing collider and geometry checks include `scripts/colliderGeometryAudit.ts`,
  `scripts/colliderReachabilityAudit.ts`, `scripts/colliderRedundancyGate.ts`,
  their tests under `scripts/__tests__/`, and the relevant npm scripts.
  Tutorial implementation and tests must keep these audits passing and must not
  relax z-fighting or collider coverage.

## Goals

- Make onboarding explicit, user-controlled, and reachable from a visible HUD
  menu button and the `R` hotkey.
- Keep all Tutorial copy localized in every supported locale and covered by the
  hardcoded-string guardrails.
- Allow gameplay while Tutorial is open so users can complete Tutorial tasks in
  place.
- Persist Tutorial progress across refreshes without storing localized strings.
- Support desktop, touch, and narrow mobile browsers with safe-area-aware layout.
- Make completion and layout testable with unit, component/integration, and
  Playwright tests rather than relying only on screenshots.

## Non-goals

- Do not reintroduce implicit Guided Tour recommendations, route suggestions, or
  tour reset behavior.
- Do not reintroduce Narration popups, procedural story logs, narrative logs, or
  ambient narration settings.
- Do not block the scene behind a modal Tutorial.
- Do not replace or weaken the existing Controls or Settings panels.
- Do not reintroduce Loadouts.
- Do not weaken localization, hardcoded-string, z-fighting, collider, or
  miniature-audit guardrails.
- Do not bump chart or application versions as part of Tutorial work.

## HUD menu architecture

### Universal 2x2 grid

The top-right HUD menu should become a universal two-column by two-row pill grid
on every device size:

1. Controls (`C`)
2. Tutorial (`R`)
3. Text (`T`)
4. Settings (`H`)

Expected tab order follows visual order: Controls, Tutorial, Text, Settings.
This keeps keyboard traversal predictable and makes the menu read as one
intentional cluster instead of a line of crowded buttons.

### Button content and key badges

- Each menu item uses a localized label plus a compact key badge.
- The key badge should reuse the existing HUD menu key-hint styling and
  `formatKeyLabel` output where possible.
- Labels and `title`/`aria-label` strings come from i18n. Runtime components must
  not hardcode English labels such as “Tutorial”.
- Controls and Settings controls-help lists must remain sourced from the same
  shared controls data and must remain 100% identical. Adding Tutorial to the HUD
  menu must not fork or duplicate the Controls list.

### Responsive behavior and safe areas

- The grid remains 2x2 on desktop, tablet, and phone. Narrow widths may reduce
  horizontal padding, font size, or key-badge prominence, but should not collapse
  into a single row that crowds the right edge.
- The grid uses existing HUD safe-area variables/patterns so it honors
  `env(safe-area-inset-top)` and `env(safe-area-inset-right)`.
- The grid should solve mobile crowdedness while still looking intentional on
  desktop, likely by treating the four pills as one grouped control with even
  column widths and consistent gaps.

### Coexistence with panels

- `HudPanel` should add a `tutorial` state and `createHudPanelCoordinator` should
  accept a Tutorial panel handle and Tutorial button.
- Only one top-level HUD panel should be open at a time: opening Tutorial closes
  Controls and Settings; opening Controls closes Tutorial and Settings; opening
  Settings closes Controls and Tutorial.
- Tutorial and Controls are non-modal and may coexist with selected POI detail
  panels. Settings may continue to clear or hide POI detail state.
- Text remains an action rather than a top-level panel; activating Text closes
  all top-level HUD panels and uses the existing text-mode behavior.

## Tutorial panel layout

Implement the panel as a non-modal HUD popover, visually related to Controls but
large enough for task content. Proposed modules:

- `src/ui/hud/tutorialPanel.ts` for DOM construction and panel handle.
- `src/ui/hud/tutorialPanelState.ts` or `src/systems/tutorial/stateMachine.ts`
  for pure state transitions.
- `src/systems/tutorial/persistence.ts` for localStorage parsing and writes.
- `src/systems/tutorial/actionTracking.ts` for movement, zoom, and POI progress
  adapters if these are not colocated in `immersiveScene.ts`.
- `src/assets/i18n/types.ts` and all locale modules for `TutorialPanelStrings`.

The panel has four zones.

### Collapsible sidebar

- Lists each tutorial page by stable page id and localized title.
- The first page is always unlocked.
- Unlocked steps are enabled buttons and are clickable.
- Locked steps are disabled, use muted/gray text, expose `aria-disabled="true"`,
  and do not navigate.
- The active step is highlighted visually and uses `aria-current="step"`.
- The sidebar can collapse to preserve space. Its expanded/collapsed state should
  be announced with localized labels and `aria-expanded`.

### Body

- Renders localized heading, explanatory body copy, instructions, and any page
  action controls for the active page.
- Renders progress chips/checkmarks for active tasks.
- Includes an `aria-live="polite"` region that announces newly completed tasks
  without stealing focus.

### Navigation

- Previous and Next buttons sit below the body.
- Previous is disabled on the first page.
- Next is disabled until the next page is unlocked.
- Navigation changes only the active page; it does not mutate completion flags.

### Options

- Options sit under navigation and include:
  - Show on startup checkbox, default checked and persisted separately from
    progress.
  - Dismiss button, which closes Tutorial for the current page load/session only.
- Reuse existing Settings button/checkbox styling where practical to avoid a new
  visual language.

## Gameplay policy

Tutorial must be gameplay-permissive. While Tutorial is open, the app must still
allow:

- Keyboard and touch movement.
- Keyboard, wheel, and pinch zoom.
- POI hover and selection.
- Clicking, tapping, keyboard-interacting with POIs.
- `Q` / `E` POI cycling.
- The Text action.

Tutorial must not hide selected POI panels, clear selected or hovered POI state,
or prevent the floating visited labels/badges from updating. Escape closes the
active HUD panel using the coordinator. Clicking or tapping the scene behind
panels should follow existing Controls/POI transient-dismiss rules. Text-entry
targets still block gameplay shortcuts. Settings may remain conservative/modal;
opening Settings closes Tutorial.

`canHandleGameplayShortcut` should continue to block Settings and text-entry
fields but should treat `tutorial` the same way it treats `controls`.

## Tutorial pages and completion rules

Stable page ids are:

- `welcomeMovement`
- `zoom`
- `visitPois`
- `findGitshelves`

### Page 1: Welcome and movement

Purpose text welcomes visitors to the portfolio and explains that projects are
shown as interactive exhibits. The instruction asks the visitor to move in all
four cardinal directions represented by WASD.

Completion is based on camera-relative movement direction, not physical key
identity. Keyboard, arrow keys, touch joystick, gamepad-like future inputs, or
any other input that produces the same canonical direction can count.

Required accumulated durations:

- Forward/north: at least `0.25` seconds.
- Left/west: at least `0.25` seconds.
- Backward/south: at least `0.25` seconds.
- Right/east: at least `0.25` seconds.

The tracker should consume normalized input components before or alongside
`getCameraRelativeMovementVector`: positive forward counts north, negative
forward counts south, negative right counts west, and positive right counts east.
For diagonal input, count every component whose absolute value passes a small
input deadzone such as `0.2`, using `deltaSeconds` from the main update loop.
Completion flags are monotonic.

Visual indicators use dark yellow for incomplete and bright yellow for complete,
plus checkmarks and screen-reader labels so color is not the only signal.

The body also explains that visitors may choose text-only mode and includes a
Text-only button that invokes the same handler and styling as the existing Text
HUD control.

### Page 2: Zoom

The instruction asks visitors to zoom all the way in and all the way out using
mouse wheel, multitouch pinch, or keyboard `Shift + =` / `Shift + -`.

Completion uses actual runtime zoom bounds rather than duplicated constants:

- Zoom-in complete when the active `cameraZoomTarget` reaches the max threshold.
- Zoom-out complete when the active `cameraZoomTarget` reaches the min threshold.
- In and out can complete in either order.
- The threshold should use a tolerance, for example 99% of the zoom range or an
  epsilon derived from `maxZoom - minZoom`.

The panel renders “In” and “Out” chips from localized strings with checkmarks
and completed/incomplete screen-reader labels.

### Page 3: Visit 3 POIs

The instruction explains that POIs are project exhibits containing summary,
outcomes, metrics, links, and context.

Completion must hook into `PoiVisitedState` rather than a duplicate shadow state.
Clicking, tapping, keyboard selection, or any existing interaction that marks a
POI visited increments a unique visited-POI count. The counter renders from
`0/3` through `3/3`; at `3/3` it turns bright yellow and receives a checkmark and
accessible status. Count unique stable POI ids only.

### Page 4: Find Gitshelves

The instruction asks visitors to find and interact with Gitshelves. The planned
hint is “check upstairs”, but implementation must verify current POI data before
shipping that hint.

Completion is based on stable POI id, not localized title text. The expected id
is `gitshelves-living-room-installation`; implementation must verify this in
`src/scene/poi/types.ts`, `src/scene/poi/registry.ts`, and placement tests. If
Gitshelves is not upstairs in current placement data, either update the hint or
intentionally update placement with tests.

Completion is location-agnostic at runtime: if the Gitshelves id is present in
`PoiVisitedState`, the page is complete.

## Persistence model

Use versioned localStorage keys:

- `danielsmith.io:tutorial:v1:progress`
- `danielsmith.io:tutorial:v1:showOnStartup`

Prefer an in-memory per-load flag for Dismiss. Only add
`danielsmith.io:tutorial:v1:dismissedSession` if a later implementation proves a
storage-backed session flag is needed.

`showOnStartup` defaults to true. Progress persists separately from
`showOnStartup`. Unchecking Show on startup persists `false` and prevents future
automatic Tutorial opening on immersive loads. Pressing `R` or clicking the
Tutorial menu button always opens Tutorial regardless of `showOnStartup`.
Dismiss closes the panel for the current page load only and does not change
`showOnStartup` or progress.

Corrupt, missing, or schema-incompatible localStorage values safely reset to
defaults and should not throw during app startup. Future migrations happen by
bumping the version segment (`v1` to `v2`) and adding explicit migration code if
old progress should carry forward. Do not store localized strings.

Suggested `progress` JSON shape:

```json
{
  "version": 1,
  "currentPageId": "welcomeMovement",
  "unlockedPageIds": ["welcomeMovement"],
  "completedPageIds": [],
  "movement": {
    "forwardSeconds": 0,
    "leftSeconds": 0,
    "backwardSeconds": 0,
    "rightSeconds": 0,
    "completed": {
      "forward": false,
      "left": false,
      "backward": false,
      "right": false
    }
  },
  "zoom": { "in": false, "out": false },
  "visitedPoiIds": [],
  "findGitshelves": { "completed": false }
}
```

If `PoiVisitedState` remains persisted as the source of truth, Tutorial may
persist only tutorial-specific derived flags and rehydrate `visitedPoiIds` from
`PoiVisitedState.snapshot()` at startup. Whichever approach is chosen, use one
shared POI visited primitive for runtime behavior.

## State machine

- First page (`welcomeMovement`) is always unlocked.
- Each successive page unlocks when the previous page completion criteria are
  satisfied.
- Users can navigate to any unlocked page.
- Locked pages appear disabled in the sidebar and cannot be selected via click,
  keyboard, or programmatic public panel API.
- Completion is monotonic unless a future explicit reset feature is designed and
  tested.
- Persist unlocked page ids, completed action flags, movement durations per
  cardinal direction, zoom in/out flags, visited POI ids or derived count from
  shared visited state, Gitshelves completion flag, and current page id if useful.

Suggested pure reducer API:

- `createInitialTutorialState(options)`
- `hydrateTutorialState(rawProgress, poiVisitedSnapshot)`
- `recordMovement(state, { right, forward, deltaSeconds })`
- `recordZoom(state, { targetZoom, minZoom, maxZoom })`
- `recordVisitedPois(state, visitedPoiIds)`
- `selectTutorialPage(state, pageId)`
- `goToPreviousTutorialPage(state)`
- `goToNextTutorialPage(state)`
- `deriveTutorialUnlocks(state)`

Pure functions make unit tests independent from Three.js and DOM setup.

## Integration contracts

### Keybinding

Add a `toggleTutorial` action to `KeyBindingAction` with default binding `R`.
Before implementation, audit conflicts against existing gameplay, debug, audio,
manual text-mode, and browser shortcuts. The Tutorial key handler should follow
the Controls handler pattern: ignore repeats/modifiers/text-entry targets,
prevent default only on a valid non-conflicting match, and toggle through
`HudPanelCoordinator`.

### Movement

Expose movement tracking from the main movement update loop by passing combined
camera-relative input components and `deltaSeconds` to the Tutorial tracker. Do
not track only raw keyboard events; joystick movement and future alternate input
sources must count.

### Zoom

Expose zoom bounds and `cameraZoomTarget` changes to the Tutorial tracker. Avoid
copying `MIN_CAMERA_ZOOM` and `MAX_CAMERA_ZOOM` into tutorial code without a
single exported source or explicit adapter.

### POI visited

Subscribe to `PoiVisitedState` and derive the visit count and Gitshelves
completion from the shared snapshot. If the visited primitive changes, keep it
independent from removed Guided Tour code and preserve the existing DOM tooltip
and in-world visited badge behavior.

### Text mode

The Tutorial text-only button calls the same `activateTextMode` pathway used by
the existing Text menu button. Do not duplicate failover or text-mode preference
logic.

### Localization

Add typed Tutorial strings to i18n, including menu metadata, button labels,
headings, descriptions, page text, task chip labels, status labels,
announcements, errors/fallbacks, and accessible names. All supported locale files
and the pseudo-locale path must include the keys. The hardcoded-string guard must
cover Tutorial runtime files.

## Accessibility requirements

- Tutorial menu button:
  - Localized `title` and `aria-label`.
  - `aria-controls` pointing at the panel id.
  - `aria-expanded` reflecting open state.
  - `aria-pressed` if consistent with the other HUD menu buttons.
- Panel:
  - Non-modal dialog or landmark semantics consistent with Controls.
  - `aria-modal="false"` if `role="dialog"` is used.
  - `aria-labelledby` and `aria-describedby`.
  - Focus should not be stolen unexpectedly when gameplay is underway; opening
    from pointer may release button focus like Controls, while keyboard opening
    may keep a predictable focus target.
  - Escape closes the active HUD panel.
- Sidebar:
  - Locked items expose disabled state and `aria-disabled`.
  - Active item uses `aria-current="step"`.
  - Collapse toggle exposes and announces expanded/collapsed state.
- Progress chips:
  - Use color plus checkmark/text status.
  - Include screen-reader labels for completed and incomplete states.
  - Task completion updates an `aria-live="polite"` region.
- Buttons and checkbox:
  - Localized labels.
  - Native disabled states where applicable.
  - Do not rely on color alone.

## Responsive layout requirements

- The 2x2 HUD menu grid is present on all device sizes.
- Tutorial can coexist with a POI detail panel without clearing selected POI
  state.
- Desktop layout should avoid avoidable overlap with POI details and leave a
  meaningful part of the scene visible.
- Mobile layout should use internal scrolling, preserve visible scene gutters,
  and honor safe-area insets.
- When Tutorial and a POI panel are both visible on mobile, split available
  vertical space roughly half and half, following the combined Controls + POI
  pattern already used for narrow screens.
- The sidebar should collapse by default or become a top/inline step list on
  narrow screens if a left rail would crowd the body.

## Test strategy

### Unit tests

Proposed files:

- `src/systems/controls/keyBindings.test.ts`: `toggleTutorial` exists and default
  `R` formats/disambiguates correctly.
- `src/systems/tutorial/stateMachine.test.ts`: unlock rules, monotonic
  completion, locked page selection rejection, previous/next state.
- `src/systems/tutorial/persistence.test.ts`: corrupt localStorage fallback,
  defaults, version handling, `showOnStartup` persistence, no localized strings.
- `src/systems/tutorial/actionTracking.test.ts`: movement direction accumulation,
  zoom threshold completion, POI unique count completion, and Gitshelves id
  completion.
- `src/tests/i18n.test.ts` plus `scripts/check-hardcoded-ui-strings.cjs` tests:
  Tutorial keys exist in every locale and runtime Tutorial files are guarded
  against hardcoded English.

### Integration/component tests

Proposed files:

- `src/ui/hud/tutorialPanel.test.ts`: renders sidebar, body, navigation, options,
  progress chips, live region, and localized labels.
- `src/ui/hud/hudPanelCoordinator.test.ts`: Tutorial participates in one
  top-level active panel, Settings closes Tutorial, Text closes Tutorial, and
  Tutorial is gameplay-permissive in shortcut gating.
- `src/ui/hud/tutorialPanel.integration.test.ts`: locked/unlocked sidebar
  behavior, Previous/Next disabled states, Show on startup checkbox, Dismiss, and
  text-only button invoking the shared text-mode action.

### Playwright tests

Proposed file: `playwright/tutorial-panel.spec.ts`.

Coverage:

- Tutorial opens on startup by default in immersive mode.
- Dismiss closes it for the current load.
- `showOnStartup=false` prevents auto-open on the next immersive load.
- `R` toggles Tutorial.
- Movement in all four canonical directions unlocks the Zoom page.
- Zooming to min and max thresholds unlocks the POI page.
- Visiting three unique POIs unlocks the Gitshelves page.
- Visiting Gitshelves completes the final page.
- Mobile 2x2 grid fits, the panel scrolls internally, and Tutorial + POI panels
  split space without hiding selected POI details.
- Controls and Settings controls-list parity remains intact.
- Release checks still include docs, i18n, typecheck, tests, and z-fighting or
  collider audit checks where applicable.

## Migration and deletion plan

Tutorial must be a new explicit HUD panel and must not reuse removed Guided Tour
or Narration code paths. Avoid module names, storage keys, CSS classes, i18n
keys, and tests that contain removed feature names. If old references appear in
comments or manifests as historical audit notes, do not expand them into runtime
behavior.

The existing `PoiVisitedState` is already a general POI primitive and is not tied
to removed guidance. Tutorial should consume that primitive. If future cleanup
finds any visited behavior still coupled to removed guidance, extract a neutral
`src/scene/poi/visitedState.ts` contract first, keep the current storage key for
POI visited continuity, and then have Tutorial subscribe to that neutral
contract.

## Documentation acceptance checklist

A future implementer should be able to build the Tutorial system from this doc
without guessing:

- Where top-level HUD state lives: `hudPanelCoordinator` plus a new Tutorial
  panel handle.
- Where pure Tutorial state lives: a new tutorial state-machine module.
- How progress persists: versioned Tutorial localStorage keys and shared POI
  visited state.
- How each page unlocks: stable page ids and explicit completion criteria.
- How desktop/mobile layout works: universal 2x2 menu grid, non-modal panel,
  safe-area-aware responsive split with POI details.
- How localization works: typed i18n keys in every locale and hardcoded-string
  guard coverage.
- How tests prove behavior: unit, component/integration, Playwright, docs, i18n,
  and existing audit checks.
