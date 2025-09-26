# Immersive Portfolio Roadmap

This roadmap breaks the evolution of the 3D portfolio into focused releases. Each milestone
builds on the previous one so the experience grows steadily while always remaining shippable.
The plan leans into agentic workflows: every deliverable is intentionally scoped so an
automation-friendly prompt (see `docs/prompts/`) can guide implementation.

## Phase 0 – Foundations (Shipped)

- Baseline single-room scene with free-look camera.
- WASD/arrow and mobile joystick locomotion.
- Placeholder actor sphere.

## Phase 1 – Playable Home Shell

Focus: expand the environment while keeping navigation smooth.

1. **Lighting Pass Alpha**
   - Introduce baked + dynamic lighting pipeline.
   - Add emissive LED strip meshes along ceiling edges with gentle bloom.
   - Tune lightmap UVs/materials so walls, ceiling, and floor receive a soft gradient glow.
   - Add toggleable debug view to compare current vs. future lighting iterations.
   - ✅ Emissive cove strips now emit via bloom-tuned LED meshes and corner fill lights.
2. **House Footprint Layout**
   - Block out multiple rooms on the ground floor using modular wall/floor/ceiling pieces.
   - Cut simple doorway openings (no doors yet) between rooms and toward the backyard.
   - Stub staircase volumes that connect to a placeholder second-floor landing.
   - Ensure navmesh/character controller handles slopes and doorway thresholds.
3. **Outdoor Transition**
   - Sculpt backyard terrain plane, fence line, and skybox updates.
   - Add lighting probes/reflections so the outdoor zone feels distinct at dusk.
   - Gate unfinished zones with temporary hologram barriers and in-world signage.

## Phase 2 – Points of Interest (POIs)

Focus: anchor each highlighted project with an interactive artifact.

1. **POI Framework**
   - Create a data-driven registry for POIs (id, asset, interaction type, metadata).
   - Implement 3D tooltips/popups that anchor to POIs in world space and respect camera.
   - Support desktop click + gamepad/mid-air selection; prepare for accessibility focus rings.
2. **Interior Showpieces**
   - Wall-mounted TV with YouTube branding for the `futuroptimist` repo; approaching triggers
     a rich text popup with repo summary, star count, and CTA buttons.
   - Spinning flywheel centerpiece representing the `flywheel` repo; interaction spins faster,
     reveals tech stack, and links to docs.
   - Studio desk with holographic terminal referencing `jobbot3000` automation lineage.
3. **Backyard Exhibits**
   - Launch-ready model rocket for `dspace`, with staged ignition sequence and lore text.
   - Aluminum extrusion greenhouse inspired by `sugarkube`, including animated solar panels,
     grow lights, plants, and koi pond voxels.
   - Ambient audio beds (crickets, hum) that fade based on player proximity.

## Phase 3 – Interface & Modes

Focus: unify user controls and ensure graceful fallback experiences.

1. **HUD Layer**
   - Responsive overlay with movement legend, interaction prompt, and help modal.
   - Sliders/toggles for audio volume, graphics quality, and accessibility presets.
   - Mobile-friendly layout that coexists with on-screen joystick.
2. **Experience Toggle**
   - Mode switch between immersive 3D view and a fast-loading text portfolio.
   - Detect low-end/no-JS/scraper clients and auto-route to static mode.
   - Share canonical content via structured data (JSON-LD) for SEO and bots.
3. **Progression & State**
   - Lightweight save of visited POIs and toggled settings (localStorage w/ fallbacks).
   - In-world visual cues for discovered content (e.g., glowing trims, checkmarks).
   - Optional guided tour mode that highlights the next recommended POI.

## Phase 4 – Accessibility & Internationalization

Focus: make the experience inclusive and globally friendly.

1. **Input Accessibility**
   - Keyboard-only navigation parity, remappable bindings, and full controller support.
   - Screen reader announcements for mode switches, POI discovery, and HUD focus changes.
   - Interaction timeline tuned for cognitive load (limited simultaneous prompts).
2. **Visual & Audio Accessibility**
   - High-contrast material set, colorblind-safe lighting palettes, and adjustable motion blur.
   - Subtitle/captions system for ambient audio callouts and POI narration.
   - Photo sensitivity safe mode (reduced flicker, muted emissives).
3. **Localization Pipeline**
   - Extract UI + POI copy into i18n catalog with English baseline.
   - Provide translation scaffolding (e.g., JSON/PO files) and fallback strings.
   - Ensure fonts, layout, and text rendering handle RTL and CJK scripts gracefully.

## Phase 5 – Hero Avatar

Focus: replace the placeholder sphere with a stylized protagonist.

1. **Character Import**
   - Set up GLTF/GLB ingestion pipeline with unit tests for bone/animation integrity.
   - Integrate temporary mannequin until Daniel's custom model ships.
   - Support material variants (portfolio outfit, casual, formal) toggled via HUD.
2. **Locomotion Polish**
   - Blend tree for idle/walk/run/turn animations aligned to physics controller speed.
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
