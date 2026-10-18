import { defineConfig } from 'vitest/config';
import { reactDomShim } from './vite.config.ts';

export default defineConfig({
  // 本番と同じ react-dom の代用品で動かす
  resolve: { alias: [{ find: /^react-dom(\/client)?$/, replacement: reactDomShim }] },
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
