#!/usr/bin/env node
const { execFileSync } = require('node:child_process');

const chart = 'charts/danielsmith';

const helmTemplate = (args = []) =>
  execFileSync('helm', ['template', 'danielsmith', chart, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const assertIncludes = (text, needle, label) => {
  if (!text.includes(needle)) {
    throw new Error(`${label} missing ${JSON.stringify(needle)}`);
  }
};

const assertExcludes = (text, needle, label) => {
  if (text.includes(needle)) {
    throw new Error(`${label} unexpectedly included ${JSON.stringify(needle)}`);
  }
};

const disabled = helmTemplate();
assertExcludes(disabled, 'name: github-metrics', 'disabled render');
assertExcludes(disabled, 'github-metrics-cache.py', 'disabled render');
assertExcludes(disabled, 'github-metrics-cache', 'disabled render');

const enabled = helmTemplate([
  '--set',
  'githubMetricsCache.enabled=true',
  '--set-json',
  'githubMetricsCache.repos=[{"owner":"safe-owner","repo":"repo.with-dots"}]',
]);

assertIncludes(enabled, 'kind: ConfigMap', 'enabled render');
assertIncludes(enabled, 'github-metrics-cache.py', 'enabled render');
assertIncludes(enabled, 'repos.json:', 'enabled render');
assertIncludes(enabled, 'safe-owner', 'enabled render');
assertIncludes(enabled, 'repo.with-dots', 'enabled render');
assertIncludes(enabled, 'name: github-metrics', 'enabled render');
assertIncludes(enabled, 'image: "python:3.12-alpine"', 'enabled render');
assertIncludes(
  enabled,
  'mountPath: /usr/share/nginx/html/runtime',
  'enabled render'
);
assertIncludes(enabled, 'mountPath: /cache', 'enabled render');
assertIncludes(enabled, 'readOnly: true', 'enabled render');
assertIncludes(enabled, 'emptyDir: {}', 'enabled render');
assertIncludes(
  enabled,
  'GITHUB_METRICS_REFRESH_INTERVAL_SECONDS',
  'enabled render'
);
assertIncludes(enabled, 'value: "3600"', 'enabled render');
assertExcludes(enabled, 'kind: Secret', 'enabled render');
assertExcludes(enabled, 'secretKeyRef', 'enabled render');
assertExcludes(enabled, 'envFrom:', 'enabled render');
assertExcludes(enabled, 'mountPath: /var/run/secrets', 'enabled render');

console.log('Helm GitHub metrics cache rendering checks passed.');
