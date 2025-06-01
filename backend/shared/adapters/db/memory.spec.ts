import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryAdapter } from './memory';
import { isErr, ok, err } from '@fyuuki0jp/railway-result';

describe('MemoryAdapter', () => {
  let adapter: MemoryAdapter;

  beforeEach(() => {
    adapter = new MemoryAdapter();
    adapter.execute(
      'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT)'
    );
  });

  describe('query', () => {
    it('should execute SELECT queries successfully', async () => {
      await adapter.execute(
        'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
        ['1', 'test@example.com', 'Test User']
      );

      const result = await adapter.query<{
        id: string;
        email: string;
        name: string;
      }>('SELECT * FROM users WHERE id = $1', ['1']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual({
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        });
      }
    });

    it('should handle query errors for non-existent tables', async () => {
      const result = await adapter.query('SELECT * FROM non_existent_table');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('non_existent_table');
      }
    });

    it('should handle empty result sets', async () => {
      const result = await adapter.query<{ id: string }>(
        'SELECT * FROM users WHERE id = $1',
        ['999']
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it('should filter by email', async () => {
      await adapter.execute(
        'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
        ['1', 'test@example.com', 'Test User']
      );
      await adapter.execute(
        'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
        ['2', 'other@example.com', 'Other User']
      );

      const result = await adapter.query<{ id: string; email: string }>(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].email).toBe('test@example.com');
      }
    });
  });

  describe('execute', () => {
    it('should execute INSERT statements', async () => {
      const result = await adapter.execute(
        'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
        ['2', 'new@example.com', 'New User']
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1);
      }

      // Verify the data was inserted
      const queryResult = await adapter.query(
        'SELECT * FROM users WHERE id = $1',
        ['2']
      );
      expect(queryResult.success).toBe(true);
      if (queryResult.success) {
        expect(queryResult.data).toHaveLength(1);
      }
    });

    it('should enforce unique constraint on email', async () => {
      await adapter.execute(
        'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
        ['1', 'duplicate@example.com', 'User 1']
      );

      const result = await adapter.execute(
        'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
        ['2', 'duplicate@example.com', 'User 2']
      );

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('UNIQUE constraint failed');
      }
    });

    it('should execute UPDATE statements', async () => {
      await adapter.execute(
        'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
        ['3', 'update@example.com', 'Original Name']
      );

      const result = await adapter.execute(
        'UPDATE users SET name = $1 WHERE id = $2',
        ['Updated Name', '3']
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1);
      }

      // Verify the update
      const queryResult = await adapter.query<{ name: string }>(
        'SELECT * FROM users WHERE id = $1',
        ['3']
      );
      expect(queryResult.success).toBe(true);
      if (queryResult.success) {
        expect(queryResult.data[0].name).toBe('Updated Name');
      }
    });

    it('should execute DELETE statements', async () => {
      await adapter.execute(
        'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
        ['4', 'delete@example.com', 'To Delete']
      );

      const result = await adapter.execute('DELETE FROM users WHERE id = $1', [
        '4',
      ]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1);
      }

      // Verify deletion
      const queryResult = await adapter.query(
        'SELECT * FROM users WHERE id = $1',
        ['4']
      );
      expect(queryResult.success).toBe(true);
      if (queryResult.success) {
        expect(queryResult.data).toHaveLength(0);
      }
    });

    it('should handle execution errors', async () => {
      const result = await adapter.execute(
        'INSERT INTO non_existent_table (id) VALUES ($1)',
        ['1']
      );

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('non_existent_table');
      }
    });
  });

  describe('transaction', () => {
    it('should commit successful transactions', async () => {
      const result = await adapter.transaction(async (tx) => {
        const insertResult = await tx.execute(
          'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
          ['5', 'tx@example.com', 'Tx User']
        );

        if (isErr(insertResult)) return insertResult;

        const queryResult = await tx.query<{ id: string }>(
          'SELECT * FROM users WHERE id = $1',
          ['5']
        );
        return queryResult;
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
      }

      // Verify data persisted after transaction
      const checkResult = await adapter.query(
        'SELECT * FROM users WHERE id = $1',
        ['5']
      );
      expect(checkResult.success).toBe(true);
      if (checkResult.success) {
        expect(checkResult.data).toHaveLength(1);
      }
    });

    it('should rollback failed transactions', async () => {
      const result = await adapter.transaction(async (tx) => {
        await tx.execute(
          'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
          ['6', 'rollback@example.com', 'Rollback User']
        );

        // Force an error
        return err(new Error('Transaction failed'));
      });

      expect(isErr(result)).toBe(true);

      // Verify data was rolled back
      const checkResult = await adapter.query(
        'SELECT * FROM users WHERE id = $1',
        ['6']
      );
      expect(checkResult.success).toBe(true);
      if (checkResult.success) {
        expect(checkResult.data).toHaveLength(0);
      }
    });

    it('should not support nested transactions', async () => {
      const result = await adapter.transaction(async (tx) => {
        const nestedResult = await tx.transaction(async () => {
          return ok('nested');
        });
        return nestedResult;
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain(
          'Nested transactions not supported'
        );
      }
    });
  });
});
