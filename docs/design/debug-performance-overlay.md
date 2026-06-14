# Debug performance overlay

The immersive scene exposes a debug-only FPS counter powered by
[`stats.js`](https://github.com/mrdoob/stats.js). `stats.js` is small, widely
used by Three.js projects, and provides the FPS panel we need without adding a
larger profiling or observability framework.

## Toggle and state

The Settings diagnostics group now includes an **FPS counter** toggle alongside
the existing collider overlay, collider ID, and solid ID controls. The toggle
uses localStorage key `danielsmith.io::debugFpsCounter::v1` so reviewers can
keep the panel enabled across reloads.

URL overrides follow the existing debug diagnostics conventions:

- `?debugFps=1` enables the FPS panel.
- `?debugFps=0` disables it, even when localStorage was previously enabled.
- Truthy values are `1`, `true`, `yes`, and `on`.
- Falsy values are `0`, `false`, `no`, and `off`.

The debug API is intentionally narrow:

```ts
window.portfolio.debugPerformance.getState();
window.portfolio.debugPerformance.setFpsEnabled(true);
```

`getState()` returns `fpsEnabled` and `panelVisible` only. It does not expose the
underlying `stats.js` object.

## Rendering behavior

The panel is appended only while enabled, uses the default FPS panel, and is
reused across repeated toggles so normal scene re-renders do not create duplicate
DOM nodes. It is fixed near the lower-left viewport edge and sets
`pointer-events: none` so it cannot block HUD, Settings, or in-scene
interactions.

The render loop calls `stats.begin()` immediately before the main immersive
render path and `stats.end()` after the composer or renderer finishes. This keeps
the displayed reading focused on actual frame rendering work without allocating
new objects every frame.

## Deployment note

`stats.js` is installed from npm and the lockfile is committed. That keeps the
Dockerfile and sugarkube deployment path deterministic because they use
`npm ci`, which requires `package.json` and `package-lock.json` to agree.

## Manual verification

1. Run `npm install` after changing dependencies, or use the committed lockfile
   with `npm ci` in clean environments.
2. Start the preview with the immersive failover override.
3. Open:
   `/?mode=immersive&disablePerformanceFailover=1&debugCoordinates=1&debugColliders=1&debugColliderIds=1&debugSolidIds=1&debugFps=1`.
4. Confirm the FPS panel appears, does not block HUD controls, and does not
   duplicate after toggling the Settings FPS counter off and on.
5. In DevTools, verify:
   `window.portfolio.debugPerformance.getState()` reports `{ fpsEnabled: true,
panelVisible: true }`, then call
   `window.portfolio.debugPerformance.setFpsEnabled(false)` and confirm both
   values become `false`.
