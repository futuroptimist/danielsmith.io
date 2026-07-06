import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'playwright',
  testMatch: 'promotion-smoke.spec.ts',
  timeout: 60_000,
  workers: 1,
  use: {
    viewport: { width: 1280, height: 720 },
  },
});
