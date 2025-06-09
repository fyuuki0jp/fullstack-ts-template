import { depend } from 'velona';
import { eq, isNull, and } from 'drizzle-orm';
import { ok, err, isErr, type Result } from 'result';
import {
  usersTable,
  validateUserData,
  createUserId,
  type User,
  type CreateUserInput,
  type UpdateUserInput,
  type UserId,
} from './schema';
import type { DrizzleDb } from '@/shared/adapters/db/pglite';

// Pure CRUD operations (no business logic)
export const insertUser = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (data: CreateUserInput): Promise<Result<User, Error>> => {
      try {
        const idResult = createUserId();
        if (isErr(idResult)) {
          return idResult;
        }
        const id = idResult.value;
        const now = new Date();

        const [dbUser] = await db
          .insert(usersTable)
          .values({
            id,
            email: data.email,
            name: data.name,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          })
          .returning();

        // Validate returned data structure
        const userResult = validateUserData({
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
          deletedAt: dbUser.deletedAt,
        });

        if (isErr(userResult)) {
          return err(new Error('Invalid user data returned from database'));
        }

        return ok(userResult.value);
      } catch (error) {
        if (error instanceof Error) {
          return err(error);
        }
        return err(new Error('Database error occurred'));
      }
    }
);

export const selectUserById = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (id: UserId): Promise<Result<User | null, Error>> => {
      try {
        const [dbUser] = await db
          .select()
          .from(usersTable)
          .where(and(eq(usersTable.id, id), isNull(usersTable.deletedAt)))
          .limit(1);

        if (!dbUser) {
          return ok(null);
        }

        const userResult = validateUserData({
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
          deletedAt: dbUser.deletedAt,
        });

        if (isErr(userResult)) {
          return err(new Error('Invalid user data from database'));
        }

        return ok(userResult.value);
      } catch (error) {
        if (error instanceof Error) {
          return err(error);
        }
        return err(new Error('Database error occurred'));
      }
    }
);

export const selectActiveUsers = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (): Promise<Result<User[], Error>> => {
      try {
        const dbUsers = await db
          .select()
          .from(usersTable)
          .where(isNull(usersTable.deletedAt))
          .orderBy(usersTable.createdAt, usersTable.id);

        const users: User[] = [];
        for (const dbUser of dbUsers) {
          const userResult = validateUserData({
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            createdAt: dbUser.createdAt,
            updatedAt: dbUser.updatedAt,
            deletedAt: dbUser.deletedAt,
          });

          if (isErr(userResult)) {
            return err(
              new Error(`Invalid user data from database for id: ${dbUser.id}`)
            );
          }

          users.push(userResult.value);
        }

        return ok(users);
      } catch (error) {
        if (error instanceof Error) {
          return err(error);
        }
        return err(new Error('Database error occurred'));
      }
    }
);

export const updateUser = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (
      id: UserId,
      data: UpdateUserInput
    ): Promise<Result<User | null, Error>> => {
      try {
        const [dbUser] = await db
          .update(usersTable)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(and(eq(usersTable.id, id), isNull(usersTable.deletedAt)))
          .returning();

        if (!dbUser) {
          return ok(null);
        }

        const userResult = validateUserData({
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
          deletedAt: dbUser.deletedAt,
        });

        if (isErr(userResult)) {
          return err(new Error('Invalid user data returned from database'));
        }

        return ok(userResult.value);
      } catch (error) {
        if (error instanceof Error) {
          return err(error);
        }
        return err(new Error('Database error occurred'));
      }
    }
);

export const deleteUser = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (id: UserId): Promise<Result<boolean, Error>> => {
      try {
        const result = await db
          .update(usersTable)
          .set({ deletedAt: new Date() })
          .where(and(eq(usersTable.id, id), isNull(usersTable.deletedAt)))
          .returning({ id: usersTable.id });

        return ok(result.length > 0);
      } catch (error) {
        if (error instanceof Error) {
          return err(error);
        }
        return err(new Error('Database error occurred'));
      }
    }
);
