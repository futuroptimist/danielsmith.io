import { defineConfig } from '@playwright/test';

const baseURL =
  process.env.PROMOTION_SMOKE_BASE_URL ??
  process.env.PLAYWRIGHT_BASE_URL ??
  'https://staging.danielsmith.io';

export default defineConfig({
  testDir: 'playwright',
  timeout: 90_000,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL,
    viewport: { width: 1280, height: 720 },
  },
});
