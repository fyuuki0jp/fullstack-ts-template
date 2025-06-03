import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUsers } from './get-users';
import { ok, err, isErr } from '@fyuuki0jp/railway-result';
import type { UserRepository } from '../domain/repository';
import type { User, UserId, Email, UserName } from '../../../entities';

describe('getUsers query', () => {
  let mockUserRepo: UserRepository;
  let getUsersQuery: ReturnType<typeof getUsers.inject>;

  beforeEach(() => {
    mockUserRepo = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
    };
    getUsersQuery = getUsers.inject({ userRepository: mockUserRepo });
  });

  it('should return all users from repository', async () => {
    const users: User[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001' as UserId,
        email: 'user1@example.com' as Email,
        name: 'User 1' as UserName,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        deletedAt: null,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002' as UserId,
        email: 'user2@example.com' as Email,
        name: 'User 2' as UserName,
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02'),
        deletedAt: null,
      },
    ];

    vi.mocked(mockUserRepo.findAll).mockResolvedValue(ok(users));

    const result = await getUsersQuery()();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(users);
      expect(result.data).toHaveLength(2);
    }
    expect(mockUserRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when no users exist', async () => {
    vi.mocked(mockUserRepo.findAll).mockResolvedValue(ok([]));

    const result = await getUsersQuery()();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
      expect(result.data).toHaveLength(0);
    }
    expect(mockUserRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('should pass through repository errors', async () => {
    vi.mocked(mockUserRepo.findAll).mockResolvedValue(
      err(new Error('Database connection failed'))
    );

    const result = await getUsersQuery()();

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Database connection failed');
    }
    expect(mockUserRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('should not modify the returned users', async () => {
    const users: User[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440003' as UserId,
        email: 'user1@example.com' as Email,
        name: 'User 1' as UserName,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        deletedAt: null,
      },
    ];

    vi.mocked(mockUserRepo.findAll).mockResolvedValue(ok(users));

    const result = await getUsersQuery()();

    expect(result.success).toBe(true);
    if (result.success) {
      // Should return the same reference (no cloning/modification)
      expect(result.data).toBe(users);
    }
  });

  it('should be a pure query with no side effects', async () => {
    const users: User[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440004' as UserId,
        email: 'user@example.com' as Email,
        name: 'User' as UserName,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];

    vi.mocked(mockUserRepo.findAll).mockResolvedValue(ok(users));

    // Call multiple times
    const result1 = await getUsersQuery()();
    const result2 = await getUsersQuery()();
    const result3 = await getUsersQuery()();

    // Each call should return the same result
    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);

    // Repository should be called for each query
    expect(mockUserRepo.findAll).toHaveBeenCalledTimes(3);
  });
});
