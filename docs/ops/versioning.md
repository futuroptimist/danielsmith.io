# Application versions and changelog policy

Every change to the shipped site must advance `appVersion` in
`charts/danielsmith/Chart.yaml` and add a concrete, user-facing entry to
[`docs/changelog.md`](../changelog.md) in the same PR. This includes behavior, content,
assets, runtime dependencies, and build/container inputs. Use stable SemVer:
patch for compatible fixes, minor for new functionality or substantial experience
changes, and major for incompatible public contracts. During `0.x` development,
describe any incompatible behavior explicitly and use a minor increment.

## Four separate identities

| Identity            | Source                            | Rule                                                                                                                                                       |
| ------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application version | Chart `appVersion`                | Semantic version of the site; production build-info displays `v<appVersion>`.                                                                              |
| Chart package       | Chart `version`                   | Independently increasing, immutable Helm package version. **Every chart content change, including an appVersion-only edit, requires a new chart version.** |
| Image identity      | CI `main-<shortsha>`              | Exact build promoted unchanged through staging and production. Record the full source commit alongside it; never substitute `main-latest` for promotion.   |
| npm package version | Private `package.json` / lockfile | Tool/package metadata, currently `0.1.0`; not the deployed application version. Do not bump it merely to match the site or chart.                          |

Chart-only deployment/packaging changes require a chart bump and an explanation in the
current application changelog section; they need not advance the app unless they change
the site experience. Production displays **appVersion**, not chart `version`.

Documentation, agent instructions, tests, review tooling, and CI-owned launch screenshots
do not themselves require application or chart bumps. These exclusions do not cover
shipped content: `docs/resume/`, public assets, runtime source, and build inputs count as
site changes. Changes to generators or workflows that alter shipped output also need
release metadata even where automated path classification cannot infer the effect.
All package-script edits and lockfile changes are conservatively treated as runtime
inputs: build/lifecycle scripts can invoke arbitrary helper scripts. A private package
version-only edit is independent of appVersion; it does not itself trigger an app bump.

## Parallel PRs and release preparation

1. Keep each feature in its own PR. Draft its changelog wording while it is unmerged;
   do not describe another open PR's functionality as part of the current application.
2. Before integration, update the candidate branch from current `main`. Select its next
   appVersion against that base, add its version section, and increment chart `version`.
   Do not reserve arbitrary version numbers across parallel branches.
3. A candidate must exceed the latest base version. If another PR advances main first,
   update the candidate's metadata, rerun the guard and CI, and review the new head.
   Maintainers must require an up-to-date branch before merging: a green check on an
   older base cannot detect a subsequently merged competing version.
4. Label new entries `unreleased` until release evidence exists. Merging code, passing CI,
   publishing an image/chart, creating a Git tag, creating a GitHub Release, and deploying
   an environment are distinct events. Record only events supported by evidence.
5. Follow [the release runbook](sugarkube-release.md). Obtain explicit human approval for
   staging, collect staging evidence, then obtain human approval for production promotion
   of the same immutable image. Never infer approval or deployment success from a merge.

The reconstructed post-`v0.1.3` scope warrants `0.2.0`: it adds the connected house,
museum, exterior, avatar experience, and new exhibits. Its chart is `0.2.9`; neither
number claims a tag or deployment. Future compatible fixes can advance to `0.2.1` if
they are next in integration order; new functionality can instead require a minor bump.

## Verification

```bash
npm run release:check
npm run release:check -- --base origin/main
```

The first command checks the current appVersion has exactly one populated changelog
section. The second also compares the working tree to the given base, rejects runtime
changes without an application bump, rejects any chart-content change without a chart
bump, and requires changes to the current version's notes. New application sections must
be labeled `unreleased`; later evidence-only documentation edits may update that status.
Missing Git bases fail closed.
CI runs the comparison against the PR event's base SHA with full history. Synthetic
snapshot tests cover drift, version ordering, exclusions, and independent package identity.
The guard cannot decide semantic impact or prove a deployment; reviewers own those checks.
