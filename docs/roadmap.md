# Immersive Portfolio Roadmap

This roadmap breaks the evolution of the 3D portfolio into focused releases. Each milestone
builds on the previous one so the experience grows steadily while always remaining shippable.
The plan leans into agentic workflows: every deliverable is intentionally scoped so an
automation-friendly prompt (see `docs/prompts/`) can guide implementation.

## Delivery scoreboard

| Phase | Status         | Demo                | Key metrics                                               |
| ----- | -------------- | ------------------- | --------------------------------------------------------- |
| 0     | ✅ Shipped     | –                   | Baseline scene boots in <2s; bundle 1.1 MB gz.            |
| 1     | 🚧 In progress | _(tag after slice)_ | Target: p95 FPS ≥90 desktop / ≥60 Pixel 6; LCP <2.5s.     |
| 2     | 🗓️ Next        | _(tag after slice)_ | Target: ≥3 POIs w/ KPI impact notes + tooltips axe clean. |
| 3     | 🗓️ Next        | _(tag after slice)_ | Target: text fallback TTI <1.5s; HUD fully keyboardable.  |
| 4     | 🗓️ Next        | _(tag after slice)_ | Target: axe CI 0 critical; locale switch en+rtl.          |
| 5     | 🗓️ Next        | _(tag after slice)_ | Target: avatar swap ≤5% FPS regression; animation qa.     |

_Actions:_ cut a git tag + screenshot/GIF when each phase slices, update the table with a
metrics snapshot (Lighthouse CI, WebPageTest, telemetry). Numbers are privacy-respecting lab
captures; keep artifacts in `docs/metrics/`.

## Global success criteria

- **Performance budgets** – p95 FPS ≥90 on desktop class hardware and ≥60 on mid-range mobile;
  p95 INP <200 ms; LCP <2.5 s on fast 4G; initial interactive payload ≤1.5–2.0 MB gzipped.
- **Accessibility gates** – axe CI reports 0 critical violations; full keyboard/touch parity;
  HUD controls expose ARIA labels and 48 px touch targets.
- **Stability** – smoke build succeeds; console error budget stays at 0; Sentry (or console
  proxy) is clean in demo runs.
- **Failover** – auto redirect to text-only portfolio if WebGL is unavailable, memory
  heuristics fail (<1 GB), or FPS drops below 30 for 5s; provide manual toggle in HUD.
  - ✅ WebGL capability detection now routes unsupported browsers to the lightweight text view (also available via `?mode=text`)
  - ✅ Low-memory heuristic now routes devices reporting <1 GB via `navigator.deviceMemory`
    to the text experience while honoring `?mode=immersive&disablePerformanceFailover=1`
    overrides.
  - ✅ Runtime performance monitor now auto-switches to text mode after 5 s below 30 FPS.

## Phase 0 – Foundations (Shipped)

- Baseline single-room scene with free-look camera.
- WASD/arrow and mobile joystick locomotion.
- Placeholder actor sphere.

## Phase 1 – Playable Home Shell

Focus: expand the environment while keeping navigation smooth.

**Done means**

- Traversal GIF + release tag published (`phase-1-alpha`).
- Perf sample captured (desktop + Pixel-class) meeting the global budgets.
- Lighting experiments documented in `docs/metrics/lighting.md` with before/after screenshots.
- Text fallback auto-trigger verified via scripted run (see failover criteria).

1. **Lighting Pass Alpha**
   - Introduce baked + dynamic lighting pipeline.
   - Add emissive LED strip meshes along ceiling edges with gentle bloom.
   - Tune lightmap UVs/materials so walls, ceiling, and floor receive a soft gradient glow.
   - ✅ Shift+L toggles a debug lighting view that disables bloom/LEDs for side-by-side comparisons.
   - ✅ Emissive cove strips now emit via bloom-tuned LED meshes and corner fill lights.
   - ✨ Baked dusk lightmaps now bathe floors and walls in a gradient bounce wash that pairs with the LED strips.
   - ✨ Interior walls and fences now expose dedicated UV2 channels so future bakes stay artifact-free.
2. **House Footprint Layout**
   - Block out multiple rooms on the ground floor using modular wall/floor/ceiling pieces.
     - ✅ Modular ceiling panels now cap each ground-floor room with LED-friendly insets.
   - Cut simple doorway openings (no doors yet) between rooms and toward the backyard.
   - Stub staircase volumes that connect to a placeholder second-floor landing.
   - Ensure navmesh/character controller handles slopes and doorway thresholds.
     - ✅ Wall segment builder now reserves doorway openings and keeps player colliders clear.
     - ✅ Doorway clearance validator now protects thresholds from POI crowding during registry checks.
     - ✅ Doorway width guard now enforces ≥1.2 m clearances so traversal never snags on narrow frames.
   - ✅ Feature staircase prefab links the living room to a loft landing stub with nav blockers.
3. **Outdoor Transition**
   - ✅ Sculpted backyard terrain plane and layered perimeter fence framing the dusk skybox.
   - ✅ Lighting probes and dusk reflections now wash the backyard with dusk-tinted bounce
     light and greenhouse glass highlights.
   - ✅ Hologram barrier signage now pulses with accessibility-aware gating while unfinished
     zones stage future exhibits.
   - ✅ Sculpted dusk backyard terrain with terraced pathing, perimeter fencing, and a gradient skybox.
   - ✅ Installed hologram barrier and signage to stage future backyard exhibits.
   - ✨ Lantern-lined walkway now guides the greenhouse approach with pulsing dusk beacons.
   - ✨ Gradient dusk sky dome now envelopes the backyard and animates the horizon glow.

## Phase 2 – Points of Interest (POIs)

Focus: anchor each highlighted project with an interactive artifact.

**Done means**

- Each POI card includes a one-line outcome metric (e.g., "Reduced p95 render 28%"), backed by
  links in `docs/case-studies/`.
- Tooltips overlay passes axe CI and keyboard focus audit.
- Release tag `phase-2-pois` ships with gallery screenshots + metrics table entry.

1. **POI Framework**
   - Create a data-driven registry for POIs (id, asset, interaction type, metadata).
   - ✅ 3D tooltip cards anchor POIs in world space, billboard to the camera, and reuse overlay copy.
   - ✅ Desktop pointer + keyboard selection loops share accessible focus targets and emit POI
     events, paving the path for gamepad + mid-air parity.
   - ⚙️ Data-driven registry now spawns holographic pedestals for Futuroptimist + Flywheel exhibits.
   - ✨ Pedestals fade in tooltips and halo guides as players enter their interaction radii.
   - ✅ Desktop pointer interaction manager highlights POIs and emits selection events.
   - ✅ Analytics hooks emit hover and selection lifecycle events for instrumentation pipelines.
   - ✅ Interaction manager now normalizes analytics injection so instrumentation fires when
     options are omitted in runtime wiring.
   - ✅ Accessibility overlay mirrors POI metadata in HTML so screen readers capture
     hover/selection state.
   - ✅ Registry validation enforces room bounds, unique ids, and safe spacing at build time.
   - ✅ Touch interactions now share the pointer pipeline so mobile taps mirror desktop focus.
2. **Interior Showpieces**
   - Wall-mounted TV with YouTube branding for the `futuroptimist` repo; approaching triggers
     a rich text popup with repo summary, star count, and CTA buttons.
   - Spinning flywheel centerpiece representing the `flywheel` repo; interaction spins faster,
     reveals tech stack, and links to docs.
   - Studio desk with holographic terminal referencing `jobbot3000` automation lineage.
   - ✨ Wall-mounted Futuroptimist media wall now frames the living room POI with a branded
     screen, ambient shelf lighting, interaction clearance volume, and modular prefab wiring.
   - ✨ Spinning Flywheel kinetic hub built in the studio with responsive rotation, glowing
     orbitals, and an activation-driven tech stack reveal panel.
   - ✨ Studio Jobbot terminal desk projects live automation telemetry via a holographic console
     and anchors the Jobbot3000 POI with reactive lighting and diagnostics beacons.
   - ✨ Gitshelves living room array now tessellates commit shelves with streak-reactive glow
     columns and nightly sync signage.
3. **Backyard Exhibits**
   - ✨ Launch-ready model rocket for `DSPACE`, complete with illuminated launch pad, caution halo,
     countdown-ready stance, and an interactive POI that links to the mission log.
   - ✨ Aluminum extrusion greenhouse inspired by `sugarkube`, complete with animated solar
     trackers, pulsing grow lights, interior planter beds, and a koi pond plinth.
     - ✅ Sugarkube greenhouse POI now surfaces automation metrics and dual CTAs in the registry.
       - ✅ Ambient audio beds (crickets, greenhouse chimes) now use smoothstep falloff so volume
         eases in based on player proximity.
   - ✨ PR Reaper triage console now anchors the backyard ops POI with holographic sweeps,
     caution-lit walkways, and log review surfaces.
     - ✅ Caution-lit walkway now pulses with triage emphasis cues and honors accessibility
       motion dampening scales.

## Phase 3 – Interface & Modes

Focus: unify user controls and ensure graceful fallback experiences.

**Done means**

- README front matter surfaces "Play demo" link + 30–45 s capture; text fallback call-out sits
  next to the link.
- HUD overlay achieves full keyboard/touch parity; interaction audit recorded in
  `docs/metrics/accessibility.md`.
- Lab run logs (Lighthouse CI) show text mode TTI <1.5 s and immersive mode LCP <2.5 s.

1. **HUD Layer**
   - Responsive overlay with movement legend, interaction prompt, and help modal.
   - ✨ Movement legend now detects the last input method (keyboard, mouse, or touch) and
     refreshes the interact prompt copy so players always see the relevant control hint.
   - ✅ Help modal opens from the HUD button or `H`/`?` hotkeys and surfaces controls,
     accessibility tips, and failover guidance.
   - ✅ Accessibility HUD presets now expose Standard, Calm, and Photosensitive-safe modes
     that soften bloom, ease emissives, duck ambient audio, and boost HUD contrast.
     - ✅ Graphics HUD presets let players choose Cinematic, Balanced, or Performance modes
       that retune bloom, LED lighting, and pixel ratio for their device.
   - ✅ Ambient audio HUD now exposes a mute toggle and keyboard-friendly volume slider.
   - ✅ Mobile HUD layout now lifts instructional overlays above the joystick
     safe zone so touch movement remains unobstructed.
2. **Experience Toggle**
   - Mode switch between immersive 3D view and a fast-loading text portfolio.
   - Detect low-end/no-JS/scraper clients and auto-route to static mode.
   - Share canonical content via structured data (JSON-LD) for SEO and bots.
   - ✅ JSON-LD structured data now mirrors the POI registry so bots and scrapers receive the
     same exhibit catalog as players.
   - ✅ HUD toggle + `T` keybinding now trigger the text portfolio without a page reload.
   - ✅ Automated user-agent heuristics now route crawlers and headless previews to the text
     portfolio while honoring manual immersive overrides.
3. **Progression & State**
   - Lightweight save of visited POIs and toggled settings (localStorage w/ fallbacks).
     - ✅ SessionStorage fallback now protects POI progress when localStorage is blocked.
   - ✅ In-world visual cues for discovered content (e.g., glowing trims, checkmarks).
     - ✅ Visited POIs now reveal holographic checkmark badges that hover above each pedestal.
   - Optional guided tour mode that highlights the next recommended POI.
   - ✅ Visited POI progress persists across reloads, powering halo highlights and tooltip badges.
   - ✅ Accessibility HUD now remembers ambient audio volume tweaks between play sessions.
   - ✅ Guided tour overlay surfaces the next recommended POI whenever the player is idle.
   - ✨ Guided tour reset utility now lets the HUD restart the curated path on demand so
     visitors can replay the experience during sessions or demos.

## Phase 4 – Accessibility & Internationalization

Focus: make the experience inclusive and globally friendly.

**Done means**

- CI axe run + screen reader smoke test logged with 0 critical issues.
- Locale toggle demonstrates EN + RTL sample; fallback fonts cover CJK sample copy.
- Accessibility presets documented with metrics (contrast ratios, motion reduction) and tied to
  acceptance prompts.

1. **Input Accessibility**
   - Keyboard-only navigation parity, remappable bindings, and full controller support.
     - ✅ Keyboard bindings now persist across sessions and update the HUD/help overlays
       via the new remapping service.

- Screen reader announcements for mode switches, POI discovery, and HUD focus changes.
  - ✅ Screen reader announcements now trigger when players discover a new POI, narrating the
    exhibit name and summary via a live region.
  - ✅ Mode transitions now fire polite announcements describing immersive and text fallback states.
  - ✅ HUD controls now announce focus changes through a dedicated live region tied to overlay and
    control focus events.
  - ✅ Interaction timeline now staggers POI discovery calls so prompts never stack.

2. **Visual & Audio Accessibility**
   - High-contrast material set, colorblind-safe lighting palettes, and adjustable motion blur.
   - ✅ High contrast accessibility preset now boosts HUD readability without disabling cinematic
     lighting cues.

- Subtitle/captions system for ambient audio callouts and POI narration.
  - ✅ Audio subtitles overlay now surfaces ambient beds and POI narration with cooldown-aware captions.
  - ✅ Photo sensitivity safe mode now smooths pulses and mutes emissive lighting to avoid flicker spikes.

3. **Localization Pipeline**
   - ✅ Extract UI + POI copy into i18n catalog with English baseline.
   - ✅ Translation scaffolding now provides pseudo locale overrides and English fallbacks.
   - Ensure fonts, layout, and text rendering handle RTL and CJK scripts gracefully.
     - ✅ Text fallback and HUD overlays now apply RTL direction metadata so Arabic and Hebrew copy align as expected.

## Phase 5 – Hero Avatar

Focus: replace the placeholder sphere with a stylized protagonist.

**Done means**

- Avatar swap retains ≥95% of Phase 4 perf metrics (FPS, INP) and shows comparison table.
- Animation QA checklist completed (IK alignment, footstep sync) with clips in `docs/media/`.
- Release tag `phase-5-avatar` published alongside narrative write-up.

1. **Character Import**
   - Set up GLTF/GLB ingestion pipeline with unit tests for bone/animation integrity.
     - ⚙️ Avatar importer now validates required bones and animation clips before controller wiring.

- ✅ Stylized mannequin placeholder now replaces the golden sphere, aligning with the controller
  collider while showcasing emissive visor accents and HUD-ready trim palettes.
- ✅ Support material variants (portfolio, casual, formal) now switchable via the HUD avatar style selector.

2. **Locomotion Polish**
   - Blend tree for idle/walk/run/turn animations aligned to physics controller speed.
     - ✅ Locomotion blend tree now normalizes idle, walk, run, and turn clip weights from the
       controller velocity profile while matching animation playback speed to the player's
       movement rate.
   - Interaction animation set (button press, item inspect) triggered by POI events.
   - Footstep sounds + IK adjustments to align feet with uneven terrain/stairs.
3. **Self-Representation Touches**
   - Optional selfie cam / mirror to show the avatar.
   - Narrative text logs tied to POIs referencing creator stories.
   - Future hook: customization menu for outfits/accessories.

## Phase 6 – Beyond

Ideas to evaluate after the core experience is stable:

- Multiplayer showroom tours or live streams as ambient projections.
- Seasonal lighting presets (e.g., aurora, holiday lights) scheduled via calendar.
- Procedural storytelling AI that narrates the journey between POIs.
- Integration with GitHub API for live repo stats and contribution heatmaps.
- Exportable "press kit" mode that packages screenshots, POI blurbs, and metrics.

## Delivery Principles

- Ship vertical slices: each milestone should be demonstrable and playable end-to-end.
- Maintain 90 FPS target on desktop with graceful degradation for mobile.
- Keep content authoring pipelines scriptable so automation agents can iterate quickly.
- Document every new system with an accompanying prompt doc and human-facing guide.
