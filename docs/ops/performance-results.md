# Controlled browser performance results

`src/app/performanceResult.ts` defines schema version 1 for a single controlled browser run. It is
an application-owned interchange contract, not real-user monitoring. A future Sugarkube collector
may invoke it from the existing visitor-journey schedule; this repository does not schedule runs,
send browser data, install dashboards, or set production alert thresholds.

## Reproducible measurement profile

A producer must record the following conditions and keep them constant when comparing results:

1. Use a clean browser context and the immutable build under test. Record the bounded build
   environment (`dev`, `staging`, or `prod`) and release tag from `/runtime/build-info.json`.
2. Use Playwright Chromium at a recorded major version with a 1280 × 720 viewport and a clean
   browser context. Firefox and WebKit are schema-valid for future controlled profiles, but they do
   not qualify for the `controlled_hardware_v1` frame profile. Never compare different browser
   families, major versions, viewports, or frame profiles.
3. Open `/?mode=immersive&disablePerformanceFailover=1` for an immersive run, or `/?mode=text` for
   a fallback run. Application ready is the first instant when `data-app-loading` is absent from
   `<html>` and `data-app-mode` is exactly `immersive` or `fallback`.
4. Measure application ready once from the navigation performance time origin to that marker. Wait
   5,000 ms after readiness, emit a synthetic `pagehide` to reset the existing latency monitor, and
   begin both sample windows only after that reset.
5. Perform exactly 20 identical `keyboard_movement` actions, using `W`, 50 ms apart. Each action is
   one complete key press and produces one `keydown` plus one `keyup`, so the required interaction
   window contains 20 actions but 40 event samples. Reject other event types, mismatched event or
   category totals, missing key halves, and incomplete windows.
6. The existing input-latency monitor measures the interval from each DOM event's `timeStamp` until
   its passive window listener runs. This is event-dispatch delay at the listener, not paint,
   presentation, input-to-next-frame, or end-to-end response latency. Publish only sample count,
   median, p95, and maximum; never publish individual events.
7. Keep the frame window separate from the 40-event interaction window. Frame-time sampling is
   optional and requires exactly 120 consecutive warm frames. It is available only when the page
   remains immersive, renderer diagnostics identify a non-software normal-risk renderer, and the
   producer records `controlled_hardware_v1`. The diagnostics snapshot used by the browser budget
   test does not expose a complete median/p95/maximum 120-frame window, so the adapter reports frame
   time as not collected rather than inventing statistics. Software, unknown, fallback, unavailable,
   or unqualified rendering uses `unsupported` and reports an explicit unavailable reason.

Hardware and software-rendered runs are separate populations. The contract records only
`hardware`, `software`, or `unknown`; raw GPU vendor and renderer strings are intentionally absent.
A renderer transition is represented by the finite renderer state and fallback reason, not by a
console message.

## Version 1 schema and states

Every result contains `schemaVersion: 1`, `state`, Unix-second `measuredAt`, bounded build and
environment identity, the bounded frame-measurement profile, measurement conditions,
renderer/fallback status, and three summaries:
`applicationReady`, `interactionLatency`, and `frameTime`. Available summaries contain only
`sampleCount`, `medianMs`, `p95Ms`, and `maxMs`. Durations are finite values from 0 through
3,600,000 ms; sample counts are integers from 1 through 10,000; viewport dimensions and browser
major version are bounded by the parser.

- `completed`: both required measurements are available and no caller-provided comparison limit
  was exceeded.
- `regression`: a required measurement exceeds a limit supplied by the controlled run. Limits are
  deliberately not embedded here until a measured baseline supports production thresholds.
- `unavailable`: application-ready or interaction latency could not be measured.
- Measurement `available`: a valid bounded summary exists.
- Measurement `unavailable`: the value was not collected, the environment is unsupported, or the
  renderer fell back. Unavailable is never serialized as zero or treated as success.

Consumers must call `parsePerformanceResult` and discard rejected results. The parser requires the
exact versioned field set, rejects malformed ordering (`median <= p95 <= max`), invalid bounds,
incomplete interaction sets, contradictory action/event counts, frame summaries that do not contain
exactly 120 samples, and unknown dimensions. A completed interaction window must contain exactly
`requestedActions × eventsPerAction` samples; the current profile fixes `eventsPerAction` at two.
Malformed supplied regression limits are errors rather than an omitted comparison. This keeps later
metric names and labels finite.

The controlled Playwright run passes its result through `serializePerformanceResult` and writes the
single normalized file
`test-results/controlled-performance/controlled-performance-result-v1.json` before checking its
expected state and summaries. CI uploads that exact file for 14 days with `if: always()`, so a valid
anomalous result remains available when a later assertion fails. The run records its Unix
measurement time and safely bounded identity from `/runtime/build-info.json`; missing or invalid
identity fails closed. Result creation and serialization each copy every parser-approved field into
fresh plain data, preventing producer mutation and inherited or non-enumerable `toJSON` hooks from
changing the artifact.

## Privacy and operational handoff

The result includes no browser-session or visitor identifier, user input, individual interaction
events, raw console errors, arbitrary URL, headers, IP address, raw renderer string, or open-ended
environment map. Build tags accept at most 80 safe identifier characters, including the colon in a
pinned image digest such as `sha256:...`. Exact-key validation also rejects extra top-level or
nested fields so a producer cannot silently attach private data.

The intended future integration is for the existing controlled visitor-journey scheduler to run
this profile, validate version 1, and map its finite states and summaries to bounded metrics.
Collector transport, scheduler wiring, dashboards, rollout, and production alert thresholds remain
explicitly deferred to a separate operational change. Visitor browsers remain local-only and no
production/staging behavior changes with this contract.
