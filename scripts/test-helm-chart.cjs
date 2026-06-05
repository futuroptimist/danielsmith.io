#!/usr/bin/env node
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const helmTemplate = (args = []) =>
  execFileSync(
    'helm',
    ['template', 'danielsmith', 'charts/danielsmith', ...args],
    {
      encoding: 'utf8',
    }
  );

const disabled = helmTemplate();
assert(
  !disabled.includes('name: github-metrics'),
  'default render must not include sidecar'
);
assert(
  !disabled.includes('refresh-github-metrics.py'),
  'default render must not include metrics ConfigMap script'
);
assert(
  !disabled.includes('github-metrics-cache'),
  'default render must not include shared metrics volume'
);

const enabled = helmTemplate(['--set', 'githubMetricsCache.enabled=true']);
assert(
  enabled.includes('kind: ConfigMap'),
  'enabled render includes a ConfigMap'
);
assert(
  enabled.includes('name: github-metrics'),
  'enabled render includes sidecar'
);
assert(
  enabled.includes('refresh-github-metrics.py'),
  'enabled render includes refresh script'
);
assert(
  enabled.includes('emptyDir: {}') &&
    enabled.includes('name: github-metrics-cache'),
  'enabled render includes shared emptyDir cache volume'
);
assert(
  enabled.includes('mountPath: /usr/share/nginx/html/runtime') &&
    enabled.includes('readOnly: true'),
  'enabled render mounts runtime directory read-only into nginx container'
);
assert(
  enabled.includes('mountPath: /cache') &&
    enabled.includes('GITHUB_METRICS_OUTPUT_PATH'),
  'enabled render mounts writable cache directory into sidecar'
);
assert(
  !/kind:\s*Secret\b/.test(enabled),
  'enabled render must not create Secrets'
);
assert(
  !/secretKeyRef|secretName|\/var\/run\/secrets/.test(enabled),
  'enabled render has no secret refs'
);
assert(
  !/GITHUB_TOKEN|PERSONAL_ACCESS_TOKEN|PAT\b/i.test(enabled),
  'enabled render has no GitHub auth env'
);
for (const repo of [
  'futuroptimist/danielsmith.io',
  'futuroptimist/token.place',
  'futuroptimist/gabriel',
  'futuroptimist/flywheel',
  'futuroptimist/jobbot3000',
  'futuroptimist/gitshelves',
  'futuroptimist/f2clipboard',
  'futuroptimist/sigma',
  'futuroptimist/wove',
  'democratizedspace/dspace',
  'futuroptimist/pr-reaper',
]) {
  const [owner, name] = repo.split('/');
  assert(
    enabled.includes(`{"owner":"${owner}","repo":"${name}"}`),
    `enabled render includes ${repo} in repo config`
  );
}

console.log('Helm chart metrics-cache render checks passed.');
