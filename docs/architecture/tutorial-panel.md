# Tutorial panel architecture

## Purpose

The Tutorial panel is an explicit, localized onboarding surface for the immersive
portfolio. It replaces the removed guided and narration experiences with a
user-controlled HUD panel that lets visitors keep moving, zooming, and
interacting with project exhibits while they learn the scene.

This document defines the runtime architecture for the future implementation. It
is intentionally design-only: no Tutorial runtime code, strings, styles, storage
keys, or tests are added by this document.

## Current architecture summary

### HUD panels and menu

- `src/ui/hud/hudPanelCoordinator.ts` currently coordinates two top-level HUD
  panels: `controls` and `settings`. It owns active-panel state, updates
  `aria-expanded`/`aria-pressed` on HUD buttons, closes Controls before opening
  Settings, closes Settings before opening Controls, routes Text mode through a
  shared callback, and closes the active panel on Escape.
- `src/ui/hud/responsiveControlOverlay.ts` implements the Controls popover as a
  non-modal dialog (`aria-modal="false"`) and exposes `open`, `close`, `toggle`,
  `isOpen`, string refresh, layout refresh, and focus-release hooks.
- `src/ui/hud/helpModal.ts` implements Settings as a modal dialog
  (`aria-modal="true"`) with a backdrop and focus management. Settings may keep
  its conservative, modal behavior.
- `src/immersiveScene.ts` uses `HudPanelCoordinatorHandle.getActivePanel()` to
  decide whether POI detail panels can be shown. Settings blocks and clears POI
  detail state, while Controls is gameplay-permissive and can coexist with POI
  detail panels, including the combined mobile Controls + POI layout.
- `src/ui/styles.css` owns the HUD menu, Controls, Settings, POI detail, safe-area,
  and combined mobile layout rules. Tutorial styles should extend these patterns
  instead of creating an unrelated overlay system.

### Keybindings and gameplay shortcut gating

- `src/systems/controls/keyBindings.ts` defines the central action registry,
  default bindings, persistence-friendly update APIs, subscription hooks, and
  display formatting. Current actions are movement, interaction, Settings help,
  and Controls toggle.
- `src/immersiveScene.ts` persists user keybinding overrides under
  `danielsmith.io:keyBindings`, mirrors keybinding labels into HUD/control UI,
  and handles the Controls hotkey by matching the central binding rather than
  hard-coding `C` in the keydown handler.
- `src/ui/hud/gameplayShortcutGating.ts` gates gameplay shortcuts. Text-entry
  targets always block gameplay shortcuts; Controls is permissive; Settings is
  conservative.
- Tutorial must add a central keybinding action instead of a one-off keydown
  branch. The default key is `R`, and implementation must audit conflicts with
  existing actions before shipping.

### Movement systems

- Keyboard movement derives `rightInput` and `forwardInput` from the central
  keybinding actions in `src/immersiveScene.ts`.
- Touch/mobile movement comes from the virtual joystick and is combined with the
  keyboard vector before movement is applied.
- `src/systems/movement/facing.ts` provides the canonical camera-relative helper,
  `getCameraRelativeMovementVector(...)`. Movement and facing must continue to
  derive canonical north/south/east/west from the camera perspective rather than
  from world axes.
- Tutorial movement completion must subscribe to, or be called from, the combined
  movement vector after keyboard and joystick inputs are merged so keyboard,
  arrow keys, remapped keys, gamepad-equivalent keyboard bindings, and touch
  joystick movement can all count.

### Zoom systems

- `src/immersiveScene.ts` defines the runtime zoom bounds (`MIN_CAMERA_ZOOM` and
  `MAX_CAMERA_ZOOM`), stores `cameraZoomTarget`, and clamps all target updates to
  those bounds.
- `src/systems/camera/zoomControls.ts` contains reusable zoom math for keyboard,
  wheel, and pinch inputs. Keyboard zoom supports numpad +/- and `Shift` + `=` /
  `Shift` + `-`; wheel zoom normalizes delta modes; pinch zoom scales from the
  starting touch distance.
- The scene exposes debug zoom state through `window.portfolio.graphics` for
  tests. Tutorial should use a typed internal integration point rather than
  relying on debug globals.
- Zoom completion must compare the active zoom target, or a documented actual
  zoom value if the target is unavailable, against the current runtime min/max
  values with tolerance. Do not duplicate magic bounds in Tutorial state code.

### POI visited system

- `src/scene/poi/visitedState.ts` is an existing shared primitive. It persists a
  unique set of visited POI ids, exposes `isVisited`, `snapshot`, `markVisited`,
  `subscribe`, and `reset`, and safely continues without storage when browser
  storage is unavailable.
- `src/immersiveScene.ts` constructs `PoiVisitedState`, subscribes POI markers and
  tooltip overlays to it, and calls `markVisited(poi.id)` when the POI
  interaction manager emits a selection event.
- POI tooltip overlays render a localized “Visited” badge for visited POIs, and
  world markers render visited rings/badges above visited pedestals.
- The current Gitshelves POI id is `gitshelves-living-room-installation`, and its
  current placement is on the upper floor in `focusPods`. Future implementation
  must verify this id and placement against the registry/tests rather than
  relying on localized title text.

### Localization and guardrails

- Runtime user-visible HUD, Settings, controls, accessibility, and POI strings
  live in the i18n catalog and typed locale structures under `src/assets/i18n`.
- `scripts/check-hardcoded-ui-strings.cjs` scans user-visible TypeScript targets,
  including `src/ui/hud`, `src/systems/controls`, accessibility helpers, and
  `src/scene/poi`, to prevent hardcoded English strings from entering runtime UI.
- Tutorial must extend the i18n types and every supported locale, including the
  pseudo-locale, before runtime UI is implemented. Runtime Tutorial components
  must not contain hardcoded English prose.

### Z-fighting audit

- Horizontal overlap and scene-object geometry guidance lives in
  `docs/design/editing-level-data.md`.
- Geometry audit scripts and tests around colliders/rectangles must remain intact.
  Tutorial work must not weaken the z-fighting checks or alter scene geometry as
  a side effect.

## Goals

- Make onboarding explicit, discoverable, and user-controlled.
- Localize all Tutorial text and accessibility labels in every supported locale.
- Keep the Tutorial panel gameplay-permissive so users can complete actions while
  it is open.
- Persist Tutorial progress across refreshes without storing localized strings.
- Support desktop, touch, and mobile browsers with the same core state machine.
- Make completion testable through state, DOM, and events rather than screenshots
  alone.
- Preserve existing Controls, Settings, Text mode, POI, localization, and
  z-fighting behavior.

## Non-goals

- Do not reintroduce implicit guided recommendations, tour reset, route nudges,
  narrative logs, narration popups, or procedural story state.
- Do not block the scene behind a modal Tutorial.
- Do not replace the Controls panel or Settings panel.
- Do not reintroduce Loadouts.
- Do not weaken localization hardcoded-string checks or pseudo-locale coverage.
- Do not weaken z-fighting audit coverage or touch CI-owned screenshot assets.
- Do not bump Helm chart versions as part of Tutorial work.

## HUD menu architecture

### Universal 2x2 menu grid

The top-right HUD menu becomes a universal 2x2 pill grid at every viewport size:

| Tab order | Button   | Primary key badge | Action                |
| --------- | -------- | ----------------- | --------------------- |
| 1         | Controls | `C`               | Toggle Controls panel |
| 2         | Tutorial | `R`               | Toggle Tutorial panel |
| 3         | Text     | `T`               | Activate text mode    |
| 4         | Settings | `H`               | Toggle Settings panel |

Implementation should update the existing menu markup/styles rather than adding a
second menu. The grid should solve crowdedness on mobile while looking
intentional on desktop: two equal-width columns, two rows, consistent pill
corners, consistent gaps, and badges aligned at the trailing edge of each pill.

### Layout and behavior

- The menu remains anchored to the top-right HUD safe area and must preserve
  `env(safe-area-inset-top)` and `env(safe-area-inset-right)` padding.
- At narrow widths, labels may use shorter localized strings if the i18n catalog
  provides them, but buttons must remain readable, tappable, and in the same tab
  order. Do not hide the Tutorial button behind overflow.
- Key badges use the central keybinding formatter. If a binding is remapped, the
  badge updates through the same subscription path that updates Controls and
  Settings help text.
- Controls and Settings controls lists must remain generated from the same shared
  data source and stay 100% identical. Adding Tutorial must not fork or reorder
  the controls help list inconsistently between the popover and Settings.
- `HudPanelCoordinator` should expand its panel union to include `tutorial` and
  expose `openTutorial()`/`toggleTutorial()` APIs. One top-level HUD panel should
  be active at a time: opening Tutorial closes Controls; opening Controls closes
  Tutorial; opening Settings closes both. Text mode closes all top-level panels.
- Tutorial and Controls are non-modal and may coexist with POI detail panels.
  Settings remains modal/conservative and may clear/hide POI details.
- Root attributes used for combined mobile panel layout should generalize beyond
  `data-hud-controls-open`, for example `data-hud-gameplay-panel="controls|tutorial"`,
  while preserving existing Controls + POI behavior.

## Tutorial panel layout

The Tutorial panel is a top-level HUD panel with four zones.

### 1. Collapsible step sidebar

- Lists the stable Tutorial page ids in order: `welcomeMovement`, `zoom`,
  `visitPois`, `findGitshelves`.
- The first step is always unlocked.
- Unlocked steps are enabled buttons and can be selected directly.
- Locked steps are disabled, gray/low-emphasis, not clickable, and expose
  `aria-disabled="true"`.
- The active step is visually highlighted and exposes `aria-current="step"`.
- The sidebar can collapse to an icon/number rail or transform into a top/inline
  step list on narrow screens. Its expanded/collapsed state should be announced
  to assistive tech and may be ephemeral unless user testing shows persistence is
  needed.

### 2. Body

- Renders localized heading, purpose copy, instructions, and optional hint copy
  for the active page.
- Renders progress chips/checkmarks for the active tasks.
- Contains the text-only escape on the first page by reusing the same Text action
  handler and button styling as the HUD Text control.

### 3. Navigation

- Previous and Next buttons sit below the body.
- Previous is disabled on the first page.
- Next is disabled until the next page is unlocked. Completing the current page
  unlocks the next page and enables Next.
- Users may navigate to any unlocked page via the sidebar without forcing a
  linear reading order after unlock.

### 4. Options

- Show on startup checkbox, checked by default, persisted separately from
  progress.
- Dismiss button closes Tutorial for the current page load/session only.
- Reuse Settings/control button tokens and component patterns where practical so
  the panel feels native to the existing HUD.

## Gameplay policy

Tutorial open must not block:

- camera-relative movement;
- keyboard, wheel, and pinch zoom;
- POI hover and selection;
- clicking/tapping/interacting with POIs;
- `Q` / `E` POI cycling;
- the Text mode action.

Additional rules:

- Tutorial open must not hide selected POI panels, clear selected POI state, or
  clear hovered POI state.
- Settings may remain conservative/modal and can close Tutorial.
- Escape closes the active HUD panel first. If no HUD panel is active, existing
  POI Escape behavior may dismiss POI detail state.
- Clicking/tapping the scene behind panels should keep following the existing
  Controls/POI transient dismissal rules.
- Text-entry targets still block gameplay shortcuts and Tutorial hotkeys.
- Opening Settings closes Tutorial. Opening Tutorial may close Controls to keep a
  single top-level non-modal HUD panel active, but Tutorial must coexist with POI
  panels.

## Tutorial pages and completion rules

### Page 1: `welcomeMovement`

Purpose:

- Welcome visitors to the portfolio site.
- Explain that projects are showcased interactively as exhibits.

Instruction:

- Move in all four cardinal directions represented by WASD.
- Completion is based on canonical camera-relative movement direction, not
  physical key identity.
- Keyboard, arrow keys, remapped keys, touch joystick, and any future input that
  contributes to the same movement vector can count.

Completion:

- `forward` accumulated movement input for at least `0.25` seconds.
- `left` accumulated movement input for at least `0.25` seconds.
- `backward` accumulated movement input for at least `0.25` seconds.
- `right` accumulated movement input for at least `0.25` seconds.
- Movement durations are monotonic and should accumulate only while the relevant
  directional component is meaningfully active. Use a small dead zone for analog
  input so joystick noise does not complete a direction.

Visual indicators:

- Incomplete direction chips use dark yellow/low-emphasis styling.
- Complete chips use bright yellow/high-emphasis styling.
- Every chip also includes a checkmark or localized status label so completion
  never relies on color alone.

Text-only escape:

- The body explains that users can choose text-only mode.
- Include a Text-only button that invokes the existing Text mode callback and
  shares the existing Text button styling/semantics.

### Page 2: `zoom`

Instruction:

- Zoom all the way in and all the way out.
- Supported input methods: mouse scroll wheel, multitouch pinch, and keyboard
  `Shift` + `=` / `Shift` + `-` (plus existing numpad zoom shortcuts).

Completion:

- Zoom-in completes when the active camera zoom target reaches the current runtime
  maximum threshold.
- Zoom-out completes when the active camera zoom target reaches the current
  runtime minimum threshold.
- Use actual runtime min/max values from the camera/zoom integration point.
- Use tolerance, for example `maxZoom - epsilon` / `minZoom + epsilon`, where
  `epsilon = max(0.01, (maxZoom - minZoom) * 0.01)`, or another documented 99%
  threshold.
- In and out may complete in either order.

Visual indicators:

- “In” and “Out” chips each expose complete/incomplete status with checkmarks and
  screen-reader labels.

### Page 3: `visitPois`

Instruction:

- Explain that POIs are project exhibits containing summaries, outcomes, metrics,
  links, and context.

Completion:

- Use existing `PoiVisitedState` semantics.
- Clicking, tapping, keyboard-interacting with, or otherwise selecting a POI marks
  it visited through the shared visited primitive.
- Count unique visited POI ids only.
- Counter increments from `0/3` through `3/3`.
- At `3/3`, the counter uses completed styling and exposes a checkmark/status
  indicator.
- Do not duplicate a Tutorial-only shadow visited state. Tutorial may persist a
  snapshot for migration/debugging only if the shared POI visited state remains
  the source of truth.

### Page 4: `findGitshelves`

Instruction:

- Ask the visitor to find and interact with Gitshelves.
- Hint copy may say to check upstairs only if current placement still puts
  Gitshelves on the upper floor. The implementation must verify the registry and
  placement tests before shipping this hint.

Completion:

- Complete when the stable POI id `gitshelves-living-room-installation` appears
  in the shared visited set.
- Do not key completion from localized title text.
- Completion is location-agnostic: it depends on visited/interacted state, not on
  where the POI is rendered.
- If Gitshelves is moved before implementation, either update the hint or make an
  intentional placement update with tests.

## Persistence model

Use versioned localStorage keys:

- `danielsmith.io:tutorial:v1:progress`
- `danielsmith.io:tutorial:v1:showOnStartup`
- Prefer in-memory state for session-only dismiss. Use
  `danielsmith.io:tutorial:v1:dismissedSession` only if a future requirement
  needs cross-tab/sessionStorage behavior.

Rules:

- `showOnStartup` defaults to `true` when missing or corrupt.
- Progress persists separately from `showOnStartup`.
- Dismiss closes Tutorial for the current page load only and does not change
  `showOnStartup` or progress.
- Unchecking Show on startup persists `false` and prevents automatic opening on
  future immersive loads.
- Pressing `R` or clicking Tutorial always opens it regardless of
  `showOnStartup`.
- Corrupt localStorage values safely reset to defaults and should not throw
  during scene startup.
- Future migrations happen by bumping `v1` to `v2` and reading the older payload
  in a migration function.
- Do not store localized strings in localStorage.

Suggested `progress` payload:

```ts
interface TutorialProgressV1 {
  version: 1;
  currentPageId?: TutorialPageId;
  unlockedPageIds: TutorialPageId[];
  completedPageIds: TutorialPageId[];
  movementDurations: {
    forward: number;
    left: number;
    backward: number;
    right: number;
  };
  zoom: {
    inComplete: boolean;
    outComplete: boolean;
  };
  visitedPoiIds: PoiId[];
  findGitshelvesComplete: boolean;
  updatedAt: string;
}
```

`visitedPoiIds` should mirror the shared visited set only when useful for
rehydrating Tutorial progress. If `PoiVisitedState` is the persisted source of
truth, Tutorial can derive the POI count and Gitshelves flag from that service at
startup and persist only Tutorial-specific completion/unlock metadata.

## State machine

Stable page ids:

```ts
type TutorialPageId =
  | 'welcomeMovement'
  | 'zoom'
  | 'visitPois'
  | 'findGitshelves';
```

Unlock rules:

1. `welcomeMovement` is always unlocked.
2. `zoom` unlocks when all four movement direction durations reach `0.25`
   seconds.
3. `visitPois` unlocks when zoom-in and zoom-out are complete.
4. `findGitshelves` unlocks when at least three unique POIs are visited.
5. The final page completes when Gitshelves is visited.

State rules:

- Users can navigate to any unlocked page.
- Locked pages appear disabled in the sidebar and cannot be selected via click,
  keyboard activation, or programmatic `selectPage` calls.
- Completion and unlocks are monotonic unless a future explicit reset feature is
  designed. No reset UI is part of this MVP.
- Persist unlocked ids, completed action flags, movement durations, zoom flags,
  visited POI ids or derived visit count strategy, Gitshelves completion, and
  optionally current page id.
- Reducer/state-machine functions should be pure and unit tested separately from
  DOM rendering.

Proposed modules:

- `src/ui/tutorial/tutorialTypes.ts` for ids, persistence types, and event types.
- `src/ui/tutorial/tutorialStateMachine.ts` for pure reducer/unlock logic.
- `src/ui/tutorial/tutorialStorage.ts` for localStorage parsing, validation,
  defaults, and migrations.
- `src/ui/tutorial/tutorialPanel.ts` for DOM rendering and events.
- `src/ui/tutorial/tutorialProgressTracker.ts` for wiring movement, zoom, and POI
  events into state-machine actions.
- `src/ui/tutorial/tutorialI18n.ts` only if catalog mapping needs a small adapter;
  otherwise use the existing i18n access pattern directly.

## Integration contracts

### Keybinding

- Add `toggleTutorial` to `KeyBindingAction` and `DEFAULT_KEY_BINDINGS` with
  default binding `['r']`.
- Include the action in persisted keybinding snapshots and Settings controls help
  if the shared controls data source represents HUD actions there.
- Implement a Tutorial keydown handler using `matchesKeyBinding(event,
'toggleTutorial')`, conflict detection, non-repeat behavior, and text-entry
  gating, matching the Controls handler style.

### Movement

Expose a per-frame tracker call after keyboard and joystick input are combined:

```ts
interface TutorialMovementSample {
  right: number; // camera-relative east/right, analog range after dead zone
  forward: number; // camera-relative north/away from camera
  deltaSeconds: number;
}
```

The tracker maps positive/negative components to `right`, `left`, `forward`, and
`backward` durations. It should receive samples even when Tutorial is closed so
progress continues across normal play, but it must never block movement.

### Zoom

Expose zoom state after every target update and/or animation tick:

```ts
interface TutorialZoomSample {
  targetZoom: number;
  actualZoom: number;
  minZoom: number;
  maxZoom: number;
  source: 'keyboard' | 'wheel' | 'pinch' | 'test' | 'sync';
}
```

The tracker completes in/out flags from thresholds derived from `minZoom` and
`maxZoom`. Runtime bounds remain owned by the camera system.

### POI visited

- Subscribe to `PoiVisitedState.subscribe` for a `ReadonlySet<PoiId>` snapshot.
- Use the shared set to derive the unique visited count and Gitshelves completion.
- If future work changes POI visit persistence, keep a general POI visited
  primitive independent from Tutorial, Guided Tour, or Narration concepts.

### Text mode

- The Tutorial text-only button calls the existing Text action handler used by the
  HUD Text button.
- Do not duplicate text fallback bootstrapping, URL handling, or styling.

### Localization

Add Tutorial strings to the typed i18n catalog before rendering runtime UI:

- HUD menu label, title, aria-label, expanded/collapsed announcement, and key
  badge context.
- Panel heading/description.
- Sidebar labels and locked/unlocked/active status text.
- Page headings, purpose copy, instructions, hints, and text-only escape copy.
- Progress chip labels and complete/incomplete screen-reader labels.
- Previous, Next, Show on startup, Dismiss, collapse/expand labels, and live
  announcements.

Requirements:

- Every supported locale file must include the same Tutorial key structure.
- The pseudo-locale must wrap Tutorial text so visual localization checks catch
  leaks.
- Runtime Tutorial components must not hardcode English user-visible strings.
- Extend hardcoded-string guard targets if Tutorial code lands outside existing
  scanned directories.

## Accessibility requirements

### Tutorial button

- Localized `aria-label` and `title`.
- `aria-controls` pointing at the Tutorial panel id.
- `aria-expanded` reflecting open state.
- `aria-pressed` if consistent with the existing HUD buttons.

### Panel

- Use non-modal dialog or landmark semantics consistent with Controls, not the
  modal Settings dialog.
- Set `aria-modal="false"` if using `role="dialog"`.
- Provide `aria-labelledby` and `aria-describedby`.
- Opening Tutorial should not steal gameplay focus unexpectedly. Pointer-open may
  release button focus using the existing Controls focus-release pattern.
- Escape closes the panel.

### Sidebar

- Locked items expose `disabled` and/or `aria-disabled="true"`.
- Active item exposes `aria-current="step"`.
- Collapse/expand button exposes localized labels and `aria-expanded`.
- Collapsible state changes are announced.

### Progress chips

- Use checkmark/status icon plus color.
- Expose localized screen-reader labels for complete and incomplete states.
- Use an `aria-live="polite"` region for task completion announcements.
- Do not rely on color alone.

### Buttons and form controls

- All labels are localized.
- Disabled Previous/Next states are native disabled buttons or equivalent
  accessible disabled states.
- The Show on startup checkbox has a localized label and persists on change.

## Responsive layout requirements

- The HUD menu is always a 2x2 grid.
- Tutorial must be able to coexist with POI detail panels.
- Desktop layout should leave the scene visible and avoid avoidable overlap with
  POI details. Prefer aligning Tutorial near the top-right HUD menu and allowing
  POI detail to keep its established detail region.
- Mobile layout should use internal panel scrolling, preserve visible scene
  gutters, and respect safe-area insets on all sides.
- When Tutorial and a POI panel are both visible on mobile, split available space
  roughly half and half, matching the combined Controls + POI layout behavior.
  Neither panel should exceed about half the viewport height without internal
  scrolling.
- The sidebar should collapse by default or become a horizontal/top step list on
  narrow screens. The active page and completion status must remain visible when
  collapsed.

## Test strategy

### Unit tests

Proposed files:

- `src/systems/controls/keyBindings.test.ts`: `toggleTutorial` action exists,
  default `R` formatting, conflict behavior if relevant.
- `src/ui/tutorial/tutorialStateMachine.test.ts`: unlock rules, monotonic
  completion, locked page selection rejection, current page persistence.
- `src/ui/tutorial/tutorialStorage.test.ts`: defaults, corrupt localStorage
  fallback, `showOnStartup` persistence, version handling, no localized strings.
- `src/ui/tutorial/tutorialProgressTracker.test.ts`: movement direction
  accumulation, dead zone handling, zoom threshold completion, POI count
  completion, Gitshelves id completion.
- Existing i18n tests/guards: Tutorial keys exist for every locale and
  pseudo-locale wrapping covers Tutorial strings.
- Existing hardcoded-string guard: covers Tutorial runtime files.

### Integration/component tests

Proposed files:

- `src/ui/tutorial/tutorialPanel.test.ts`: renders sidebar/body/navigation/options,
  locked/unlocked sidebar behavior, Previous/Next states, collapse behavior,
  progress chip accessible labels, Show on startup checkbox, Dismiss button, and
  text-only button callback.
- `src/ui/hud/hudPanelCoordinator.test.ts`: one top-level panel at a time,
  Tutorial coexists with POI policy, Settings closes Tutorial, Escape closes the
  active HUD panel.
- Existing Controls/Settings parity tests should assert the shared controls list
  remains identical after the menu gains Tutorial.

### Playwright tests

Proposed file: `playwright/tutorial-panel.spec.ts`.

Scenarios:

- Tutorial opens on startup by default in immersive mode.
- Dismiss closes Tutorial for the current load.
- Unchecking Show on startup prevents auto-open on the next immersive load.
- Pressing `R` toggles Tutorial regardless of startup preference.
- Movement in all four camera-relative directions unlocks the Zoom page.
- Zooming to min and max thresholds unlocks Visit POIs.
- Visiting three unique POIs unlocks Find Gitshelves.
- Visiting Gitshelves completes the final page.
- Mobile viewport shows the 2x2 HUD grid, Tutorial panel scrolls internally, and
  Tutorial + POI split available space.
- Controls/Settings controls-list parity remains intact.
- Release checks still run the z-fighting audit coverage through existing scripts
  and tests.

## Migration and deletion plan

- Tutorial implementation must not import, reference, or recreate removed Guided
  Tour or Narration modules, settings, string namespaces, route nudges, narrative
  log state, or tour reset behavior.
- Removed feature names should not return in runtime code, storage keys, i18n
  namespaces, tests, or docs except when describing historical non-goals in
  architecture documentation.
- If future implementation discovers that any needed visited-state behavior was
  previously removed with the guided/narration systems, reintroduce it only as a
  general POI visited primitive under `src/scene/poi`, not as Tutorial-owned tour
  state.
- Keep `PoiVisitedState` independent and reusable by POI markers, tooltips,
  Tutorial, analytics, and tests.

## Acceptance checklist for implementation

- Tutorial panel is implemented as a non-modal top-level HUD panel.
- The HUD menu is a universal 2x2 grid with Controls, Tutorial, Text, Settings.
- Tutorial text is fully localized in all supported locales and pseudo-localized.
- No hardcoded English user-visible Tutorial strings exist in runtime code.
- Tutorial progress and Show on startup preference use versioned storage keys and
  tolerate corrupt values.
- Movement, zoom, POI visits, and Gitshelves completion unlock pages exactly as
  specified.
- Tutorial remains gameplay-permissive and coexists with POI panels.
- Settings still behaves conservatively and closes Tutorial.
- Tests cover state, storage, localization, accessibility-relevant DOM states,
  Playwright flows, and existing z-fighting audit coverage.
