import { Hono } from 'hono';
import { isErr } from '@fyuuki0jp/railway-result';
import { createUser } from '../commands/create-user';
import { getUsers } from '../queries/get-users';
import { userRepositoryImpl } from '../domain/user-repository-impl';
import type { DbAdapter } from '@/shared/adapters/db';

export default (db: DbAdapter) => {
  return new Hono()
    .get('/', async (c) => {
      const userRepository = userRepositoryImpl.inject({ db })();
      const getUsersUseCase = getUsers.inject({ userRepository })();
      const result = await getUsersUseCase();

      if (isErr(result)) {
        return c.json({ error: result.error.message }, 500);
      }

      return c.json({ users: result.data });
    })
    .post('/', async (c) => {
      const userRepository = userRepositoryImpl.inject({ db })();
      const createUserUseCase = createUser.inject({ userRepository })();

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
          result.error.message.includes('Execute failed')
            ? 500
            : 400;

        return c.json({ error: result.error.message }, statusCode);
      }

      return c.json({ user: result.data }, 201);
    });
};
