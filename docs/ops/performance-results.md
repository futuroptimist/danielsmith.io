# Controlled browser performance results

`src/app/performanceResult.ts` defines schema version 1 for a single controlled browser run. It is
an application-owned interchange contract, not real-user monitoring. A future Sugarkube collector
may invoke it from the existing visitor-journey schedule; this repository does not schedule runs,
send browser data, install dashboards, or set production alert thresholds.

## Reproducible measurement profile

A producer must record the following conditions and keep them constant when comparing results:

1. Use a clean browser context and the immutable build under test. Record the bounded build
   environment (`dev`, `staging`, or `prod`) and release tag from `/runtime/build-info.json`.
2. Use Chromium at a recorded major version with a 1280 × 720 viewport. Firefox and WebKit are
   schema-valid for future controlled profiles, but results from different browser families or
   major versions must not be compared.
3. Open `/?mode=immersive&disablePerformanceFailover=1` for an immersive run, or `/?mode=text` for
   a fallback run. Wait for the application-ready marker, then complete a 5,000 ms warmup before
   taking interaction or frame samples.
4. Measure application-ready once from navigation start to the ready marker. Perform 20 identical
   `keyboard_movement` actions at a fixed cadence and summarize the existing input-latency
   instrumentation. Publish only sample count, median, p95, and maximum; never publish events.
5. Frame-time sampling is optional. Collect 120 consecutive warm frames only when the controlled
   runner explicitly identifies a hardware renderer. Do not compare frame data across renderer
   classes. Software, unknown, text-fallback, and otherwise unsupported environments report an
   unavailable reason instead of a zero, pass, or inferred value.

Hardware and software-rendered runs are separate populations. The contract records only
`hardware`, `software`, or `unknown`; raw GPU vendor and renderer strings are intentionally absent.
A renderer transition is represented by the finite renderer state and fallback reason, not by a
console message.

## Version 1 schema and states

Every result contains `schemaVersion: 1`, `state`, Unix-second `measuredAt`, bounded build and
environment identity, measurement conditions, renderer/fallback status, and three summaries:
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
incomplete interaction sets, frame summaries that do not contain exactly 120 samples, and unknown
dimensions. This keeps later metric names and labels finite.

## Privacy and operational handoff

The result includes no browser-session or visitor identifier, user input, individual interaction
events, raw console errors, arbitrary URL, headers, IP address, raw renderer string, or open-ended
environment map. Build tags accept at most 80 safe identifier characters, including the colon in a
pinned image digest such as `sha256:...`. Exact-key validation also rejects extra top-level or
nested fields so a producer cannot silently attach private data.

The intended integration is for the existing controlled visitor-journey scheduler to run this
profile, validate version 1, and map its finite states and summaries to bounded metrics. That
Sugarkube collection, dashboard, retention, rollout, and baseline work remains a separate change.
Visitor browsers remain local-only and no production/staging behavior changes with this contract.
