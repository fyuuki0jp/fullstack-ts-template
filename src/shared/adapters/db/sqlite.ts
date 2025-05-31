import Database from 'better-sqlite3';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { DbAdapter } from './index';

export class SqliteAdapter implements DbAdapter {
  private db: Database.Database;

  constructor(filename: string = ':memory:') {
    this.db = new Database(filename);
    this.db.pragma('journal_mode = WAL');
  }

  async query<T>(sql: string, params?: unknown[]): Promise<Result<T[], Error>> {
    try {
      const stmt = this.db.prepare(sql);
      const rows = params ? stmt.all(...params) : stmt.all();
      return ok(rows as T[]);
    } catch (error) {
      return err(new Error(`Query failed: ${error}`));
    }
  }

  async execute(
    sql: string,
    params?: unknown[]
  ): Promise<Result<number, Error>> {
    try {
      const stmt = this.db.prepare(sql);
      const result = params ? stmt.run(...params) : stmt.run();
      return ok(result.changes);
    } catch (error) {
      return err(new Error(`Execute failed: ${error}`));
    }
  }

  async transaction<T>(
    fn: (tx: DbAdapter) => Promise<Result<T, Error>>
  ): Promise<Result<T, Error>> {
    try {
      this.db.exec('BEGIN');
      const result = await fn(this);

      if (result.success) {
        this.db.exec('COMMIT');
        return result;
      } else {
        this.db.exec('ROLLBACK');
        return result;
      }
    } catch (error) {
      try {
        this.db.exec('ROLLBACK');
      } catch {
        // Ignore rollback errors
      }
      return err(new Error(`Transaction failed: ${error}`));
    }
  }

  close(): void {
    this.db.close();
  }
}
