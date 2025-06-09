import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// import { testClient } from 'hono/testing';
import type { PGlite } from '@electric-sql/pglite';
import { setupTestDatabase } from '../../../shared/adapters/db/pglite';
import type { DrizzleDb } from '../../../shared/adapters/db';
import { createUserRoutes } from './routes';

describe('User API Routes', () => {
  let client: PGlite;
  let db: DrizzleDb;
  let app: ReturnType<typeof createUserRoutes>;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    client = setup.client;
    db = setup.db;
    app = createUserRoutes(db);
  });

  afterAll(async () => {
    await client.close();
  });

  describe('GET /users', () => {
    it('should return users list', async () => {
      const res = await app.request('/');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('users');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.users)).toBe(true);
    });

    it('should handle query parameters', async () => {
      const res = await app.request('/?page=1&limit=10');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('users');
      expect(data).toHaveProperty('total');
    });
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty('user');
      // TODO: Add assertions for created user fields
    });

    it('should handle validation errors', async () => {
      const invalidUserData = {
        email: 'invalid-email',
        name: '',
      };

      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidUserData),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by ID', async () => {
      // First create a user
      const userData = {
        email: 'test2@example.com',
        name: 'Test User 2',
      };

      const createRes = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      expect(createRes.status).toBe(201);
      const createdUser = await createRes.json();

      // Then get it by ID
      const res = await app.request(`/${createdUser.user.id}`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('user');
      expect(data.user.id).toBe(createdUser.user.id);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await app.request('/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should handle invalid ID format', async () => {
      const res = await app.request('/invalid-id');

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });
});
