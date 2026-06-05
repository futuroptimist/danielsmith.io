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
  'nginx should mount the runtime cache directory'
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

console.log('Helm GitHub metrics cache render assertions passed.');
