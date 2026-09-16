# Controlled browser performance result

The controlled browser performance result is a versioned, bounded handoff for repeatable synthetic
measurements. It is not real-user monitoring and does not transmit anything by itself. The existing
visitor-journey scheduler may later run the measurement and collect the returned object; that
Sugarkube integration, dashboards, alerts, and deployment are separate work.

## Reproducible measurement conditions

Each comparison must use the same immutable build, Chromium release, rendering class, and
`1280×720` viewport. Start a fresh browser context with no persisted site storage, load
`/?mode=immersive&disablePerformanceFailover=1`, and wait for `data-app-mode="immersive"` and the
scene canvas. Run five unrecorded warmup journeys, followed by 20 recorded journeys. For each
recorded journey:

1. Measure application-ready duration from navigation start until immersive mode and its canvas are
   ready.
2. After readiness, dispatch the same keyboard movement action and measure from dispatch until the
   next painted animation frame. Do not use visitor-provided input.
3. Reset the browser context before the next journey. Keep browser flags, host load, viewport, and
   graphics-quality choice constant.

Record medians and p95 values from the bounded samples. A baseline is an explicit input from an
equivalent prior run, never a production threshold embedded in the application. A result is a
`regression` only when its p95 exceeds that supplied baseline. Without a baseline, a valid summary
is `available`, not an assertion that production performance is good.

Hardware and software results are separate cohorts. Classify the renderer using the existing
renderer diagnostics: `hardware`, `software`, `text`, or `unsupported`; also record whether the
application fallback is active. Frame-time samples are optional and are accepted only when the
runner explicitly declares support **and** diagnostics identify hardware rendering. Software,
text-fallback, unsupported, and unqualified environments report frame time as `unavailable` with
zero samples and `null` values. They must never report zero milliseconds or success.

## Schema version 1

`createControlledPerformanceResult` emits this fixed shape, while
`parseControlledPerformanceResult` rejects malformed or out-of-bounds objects:

```json
{
  "schemaVersion": 1,
  "applicationReady": {
    "state": "available | regression | unavailable",
    "sampleCount": 20,
    "medianMs": 850,
    "p95Ms": 1100
  },
  "controlledInteraction": {
    "state": "available | regression | unavailable",
    "sampleCount": 20,
    "medianMs": 25,
    "p95Ms": 42
  },
  "frameTime": {
    "state": "available | regression | unavailable",
    "sampleCount": 20,
    "medianMs": 16,
    "p95Ms": 22
  },
  "rendering": { "mode": "hardware", "fallbackActive": false },
  "build": { "environment": "staging", "tag": "main-abc1234" },
  "environment": {
    "browser": "chromium",
    "browserVersion": "128.0",
    "viewportWidth": 1280,
    "viewportHeight": 720
  }
}
```

Durations are finite values from 0 through 120,000 milliseconds, each summary contains 1–50
samples, viewport dimensions are positive integers no larger than 16,384, and identity strings are
1–64 characters. Build environment and rendering mode use fixed vocabularies. These bounds keep
the document and future metric dimensions predictable.

`available` means a supported measurement produced valid bounded samples. `regression` means the
p95 exceeded an explicitly supplied comparable baseline. `unavailable` means the environment does
not support that measurement; its count is zero and its values are `null`. Renderer fallback is an
independent fact, so a usable text fallback can coexist with unavailable immersive measurements.

## Privacy boundary and scheduler handoff

The result contains only aggregate durations, renderer/fallback state, an immutable build tag,
deployment environment, browser name/version, and viewport size. It must not contain browser
session identifiers, cookies, IP addresses, user input, event values, raw console errors, raw
renderer strings, arbitrary URLs, user-agent strings, or other unbounded environment data. Raw
samples remain inside the controlled runner and are discarded after summarization.

The visitor-journey scheduler is the intended producer and transport boundary. A later integration
may map these fixed states and summaries to bounded metrics while keeping software and hardware
cohorts distinct. This repository does not add a scheduler, collector, analytics endpoint,
production threshold, dashboard, or deployment.
