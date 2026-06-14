# Debug performance overlay

## Why stats.js

The immersive scene now uses [`stats.js`](https://github.com/mrdoob/stats.js) for
its debug FPS counter because it is the small, established performance panel used
across many Three.js projects. It gives contributors an immediate FPS readout
without introducing a custom sampling algorithm or a larger profiling package.

## Toggle, storage, and URL override

The Settings diagnostics group includes an **FPS counter** toggle alongside the
collider overlay, collider IDs, and solid IDs controls. The preference persists
in local storage under:

```text
danielsmith.io::debugFpsCounter::v1
```

Immersive URLs can override the stored preference with the same truthy/falsy
conventions as the existing debug diagnostics:

- `?debugFps=1`, `?debugFps=true`, `?debugFps=yes`, or `?debugFps=on` enables it.
- `?debugFps=0`, `?debugFps=false`, `?debugFps=no`, or `?debugFps=off` disables it.

## Deployment note

`stats.js` and its TypeScript declarations are installed through npm, so
`package.json` and `package-lock.json` stay in sync for CI, Docker, and the
sugarkube deployment flow. Those environments use `npm ci`, so the lockfile must
include the dependency graph instead of relying on a CDN or vendored source.

## Debug-only and non-interactive behavior

The overlay is only created when the debug preference or URL override enables it.
It is fixed near the lower-left corner of the viewport to avoid the core HUD
controls, and it sets `pointer-events: none` plus `aria-hidden="true"` so it does
not intercept clicks, taps, or screen-reader focus.

## Manual verification

1. Start the preview with the immersive performance failover disabled.
2. Open:

   ```text
   /?mode=immersive&disablePerformanceFailover=1&debugCoordinates=1&debugColliders=1&debugColliderIds=1&debugSolidIds=1&debugFps=1
   ```

3. Confirm the stats.js FPS panel appears without blocking HUD controls.
4. Open Settings and toggle **FPS counter** off and on repeatedly.
5. Confirm only one stats panel exists and
   `window.portfolio.debugPerformance.getState()` reports `fpsEnabled` and
   `panelVisible` accurately.
