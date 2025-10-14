import { defineConfig } from '@playwright/test';

import { VISUAL_SMOKE_DIFF_BUDGET } from './src/assets/performance';

export default defineConfig({
  testDir: 'playwright',
  timeout: 60_000,
  // Chromium's headless WebGL context occasionally flakes when multiple workers
  // bootstrap the scene at the same time in CI. Lock tests to a single worker
  // there so the immersive boot sequence stays deterministic.
  workers: process.env.CI ? 1 : undefined,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: VISUAL_SMOKE_DIFF_BUDGET.maxDiffPixelRatio,
      maxDiffPixels: VISUAL_SMOKE_DIFF_BUDGET.maxDiffPixels,
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
