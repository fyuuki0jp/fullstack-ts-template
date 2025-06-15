import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isErr } from 'result';
import type { PGlite } from '@electric-sql/pglite';
import { setupTestDatabase } from '../../../shared/adapters/db';
import type { DrizzleDb } from '../../../shared/adapters/db';
import { createUser } from './create-user';

describe('createUser', () => {
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

  it('should create a new user with valid input', async () => {
    const input = {
      email: 'test@example.com',
      name: 'Test User',
    };

    const createUserFn = createUser.inject({ db })();
    const result = await createUserFn(input);

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

  it('should reject invalid input', async () => {
    const invalidInput = {
      email: 'invalid-email',
      name: '',
    };

    const createUserFn = createUser.inject({ db })();
    const result = await createUserFn(invalidInput);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain('Invalid email address');
    }
  });

  it('should apply business rule validation', async () => {
    // Currently no business rules implemented, so this test passes
    const input = {
      email: 'business@example.com',
      name: 'Business Test User',
    };

    const createUserFn = createUser.inject({ db })();
    const result = await createUserFn(input);

    // Since no business rules are implemented yet, this should succeed
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe('business@example.com');
      expect(result.value.name).toBe('Business Test User');
    }
  });

  it('should handle database errors gracefully', async () => {
    // First create a user
    const input = {
      email: 'duplicate@example.com',
      name: 'Duplicate User',
    };

    const createUserFn = createUser.inject({ db })();
    const firstResult = await createUserFn(input);
    expect(firstResult.ok).toBe(true);

    // Try to create the same email again (should fail)
    const duplicateResult = await createUserFn(input);
    expect(isErr(duplicateResult)).toBe(true);
    if (isErr(duplicateResult)) {
      expect(duplicateResult.error.message).toContain('Email already exists');
    }
  });
});
