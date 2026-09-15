#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { mkdtempSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

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
  '"subscribers": data.get("subscribers_count", 0) or 0',
  'rendered script should expose subscribers_count as subscribers'
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

const scriptMatch = enabledRender.match(
  /  refresh-github-metrics\.py: \|\n([\s\S]*?)(?=\n---|$)/
);
if (!scriptMatch)
  throw new Error('rendered cache refresher script was not found');
const python = scriptMatch[1]
  .split('\n')
  .map((line) => line.replace(/^    /, ''))
  .join('\n');
const temp = mkdtempSync(join(tmpdir(), 'github-cache-test-'));
const modulePath = join(temp, 'refresh.py');
writeFileSync(modulePath, python);
writeFileSync(
  join(temp, 'test_refresh.py'),
  `import datetime as dt
import importlib.util
import json
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

spec = importlib.util.spec_from_file_location("refresh", ${JSON.stringify(modulePath)})
refresh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh)
REPOS = [{"owner": "futuroptimist", "repo": "one"}, {"owner": "futuroptimist", "repo": "two"}]
DATA = {"stargazers_count": 1, "subscribers_count": 2, "forks_count": 3,
        "open_issues_count": 4, "pushed_at": None, "html_url": "https://github.com/x/y"}

class CacheTelemetryTest(unittest.TestCase):
    def build(self, effects, previous=None):
        with mock.patch.object(refresh, "fetch_repo", side_effect=effects):
            return refresh.build_payload(REPOS, 1, 60, previous)

    def test_warmup_and_complete_first_refresh(self):
        warmup = refresh.warmup_payload(2)
        self.assertEqual(warmup["telemetry"]["state"], "warmup")
        payload = self.build([DATA, DATA])
        self.assertEqual(payload["telemetry"]["state"], "fresh")
        self.assertEqual(payload["telemetry"]["successfulRepoCount"], 2)
        self.assertEqual(payload["telemetry"]["failureCategory"], "none")

    def test_partial_retains_timestamp_and_sanitizes_rate_limit(self):
        first = self.build([DATA, DATA])
        original = first["repos"]["futuroptimist/two"]["fetchedAt"]
        error = urllib.error.HTTPError("safe", 429, "secret upstream text", {}, None)
        partial = self.build([DATA, error], first)
        self.assertEqual(partial["telemetry"]["state"], "stale")
        self.assertEqual(partial["telemetry"]["completeness"], "partial")
        self.assertEqual(partial["telemetry"]["retainedRepoCount"], 1)
        self.assertEqual(partial["telemetry"]["failureCategory"], "rate_limited")
        self.assertEqual(partial["repos"]["futuroptimist/two"]["fetchedAt"], original)
        self.assertNotIn("secret", json.dumps(partial))

    def test_failed_refresh_and_recovery_preserve_then_advance_success(self):
        first = self.build([DATA, DATA])
        success_at = first["telemetry"]["lastSuccessfulRefreshAt"]
        failed = self.build([TimeoutError(), TimeoutError()], first)
        self.assertEqual(failed["telemetry"]["lastSuccessfulRefreshAt"], success_at)
        self.assertEqual(failed["telemetry"]["retainedRepoCount"], 2)
        self.assertEqual(failed["telemetry"]["failureCategory"], "timeout")
        recovered = self.build([DATA, DATA], failed)
        self.assertEqual(recovered["telemetry"]["state"], "fresh")
        self.assertEqual(recovered["telemetry"]["retainedRepoCount"], 0)

    def test_unavailable_without_last_good_and_config_bounds(self):
        payload = self.build([OSError(), OSError()])
        self.assertEqual(payload["telemetry"]["state"], "unavailable")
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "repos.json"
            path.write_text(json.dumps([{"owner": "bad owner", "repo": "x"}]))
            with self.assertRaises(ValueError): refresh.load_repos(path)
            path.write_text(json.dumps([{"owner": "a", "repo": str(i)} for i in range(101)]))
            with self.assertRaises(ValueError): refresh.load_repos(path)

unittest.main()
`
);
execFileSync('python3', [join(temp, 'test_refresh.py')], { stdio: 'inherit' });

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
    'githubMetricsCache.image.tag=',
  ],
  'githubMetricsCache.image.tag is required when githubMetricsCache.image.digest is not set',
  'empty sidecar tags without a digest should be rejected'
);

console.log('Helm GitHub metrics cache render assertions passed.');
