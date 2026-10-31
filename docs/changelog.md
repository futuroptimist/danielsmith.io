# danielsmith.io changelog

Release notes for the immersive danielsmith.io portfolio. The in-app link currently points to
this repository Markdown page as a temporary wiki/documentation surface; a native changelog view
may replace it in a future release.

## v0.3.2 - unreleased

- Doubled the portfolio tabletop and miniature while retaining the 1.25 m display
  surface and grounded stand, with matching collision bounds and kitchen approaches.
- Registered its model collider before marker-only fallbacks, removing the oversized
  invisible marker blocker from the table's four approaches.

- Added standard-mapped gamepad movement, camera pan, trigger zoom and nearby interaction,
  with a dedicated Gamepad controls HUD category and safe neutralization after focus loss.
- Keyboard, pointer, touch and accessible text alternatives remain available.

- Increased running speed by 40%, from 3.044872 to 4.262821 metres/second,
  while preserving walking at 1.116453 metres/second, its footstep cadence, volume
  and pitch, and existing gait controls.
- Raised the run-animation playback cap proportionally so stride cadence tracks
  the faster translation. Room geometry and collision clearances are unchanged.
- Batched animated flywheel packet connectors and equal-opacity node pairs to reduce
  draw calls without changing packet geometry, timing, or transparency.
- Advanced application metadata to `0.3.2` and chart packaging to `0.2.14`.
  These versions do not imply a tag, release, or deployment.

## v0.3.1 - unreleased

- Added source-linked exterior measurements that distinguish actual street meshes,
  conservative colliders, anchors and activation regions without changing appearance
  or movement. Corrected garage scale documentation and added geometry regressions.
- Advanced application metadata to `0.3.1` and chart packaging to `0.2.13`.
  These versions do not imply a tag, release or deployment.

## v0.3.0 - unreleased

- Reduced horizontal room area by 50% on all three floors while preserving room
  proportions, 2.74 m ceiling clearance, avatar height and furniture sizes.
  Repositioned furnishings and adjusted door approaches so the smaller house
  retains its stair connections and accessible exhibits.
- Preserved the faster running speed and smooth avatar loading introduced in
  `0.2.1` and `0.2.2`. Exhibit size changes remain separate.
- Advanced application metadata to `0.3.0` for the substantial house layout change
  and chart packaging to `0.2.12`; these versions do not imply a tag or deployment.

## v0.2.2 - unreleased

- Smoothed the animated avatar's arrival with a muted position cue and a short fade,
  including enabled accessories, without restoring the obsolete avatar flash.
- Preserved movement and Caps Lock gait through loading, along with failure recovery,
  retry, late loading success, and reduced-motion behavior. The faster running speed
  introduced in `0.2.1` remains unchanged.
- Advanced application metadata to `0.2.2` for this compatible loading fix and chart
  packaging to `0.2.11`. These versions do not imply a tag, release, or deployment.

## v0.2.1 - unreleased

- Increased the character's running speed by 20%, from 2.537393 to 3.044872 metres/second,
  while preserving walking at 1.116453 metres/second and the Caps Lock controls
  (off runs by default; on walks).
- Matched the running animation cadence to the faster movement and retained camera-relative
  movement, collision-safe traversal, door timing, and reduced-motion behavior.
- Advanced application metadata to `0.2.1` for this compatible movement adjustment and chart
  packaging to `0.2.10`. These versions do not imply a tag, release, or deployment.

## v0.2.0 - unreleased

This application version reconciles the substantial merged changes since `v0.1.3`.
The milestones below are **reconstructed source history**, not intervening numbered
releases or deployment records. They cover
[`v0.1.3...8073116c`](https://github.com/futuroptimist/danielsmith.io/compare/v0.1.3...8073116c),
the main snapshot inspected on 2026-10-11. Dates group source work; screenshot/artifact
automation sometimes committed the following UTC day. Open PRs are excluded.

- Established the application-version/changelog guard and shared agent/release guidance.
- Advanced application metadata to `0.2.0` and the immutable chart package to `0.2.9`.
  The private npm package remains `0.1.0`; image identity remains `main-<shortsha>`.

### October 9-11: avatar, exhibits, and room calibration

- Added the animated Daniel avatar, gait controls, accessories, collision-aware chair
  seating, and GPU preparation before display
  ([#1127](https://github.com/futuroptimist/danielsmith.io/pull/1127)).
- Prevented the obsolete avatar from flashing during loading
  ([#1134](https://github.com/futuroptimist/danielsmith.io/pull/1134)); normalized avatar
  dimensions and unified Caps Lock gait with accessible/localized controls
  ([#1133](https://github.com/futuroptimist/danielsmith.io/pull/1133)).
- Added the recursive property miniature, basement woodworking display, and Aquiloop
  aquarium simulation with batched animals and lifecycle coverage
  ([#1129](https://github.com/futuroptimist/danielsmith.io/pull/1129),
  [#1131](https://github.com/futuroptimist/danielsmith.io/pull/1131),
  [#1132](https://github.com/futuroptimist/danielsmith.io/pull/1132)).
- Calibrated room assemblies, mirror bounds, stair samples, and miniature table supports
  against measured avatar dimensions
  ([#1135](https://github.com/futuroptimist/danielsmith.io/pull/1135)).
- Documented neighborhood expansion/exploration and staged lighting-fidelity designs.
  These are plans, not claims that the proposed neighborhood or lighting stages shipped
  ([#1128](https://github.com/futuroptimist/danielsmith.io/pull/1128),
  [#1130](https://github.com/futuroptimist/danielsmith.io/pull/1130)).

### October 1-6: connected house and career museum

- Designed the house expansion, then implemented floor connections, basement stairs,
  the accessible career museum, front entry and yard, garage door loop, and residential
  street with a coming-soon stop. Added native-input traversal, localized door status,
  resource cleanup, and repeatable performance/capture coverage
  ([#1111](https://github.com/futuroptimist/danielsmith.io/pull/1111),
  [#1118](https://github.com/futuroptimist/danielsmith.io/pull/1118),
  [#1119](https://github.com/futuroptimist/danielsmith.io/pull/1119),
  [#1120](https://github.com/futuroptimist/danielsmith.io/pull/1120),
  [#1122](https://github.com/futuroptimist/danielsmith.io/pull/1122),
  [#1123](https://github.com/futuroptimist/danielsmith.io/pull/1123),
  [#1124](https://github.com/futuroptimist/danielsmith.io/pull/1124)).
- Updated the October resume and Muon Space location
  ([#1121](https://github.com/futuroptimist/danielsmith.io/pull/1121),
  [#1125](https://github.com/futuroptimist/danielsmith.io/pull/1125)).
- Made decorative point lights honor performance-mode policy
  ([#1126](https://github.com/futuroptimist/danielsmith.io/pull/1126)).

### September 15-19: diagnostics and repeatable verification

- Added visitor-journey assertions and hardened cancellation/fixture controls
  ([#1092](https://github.com/futuroptimist/danielsmith.io/pull/1092)).
- Added bounded GitHub cache health telemetry, retained-data freshness handling, and
  validated browser diagnostics; chart packaging advanced to `0.2.8` while appVersion
  stayed `0.1.3`
  ([#1098](https://github.com/futuroptimist/danielsmith.io/pull/1098),
  [#1104](https://github.com/futuroptimist/danielsmith.io/pull/1104)).
- Added and hardened controlled browser performance results and artifact export
  ([#1101](https://github.com/futuroptimist/danielsmith.io/pull/1101),
  [#1107](https://github.com/futuroptimist/danielsmith.io/pull/1107)).

### August 4-25: resume and review tooling

- Refreshed the August resume, strengthened outcomes/project links, corrected metrics
  and factual wording, and verified generated DOCX/ATS artifacts
  ([#1079](https://github.com/futuroptimist/danielsmith.io/pull/1079),
  [#1088](https://github.com/futuroptimist/danielsmith.io/pull/1088),
  [90dde592](https://github.com/futuroptimist/danielsmith.io/commit/90dde592)).
- Hardened the configured Claude review workflow, corrected sandbox/dependency setup,
  and documented its authentication configuration
  ([#1075](https://github.com/futuroptimist/danielsmith.io/pull/1075),
  [#1076](https://github.com/futuroptimist/danielsmith.io/pull/1076),
  [#1082](https://github.com/futuroptimist/danielsmith.io/pull/1082),
  [#1083](https://github.com/futuroptimist/danielsmith.io/pull/1083)).
- CI refreshed launch screenshots and resume artifacts during this interval; those
  commits alone are not application releases or staging/production evidence.

### Release evidence boundary

At reconstruction time, Git tags existed through `v0.1.3`; the GitHub Releases API
returned no release objects. No retroactive tags or releases were created. This entry
does not assert that `0.2.0` is deployed. Follow the
[release policy](ops/versioning.md) and [promotion runbook](ops/sugarkube-release.md)
for separately approved staging and production validation.

## v0.1.3 - tagged source milestone

Tag [`v0.1.3`](https://github.com/futuroptimist/danielsmith.io/tree/v0.1.3) points to
`73e09e94`. The source notes are reconstructed
from baseline commit `c40dff25`, the last `main` revision before this release-preparation work, plus
the changes listed here.

- Added localized POI environment badges and assistive-technology descriptions.
- Removed a duplicate Sugarkube triangle metric and narrowed its regression assertion.
- Added the runtime changelog link and matching build identity to Settings & Help and text-only
  mode.
- Updated the Helm application version to `0.1.3` and chart package version to `0.2.7`.

Reference: [`v0.1.3`](https://github.com/futuroptimist/danielsmith.io/tree/v0.1.3),
[`73e09e94`](https://github.com/futuroptimist/danielsmith.io/commit/73e09e94).

## v0.1.2 - tagged source milestone

Tag [`v0.1.2`](https://github.com/futuroptimist/danielsmith.io/tree/v0.1.2) points to
`2ffca754` (`Merge pull request #1067 ...`), where the chart application version became `0.1.2`.

- Added environment and immutable image-tag identity to the Settings & Help footer.
- Added deploy-time build-info rendering and runtime asset seeding for staging and production.
- Fixed Helm chart versioning and runtime build-info mount behavior.
- Prevented arrow keys from also cycling POI panels.
- Added the static-site observability contract and supporting deployment checks.
- Hardened GitHub metrics cache behavior and CI workflow permissions.

Reference: [`v0.1.2`](https://github.com/futuroptimist/danielsmith.io/tree/v0.1.2),
[`2ffca754`](https://github.com/futuroptimist/danielsmith.io/commit/2ffca754).

## v0.1.1 - tagged source milestone

Tag [`v0.1.1`](https://github.com/futuroptimist/danielsmith.io/tree/v0.1.1) points to
`7b9c58c9` (`Merge pull request #1057 ...`), where the chart application version became `0.1.1`.

- Added the tutorial panel, persisted tutorial progress, action tracking, and completion states.
- Improved HUD focus behavior, keyboard interaction, controls parity, and settings layout.
- Added localized HUD/settings copy and expanded locale coverage.
- Removed retired narration and guided-tour behavior.
- Added accessibility refinements and browser/regression coverage for the tutorial experience.
- Established the first release housekeeping and Helm chart versioning groundwork.

Reference: [`v0.1.1`](https://github.com/futuroptimist/danielsmith.io/tree/v0.1.1),
[`7b9c58c9`](https://github.com/futuroptimist/danielsmith.io/commit/7b9c58c9).

## v0.1.0 — tagged baseline

The initial tagged baseline is [`v0.1.0`](https://github.com/futuroptimist/danielsmith.io/tree/v0.1.0),
pointing to commit `316c0b61`. It established the immersive portfolio, accessible text fallback,
portfolio content surfaces, keyboard navigation, and the initial deployment/chart foundation.

Reference: [`316c0b61`](https://github.com/futuroptimist/danielsmith.io/commit/316c0b61).
