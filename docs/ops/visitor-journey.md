# Visitor-journey assertion contract

The application-owned visitor journey checks behavior that static `/healthz` and `/livez`
responses cannot prove. In order, the essential assertions cover homepage delivery, JavaScript
initialization, required static assets, the accessible text experience, and retrieval of the stable
résumé. Résumé validation requires both an `application/pdf` content type and `%PDF-` magic bytes,
so an HTTP 200 HTML fallback is a failure.

Immersive rendering is an optional, separate diagnostic. A visitor who receives a usable text
fallback has completed the essential journey even when WebGL or the Three.js renderer is
unavailable. Renderer availability must not be folded into total site availability.

`src/observability/visitorJourney.ts` defines the future collector boundary. Its aggregate result
contains only `state`, `freshness`, `durationMs`, and a finite `failureStage`. Implementations must
not add visitor data, page content, prompts, responses, cookies, tokens, headers, request IDs, URLs,
or other identities to that result or to retained evidence. Timeout and producer interruption have
explicit failure stages, so incomplete executions do not masquerade as application failures.

Run the focused contracts locally with:

```bash
npx vitest run src/observability/__tests__/visitorJourney.test.ts
npm run test:e2e -- playwright/visitor-journey.spec.ts
```

Scheduling, metric publication, dashboards, alerts, and staging or production activation are owned
by the separate Sugarkube integration. This repository slice neither sends traffic to deployed
environments nor activates a collector.
