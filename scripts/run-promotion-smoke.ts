import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const passthrough: string[] = [];
const env: NodeJS.ProcessEnv = { ...process.env };

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];

  if (arg === '--skip-resume') {
    env.PROMOTION_SMOKE_SKIP_RESUME = '1';
    continue;
  }

  if (arg === '--base-url') {
    const value = args[index + 1];
    if (!value) {
      throw new Error('Expected a URL after --base-url.');
    }
    env.PROMOTION_SMOKE_BASE_URL = value;
    index += 1;
    continue;
  }

  if (arg.startsWith('--base-url=')) {
    env.PROMOTION_SMOKE_BASE_URL = arg.slice('--base-url='.length);
    continue;
  }

  passthrough.push(arg);
}

const result = spawnSync(
  'playwright',
  [
    'test',
    '--config=playwright.promotion.config.ts',
    'playwright/promotion-smoke.spec.ts',
    ...passthrough,
  ],
  {
    env,
    shell: true,
    stdio: 'inherit',
  }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
