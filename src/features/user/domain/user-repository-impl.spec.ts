import { describe, it, expect, beforeEach } from 'vitest';
import { userRepositoryImpl } from './user-repository-impl';
import { MockDbAdapter } from '../../../shared/adapters/db/mock';
import { isErr } from '@fyuuki0jp/railway-result';

describe('UserRepositoryImpl', () => {
  let mockDb: MockDbAdapter;
  let userRepo: ReturnType<ReturnType<typeof userRepositoryImpl.inject>>;

  beforeEach(() => {
    mockDb = new MockDbAdapter();
    // Initialize empty users table
    mockDb.setData('users', []);
    userRepo = userRepositoryImpl.inject({ db: mockDb })();
  });

  describe('findAll', () => {
    it('should return all users sorted by updatedAt DESC', async () => {
      const users = [
        {
          id: '1',
          email: 'user1@example.com',
          name: 'User 1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          email: 'user2@example.com',
          name: 'User 2',
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
        },
      ];
      mockDb.setData('users', users);

      const result = await userRepo.findAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].id).toBe('2'); // Should be sorted by updatedAt DESC
        expect(result.data[0].email).toBe('user2@example.com');
        expect(result.data[0].createdAt).toBeInstanceOf(Date);
        expect(result.data[0].updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should return empty array when no users exist', async () => {
      const result = await userRepo.findAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('should handle database errors', async () => {
      mockDb.mockFailure('Database connection failed');

      const result = await userRepo.findAll();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Database connection failed');
      }
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      mockDb.setData('users', [user]);

      const result = await userRepo.findById('1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toBeNull();
        expect(result.data?.email).toBe('test@example.com');
        expect(result.data?.name).toBe('Test User');
      }
    });

    it('should return null when user not found', async () => {
      mockDb.setData('users', []);

      const result = await userRepo.findById('notfound');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should handle database errors', async () => {
      mockDb.mockFailure('Query failed');

      const result = await userRepo.findById('1');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Query failed');
      }
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const input = {
        email: 'new@example.com',
        name: 'New User',
      };

      const result = await userRepo.create(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('new@example.com');
        expect(result.data.name).toBe('New User');
        expect(result.data.id).toBeTruthy();
        expect(result.data.createdAt).toBeInstanceOf(Date);
        expect(result.data.updatedAt).toBeInstanceOf(Date);
      }

      // Verify user was added to database
      const users = mockDb.getData('users') as unknown[];
      expect(users).toHaveLength(1);
      expect((users[0] as { email: string }).email).toBe('new@example.com');
    });

    it('should handle database errors during insert', async () => {
      mockDb.mockFailure('Insert failed');

      const result = await userRepo.create({
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Insert failed');
      }
    });

    it('should handle unique constraint violations', async () => {
      // Add existing user
      mockDb.setData('users', [
        {
          id: '1',
          email: 'existing@example.com',
          name: 'Existing User',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ]);

      const result = await userRepo.create({
        email: 'existing@example.com',
        name: 'Another User',
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('UNIQUE constraint failed');
      }
    });
  });

  describe('transformToEntity', () => {
    it('should transform database row to User entity', async () => {
      const dbRow = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        created_at: '2023-01-01T12:00:00Z',
        updated_at: '2023-01-02T14:30:00Z',
      };
      mockDb.setData('users', [dbRow]);

      const result = await userRepo.findById('123');

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        const user = result.data;
        expect(user.id).toBe('123');
        expect(user.email).toBe('test@example.com');
        expect(user.name).toBe('Test User');
        expect(user.createdAt).toBeInstanceOf(Date);
        expect(user.updatedAt).toBeInstanceOf(Date);
        expect(user.createdAt.toISOString()).toBe('2023-01-01T12:00:00.000Z');
        expect(user.updatedAt.toISOString()).toBe('2023-01-02T14:30:00.000Z');
      }
    });
  });
});
