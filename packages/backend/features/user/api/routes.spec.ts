import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import createUserRoutes from './routes';
import { MockDbAdapter } from '../../../shared/adapters/db/mock';

describe('User API Routes', () => {
  let app: Hono;
  let mockDb: MockDbAdapter;

  beforeEach(() => {
    mockDb = new MockDbAdapter();
    const userRoutes = createUserRoutes(mockDb);
    app = new Hono();
    app.route('/', userRoutes);
  });

  describe('GET /', () => {
    it('should return empty users list initially', async () => {
      const res = await app.request('/');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ users: [] });
    });

    it('should return all users when they exist', async () => {
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

      const res = await app.request('/');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users).toHaveLength(2);
      expect(data.users[0].email).toBe('user2@example.com');
      expect(data.users[1].email).toBe('user1@example.com');
    });

    it('should handle database errors gracefully', async () => {
      mockDb.mockFailure('Database connection failed');

      const res = await app.request('/');

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Database connection failed');
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

      // Verify user was stored in database
      const users = mockDb.getData('users');
      expect(users).toHaveLength(1);
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
      expect(data.error).toBe('Invalid email format');

      // Verify no user was stored
      const users = mockDb.getData('users');
      expect(users).toHaveLength(0);
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
      expect(data.error).toBe('Email and name are required');
    });

    it('should handle missing name field', async () => {
      const userData = {
        email: 'test@example.com',
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
      expect(data.error).toContain('name');
    });

    it('should handle duplicate email', async () => {
      // Create first user
      await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
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
          email: 'test@example.com',
          name: 'Second User',
        }),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain('UNIQUE constraint failed');
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

    it('should handle database errors during creation', async () => {
      mockDb.mockFailure('Database insert failed');

      const res = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
        }),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Database insert failed');
    });

    it('should trim whitespace from input', async () => {
      const userData = {
        email: '  test@example.com  ',
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
      expect(data.user.email).toBe('test@example.com');
      expect(data.user.name).toBe('Test User');
    });
  });
});
