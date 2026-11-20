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
    exclude: [
      ...configDefaults.exclude,
      'playwright/**',
      '**/.performance-history/**',
    ],
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/tests/**',
        '**/__tests__/**',
        '**/*.{test,spec}.ts',
        '**/*.d.ts',
      ],
    },
  },
});
