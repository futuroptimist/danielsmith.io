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
