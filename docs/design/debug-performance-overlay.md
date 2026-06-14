# Debug performance overlay

The immersive scene uses [`stats.js`](https://github.com/mrdoob/stats.js) for the
optional FPS counter because it is a small, familiar Three.js diagnostic panel
that can be installed from npm instead of copied into the repository or loaded
from a CDN.

## Toggle, storage, and URL overrides

The Settings diagnostics group now includes an FPS counter toggle beside the
solid ID tooling. The preference is stored in local storage as
`danielsmith.io::debugFpsCounter::v1`.

URL parameters use the same debug parsing conventions as the collider tools:

- `?debugFps=1` enables the counter for the immersive session.
- `?debugFps=0` disables it, even when local storage previously enabled it.

The debug API mirrors that state at `window.portfolio.debugPerformance` with
`getState()` and `setFpsEnabled(enabled)`.

## Deployment note

`stats.js` is a normal npm dependency and `@types/stats.js` provides TypeScript
coverage. Both `package.json` and `package-lock.json` are updated so Docker and
sugarkube deployments that run `npm ci` install the same versions used during
local verification.

## Overlay behavior

The panel is debug-only and non-interactive. It is fixed near the lower-left
edge of the viewport, does not capture pointer events, and is removed from the
DOM when disabled. Repeated toggles reuse the same panel node so rerenders and
preference changes do not create duplicates.

## Manual verification

Start the immersive preview and open:

```text
/?mode=immersive&disablePerformanceFailover=1&debugCoordinates=1&debugColliders=1&debugColliderIds=1&debugSolidIds=1&debugFps=1
```

Confirm that the FPS panel is visible, Settings can turn it off and back on,
HUD controls remain clickable, and
`window.portfolio.debugPerformance.getState()` reports matching `fpsEnabled`
and `panelVisible` values.
