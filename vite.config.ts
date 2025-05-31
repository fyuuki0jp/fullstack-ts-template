import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'SpaHono',
      fileName: 'index',
    },
    rollupOptions: {
      external: ['hono'],
      output: {
        globals: {
          hono: 'Hono',
        },
      },
    },
  },
});
