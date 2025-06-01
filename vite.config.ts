import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import generouted from '@generouted/react-router/plugin';
import path from 'path';

export default defineConfig({
  ssr: {
    external: ['react', 'react-dom'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    generouted({
      source: {
        routes: path.resolve(__dirname, './frontend/app/**/[\\w[-]*.{jsx,tsx}'),
        modals: path.resolve(__dirname, './frontend/app/**/[\\w[-]*.{jsx,tsx}'),
      },
      output: path.resolve(__dirname, './frontend/router.ts'),
    }),
  ],
});
