# Sugarkube panel duplicated model triangle details

## Symptom

The Sugarkube POI panel displayed a `Model` metric containing the model triangle
count in its ordinary metadata list. The same diagnostic value is intended to be
available only in the bottom debug details section when Settings → Debug
coordinates is enabled.

## Root cause

Commit `803b3bbd0898970a345aa12521f49feae51457c7` (`📊 : – report active
Sugarkube model triangles`, committed 2026-06-23) added runtime logic that read the
registered Sugarkube model triangle count and appended or updated a `Model` metric
on the POI definition. This was separate from the existing debug-details provider,
so the value appeared in both the normal metadata list and the debug section.

The environment-badge PR did not introduce this mutation; the regression was
revealed after the related deployment.

## Corrective action

- Remove the Sugarkube-specific runtime mutation of the normal POI metrics.
- Keep model-root registration and triangle counting intact for diagnostics.
- Keep the overlay debug provider and Settings → Debug coordinates behavior intact.
- Add regression coverage ensuring Sugarkube has no normal `Model` metric while its
  debug triangle value remains available when diagnostics are enabled.

## Validation steps

Open `/?mode=immersive&disablePerformanceFailover=1`, inspect Sugarkube with Debug
coordinates disabled, and confirm the main metadata list has no `Model` or
`triangles` row. Enable Settings → Debug coordinates and confirm the triangle count
appears in the bottom debug details section.

## Validation commands

- `npm run format:write`
- `npm run lint`
- `npm run test:ci`
- `npm run docs:check`
- `npm run smoke`
