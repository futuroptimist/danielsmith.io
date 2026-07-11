# Tutorial panel architecture

The Tutorial panel is an explicit onboarding HUD panel for the immersive portfolio. It
replaces the removed implicit guided/narration concepts with a user-controlled,
localized, non-modal panel that can stay open while the visitor completes gameplay
actions.

This document describes the implemented Tutorial shell and state plumbing plus the
remaining gameplay-tracking contracts. Runtime state is present now; gameplay action
tracking is intentionally deferred until the movement, zoom, POI, and Gitshelves
adapters are wired.

## Current architecture summary

The implementation should extend the current scene stack rather than introduce a parallel
onboarding runtime:

- `src/immersiveScene.ts` owns immersive startup, HUD wiring, key handling, movement,
  zoom, POI selection, and `window.portfolio` debug/test APIs.
- `src/ui/hud/hudPanelCoordinator.ts` currently coordinates top-level HUD panels with
  `controls` and `settings`, updates `aria-expanded` / `aria-pressed`, closes Settings
  when Controls opens, closes Controls when Settings opens, routes Text mode through
  `onTextMode`, and closes the active panel on `Escape`.
- `src/ui/hud/responsiveControlOverlay.ts` owns the non-modal Controls popover. It sets
  `role="dialog"`, `aria-modal="false"`, button metadata, open state, and responsive
  Controls layout. Its open-state callback is already used to resync POI detail layout.
- `src/ui/hud/helpModal.ts` owns Settings as a conservative modal dialog with a backdrop,
  focusable modal root, close button, and settings content container.
- `src/systems/controls/keyBindings.ts` is the central keybinding registry. Existing
  actions include movement, interact, Settings/help, and Controls (`C`). Runtime code in
  `src/immersiveScene.ts` loads/saves keybinding overrides under
  `danielsmith.io:keyBindings` and exposes them through `window.portfolio.input`.
- The existing `T` shortcut is supplied by `src/systems/failover/manualModeToggle.ts` and
  the shared `activateTextMode` path in `src/immersiveScene.ts`, not the central
  `KeyBindings` registry. Tutorial must preserve and reuse that path rather than creating
  a second Text-mode implementation or a duplicate mode-preference writer.
- Movement is sampled each frame in `src/immersiveScene.ts` from `KeyBindings`,
  `KeyboardControls`, and `VirtualJoystick`. The combined right/forward vector is passed
  to `getCameraRelativeMovementVector(...)`, so any Tutorial movement tracking must use
  canonical camera-relative directions instead of world axes.
- Zoom is implemented with keyboard shortcuts, mouse wheel, and touch pinch in
  `src/immersiveScene.ts`, using helpers from `src/systems/camera/zoomControls.ts`.
  Runtime bounds are `MIN_CAMERA_ZOOM = 0.65` and `MAX_CAMERA_ZOOM = 12` today, but future
  Tutorial code must import or receive the active runtime bounds rather than duplicate
  those numbers.
- POI visited state is already a shared primitive in `src/scene/poi/visitedState.ts`.
  `PoiVisitedState` persists unique POI ids under `danielsmith.io::poi::visited::v1`,
  exposes `snapshot()`, `markVisited(id)`, `reset(...)`, and `subscribe(listener)`, and is
  updated when `PoiInteractionManager` emits selection/interactions. The visited set feeds
  marker state, DOM tooltip badges, and floating in-world visited badges.
- Localization guardrails include typed i18n strings in `src/assets/i18n/types.ts`, locale
  files in `src/assets/i18n/locales/`, pseudo-locale coverage, `npm run i18n:guard`, and
  `npm run docs:check`. Future Tutorial runtime text must be covered by those same paths.
- Z-fighting coverage is in `src/tests/zFightingAudit.test.ts` with helpers in
  `src/tests/helpers/zFightingAudit.ts`; future Tutorial work must not modify those tests
  except to strengthen them intentionally.

## Goals

- Make Tutorial explicit and user-controlled: open from the HUD menu, hotkey, or startup
  preference only.
- Localize all Tutorial user-visible strings in every supported locale, including the
  pseudo-locale.
- Keep Tutorial gameplay-permissive so movement, zoom, POI interaction, POI cycling, and
  Text mode remain usable while the panel is open.
- Persist Tutorial progress across refreshes.
- Support desktop, touch, and mobile browsers with safe-area-aware layout.
- Make Tutorial testable through unit, component/integration, and Playwright checks rather
  than screenshots alone.
- Reuse existing HUD, keybinding, movement, zoom, POI, Text mode, and i18n primitives.

## Non-goals

- Do not reintroduce implicit Guided Tour recommendations, automatic recommendations, tour
  reset, narrative logs, narration popups, procedural story text, or any removed feature
  names.
- Do not block the scene behind a modal Tutorial.
- Do not replace Controls or Settings.
- Do not reintroduce Loadouts.
- Do not weaken localization hardcoded-string checks, docs checks, or pseudo-locale
  coverage.
- Do not weaken z-fighting audit coverage.
- Do not bump Helm chart versions as part of Tutorial work.
- Do not touch `docs/assets/game-launch.png`.

## Proposed modules and ownership

Future implementation should keep the Tutorial system small and composable:

| Area                 | Proposed file(s)                                                      | Responsibility                                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HUD coordination     | `src/ui/hud/hudPanelCoordinator.ts`                                   | Add `tutorial` as a top-level non-modal HUD panel, enforce one top-level panel at a time for Controls/Tutorial/Settings, and keep Tutorial compatible with POI panels. |
| Tutorial UI          | `src/ui/hud/tutorialPanel.ts`                                         | Render the panel shell, sidebar, body, navigation, options, localized labels, and DOM events.                                                                          |
| Tutorial state       | `src/systems/tutorial/tutorialState.ts`                               | Pure state machine, progress schema, unlock rules, monotonic completion, current page handling, corrupt-data fallback.                                                 |
| Tutorial persistence | `src/systems/tutorial/tutorialStorage.ts`                             | Versioned localStorage load/save for progress and show-on-startup preference.                                                                                          |
| Tutorial controller  | `src/systems/tutorial/tutorialController.ts`                          | Owns current Tutorial state, show-on-startup preference, panel callbacks, change-only persistence, and future gameplay-tracking stubs.                                 |
| Tutorial tracking    | `src/ui/hud/tutorialTracking.ts`                                      | Adapters for movement, zoom, and POI visited events; no DOM rendering.                                                                                                 |
| HUD menu data        | `src/ui/hud/hudMenu.ts` or existing `controlOverlay` helpers          | Shared metadata for Controls, Tutorial, Text, Settings labels/key badges.                                                                                              |
| i18n types           | `src/assets/i18n/types.ts`                                            | Add `TutorialPanelStrings` and `ControlOverlayStrings.menu.tutorial`.                                                                                                  |
| locale strings       | `src/assets/i18n/locales/*.ts`                                        | Add Tutorial copy for all supported locales and pseudo-locale wrappers.                                                                                                |
| tests                | `src/tests/tutorial*.test.ts` and `playwright/tutorial-panel.spec.ts` | Unit/component/e2e coverage described below.                                                                                                                           |

`src/immersiveScene.ts` should only compose these modules, pass existing handles, and expose
minimal debug/test hooks when needed.

## Implemented state and persistence

Tutorial progress is stored separately from the startup preference so visitors can
dismiss or disable startup behavior without erasing progress. The current storage keys
are exactly:

- `danielsmith.io:tutorial:v1:progress` for the serialized version 1 Tutorial state.
- `danielsmith.io:tutorial:v1:showOnStartup` for the boolean startup preference.

`src/systems/tutorial/tutorialStorage.ts` reads both keys defensively. Missing keys,
corrupt JSON, unsupported versions, malformed values, unavailable storage, or storage
exceptions fall back to a default state and a `true` show-on-startup preference without
crashing immersive startup. The state sanitizer drops unknown page ids, removes duplicate
page ids, always unlocks `welcomeMovement`, and falls back to the first unlocked page
when the stored current page is invalid or locked.

The controller persists progress only after meaningful changes and persists the
show-on-startup preference only when that preference changes. Movement durations stay in
memory during high-frequency frames and are written at bounded `0.05s` duration buckets,
or immediately when completion/unlock state changes. Dismiss closes the current panel
instance for the active page load only; it does not alter either storage key.

Gameplay action tracking is implemented through pure reducers for movement, zoom, POI,
and Gitshelves progress. Controller updates rerender the panel only when visible
completion, counter, unlock, or current-page state changes; ordinary gameplay progress
does not also rewrite the show-on-startup control.

## Universal HUD menu architecture

The top-right HUD menu should become a universal 2x2 pill grid on every device size:

1. Controls — key badge `C`
2. Tutorial — key badge `R`
3. Text — key badge `T`
4. Settings — key badge `H` or the active primary Settings/help binding

Requirements:

- Visual order and tab order must match the list above, left-to-right then top-to-bottom in
  LTR locales. RTL locales may mirror visual placement using CSS direction, but DOM order
  should remain logical for keyboard users unless existing locale patterns require
  otherwise.
- Each pill includes a localized label and a `<kbd>` key badge. Key badges use active
  keybinding labels where actions are configurable and localized fallback labels where they
  are not.
- At narrow widths, the grid remains 2x2 instead of collapsing into a crowded row. Labels
  may use tighter spacing or smaller type, but must remain readable and localized.
- The grid container preserves `env(safe-area-inset-top)` and
  `env(safe-area-inset-right)` offsets and must not overlap notches or browser chrome.
- The grid should look intentional on desktop (compact grouped menu) while solving mobile
  crowdedness.
- Controls and Settings controls-help lists must continue to come from the same shared data
  source and remain 100% identical in labels, descriptions, and key binding display.
- Controls, Tutorial, and Settings are top-level HUD panels. Opening one should close the
  other top-level HUD panel(s), except that POI detail panels are not top-level and may
  coexist with Controls or Tutorial. Text mode remains an action, not a panel.
- Settings may keep the existing modal/backdrop behavior. Controls and Tutorial are
  non-modal.

## Tutorial panel layout

The Tutorial panel has four zones:

### 1. Collapsible sidebar

- Lists the four stable page ids in order: `welcomeMovement`, `zoom`, `visitPois`,
  `findGitshelves`.
- The first step is always unlocked.
- Unlocked steps are enabled buttons/links and clickable.
- Locked steps are disabled, gray/muted, not clickable, and expose `aria-disabled="true"`.
- The active step is visually highlighted and exposes `aria-current="step"`.
- The sidebar can collapse to preserve space. The collapse control has localized label,
  `aria-expanded`, and an announcement through the HUD live region when practical.
- On narrow layouts, the sidebar may default collapsed or transform into a compact top or
  inline step list if this avoids overlap with POI details.

### 2. Body

- Contains localized heading, purpose text, instructions, and progress UI for the active
  page.
- Uses progress chips/checkmarks for active tasks.
- Never hardcodes English strings in runtime components.
- Includes a Text-only escape on the first page using the same Text action behavior and
  button styling as the existing Text menu path.

### 3. Navigation

- Previous button and Next button use localized labels.
- Previous is disabled on the first page.
- Next is disabled until the next page is unlocked.
- Navigation selects pages only; it does not mutate completion flags except for storing the
  current page id if useful.

### 4. Options

- Show on startup checkbox, checked by default, persisted separately from progress.
- Dismiss button closes the Tutorial for the current session/load only.
- Styling should reuse Settings/HUD button and form-control styles where practical.

## Gameplay policy

Tutorial must be non-modal and gameplay-permissive:

- While Tutorial is open, do not block movement, keyboard zoom, wheel zoom, pinch zoom, POI
  hover/selection, clicking/tapping/interacting with POIs, `Q` / `E` POI cycling, or the Text
  mode action.
- Tutorial open must not hide selected POI panels, clear selected POI state, or clear hovered
  POI state.
- Tutorial must coexist with POI panels. It may close Controls when opened so only one
  top-level non-modal HUD panel is open, but it must not close POI details.
- Opening Settings should close Tutorial because Settings remains conservative/modal.
- `Escape` closes the active top-level HUD panel. If only a POI detail panel is active, keep
  existing POI escape behavior.
- When Tutorial and a POI detail are visible together, `Escape` closes Tutorial first without
  clearing the selected/hovered POI or its detail panel. A later `Escape` may dismiss the POI
  according to existing behavior. `src/immersiveScene.ts` currently installs
  `handlePoiDetailEscape` as a capture listener and calls `stopImmediatePropagation()`, so
  implementation must adjust or centralize keyboard routing so that listener cannot swallow
  the Tutorial close.
- Clicking/tapping the scene behind panels should follow existing Controls/POI transient
  dismissal rules.
- Text-entry targets (`input`, `textarea`, `select`, contenteditable) still block gameplay
  shortcuts and Tutorial hotkey handling.
- `canHandleGameplayShortcut(...)` should treat `tutorial` like `controls`, not like
  `settings`.
- `src/scene/poi/interactionManager.ts` currently permits HUD-focused keyboard POI handling
  only when `document.activeElement.id === 'control-overlay'`. Tutorial implementation must
  generalize this into a shared HUD-focus predicate or equivalent event-routing contract so
  focus on Tutorial sidebar, navigation, option, and other non-text controls still permits
  `Q` / `E` cycling and keyboard POI interaction. Text-entry targets must remain blocked.

## Tutorial pages and completion rules

### Page 1: `welcomeMovement`

Purpose text:

- Welcome the visitor to the portfolio site.
- Explain that the site showcases projects as interactive exhibits.

Instruction:

- Move in all four canonical cardinal directions represented by WASD.
- Completion is based on resulting movement direction, not physical key identity.
- Keyboard WASD, arrow keys, touch joystick, future gamepad input, and any input source that
  produces the relevant canonical direction can count.
- Direction mapping follows camera-relative canonical north: forward/north is away from the
  camera, backward/south is toward the camera, left/west and right/east map to camera-relative
  strafe directions.

Completion:

- `forward` duration >= 0.25 seconds.
- `left` duration >= 0.25 seconds.
- `backward` duration >= 0.25 seconds.
- `right` duration >= 0.25 seconds.
- Accumulate durations with frame `delta` only while the canonical input/movement component
  exceeds a small deadzone.
- Completion is monotonic once each direction reaches the threshold.

Visual indicators:

- Incomplete chips use dark yellow.
- Complete chips use bright yellow.
- Every chip also includes a checkmark or localized/computed screen-reader status so the UI
  does not rely on color alone.

Text-only escape:

- Body copy explains the user can choose text-only mode.
- The Text-only button reuses the existing Text action handler (`activateTextMode`) and HUD
  button styling; do not duplicate fallback routing.

### Page 2: `zoom`

Instruction:

- Zoom all the way in and all the way out.
- Supported inputs: mouse scroll wheel, multitouch pinch, and keyboard `Shift` + `=` /
  `Shift` + `-`.

Completion:

- Zoom-in complete when the active camera zoom target reaches the max threshold.
- Zoom-out complete when the active camera zoom target reaches the min threshold.
- Use actual runtime `minZoom` / `maxZoom` values and current `cameraZoomTarget` (or the
  active zoom target exposed by the zoom controller). Do not duplicate constants in Tutorial
  state.
- Use a tolerance such as 99% of range reached, or an epsilon derived from
  `(maxZoom - minZoom) * 0.01`.
- In and out can be completed in any order.

Visual indicators:

- `In` and `Out` chips, localized, with checkmarks/status labels.

### Page 3: `visitPois`

Instruction:

- Explain that POIs are project exhibits containing summaries, outcomes, metrics, links, and
  context.

Completion:

- Use existing `PoiVisitedState` semantics.
- Clicking/tapping/interacting with a POI marks it visited through the shared POI primitive.
- Count unique visited POI ids only.
- Counter increments from `0/3` to `3/3` before the page is completed.
- At `3/3`, the counter turns bright yellow and receives a checkmark/status indicator;
  after completion, the rendered counter remains `3/3` even if the shared POI snapshot
  is later reset or partially restored.
- Do not create duplicate Tutorial-only shadow visited state if the shared visited set is
  available. Persist Tutorial page flags separately but derive the count from the shared set
  where possible.

### Page 4: `findGitshelves`

Instruction:

- Ask the visitor to find and interact with Gitshelves.
- Hint: check upstairs.

Completion:

- Completion is based on stable POI id, not localized title text.
- The stable id is `gitshelves-living-room-installation`. The base POI registry entry lives
  with the living-room POIs, while `src/scene/poi/placements.ts` currently provides an
  effective upper-floor `focusPods` placement override. Implementation must verify both the
  stable registry id and the effective placement before shipping.
- Completion is location-agnostic and depends on the shared visited/interacted state.
- If Gitshelves is no longer upstairs in current effective placement data, the
  implementation must either update the hint or intentionally update placement with tests.

## Persistence model

Use versioned localStorage keys:

- `danielsmith.io:tutorial:v1:progress`
- `danielsmith.io:tutorial:v1:showOnStartup`
- Avoid persistent dismissed state. If needed, use in-memory state per page load for
  session/load-only dismiss. Only add `danielsmith.io:tutorial:v1:dismissedSession` if a
  future product requirement explicitly needs storage.

`showOnStartup` rules:

- Defaults to `true` when missing or corrupt.
- Stored separately from progress.
- Unchecking it persists `false` and prevents automatic Tutorial opening on future immersive
  loads.
- Pressing `R` or clicking Tutorial always opens Tutorial regardless of `showOnStartup`.
- Dismiss closes Tutorial for the current session/load only and must not set
  `showOnStartup=false`.

Progress rules:

- Corrupt or incompatible JSON safely resets to defaults.
- Do not store localized strings.
- Future migrations bump `v1` to `v2` and may read/migrate old data before writing the new
  key.

Suggested `v1` progress shape:

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
  movementCompleted: {
    forward: boolean;
    left: boolean;
    backward: boolean;
    right: boolean;
  };
  zoomCompleted: {
    in: boolean;
    out: boolean;
  };
  visitedPoiIds?: string[];
  visitedPoiCountCompleted: boolean;
  gitshelvesCompleted: boolean;
  updatedAt?: string;
}
```

If `PoiVisitedState` remains persisted and subscribable, `visitedPoiIds` may be omitted from
Tutorial storage and derived at runtime. If omitted, Tutorial should still persist
`visitedPoiCountCompleted` and `gitshelvesCompleted` as monotonic flags.

## State machine

Stable ids:

```ts
type TutorialPageId =
  | 'welcomeMovement'
  | 'zoom'
  | 'visitPois'
  | 'findGitshelves';
```

Unlock rules:

1. `welcomeMovement` is always unlocked.
2. `zoom` unlocks when all four movement directions are complete.
3. `visitPois` unlocks when zoom-in and zoom-out are complete.
4. `findGitshelves` unlocks when at least three unique POIs are visited.
5. Tutorial MVP is complete when Gitshelves has been visited/interacted with.

Completion is derived in page order. Early zoom, POI, or Gitshelves actions are retained
in the progress object, but a later page is not marked complete until its page has been
unlocked by the earlier prerequisites; once the prerequisite unlocks, completion cascades
immediately.

Behavior:

- User can navigate to any unlocked page.
- Locked pages appear disabled and cannot be selected from sidebar or Next.
- Completion flags are monotonic unless a future explicit reset feature is added.
- State reducers should be pure and unit tested without DOM/Three.js.
- Persist after meaningful changes, debounced if necessary but not so delayed that refreshes
  lose completed actions.

## Event and integration contracts

### Keybinding

- Add `toggleTutorial` to `KeyBindingAction` and `DEFAULT_KEY_BINDINGS` with default `['r']`.
- Include it in `bindingActions`, persistence snapshots, Settings/Controls help lists, and
  menu metadata.
- Audit conflicts before implementation. If a user customizes another action to `R`, the
  existing conflict guard should prevent ambiguous Tutorial toggles.
- Add `handleTutorialKeydown` or generalize the current controls keydown handler. It must
  ignore repeats, modifiers, default-prevented events, text-entry targets, and conflicting
  bindings.

### Movement

- Expose a tracking hook from the avatar update loop after combined keyboard/joystick input
  and camera-relative movement are known.
- Recommended event payload:

```ts
interface TutorialMovementSample {
  deltaSeconds: number;
  canonicalInput: { forward: number; right: number };
  cameraRelativeVector: { x: number; z: number };
  inputSource: 'keyboard' | 'touch' | 'gamepad' | 'mixed';
}
```

- Track canonical direction duration from `canonicalInput` or a normalized equivalent, not
  physical keys and not world/floor-plan axes.
- Count virtual joystick movement.

### Zoom

- Expose current zoom target and bounds through a small runtime contract instead of reading
  file-local constants:

```ts
interface TutorialZoomSample {
  zoomTarget: number;
  minZoom: number;
  maxZoom: number;
  source: 'keyboard' | 'wheel' | 'pinch' | 'test';
}
```

- Emit/sample after `setCameraZoomTarget(...)` changes or from the animation loop.
- Completion uses threshold/tolerance derived from the provided bounds.

### POI visited

- Subscribe to the existing `PoiVisitedState` instance.
- If a future refactor changes visited state, keep a shared POI primitive with:

```ts
interface PoiVisitedSource {
  snapshot(): ReadonlySet<PoiId>;
  subscribe(listener: (visited: ReadonlySet<PoiId>) => void): () => void;
}
```

- Do not tie this primitive to removed Guided Tour/Narration concepts.
- Consider exposing a debug/test POI visited API under `window.portfolio.poi` only if
  Playwright needs stable setup/assertions.

### Text mode

- The Tutorial Text-only button calls the existing Text action handler used by the HUD Text
  pill. Today the `T` shortcut comes from `src/systems/failover/manualModeToggle.ts` and the
  shared `activateTextMode` path, not `KeyBindings`; keep using that behavior while Tutorial
  is open.
- Do not duplicate mode-preference writes, performance-failover routing, or URL handling.

### Localization

- Add Tutorial strings to i18n types and all locale files: `en`, `en-x-pseudo`, `ar`, `ja`,
  `zh-Hans`, `es`, `pt`, `de`, and `hu`.
- Add `ControlOverlayStrings.menu.tutorial` for menu label/title/key hint.
- Pseudo-locale must visibly wrap all user-visible Tutorial text.
- Runtime components must not contain hardcoded English strings.
- Extend `scripts/check-hardcoded-ui-strings.cjs` targets if new Tutorial files are not
  already covered by `src/ui/hud`.

## Accessibility requirements

Tutorial button:

- Localized `aria-label` and `title`.
- `aria-controls` referencing the Tutorial panel id.
- `aria-expanded` reflecting open state.
- `aria-pressed` if consistent with other HUD menu buttons.

Panel:

- Non-modal semantics consistent with Controls, e.g. `role="dialog"` and
  `aria-modal="false"`, or a landmark if the final HUD pattern standardizes on one.
- `aria-labelledby` and `aria-describedby`.
- Opening should not steal gameplay focus unexpectedly. If the user opens via keyboard,
  focus may move to a predictable panel heading/first control only if this does not block
  gameplay shortcuts; otherwise retain existing HUD focus-announcer behavior.
- `Escape` closes the active top-level panel.

Sidebar:

- Locked steps expose `aria-disabled="true"`.
- Active step exposes `aria-current="step"`.
- Collapsed/expanded state is announced with localized labels and `aria-expanded`.

Progress chips:

- Use checkmark/status text plus color.
- Expose completed/incomplete screen-reader labels.
- Use an `aria-live="polite"` region for task completion announcements.

Buttons/forms:

- All labels are localized.
- Disabled states use native `disabled` where possible.
- Do not rely on color alone.

## Responsive layout requirements

- The 2x2 HUD menu grid is used on all device sizes.
- Tutorial can coexist with POI panels.
- Desktop: keep scene visible, minimize overlap with POI details, and align with the
  existing right-side HUD rhythm.
- Mobile: use internal scrolling inside Tutorial, leave visible scene gutters, and include
  safe-area padding.
- If Tutorial and a POI panel are visible on mobile, split available vertical space roughly
  half and half like the existing combined Controls + POI layout; neither panel should cover
  the full viewport unless the other is closed.
- Preserve the existing Controls + POI responsive contract: `syncCombinedPoiPanelState()` in
  `src/immersiveScene.ts` currently writes `data-hud-controls-open` and
  `data-poi-detail-visible`, and dependent selectors in `src/ui/styles.css` use those
  attributes for the mobile split layout. Prefer adding an explicit Tutorial-open state and
  shared selectors for Tutorial + POI. Do not silently replace `data-hud-controls-open`
  unless the writer, every dependent selector, and regression coverage change atomically.
- Sidebar should default collapsed or become a compact top/inline step list on narrow
  screens when necessary.
- Avoid `position: fixed` assumptions that ignore `env(safe-area-inset-*)`.

## Test strategy

Unit tests:

- `src/tests/keyBindings.test.ts`: `toggleTutorial` action exists and default `R` binding is
  normalized.
- `src/tests/hudPanelCoordinator.test.ts`: Tutorial toggles, top-level exclusivity,
  Settings closes Tutorial, Tutorial-first `Escape` behavior with a visible POI, and Text
  mode remains an action.
- `src/tests/tutorialState.test.ts`: unlock rules, monotonic completion, current-page
  selection, locked-page rejection.
- `src/tests/tutorialPersistence.test.ts`: corrupt localStorage fallback, show-on-startup
  default/persistence, separate progress/preference keys, no localized strings stored.
- `src/tests/tutorialTracking.test.ts`: movement direction accumulation, deadzone handling,
  zoom threshold completion, POI visited count completion, Gitshelves id completion.
- `src/tests/i18n.test.ts`: Tutorial keys exist for every locale and pseudo-locale wraps
  Tutorial text.
- `scripts/check-hardcoded-ui-strings.cjs` / `npm run i18n:guard`: new Tutorial runtime files
  are covered.

Integration/component tests:

- `src/tests/tutorialPanel.test.ts`: panel renders sidebar, body, navigation, options;
  locked/unlocked behavior; Previous/Next disabled states; checkbox and Dismiss behavior;
  Text-only button invokes the shared Text action.
- `src/tests/poiInteractionManager.test.ts`: Tutorial descendant focus permits POI
  cycling/interaction while text-entry focus remains blocked.
- `src/tests/responsiveControlOverlay.test.ts` or a new HUD menu test: 2x2 menu metadata,
  tab order, key badges, and Controls/Settings parity.

Playwright tests:

- `playwright/tutorial-panel.spec.ts`: Tutorial opens on startup by default, Dismiss closes
  it, `showOnStartup=false` prevents next startup auto-open, `R` toggles it, movement unlocks
  page 2, zoom unlocks page 3, visiting 3 POIs unlocks page 4, visiting Gitshelves completes
  page 4, mobile 2x2 grid fits and panel scrolls, Tutorial coexists with POI details,
  Tutorial-first `Escape` behavior with a visible POI, `Q` / `E` while Tutorial controls own
  focus, the existing `T` action while Tutorial is open, Tutorial + POI mobile splitting,
  and Text-only action works.
- Existing `playwright/immersive-mode.spec.ts` should preserve Controls + POI coverage,
  including the current Controls + POI cycling and responsive split contracts.
- Release checks must continue to include z-fighting audit coverage through `npm run test:ci`.

## Migration and deletion plan

- Tutorial must be implemented as a new explicit HUD panel and must not reuse or revive
  removed Guided Tour or Narration modules, names, settings, localStorage keys, reset actions,
  narrative logs, or recommendation flows.
- If any old feature names appear in code search during implementation, treat them as stale
  references to remove or rename before shipping.
- POI visited state is already a general shared primitive; Tutorial should consume it as POI
  progress, not as a tour system. If future implementation finds visited state was removed or
  regressed, reintroduce only a neutral `PoiVisitedState` primitive under `src/scene/poi/` and
  keep it independent from onboarding copy.

## Documentation acceptance checklist

Future implementation is ready when:

- The Tutorial runtime can be built without guessing where state lives, how it persists, how
  pages unlock, how mobile layout behaves, how localization works, or how tests prove it.
- No runtime Tutorial implementation lands before this design-only document is reviewed.
- Localization and z-fighting guardrails remain at least as strict as they are today.
- `docs/assets/game-launch.png` remains untouched.

## Implemented action tracking contracts

Tutorial progress is driven by the pure helpers in
`src/systems/tutorial/tutorialState.ts` and persisted by
`src/systems/tutorial/tutorialController.ts` only when serialized state changes.
The runtime feeds those helpers from `src/immersiveScene.ts` so Tutorial progress
continues while the panel is closed and repaints immediately when it is open.

- Movement uses `recordMovementInputProgress(...)` with camera-relative canonical
  input components: positive forward is W/ArrowUp/joystick-away, negative
  forward is S/ArrowDown/joystick-toward, negative right is A/ArrowLeft, and
  positive right is D/ArrowRight. A direction completes after 0.25 seconds of
  meaningful input above the deadzone and only after a movement step reports
  actual motion, so blocked movement and analog drift do not count.
- Zoom uses `recordZoomProgress(...)` with the active runtime min/max zoom values
  supplied by the scene. The helper completes zoom-in or zoom-out when either the
  target or actual camera zoom reaches the matching bound within one percent of
  the runtime zoom range.
- POI progress uses the shared `PoiVisitedState` subscription from
  `src/scene/poi/visitedState.ts`. The shared snapshot is authoritative for the live
  counter until the POI page completes, so an explicit reset or partial restore can
  reduce the displayed `0/3` through `2/3` count. Once the page has completed, the
  visible counter stays clamped at `3/3` and persisted completed/unlocked Tutorial page
  flags remain monotonic when that shared snapshot shrinks.
- Gitshelves completion is keyed to the stable POI id
  `gitshelves-living-room-installation`. Its placement remains on the upper
  floor, so the localized Tutorial hint directs visitors upstairs.

## Production polish notes

The implemented Tutorial panel is a non-modal, gameplay-permissive HUD surface. It uses
`role="dialog"` with `aria-modal="false"`, labels the panel from the Tutorial heading,
and describes it from the active page body. Opening the Tutorial does not move focus into
the panel, so keyboard movement, zoom, POI cycling, and POI interaction remain available.
Escape closes the active top-level HUD panel before selected POI details.

The HUD menu remains a universal 2x2 grid in this order: Controls, Tutorial, Text,
Settings. Labels may wrap inside each pill so localized strings and key badges do not
force the grid wider than the viewport. The menu and Tutorial panel include safe-area
inset calculations for notched mobile viewports.

Tutorial progress is stored as versioned, locale-neutral state only:

- `danielsmith.io:tutorial:v1:progress`
- `danielsmith.io:tutorial:v1:showOnStartup`

The progress key stores ids, booleans, counters, and numeric movement buckets; localized
strings are never persisted. Corrupt or mismatched versions reset to the default v1 state.
Dismiss is intentionally current-load/session-only and does not write a storage key.

Action tracking contracts:

- Movement records actual successful movement snapshots after collision resolution.
  Keyboard, arrow-key, and virtual joystick input share the same camera-relative
  movement vector and only increment progress when movement was not blocked.
- Zoom completion derives from actual camera zoom snapshots and accepts values within a
  one-percent tolerance of the configured min and max zoom bounds.
- POI progress mirrors the shared visited POI state. Page three counts unique visited POI
  ids from that source rather than a separate shadow counter.
- Gitshelves completion depends on the stable POI id
  `gitshelves-living-room-installation`, not localized title text.

Playwright uses the existing `window.portfolio` debug namespace for deterministic
Tutorial progression checks. The `portfolio.tutorial` section exposes state-neutral test
helpers for recording movement, zoom, visited POI ids, and Gitshelves completion. These
helpers drive the same controller methods as runtime gameplay events and should not be
used for user-facing product flows.

Future Tutorial pages must add strings to every supported locale, including
`en-x-pseudo`, and must keep intentional key labels such as `W`, `A`, `S`, `D`, and `R`
untranslated. New progress must remain versioned and locale-neutral.
