# Immersive POI metadata

Immersive points of interest (POIs) use the shared definition in
`src/scene/poi/types.ts` and localized copy in `src/assets/i18n/locales/`.

## Panel contract

Every registry POI provides a title, summary, outcome, metrics, and related links. A
collection may be empty when the repository does not provide a verified fact; an empty
collection is not the same as a zero-valued metric. GitHub star metrics keep their live
source and display `0` when GitHub reports zero stars.

The `status` field is the maturity signal shown as `Prototype` or `Live`. It is not
inferred from the POI's room or from the existence of a deployment.

## Deployment environments

`environments` contains only public destinations verified by the project's repository or
its deployment runbook. Each entry is either `staging` or `production` and must use an
absolute HTTPS URL. The detail panel renders these destinations as keyboard-accessible
links. Missing badges intentionally mean that this portfolio does not have a verified
public URL for that environment; they do not claim that the project cannot be deployed.

The current verified destinations are:

- DSPACE: staging and production
- token.place: staging and production
- danielsmith.io: staging and production
- jobbot3000: staging only

Environment names and accessible link text are localized through the POI overlay chrome
strings. Project facts remain in each locale's POI copy and should be updated from the
corresponding repository rather than guessed.
