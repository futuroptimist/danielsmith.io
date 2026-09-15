# Visitor journey assertions

The application owns a deterministic essential visitor-journey contract. It verifies more than the
static `/healthz` and `/livez` responses:

1. `/` returns the expected HTML application shell.
2. JavaScript initializes and selects an application mode.
3. The module entry point, favicon, and other explicitly selected essential assets are retrievable;
4. `/?mode=text` exposes a visible main landmark, heading, and résumé action; and
5. `/resume.pdf` has an `application/pdf` content type **and** begins with the `%PDF-` signature.

The content-type and signature checks prevent an HTTP 200 HTML fallback from passing as the résumé.
The browser assertion lives in `playwright/visitor-journey.spec.ts`; deterministic unit fixtures
cover JavaScript failure, missing assets, invalid PDF content, timeout, and producer interruption.
These are failures that process-level readiness endpoints cannot detect.

## Essential and optional behavior

The accessible text experience is essential functionality and is a successful visitor outcome.
Immersive rendering is an optional, separately tested enhancement. Lack of WebGL or an unavailable
immersive renderer must not turn a usable accessible fallback into a total visitor-journey outage.
Existing immersive Playwright suites retain ownership of renderer-specific behavior.

## Sanitized result contract

`runVisitorJourney` returns only:

- `state`: `success` or `failure`;
- `freshness`: completion time as Unix seconds;
- `aggregateDurationMs`: total elapsed journey time; and
- `failureStage`: one finite stage name or `null` on success.

The stage vocabulary is homepage delivery, JavaScript initialization, essential assets, accessible
fallback, résumé PDF, timeout, and producer interruption. Probe exceptions are reduced to those
stage names. Results must never include visitor data, page contents, prompts, responses, cookies,
tokens, headers, URLs with request identities, or credentials.

This repository provides assertions and the sanitized aggregate shape only. Sugarkube scheduling,
metric collection, dashboards, alerts, environment activation, and staging or production
qualification are deliberately deferred to the separate integration work.
