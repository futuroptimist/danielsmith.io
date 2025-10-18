# Scene Transition: Globe to House Interior

## Summary

A cinematic transition that travels from a dynamic, data-rich globe hovering over the San Francisco Bay Area into a grounded orthographic house interior, turning the global perspective into a personal narrative anchor. The sequence conveys how worldwide context collapses into an individual workspace where the same globe becomes a tactile artifact.

## Scene Overview

### Globe Scene

- **Camera:** Perspective camera orbiting 15° above the equator, focal length 35mm equivalent, ease-in spin around the Bay Area with subtle parallax from atmospheric layers.
- **Lighting:** Three-point rig—key sun lamp angled from west, fill via skybox HDRI, rim light highlighting coastlines; volumetric fog hinting at sunrise.
- **Materials:** Physically based Earth shader with animated emissive city lights near SF, reflective oceans, procedural clouds in layered alpha shells.
- **Initial Framing:** Starts at 60° FOV, San Francisco centered, background fades to deep navy with subtle gradient starscape (no constellations, minimal speckle for depth).

### House Scene

- **Camera:** Orthographic projection aligned with existing home layout; camera pitched 30° downward, locked yaw to maintain isometric readability.
- **Layout:** Hero desk cluster, shelving with project artifacts, ambient window light from screen-left, rug anchoring composition.
- **Props & POIs:** Holographic globe on desk, miniature Bay Area map pinned on wall, laptop open to active project dashboard, wearable device on stand.
- **Globe Reuse:** Same GLB asset re-imported with reduced scale, warmer subsurface scattering, desk lamp key light creating reflective glints.

## Transition Sequence

1. **0–1.2s — Globe Intensification:** Camera dolly-in while the globe rotates east-to-west; ambient music swells; vignette tightens. Ease: `easeInOutSine`.
2. **1.2–2.8s — Orbit to Zenith:** Camera gains altitude, revealing thin atmosphere; light temperature cools slightly. A latent streak of volumetric light guides the eye. Ease: `easeInOutCubic`.
3. **2.8–4.0s — Match Cut Preparation:** Camera glides toward the Bay Area until the city fills frame; exposure blooms gently. Globe opacity increases for additive blending. Ease: `easeOutQuad`.
4. **4.0–5.0s — Projection Morph:** Perspective camera parameters interpolate to orthographic (frustum width animated); global lighting dims while interior warm bounce ramps up; ambient soundtrack crossfades to intimate room tone. Ease: `easeInOutExpo`.
5. **5.0–6.2s — Interior Reveal:** House scene opacity fades in; camera settles into fixed isometric perch; props animate slightly (desk lamp tilt, laptop lid micro-adjust). Ease: `easeOutBack`.
6. **6.2–7.0s — Globe Settle:** Desk globe spins down to rest aligned with SF; subtle dust motes catch light; final chord resolves. Ease: `easeOutSine`.

## Technical Architecture

- **Scene Partitioning:** Use React Three Fiber with `<Canvas>` hosting two scene roots controlled via `SceneTransition.tsx`. Each scene encapsulated in its component with Suspense fallback.
- **State Machine:** Transition orchestrated by Zustand or React context, exposing progress (0–1) and playback controls (auto-play, skip).
- **Projection Interpolation:** Wrap camera logic in custom hook that lerps field of view toward an equivalent orthographic size, animating near/far planes and position offsets during the morph.
- **Asset Reuse:** Single GLB for globe loaded once with Drei’s `useGLTF`; cache node references and clone for house context using `SkeletonUtils.clone`. Shared textures stored in `useMemo` to avoid re-fetch.
- **Performance Budget:** Target <12ms frame budget on desktop; limit draw calls via meshopt-compressed GLB (<1.5MB). Use InstancedMesh for duplicate props. Keep shader compile time <30ms by reusing materials.

## Implementation Plan

- **`GlobeScene.tsx`:** Handles space environment, atmospheric layers, orbit controls, and data overlays. Uses Drei `Stars` disabled to avoid constellations; rely on gradient background.
- **`HouseScene.tsx`:** Orthographic layout with baked lightmaps, animated desk accessories, and desk globe instance. Ensure responsive scaling for different aspect ratios.
- **`SceneTransition.tsx`:** Central timeline using React Spring or GSAP to drive progress value, blending scene visibility, lights, and camera parameters.
- **Libraries & Tools:** Drei for helpers (`Environment`, `Html`), React Spring for transitions, gltfpack + meshopt for asset compression pipeline.
- **Accessibility:** Respect `prefers-reduced-motion` by shortening or skipping camera movement while preserving fade. Provide captioned audio cues and ARIA-live narration for key beats.
- **Lazy Loading:** Preload house assets during final second of globe focus via `useProgress` thresholds; guard with Suspense fallbacks.

## Visual Language and Style

- **Atmosphere:** From cool dawn blues with subtle auroras to warm amber interior bounce. Transition shifts color temperature smoothly.
- **Lighting Palette:** HDRI sky tint (#3A5A9F), sun key (#FFC773), interior lamp (#FFB27D). Maintain contrast ratio ~3:1 for readability.
- **Animation Feel:** Smooth, cinematic easing with slight overshoot only during desk prop settle. Motion blur simulated via post-processing but disabled for reduced motion users.
- **Composition:** Keep horizon on lower third during globe phase, align desk diagonals with leading lines. Globe remains the hero element, preserving viewer focus through match cut.
- **Continuity:** Maintain consistent globe orientation; highlight San Francisco in both contexts to reinforce narrative thread.

## Future Extensions

- Layer interactive POI callouts that pivot from globe to desk artifacts.
- Optional AR mode projecting desk scene onto mobile surface; reuse orthographic camera data.
- Adaptive music system blending regional soundscapes into personal instrument loops.
- Theme toggles for nighttime or stormy atmospheres maintaining transition logic.
- Narrative branch where globe becomes holographic display unfolding project history.

## Appendix

- **Camera Timeline Pseudocode:**
  ```ts
  const timeline = [
    { t: 0.0, cam: globeCamStart, ease: 'easeInOutSine' },
    { t: 0.4, cam: globeCamZenith, ease: 'easeInOutCubic' },
    { t: 0.65, cam: bayCloseup, ease: 'easeOutQuad' },
    { t: 0.8, cam: morphStart, project: 'perspective' },
    { t: 0.9, cam: morphEnd, project: 'orthographic' },
    { t: 1.0, cam: houseFinal, ease: 'easeOutSine' },
  ];
  ```
- **Optimization Notes:** Compress GLB via `gltfpack -i globe.glb -o globe.meshopt.glb -cc -kn` and enable meshopt decoder in R3F. Share post-processing shaders between scenes; prewarm materials during loading to avoid mid-transition hitches.
