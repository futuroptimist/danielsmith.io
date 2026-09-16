#!/usr/bin/env node
const { execFileSync } = require('node:child_process');

const chartPath = 'charts/danielsmith';

const render = (args = []) =>
  execFileSync('helm', ['template', 'danielsmith', chartPath, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const assertIncludes = (haystack, needle, message) => {
  if (!haystack.includes(needle)) {
    throw new Error(
      `${message}: expected rendered chart to include ${JSON.stringify(needle)}`
    );
  }
};

const assertExcludes = (haystack, needle, message) => {
  if (haystack.includes(needle)) {
    throw new Error(
      `${message}: rendered chart unexpectedly included ${JSON.stringify(needle)}`
    );
  }
};

const assertRenderFails = (args, needle, message) => {
  try {
    render(args);
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}${error.message ?? ''}`;
    if (!output.includes(needle)) {
      throw new Error(
        `${message}: expected failure to include ${JSON.stringify(needle)}, got ${JSON.stringify(
          output
        )}`
      );
    }
    return;
  }
  throw new Error(`${message}: expected helm template to fail`);
};

const defaultRender = render();
assertExcludes(
  defaultRender,
  'name: github-metrics',
  'disabled cache should not render sidecar'
);
assertExcludes(
  defaultRender,
  'danielsmith-github-metrics-cache',
  'disabled cache should not render ConfigMap'
);
assertExcludes(
  defaultRender,
  'name: github-metrics-cache',
  'disabled cache should not render the legacy shared cache volume'
);
assertIncludes(
  defaultRender,
  'name: runtime-data',
  'disabled cache should still render the runtime volume for build-info'
);

const enabledRender = render(['--set', 'githubMetricsCache.enabled=true']);
assertIncludes(
  enabledRender,
  'kind: ConfigMap',
  'enabled cache should render script ConfigMap'
);
assertIncludes(
  enabledRender,
  'name: github-metrics',
  'enabled cache should render sidecar'
);
assertIncludes(
  enabledRender,
  'image: "python:3.12-alpine"',
  'sidecar should use configured image'
);
assertIncludes(
  enabledRender,
  'emptyDir: {}',
  'enabled cache should render an emptyDir volume'
);
assertIncludes(
  enabledRender,
  `- name: runtime-data
              mountPath: /usr/share/nginx/html/runtime
              readOnly: true`,
  'nginx should mount the runtime cache directory read-only instead of the document root'
);
assertIncludes(
  enabledRender,
  `- name: runtime-data
              mountPath: /cache`,
  'sidecar should mount the shared runtime volume writable by omitting readOnly'
);
assertExcludes(
  enabledRender,
  'name: github-metrics-cache',
  'enabled cache should not render the old overlapping cache volume'
);
assertIncludes(
  enabledRender,
  'value: "5"',
  'sidecar should use the separate per-request timeout default'
);
assertIncludes(
  enabledRender,
  'GITHUB_METRICS_STARTUP_TIMEOUT_SECONDS',
  'sidecar should render a separate startup deadline env var'
);
assertIncludes(
  enabledRender,
  'value: "20"',
  'sidecar should preserve the startup timeout default'
);
assertIncludes(
  enabledRender,
  'remaining_timeout = min(timeout, remaining)',
  'startup refresh should use the actual remaining deadline budget'
);
assertIncludes(
  enabledRender,
  '"subscribers": "subscribers_count"',
  'rendered script should expose subscribers_count as subscribers'
);
assertIncludes(
  enabledRender,
  '"state": "warming"',
  'sidecar should publish bounded initial warmup telemetry'
);
assertIncludes(
  enabledRender,
  '"retainedDataAgeSeconds"',
  'sidecar should publish retained-data freshness'
);
assertIncludes(
  enabledRender,
  'categories.append(failure_category(exc))',
  'sidecar should reduce upstream failures to bounded categories'
);
assertIncludes(
  enabledRender,
  '"repo": "token.place"',
  'repo list should render into the sidecar config'
);
assertIncludes(
  enabledRender,
  '"owner": "democratizedspace"',
  'repo list should preserve non-default owners'
);
assertIncludes(
  enabledRender,
  '"repo": "dspace"',
  'repo list should preserve the democratizedspace/dspace repo'
);
assertIncludes(
  enabledRender,
  '"repo": "axel"',
  'repo list should include the Axel runtime star source'
);
assertIncludes(
  enabledRender,
  '"repo": "sugarkube"',
  'repo list should include the Sugarkube runtime star source'
);
assertExcludes(
  enabledRender,
  'kind: Secret',
  'cache sidecar must not introduce Kubernetes Secrets'
);
assertExcludes(
  enabledRender,
  'secretKeyRef',
  'cache sidecar must not use secret env vars'
);
assertExcludes(
  enabledRender,
  'GITHUB_TOKEN',
  'cache sidecar must remain unauthenticated'
);
assertExcludes(
  enabledRender,
  'PERSONAL_ACCESS_TOKEN',
  'cache sidecar must not reference PATs'
);

const digestRender = render([
  '--set',
  'githubMetricsCache.enabled=true',
  '--set',
  'githubMetricsCache.image.digest=sha256:abc123',
  '--set',
  'githubMetricsCache.image.tag=',
]);
assertIncludes(
  digestRender,
  'image: "python@sha256:abc123"',
  'sidecar should support digest-pinned images'
);

assertRenderFails(
  [
    '--set',
    'githubMetricsCache.enabled=true',
    '--set',
    'githubMetricsCache.outputPath=cache/foo.json',
  ],
  'githubMetricsCache.outputPath must be an absolute path',
  'relative output paths should be rejected'
);
assertRenderFails(
  [
    '--set',
    'githubMetricsCache.enabled=true',
    '--set',
    'githubMetricsCache.publicPath=runtime/github-metrics.json',
  ],
  'githubMetricsCache.publicPath must be an absolute path',
  'relative public paths should be rejected'
);
assertRenderFails(
  [
    '--set',
    'githubMetricsCache.enabled=true',
    '--set',
    'githubMetricsCache.publicPath=/github-metrics.json',
  ],
  'githubMetricsCache.publicPath must include a non-root directory',
  'root-level public paths should be rejected'
);
assertRenderFails(
  [
    '--set',
    'githubMetricsCache.enabled=true',
    '--set',
    'githubMetricsCache.publicPath=/runtime/../github-metrics.json',
  ],
  'githubMetricsCache.publicPath must be normalized and must not contain dot segments',
  'public paths with dot segments should be rejected'
);
assertRenderFails(
  [
    '--set',
    'githubMetricsCache.enabled=true',
    '--set',
    'githubMetricsCache.outputPath=/cache/../github-metrics.json',
  ],
  'githubMetricsCache.outputPath must be normalized and must not contain dot segments',
  'output paths with dot segments should be rejected'
);
assertRenderFails(
  [
    '--set',
    'githubMetricsCache.enabled=true',
    '--set',
    'githubMetricsCache.publicPath=/runtime/github-stars.json',
  ],
  'githubMetricsCache.outputPath and githubMetricsCache.publicPath must use the same file name',
  'mismatched output/public basenames should be rejected'
);
assertRenderFails(
  [
    '--set',
    'githubMetricsCache.enabled=true',
    '--set',
    'githubMetricsCache.outputPath=/cache/github-stars.json',
  ],
  'githubMetricsCache.outputPath and githubMetricsCache.publicPath must use the same file name',
  'mismatched output/public basenames should be rejected'
);
assertRenderFails(
  [
    '--set',
    'githubMetricsCache.enabled=true',
    '--set',
    'githubMetricsCache.publicPath=/runtime/github-stars.json',
    '--set',
    'githubMetricsCache.outputPath=/cache/github-stars.json',
  ],
  'githubMetricsCache.publicPath must be exactly /runtime/github-metrics.json',
  'public paths outside the wired frontend runtime URL should be rejected'
);
assertRenderFails(
  [
    '--set',
    'githubMetricsCache.enabled=true',
    '--set-json',
    'githubMetricsCache.repos=[]',
  ],
  'githubMetricsCache.repos must include at least one repository',
  'empty repo lists should be rejected'
);
assertRenderFails(
  [
    '--set',
    'githubMetricsCache.enabled=true',
    '--set',
    'githubMetricsCache.repos[0].owner=invalid-',
    '--set',
    'githubMetricsCache.repos[0].repo=valid',
  ],
  'githubMetricsCache.repos[0] has an invalid owner or repo',
  'repository names ending in punctuation should be rejected'
);
assertRenderFails(
  [
    '--set',
    'githubMetricsCache.enabled=true',
    '--set',
    'githubMetricsCache.image.tag=',
  ],
  'githubMetricsCache.image.tag is required when githubMetricsCache.image.digest is not set',
  'empty sidecar tags without a digest should be rejected'
);

console.log('Helm GitHub metrics cache render assertions passed.');

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const scriptMarker = '  refresh-github-metrics.py: |\n';
const scriptStart = enabledRender.indexOf(scriptMarker);
if (scriptStart < 0) throw new Error('rendered refresher script was not found');
const scriptLines = enabledRender
  .slice(scriptStart + scriptMarker.length)
  .split('\n');
const embeddedLines = [];
for (const line of scriptLines) {
  if (line && !line.startsWith('    ')) break;
  embeddedLines.push(line);
}
const tempDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'github-cache-test-')
);
const refresherPath = path.join(tempDirectory, 'refresh.py');
fs.writeFileSync(
  refresherPath,
  embeddedLines.map((line) => line.slice(4)).join('\n'),
  'utf8'
);
const pythonTest = String.raw`
import datetime as dt
import importlib.util
import json
import math
import os
import tempfile
import urllib.error

spec = importlib.util.spec_from_file_location("refresh", ${JSON.stringify(refresherPath)})
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
repos = [{"owner": "Owner", "repo": "One"}, {"owner": "Owner", "repo": "Two"}]
base = dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc)
clock = [base]
m.utc_now = lambda: clock[0]

def good(owner, repo):
    return {
        "stargazers_count": 10,
        "subscribers_count": 3,
        "watchers_count": 4,
        "forks_count": 2,
        "open_issues_count": 1,
        "pushed_at": "2025-12-01T00:00:00Z",
        "html_url": f"https://github.com/{owner}/{repo}",
    }

disabled_path = os.path.join(${JSON.stringify(process.cwd())}, "public/runtime/github-metrics.json")
disabled = json.load(open(disabled_path))
assert disabled["schemaVersion"] == 1 and disabled["cache"]["state"] == "disabled"

with tempfile.TemporaryDirectory() as directory:
    output = os.path.join(directory, "github-metrics.json")
    m.atomic_write_json(output, m.warming_payload(2))
    assert json.load(open(output))["cache"]["state"] == "warming"

    requests = []
    def success(owner, repo, timeout):
        requests.append((owner, repo))
        return good(owner, repo)
    first = m.refresh_once(repos, output, 5, 100, fetcher=success)
    first_success = first["cache"]["lastSuccessfulRefreshAt"]
    assert first["schemaVersion"] == 1
    assert first["cache"]["state"] == "fresh" and len(requests) == 2

    clock[0] += dt.timedelta(seconds=60)
    def partial(owner, repo, timeout):
        if repo == "Two":
            return {}
        return {**good(owner, repo), "stargazers_count": 11}
    partial_payload = m.refresh_once(repos, output, 5, 100, fetcher=partial)
    assert partial_payload["cache"]["state"] == "stale"
    assert partial_payload["cache"]["failureCategories"] == ["invalid_response"]
    assert partial_payload["cache"]["lastSuccessfulRefreshAt"] == first_success
    assert (
        partial_payload["repos"]["owner/two"]["fetchedAt"]
        == first["repos"]["owner/two"]["fetchedAt"]
    )

    clock[0] += dt.timedelta(seconds=60)
    def limited(owner, repo, timeout):
        raise urllib.error.HTTPError("url", 429, "limited", {}, None)
    total = m.refresh_once(repos, output, 5, 100, fetcher=limited)
    assert total["cache"]["retainedRepositoryCount"] == 2
    assert total["cache"]["failureCategories"] == ["rate_limited"]
    assert total["cache"]["lastSuccessfulRefreshAt"] == first_success

    clock[0] += dt.timedelta(seconds=60)
    recovered = m.refresh_once(repos, output, 5, 100, fetcher=success)
    assert recovered["cache"]["state"] == "fresh"
    assert recovered["cache"]["lastSuccessfulRefreshAt"] != first_success

    for invalid in ({}, {**good("Owner", "One"), "forks_count": "2"},
                    {**good("Owner", "One"), "forks_count": math.inf}):
        try:
            m.repo_record("Owner", "One", m.isoformat(clock[0]), invalid)
            raise AssertionError("invalid response was accepted")
        except ValueError:
            pass

    poisoned = recovered.copy()
    poisoned["repos"] = dict(recovered["repos"])
    poisoned["repos"]["owner/one"] = {
        **recovered["repos"]["owner/one"], "unexpected": "x" * 200000
    }
    m.atomic_write_json(output, poisoned)
    retained, _ = m.load_previous(
        output, {"owner/one": ("Owner", "One"), "owner/two": ("Owner", "Two")}
    )
    assert "unexpected" not in retained["owner/one"]
    assert retained["owner/one"]["htmlUrl"] == "https://github.com/Owner/One"

    with open(output, "w") as handle:
        handle.write("{" + "x" * m.MAX_INPUT_BYTES)
    assert m.load_previous(output, {"owner/one": ("Owner", "One")}) == ({}, None)
    with open(output, "w") as handle:
        handle.write("not json")
    assert m.load_previous(output, {"owner/one": ("Owner", "One")}) == ({}, None)

    try:
        m.atomic_write_json(output, {"oversized": "x" * m.MAX_OUTPUT_BYTES})
        raise AssertionError("oversized publication was accepted")
    except ValueError:
        pass

    config = os.path.join(directory, "repos.json")
    with open(config, "w") as handle:
        json.dump([{"owner": "Owner", "repo": "One"},
                   {"owner": "owner", "repo": "one"}], handle)
    try:
        m.load_repos(config)
        raise AssertionError("case-insensitive duplicate was accepted")
    except ValueError:
        pass

    m.atomic_write_json(output, recovered)
    request_count = len(requests)
    with open(output) as handle:
        json.load(handle)
    with open(output) as handle:
        json.load(handle)
    assert len(requests) == request_count

print("Rendered GitHub metrics refresher assertions passed.")
`;
try {
  execFileSync('python3', ['-c', pythonTest], { stdio: 'inherit' });
} finally {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
}
