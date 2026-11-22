import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'playwright/main-preview',
  testMatch: 'browser-check.ts',
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1280, height: 720 },
    serviceWorkers: 'block',
  },
  webServer: {
    command:
      'npm exec --offline -- vite preview --host 127.0.0.1 --port 5174 --strictPort --outDir "$MAIN_PREVIEW_SITE_DIR"',
    url: 'http://127.0.0.1:5174/runtime/main-preview.json',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
