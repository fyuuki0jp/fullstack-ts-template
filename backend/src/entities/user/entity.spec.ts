/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { UserEntity } from './entity';
import { setupTestDatabase } from '../../shared/adapters/db/pglite';
import { isErr } from 'result';
import type { PGlite } from '@electric-sql/pglite';
import type { DrizzleDb } from '../../shared/adapters/db/pglite';

describe('UserEntity', () => {
  let client: PGlite;
  let db: DrizzleDb;
  let userEntity: ReturnType<typeof UserEntity.inject>;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    client = setup.client;
    db = setup.db;
    userEntity = UserEntity.inject({ db });
  });

  afterAll(async () => {
    await client.close();
  });

  describe('create', () => {
    it('should create a new user with valid input', async () => {
      const input = {
        email: 'test@example.com' as any,
        name: 'Test User' as any,
      };

      const result = await userEntity().create(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.email).toBe(input.email);
        expect(result.value.name).toBe(input.name);
        expect(result.value.id).toBeDefined();
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
        expect(result.value.deletedAt).toBeNull();
      }
    });

    it('should handle duplicate emails', async () => {
      const input = {
        email: 'duplicate@example.com' as any,
        name: 'First User' as any,
      };

      // Create first user
      const firstResult = await userEntity().create(input);
      expect(firstResult.ok).toBe(true);

      // Try to create duplicate
      const secondResult = await userEntity().create({
        email: input.email as any,
        name: 'Second User' as any,
      });

      expect(isErr(secondResult)).toBe(true);
      if (isErr(secondResult)) {
        expect(secondResult.error.message).toContain('already exists');
      }
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      // Create test users
      await userEntity().create({
        email: 'user1@example.com' as any,
        name: 'User 1' as any,
      });
      await userEntity().create({
        email: 'user2@example.com' as any,
        name: 'User 2' as any,
      });

      const result = await userEntity().findAll();

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Check users are present (order might vary)
        const emails = result.value.map((u) => u.email);
        expect(emails).toContain('user1@example.com');
        expect(emails).toContain('user2@example.com');
      }
    });

    it('should return empty array when no users exist', async () => {
      // Clear all users first
      const allUsers = await userEntity().findAll();
      if (allUsers.ok) {
        for (const user of allUsers.value) {
          await userEntity().delete(user.id);
        }
      }

      const result = await userEntity().findAll();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const createResult = await userEntity().create({
        email: 'findme@example.com' as any,
        name: 'Find Me' as any,
      });

      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const result = await userEntity().findById(createResult.value.id);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).not.toBeNull();
        expect(result.value?.email).toBe('findme@example.com');
        expect(result.value?.name).toBe('Find Me');
      }
    });

    it('should return null when user not found', async () => {
      const result = await userEntity().findById(
        '550e8400-e29b-41d4-a716-446655440000' as any
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const createResult = await userEntity().create({
        email: 'update@example.com' as any,
        name: 'Original Name' as any,
      });

      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      // Small delay to ensure updatedAt timestamp differs
      await new Promise((resolve) => {
        globalThis.setTimeout(resolve, 10);
      });

      const updateResult = await userEntity().update(createResult.value.id, {
        name: 'Updated Name' as any,
      });

      expect(updateResult.ok).toBe(true);
      if (updateResult.ok && updateResult.value) {
        expect(updateResult.value.email).toBe('update@example.com');
        expect(updateResult.value.name).toBe('Updated Name');
        expect(updateResult.value.updatedAt.getTime()).toBeGreaterThan(
          createResult.value.updatedAt.getTime()
        );
      }
    });

    it('should return null when updating non-existent user', async () => {
      const result = await userEntity().update(
        '550e8400-e29b-41d4-a716-446655440000' as any,
        { name: 'New Name' as any }
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('delete', () => {
    it('should soft delete a user', async () => {
      const createResult = await userEntity().create({
        email: 'delete@example.com' as any,
        name: 'Delete Me' as any,
      });

      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const deleteResult = await userEntity().delete(createResult.value.id);

      expect(deleteResult.ok).toBe(true);
      if (deleteResult.ok) {
        expect(deleteResult.value).toBe(true);
      }

      // Verify user is soft deleted
      const findResult = await userEntity().findById(createResult.value.id);
      expect(findResult.ok).toBe(true);
      if (findResult.ok) {
        expect(findResult.value).toBeNull(); // Soft deleted users are not returned
      }
    });

    it('should return false when deleting non-existent user', async () => {
      const result = await userEntity().delete(
        '550e8400-e29b-41d4-a716-446655440000' as any
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });
  });
});
