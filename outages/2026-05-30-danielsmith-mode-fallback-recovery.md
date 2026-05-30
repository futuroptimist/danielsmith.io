# Text fallback recovery trapped immersive debugging

[Back to performance overview](./2026-05-29-danielsmith-staging-performance-overview.md)

## Symptom

Text mode was too trapdoor-like during staging validation. A hard refresh could
start in text mode because `danielsmith.io:mode-preference` stored `text`, the
`T` shortcut only moved from immersive into text fallback, and runtime failover
made the primary debugging path feel blocked unless the operator knew to open
`?mode=immersive&disablePerformanceFailover=1` manually.

## Root cause

The mode toggle treated an active fallback as a terminal state: it disabled the
control and ignored the `T` shortcut once text mode was active. The fallback UI
also exposed one immersive link that always used the full debug bypass URL, so it
did not distinguish normal recovery (`?mode=immersive`) from advanced collection
(`?mode=immersive&disablePerformanceFailover=1`). Together with stored text
preference, this made manual text mode and runtime fallback look sticky.

## Fix summary

- `T` is now a bidirectional toggle. In immersive mode it still enters text mode;
  in fallback mode it clears saved mode preference and navigates to a clean
  immersive recovery URL.
- Text fallback now shows a visible **Try immersive again** action using
  `?mode=immersive`, plus a **Debug: force immersive mode** link for performance
  and runtime-error fallbacks that need
  `?mode=immersive&disablePerformanceFailover=1`.
- A **Clear saved mode preference** action removes stored mode preference without
  requiring DevTools.
- Runtime performance fallback remains active but does not persist a sticky text
  preference; only explicit manual text-mode selection should write `text`.

## Validation steps

- Start at `/?mode=immersive&disablePerformanceFailover=1`, press `T`, confirm
  text fallback appears, press `T` again, and confirm immersive mode returns.
- Start at `/?mode=text`, activate **Try immersive again**, and confirm the URL
  includes `mode=immersive` without the performance bypass.
- Set `localStorage["danielsmith.io:mode-preference"] = "text"`, open
  `/?mode=immersive`, and confirm immersive mode wins over storage.
- For low-FPS or debug collection, use
  `/?mode=immersive&disablePerformanceFailover=1` to keep runtime failover off.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run test:ci`
- `npm run test:e2e -- --grep "mode|fallback|immersive"`
- `npm run docs:check`
- `npm run smoke`

## Known failing validation

- `npm run typecheck` still reports pre-existing repo-wide TypeScript issues
  outside this fallback recovery fix.
