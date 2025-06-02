import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createUser } from './create-user';
import { isErr, ok, err } from '@fyuuki0jp/railway-result';
import type { UserRepository } from '../domain/repository';
import type { User } from '../../../entities';

describe('createUser command', () => {
  let mockUserRepo: UserRepository;
  let createUserCmd: ReturnType<typeof createUser.inject>;

  beforeEach(() => {
    mockUserRepo = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
    };
    createUserCmd = createUser.inject({ userRepository: mockUserRepo });
  });

  it('should create a user with valid input', async () => {
    const input = {
      email: 'test@example.com',
      name: 'Test User',
    };
    const createdUser: User = {
      id: '123',
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockUserRepo.create).mockResolvedValue(ok(createdUser));

    const result = await createUserCmd()(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(createdUser);
    }
    expect(mockUserRepo.create).toHaveBeenCalledWith(input);
  });

  it('should validate email format', async () => {
    const input = {
      email: 'invalid-email',
      name: 'Test User',
    };

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Invalid email format');
    }
    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });

  it('should validate empty email', async () => {
    const input = {
      email: '',
      name: 'Test User',
    };

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain('Email is required');
    }
    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });

  it('should validate email with multiple @ symbols', async () => {
    const input = {
      email: 'test@@example.com',
      name: 'Test User',
    };

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Invalid email format');
    }
    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });

  it('should accept valid email formats', async () => {
    const validEmails = [
      'user@example.com',
      'user.name@example.com',
      'user+tag@example.co.uk',
      'user123@test-domain.com',
    ];

    for (const email of validEmails) {
      vi.mocked(mockUserRepo.create).mockResolvedValue(
        ok({
          id: '123',
          email,
          name: 'Test User',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      const result = await createUserCmd()({ email, name: 'Test User' });

      expect(result.success).toBe(true);
      expect(mockUserRepo.create).toHaveBeenCalledWith({
        email,
        name: 'Test User',
      });
    }
  });

  it('should handle repository errors', async () => {
    const input = {
      email: 'test@example.com',
      name: 'Test User',
    };

    vi.mocked(mockUserRepo.create).mockResolvedValue(
      err(new Error('Database error'))
    );

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Database error');
    }
  });

  it('should handle unique constraint violations', async () => {
    const input = {
      email: 'existing@example.com',
      name: 'New User',
    };

    vi.mocked(mockUserRepo.create).mockResolvedValue(
      err(new Error('UNIQUE constraint failed: users.email'))
    );

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe(
        'UNIQUE constraint failed: users.email'
      );
    }
  });

  it('should trim whitespace from input', async () => {
    const input = {
      email: '  test@example.com  ',
      name: '  Test User  ',
    };

    const expectedUser: User = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockUserRepo.create).mockResolvedValue(ok(expectedUser));

    const result = await createUserCmd()(input);

    expect(result.success).toBe(true);
    expect(mockUserRepo.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      name: 'Test User',
    });
  });

  it('should validate empty name', async () => {
    const input = {
      email: 'test@example.com',
      name: '',
    };

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Name is required');
    }
    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });

  it('should validate name length', async () => {
    const input = {
      email: 'test@example.com',
      name: 'a'.repeat(101), // 101 characters
    };

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Name must be 100 characters or less');
    }
    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });

  it('should handle multiple validation errors', async () => {
    const input = {
      email: 'invalid-email',
      name: '',
    };

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain('Invalid email format');
      expect(result.error.message).toContain('Name is required');
    }
    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });

  it('should handle invalid input types', async () => {
    const input = {
      email: 123,
      name: true,
    };

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain('Expected string');
    }
    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });
});
