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
assertIncludes(
  defaultRender,
  'name: danielsmith-build-info',
  'default render should always include the build-info ConfigMap'
);
assertIncludes(
  defaultRender,
  'checksum/build-info:',
  'pod template must annotate the resolved build-info checksum so a Helm ' +
    'upgrade that only changes ingress.host/image.tag (not the pod spec ' +
    'itself) still forces a rollout — subPath ConfigMap mounts are not ' +
    'hot-reloaded into already-running pods'
);
assertIncludes(
  defaultRender,
  '"environment": "dev"',
  'default render (no ingress host) should infer the dev environment'
);
assertIncludes(
  defaultRender,
  `- name: seed-build-info
          image: "ghcr.io/futuroptimist/danielsmith.io:main-latest"`,
  'default render should seed build-info with the application image init container'
);
assertIncludes(
  defaultRender,
  `- >-
              cp -a /usr/share/nginx/html/runtime/. /runtime/ &&
              cp /build-info/build-info.json /runtime/build-info.json`,
  'build-info init container should seed baked runtime assets before overlaying build-info'
);
assertIncludes(
  defaultRender,
  `- name: build-info
              mountPath: /build-info
              readOnly: true
            - name: runtime-data
              mountPath: /runtime`,
  'build-info init container should mount the ConfigMap source and writable runtime volume'
);
assertIncludes(
  defaultRender,
  `- name: runtime-data
              mountPath: /usr/share/nginx/html/runtime
              readOnly: true`,
  'nginx should mount the seeded runtime directory read-only'
);
assertExcludes(
  defaultRender,
  'mountPath: /usr/share/nginx/html/runtime/build-info.json',
  'nginx must not mount build-info as a nested subPath below the runtime directory'
);
assertExcludes(
  defaultRender,
  'subPath: build-info.json',
  'build-info should be copied by the init container instead of mounted with subPath'
);

const stagingRender = render([
  '--set',
  'ingress.enabled=true',
  '--set',
  'ingress.host=staging.danielsmith.io',
  '--set',
  'image.tag=main-af1cabad',
]);
assertIncludes(
  stagingRender,
  '"environment": "staging"',
  'staging.danielsmith.io ingress host should resolve to the staging environment'
);
assertIncludes(
  stagingRender,
  '"tag": "main-af1cabad"',
  'staging should display the deployed immutable image tag as-is'
);

const prodRender = render([
  '--set',
  'ingress.enabled=true',
  '--set',
  'ingress.host=danielsmith.io',
  '--set',
  'image.tag=main-af1cabad',
]);
assertIncludes(
  prodRender,
  '"environment": "prod"',
  'danielsmith.io ingress host should resolve to the prod environment'
);
assertIncludes(
  prodRender,
  '"tag": "v0.1.2"',
  'prod should display the semver Chart.AppVersion, not the raw image tag'
);

const digestRender = render([
  '--set',
  'ingress.enabled=true',
  '--set',
  'ingress.host=staging.danielsmith.io',
  '--set',
  'image.digest=sha256:abc123',
]);
assertIncludes(
  digestRender,
  '"tag": "sha256:abc123"',
  'staging should prefer image.digest over image.tag when both are pinned'
);

const extractChecksum = (rendered) => {
  const match = rendered.match(/checksum\/build-info:\s*(\S+)/);
  if (!match) {
    throw new Error('expected to find a checksum/build-info annotation');
  }
  return match[1];
};

if (extractChecksum(stagingRender) === extractChecksum(prodRender)) {
  throw new Error(
    'staging and prod renders resolve different build-info content, so ' +
      'their checksum/build-info annotations must differ too, otherwise a ' +
      'staging->prod promotion with the same image.tag would not roll pods'
  );
}

const cacheEnabledRender = render([
  '--set',
  'ingress.enabled=true',
  '--set',
  'ingress.host=staging.danielsmith.io',
  '--set',
  'image.tag=main-af1cabad',
  '--set',
  'githubMetricsCache.enabled=true',
]);
assertIncludes(
  cacheEnabledRender,
  'name: danielsmith-build-info',
  'build-info ConfigMap should still render alongside the optional GitHub metrics cache'
);
assertIncludes(
  cacheEnabledRender,
  `- name: runtime-data
              mountPath: /usr/share/nginx/html/runtime
              readOnly: true`,
  'metrics-enabled nginx should mount the shared runtime volume read-only'
);
assertIncludes(
  cacheEnabledRender,
  `- name: runtime-data
              mountPath: /cache`,
  'github-metrics should mount that same runtime volume read-write at its output directory'
);
assertExcludes(
  cacheEnabledRender,
  'mountPath: /usr/share/nginx/html/runtime/build-info.json',
  'metrics-enabled render must not include the runtime-invalid nested build-info mount'
);
assertExcludes(
  cacheEnabledRender,
  'subPath: build-info.json',
  'metrics-enabled build-info should be seeded rather than subPath-mounted'
);

assertExcludes(
  defaultRender,
  'kind: Secret',
  'build-info ConfigMap must not introduce Kubernetes Secrets'
);
assertExcludes(
  defaultRender,
  'secretKeyRef',
  'build-info ConfigMap must not reference secret env vars'
);

console.log('Helm build-info render assertions passed.');
