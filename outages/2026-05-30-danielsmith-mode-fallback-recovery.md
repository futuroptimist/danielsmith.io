# Text fallback recovery and immersive debug escape hatch

[Back to performance overview](./2026-05-29-danielsmith-staging-performance-overview.md)

## Symptom

Staging validation sometimes became trapped in the text fallback. A hard refresh
could reopen text mode because `danielsmith.io:mode-preference` still contained
`text`, and the `T` shortcut only moved from immersive mode into text mode. Once
runtime failover had rendered the fallback, testers needed the force URL
`?mode=immersive&disablePerformanceFailover=1` to collect immersive diagnostics.

## Root cause

The mode control behaved like a one-way escape hatch. Manual text mode wrote a
sticky preference, but the fallback UI did not provide a keyboard or visible
recovery path that bypassed that stored preference. Runtime performance fallback
used the same text rendering surface, so the manual preference interaction made
normal recovery and debug collection look like a permanent low-capability state.

## Fix

- `T` is now a true two-way control: immersive mode still switches to text mode,
  while text fallback focuses a recovery handler that navigates to `?mode=immersive`.
- The text fallback includes a visible **Try immersive again** action using a
  clean immersive URL that overrides stored text preference without disabling
  runtime failover.
- Non-manual fallback reasons expose **Force immersive debug mode**, preserving
  `?mode=immersive&disablePerformanceFailover=1` for staging diagnostics.
- A **Clear saved mode preference** action removes the stored mode preference
  without requiring DevTools.
- Preference persistence is documented in tests so only explicit manual text-mode
  choices are sticky; runtime low-performance fallback remains recoverable on
  refresh.

## Validation steps

```bash
npm run format:write
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e -- --grep "mode|fallback|immersive"
npm run docs:check
npm run smoke
```

Manual checks:

1. Open `/?mode=immersive&disablePerformanceFailover=1`, press `T`, and confirm
   text fallback appears.
2. Press `T` again and confirm the app navigates to `?mode=immersive` and returns
   to the immersive scene.
3. Open `/?mode=text`, select **Try immersive again**, and confirm stored text
   preference does not block immersive routing.
4. Trigger or simulate performance fallback and confirm the debug link includes
   `disablePerformanceFailover=1` while normal recovery does not.
