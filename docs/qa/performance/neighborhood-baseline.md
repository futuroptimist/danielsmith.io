# Neighborhood design baseline

Captured October 10, 2026 against unchanged source
`31942402970dcb75f8c3a709d1e62b43f2decf1a`, before documentation edits.
This is software-renderer evidence for planning, not tablet qualification.

## Current controlled suite

`CI=true npm run perf:budget -- --workers=1 --retries=0 --trace=retain-on-failure`
completed with four passed cases and one hardware-only skip. The controlled-result v1
artifact reports Chromium 140, 1280 x 720 viewport, immersive software renderer,
5,000 ms warmup, 20 keyboard actions and 40 interaction samples. Application ready was
803 ms; dispatch latency p95 was approximately 0.30 ms. Frame time is explicitly
`unavailable / unsupported_environment`. Dispatch timing is not end-to-end input-to-photon
latency, and this single suite is not a three-attempt timing baseline.

## Current renderer snapshots

Environment: Windows host, Node 18.17.1 (local deviation from Node 20 CI), Chromium
140.0.7339.186 headless, ANGLE SwiftShader, Vite development server, performance quality,
software-safe cadence. Three fresh browser contexts used the same 1280 x 720 viewport.
Actual renderer DPR was approximately 0.525 and drawing buffer 671 x 377. No hardware
speedup is inferred from these samples or from comparison with older Linux captures.

Capture procedure: set `danielsmith:graphics-quality-level` to `performance` in an
initialization script, open `/?mode=immersive&disablePerformanceFailover=1`, wait for
diagnostic sample count >10, dismiss the tutorial with Escape, then wait five seconds.
Poll `window.portfolio.performance.getSnapshot()` 20 times, 100 ms apart. Next use
`window.portfolio.world.movePlayerTo({ x: 54, z: 32, floorId: 'ground' })` to establish
a sidewalk pose beside the bus stop, wait five seconds and repeat the polls. Close the
context and repeat twice. This teleport is a pose fixture, not a traversal/collision
test; no full neighborhood exists yet. The software warning remained visible.

| Final sample of each attempt     |   Draw calls |             Triangles | Resident geometries | Resident textures |
| -------------------------------- | -----------: | --------------------: | ------------------: | ----------------: |
| Spawn, attempts 1 / 2 / 3        | 90 / 90 / 90 | 6,384 / 6,384 / 6,384 |        75 / 75 / 75 |         9 / 9 / 9 |
| Bus sidewalk, attempts 1 / 2 / 3 | 33 / 33 / 33 | 5,900 / 5,900 / 5,900 |        81 / 81 / 81 |      10 / 10 / 10 |

Across all retained polls, spawn varied from 90 to 103 calls and 6,384 to 6,924 triangles;
the bus pose remained at 33 calls and 5,900 triangles. Use the observed maxima for
planning: spawn leaves 47 calls, 43,076 triangles, 50 geometries and 23 textures
under the existing launch caps. Treat that as pose-specific measured headroom, not a
promise about every route or quality. Final rolling frame p95 was 100.4-100.8 ms at
spawn and 100.4-100.7 ms beside the stop, on the capped software renderer. Those numbers
do not establish hardware frame time. Polls may repeat the last completed frame;
they are not 120 distinct rendered frames. Last-render counters may omit other passes.

The [proposed allocation](../../design/neighborhood-expansion.md#baseline-evidence-and-proposed-budgets)
uses only 24 additional performance draw calls and 12,000 triangles, preserving room
for other views instead of consuming all measured spawn headroom. Current capture does
not include balanced/cinematic, byte-level memory, full routes or real-tablet timing.
Those remain required before implementation qualification, with identical capture
method on base and candidate. Historical route data is linked in the design and must
not be pooled with these different environment/pose samples.

Detailed JSON, the external read-only capture script, logs and review screenshots are
retained outside the repository in the task workspace. Aggregate evidence only is
committed, matching the performance-history convention. Integrity identifiers:

- Snapshot JSON SHA-256:
  `a250a8c45c8f21e16008ff029100253e3f2d726aad2fcfc604d9a5d44303ec2f`
- Capture script SHA-256:
  `818d0e549344e5ce3e3824a58e3a5e46e4d0fa60b2ca4880d6034da5b725e117`

The approved concept was separately materialized and visually inspected. The current
Library helper failed under Windows because POSIX extended attributes were unavailable;
the same unmodified helper succeeded under the existing local Ubuntu runtime, writing
the image and metadata into this executor's workspace. No concept image or source
photograph is committed. Reference image SHA-256:
`ae6dd013b874a2f15d927b5907053c8e13828e5fe1a846e16e82684d8fe4e164`.
