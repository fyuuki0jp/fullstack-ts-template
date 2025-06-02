import { depend } from 'velona';
import { ok, err, isErr } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { DbAdapter } from '../../../shared/adapters/db';
import {
  type User,
  type CreateUserInput,
  type UserId,
  validateUser,
  createUserId,
} from '../../../entities';

export const userRepositoryImpl = depend({ db: {} as DbAdapter }, ({ db }) => ({
  async create(user: CreateUserInput): Promise<Result<User, Error>> {
    const idResult = createUserId();
    if (isErr(idResult)) {
      return idResult;
    }

    const now = new Date();

    const userData: User = {
      id: idResult.data,
      email: user.email,
      name: user.name,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const result = await db.execute(
      `INSERT INTO users (id, email, name, created_at, updated_at, deleted_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userData.id,
        userData.email,
        userData.name,
        userData.createdAt.toISOString(),
        userData.updatedAt.toISOString(),
        userData.deletedAt?.toISOString() || null,
      ]
    );

    if (isErr(result)) {
      return err(result.error);
    }

    return ok(userData);
  },

  async findAll(): Promise<Result<User[], Error>> {
    const result = await db.query<{
      id: string;
      email: string;
      name: string;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
    }>(
      'SELECT id, email, name, created_at, updated_at, deleted_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );

    if (isErr(result)) {
      return err(result.error);
    }

    const users: User[] = [];
    for (const row of result.data) {
      const userResult = validateUser({
        id: row.id,
        email: row.email,
        name: row.name,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
      });
      
      if (isErr(userResult)) {
        return err(
          new Error(
            `Invalid user data from database for id: ${row.id} - ${userResult.error.message}`
          )
        );
      }

      users.push(userResult.data);
    }

    return ok(users);
  },

  async findById(id: UserId): Promise<Result<User | null, Error>> {
    const result = await db.query<{
      id: string;
      email: string;
      name: string;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
    }>(
      'SELECT id, email, name, created_at, updated_at, deleted_at FROM users WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    if (isErr(result)) {
      return err(result.error);
    }

    if (result.data.length === 0) {
      return ok(null);
    }

    const row = result.data[0];
    const userResult = validateUser({
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    });

    if (isErr(userResult)) {
      return err(
        new Error(
          `Invalid user data from database for id: ${row.id} - ${userResult.error.message}`
        )
      );
    }

    return ok(userResult.data);
  },
}));
