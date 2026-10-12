# Supplemental route capture and offline analysis

The opt-in route collector preserves original requestAnimationFrame callback timestamps,
Long Task delivery order, visibility, helper spans, and censored coverage. Its output is
diagnostic evidence. It does **not** measure native presentation, GPU completion, real input,
or physical-device performance and cannot qualify hardware.

The default helper and `perf:history` retain their existing behavior. The controlled-result
v1 schema and its unavailable frame result are unchanged. No dependencies are required beyond
the repository's existing tools.

## Invocation

With an already authorized local preview running under the existing helper conditions:

```sh
node scripts/capture-performance-route.cjs ./capture-attempt --capture-evidence
node scripts/analyze-performance-capture.cjs ./capture-attempt ./analysis-attempt
```

Existing `--basement`, `--exterior`, `--garage`, and `--street` flags are unchanged.
The target stays fixed at
`http://127.0.0.1:5173/?mode=immersive&disablePerformanceFailover=1`.
The capture uses headless Chromium, cleared test-context storage, overridden navigator hints,
1280 × 720 viewport, DPR 1, and runtime collision stepping. These are synthetic conditions.
No arbitrary URL, remote debugging, telemetry, device session, or automatic server startup is
supported. Route coordinates and movement pacing are unchanged. Geometry changes may invalidate
a historical route; a failed attempt remains evidence rather than being silently retried.

Every invocation requires a fresh output directory, including after failure. The offline command
never starts a browser or modifies input. It checks input size, manifest hash, attempt identity,
structural fields, and cross-field invariants before copying valid raw bytes. It does not write
comparison results; `compareCaptures` is a pure API for synthetic regression tests and callers
with separately authorized workflows.

## Artifacts and lifecycle

| File                             | Meaning                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `route-capture-initial-v1.json`  | Initialized operation, written once before browser activity or input parsing.          |
| `route-capture-running-v1.json`  | Work started; does not prove a page or sample exists.                                  |
| `route-capture-terminal-v1.json` | Finite terminal reason and explicit cleanup status.                                    |
| `route-capture-raw-v1.json`      | Immutable callback timestamps, bounded markers, Long Tasks and provenance.             |
| `route-capture-analysis-v1.json` | Derived statistics, gaps, exclusions, coverage and qualification limitations.          |
| `route-capture-manifest-v1.json` | Exact byte lengths and SHA-256 hashes of available outputs and explicit missing files. |

Files use exclusive creation. An absent terminal receipt means unresolved interruption, not success.
An operationId links receipts; attemptId may be null before input validation. Reasons are
`finished`, `cancelled`, `page_lost`, `navigation`, `capacity`, `deadline`, `invalid_clock`,
`invalid_input`, `input_limit`, `output_limit`, `export_timeout`, `cleanup_timeout`, `io_error`,
`identity_invalid`, or `internal_error`. Arbitrary errors and paths are not persisted in sidecars.
Legacy route output and screenshots remain separate.

Helper/probe hashes identify their exact source bytes. Analyzer identity hashes the CLI followed
by the pure analysis module. Offline reanalysis preserves raw collector identity while its
analysis and receipts identify the executing analyzer. A source commit or immutable served
artifact is never inferred from the local checkout or mutable build tag. Missing identity is
explicit and prevents matched acceptance.

## Metrics and coverage

`raf_callback_interval_ms` uses adjacent timestamps in their original order. Nearest-rank p50,
p95, and p99 select index `ceil(p * N) - 1` from a sorted copy of durations. Every positive
interval remains in the full distribution, including intervals of one second or longer.
Duplicates/decreasing timestamps remain raw evidence and reject stream analysis. Nonfinite
clock readings stop collection without serializing NaN, fabricated frames, or null timestamps.

Every duration summary is `available` with sampleCount, p50Ms, p95Ms, p99Ms, and maxMs, or
`unavailable` with a finite reason. Empty observations are never represented as measured zero.
Gaps use exactly `>100 ms` and `>=1000 ms`. Each includes its raw interval index, full endpoints,
duration and known span overlap. Overlap does not establish causation or neighborhood blame.

Left and right censored coverage measure time before the first callback and after the last.
They are not completed intervals. A boundary exceeding 100 ms makes affected coverage incomplete;
an unknown stop remains null. A delayed callback received before stop retains its whole interval
and reports deadline overshoot.

Full-route windows include intersecting boundary intervals without clipping. Derived candidate
windows require wholly contained intervals and disclose excluded index ranges, reasons and total
duration. Hidden/unknown visibility, helper work, boundary crossings and missing warmth prevent
a clean foreground interpretation. Five seconds after readiness is only a readiness delay;
genuine asset/shader-settle evidence remains unavailable. A prefix-120 window needs exactly
120 consecutive eligible intervals from 121 callbacks after its declared start.

Long Tasks retain only start and duration in delivery order. Checkpoints capture callback count,
delivered-task count, and timestamp synchronously. Legacy p95/max/count and task totals are
projected from these exact prefixes after stop; late delivery and the final observer drain never
retroactively alter earlier checkpoints. Unsupported Long Tasks remain explicit; the legacy
`-1` count sentinel is not a measured zero.

## Bounds and failure handling

| Resource                               | Maximum                             |
| -------------------------------------- | ----------------------------------- |
| Callback intervals / timestamps        | 300,000 / 300,001                   |
| Capture duration                       | 1,200,000 ms                        |
| Long Tasks                             | 10,000                              |
| Markers / snapshots / labels / windows | 4,096 / 512 / 256 / 128             |
| Safe label length                      | 64 characters                       |
| Export chunk                           | 4,096 records                       |
| Raw input / analysis output            | 16 MiB each, UTF-8 bytes            |
| Finalization grace / page call         | 15,000 ms total / 2,000 ms per call |

One collector and one rAF chain run per top-level test document. Timestamp and task numeric
buffers remain below 4 MiB; this is not a measurement of JS or browser overhead. Capacity stops
retain the earliest data and report first loss without a rolling replacement. Real pagehide stops
and drains the observer; synthetic pagehide is recorded without stopping. New navigation or
BFCache restoration requires a new attempt. Cleanup touches only helper-owned listeners,
observer, callbacks, context and browser. Stop, export and cleanup share one absolute grace;
chunks cannot renew it. An unresponsive page yields incomplete evidence with unknown endpoints.

Native frame presentation, input-to-next-paint, GPU timing, whole-frame pass totals,
geometry/texture bytes, and retained heap are explicitly uncollected. Every result keeps
`qualification.state: incomplete`. A software/unknown renderer, sampled continuity or 60 Hz
desktop callback series cannot establish a 90 FPS hardware target.

## Functional case mapping and separate qualification

The functional capture cases map to: launch/identity (initial receipt and provenance),
movement/POIs (route and checkpoint markers), focus/resize (visibility and incomplete continuity),
mode/history recovery (sampled mode and separate attempts), and interruption/finish
(censored coverage, terminal receipt and bounded cleanup). These supplement functional checks;
they do not replace them or authorize a hardware session.

Synthetic tests exercise arithmetic, boundaries, capacity, identity, lifecycle and timeout
handling. Existing automated CI browsers remain regression checks. Physical desktop/phone/tablet
qualification requires separately approved candidates, immutable artifacts, geometry-bound
routes, refresh support, warm-up evidence, thresholds, workload and execution window. Human
merge, staging and production approvals remain separate.
