import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/js/setup.ts'],
    include: ['tests/js/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['frontend/**/*.{ts,tsx}'],
      exclude: ['frontend/env.d.ts'],
      reporter: ['text', 'text-summary'],
    },
  },
});
