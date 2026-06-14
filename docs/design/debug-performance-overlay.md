# Debug performance overlay

The immersive scene uses the external `stats.js` package for the optional
performance overlay. The local wrapper owns lifecycle, placement, and debug API
state, while `stats.js` owns FPS measurement and rendering.

## Toggle, storage, and URL overrides

The Settings diagnostics group includes an FPS counter toggle beside the solid
ID tooling. The preference is stored in local storage as
`danielsmith.io::debugFpsCounter::v1`.

URL parameters use the same debug parsing conventions as the collider tools:

- `?debugFps=1` enables the counter for the immersive session.
- `?debugFps=0` disables it, even when local storage previously enabled it.

The debug API mirrors that state at `window.portfolio.debugPerformance` with
`getState()` and `setFpsEnabled(enabled)`.

## Dependency and deployment note

`stats.js` is a runtime npm dependency and is locked in `package-lock.json` so
CI, Docker, and sugarkube deployments install the same package version with
`npm ci`. If a registry policy blocks the runtime package tarball, treat that
as a dependency allowlist issue instead of replacing the overlay with a custom
counter. The repo uses a minimal local TypeScript declaration for `stats.js` so
it does not need the optional `@types/stats.js` package in environments where
that typing package is unavailable.

## Overlay behavior

The panel is debug-only and non-interactive. It is fixed near the upper-left
edge of the viewport to avoid overlapping the lower-left coordinate debug
readout, does not capture pointer events, and is removed from the DOM when
disabled. Repeated toggles reuse the same stats panel node so rerenders and
preference changes do not create duplicates.

The immersive render loop calls `begin()` before frame work and `end()` after
frame work; those methods delegate to `stats.begin()` and `stats.end()` when
the overlay is enabled. Fallback and teardown paths dispose the panel and clear
`window.portfolio.debugPerformance` so text mode does not retain stale scene
closures.

## Manual verification

Start the immersive preview and open:

```text
/?mode=immersive&disablePerformanceFailover=1&debugCoordinates=1&debugColliders=1&debugColliderIds=1&debugSolidIds=1&debugFps=1
```

Confirm that the FPS panel is visible, the coordinate readout remains visible
without overlap, Settings can turn the panel off and back on, HUD controls
remain clickable, and `window.portfolio.debugPerformance.getState()` reports
matching `fpsEnabled` and `panelVisible` values.
