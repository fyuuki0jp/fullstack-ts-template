import { Hono } from 'hono';
import { isErr } from 'result';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';
import { createUser } from '../commands/create-user';
import { getUsers, getUserById } from '../queries/get-users';
import { ValidationError, ConflictError } from '../domain/errors';

export function createUserRoutes(db: DrizzleDb) {
  const app = new Hono();

  // GET /users - List users with filtering and pagination
  return app
    .get('/', async (c) => {
      const queryParams = c.req.query();

      const getUsersFn = getUsers.inject({ db })();
      const result = await getUsersFn(queryParams);

      if (isErr(result)) {
        if (result.error instanceof ValidationError) {
          return c.json({ error: result.error.message }, 400);
        }
        if (result.error instanceof ConflictError) {
          return c.json({ error: result.error.message }, 409);
        }
        // Default to 500 for other errors (DatabaseError, etc.)
        return c.json({ error: result.error.message }, 500);
      }

      return c.json({
        users: result.value.users,
        total: result.value.total,
      });
    })
    .get('/:id', async (c) => {
      // GET /users/:id - Get user by ID
      const id = c.req.param('id');

      const getUserByIdFn = getUserById.inject({ db })();
      const result = await getUserByIdFn(id);

      if (isErr(result)) {
        if (result.error instanceof ValidationError) {
          return c.json({ error: result.error.message }, 400);
        }
        if (result.error instanceof ConflictError) {
          return c.json({ error: result.error.message }, 409);
        }
        // Default to 500 for other errors (DatabaseError, etc.)
        return c.json({ error: result.error.message }, 500);
      }

      if (result.value === null) {
        return c.json({ error: 'User not found' }, 404);
      }

      return c.json({ user: result.value });
    })
    .post('/', async (c) => {
      // POST /users - Create new user
      const body = await c.req.json();

      const createUserFn = createUser.inject({ db })();
      const result = await createUserFn(body);

      if (isErr(result)) {
        if (result.error instanceof ValidationError) {
          return c.json({ error: result.error.message }, 400);
        }
        if (result.error instanceof ConflictError) {
          return c.json({ error: result.error.message }, 409);
        }
        // Default to 500 for other errors (DatabaseError, etc.)
        return c.json({ error: result.error.message }, 500);
      }

      return c.json({ user: result.value }, 201);
    });

  // TODO: Add additional routes
  // PUT /users/:id - Update user
  // DELETE /users/:id - Delete user
}
