# Debug performance overlay

The immersive scene uses a small in-house FPS counter for the optional
performance overlay so locked-down npm registry policies cannot block
installation or deploys.

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

The counter has no runtime package dependency. Docker and sugarkube deployments
that run `npm ci` only need the repository's existing dependency allowlist.

## Overlay behavior

The panel is debug-only and non-interactive. It is fixed near the upper-left
edge of the viewport to avoid overlapping the lower-left coordinate debug
readout, does not capture pointer events, and is removed from the DOM when
disabled. Repeated toggles reuse the same panel node so rerenders and
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
