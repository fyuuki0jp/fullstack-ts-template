import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

export type DrizzleDb = ReturnType<typeof createDrizzleDb>;

export function createDrizzleDb(dataDir?: string) {
  const pglite = new PGlite(dataDir);
  return drizzle(pglite);
}

// テスト用のデータベースセットアップ
export async function setupTestDatabase() {
  const client = new PGlite(); // in-memory
  const db = drizzle(client);

  // Apply migrations
  const migrationsFolder = process.cwd().endsWith('backend')
    ? './drizzle'
    : './backend/drizzle';

  await migrate(db, { migrationsFolder });

  return { client, db };
}

// DrizzleDb インスタンスを直接エクスポート（新しいアーキテクチャ用）
let _db: DrizzleDb | null = null;

export function initializeDb(dataDir?: string): DrizzleDb {
  if (!_db) {
    _db = createDrizzleDb(dataDir);
  }
  return _db;
}

export function getDb(): DrizzleDb {
  if (!_db) {
    throw new Error('Database not initialized. Call initializeDb() first.');
  }
  return _db;
}
