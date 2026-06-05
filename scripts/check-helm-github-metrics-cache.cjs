#!/usr/bin/env node
const { execFileSync } = require('node:child_process');

const chartPath = 'charts/danielsmith';

const render = (args = []) =>
  execFileSync('helm', ['template', 'danielsmith', chartPath, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const disabled = render();
assert(
  !disabled.includes('name: github-metrics'),
  'disabled render should not include the github metrics sidecar'
);
assert(
  !disabled.includes('name: github-metrics-cache'),
  'disabled render should not include the shared github metrics volume'
);

const enabled = render(['--set', 'githubMetricsCache.enabled=true']);
assert(
  enabled.includes('kind: ConfigMap') &&
    enabled.includes('refresh-github-metrics.py') &&
    enabled.includes('repos.json'),
  'enabled render should include the sidecar ConfigMap script and repo config'
);
assert(
  enabled.includes('name: github-metrics') &&
    enabled.includes('python:3.12-alpine') &&
    enabled.includes('/scripts/refresh-github-metrics.py'),
  'enabled render should include the github metrics sidecar container'
);
assert(
  enabled.includes('name: github-metrics-cache') &&
    enabled.includes('emptyDir: {}') &&
    enabled.includes('mountPath: "/usr/share/nginx/html/runtime"') &&
    enabled.includes('mountPath: "/cache"'),
  'enabled render should include shared runtime mounts for nginx and sidecar'
);
assert(
  enabled.includes('value: "/cache/github-metrics.json"') &&
    enabled.includes('value: "3600"') &&
    enabled.includes('value: "4500"'),
  'enabled render should pass cache path and refresh TTL settings to the sidecar'
);
assert(
  enabled.includes('"owner": "futuroptimist"') &&
    enabled.includes('"repo": "token.place"') &&
    enabled.includes('"repo": "pr-reaper"'),
  'enabled render should serialize public GitHub repos into ConfigMap JSON'
);
assert(
  !/secretKeyRef|github[_-]?token|GITHUB[_-]?TOKEN|personal[_-]?access[_-]?token/i.test(
    enabled
  ),
  'enabled render should not include secret references or GitHub token settings'
);

console.log('Helm GitHub metrics cache assertions passed.');
