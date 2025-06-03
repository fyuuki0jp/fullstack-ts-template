import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    // setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
