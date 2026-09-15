# Visitor journey assertions

The application-owned visitor journey verifies behavior that `/healthz` and `/livez` cannot prove:

1. the homepage returns the expected application shell;
2. JavaScript removes the loading marker and initializes a usable mode;
3. essential first-party assets are retrievable;
4. the accessible text experience contains usable navigation and a résumé link; and
5. `/resume.pdf` has both an `application/pdf` content type and `%PDF-` magic bytes.

The checks deliberately treat the accessible fallback as essential and the Three.js immersive
renderer as optional. A missing or unavailable immersive renderer is diagnostic information, not a
total outage, when the text experience remains usable.

## Export contract

`runVisitorJourney` returns only `status`, `freshnessMs`, aggregate `durationMs`, and a finite
`failureStage`. Stages cover homepage delivery, JavaScript initialization, essential assets,
accessible fallback, résumé validation, timeout, and producer interruption. The result must never
contain page contents, visitor or request identities, prompts, responses, cookies, tokens, headers,
or credentials.

The Playwright assertion runs locally or in CI against the repository's Vite server. Scheduling,
metrics collection, dashboards, alerts, evidence transport, and staging or production activation
are owned by the separate Sugarkube integration; this repository does not activate those systems.
