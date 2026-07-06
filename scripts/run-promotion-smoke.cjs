#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const args = process.argv.slice(2);
const passthrough = [];
const env = { ...process.env };

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];

  if (arg === '--base-url') {
    const value = args[index + 1];
    if (!value) {
      console.error('Missing value for --base-url.');
      process.exit(1);
    }
    env.PROMOTION_SMOKE_BASE_URL = value;
    index += 1;
    continue;
  }

  if (arg.startsWith('--base-url=')) {
    env.PROMOTION_SMOKE_BASE_URL = arg.slice('--base-url='.length);
    continue;
  }

  if (arg === '--skip-resume') {
    env.PROMOTION_SMOKE_SKIP_RESUME = '1';
    continue;
  }

  passthrough.push(arg);
}

env.PLAYWRIGHT_NO_WEBSERVER = env.PLAYWRIGHT_NO_WEBSERVER ?? '1';

const result = spawnSync(
  'npx',
  ['playwright', 'test', 'playwright/promotion-smoke.spec.ts', ...passthrough],
  {
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  }
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
