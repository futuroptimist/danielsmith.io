# danielsmith.io changelog

Release notes for the immersive danielsmith.io portfolio. The in-app link currently points to
this repository Markdown page as a temporary wiki/documentation surface; a native changelog view
may replace it in a future release.

## v0.1.3 — current release candidate

Reconstructed from the current `main` tip, `c40dff25`, because no `v0.1.3` tag exists yet.

- Added localized POI environment badges and assistive-technology descriptions.
- Removed a duplicate Sugarkube triangle metric and narrowed its regression assertion.
- Added the runtime changelog link and matching build identity to Settings & Help and text-only
  mode.
- Updated the Helm application version to `0.1.3` and chart package version to `0.2.7`.

Reference: [`c40dff25`](https://github.com/futuroptimist/danielsmith.io/commit/c40dff25).

## v0.1.2 — reconstructed release

No `v0.1.2` tag is present in the fetched repository. This section is reconstructed using the
release merge candidate `2ffca754` (`Merge pull request #1067 ...`), where the chart application
version became `0.1.2`.

- Added environment and immutable image-tag identity to the Settings & Help footer.
- Added deploy-time build-info rendering and runtime asset seeding for staging and production.
- Fixed Helm chart versioning and runtime build-info mount behavior.
- Prevented arrow keys from also cycling POI panels.
- Added the static-site observability contract and supporting deployment checks.
- Hardened GitHub metrics cache behavior and CI workflow permissions.

Reference: [`2ffca754`](https://github.com/futuroptimist/danielsmith.io/commit/2ffca754).

## v0.1.1 — reconstructed release

No `v0.1.1` tag is present in the fetched repository. This section is reconstructed using the
release merge candidate `7b9c58c9` (`Merge pull request #1057 ...`), where the chart application
version became `0.1.1`.

- Added the tutorial panel, persisted tutorial progress, action tracking, and completion states.
- Improved HUD focus behavior, keyboard interaction, controls parity, and settings layout.
- Added localized HUD/settings copy and expanded locale coverage.
- Removed retired narration and guided-tour behavior.
- Added accessibility refinements and browser/regression coverage for the tutorial experience.
- Established the first release housekeeping and Helm chart versioning groundwork.

Reference: [`7b9c58c9`](https://github.com/futuroptimist/danielsmith.io/commit/7b9c58c9).

## v0.1.0 — tagged baseline

The initial tagged release is [`v0.1.0`](https://github.com/futuroptimist/danielsmith.io/releases/tag/v0.1.0),
pointing to commit `316c0b61`. It established the immersive portfolio, accessible text fallback,
portfolio content surfaces, keyboard navigation, and the initial deployment/chart foundation.

Reference: [`316c0b61`](https://github.com/futuroptimist/danielsmith.io/commit/316c0b61).
