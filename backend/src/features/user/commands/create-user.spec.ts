import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createUser } from './create-user';
import { isErr } from '@fyuuki0jp/railway-result';
import { setupTestDatabase } from '../../../shared/adapters/db/pglite';
import type { PGlite } from '@electric-sql/pglite';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';

describe('createUser command', () => {
  let client: PGlite;
  let db: DrizzleDb;
  let createUserCmd: ReturnType<typeof createUser.inject>;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    client = setup.client;
    db = setup.db;
    createUserCmd = createUser.inject({ db });
  });

  afterAll(async () => {
    await client.close();
  });

  it('should create a user with valid input', async () => {
    const input = {
      email: 'test@example.com',
      name: 'Test User',
    };

    const result = await createUserCmd()(input);

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

  it('should validate email format', async () => {
    const input = {
      email: 'invalid-email',
      name: 'Test User',
    };

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain('Invalid email format');
    }
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
  });

  it('should validate email with multiple @ symbols', async () => {
    const input = {
      email: 'test@@example.com',
      name: 'Test User',
    };

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain('Invalid email format');
    }
  });

  it('should accept valid email formats', async () => {
    const validEmails = [
      'user@example.com',
      'user.name@example.com',
      'user+tag@example.co.uk',
      'user123@test-domain.com',
    ];

    for (const email of validEmails) {
      const result = await createUserCmd()({ email, name: 'Test User' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe(email);
        expect(result.data.name).toBe('Test User');
      }
    }
  });

  it('should handle duplicate email addresses', async () => {
    const input = {
      email: 'duplicate@example.com',
      name: 'First User',
    };

    // Create first user
    const firstResult = await createUserCmd()(input);
    expect(firstResult.success).toBe(true);

    // Try to create user with same email
    const secondResult = await createUserCmd()({
      email: input.email,
      name: 'Second User',
    });

    expect(isErr(secondResult)).toBe(true);
    if (isErr(secondResult)) {
      expect(secondResult.error.message).toContain('already exists');
    }
  });

  it('should trim whitespace from input', async () => {
    const input = {
      email: '  test-trim@example.com  ',
      name: '  Test User  ',
    };

    const result = await createUserCmd()(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test-trim@example.com');
      expect(result.data.name).toBe('Test User');
    }
  });

  it('should validate empty name', async () => {
    const input = {
      email: 'test@example.com',
      name: '',
    };

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain('Name is required');
    }
  });

  it('should validate name length', async () => {
    const input = {
      email: 'test@example.com',
      name: 'a'.repeat(101), // 101 characters
    };

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain(
        'Name must be 100 characters or less'
      );
    }
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
  });
});
