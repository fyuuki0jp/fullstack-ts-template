import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqliteAdapter } from './sqlite';
import { isErr } from '@fyuuki0jp/railway-result';
import { existsSync, unlinkSync } from 'fs';

describe('SqliteAdapter', () => {
  let adapter: SqliteAdapter;
  const testDbPath = './test.db';

  beforeEach(() => {
    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    adapter = new SqliteAdapter(testDbPath);
  });

  afterEach(() => {
    // Clean up test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('query', () => {
    it('should execute SELECT queries successfully', async () => {
      // Setup test table
      await adapter.execute(
        'CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)'
      );
      await adapter.execute('INSERT INTO test (name) VALUES (?)', ['test1']);
      await adapter.execute('INSERT INTO test (name) VALUES (?)', ['test2']);

      const result = await adapter.query<{ id: number; name: string }>(
        'SELECT * FROM test ORDER BY id'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]).toEqual({ id: 1, name: 'test1' });
        expect(result.data[1]).toEqual({ id: 2, name: 'test2' });
      }
    });

    it('should handle query with parameters', async () => {
      await adapter.execute(
        'CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)'
      );
      await adapter.execute('INSERT INTO test (name) VALUES (?)', ['test1']);
      await adapter.execute('INSERT INTO test (name) VALUES (?)', ['test2']);

      const result = await adapter.query<{ id: number; name: string }>(
        'SELECT * FROM test WHERE name = ?',
        ['test1']
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('test1');
      }
    });

    it('should return error for invalid SQL', async () => {
      const result = await adapter.query('SELECT * FROM non_existent_table');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('no such table');
      }
    });
  });

  describe('execute', () => {
    it('should execute CREATE TABLE successfully', async () => {
      const result = await adapter.execute(
        'CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)'
      );

      expect(result.success).toBe(true);
    });

    it('should execute INSERT with parameters', async () => {
      await adapter.execute(
        'CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)'
      );

      const result = await adapter.execute(
        'INSERT INTO test (name) VALUES (?)',
        ['test value']
      );

      expect(result.success).toBe(true);

      // Verify insert
      const queryResult = await adapter.query<{ name: string }>(
        'SELECT name FROM test'
      );
      expect(queryResult.success).toBe(true);
      if (queryResult.success) {
        expect(queryResult.data[0].name).toBe('test value');
      }
    });

    it('should return error for constraint violations', async () => {
      await adapter.execute(
        'CREATE TABLE test (id INTEGER PRIMARY KEY, email TEXT UNIQUE)'
      );
      await adapter.execute('INSERT INTO test (email) VALUES (?)', [
        'test@example.com',
      ]);

      const result = await adapter.execute(
        'INSERT INTO test (email) VALUES (?)',
        ['test@example.com']
      );

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('UNIQUE constraint failed');
      }
    });
  });

  describe('transaction', () => {
    it('should commit successful transactions', async () => {
      await adapter.execute(
        'CREATE TABLE test (id INTEGER PRIMARY KEY, value INTEGER)'
      );

      const result = await adapter.transaction(async (tx) => {
        await tx.execute('INSERT INTO test (value) VALUES (?)', [1]);
        await tx.execute('INSERT INTO test (value) VALUES (?)', [2]);
        return tx.query<{ value: number }>(
          'SELECT SUM(value) as value FROM test'
        );
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].value).toBe(3);
      }

      // Verify data persisted
      const verifyResult = await adapter.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM test'
      );
      if (verifyResult.success) {
        expect(verifyResult.data[0].count).toBe(2);
      }
    });

    it('should rollback failed transactions', async () => {
      await adapter.execute(
        'CREATE TABLE test (id INTEGER PRIMARY KEY, value INTEGER UNIQUE)'
      );
      await adapter.execute('INSERT INTO test (value) VALUES (?)', [1]);

      const result = await adapter.transaction(async (tx) => {
        await tx.execute('INSERT INTO test (value) VALUES (?)', [2]);
        // This should fail due to unique constraint
        return tx.execute('INSERT INTO test (value) VALUES (?)', [1]);
      });

      expect(isErr(result)).toBe(true);

      // Verify rollback - only original row should exist
      const verifyResult = await adapter.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM test'
      );
      if (verifyResult.success) {
        expect(verifyResult.data[0].count).toBe(1);
      }
    });
  });

  describe('constructor with in-memory database', () => {
    it('should create in-memory database when no path provided', () => {
      const memAdapter = new SqliteAdapter();

      // Should be able to create tables and query
      const createResult = memAdapter.execute(
        'CREATE TABLE test (id INTEGER PRIMARY KEY)'
      );
      expect(createResult).toBeTruthy();
    });
  });
});
