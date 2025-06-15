import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isErr } from 'result';
import type { PGlite } from '@electric-sql/pglite';
import { setupTestDatabase } from '../../../shared/adapters/db/pglite';
import type { DrizzleDb } from '../../../shared/adapters/db';
import { getUsers, getUserById } from './get-users';
import { createUser } from '../commands/create-user';

describe('User Queries', () => {
  let client: PGlite;
  let db: DrizzleDb;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    client = setup.client;
    db = setup.db;
  });

  afterAll(async () => {
    await client.close();
  });

  describe('getUsers', () => {
    it('should return users list', async () => {
      const getUsersFn = getUsers.inject({ db })();
      const result = await getUsersFn({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value.users)).toBe(true);
        expect(typeof result.value.total).toBe('number');
      }
    });

    it('should handle pagination', async () => {
      const queryParams = {
        page: '1',
        limit: '5',
      };

      const getUsersFn = getUsers.inject({ db })();
      const result = await getUsersFn(queryParams);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.users.length).toBeLessThanOrEqual(5);
      }
    });

    it('should handle invalid query parameters', async () => {
      const invalidParams = {
        page: 'invalid',
        limit: '-1',
      };

      const getUsersFn = getUsers.inject({ db })();
      const result = await getUsersFn(invalidParams);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBeDefined();
      }
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      // First create a user
      const input = {
        email: 'query-test@example.com',
        name: 'Query Test User',
      };

      const createUserFn = createUser.inject({ db })();
      const createResult = await createUserFn(input);
      expect(createResult.ok).toBe(true);

      if (createResult.ok) {
        const getUserByIdFn = getUserById.inject({ db })();
        const result = await getUserByIdFn(createResult.value.id);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).not.toBeNull();
          expect(result.value?.id).toBe(createResult.value.id);
        }
      }
    });

    it('should return null when user not found', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';

      const getUserByIdFn = getUserById.inject({ db })();
      const result = await getUserByIdFn(nonExistentId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('should handle invalid ID format', async () => {
      const invalidId = 'invalid-id';

      const getUserByIdFn = getUserById.inject({ db })();
      const result = await getUserByIdFn(invalidId);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('無効');
      }
    });
  });
});
