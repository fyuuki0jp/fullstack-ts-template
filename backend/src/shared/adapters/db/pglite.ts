import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { DbAdapter } from '.';

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

export class PGLiteDbAdapter implements DbAdapter {
  constructor(private db: DrizzleDb) {}

  async query<T>(sql: string, _params?: unknown[]): Promise<Result<T[], Error>> {
    try {
      // PGLiteではDrizzle経由でクエリを実行
      const result = await this.db.execute(sql);
      return ok(result.rows as T[]);
    } catch (error) {
      return err(error as Error);
    }
  }

  async execute(sql: string, _params?: unknown[]): Promise<Result<number, Error>> {
    try {
      await this.db.execute(sql);
      // PGLite + Drizzleでは影響行数の取得が困難なため、成功時は1を返す
      return ok(1);
    } catch (error) {
      return err(error as Error);
    }
  }

  async transaction<T>(
    fn: (tx: DbAdapter) => Promise<Result<T, Error>>
  ): Promise<Result<T, Error>> {
    try {
      return await this.db.transaction(async (tx) => {
        const txAdapter = new PGLiteDbAdapter(tx as unknown as DrizzleDb);
        return fn(txAdapter);
      });
    } catch (error) {
      return err(error as Error);
    }
  }
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
