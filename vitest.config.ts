import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [...configDefaults.exclude, 'playwright/**'],
    coverage: {
      enabled: false,
    },
  },
});
