# Career museum content and interaction contract

The basement museum uses the reviewed dates and provenance in
[`src/assets/careers.ts`](../../src/assets/careers.ts) and the localized copy in
[`src/assets/i18n/careers.ts`](../../src/assets/i18n/careers.ts). The locale builder
produces the text-only work timeline from that same source. Career POIs use the
`career` discriminant and never receive project status badges, deployment
locations, repository owners, GitHub metrics, or project structured-data entries.

## Public content and provenance

The Southern Mississippi, Naval Research Laboratory, and YouTube entries follow
the August 2026 résumé. Muon Space uses the owner-confirmed role, team, and start
date, with the approved modest responsibility wording and the specified public
role posting. A role posting is not evidence of completed achievements.

Every locale, including the pseudo-locale, contains the full career descriptions,
illustrative-model notes, source-link labels, and personal-portfolio disclaimer.
The exact English disclaimer is visible DOM text in both the Muon details and
its text-only timeline entry:

> This is my personal portfolio. The views and content here are my own and do not
> represent Muon Space.

## Original assets and collision

All museum models are original procedural geometry authored for this repository,
using the repository's MIT license. No downloaded models, logos, mascots,
wordmarks, institutional graphics, internal dashboards, operational data, or
proprietary spacecraft geometry are used.

- Southern Mississippi: generic black-and-gold phones and tablets, plus a laptop
  with an original phone-simulator screen
- Naval Research Laboratory: an illustrative aquarium with static fish, bubbles,
  and an inert decorative mine-shaped prop, alongside a generic processing display
- YouTube: a sculptural display table with a red accent and illustrative status
  bars, without internal data or implied performance statistics
- Muon Space: a generic CubeSat and static orbit motif, without a specific
  spacecraft replica or internal interface

Stand footprints are 4.8 × 3.0 world units. The aquarium and furniture block
walking; tabletop devices, water, fish, bubbles, plaques, artwork, and small
visual details are explicitly decorative. Avatar-height interaction anchors are
independent of model tops. The level provides placement; the builder takes world
coordinates without scaling elevations or scaling X/Z a second time.

The exhibits and furnishings share unit primitive geometry and a small palette.
Display-style plaque targets reuse the shared geometry and retain static short
title textures. Selected titles and full detail copy use the existing tooltip
system. There are no new animation loops, dynamic display textures, aquarium
refraction, or lights. Disposal releases instanced allocations, shared geometry,
materials, and current plaque textures exactly once; locale updates release
replaced plaque textures immediately.

## Verification

Focused unit and DOM coverage:

```bash
npx vitest run src/scene/poi/__tests__/careerContent.test.ts \
  src/scene/structures/__tests__/careerMuseum.test.ts \
  src/tests/poiTooltipOverlay.test.ts src/tests/githubPoiMetrics.test.ts \
  src/tests/poiStructuredData.test.ts src/tests/i18n.test.ts \
  src/tests/textFallbackAccessibility.test.ts
```

Browser coverage uses normal keyboard selection, native touch taps, native
locale controls, and the documented text-mode transition. The fresh-spawn routes
use the real collision path, including the museum perimeter and every exhibit
approach; they do not teleport across a passage. Run the combined regression set:

```bash
npm run test:e2e -- playwright/immersive-basement-roundtrip.spec.ts \
  playwright/immersive-career-museum.spec.ts \
  playwright/immersive-stairs-roundtrip.spec.ts \
  playwright/keyboard-traversal.spec.ts playwright/small-screen-hud.spec.ts \
  --workers=1 --retries=0 --trace=retain-on-failure
```

Review artifacts use each test's output directory. Capture all four model/detail
views, the wide-zoom gallery view, Muon's visible disclaimer on the phone layouts,
all-floor visibility, and the post-route renderer counters. The display plaques
have nonblocking pointer/touch targets while their underlying stands stay solid.
Closing a detail restores canvas focus; a keyboard-opened panel must not lose its
selection when the panel appears beneath the stationary pointer.

The suite covers 1280×720, 1600×900, 390×844, 360×640, and 844×390, with reduced
motion, high contrast, DOM accessibility checks, and every locale including
pseudo. It separately records a bounded repeated-route residency probe and
verifies release of the museum build during text transition. The unchanged
numeric ceilings are launch gates; later resident counts are measured and
compared with matching profiles, not silently treated as new launch failures.
No software-renderer test establishes hardware timing.

The complete basement acceptance gate remains the actual runtime down/up journey
and exhibit approaches,
including keyboard/touch selection, hidden-floor filtering, focus restoration,
mobile dismissal, reduced motion, and accessibility checks. Measure the entire
scene and post-route resident resources; builder-only counters cannot establish
that the unchanged launch budgets are met. Retain owner review separately from
software-renderer functional evidence.
