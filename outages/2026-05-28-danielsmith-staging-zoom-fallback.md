# staging.danielsmith.io zoom afterimage and fallback incident

- **Date:** 2026-05-28
- **Environment:** staging.danielsmith.io on Sugarkube
- **Status:** corrective patch prepared

## Symptoms

The immersive scene rendered cleanly on first load, but mouse-wheel zooming or
camera panning caused previous full-scene projections to remain visible. The
result looked like stacked or duplicated room geometry and broad afterimage
trails instead of a clean orthographic zoom.

## Impact

Visitors testing the staging immersive experience could not reliably inspect the
3D home. The visual corruption made normal zoom/pan navigation appear broken and
risked being mistaken for a renderer, asset, or deployment failure.

## Detection

The issue was reported from staging during manual validation. A key observation
was that setting the in-app motion blur slider to zero did **not** eliminate the
corruption, which ruled out a simple default-slider-value fix.

## Root cause

The postprocessing chain always appended Three.js `AfterimagePass` after render
and bloom. The controller treated `damp = 1` as disabled, but Three's
`AfterimageShader` multiplies the previous frame by `damp` and combines it with
the new frame, so larger damp values preserve more history. Intensity zero was
therefore mapped to maximum history retention, and the pass remained enabled with
stale feedback render targets. Orthographic zoom/projection changes then mixed
old full-scene projections with the new camera frame.

## Corrective action

- Remapped motion blur intensity so zero maps to `damp = 0` and nonzero values
  scale upward toward the configured maximum damp.
- Disabled `AfterimagePass` entirely at intensity zero so it is a true no-op.
- Added afterimage history reset support and clear retained feedback buffers when
  intensity changes to/from zero or when camera zoom/projection/pan changes.
- Started the default immersive experience with motion blur off while preserving
  the slider as an opt-in trail effect.

## Regression tests

- Vitest coverage now verifies zero intensity disables the pass, invalid values
  clamp safely, damp mapping follows Three's retention semantics, and history
  reset clears retained render targets.
- Playwright zoom coverage loads
  `/?mode=immersive&disablePerformanceFailover=1`, confirms immersive mode stays
  active with a single canvas, performs repeated zoom in/out, toggles motion blur
  from nonzero back to zero, and verifies the afterimage pass is disabled.

## Deployment and validation notes

Validate the patch on staging with:

```bash
npm run format:write
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e -- --grep "zoom"
npm run smoke
```

After deployment, manually open
`https://staging.danielsmith.io/?mode=immersive&disablePerformanceFailover=1`,
zoom in and out with the mouse wheel, set motion blur to zero, and repeat zooming
to confirm clean frames without duplicated geometry or text fallback.
