import type { Result } from '@fyuuki0jp/railway-result';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { DbAdapter } from '.';

interface StoredData {
  [tableName: string]: Record<string, unknown>[];
}

export class MemoryAdapter implements DbAdapter {
  private data: StoredData = {};
  private inTransaction = false;
  private transactionData: StoredData | null = null;

  constructor() {
    // Initialize with empty tables
    this.data = {
      users: [],
    };
  }

  async query<T>(sql: string, params?: unknown[]): Promise<Result<T[], Error>> {
    try {
      const currentData =
        this.inTransaction && this.transactionData
          ? this.transactionData
          : this.data;

      // Simple SQL parser for basic SELECT queries
      const selectMatch = sql.match(
        /SELECT\s+\*\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i
      );
      if (selectMatch) {
        const tableName = selectMatch[1];
        const whereClause = selectMatch[2];

        if (!currentData[tableName]) {
          return err(new Error(`Table ${tableName} does not exist`));
        }

        let results = [...currentData[tableName]];

        // Simple WHERE clause parsing
        if (whereClause) {
          // Handle simple id = $1 pattern
          const idMatch = whereClause.match(
            /id\s*=\s*['"]?(\$\d+|[^'"]+)['"]?/i
          );
          if (idMatch && params && params[0]) {
            results = results.filter(
              (row) => (row as { id?: unknown }).id === params[0]
            );
          }
          // Handle email = $1 pattern
          const emailMatch = whereClause.match(
            /email\s*=\s*['"]?(\$\d+|[^'"]+)['"]?/i
          );
          if (emailMatch && params && params[0]) {
            results = results.filter(
              (row) => (row as { email?: unknown }).email === params[0]
            );
          }
        }

        return ok(results as T[]);
      }

      return err(new Error('Unsupported SQL query'));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async execute(
    sql: string,
    params?: unknown[]
  ): Promise<Result<number, Error>> {
    try {
      const currentData =
        this.inTransaction && this.transactionData
          ? this.transactionData
          : this.data;

      // Handle CREATE TABLE
      if (sql.match(/CREATE\s+TABLE/i)) {
        const tableMatch = sql.match(
          /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i
        );
        if (tableMatch) {
          const tableName = tableMatch[1];
          if (!currentData[tableName]) {
            currentData[tableName] = [];
          }
          return ok(0);
        }
      }

      // Handle INSERT
      const insertMatch = sql.match(
        /INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i
      );
      if (insertMatch) {
        const tableName = insertMatch[1];
        const columns = insertMatch[2].split(',').map((c) => c.trim());

        if (!currentData[tableName]) {
          return err(new Error(`Table ${tableName} does not exist`));
        }

        // Create new row object
        const newRow: Record<string, unknown> = {};
        columns.forEach((col, index) => {
          if (params && params[index] !== undefined) {
            newRow[col] = params[index];
          }
        });

        // Check for unique constraint on email
        if (
          newRow.email &&
          currentData[tableName].some(
            (row) => (row as { email?: string }).email === newRow.email
          )
        ) {
          return err(new Error('UNIQUE constraint failed: email'));
        }

        currentData[tableName].push(newRow);
        return ok(1);
      }

      // Handle UPDATE
      const updateMatch = sql.match(
        /UPDATE\s+(\w+)\s+SET\s+(.+)\s+WHERE\s+(.+)/i
      );
      if (updateMatch) {
        const tableName = updateMatch[1];
        const setClause = updateMatch[2];
        const whereClause = updateMatch[3];

        if (!currentData[tableName]) {
          return err(new Error(`Table ${tableName} does not exist`));
        }

        // Simple SET clause parsing
        const setMatch = setClause.match(/(\w+)\s*=\s*\$(\d+)/);
        if (setMatch && params) {
          const column = setMatch[1];
          const paramIndex = parseInt(setMatch[2]) - 1;
          const value = params[paramIndex];

          // Simple WHERE id = $n parsing
          const whereMatch = whereClause.match(/id\s*=\s*\$(\d+)/);
          if (whereMatch) {
            const whereParamIndex = parseInt(whereMatch[1]) - 1;
            const id = params[whereParamIndex];

            let updatedCount = 0;
            currentData[tableName] = currentData[tableName].map((row) => {
              if ((row as { id?: unknown }).id === id) {
                updatedCount++;
                return { ...row, [column]: value };
              }
              return row;
            });

            return ok(updatedCount);
          }
        }
      }

      // Handle DELETE
      const deleteMatch = sql.match(
        /DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i
      );
      if (deleteMatch) {
        const tableName = deleteMatch[1];
        const whereClause = deleteMatch[2];

        if (!currentData[tableName]) {
          return err(new Error(`Table ${tableName} does not exist`));
        }

        if (whereClause && params) {
          const whereMatch = whereClause.match(/id\s*=\s*\$(\d+)/);
          if (whereMatch) {
            const paramIndex = parseInt(whereMatch[1]) - 1;
            const id = params[paramIndex];
            const originalLength = currentData[tableName].length;
            currentData[tableName] = currentData[tableName].filter(
              (row) => (row as { id?: unknown }).id !== id
            );
            return ok(originalLength - currentData[tableName].length);
          }
        }
      }

      return err(new Error('Unsupported SQL statement'));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async transaction<T>(
    fn: (tx: DbAdapter) => Promise<Result<T, Error>>
  ): Promise<Result<T, Error>> {
    if (this.inTransaction) {
      return err(new Error('Nested transactions not supported'));
    }

    try {
      this.inTransaction = true;
      this.transactionData = JSON.parse(JSON.stringify(this.data)); // Deep clone

      const result = await fn(this);

      if (result.success) {
        // Commit: copy transaction data to main data
        this.data = this.transactionData!;
      }

      return result;
    } catch (error) {
      // Rollback happens automatically by not copying transactionData
      return err(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.inTransaction = false;
      this.transactionData = null;
    }
  }

  // Helper method for testing
  clear() {
    this.data = { users: [] };
  }

  // Helper method to get all data
  getAllData() {
    return this.data;
  }
}
