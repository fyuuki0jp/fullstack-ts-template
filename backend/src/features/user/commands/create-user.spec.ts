import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createUser } from './create-user';
import { isErr } from 'result';
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

  it('should validate email format', async () => {
    const input = {
      email: 'invalid-email',
      name: 'Test User',
    };

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain(
        'Please enter a valid email address'
      );
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
      expect(result.error.message).toContain(
        'Please enter a valid email address'
      );
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

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.email).toBe(email);
        expect(result.value.name).toBe('Test User');
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
    expect(firstResult.ok).toBe(true);

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

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe('test-trim@example.com');
      expect(result.value.name).toBe('Test User');
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
      expect(result.error.message).toContain(
        'Name must be at least 2 characters long'
      );
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
      expect(result.error.message).toContain(
        'Please enter a valid email address'
      );
      expect(result.error.message).toContain(
        'Name must be at least 2 characters long'
      );
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
