# Tutorial panel architecture

This document specifies the Tutorial panel system for immersive mode. The Tutorial is an
explicit, localized, user-controlled onboarding panel that teaches core interactions without
reintroducing the removed Guided Tour or Narration systems. It is intentionally a HUD panel, not
an autonomous recommendation engine, story log, modal scene blocker, or replacement for Controls
and Settings.

## Current architecture snapshot

The implementation should start from these existing contracts:

- `src/ui/hud/hudPanelCoordinator.ts` currently coordinates the top-level `controls` and
  `settings` panels, synchronizes `aria-expanded` / `aria-pressed` on their menu buttons, closes
  the other top-level panel before opening one, routes Text mode through `onTextMode`, and closes
  the active panel on Escape.
- `src/ui/hud/responsiveControlOverlay.ts` owns the non-modal Controls popover. It sets
  `aria-haspopup="dialog"`, `role="dialog"`, `aria-modal="false"`, localized button metadata,
  outside-pointer dismissal, Escape dismissal, active input highlighting, and layout data from the
  HUD layout manager.
- `src/ui/hud/helpModal.ts` owns the Settings modal. It uses a backdrop, `role="dialog"`,
  `aria-modal="true"`, focus trapping, localized copy, and an embedded settings section.
- `src/immersiveScene.ts` wires the HUD panels, central key bindings, camera-relative movement,
  zoom controls, POI selection, visited-state persistence, locale refresh, Settings controls, and
  public `window.portfolio` debug/test APIs.
- `src/ui/styles.css` contains the HUD menu, Controls/POI combined-layout, Settings modal, safe-area,
  and responsive overlay styling that Tutorial should extend rather than bypass.
- `src/systems/controls/keyBindings.ts` defines the central `KeyBindingAction` union and persisted
  defaults. `toggleControls` currently owns `C`; `help` owns `H` / `?`; movement, interaction, and
  the Controls shortcut all flow through this central registry.
- `src/ui/hud/gameplayShortcutGating.ts` allows gameplay shortcuts unless an event is already
  prevented, the event target is text-entry content, or Settings is the active HUD panel. This is
  the policy to extend so Tutorial behaves like Controls, not Settings.
- Movement is computed from keybinding actions plus `VirtualJoystick.getMovement()`, then converted
  through `getCameraRelativeMovementVector(...)`. Tutorial movement completion must observe that
  canonical input vector, not raw physical key names.
- Zoom is centralized in `src/systems/camera/zoomControls.ts`, with keyboard, wheel, and pinch
  helpers. Runtime bounds currently live in immersive scene as `MIN_CAMERA_ZOOM` and
  `MAX_CAMERA_ZOOM`; future Tutorial code should expose the active bounds/target through a typed
  integration instead of duplicating constants.
- POI selection lives in `PoiInteractionManager`; keyboard cycling supports `Q` / `E` and arrow
  keys, pointer/touch can select, and selection listeners mark the POI visited. `PoiVisitedState`
  persists unique visited POI ids under `danielsmith.io::poi::visited::v1` and emits snapshots.
  Floating visited labels/checks are visualized by `updateVisitedBadge(...)` and related POI
  emphasis state.
- Localization lives under `src/assets/i18n/` with typed locale structures for `en`,
  `en-x-pseudo`, `ar`, `ja`, `zh-Hans`, `es`, `pt`, `de`, and `hu`. The hardcoded UI string guard
  scans HUD, accessibility, controls, software-renderer warning, and POI runtime code.
- Z-fighting coverage currently includes `src/tests/zFightingAudit.test.ts` and geometry helpers.
  Tutorial work must not edit those tests or weaken release checks.

## Goals

- Make onboarding explicit and user-controlled: users open Tutorial from the HUD menu or `R`, and
  may dismiss it without being chased by implicit prompts.
- Localize all Tutorial runtime text in every supported locale, including pseudo-locale wrapping.
- Keep gameplay permissive while Tutorial is open so users can complete movement, zoom, and POI
  tasks without closing the panel.
- Persist Tutorial progress across refreshes while keeping the startup preference separate.
- Support desktop, touch, and mobile browsers using the existing camera-relative movement, virtual
  joystick, zoom, and POI primitives.
- Make Tutorial behavior testable through state-machine, persistence, component, and Playwright
  assertions instead of screenshot-only review.

## Non-goals

- Do not reintroduce implicit Guided Tour recommendations, tour reset, tour routing, narrative log,
  Narration popups, or procedural story copy.
- Do not block the scene behind a modal Tutorial or trap all focus inside it.
- Do not replace or weaken the Controls panel, Settings panel, shared controls data source, or
  Controls/Settings parity tests.
- Do not reintroduce Loadouts.
- Do not weaken localization guardrails, hardcoded-string checks, z-fighting audit coverage, or
  collider/geometry release checks.
- Do not perform release-version or Helm chart changes as part of Tutorial work.

## Proposed modules and ownership

Runtime implementation should be split so tests can cover behavior without booting WebGL:

- `src/ui/hud/tutorialPanel.ts`: DOM renderer for the Tutorial button/panel content, sidebar,
  navigation, options, ARIA state, localized copy application, and callbacks.
- `src/ui/hud/tutorialState.ts`: pure state machine, page ids, unlock/completion rules, monotonic
  progress updates, and current-page selection.
- `src/ui/hud/tutorialPersistence.ts`: localStorage parsing, validation, defaulting, corruption
  fallback, and future migration boundary.
- `src/ui/hud/tutorialProgressTracker.ts`: small adapter that consumes movement, zoom, and POI
  events and forwards normalized updates to `tutorialState`.
- `src/ui/hud/tutorialTypes.ts`: shared types if the above modules would otherwise cycle.
- `src/ui/hud/__tests__/tutorialState.test.ts`, `tutorialPersistence.test.ts`,
  `tutorialProgressTracker.test.ts`, and `tutorialPanel.test.ts` for focused Vitest coverage.
- `playwright/tutorial-panel.spec.ts` for browser-level startup, hotkey, responsive, gameplay, and
  POI progression coverage.

`src/immersiveScene.ts` should only compose these modules, provide live runtime events, and route
HUD actions. It should not contain the Tutorial state machine itself.

## HUD menu architecture

The universal top-right HUD menu should become a 2x2 pill grid at all viewport sizes:

| Position     | Action   | Primary key badge |
| ------------ | -------- | ----------------- |
| Top-left     | Controls | `C`               |
| Top-right    | Tutorial | `R`               |
| Bottom-left  | Text     | `T`               |
| Bottom-right | Settings | `H`               |

Requirements:

- Tab order follows visual reading order: Controls, Tutorial, Text, Settings.
- Each button uses the same menu-button primitive/metadata path as today, with localized label,
  localized title/ARIA label, and a compact key badge sourced from the active keybinding where
  available.
- Key badges should remain visible when labels wrap or narrow; labels may compact, but badges must
  not be the sole accessible label.
- The grid remains 2 columns by 2 rows on desktop and mobile. At very narrow widths, reduce button
  padding/gaps and allow localized labels to wrap or truncate with accessible full labels; do not
  collapse to a single row that reintroduces mobile crowding.
- The grid is safe-area aware using existing HUD offsets plus `env(safe-area-inset-*)` so it avoids
  notches and browser UI.
- The grid coexists with Controls, Tutorial, selected POI panels, and Settings. Controls and
  Tutorial are non-modal top-level panels; Settings remains conservative/modal. Opening Settings
  closes Controls and Tutorial. Opening Controls may close Tutorial, and opening Tutorial may close
  Controls, to keep one non-modal top-level HUD panel open at a time. Text mode closes top-level HUD
  panels before switching modes.
- The 2x2 grid should solve menu crowdedness on mobile while still looking intentional on desktop:
  use a unified pill cluster, consistent widths, and visual grouping rather than device-specific
  one-off layouts.
- Controls and Settings controls-help lists must continue to be generated from the same shared data
  source and remain 100% identical.

`HudPanel` should be extended to include `tutorial`. `createHudPanelCoordinator(...)` should accept
an optional Tutorial panel handle and Tutorial button, expose `openTutorial()` / `toggleTutorial()`,
and update button states consistently with Controls and Settings.

## Tutorial panel layout

The Tutorial panel has four zones:

1. **Collapsible left sidebar**
   - Lists the stable tutorial steps in order.
   - The first step is always unlocked.
   - Unlocked steps are enabled buttons/links and clickable.
   - Locked steps are disabled, gray, not clickable, and marked `aria-disabled="true"`.
   - The active step is visually highlighted and marked with `aria-current="step"`.
   - The sidebar can collapse to preserve scene space. The collapsed state should keep step status
     visible through icons or short labels and expose an accessible expanded/collapsed state.
2. **Body**
   - Contains localized heading, purpose/instruction text, optional text-only escape, and progress
     chips/checkmarks for the active page.
   - Body copy is driven by page ids and i18n keys, never by localized strings in state.
3. **Navigation**
   - Previous and Next buttons use existing HUD/Settings button styling where practical.
   - Previous is disabled on the first page.
   - Next is disabled until the next page is unlocked; on the last page it may be hidden or disabled
     with a localized completion label.
4. **Options**
   - Show on startup checkbox, checked by default and persisted.
   - Dismiss button closes the panel for the current page load/session only.
   - Options sit below navigation and use existing Settings form-control styling where practical.

## Gameplay policy

Tutorial is non-modal and gameplay-permissive:

- While Tutorial is open, do not block movement, keyboard zoom, wheel zoom, pinch zoom, POI
  hover/selection, clicking/tapping/interacting with POIs, `Q` / `E` POI cycling, arrow-key POI
  cycling, or the Text-mode action.
- Tutorial open must not hide selected POI panels, clear selected POI state, or clear hovered POI
  state.
- Settings may remain conservative: active Settings blocks gameplay shortcuts and may clear POI
  detail state according to the current coordinator behavior.
- Escape closes the active HUD panel. If only a POI detail panel is active, preserve existing POI
  Escape behavior.
- Clicking/tapping the scene behind panels should dismiss transient panels according to existing
  Controls/POI rules. Tutorial may follow the Controls outside-click policy, but must not consume
  scene events needed for pointer/touch POI selection outside the panel bounds.
- Text-entry targets still block gameplay shortcuts and hotkeys.
- Opening Settings closes Tutorial. Opening Tutorial may close Controls, but Tutorial must coexist
  with selected POI panels.

`canHandleGameplayShortcut(...)` should continue to return false for Settings and text-entry
contexts only. If Tutorial is added to `HudPanel`, tests must assert Tutorial behaves like Controls
for movement, zoom, and POI cycling.

## Tutorial pages and completion rules

Stable page ids:

1. `welcomeMovement`
2. `zoom`
3. `visitPois`
4. `findGitshelves`

### Page 1: Welcome and movement

- Purpose text welcomes users to the portfolio and explains that projects are showcased
  interactively.
- Instruction text asks users to move in all four cardinal directions represented by WASD.
- Completion is based on canonical movement direction, not physical key identity. Keyboard WASD,
  arrow keys, virtual joystick, gamepad-like adapters if added later, or any input that moves in the
  direction can count.
- Completion thresholds:
  - forward/north for at least `0.25` seconds,
  - left/west for at least `0.25` seconds,
  - backward/south for at least `0.25` seconds,
  - right/east for at least `0.25` seconds.
- Direction accumulation should use the combined pre-camera-relative input components
  (`combinedForward`, `combinedRight`) or an explicitly emitted canonical direction sample so
  movement is camera-relative and floor-plan agnostic.
- Visual indicators use dark yellow for incomplete and bright yellow for complete, plus a checkmark
  or localized accessible status. Do not rely on color alone.
- The body includes a localized text-only escape and a Text button that reuses the existing Text
  control path (`activateTextMode` / HUD text button behavior), styling, and persistence semantics.

### Page 2: Zoom

- Instruction text asks users to zoom all the way in and all the way out.
- Input methods: mouse scroll wheel, multitouch pinch, and keyboard `Shift` + `=` / `Shift` + `-`
  (plus existing numpad support where present).
- Completion is based on the active camera zoom target reaching runtime bounds, not hardcoded copy:
  - zoom-in completes when the target reaches the max threshold,
  - zoom-out completes when the target reaches the min threshold,
  - either order is valid.
- Use actual runtime min/max values exposed from immersive scene. Completion tolerance should be
  derived from range, for example `range * 0.01`, or an equivalent 99% threshold.
- Visual indicators: localized “In” and “Out” chips with checkmarks and screen-reader statuses.

### Page 3: Visit 3 POIs

- Instruction text explains that POIs are project exhibits containing summary, outcomes, metrics,
  links, and context.
- Completion uses existing visited-state semantics. Clicking, tapping, or keyboard-interacting with
  a POI marks it visited through shared POI state.
- Count unique visited POI ids only. The counter increments from `0/3` through `3/3`; `3/3` gets
  bright yellow treatment plus a checkmark/status indicator.
- Tutorial must subscribe to or derive from `PoiVisitedState`; it must not maintain a duplicate
  shadow visited list that can diverge from the scene.

### Page 4: Find Gitshelves

- Instruction text asks users to find and interact with Gitshelves. The initial hint is “check
  upstairs.”
- Completion is based on a stable POI id, not localized title text. The current registry includes
  `gitshelves-living-room-installation`; implementation must verify the id and current placement
  before relying on it.
- Completion is location-agnostic and depends on shared visited/interacted state for that POI id.
- If Gitshelves is not upstairs in current data when implemented, update the hint or intentionally
  update placement with tests. Do not leave a misleading localized hint.

## Persistence model

Use versioned localStorage keys:

- `danielsmith.io:tutorial:v1:progress`
- `danielsmith.io:tutorial:v1:showOnStartup`
- Optional only if truly needed: `danielsmith.io:tutorial:v1:dismissedSession`. Prefer an in-memory
  per-load flag for session-only Dismiss.

Rules:

- `showOnStartup` defaults to `true` when the key is absent or corrupt.
- Progress persists separately from `showOnStartup`.
- Dismiss closes Tutorial for the current page load/session only. It does not clear progress and
  does not necessarily set `showOnStartup` to false.
- Unchecking Show on startup persists `false` and prevents automatic opening on future immersive
  loads.
- Pressing `R` or clicking Tutorial always opens it regardless of Show on startup.
- Corrupt localStorage values safely reset to defaults, log at most a non-fatal warning, and never
  break immersive boot.
- Future migrations should bump `v1` to `v2` and transform only stable ids/flags.
- Do not store localized strings in localStorage.

Suggested `progress` payload:

```ts
interface TutorialProgressV1 {
  version: 1;
  currentPageId?: 'welcomeMovement' | 'zoom' | 'visitPois' | 'findGitshelves';
  unlockedPageIds: Array<
    'welcomeMovement' | 'zoom' | 'visitPois' | 'findGitshelves'
  >;
  completedPageIds: Array<
    'welcomeMovement' | 'zoom' | 'visitPois' | 'findGitshelves'
  >;
  movementDurations: {
    forward: number;
    left: number;
    backward: number;
    right: number;
  };
  zoom: {
    in: boolean;
    out: boolean;
  };
  visitedPoiIds?: string[];
  visitedPoiCount?: number;
  gitshelvesVisited: boolean;
  updatedAt: string;
}
```

If shared `PoiVisitedState` remains persisted, Tutorial may derive `visitedPoiIds` from that shared
state at load and persist only Tutorial-specific flags. If Tutorial persists POI ids, reconciliation
must merge with the shared visited-state snapshot and preserve unique ids.

## State machine

- First page (`welcomeMovement`) is always unlocked.
- Each successive page unlocks when the previous page's completion criteria are met.
- Users may navigate to any unlocked page through the sidebar or Previous/Next.
- Locked pages remain disabled and cannot be selected programmatically or by click/keyboard.
- Completion is monotonic unless a future explicit reset feature is designed. Reloading or visiting
  an already-completed action must never unset a flag.
- Persist unlocked page ids, completed action flags, movement durations, zoom flags, POI visited ids
  or derived count, Gitshelves completion, and optionally current page id.
- State transitions should be pure functions, e.g. `applyMovementSample`, `applyZoomSample`,
  `applyVisitedPoiSnapshot`, `selectTutorialPage`, and `deriveTutorialUnlocks`, so Vitest can cover
  edge cases without DOM or Three.js.

## Integration contracts

### Keybinding

- Add a central `toggleTutorial` action with default `['r']`.
- Audit conflicts with existing actions before shipping; if user-customized bindings collide, the
  same conflict handling used for Controls should prevent ambiguous toggles.
- Persist `toggleTutorial` with the existing keybinding config and expose it in
  `window.portfolio.input` snapshots if that API remains the source for tests.
- Update HUD menu key badges when bindings change.

### Movement

- Expose a movement sample from immersive scene after combining keyboard and virtual joystick input:
  `{ right: number; forward: number; deltaSeconds: number }`.
- The tracker converts positive `forward` to forward/north, negative `forward` to backward/south,
  negative `right` to left/west, and positive `right` to right/east. When diagonal input is active,
  both represented directions may accumulate if their absolute component exceeds a small dead zone,
  such as `0.2`.
- Count touch joystick movement because it contributes to the same combined movement sample.

### Zoom

- Expose `{ targetZoom, minZoom, maxZoom }` after keyboard, wheel, or pinch updates and during frame
  updates if smoothing might lag target changes.
- Tutorial completes bounds using target zoom plus derived tolerance. Do not duplicate
  `MIN_CAMERA_ZOOM` / `MAX_CAMERA_ZOOM` inside Tutorial modules.

### POI visited

- Subscribe to `PoiVisitedState` snapshots or an equivalent shared POI event.
- If current visited state changes, Tutorial should react immediately whether the panel is open or
  closed.
- If shared visited state needs improvement, keep it a general POI primitive independent from any
  Guided Tour or Narration terminology.

### Text mode

- The Tutorial text-only button calls the existing Text action handler used by the HUD menu. It must
  not duplicate text-mode fallback routing.

### Localization

- Add Tutorial strings to `src/assets/i18n/types.ts` and every locale file.
- Include menu label/title/key hint, panel title/description, sidebar labels, page headings/body,
  progress-chip labels, completion statuses, navigation labels, Show on startup label/help, Dismiss,
  text-only action copy, announcements, and ARIA labels.
- `en-x-pseudo` must wrap all user-visible Tutorial strings.
- Runtime Tutorial components must contain no hardcoded English user-visible strings.
- Extend the hardcoded-string guard target list if Tutorial runtime files are not already covered.
- Add i18n tests that assert all locales include every Tutorial key.

## Accessibility requirements

- Tutorial menu button:
  - localized `aria-label` and `title`,
  - `aria-expanded`,
  - `aria-controls`,
  - `aria-pressed` if kept consistent with existing HUD buttons.
- Panel:
  - use non-modal dialog/landmark semantics consistent with Controls (`role="dialog"`,
    `aria-modal="false"`) unless a more appropriate non-modal landmark is chosen and tested,
  - `aria-labelledby` and `aria-describedby`,
  - opening should not unexpectedly steal gameplay focus; pointer-open may release button focus like
    Controls, while keyboard-open may leave focus on the button or move to panel heading only if it
    does not break gameplay shortcuts,
  - Escape closes the panel.
- Sidebar:
  - locked items use disabled controls or `aria-disabled="true"`,
  - active step uses `aria-current="step"`,
  - collapsible state is announced with `aria-expanded` and a localized label.
- Progress chips:
  - pair color with checkmarks/status text,
  - expose completed/incomplete screen-reader labels,
  - announce task completion through a polite `aria-live` region.
- Buttons and checkbox labels are localized, expose disabled states, and remain keyboard reachable.
- Do not rely on color alone for any completion or lock state.

## Responsive layout requirements

- The HUD menu is always a 2x2 grid.
- Tutorial panel can coexist with a selected POI panel.
- Desktop:
  - keep Tutorial compact enough to leave the scene visible,
  - avoid avoidable overlap with POI details by positioning Tutorial near the top/right menu and POI
    details in their existing overlay region,
  - cap height and use internal scrolling for long localized copy.
- Mobile/touch:
  - keep visible scene gutters and respect safe-area insets,
  - panel content uses internal scrolling instead of pushing the whole viewport,
  - if Tutorial and POI details are both visible, split available vertical space roughly half and
    half like the combined Controls + POI layout, keeping each panel within about half the viewport
    when possible,
  - sidebar should collapse by default or become a top/inline step list so body and navigation stay
    usable.
- RTL locales must preserve logical order and readable sidebar/body relationships using logical CSS
  properties where practical.

## Test strategy

Unit tests:

- `src/systems/controls/keyBindings.test.ts`: `toggleTutorial` exists, defaults to `R`, normalizes,
  persists, formats labels, and conflict checks cover `R`.
- `src/ui/hud/__tests__/tutorialState.test.ts`: unlock rules, locked selection rejection,
  monotonic completion, current-page selection, and completed page derivation.
- `src/ui/hud/__tests__/tutorialPersistence.test.ts`: corrupt localStorage fallback,
  `showOnStartup` default/persistence, progress save/load, version mismatch reset, and no localized
  strings stored.
- `src/ui/hud/__tests__/tutorialProgressTracker.test.ts`: movement direction accumulation,
  dead-zone behavior, diagonal samples, zoom threshold completion, POI visited count, unique POI
  counting, and Gitshelves id completion.
- `src/ui/hud/__tests__/tutorialPanel.test.ts`: all four zones render, localized text is applied,
  sidebar locked/unlocked states, Previous/Next disabled states, options checkbox, Dismiss callback,
  text-only callback, ARIA attributes, and live-region updates.
- `src/tests/i18n.test.ts`: Tutorial keys exist in all locales and pseudo-locale wraps strings.
- `scripts/check-hardcoded-ui-strings.cjs` coverage: Tutorial runtime files are scanned.

Playwright tests in `playwright/tutorial-panel.spec.ts`:

- Tutorial opens on startup by default for immersive mode.
- Dismiss closes it for the current load.
- `showOnStartup=false` prevents auto-open on the next immersive load.
- `R` toggles Tutorial unless focus is in a text-entry target.
- Movement in four directions unlocks page 2 while Tutorial is open.
- Zooming to min and max unlocks page 3 while Tutorial is open.
- Visiting 3 unique POIs unlocks page 4.
- Visiting the Gitshelves POI completes page 4.
- Mobile 2x2 grid fits, Tutorial panel scrolls internally, and Tutorial + POI split available space.
- Controls/Settings controls-list parity remains intact.
- POI `Q` / `E` cycling works while Tutorial is open.
- Release checks still include z-fighting audit coverage through existing test suites.

## Migration and deletion plan

- Tutorial must be new HUD/onboarding code. It must not import, restore, or rename removed Guided
  Tour or Narration modules.
- Avoid removed feature names in runtime identifiers, storage keys, CSS classes, tests, and docs
  except when stating non-goals or migration constraints in architecture documentation.
- If a general POI visited primitive was formerly tied to removed features, keep the current
  `PoiVisitedState` direction: a neutral POI system service with stable ids, persistence,
  subscription, and no recommendation/story semantics.
- Do not add tour reset, narrative log, guided recommendations, or narration settings. A future
  explicit Tutorial reset would require a separate design and localized UX.

## Acceptance checklist for implementation

- `docs/architecture/tutorial-panel.md` remains the source of truth for Tutorial behavior.
- Tutorial runtime is explicit, localized, gameplay-permissive, persisted, and non-modal.
- The universal HUD menu is a 2x2 grid with Controls, Tutorial, Text, and Settings.
- State lives in pure Tutorial state/persistence modules; immersive scene only composes and emits
  movement/zoom/POI events.
- Progress persists through versioned localStorage keys and safely handles corrupt data.
- Every page unlock rule is unambiguous and test-covered.
- Mobile layout, POI coexistence, safe areas, and accessibility states are test-covered.
- Existing localization guardrails and z-fighting audit coverage remain intact.
