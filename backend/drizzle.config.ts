import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/entities/*/schema.ts',
  out: './drizzle',
  dbCredentials: {
    // PGLite用の設定 - 実際のデータベースURLは実行時に決定
    url: '',
  },
  verbose: true,
  strict: true,
});
