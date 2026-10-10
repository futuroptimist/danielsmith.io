# Lighting fidelity and constrained-device design

Status: proposal only. No runtime, asset, dependency or renderer upgrade is authorized by
this document. Source audit: `fd127030` (after neighborhood design PR #1128).

## Decision and evidence

Improve readable surface response and local grounding first. Keep Performance inexpensive;
pilot geometry-aware static indirect lighting in one room before adopting a bake pipeline.
Consider one bounded dynamic shadow map for higher tiers only after qualification. Full
real-time global illumination is not a prerequisite or a promised outcome.

The private owner reference was resolved through Library, materialized with its current
helper into the consuming desktop workspace, checked as 1,061,024 readable bytes, and
visually inspected. Its PNG header records 2048 x 1393 pixels, Library identity
`libfile_b2dc7d1d37748191bc314e8ba7d1535a`, SHA-256
`36de7d8f485aa5d47da53695549b59c5cd12122102a4457e1fcf86802c0e4ac3`.
Retrieve privately with owner-authorized Library access; reverify local bytes before using
it. No source image, thumbnail, browser chrome or download URL belongs in this repository.

The image shows near-white perimeter strips and cyan POI rings above dark interior floors;
furniture and stair faces have limited visible contact shading. Exterior lamp pools appear
as sharply bounded patches. These are visual observations, not proof of a particular GPU
fault or light leak. Prefer softer local falloff, legible floor/wall separation, grounded
objects and consistent interior/exterior response over simply raising global exposure.
The visible FPS overlay is one uncontrolled instant, not a baseline or a device identifier.

The historical owner report of Samsung Tab A8 SM-X200 indoor 4-10 FPS versus about 60 FPS
in the basement is a priority signal, not a matched current measurement. No new hardware
timings were taken for this design. RTX 4090 and M5 MacBook Pro results are unavailable;
the shared production RTX host must not run disruptive profiling or offline bakes.

## Current implementation, including gaps

| Area               | Audited behavior and implication                                                                                                                                                                                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renderer           | `package-lock.json` pins Three.js 0.161.0. `src/immersiveScene.ts` constructs antialiased `WebGLRenderer` with an orthographic camera, sRGB output, ACES filmic tone mapping and initial exposure 1.1. No WebGPU/path tracing pipeline exists.                                                                                    |
| Output path        | `EffectComposer` has RenderPass, optional UnrealBloomPass and AfterimagePass through `motionBlurController.ts`; no OutputPass is attached. Afterimage is normally disabled at zero intensity. A direct-render versus postprocessed color comparison is required before changing exposure.                                         |
| Lights             | Ambient 0.38, hemisphere 0.22 and directional 0.64 are initial values, subsequently affected by environment animation/presets. Room LED point lights and street lights are unshadowed. Emissive materials and bloom do not themselves illuminate nearby geometry.                                                                 |
| Shadows            | Mesh cast/receive flags exist, but no `renderer.shadowMap.enabled` assignment or directional shadow rig was found. Flags alone do not produce cast shadows. The neighborhood reference to an existing shadow setup must not be read as an enabled map.                                                                            |
| Materials          | House surfaces use MeshStandardMaterial; stylized proxies use MeshBasicMaterial. The floor/wall/fence lightmap intensities begin at 0.078/0.68/0.56. Material and roughness calibration must preserve POI identity and not turn every surface glossy.                                                                             |
| Existing lightmaps | `bakedLightmaps.ts` synthesizes RGBA8 gradients: floor 256², wall 128², ceiling 192², sRGB-tagged, linear filtering, no mipmaps. Total pixel payload is 475,136 bytes before overhead. No geometry visibility, ray bake, atlas loader or occlusion solution is present.                                                           |
| UVs                | `applyLightmapUv2` copies existing `uv` to `uv2`; it is not a unique unwrap. Textures do not select another channel. In r161 `Texture.channel` defaults to 0, and lightMap selects that channel. A UV2 attribute-presence test does not prove that a bake uses it.                                                                |
| Animated bounce    | `lightmapBounceAnimator.ts` scales material lightmap intensity from LED programs, averaging shared floor/wall response. It is an art-directed approximation; local occlusion and separate room response are not computed. Reduced-pulse preferences already affect it.                                                            |
| Quality            | Cinematic/Balanced/Performance DPR scales are 1/0.85/0.7; exposure is 1.1/1.02/0.96. Performance disables bloom and decorative dynamic point lights, lowers segments/canvas resolution and throttles decoration. Balanced/Cinematic share high geometry/effects; their detail budget fields are hints, not enforced frame limits. |
| Visibility         | Floor visibility hides inactive floor groups/lights/POIs and preserves adjacent stairs. Normal frustum culling is not room occlusion. No general spatial-cell or projected-size neighborhood LOD implementation was found; #1128 proposes those.                                                                                  |
| Construction       | Source level generators drive floors/walls/connections. Street fixtures use InstancedMesh; miniature coverage/proxy registries and manifest track shared/excluded components. Current miniature proxies are unlit and the table has a finite recursive boundary.                                                                  |
| Tests              | `bakedLightmaps.test.ts` checks gradient relationships and UV copying. Quality, environment, bounce, miniature and decorative-lighting tests cover policies/state. They do not validate bake visibility, GPU memory bytes, soft-shadow artifacts or physical tablet performance.                                                  |

Primary engine references are pinned to r161 rather than latest documentation:
[channel selection and offscreen color handling](https://github.com/mrdoob/three.js/blob/r161/src/renderers/webgl/WebGLPrograms.js),
[Texture defaults](https://github.com/mrdoob/three.js/blob/r161/src/textures/Texture.js),
[indirect lightmap accumulation](https://github.com/mrdoob/three.js/blob/r161/src/renderers/shaders/ShaderChunk/lights_fragment_maps.glsl.js),
[OutputPass](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/postprocessing/OutputPass.js),
and [shadow-map implementation](https://github.com/mrdoob/three.js/blob/r161/src/renderers/webgl/WebGLShadowMap.js).

In particular, offscreen rendering changes tone/output handling. Treat the missing final
output conversion as an audit finding to reproduce, not a screenshot-only diagnosis.
Audit generated linear color bytes tagged sRGB, imported color textures, unlit proxies,
emissive textures, and custom shaders with a neutral ramp and known reference patches.
Keep radiometric work linear, annotate texture encodings explicitly, and perform display
conversion/tone mapping exactly once on every enabled-pass combination. Verify an r161
OutputPass prototype rather than copying modern renderer behavior. Retune bloom only after
that test; bloom should soften luminous appearance without masquerading as indirect light.

## Options and staged recommendation

| Option                                                                                    | Quality benefit                                            | Cost and limits                                                                                                                                                                | Decision                                                                               |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Room-aware ambient/hemisphere, vertex or small texture gradients, bounded contact accents | Better floor/wall separation, local warmth and grounding   | Very low pass cost; no true visibility or bounce. Shared ambient can leak through walls unless receiver response is room-aware. Extra contact planes can add overdraw.         | Default foundation for all tiers, especially Performance.                              |
| Offline static indirect lightmaps plus cheap dynamic actor lighting/contact               | Geometry-aware occlusion and stable soft indirect response | UV authoring, texel density, asset streaming and invalidation costs; frozen assumptions cannot follow moving furniture/doors. Dynamic actors need separate indirect estimates. | Pilot one representative room; expand only after fidelity and memory gates.            |
| One nearby directional/spot shadow map                                                    | Grounded moving avatar and directional cast shadows        | Additional caster submissions and texture filtering every update; acne, detached shadows and shimmering require careful frustum/bias work. Does not supply GI.                 | Optional Balanced/Cinematic experiment after low-tier foundation.                      |
| Screen-space AO/indirect effects                                                          | Local depth cues on visible surfaces                       | Depth/normal buffers, resolution-dependent passes, halos and missing offscreen contributors; cutaways/disocclusion are difficult. AO is not GI.                                | No default dependency; isolated higher-tier experiment only if a measured gap remains. |
| Light probes / precomputed irradiance                                                     | Coherent approximate indirect light on dynamic objects     | Authoring, interpolation and room leakage control; stock wiring is not currently present.                                                                                      | Evaluate a small per-room irradiance representation after the bake pilot.              |
| Real-time ray/path tracing, dynamic GI, large cascades                                    | Potentially richer changing illumination                   | New backend/integration, temporal noise, bandwidth and substantial device risk; RTX does not establish mobile viability.                                                       | Defer to a separate proposal; no fallback requirement on low tier.                     |

1. **Foundation:** capture matched baseline; audit color/output; tune restrained emitter,
   roughness and room receiver response; prototype floor-aware contact shading. Keep a
   no-bake path. Compare exterior pool edge gradients against the interior strip falloff.
   Require an optimization dependency if the current tablet base already fails its budget.
2. **Bake pilot:** one furnished room with doorway, wall corner, stair adjacency and moving
   avatar. Compare foundation versus indirect-only atlas at identical output settings.
   Reject it if gains need unacceptable blur, atlas splits, memory or authoring overhead.
3. **Bounded dynamic shadows:** one light/map, explicit caster/receiver lists and per-pass
   telemetry. Test avatar motion and doors with baked indirect present. Promote independently
   per tier; low tier remains a complete visual experience without these shadows.
4. **Expansion:** apply proven recipe/asset contracts to floors and neighborhood cells;
   remeasure complete routes. Any real-time GI experiment requires a separate decision.

## Light transport, occlusion and transitions

Use floor/room/source IDs for lighting zones and receiver masks. A light's distance falloff
does not stop it illuminating through a wall. Keep exterior lights from brightening closed
interior walls; distinguish open doorways from solid partitions. Ambient/hemisphere light
has no wall visibility, so globally increasing it is not a substitute for local response.
Keep neutral navigation fill even where artistic darkness is desired.

For static bakes, maintain a physical occluder shell independent of camera cutaways.
Removing a roof for viewing must not flood its room with baked sky. Hidden floor groups
and simplified visual walls likewise must not accidentally change physical occlusion.
Declare which walls/ceilings cast/receive for each floor; preserve stairwell openings and
door thickness. Bake tests include thin adjacent walls, corners and a closed/open doorway.
Do not bake permanent contact shadows from movable avatars, doors or movable furniture.

Blend room/portal indirect response over a bounded doorway transition with hysteresis;
start with a 0.5 m band and 200 ms response, then tune by walking both directions. Never
blend through solid walls or across floor IDs merely because positions are nearby. Keep
exposure stable during the pilot; do not use rapid auto-exposure to conceal inconsistent
interior/exterior lighting. Reduced motion uses stable or immediate zone changes without
pulsing. Test both exterior doors, garage, stairs, basement and return to the same room.

For Performance, an avatar contact accent must project only onto the actual supporting
floor/tread, respect holes and fade with height. A single flat disk floating across stairs
is unacceptable. If receiver clipping cannot be cheap and correct, retain neutral actor
lighting without the accent; contact shadows are approximate, not directional cast shadows.

For higher-tier maps, prototype 512² Balanced and 1024² Cinematic, one light, with a tight
near/far range and receiver-local directional bounds. Stabilize directional texels during
camera movement, include off-camera casters whose shadows intersect visible receivers, and
measure precision before increasing resolution. Compare PCF filtering against the proposed
softness; a larger bias hides acne by detaching contact and is not a softness control.
Tune depth/normal bias in scene units with shallow surfaces, stair treads and moving feet.
Do not promise `shadow.radius` will control every filter identically. Reject light bleeding,
wall-through shadows, unstable penumbrae and peter-panning; VSM adds blur passes and bleeding
risk. Point-light shadow cubes are out of the initial scope. Cache only genuinely static
maps; invalidate for light, caster, door, floor/occluder and relevant transform changes.

## Bake, UV and resource contract

The first bake stores static **indirect diffuse irradiance**, not albedo, emissive display
glow or the same direct term also supplied at runtime. Validate the r161 lightMap intensity
convention with a gray diffuse fixture. Avoid double-counting existing gradients, ambient,
AO or direct light; an indirect atlas is not simply added at full strength to all of them.
Dynamic characters receive a bounded room/probe estimate plus runtime direct light; compare
their luminance with adjacent static surfaces while walking, sitting and crossing portals.
Low tier can retain a simpler room tint if probe sampling is not justified.

Create unique nonoverlapping lightmap charts in a dedicated, explicitly selected UV channel.
In r161, `channel=1` selects `uv1` and `channel=2` selects `uv2`; choose one contract and test
it in rendered output. Duplicating repeated box-face UVs is insufficient. Validate chart
overlap, orientation, texel density, seams and padding at every shipped mip/tier, including
NPOT restrictions if supporting WebGL1. Start with at least four texels of dilated padding
at the smallest evaluated mip, adjusting the atlas layout or mip range if that cannot hold.
Do not disable mipmaps globally to hide bleed at neighborhood/miniature scales.

Partition atlases by floor/streaming cell and shared material compatibility, not by every
object. A unique atlas/material per house destroys batching. Repeated house instances can
share kit-local indirect lighting only when orientation and neighboring occlusion assumptions
are valid; location-specific sunlight/contact requires another representation or an explicit
per-instance atlas transform. Stock InstancedMesh does not supply this contract automatically.
Any shader extension must be measured and tested, including shadow/depth variants.

Match boundary radiance across atlas cells and LODs. Preserve charts or rebake simplified
geometry against the same physical shell; do not rescale arbitrary UVs at LOD transitions.
Budget temporarily resident atlas pairs and double-submitted transition meshes. Keep
neighbor shells closed/non-enterable as in the neighborhood design; no unseen interior
atlases or per-house shadow lights. Spatial batching/culling follows its 2-4-lot experiment
and projected-size hysteresis, with conservative shadow-caster bounds separate from view
bounds. Instancing reduces draw calls, not pixels, light evaluations or triangles.

A bake manifest must record source commit, stable geometry/material/light/occluder IDs and
hashes, world units/transforms, UV generator version, atlas layout/resolution, color encoding,
baker/version, environment asset hash, sample count, bounce count, seed, denoise settings and
output hashes. Store recipes and validation reports with versioned outputs; provide a single
reproducible command in a later implementation. Verify repeat output hashes where deterministic;
otherwise preserve bounded numerical/image differences and the tool/device provenance.
Bake jobs must run on approved offline resources, never automatically on the shared RTX host.

Invalidate affected cells on geometry, material albedo, light, transform, occluder, portal or
UV changes; propagate to neighboring cells influenced by that change. Dynamic doors need an
explicit conservative bake assumption (indirect only, no baked moving-door shadow), not a
stale closed-door direct pattern. Seasonal/LED changes remain modest runtime modulation in
the pilot; major day/night changes require separately qualified assets or a neutral fallback.
Missing/stale manifests select the approximation and emit diagnostics, never silently load
a mismatched bake. Do not regenerate bakes in the visitor's browser.

## Proposed budgets and measurement boundaries

Preserve [neighborhood limits](neighborhood-expansion.md#baseline-evidence-and-proposed-budgets),
the roadmap's desktop 90 FPS / mid-range mobile 60 FPS goals, and the existing launch guards
(150 calls, 50k triangles, 125 geometries, 32 textures; hardware p95 <=80 ms).
Those coarse launch guards are not the target user experience. The low-end 30 FPS profile
is an additional minimum, not a downgrade of desktop/mobile targets. All new numbers below
are proposed ceilings, not achieved measurements or current enforcement.

| Metric                                                                        | Performance / low-end                               | Balanced                             | Cinematic                    |
| ----------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------ | ---------------------------- |
| Matched hardware p95 frame time                                               | <=33.3 ms on SM-X200; <=16.7 ms on mid-range mobile | <=16.7 ms mobile / <=11.1 ms desktop | <=11.1 ms qualifying desktop |
| Added lighting whole-frame time                                               | <=1 ms and <=5% regression                          | <=1.5 ms and <=5%                    | <=2 ms and <=5%              |
| New whole-frame submissions, including shadow/post passes                     | <=4 calls, <=1k triangles                           | <=12 calls, <=5k triangles           | <=24 calls, <=10k triangles  |
| Dynamic shadow maps / decorative point lights added                           | 0 / 0                                               | <=1 at 512² / 0                      | <=1 at 1024² / 0             |
| Added resident lightmap textures / material variants                          | <=2 / <=2                                           | <=2 / <=4                            | <=2 / <=4                    |
| Added decoded lightmap texture storage, including mips and transition overlap | <=2 MiB                                             | <=8 MiB                              | <=16 MiB                     |
| Added lighting render-target storage, all attachments                         | 0                                                   | <=8 MiB                              | <=16 MiB                     |
| New compressed lighting transfer, whole route / critical startup              | <=1 MiB / <=256 KiB                                 | <=2 MiB / <=512 KiB                  | <=4 MiB / <=1 MiB            |
| Added UV/instance buffers / retained JS heap                                  | <=1 MiB / <=2 MiB                                   | <=2 MiB / <=4 MiB                    | <=2 MiB / <=4 MiB            |

Use the strictest applicable additive and whole-scene limit. Lighting and neighborhood
allocations share the same remaining headroom; do not add them and silently raise limits.
At the retained software spawn maximum of 103 calls, neighborhood +24 and lighting +4 would
leave 19 under 150, but that arithmetic is only a planning example. Counters may omit passes;
other checkpoints and recursive-model changes need new matched baselines. Whole outdoor route
limits remain 150 calls/50k triangles Performance and 200/75k Balanced/Cinematic. No blanket
post-traversal geometry cap of 125 is implied: the existing history documents accumulated
resident resources. Report route totals and incremental deltas separately.

RGBA8 storage is width _ height _ 4 before mipmaps (about 4/3 with a full chain): 512² is
1.33 MiB, 1024² is 5.33 MiB, 2048² is 21.33 MiB with mips. Thus an unconditional 2048² atlas
already exceeds every proposed added lightmap cap. RGBA16F doubles these byte estimates.
Compressed transfer bytes are not decoded GPU bytes. KTX2/Basis is a later capability-gated
option requiring measured transcode time, fallback size and codec error; no loader installation
is part of this design. Count shared texture storage once, retaining staging/CPU copies and
all shadow, bloom, composer and afterimage attachments separately. Record actual formats and
dimensions, including depth/MSAA and temporary allocations; resource counts alone are not
memory measurements. The existing composer allocations are part of the total baseline even
when a pass is disabled. Treat these estimates as estimates where driver memory is unavailable.

Lazy-load optional atlases after usable interaction, retain a bounded active/adjacent-cell
working set, and avoid upload bursts during door crossings. Test cold network and decode/upload
stalls separately from warm frame time. A missing or slow atlas must preserve a usable
approximation without moving POIs, blocking navigation or flashing black surfaces.

## Representative benchmarks and regression strategy

The [October 10 neighborhood note](../qa/performance/neighborhood-baseline.md) records three
software-renderer attempts at spawn and bus sidewalk, Performance quality: final 90/33 calls,
6,384/5,900 triangles and 9/10 textures; spawn polls reached 103 calls. Its ~100 ms rolling
frame times reflect capped SwiftShader cadence, not tablet/desktop qualification. Its
controlled suite reports frame time unavailable. Older route histories are different builds
and profiles; do not pool them or substitute the old 18 MB press-kit estimate for GPU bytes.

Before implementing each stage, freeze base/candidate commit, build mode, browser/version,
device/OS/GPU, renderer backend, viewport, actual DPR/drawing buffer, tier, camera/zoom,
floor, seed/time/LED phase, accessibility preferences and route. Use the same settings and
content on both heads; separately rebaseline when neighborhood or recursive models land.
Run three independent warmed attempts of a scripted 60-second route after a 10-second warmup,
plus three cold starts. Record battery/power and thermal state. Perform a later sustained
thermal test on the tablet; it is not part of this design-only work on shared hardware.

Routes/checkpoints: initial dark main room; brightest strip and media wall; furniture and
wall corner; both sides of an open/closed exterior doorway; garage; ascending/descending
stairs and landing; basement museum; street lamp pool and bus shelter; miniature close-up
and maximum zoom-out; future densest planted neighborhood cell and its LOD seam. Include
actual keyboard/touch traversal, avatar walk/run/sit and floor returns; teleport-only poses
do not qualify movement or transitions. Repeat lighting comparisons with bloom/motion blur
off and on, all tiers, reduced motion/high contrast, and fixed exposure.

Store per-attempt raw rAF intervals, independent long gaps/tasks (including >=1 s gaps the
rolling diagnostics exclude), p50/p95/p99/max, CPU/update timings, asynchronously queried GPU
timings when supported, disjoint/unavailable flags, total and per-pass calls/triangles, unique
resources and estimated/observable bytes. Aggregate calls across all passes with one frame
boundary; do not report the last composer pass as the whole scene. Never synchronously read
GPU timers. Report each attempt and its distribution, not averaged FPS or a percentile of
three summary percentiles. Require every valid attempt to meet the tier limits; investigate
invalid/failed attempts rather than dropping them. Provisional steady-state p99: <=50 ms
low-end, <=25 ms mid-range mobile, <=16.7 ms desktop; no new attributed >100 ms warm stall.

Measure interaction end-to-end where supported and retain the existing INP <=200 ms target;
dispatch-handler latency is not input-to-photon latency. Input must remain usable under slow
network, atlas upload and quality reload. Mark unsupported metrics and unavailable hardware
explicitly. Browser/CI software runs validate behavior and counters, never M5/RTX/tablet speed.

Later implementation tests should extend current suites with rendered UV-channel fixtures,
atlas overlap/padding and manifest invalidation, no double-lighting gray patches, doorway
occlusion, floor-correct actor contact, stable shadow bias, pass-toggle color equivalence,
LOD/atlas seam images and per-tier allocations. Use private before/after crops at fixed poses
with human review plus toleranced image diffs; do not replace the CI-owned launch screenshot.
Avoid image-diff thresholds that excuse visible leaks or erase deliberate improvements.
Retain raw benchmark files, runner/config, hashes and failure evidence in an owner-accessible
durable archive referenced by the later PR; normal 14-day CI artifacts alone are insufficient.

## Shared scenes, lifecycle and acceptance gates

Lighting metadata must attach to stable source/room/material identities, not copied mesh
names or a second divergent miniature catalog. Coordinate with recursive POI/property work
before implementation: preserve its canonical transform, finite recursion/LOD termination,
POI physical size and source coverage contracts. This audit describes the current proxy
registry, not an API assumed to exist after that work. Miniatures inherit palette, emitter
intent and broad shading response with their cheaper detail policy; they must not duplicate
full-size lights, allocate a bake per recursion depth or illuminate the outer room. Include
their buffers/textures/calls in the host-scene budget. Reuse atlases only when mapping and
scale assumptions hold; otherwise use a source-derived approximation with a manifest reason.

Keep renderer resource ownership explicit, shared atlas reference counts bounded, and
asynchronous loads cancelable on teardown. Exercise ten floor/door/miniature/quality and
immersive/text cycles, background/foreground, resize/orientation and simulated context loss.
After cycle 2, proposed retained heap drift is <=1 MiB across the remaining cycles with
comparable collection; resource counts must settle, not grow monotonically. Dispose shadow
targets and stale textures once, recreate valid assets after restoration, and fall back
to the approximation or existing text safety path on unrecoverable renderer/asset errors.

Preserve user-directed low-FPS recovery: no silent quality downgrade, DPR change, reload or
text switch during runtime. Startup capability policy remains separate. Keep keyboard/touch
settings, readable stairs/doors/POIs, high contrast, reduced pulse/motion and explicit text
mode. Lighting is not the only signal for interaction or navigation; avoid flashing temporal
noise, exposure pumping and blur that obscures labels. DOM accessibility tests need 3D visual
review alongside them.

Promotion requires: corrected color fixture; owner-approved room comparison; reproducible
assets/UVs; all existing gates plus new focused regressions; matched base/candidate hardware
evidence under the strict shared budgets; no resource growth or fallback regression. If the
tablet baseline is still 4-10 FPS, optimize the measured bottleneck before shipping lighting
cost. Missing tablet/M5 qualification or an unconfirmed recursive-scene interface is an
implementation gate, not a reason to label this proposal measured or to promise full GI.
