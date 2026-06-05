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
  'github-metrics-cache',
  'disabled cache should not render shared cache volume'
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
  'mountPath: /usr/share/nginx/html/runtime',
  'nginx should mount the runtime cache directory instead of the document root'
);
assertIncludes(
  enabledRender,
  'readOnly: true',
  'nginx/config mounts should be read-only'
);
assertIncludes(
  enabledRender,
  'mountPath: /cache',
  'sidecar should mount the writable cache directory'
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
  '"repo": "token.place"',
  'repo list should render into the sidecar config'
);
assertIncludes(
  enabledRender,
  '"owner": "democratizedspace"',
  'repo list should preserve non-default owners'
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
    'githubMetricsCache.publicPath=/metrics/github-metrics.json',
  ],
  'githubMetricsCache.publicPath must live under /runtime/',
  'public paths outside /runtime should be rejected so nginx runtime headers apply'
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
