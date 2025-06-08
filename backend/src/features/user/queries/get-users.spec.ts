import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getUsers } from './get-users';
import { createUser } from '../commands/create-user';
import { setupTestDatabase } from '../../../shared/adapters/db/pglite';
import type { PGlite } from '@electric-sql/pglite';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';

describe('getUsers query', () => {
  let client: PGlite;
  let db: DrizzleDb;
  let getUsersQuery: ReturnType<typeof getUsers.inject>;
  let createUserCmd: ReturnType<typeof createUser.inject>;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    client = setup.client;
    db = setup.db;
    getUsersQuery = getUsers.inject({ db });
    createUserCmd = createUser.inject({ db });
  });

  afterAll(async () => {
    await client.close();
  });

  it('should return all users from database', async () => {
    // Create test users
    await createUserCmd()({ email: 'user1@example.com', name: 'User 1' });
    await createUserCmd()({ email: 'user2@example.com', name: 'User 2' });

    const result = await getUsersQuery()();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThanOrEqual(2);

      // Check users are present (order might vary)
      const emails = result.value.map((u) => u.email);
      expect(emails).toContain('user1@example.com');
      expect(emails).toContain('user2@example.com');

      // Check that all required fields are present
      result.value.forEach((user) => {
        expect(user.id).toBeDefined();
        expect(user.createdAt).toBeInstanceOf(Date);
        expect(user.updatedAt).toBeInstanceOf(Date);
        expect(user.deletedAt).toBeNull();
      });
    }
  });

  it('should return empty array when no users exist', async () => {
    // Create a new test instance for isolation
    const isolatedSetup = await setupTestDatabase();
    const isolatedGetUsers = getUsers.inject({ db: isolatedSetup.db });

    const result = await isolatedGetUsers()();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([]);
      expect(result.value).toHaveLength(0);
    }

    await isolatedSetup.client.close();
  });

  it('should be a pure query with no side effects', async () => {
    // Create a test user
    await createUserCmd()({ email: 'user@example.com', name: 'User' });

    // Call multiple times
    const result1 = await getUsersQuery()();
    const result2 = await getUsersQuery()();
    const result3 = await getUsersQuery()();

    // Each call should return the same result
    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    expect(result3.ok).toBe(true);

    if (result1.ok && result2.ok && result3.ok) {
      expect(result1.value.length).toBeGreaterThan(0);
      expect(result1.value.length).toBe(result2.value.length);
      expect(result2.value.length).toBe(result3.value.length);
    }
  });

  it('should return users in consistent order', async () => {
    // Create users
    await createUserCmd()({ email: 'user3@example.com', name: 'User 3' });
    await createUserCmd()({ email: 'user4@example.com', name: 'User 4' });
    await createUserCmd()({ email: 'user5@example.com', name: 'User 5' });

    // Call multiple times to ensure consistency
    const result1 = await getUsersQuery()();
    const result2 = await getUsersQuery()();

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);

    if (result1.ok && result2.ok) {
      expect(result1.value.length).toBeGreaterThanOrEqual(3);
      expect(result2.value.length).toBe(result1.value.length);

      // Check that the order is consistent between calls
      const emails1 = result1.value.map((user) => user.email);
      const emails2 = result2.value.map((user) => user.email);
      expect(emails1).toEqual(emails2);

      // Check all users are present
      expect(emails1).toContain('user3@example.com');
      expect(emails1).toContain('user4@example.com');
      expect(emails1).toContain('user5@example.com');
    }
  });
});
