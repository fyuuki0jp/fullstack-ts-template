import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import createUserRoutes from './routes';
import { setupTestDatabase } from '../../../shared/adapters/db/pglite';
import type { PGlite } from '@electric-sql/pglite';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';

describe('User API Routes', () => {
  let app: Hono;
  let client: PGlite;
  let db: DrizzleDb;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    client = setup.client;
    db = setup.db;
    const userRoutes = createUserRoutes(db);
    app = new Hono();
    app.route('/', userRoutes);
  });

  afterAll(async () => {
    await client.close();
  });

  describe('GET /', () => {
    it('should return empty users list initially', async () => {
      // Create isolated test instance
      const isolatedSetup = await setupTestDatabase();
      const isolatedRoutes = createUserRoutes(isolatedSetup.db);
      const isolatedApp = new Hono();
      isolatedApp.route('/', isolatedRoutes);

      const res = await isolatedApp.request('/');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ users: [] });

      await isolatedSetup.client.close();
    });

    it('should return all users when they exist', async () => {
      // Create test users first
      await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user1@example.com', name: 'User 1' }),
      });
      await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user2@example.com', name: 'User 2' }),
      });

      const res = await app.request('/');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users.length).toBeGreaterThanOrEqual(2);
      
      // Check users are present (order might vary)
      const emails = data.users.map((u: any) => u.email);
      expect(emails).toContain('user1@example.com');
      expect(emails).toContain('user2@example.com');
    });
  });

  describe('POST /', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const res = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user.email).toBe('test@example.com');
      expect(data.user.name).toBe('Test User');
      expect(data.user.id).toBeTruthy();
      expect(data.user.createdAt).toBeTruthy();
      expect(data.user.updatedAt).toBeTruthy();
      expect(data.user.deletedAt).toBeNull();
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        name: 'Test User',
      };

      const res = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid email format');
    });

    it('should handle missing email field', async () => {
      const userData = {
        name: 'Test User',
      };

      const res = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Required');
    });

    it('should handle missing name field', async () => {
      const userData = {
        email: 'test-missing-name@example.com',
      };

      const res = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Required');
    });

    it('should handle duplicate email', async () => {
      // Create first user
      await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test-duplicate@example.com',
          name: 'First User',
        }),
      });

      // Try to create duplicate
      const res = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test-duplicate@example.com',
          name: 'Second User',
        }),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain('already exists');
    });

    it('should handle invalid JSON', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid JSON');
    });

    it('should trim whitespace from input', async () => {
      const userData = {
        email: '  test-trim-route@example.com  ',
        name: '  Test User  ',
      };

      const res = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user.email).toBe('test-trim-route@example.com');
      expect(data.user.name).toBe('Test User');
    });

    it('should validate name length', async () => {
      const userData = {
        email: 'test-name-length@example.com',
        name: 'a'.repeat(101), // 101 characters
      };

      const res = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('100 characters or less');
    });

    it('should handle multiple validation errors', async () => {
      const userData = {
        email: 'invalid-email',
        name: '',
      };

      const res = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid email format');
      expect(data.error).toContain('Name is required');
    });
  });
});