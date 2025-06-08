import { depend } from 'velona';
import { eq, isNull, and } from 'drizzle-orm';
import { ok, err, type Result } from 'result';
import {
  usersTable,
  userSelectSchema,
  userInsertSchema,
  userUpdateSchema,
  UserIdSchema,
  type User,
  type CreateUserInput,
  type UpdateUserInput,
  type UserId,
} from './schema';
import type { DrizzleDb } from '../../shared/adapters/db/pglite';

// ID Generation helper
export const createUserId = (): Result<UserId, Error> => {
  const result = UserIdSchema.safeParse(globalThis.crypto.randomUUID());
  if (!result.success) {
    return err(new Error('Failed to generate UserId'));
  }
  return ok(result.data);
};

// ドメイン固有のバリデーション関数（Drizzle-Zod自動生成スキーマを使用）
export const validateUser = (data: unknown): Result<User, Error> => {
  const result = userSelectSchema.safeParse(data);
  if (!result.success) {
    const errorMessage = result.error.issues
      .map((issue) => issue.message)
      .join(', ');
    return err(new Error(`User validation failed: ${errorMessage}`));
  }
  return ok(result.data);
};

export const validateCreateUserInput = (
  data: unknown
): Result<CreateUserInput, Error> => {
  const result = userInsertSchema.safeParse(data);
  if (!result.success) {
    const errorMessage = result.error.issues
      .map((issue) => issue.message)
      .join(', ');
    return err(
      new Error(`Create user input validation failed: ${errorMessage}`)
    );
  }
  return ok(result.data);
};

export const validateUpdateUserInput = (
  data: unknown
): Result<UpdateUserInput, Error> => {
  const result = userUpdateSchema.safeParse(data);
  if (!result.success) {
    const errorMessage = result.error.issues
      .map((issue) => issue.message)
      .join(', ');
    return err(
      new Error(`Update user input validation failed: ${errorMessage}`)
    );
  }
  return ok(result.data);
};

// Entity操作（DIパターン with Drizzle）
export const UserEntity = depend({ db: {} as DrizzleDb }, ({ db }) => ({
  async create(input: CreateUserInput): Promise<Result<User, Error>> {
    try {
      const validationResult = userInsertSchema.safeParse(input);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues
          .map((issue) => issue.message)
          .join(', ');
        return err(new Error(`Validation failed: ${errorMessage}`));
      }

      // Generate UserId
      const idResult = createUserId();
      if (!idResult.ok) {
        return err(idResult.error);
      }

      const now = new Date();
      const userData = {
        id: idResult.value,
        email: validationResult.data.email,
        name: validationResult.data.name,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      const [dbUser] = await db
        .insert(usersTable)
        .values({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          deletedAt: userData.deletedAt,
        })
        .returning();

      // Validate the returned data from DB
      const userResult = validateUser({
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
        deletedAt: dbUser.deletedAt,
      });

      if (!userResult.ok) {
        return err(userResult.error);
      }

      return ok(userResult.value);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('unique constraint') ||
          error.message.includes('UNIQUE') ||
          error.message.includes('duplicate key')
        ) {
          return err(new Error('Email already exists'));
        }
        // PGLiteのエラーメッセージを整形
        if (error.message.includes('Failed query:')) {
          return err(new Error(`Database error: Email already exists`));
        }
      }
      return err(error as Error);
    }
  },

  async findAll(): Promise<Result<User[], Error>> {
    try {
      const dbUsers = await db
        .select()
        .from(usersTable)
        .where(isNull(usersTable.deletedAt))
        .orderBy(usersTable.createdAt, usersTable.id);

      const users: User[] = [];
      for (const dbUser of dbUsers) {
        const userResult = validateUser({
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
          deletedAt: dbUser.deletedAt,
        });

        if (!userResult.ok) {
          return err(
            new Error(
              `Invalid user data from database for id: ${dbUser.id} - ${userResult.error.message}`
            )
          );
        }

        users.push(userResult.value);
      }

      return ok(users);
    } catch (error) {
      return err(error as Error);
    }
  },

  async findById(id: UserId): Promise<Result<User | null, Error>> {
    try {
      const [dbUser] = await db
        .select()
        .from(usersTable)
        .where(and(eq(usersTable.id, id), isNull(usersTable.deletedAt)))
        .limit(1);

      if (!dbUser) {
        return ok(null);
      }

      const userResult = validateUser({
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
        deletedAt: dbUser.deletedAt,
      });

      if (!userResult.ok) {
        return err(
          new Error(
            `Invalid user data from database for id: ${dbUser.id} - ${userResult.error.message}`
          )
        );
      }

      return ok(userResult.value);
    } catch (error) {
      return err(error as Error);
    }
  },

  async update(
    id: UserId,
    input: UpdateUserInput
  ): Promise<Result<User | null, Error>> {
    try {
      const validationResult = userUpdateSchema.safeParse(input);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues
          .map((issue) => issue.message)
          .join(', ');
        return err(new Error(`Validation failed: ${errorMessage}`));
      }

      const [dbUser] = await db
        .update(usersTable)
        .set({
          ...validationResult.data,
          updatedAt: new Date(),
        })
        .where(and(eq(usersTable.id, id), isNull(usersTable.deletedAt)))
        .returning();

      if (!dbUser) {
        return ok(null);
      }

      const userResult = validateUser({
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
        deletedAt: dbUser.deletedAt,
      });

      if (!userResult.ok) {
        return err(userResult.error);
      }

      return ok(userResult.value);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('unique constraint') ||
          error.message.includes('UNIQUE') ||
          error.message.includes('duplicate key')
        ) {
          return err(new Error('Email already exists'));
        }
        // PGLiteのエラーメッセージを整形
        if (error.message.includes('Failed query:')) {
          return err(new Error(`Database error: Email already exists`));
        }
      }
      return err(error as Error);
    }
  },

  async delete(id: UserId): Promise<Result<boolean, Error>> {
    try {
      const result = await db
        .update(usersTable)
        .set({ deletedAt: new Date() })
        .where(and(eq(usersTable.id, id), isNull(usersTable.deletedAt)))
        .returning({ id: usersTable.id });

      return ok(result.length > 0);
    } catch (error) {
      return err(error as Error);
    }
  },

  // ドメインロジック
  isActive(user: User): boolean {
    return user.deletedAt === null;
  },

  canUpdate(user: User, currentUserId: UserId): boolean {
    // ビジネスルール例：自分自身または管理者のみ更新可能
    return user.id === currentUserId; // 実際の実装では権限チェックを追加
  },
}));
