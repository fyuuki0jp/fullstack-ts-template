import { Hono } from 'hono';
import { isErr } from 'shared-result';
import { createUser } from '../commands/create-user';
import { getUsers } from '../queries/get-users';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';

export default (db: DrizzleDb) => {
  return new Hono()
    .get('/', async (c) => {
      const getUsersUseCase = getUsers.inject({ db })();
      const result = await getUsersUseCase();

      if (isErr(result)) {
        return c.json({ error: result.error.message }, 500);
      }

      return c.json({ users: result.value });
    })
    .post('/', async (c) => {
      const createUserUseCase = createUser.inject({ db })();

      let body;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
      }

      const result = await createUserUseCase(body);

      if (isErr(result)) {
        // Check if it's a database error or validation error
        const statusCode =
          result.error.message.includes('Database') ||
          result.error.message.includes('UNIQUE constraint') ||
          result.error.message.includes('Execute failed') ||
          result.error.message.includes('Email already exists')
            ? 500
            : 400;

        return c.json({ error: result.error.message }, statusCode);
      }

      return c.json({ user: result.value }, 201);
    });
};
