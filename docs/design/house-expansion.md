# House expansion: career museum and residential exterior

## Status and approval boundary

This is a design proposal, not an implementation. The first pull request changes
only this document. Stop after making that design pull request reviewable and
wait for explicit design approval before creating implementation changes.

After approval, deliver small, sequential, stacked draft pull requests with the
checks and evidence described below. Keep the entire stack available for final
human review. Do not merge, enable auto-merge, or deploy it.

The visitor journey is:

1. Explore the existing ground and upper floors without losing any current routes.
2. Walk down a new staircase into a large career museum and back up again.
3. Inspect four career exhibits with the same quality of keyboard, touch, and text
   access as existing project exhibits.
4. Only after basement traversal and exhibits pass their acceptance gate, add the
   front entrance, yard, sidewalk, attached garage, driveway, and residential street.
5. Walk between the house and garage, operate the garage door, and walk outside to
   a parked futuristic electric sedan, shielded streetlamps, and a future bus stop.

The exterior follows the current stylized isometric house. A broader redesign of
the entire house as a 2040 home is outside this proposal. The sedan is a static
2040-inspired prop; driving, traffic simulation, transit service, and a working
bus are also outside scope. Future bus-stop fast travel to a remote location is
explicitly out of scope. Reserve a stable bus-stop interaction ID and optional
future destination reference; current behavior is only the Coming Soon message,
with no travel system, loading transition, or remote scene.

## Current implementation and constraints

The inspected baseline is commit `cecc389dd264116fffc7f9b443f153fc8f59de20`.
There are no repository-local `.agents/skills` in that checkout.

- The runtime is Vite, TypeScript, and plain Three.js. `src/main.ts` is a small
  bootstrap; scene orchestration lives in `src/immersiveScene.ts`. Do not introduce
  React Three Fiber, a new physics engine, or another state library for this work.
- [The declarative level](../../src/scene/level/portfolioLevel.ts) owns rooms,
  current wall runs and openings, floor surfaces, scene-object placement, and
  stable source IDs. Continue the
  [source-of-truth design](declarative-level-source-of-truth.md), including explicit
  collision policies. Do not add obsolete walls and remove them with skip lists.
- Author plan X/Z coordinates in level units and convert through
  `FLOOR_PLAN_SCALE` exactly once. The present scale is approximately two.
  Elevations are already world units; do not scale them a second time.
- [Floor elevations](../../src/scene/level/floorElevations.ts) currently contain
  ground `0` and upper `5`. The movement `FloorId` union, visibility controller,
  POI floor resolver, nav-mesh maps, collider maps, debug tools, and test helpers
  all assume two floors. Adding a floor to source data alone is insufficient.
- [Stair rendering](../../src/scene/structures/staircase.ts) already accepts a
  base position, direction, tread dimensions, landing, guards, and supports.
  [Stair layout](../../src/systems/movement/stairLayout.ts) derives landing,
  guard, and opening bounds from the same measurements.
- [Stair movement](../../src/systems/movement/stairs.ts) contains the important
  behavior to preserve: named transition zones, an inset intentional-descent
  corridor, off-stair floor retention, and a smooth landing-lip height blend.
  Its height sampler currently clamps relative ramp height to a zero-based upper
  floor; it does not support a negative basement elevation directly.
- Runtime movement checks X and Z separately against the predicted floor's
  navigation rectangles and circular-avatar/AABB collisions. The avatar radius
  is `0.75` world units. Rendered step colliders are not a replacement for the
  traversable ramp and boundary policy.
- The orthographic camera follows the avatar's X/Y/Z and retains a fixed
  isometric orientation. Movement and facing must remain camera-relative.
  Initial framing is derived from the current ground plan, so exterior bounds
  must not unintentionally shrink the avatar or reframe the initial interior.
- [Floor visibility](../../src/scene/floors/visibilityController.ts) currently
  hides the opposite floor's meshes, LEDs, markers, and visited states. Inactive
  career content must also be excluded from raycasts, keyboard selection, and
  active tooltips.
- Doorways currently provide openings and trim, not a reusable operable-door
  state machine. The exterior adds that behavior explicitly.

## Spatial proposal

### Basement and stair reservation

Add `basement` at a proposed elevation of `-5` world units. Keep a single spacious
museum beneath the existing house, with a generous perimeter circulation loop,
four clearly separated exhibits, central tables, benches, plants, and wall decor.
The basement should feel like a curated room rather than a row of floating icons.

Reserve a distinct stair connection near the existing stair core, west of the
upstairs run. Do not overlap the two stair transition corridors. A starting
layout for graybox validation, in **level units**, is:

- New stair center X `1.9`, width `2.4`, with the lower entrance at Z `-14.65`
- Rise toward positive Z to the ground handoff at Z `-7.0`
- Ground landing extends to Z `-4.4`, remaining inside the living room
- Basement museum broad bounds X `[-16, 16]`, Z `[-18, 8]`

The extended museum edge leaves room for a lower-nose turning pad; keeping the
old Z `-16` edge would leave only `2.7` world units before wall/clearance deductions.
The narrow gap between parallel stair runs is not a designated walking route;
approach each opening from its landing instead of creating a squeeze-through.

These coordinates are a candidate reservation, not certified collision clearance.
Before accepting them, run source/geometry and reachability audits against current
furnishings, the spawn, both upstairs guard sets, and all POI approaches. Reserve
at least `2.5` world units of clear circulation and `3`-unit turning pads; measure
clearance after expanding obstacles by the avatar radius. Adjust the reservation
rather than weakening existing upstairs safety guards. If a current prop needs
relocation, show that change explicitly in the graybox review.

The ground opening must visibly reveal the descending treads. Its landing, trim,
railings, floor cutout, nav areas, and safety colliders must all derive from one
connection definition. There must be no opaque slab over the ramp, invisible
wall at either lip, side entrance through a railing, or floor change caused by
walking alongside the opening.

### Front entrance and street orientation

Use the existing camera projection to interpret the requested front door:
below the stairwell on the bottom-right side of the normal view. The candidate
facade is the ground floor's positive-X wall. Start the entry study near level
X `16`, Z `-7.5`, then verify its screen-space placement in the graybox walkthrough.
The current selfie mirror is nearby; preserve its approach or explicitly relocate
it rather than opening a door through its collider.

Lay out the exterior as connected, flat ground-floor zones:

- A front path crosses a modest planted yard and reaches a continuous sidewalk
- An attached garage sits alongside the house, with a pedestrian connection into
  the house and an operable vehicle door facing its driveway
- The driveway meets the street without blocking the sidewalk's walking lane
- The sedan is parked clear of the garage aperture, sidewalk, and turning areas
- At least three evenly spaced streetlamps illuminate sidewalk/curb zones
- A bus stop further along the sidewalk has a conspicuous, readable `Coming Soon`
  sign, a bench, and a small shelter or signpost consistent with the house style
- Landscaping or explicit boundary geometry ends the walkable scene naturally;
  the unfinished bus route must not lead into a void

Represent yard, sidewalk, driveway, garage, and street as explicit semantic zones
and surfaces. They share ground elevation rather than inventing an extra floor
for the exterior. Preserve current backyard routes and fences unless a specific
connection is deliberately authored.

## Reusable movement and floor architecture

Introduce a small explicit floor-connection model before adding basement content.
A stair connection owns a stable ID, lower/upper floor IDs, lower/upper world
surface elevations, geometry/layout, behavior margins, and its visual/nav/safety
source identities. A floor registry owns floor elevation, plan, visual groups,
lighting groups, collision collection, and navigation mesh.

Generalize the existing algorithm rather than replacing it:

- Resolve only connections adjacent to the current floor
- Preserve an active connection ID and descent-origin context while on a ramp
- Use lower/upper roles local to a connection; ground is the lower role for the
  existing upstairs stairs and the upper role for basement stairs
- Add the lower-floor elevation to relative ramp samples, clamp between the
  connection's two elevations, and preserve the landing-slab/lip behavior
- Outside an explicit transition zone, retain the current floor and sample its
  own elevation, including negative values
- Never choose a stair solely because its X/Z projection is nearby
- Assign visibility to connections separately from floor groups: keep a stair and
  its rails visible across its own handoff, but hide unrelated connections on
  nonadjacent floors. The current stairs are attached directly to the scene;
  three-floor tests must prevent floating upstairs stairs above the basement
- Generalize safety geometry for both directions as well as both floor roles.
  The current lower-corner guard degenerates to zero Z extent for positive-Z
  ascent; require positive-area guard bounds and mirrored side/back-entry tests
- Keep collision-floor handoff, surface-height context, visual visibility, POI
  filtering, and debug state synchronized on every movement step
- Replace binary `ground ? ... : upper` fallbacks with explicit registry lookups;
  reject unknown floor IDs rather than silently showing the upper or ground floor

Do not reorganize the whole scene module in the same change. Extract only the
floor/connection decisions needed to support this feature, with adapter coverage
that proves the existing upstairs behavior is unchanged.

Expose deterministic, read-only debug snapshots for all connections and floors.
Existing test helpers may keep compatible calls while gaining an optional
connection ID. Tests must still drive real runtime movement, not assert a result
created by `setActiveFloor` or `movePlayerTo` at the destination.

## Museum exhibits and content model

Career exhibits use the existing POI selection, tooltip, visited, and accessible
presentation concepts, but have their own discriminated content schema. Do not
put employers into the project/repository registry and give them GitHub stars.

The shared presentation contract contains identity, title, room/floor placement,
interaction anchors, summary, and links. A `career` variant adds organization,
role, team when applicable, date range, responsibility text, and provenance. A
`project` variant retains repository metrics and deployment links. Keep the
GitHub metrics loader, project structured data, and external repository actions
explicitly limited to project entries. Career entries have no fabricated metrics,
repository owner, deployment environment, or project prototype/live badge.

Use one reviewed career data source for museum details and the accessible work
timeline. All new UI strings pass through the existing locale structure, including
the pseudo-locale. Preserve localized layouts and text fallback parity; a visitor
must not have to enter WebGL to read any career content.

### Exhibit treatments

- **The University of Southern Mississippi:** a black-and-gold display table,
  an original miniature campus/iOS development vignette, and an official eagle
  graphic only if its permitted use is established. A restrained text plaque
  and original gold sculpture are the fallback.
- **Naval Research Laboratory:** a decorative aquarium on a sturdy museum stand,
  with a stylized inert mine-shaped prop inside and an adjacent data-processing
  display. The tank/stand is solid; fish, bubbles, water, and the internal prop
  are decorative. Use a simple tinted water surface, no expensive refraction.
  The scene is illustrative, not a claim about a specific research assignment,
  weapon design, capability, deployment, or achievement.
- **YouTube:** a sculptural video-display table with a red accent and an abstract
  reliability/status visualization. Any chart is clearly illustrative and does
  not reproduce internal dashboards or imply new performance statistics.
- **Muon Space:** a stylized generic CubeSat on the basement display table,
  with an orbit/mission-planning motif and a quiet cyan accent. The CubeSat is an
  illustrative model, not a replica of a specific Muon spacecraft. Represent the
  public role at a high level, using no
  proprietary spacecraft geometry, operational data, or internal interface.

Keep in-world labels short and use accessible detail overlays for longer copy,
matching existing POIs. Give each exhibit a reachable interaction anchor at avatar
height plus its floor elevation; do not measure approach distance from the top of
a tall model. Tables, tanks, benches, vehicles, and shelter supports block walking;
small table-top details remain explicitly decorative.

### Personal-portfolio disclaimer

Show this accessible text in the Muon career POI details and the corresponding
text-only career entry:

> This is my personal portfolio. The views and content here are my own and do not
> represent Muon Space.

Keep it readable DOM text, included in the localized content and screen-reader
reading order. It must not exist only as a 3D texture, image, hover hint, or hidden
footer. Verify the exact English wording and equivalent localized meaning on
both surfaces, including mobile and text fallback. This is a public content
requirement, not a claim of legal certification.

### Public career facts and editorial limits

The August 2026 [resume source](../resume/2026-08/resume.tex) already supports:

- Southern Mississippi: Software Developer, March 2014–December 2016;
  Objective-C content delivery/networking for university iOS applications
- Naval Research Laboratory: Computer Scientist, January 2017–September 2018;
  C++/Qt research data-processing applications, releases, demos, documentation
- YouTube (Google): Site Reliability Engineer, September 2018–May 2025;
  product-health metrics, automation, on-call, incident response, and mentoring

The owner has confirmed Muon Space: Senior Software Engineer, September
2026–present, Mission Planning Platform team. Responsibilities may draw only on
[the specified public role posting](https://job-boards.greenhouse.io/muonspace/jobs/5083758007),
using modest present-tense new-role language. Proposed copy for review:
"Contributing to cloud-based mission planning and control software on the Mission
Planning Platform team." The public posting names Ground Software; the more
specific team label comes from the owner’s confirmation, not the posting.
A job posting describes a role, not
proof that an employee has delivered every listed responsibility. Do not invent
completed achievements, ownership, results, technologies used personally,
compensation, clearance, or unpublished details. Do not substitute a similarly
named flight-dynamics posting if the specified source is unavailable.

The current English text-fallback timeline differs from the resume in some role
labels and summary wording. Reconcile these deliberately to the reviewed career
source; avoid preserving stale titles in another surface or mechanically rewriting
historical archive files.

## October 2026 resume iteration

After design approval, create `docs/resume/2026-10/resume.tex` from the latest
August source and add the reviewed Muon entry. Keep older dated sources immutable.
Review the independent-work date range separately: joining Muon does not prove
that open-source work ended. Do not infer an end date or remove it silently.

Preserve the one-page target by concise editing rather than making the text
unreadably small. Update the README's active source reference, review
`docs/resume/ats-smoke.json`, and run the existing PDF/DOCX render and extraction
gates. Keep runtime links at `/resume.pdf`, with `/resume.docx` available where
appropriate. Do not manually change generated public binaries in this stack.

The resume workflow builds PR artifacts, and its main-branch publishing job
updates the stable aliases after a later human merge. A design or source PR is
not a published resume. Check the actual generated PDF and DOCX pages, metadata,
contact/project hyperlinks, text extraction, date/role pairing, and page count.
Do not count unit tests that skipped missing TeX/Word tools as successful render QA.

## Asset provenance and visual style

Reuse the house's low-poly construction, slate/wood materials, warm practical
lighting, muted vegetation, rounded HUD language, and restrained colored accents.
The museum is slightly warmer and more gallery-like, with enough contrast to read
stairs and thresholds. The exterior extends that palette rather than replacing it
with photorealism or an unrelated cyberpunk scene.

Prefer original procedural Three.js geometry and shared materials. Record source
URL, creator, rights/permission, attribution, and any allowed transformations for
third-party assets before committing them. Repository MIT licensing does not
relicense an employer's logo or downloaded model.

The official [Southern Miss athletics brand guide](https://southernmiss.com/documents/download/2025/9/25/USM_BrandingGuide_Updated2024.pdf)
requires correct colors/proportions, protected space, the eagle's white outline,
and its registration mark, and restricts unauthorized non-athletics usage. The
[institutional logo page](https://www.usm.edu/university-communications/university-logo.php)
is a different asset family and does not establish permission for the eagle.
Use an official supplied asset only after permission for this portfolio use is
established. Do not trace, recolor, mirror, distort, or invent an "official" eagle.
Display any approved logo unmodified on a plane; the surrounding exhibit provides
the depth. The fallback keeps implementation independent of a licensing delay.

Use an original, unbranded 2040-inspired electric sedan: smooth low-poly body,
closed grille, restrained light bar, recognizable four-door proportions, and
simple wheels. It remains parked and solid. No third-party vehicle model or brand
license is needed for an original design.

## Doors and interaction state

Build one small reusable door controller for the front door, house/garage
pedestrian door, and garage door. Each door has a source ID, current progress,
requested target, explicit closed/opening/open/closing state, threshold safety
region, visual transform, collision policy, and accessible status.

- Use the existing remappable interact action and pointer/touch conventions,
  plus a properly labeled DOM control near the selected door
- Derive the visual panel and blocking state from one authoritative progress
  value, not independent timers
- Keep a door blocking until its aperture clears the avatar, including radius
  and headroom; an overhead garage door is not walkable just because its mesh
  starts moving upward
- Never close or enable a blocking collider around an avatar in the threshold or
  panel sweep; hold/reopen and announce that the doorway is occupied
- Coalesce repeated same-target activation; reversing direction mid-animation
  continues from current progress without a jump, duplicate animation, or stale
  completion callback
- Allow operating the relevant door from both sides. Prevent through-wall remote
  activation and keep inactive-floor interaction disabled
- Prefer a sliding front/pedestrian treatment if it fits the current style and
  avoids introducing rotating collision geometry; model its lateral pocket as
  current geometry, with a clear opening at full travel
- Closing a POI or settings overlay restores appropriate focus and movement
  control; UI key presses must not also walk the avatar or activate two doors
- Reduced-motion mode reaches the same logical state immediately while preserving
  all occupancy guards. Door state is session-local initially; reload restores a
  safe spawn and known closed state rather than trapping a saved position

A visible garage connects three genuinely walkable regions: driveway, garage
interior, and house. Test the complete loop in both directions. A door animation
without successful traversal does not satisfy the feature.

## Camera, lighting, accessibility, and performance

Retain the current orthographic camera and avatar-relative movement. Extend
per-zone bounds without changing initial avatar framing. Check basement height
following, return-to-ground height, pan/zoom near every door, and garage/roof
occlusion. Use the existing cutaway/active-floor visual approach so ceilings or
the house shell do not hide the avatar or doorway while inside.

Streetlamps must cast light **only downward**. Use at least three visible opaque
hoods with emissive undersides and downward-targeted spotlights, or baked ground
pools in lower quality settings. The cone must stay entirely below the horizontal
plane of its luminaire. Do not use omnidirectional point lights or glowing
upper-facing bulbs. Share/instance fixture geometry, limit shadows, and preserve
clear pedestrian contrast in performance mode.

Keep existing quality tiers and the current launch budgets: at most 150 draw
calls, 50,000 triangles, 125 geometries, and 32 textures, with the existing 80 ms
hardware p95 gate. Measure museum and exterior views as additional representative
poses, then measure one session after spawn → basement → upper → exterior → spawn;
hidden-floor geometry/textures still consume resident GPU memory. Repeated
teardown/re-entry must not accumulate resources. Share primitive geometry before
considering a more complex loading system; do not raise budgets to hide regressions.
Software-renderer functional QA
is not proof of hardware frame-time performance. Avoid expensive aquarium glass,
realtime reflections, many independent lamp materials, or four permanently
updating exhibit textures. Pause hidden-floor animations and lights, and dispose
resources on immersive teardown/re-entry.

Preserve keyboard navigation, visible focus, text fallback, reduced motion,
high-contrast/accessibility presets, locale handling, caption preferences, and
mobile joystick controls. The current HUD and tutorial already advertise the
text-only experience, including the Text control and T shortcut. Preserve those
entry points and resume/contact access without adding an entry-UX redesign.
Every career exhibit and bus-stop message has a text
alternative. Door controls have a meaningful accessible name and state; use
polite announcements for state changes without repeating them every frame.

### Baseline and per-stage performance history

Before the first implementation edit, capture a lightweight measured baseline on
the exact approved starting commit using the existing performance suite and
diagnostics. Record existing ground/upper routes; mark basement and exterior
checkpoints as not yet present. The older values in the performance-budget docs
are context, not a substitute for this run. Keep the baseline evidence with the
floor-foundation PR, then append comparable evidence in each of the seven
implementation PRs, including the resume stage. This adds no ninth PR and does
not add measurement code or a baseline run to this design-only change.

Each evidence entry identifies:

- Full source commit SHA, tested PR head/base, clean-tree state, benchmark/profile
  version, lockfile identity, commands, timestamp, and artifact checksums
- Device model, OS, CPU/GPU class, RAM, browser/Playwright versions, hardware vs.
  software/unknown renderer, headed/headless mode, and declared emulation overrides
- Dev server vs. built preview/staging, verified served build identity, viewport,
  DPR/drawing-buffer size, actual quality and scene-detail tier, renderer policy,
  cache/network/throttling conditions, and power/thermal conditions where known
- Named route/pose, camera position/zoom, door/overlay state, motion/locale settings,
  route version, warmup and sample window, run/repetition number, completed samples,
  result, and unavailable/skipped reasons

Use three independent clean-context runs per profile and keep every result;
report the range rather than selecting a favorable run. Keep cold-load and
warm-load samples separate. Compare a stage with both the pre-expansion baseline
and its immediate predecessor only under the same recorded conditions. When a
browser, device, quality, route, or harness changes, label a new series and rerun
the predecessor with that profile where feasible. Never rank hardware against
software rendering, desktop emulation against a real phone, or Vite development
startup against a production build. Record unknown metadata instead of guessing.

Track application-ready duration, the existing input-dispatch latency summary,
renderer counters/resource counts, and supported frame/phase diagnostics. The
[controlled result contract](../ops/performance-results.md) measures event
dispatch delay, not input-to-paint latency; its current JSON deliberately leaves
frame time unavailable. Its `completed` state does not prove the 80 ms hardware
gate. Preserve that contract unchanged and supplement it with bounded benchmark
metadata and route snapshots, rather than adding arbitrary fields to version 1.
Record the diagnostic sampler and limitations alongside p95. The current
diagnostics retain at most 180 frames and omit frame deltas of one second or more;
checkpoint snapshots alone cannot establish whole-route timing or long-stall
absence. Retain route/stall evidence separately and report an unavailable metric
until measured. Do not label these rendered-frame wall-clock intervals as CPU execution time
or GPU timing. Vite's
`dev/dev` identity and the suite's synthetic CPU/memory hints cannot identify the
source commit or actual hardware; use the manifest and verified checkout instead.
Use identical checkpoint dwell periods and sample provenance. A sample count of
180 alone does not prove the whole rolling window was collected after arrival.

Retain the common spawn/upper route throughout the stack, plus the route portions
available at that stage. Once complete, measure spawn → basement → upper →
exterior → spawn in a single session, including representative museum/garage/
street poses and teardown/re-entry. Compare shared poses directly; record new
poses as additions; do not shorten a previously available route. Capture post-route
resident geometry/texture counts, since hidden content can still consume memory.
These are resource counts, not GPU bytes; software-renderer zeros cannot establish
headroom. Pair teardown/re-entry checks with lifecycle/disposal evidence, since
new-renderer counters alone cannot prove the old renderer's resources were freed.
Maintain the launch budgets above and report raw values, absolute/percentage
deltas, and remaining headroom. Investigate meaningful changes against repeat-run
variance even when a run remains under budget.

Keep a small versioned history index and original measurement JSON, bounded
renderer/phase snapshots, command output, and manifest under
`docs/qa/performance/` in the implementation stack. Link larger traces/screenshots
to retained test artifacts and preserve a review copy before those links expire.
The current controlled-result CI artifact expires after 14 days and overwrites
the local filename on another run, so archive each run separately before rerunning.
Failed and unsupported runs remain part of the evidence. Exclude credentials,
machine/user identifiers, arbitrary browsing data, and individual input events.

Hardware evidence remains a separate owner-run gate when the automation
environment only provides software rendering or cannot initialize WebGL. Report
that gap explicitly; software counters or a text fallback cannot close it. This
lightweight history supports the expansion now. Historical backfill, dashboards,
broader device infrastructure, Lighthouse automation, and optimization research
remain the separately tracked Future Work below.

## Dependency-aware pull-request stack

Each implementation stage is created only after explicit approval of this design.
Use repository-standard `codex/<feature>` branches. Each successor targets the
preceding branch so reviewers see a focused diff. Record dependencies and the
exact tested head in its PR description. When bases change, rerun affected gates.

1. **Design contract**: this document only. Verify requirements, candidate layout,
   public copy policy, asset fallback, dependencies, and acceptance gates. Stop for
   explicit approval here.
2. **Floor connection foundation**: registry and connection-aware movement,
   elevation, visibility, POI filtering, debug state, and tests. Capture the baseline
   before the first implementation edit and retain it with this PR. Adapt the
   current upstairs stairs with no new room geometry or deliberate behavior changes.
3. **Basement shell and stairs**: declarative museum shell, shared staircase
   construction, floor opening, safety rails, navigation, and camera integration.
   Graybox the complete down/up journey before decorating it.
4. **Career museum**: distinct career content/schema, four exhibits, furnishings,
   floor-aware interaction, localization/text parity, provenance, and museum QA.
   This closes the basement milestone only after automated and actual-browser
   traversal is verified.
5. **October resume**: reviewed new dated source, active-source documentation,
   content parity checks, and genuine PDF/DOCX artifact validation.
6. **Front entry and yard**: reusable door controller, entry opening and threshold,
   yard/path/sidewalk, exterior bounds, and round-trip traversal. This stage cannot
   begin before the basement milestone is verified.
7. **Attached garage**: garage room, driveway, house connection, garage-door visual
   and collision state, occupancy protection, and complete bidirectional loop.
8. **Residential street**: street/curb and scene boundaries, original parked EV,
   three or more shielded lamps, future bus stop, final mobile/accessibility and
   integrated traversal/performance evidence.

Do not defer feature tests to the end of the stack. Each stage includes its tests
and relevant documentation, including a comparable performance-history entry; the
final stage reruns the combined regression suite and complete route. Keep all seven
implementation stages in this stack. No stage triggers a merge or deployment.

## Automated verification plan

### Unit and source invariants

Parameterize the existing stair tests over both directions and nonzero/negative
base elevations. Cover centerline ascent/descent, exact lips, slow substeps,
reversal within the blend band, off-stair samples, side/back entry, landing-edge
nudges, multi-connection ground-floor selection, and finite bounded height.
The existing upper behavior remains a named regression fixture.

Validate unique semantic source IDs, explicit floor membership, valid openings,
rendered surface elevation, non-overlapping transition corridors, guard geometry,
and room/POI anchors. Verify all three floor visibility combinations, inactive
labels/LEDs/raycast exclusion, and career entries' exclusion from GitHub fetches.
Assert the Muon disclaimer is present as readable, accessible text in both career
surfaces. Test door target changes, repeated inputs, mid-animation reversal, blocked closing,
clearance threshold, disposal, and reduced-motion behavior with deterministic time.

### Browser automation

Extend [the existing stair suite](../../playwright/immersive-stairs-roundtrip.spec.ts)
and [shared assertions](../../playwright/helpers/immersiveAssertions.ts). Add
focused basement, career, and exterior/door suites without replacing upstairs
coverage. Use `stepPlayerForTest` to exercise the runtime collision path for dense
samples, plus genuine keyboard and touch journeys. Teleport helpers may establish
an isolated fixture, but must not prove the passage being tested.

Mandatory journeys and assertions:

- Fresh spawn → basement stairs → every exhibit approach → ground → upstairs →
  every upper room → ground, then repeat in reverse
- At least ten consecutive basement round trips, including slow diagonal input,
  stopping/reversing at both lips, and attempts to enter from the side/back
- Assert active floor, connection/zone, avatar height, room, visibility, absence of
  floor flicker, and bounded per-step height changes throughout the route
- Retain current upper landing-edge samples and west egress checks, plus the
  existing off-stair ground-point, squeeze-entry, and intentional-descent cases
- Closed front/garage doors block; sufficiently open doors pass in both
  directions; visual opening and collision state agree at intermediate progress
- Repeated/interrupted activation, occupied-threshold closing, leaving/re-entering
  range, modal open/close, tab blur/focus, and immersive/text/recovery cycles
- House → front door → sidewalk → driveway → garage → house and reverse, with
  the parked car and bus stop reachable without crossing solid geometry
- Count at least three lamp fixtures; inspect downward light targets/cones; verify
  the bus-stop text is visible and represented accessibly
- Keyboard selection visits career POIs without changing repository metrics or
  selecting hidden floors; touch opens/dismisses details without walking through
  an exhibit or allowing synthetic duplicate activation
- Test 1280×720 desktop, a larger desktop viewport, 390×844 phone portrait, a small
  360-pixel-wide viewport, and phone landscape. Include reduced motion and the
  existing small-screen HUD/keyboard/text-fallback suites
- Capture traces/screenshots on failures and named visual checkpoints. Run DOM
  accessibility checks with existing `axe-core`; also review 3D readability
  visually because DOM scans cannot establish it

The current Tests workflow does not run the full stair or keyboard suite by
virtue of running the performance spec. Add the focused traversal suites to an
appropriate PR CI job, serializing WebGL startup as the repository already does.
Keep performance evidence separate from functional emulation and report skipped
or unsupported browser cases explicitly.

### Required commands and evidence

Follow `AGENTS.md` before committing and opening each PR:

```bash
npm run format:write
npm run lint
npm run test:ci
npm run docs:check
npm run smoke
```

For implementation, also run typecheck, the i18n guard, focused and full relevant
Playwright suites, miniature drift validation when affected, collider geometry /
reachability / redundancy audits, and the performance budget. Run the floor-plan
diagram generator only when layout changes. Review its actual output.

Scan the staged diff with the repository secret scanner before publication.
Record passed, failed, and not-run checks separately. Preserve CI-owned
`docs/assets/game-launch.png`; screenshots for review belong in test artifacts,
not a manual edit of that file. Never waive a failed traversal gate because a
screenshot looks correct.

## Actual-browser walkthrough and milestone gates

Automation is necessary but insufficient. The owner will review whether the
Playwright journeys exercise the feature adequately and perform the actual 3D
walkthrough before merging implementation PRs. Record automated evidence and
manual owner sign-off as separate gates. This design-only PR does not require an
unimplemented feature to pass browser QA. Use a real WebGL-capable browser on the
exact candidate build with:

```text
/?mode=immersive&disablePerformanceFailover=1
```

Before the basement milestone is accepted, the owner uses normal controls to walk from fresh
spawn down the stairs, around all exhibits, and back up, then perform the
[upstairs runbook](../qa/upstairs-stairs.md). Inspect the opening from both ends,
avatar feet/camera motion, rails, all four plaques, inactive-floor labels, and
mobile details dismissal. Repeat with reduced motion and performance quality.

Before exterior completion, manually walk the entire house/yard/garage loop in
both directions, operate every door from both sides, stand in its threshold while
trying to close it, revisit the basement and upstairs, and inspect lamps/signage
at minimum and maximum useful zoom. Repeat with phone-sized touch controls.
Confirm that the requested front-door location actually reads bottom-right below
the stairwell in the standard view.

Capture the tested commit, browser/device or emulation, renderer (hardware or
software), viewport, route, result, screenshots, and any limitations. If WebGL
cannot initialize, record that blocker; text fallback is not a successful 3D
walkthrough. Do not start exterior implementation until the basement walkthrough
and automated gates are genuinely complete.

## Local review and future staging commands

### Local implementation review

Use Node.js 20, matching CI. In a clean working tree, replace the PR number below
with the implementation PR to review; `gh pr checkout` retrieves that PR's branch.
The design-only branch intentionally contains no new scene to exercise.

```bash
git clone https://github.com/futuroptimist/danielsmith.io.git
cd danielsmith.io
gh pr checkout <implementation-pr-number>
npm ci
npx playwright install chromium
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173/?mode=immersive&disablePerformanceFailover=1`.
In another terminal in the same checkout, run the current regression suites:

```bash
npm run test:e2e -- playwright/immersive-stairs-roundtrip.spec.ts \
  playwright/keyboard-traversal.spec.ts playwright/small-screen-hud.spec.ts \
  --workers=1 --trace=retain-on-failure
npm run perf:budget
```

The implementation PR must append its actual basement/door test filenames to the
review instructions once they exist. For serial CI-equivalent runs, stop the dev
server first and prefix the test command with `CI=true`; Playwright starts its
own server. Linux may need `npx playwright install --with-deps chromium` for browser
system dependencies. Do not disable browser/OS security controls to force WebGL.

### Capturing the initial performance evidence

Before the first implementation edit, stop any existing dev server and use the
same clean checkout, Node.js 20, and installed dependencies as above. Record the
following alongside the device/profile manifest, then run one attempt:

```bash
git rev-parse HEAD
git status --porcelain
node --version
npm --version
npx playwright --version
CI=true npm run perf:budget -- --workers=1 --retries=0 --trace=retain-on-failure
```

The current Playwright configuration starts its own **Vite development server**
when `CI=true`; label the result accordingly. Save stdout/stderr and copy
`test-results/controlled-performance/controlled-performance-result-v1.json` plus
the attempt's other test artifacts into a unique commit/profile/attempt directory
before the next run, including when the command fails. Repeat for three attempts;
`--repeat-each` alone would overwrite the controlled JSON. Record missing outputs
as missing. Keep this archive and its manifest through final stack review.

This command measures the existing launch and controlled-input tests. Record
timestamped `window.portfolio.performance.getSnapshot()` results at the declared
route checkpoints separately, with screenshots and route/stall evidence. The
first implementation PR may add a small reusable capture helper while preserving
the prior baseline; rerun the unchanged reference if the measurement method changes.
Actual hardware runs and owner walkthroughs remain distinct from software-renderer
CI and from this command's controlled-result completion state.

### Operator-run Sugarkube staging, when an artifact exists

Follow the current [Sugarkube app runbook](https://github.com/futuroptimist/sugarkube/blob/main/docs/apps/danielsmith.md)
and [staging runbook](https://github.com/futuroptimist/sugarkube/blob/main/docs/k3s-danielsmith-staging.md).
On the owner's `sugarkube3`, use the existing Sugarkube checkout with its normal
staging kubeconfig/context. First inspect its recipes and verify the chart:

```bash
just --list
CHART_VERSION=$(sed -e 's/#.*$//' -e '/^[[:space:]]*$/d' docs/apps/danielsmith.version | head -n 1)
helm show chart oci://ghcr.io/futuroptimist/charts/danielsmith --version "$CHART_VERSION"
APP_TAG='<verified-immutable-published-tag-for-reviewed-commit>'
```

The inspected Sugarkube revision `093b2ccb750e927a88ae4f56c7e199ce036ba86c`
contains the generic recipes. If `app-config`, `app-deploy`, `app-status`, and
`app-verify` appear in the local recipe list, use the current generic path:

```bash
just app-config app=danielsmith env=staging
just app-deploy app=danielsmith env=staging tag="$APP_TAG"
just app-status app=danielsmith env=staging
just app-verify app=danielsmith env=staging
```

For an older checkout with `danielsmith-oci-deploy` instead, use the compatibility
recipe documented in [the app release runbook](../ops/sugarkube-release.md):

```bash
just danielsmith-oci-deploy env=staging tag="$APP_TAG"
```

Choose one deploy path, not both. If neither recipe exists, stop and use that
runbook's explicit legacy Helm-helper instructions after checking local paths.
Do not assume the other generic recipes exist on a legacy checkout. After either
path, verify the public endpoints and the runbook's promotion smoke evidence:

```bash
curl -fsS https://staging.danielsmith.io/
curl -fsS https://staging.danielsmith.io/livez
curl -fsS https://staging.danielsmith.io/healthz
curl -fsS https://staging.danielsmith.io/runtime/build-info.json
curl -fsS https://staging.danielsmith.io/runtime/github-metrics.json
```

Run `npm run smoke:promotion` from the reviewed **danielsmith.io** checkout, not
from Sugarkube, once the selected image is serving on staging.

The placeholder must be replaced with an image tag verified in the successful
[image workflow](https://github.com/futuroptimist/danielsmith.io/actions/workflows/ci-image.yml)
and GHCR package, for the exact reviewed commit. Verify runtime build identity
and the cache checks in the linked app runbook, then open
`https://staging.danielsmith.io/?mode=immersive&disablePerformanceFailover=1`.
HTTP health checks do not establish 3D or traversal correctness.

Current `.github/workflows/ci-image.yml` publishes on a main-branch push or a
workflow dispatch whose selected input ref is main. PR and feature-ref builds do
not publish deployable tags. Therefore an unmerged stack does not currently have
a supported preview image merely because its build passed. Use local review for
that case; a preview-publication workflow would require separately approved work.
The workflow is authoritative where older release prose differs. Reverify artifact
and chart behavior when an implementation is ready; never invent a tag, deploy
`latest`, modify production pins, or merge merely to obtain a staging image.

These are future owner-run instructions, not authorization for an agent to build
and publish an image, change a cluster, or deploy during this design task.

## Future work, explicitly outside this expansion

These issues track later work; they are not additional stages or approval
requirements for this expansion. Reuse the existing performance-observability
issue instead of opening a duplicate. No tracking issues are needed for the eight
planned PRs above.

- **Immersive/text positioning** ([#1112](https://github.com/futuroptimist/danielsmith.io/issues/1112)): clarify the
  distinction between exploration and the text-only experience. The current HUD
  and tutorial already communicate the alternative; preserve those controls now
- **Bus-stop fast travel** ([#1113](https://github.com/futuroptimist/danielsmith.io/issues/1113)): a remote destination
  using the reserved interaction/destination seam. Current behavior stays Coming
  Soon, with no travel or remote-scene implementation
- **2040 house redesign** ([#1114](https://github.com/futuroptimist/danielsmith.io/issues/1114)): a broader visual
  restyling after the expansion's navigation and interactions are proven
- **Historical performance backfill** ([#1115](https://github.com/futuroptimist/danielsmith.io/issues/1115)): replay
  selected older commits with comparable profiles and retained evidence. The
  baseline and per-stage measurements required above remain in scope now
- **Performance observability** ([#1090](https://github.com/futuroptimist/danielsmith.io/issues/1090)):
  controlled-result export, existing scheduler integration, and Grafana panels
- **Broader device/Lighthouse coverage** ([#1116](https://github.com/futuroptimist/danielsmith.io/issues/1116)): expand
  reproducible hardware/mobile coverage and evaluate Lighthouse automation,
  coordinating with #1090 rather than duplicating its scheduler or dashboards
- **Measured optimization audit** ([#1117](https://github.com/futuroptimist/danielsmith.io/issues/1117)): identify
  worthwhile improvements from profiles, including a controlled procedural
  TypeScript vs. equivalent GLB startup/loading comparison. Include transfer,
  construction/parse/upload, memory, and steady-state costs; promise no FPS gain
  or wholesale conversion before measurements support it

## Decisions still needed during design review

- Approve or revise the layout, scope, stack, and explicit basement-before-exterior
  gate before implementation begins
- Establish permission for the official eagle, or accept the original/text-only
  fallback so the asset does not block the museum
- Review exact Muon wording from the specified posting and confirm whether the
  independent open-source entry continues unchanged alongside the new role

All proposed coordinates and visual treatments remain subject to graybox
clearance and screen-space review. These checks may refine placement without
expanding the agreed feature scope or silently changing current upstairs routes.
