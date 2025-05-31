import { depend } from 'velona';
import { ok, err, isErr } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { DbAdapter } from '../../../shared/adapters/db';
import type { User } from '../../../entities';

export const userRepositoryImpl = depend({ db: {} as DbAdapter }, ({ db }) => ({
  async create(
    user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<User, Error>> {
    const id = globalThis.crypto.randomUUID();
    const now = new Date();
    const userData: User = {
      id,
      ...user,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.execute(
      `INSERT INTO users (id, email, name, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?)`,
      [
        userData.id,
        userData.email,
        userData.name,
        userData.createdAt.toISOString(),
        userData.updatedAt.toISOString(),
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
    }>(
      'SELECT id, email, name, created_at, updated_at FROM users ORDER BY created_at DESC'
    );

    if (isErr(result)) {
      return err(result.error);
    }

    const users = result.data.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    return ok(users);
  },

  async findById(id: string): Promise<Result<User | null, Error>> {
    const result = await db.query<{
      id: string;
      email: string;
      name: string;
      created_at: string;
      updated_at: string;
    }>(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (isErr(result)) {
      return err(result.error);
    }

    if (result.data.length === 0) {
      return ok(null);
    }

    const row = result.data[0];
    const user: User = {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    return ok(user);
  },
}));
