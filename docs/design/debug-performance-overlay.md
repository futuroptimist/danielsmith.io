# Debug performance overlay

The immersive scene uses `stats.js` for its debug FPS panel because it is the
small, established browser performance widget maintained by the Three.js
community. The package is installed from npm instead of vendored or loaded from
a CDN, so Vite bundles it with the rest of the application.

The Settings diagnostics group now includes an **FPS counter** toggle beside the
solid ID tooling. The preference is persisted in local storage with
`danielsmith.io::debugFpsCounter::v1`. A URL parameter overrides stored state
using the same debug truthy/falsy convention as the collider tools:
`?debugFps=1` or `?debugFps=true` enables the panel, while `?debugFps=0` or
`?debugFps=false` disables it.

The overlay is debug-only and non-interactive. Its DOM node has pointer events
disabled and is reused between toggles so repeated Settings changes or normal
immersive renders do not create duplicate panels. The render loop wraps the
immersive frame work with `stats.begin()` / `stats.end()` and shows the FPS
panel by default.

Deployment keeps working with Docker and sugarkube because `stats.js` is tracked
in both `package.json` and `package-lock.json`; environments that run `npm ci`
install the exact dependency graph.

Manual verification:

1. Run `npm run dev` or `npm run preview`.
2. Open `/?mode=immersive&disablePerformanceFailover=1&debugFps=1`.
3. Confirm the FPS panel appears and HUD controls remain clickable.
4. Open Settings and toggle **FPS counter** off and on.
5. In DevTools, verify `window.portfolio.debugPerformance.getState()` reports
   `fpsEnabled` and `panelVisible`, and repeated toggles leave one
   `[data-debug-fps-counter="true"]` element in the DOM.
