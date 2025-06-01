import { ok, err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { DbAdapter } from './index';

export class MockDbAdapter implements DbAdapter {
  private data: Map<string, unknown[]> = new Map();
  private shouldFailNext = false;
  private failureMessage = 'Mock error';

  // Test helper methods
  mockFailure(message = 'Mock error'): void {
    this.shouldFailNext = true;
    this.failureMessage = message;
  }

  reset(): void {
    this.data.clear();
    this.shouldFailNext = false;
    this.failureMessage = 'Mock error';
  }

  setData(table: string, rows: unknown[]): void {
    this.data.set(table, rows);
  }

  getData(table: string): unknown[] {
    return this.data.get(table) || [];
  }

  // DbAdapter implementation
  async query<T>(sql: string, params?: unknown[]): Promise<Result<T[], Error>> {
    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      return err(new Error(this.failureMessage));
    }

    // Simple SQL parsing for testing
    const selectMatch = sql.match(/SELECT .* FROM (\w+)/i);
    if (selectMatch) {
      const table = selectMatch[1];
      const data = this.getData(table) as T[];

      // Handle WHERE clause
      const whereMatch = sql.match(/WHERE (\w+) = \?/i);
      if (whereMatch && params && params.length > 0) {
        const field = whereMatch[1];
        const value = params[0];
        const filtered = data.filter(
          (row) => (row as Record<string, unknown>)[field] === value
        );
        return ok(filtered);
      }

      // Handle ORDER BY
      const orderMatch = sql.match(/ORDER BY (\w+) (ASC|DESC)/i);
      if (orderMatch) {
        const field = orderMatch[1];
        const direction = orderMatch[2].toUpperCase();
        const sorted = [...data].sort((a, b) => {
          const aVal = (a as Record<string, unknown>)[field];
          const bVal = (b as Record<string, unknown>)[field];
          if (direction === 'DESC') {
            return String(aVal) > String(bVal) ? -1 : 1;
          }
          return String(aVal) > String(bVal) ? 1 : -1;
        });
        return ok(sorted);
      }

      return ok(data);
    }

    return ok([]);
  }

  async execute(
    sql: string,
    params?: unknown[]
  ): Promise<Result<number, Error>> {
    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      return err(new Error(this.failureMessage));
    }

    // Simple SQL parsing for INSERT
    const insertMatch = sql.match(/INSERT INTO (\w+)\s*\((.*?)\)\s*VALUES/is);
    if (insertMatch) {
      const table = insertMatch[1];
      const columns = insertMatch[2].split(',').map((c) => c.trim());

      if (params && params.length === columns.length) {
        const row: Record<string, unknown> = {};
        columns.forEach((col, i) => {
          row[col] = params[i];
        });

        const data = this.getData(table);

        // Check for unique constraint on email
        if (table === 'users' && row.email) {
          const exists = data.some(
            (r) => (r as Record<string, unknown>).email === row.email
          );
          if (exists) {
            return err(
              new Error(
                'Execute failed: SqliteError: UNIQUE constraint failed: users.email'
              )
            );
          }
        }

        data.push(row);
        this.setData(table, data);
        return ok(1); // Return 1 affected row
      }
    }

    // Handle CREATE TABLE and other DDL
    if (sql.match(/CREATE TABLE/i)) {
      return ok(0);
    }

    return ok(0);
  }

  async transaction<T>(
    fn: (tx: DbAdapter) => Promise<Result<T, Error>>
  ): Promise<Result<T, Error>> {
    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      return err(new Error(this.failureMessage));
    }

    // Create a snapshot for rollback
    const snapshot = new Map(this.data);
    try {
      const result = await fn(this);
      if (result.success) {
        return result;
      } else {
        // Rollback
        this.data = snapshot;
        return result;
      }
    } catch (error) {
      // Rollback
      this.data = snapshot;
      return err(error as Error);
    }
  }
}
