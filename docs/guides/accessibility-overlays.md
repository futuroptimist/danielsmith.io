# Accessibility overlay checklist

HUD and DOM overlays mirror every in-world point of interest (POI) and status
indicator. Follow this checklist when adding new exhibits or UI so keyboard and
screen-reader visitors receive the same metadata as 3D players.

## ARIA & metadata parity

- **Role** – Wrap overlays in a `role="region"` or `role="dialog"` that matches
  the in-world affordance (`section.poi-tooltip-overlay` already does this).
- **Label** – Provide `aria-label` or heading/`aria-labelledby` pairs that reuse
  the POI title from [`getPoiCopy`](../architecture/scene-stack.md).
- **Status badges** – Mirror visited/recommended flags using `aria-live`
  announcements for discovery events. Ensure badges toggle `hidden` and text
  content in sync with the scene state.

## Focus order

1. Spawn focus lands on the movement legend so new visitors hear the current
   input mode.
2. The help/menu button follows in the tab order. Keep it adjacent to the
   movement legend in DOM order and ensure `aria-haspopup="dialog"` is present.
3. When a POI is selected, focus shifts to `.poi-tooltip-overlay`; the close
   button (if present) should be first in the overlay’s tab order.
4. Trap focus inside modal dialogs (`help-modal`) until dismissed.
5. Announce help menu open/close transitions through the HUD focus announcer so
   assistive tech users know when the dialog state changes.

## Text alternatives

- Ensure POI metrics render within semantic lists (`<ul>`/`<li>`).
- Provide link text that describes the destination rather than repeating the POI
  title (e.g. “Open GitHub repo” instead of “More info”).
- Keep caption bridges (`AmbientCaptionBridge`) synced with audio events and
  expose them through the `.audio-hud` live region.

## Reconciling HUD vs. scene discrepancies

- If a POI’s in-world mesh differs from the DOM overlay (e.g. temporary art),
  append a `data-desync="true"` attribute so QA can locate mismatches quickly.
- Document divergences in the POI registry comments and create a backlog entry
  if parity cannot ship immediately.
- During smoke tests, run the keyboard traversal macro (see
  [`playwright/keyboard-traversal.spec.ts`](../../playwright/keyboard-traversal.spec.ts))
  to verify the overlay announces each POI in the expected order.
