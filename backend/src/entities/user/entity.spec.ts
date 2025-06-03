import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { UserEntity } from './entity';
import { setupTestDatabase } from '../../shared/adapters/db/pglite';
import { isErr } from '@fyuuki0jp/railway-result';
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
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = await userEntity().create(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe(input.email);
        expect(result.data.name).toBe(input.name);
        expect(result.data.id).toBeDefined();
        expect(result.data.createdAt).toBeInstanceOf(Date);
        expect(result.data.updatedAt).toBeInstanceOf(Date);
        expect(result.data.deletedAt).toBeNull();
      }
    });

    it('should handle duplicate emails', async () => {
      const input = {
        email: 'duplicate@example.com',
        name: 'First User',
      };

      // Create first user
      const firstResult = await userEntity().create(input);
      expect(firstResult.success).toBe(true);

      // Try to create duplicate
      const secondResult = await userEntity().create({
        email: input.email,
        name: 'Second User',
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
      await userEntity().create({ email: 'user1@example.com', name: 'User 1' });
      await userEntity().create({ email: 'user2@example.com', name: 'User 2' });

      const result = await userEntity().findAll();

      expect(result.success).toBe(true);
      if (result.success) {
        // Check users are present (order might vary)
        const emails = result.data.map(u => u.email);
        expect(emails).toContain('user1@example.com');
        expect(emails).toContain('user2@example.com');
      }
    });

    it('should return empty array when no users exist', async () => {
      // Clear all users first
      const allUsers = await userEntity().findAll();
      if (allUsers.success) {
        for (const user of allUsers.data) {
          await userEntity().delete(user.id);
        }
      }

      const result = await userEntity().findAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const createResult = await userEntity().create({
        email: 'findme@example.com',
        name: 'Find Me',
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const result = await userEntity().findById(createResult.data.id);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toBeNull();
        expect(result.data?.email).toBe('findme@example.com');
        expect(result.data?.name).toBe('Find Me');
      }
    });

    it('should return null when user not found', async () => {
      const result = await userEntity().findById(
        '550e8400-e29b-41d4-a716-446655440000'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const createResult = await userEntity().create({
        email: 'update@example.com',
        name: 'Original Name',
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      // Small delay to ensure updatedAt timestamp differs
      await new Promise(resolve => setTimeout(resolve, 10));

      const updateResult = await userEntity().update(createResult.data.id, {
        name: 'Updated Name',
      });

      expect(updateResult.success).toBe(true);
      if (updateResult.success && updateResult.data) {
        expect(updateResult.data.email).toBe('update@example.com');
        expect(updateResult.data.name).toBe('Updated Name');
        expect(updateResult.data.updatedAt.getTime()).toBeGreaterThan(
          createResult.data.updatedAt.getTime()
        );
      }
    });

    it('should return null when updating non-existent user', async () => {
      const result = await userEntity().update(
        '550e8400-e29b-41d4-a716-446655440000',
        { name: 'New Name' }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe('delete', () => {
    it('should soft delete a user', async () => {
      const createResult = await userEntity().create({
        email: 'delete@example.com',
        name: 'Delete Me',
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const deleteResult = await userEntity().delete(createResult.data.id);

      expect(deleteResult.success).toBe(true);
      if (deleteResult.success) {
        expect(deleteResult.data).toBe(true);
      }

      // Verify user is soft deleted
      const findResult = await userEntity().findById(createResult.data.id);
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data).toBeNull(); // Soft deleted users are not returned
      }
    });

    it('should return false when deleting non-existent user', async () => {
      const result = await userEntity().delete(
        '550e8400-e29b-41d4-a716-446655440000'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });
  });
});