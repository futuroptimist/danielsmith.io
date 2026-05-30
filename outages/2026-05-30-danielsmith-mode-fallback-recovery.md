# danielsmith.io mode fallback recovery UX

## Symptom

Staging validation needed the force-immersive debug URL
`?mode=immersive&disablePerformanceFailover=1` because visitors and debuggers
could get stuck in the text fallback. A hard refresh could honor a stored
`danielsmith.io:mode-preference=text`, the `T` shortcut only moved from
immersive to text mode, and runtime performance fallback did not present an
obvious recovery path.

## Root cause

The mode toggle treated fallback as an active, disabled state instead of a
bidirectional control. Text fallback links also reused the force-debug immersive
URL as the only escape hatch, so normal recovery, preference clearing, and
advanced failover bypass were conflated.

## Fix

- `T` now acts as a two-way toggle: immersive mode still moves to the text
  portfolio, while text/fallback mode clears the saved mode preference and
  navigates to a clean `?mode=immersive` recovery URL.
- The text fallback now shows a visible “Try immersive again” action and a
  separate “Clear saved mode preference” recovery action.
- Runtime fallback reasons expose an advanced debug link using
  `?mode=immersive&disablePerformanceFailover=1` without making that bypass the
  default recovery route.
- Runtime failover remains available, but low-FPS/runtime fallback does not
  write a sticky text-mode preference. Only the explicit manual text toggle is
  eligible to persist the text preference.

## Validation steps

1. Open `/?mode=immersive&disablePerformanceFailover=1`, press `T`, and confirm
   text mode appears.
2. Press `T` from text mode and confirm the app returns to immersive mode via a
   clean `?mode=immersive` URL.
3. Open `/?mode=text`, click “Try immersive again,” and confirm immersive mode
   starts even when a stored text preference exists.
4. Store `localStorage["danielsmith.io:mode-preference"] = "text"`, open
   `/?mode=immersive`, and confirm the explicit URL overrides the preference.
5. Open `/?mode=immersive&disablePerformanceFailover=1` and confirm the debug
   URL still disables runtime performance failover for collection.

## Verification commands

- `npm run format:write`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run test:e2e -- --grep "mode|fallback|immersive"`
- `npm run docs:check`
- `npm run smoke`
