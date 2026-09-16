# Visitor journey assertions

The application owns a deterministic essential visitor-journey contract. It verifies more than the
static `/healthz` and `/livez` responses:

1. `/` returns the expected HTML application shell.
2. JavaScript initializes and selects an application mode.
3. The `/src/main.ts` application entry module (excluding Vite's development client) and
   `/favicon.ico` are retrievable with JavaScript and image response types;
4. `/?mode=text` exposes a visible main landmark, heading, and résumé action; and
5. `/resume.pdf` has an `application/pdf` content type **and** begins with the `%PDF-` signature.

The content-type and signature checks prevent an HTTP 200 HTML fallback from passing as the résumé.
The browser assertion lives in `playwright/visitor-journey.spec.ts`. Its intercepted browser-fetch
fixtures execute the same essential probes used by the success case. They replace the application
entry module with invalid JavaScript, return a 404 for the required favicon, and return HTTP 200 HTML
for the résumé with both `text/html` and misleading `application/pdf` response types. Every failure
fixture also checks that `/healthz` and `/livez` remain healthy. A separate fixture disables WebGL
context creation, then verifies that the usable accessible fallback makes the aggregate succeed.
These are failures and recovery behavior that process-level readiness endpoints cannot detect.
Focused interruption fixtures also hold a browser request open, then verify that deadline or
producer cancellation closes the owned page and settles cleanup before the aggregate returns.

## Essential and optional behavior

The accessible text experience is essential functionality and is a successful visitor outcome.
Immersive rendering is an optional, separately tested enhancement. Lack of WebGL or an unavailable
immersive renderer must not turn a usable accessible fallback into a total visitor-journey outage.
Existing immersive Playwright suites retain ownership of renderer-specific behavior.

## Sanitized result contract

`runVisitorJourney` returns only:

- `state`: `success` or `failure`;
- `freshness`: assertion completion time in Unix seconds, derived from the sanitized clock;
- `aggregateDurationMs`: elapsed milliseconds from assertion start through completion, clamped to a
  finite, nonnegative value; and
- `failureStage`: one finite stage name or `null` on success.

The stage vocabulary is homepage delivery, JavaScript initialization, essential assets, accessible
fallback, résumé PDF, timeout, and producer interruption. Probe exceptions are reduced to those
stage names. Results must never include visitor data, page contents, prompts, responses, cookies,
tokens, headers, URLs with request identities, or credentials.

This repository provides assertions and the sanitized aggregate shape only. The Step 06a boundary
remains unchanged: Sugarkube scheduling, metric collection, dashboards, alerts, runtime activation,
visitor collection, and staging or production qualification are deliberately deferred to separate
integration work.

## Controlled performance result

`src/app/performanceResult.ts` defines version 1 of the handoff for repeatable browser performance
checks. It complements the availability result above; it is not real-user monitoring. A producer
records application-ready duration, a summary of controlled interaction latency, renderer class and
fallback status, and (only in a named, supported hardware-rendering environment) a frame-time
summary. An unsupported or uncollected measurement has `state: unavailable` plus a fixed reason. It
must never be encoded as zero or as a successful measurement.

The bounded JSON-compatible shape is:

- `schemaVersion: 1` and `measuredAt` as whole Unix seconds;
- `build.environment` (`dev`, `staging`, or `prod`) and a 64-character maximum safe-token image tag;
- `conditions` containing Chromium major version, viewport, `immersive` or `text` rendering mode,
  and warmup milliseconds;
- `renderer.class` (`hardware`, `software`, or `unavailable`), `renderer.status` (`immersive` or
  `fallback`), and an optional safe-token fallback reason; and
- `measurements.applicationReady`, `measurements.interactionLatency`, and
  `measurements.frameTime`. Summaries contain only sample count, median, and p95. Frame time also
  identifies the supported environment that made the sample comparable.

Durations are positive whole milliseconds capped at one hour, summaries are capped at 600 samples,
tokens are capped at 64 characters, and viewport/browser/warmup fields have explicit numeric bounds.
The parser rejects unknown keys and malformed values rather than repairing them. This prevents
session identifiers, user input, raw console errors, arbitrary URLs, or unbounded browser and host
data from crossing the handoff boundary.

### Reproducible measurement conditions

Use a clean Chromium context at a fixed 1280×720 viewport. Record the Chromium major version and
the immutable build tag returned by `/runtime/build-info.json`. Select the rendering mode explicitly:
use `?mode=immersive&disablePerformanceFailover=1` for immersive measurements and `?mode=text` for
fallback measurements. Start application-ready timing immediately before navigation and stop only
after `data-app-loading` is removed and `data-app-mode` identifies the selected mode. Wait 5,000 ms
after readiness before sampling.

For controlled interaction latency, issue the same synthetic keyboard movement after warmup and
collect 30 consecutive samples from the existing input-latency instrumentation. Export only the
median and p95. Do not export event values or keys. Software and hardware renderer runs form
different cohorts and must never be compared as one baseline. Software-rendered runs report the
renderer and fallback state but mark frame time `unsupported_renderer`. Hardware frame-time results
are permitted only when the producer names a pre-qualified environment (for example,
`linux-chromium-gpu`) and uses 120 consecutive post-warmup samples from the existing performance
diagnostics. Other environments report `unsupported_environment`.

No pass/fail production thresholds are defined by this contract. Establish and review a measured
baseline before applying regression limits. The existing visitor-journey scheduler is the intended
future owner of the controlled browser invocation and bounded result collection. Scheduler wiring,
metric conversion, dashboards, alerts, rollout, and environment qualification remain in the
separate integration change.
