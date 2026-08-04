import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    globals: true,
    exclude: [...configDefaults.exclude, 'playwright/**'],
    coverage: {
      enabled: false,
    },
  },
});
