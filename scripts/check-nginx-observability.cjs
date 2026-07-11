#!/usr/bin/env node
const { readFileSync } = require('node:fs');

const config = readFileSync('docker/nginx/default.conf', 'utf8');
const failures = [];

function locationBlock(path) {
  const pattern = new RegExp(
    `location = ${path.replace('/', '\\/')} \\{([\\s\\S]*?)\\n    \\}`,
    'm'
  );
  const match = config.match(pattern);
  return match?.[1] ?? '';
}

for (const [endpoint, check] of [
  ['/healthz', 'readiness'],
  ['/livez', 'liveness'],
]) {
  const block = locationBlock(endpoint);
  if (!block) {
    failures.push(`${endpoint} must use an exact nginx location.`);
    continue;
  }
  if (!block.includes('default_type application/json;')) {
    failures.push(`${endpoint} must set application/json as the default type.`);
  }
  if (!block.includes('add_header Cache-Control "no-store" always;')) {
    failures.push(`${endpoint} must set Cache-Control: no-store.`);
  }
  if (!block.includes(`"check":"${check}"`)) {
    failures.push(`${endpoint} must return the ${check} JSON contract.`);
  }
  if (block.includes('try_files') || block.includes('@spa_fallback')) {
    failures.push(
      `${endpoint} must not be able to fall through to index.html.`
    );
  }
}

const rootBlock = config.match(/location \/ \{([\s\S]*?)\n    \}/m)?.[1] ?? '';
if (!rootBlock.includes('try_files $uri $uri/ @spa_fallback;')) {
  failures.push(
    '/ must serve the SPA fallback instead of a placeholder route.'
  );
}

if (failures.length > 0) {
  console.error('nginx observability contract check failed.');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('nginx observability contract check passed.');
