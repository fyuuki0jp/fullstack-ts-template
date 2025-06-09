import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { setupTestDatabase } from '../../shared/adapters/db/pglite';
import type { DrizzleDb } from '../../shared/adapters/db/pglite';
import {
  insertUser,
  selectUserById,
  selectActiveUsers,
  updateUser,
  deleteUser,
} from './repository';
import type { CreateUserInput, UpdateUserInput } from './schema';
import { UserEmailSchema, UserNameSchema } from './schema';

describe('User Repository', () => {
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

  describe('insertUser', () => {
    it('should insert a new user', async () => {
      const input: CreateUserInput = {
        email: UserEmailSchema.parse('test@example.com'),
        name: UserNameSchema.parse('Test User'),
      };

      const insertUserFn = insertUser.inject({ db })();
      const result = await insertUserFn(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBeDefined();
        expect(result.value.email).toBe('test@example.com');
        expect(result.value.name).toBe('Test User');
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
        expect(result.value.deletedAt).toBeNull();
      }
    });

    it('should handle database errors gracefully', async () => {
      // TODO: Add test for database constraint violations or other errors
      // Example: duplicate key violation, foreign key constraint, etc.
    });
  });

  describe('selectUserById', () => {
    it('should return user when found', async () => {
      // First, create a user
      const input: CreateUserInput = {
        email: UserEmailSchema.parse('select@example.com'),
        name: UserNameSchema.parse('Select User'),
      };

      const insertUserFn = insertUser.inject({ db })();
      const insertResult = await insertUserFn(input);
      expect(insertResult.ok).toBe(true);

      if (insertResult.ok) {
        const selectUserByIdFn = selectUserById.inject({ db })();
        const selectResult = await selectUserByIdFn(insertResult.value.id);

        expect(selectResult.ok).toBe(true);
        if (selectResult.ok) {
          expect(selectResult.value).not.toBeNull();
          expect(selectResult.value?.id).toBe(insertResult.value.id);
        }
      }
    });

    it('should return null when user not found', async () => {
      const { createUserId } = await import('./schema');
      const idResult = createUserId();
      expect(idResult.ok).toBe(true);
      if (!idResult.ok) return;

      const selectUserByIdFn = selectUserById.inject({ db })();
      const result = await selectUserByIdFn(idResult.value);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('selectActiveUsers', () => {
    it('should return all active users', async () => {
      const selectActiveUsersFn = selectActiveUsers.inject({ db })();
      const result = await selectActiveUsersFn();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value)).toBe(true);
        // Should not include deleted users
        result.value.forEach((user) => {
          expect(user.deletedAt).toBeNull();
        });
      }
    });
  });

  describe('updateUser', () => {
    it('should update existing user', async () => {
      // First, create a user
      const input: CreateUserInput = {
        email: UserEmailSchema.parse('update@example.com'),
        name: UserNameSchema.parse('Update User'),
      };

      const insertUserFn = insertUser.inject({ db })();
      const insertResult = await insertUserFn(input);
      expect(insertResult.ok).toBe(true);

      if (insertResult.ok) {
        // Add a small delay to ensure updatedAt timestamp changes
        await new Promise((resolve) => globalThis.setTimeout(resolve, 1));
        const updateData: UpdateUserInput = {
          name: UserNameSchema.parse('Updated User'),
        };

        const updateUserFn = updateUser.inject({ db })();
        const updateResult = await updateUserFn(
          insertResult.value.id,
          updateData
        );

        expect(updateResult.ok).toBe(true);
        if (updateResult.ok) {
          expect(updateResult.value).not.toBeNull();
          expect(updateResult.value?.name).toBe('Updated User');
          expect(updateResult.value?.updatedAt.getTime()).toBeGreaterThan(
            insertResult.value.updatedAt.getTime()
          );
        }
      }
    });

    it('should return null when updating non-existent user', async () => {
      const { createUserId } = await import('./schema');
      const idResult = createUserId();
      expect(idResult.ok).toBe(true);
      if (!idResult.ok) return;

      const updateData: UpdateUserInput = {
        name: UserNameSchema.parse('Non-existent Update'),
      };

      const updateUserFn = updateUser.inject({ db })();
      const result = await updateUserFn(idResult.value, updateData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('deleteUser', () => {
    it('should soft delete existing user', async () => {
      // First, create a user
      const input: CreateUserInput = {
        email: UserEmailSchema.parse('delete@example.com'),
        name: UserNameSchema.parse('Delete User'),
      };

      const insertUserFn = insertUser.inject({ db })();
      const insertResult = await insertUserFn(input);
      expect(insertResult.ok).toBe(true);

      if (insertResult.ok) {
        const deleteUserFn = deleteUser.inject({ db })();
        const deleteResult = await deleteUserFn(insertResult.value.id);

        expect(deleteResult.ok).toBe(true);
        if (deleteResult.ok) {
          expect(deleteResult.value).toBe(true);
        }

        // Verify user is not returned in active users
        const selectUserByIdFn = selectUserById.inject({ db })();
        const selectResult = await selectUserByIdFn(insertResult.value.id);
        expect(selectResult.ok).toBe(true);
        if (selectResult.ok) {
          expect(selectResult.value).toBeNull();
        }
      }
    });

    it('should return false when deleting non-existent user', async () => {
      const { createUserId } = await import('./schema');
      const idResult = createUserId();
      expect(idResult.ok).toBe(true);
      if (!idResult.ok) return;

      const deleteUserFn = deleteUser.inject({ db })();
      const result = await deleteUserFn(idResult.value);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });
  });
});
