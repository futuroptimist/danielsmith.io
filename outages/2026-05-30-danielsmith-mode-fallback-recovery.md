# Mode fallback recovery UX

[Back to performance overview](./2026-05-29-danielsmith-staging-performance-overview.md)

## Symptoms

Staging validation could get stuck in the text portfolio after a hard refresh when
`danielsmith.io:mode-preference` stored `text`, or after runtime failover disposed
immersive resources. Pressing `T` only entered text mode, so engineers needed the
force URL `?mode=immersive&disablePerformanceFailover=1` to escape and keep
collecting debug data.

## Root cause

The manual mode toggle treated fallback as an active, disabled state. Combined
with sticky mode preference writes, text mode behaved like a trapdoor: explicit
text choices and runtime fallback both looked similar to the recovery path even
though only explicit user text choices should persist.

## Fix

- `T` is now bidirectional: immersive sessions switch to text mode, while text or
  fallback sessions navigate to a clean `?mode=immersive` recovery URL.
- Text fallback renders a visible “Try immersive again” action that clears the
  saved mode preference before navigation.
- Performance and error fallbacks expose an advanced
  `?mode=immersive&disablePerformanceFailover=1` debug link.
- A “Clear saved mode preference” control is available inside fallback UI.
- Runtime failover remains enabled but no longer writes sticky text preference;
  only explicit manual text-mode choices persist.

## Validation

- Load `/?mode=immersive&disablePerformanceFailover=1`, press `T`, confirm text
  mode appears, press `T` again, and confirm immersive mode returns.
- Load `/?mode=text`, click “Try immersive again”, and confirm immersive mode
  returns on `?mode=immersive`.
- Seed `localStorage["danielsmith.io:mode-preference"] = "text"`, then load
  `/?mode=immersive` and confirm immersive routing wins.
- Keep `/?mode=immersive&disablePerformanceFailover=1` available for debug
  captures that must bypass runtime low-FPS failover.
