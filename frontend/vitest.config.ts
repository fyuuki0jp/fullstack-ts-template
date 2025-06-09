/* eslint-disable no-undef */
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    target: 'esnext',
    format: 'esm',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@backend': path.resolve(__dirname, '../backend/src'),
    },
  },
});
