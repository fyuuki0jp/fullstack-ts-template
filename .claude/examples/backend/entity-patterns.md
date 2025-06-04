# バックエンド エンティティパターン

## Zodスキーマとbranded typesパターン

### 基本エンティティ定義

```typescript
// entities/user/schema.ts
import { z } from 'zod';

// Branded types for domain-specific IDs and values
export const UserIdSchema = z.string().uuid().brand<'UserId'>();
export type UserId = z.infer<typeof UserIdSchema>;

export const EmailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .brand<'Email'>();
export type Email = z.infer<typeof EmailSchema>;

export const UserNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters long')
  .max(100, 'Name must be 100 characters or less')
  .brand<'UserName'>();
export type UserName = z.infer<typeof UserNameSchema>;

// エンティティスキーマ
export const UserSchema = z.object({
  id: UserIdSchema,
  email: EmailSchema,
  name: UserNameSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});
export type User = z.infer<typeof UserSchema>;

// 作成用入力スキーマ
export const CreateUserInputSchema = z.object({
  email: EmailSchema,
  name: UserNameSchema,
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
```

### エンティティファクトリー（entity.ts）

```typescript
// entities/user/entity.ts
import { depend } from 'velona';
import { ok, err, isErr } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { DrizzleDb } from '../../shared/adapters/db';
import { usersTable } from './schema';
import {
  UserSchema,
  CreateUserInputSchema,
  UserIdSchema,
  type User,
  type CreateUserInput,
  type UserId,
} from './schema';

// ID生成ヘルパー
export const createUserId = (): Result<UserId, Error> => {
  try {
    const id = crypto.randomUUID();
    const result = UserIdSchema.safeParse(id);
    if (!result.success) {
      return err(new Error('Failed to generate valid user ID'));
    }
    return ok(result.data);
  } catch (error) {
    return err(new Error('Failed to generate user ID'));
  }
};

// バリデーションヘルパー
export const validateUser = (data: unknown): Result<User, Error> => {
  const result = UserSchema.safeParse(data);
  if (!result.success) {
    return err(new Error(`Invalid user data: ${result.error.message}`));
  }
  return ok(result.data);
};

export const validateCreateUserInput = (data: unknown): Result<CreateUserInput, Error> => {
  const result = CreateUserInputSchema.safeParse(data);
  if (!result.success) {
    return err(new Error(result.error.errors.map(e => e.message).join(', ')));
  }
  return ok(result.data);
};

// Entityパターンによるドメインロジック
export const UserEntity = depend({ db: {} as DrizzleDb }, ({ db }) => ({
  async create(input: CreateUserInput): Promise<Result<User, Error>> {
    try {
      // ID生成
      const idResult = createUserId();
      if (isErr(idResult)) {
        return idResult;
      }

      const now = new Date();

      // Drizzle ORMによるデータベース操作
      const [dbUser] = await db
        .insert(usersTable)
        .values({
          id: idResult.data,
          email: input.email,
          name: input.name,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        })
        .returning();

      // ドメインオブジェクトに変換
      const userResult = validateUser({
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
        deletedAt: dbUser.deletedAt,
      });

      if (isErr(userResult)) {
        return userResult;
      }

      return ok(userResult.data);
    } catch (error) {
      // 重複メールエラーの処理
      if (error.message.includes('unique constraint')) {
        return err(new Error('Email already exists'));
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
        .orderBy(desc(usersTable.createdAt));

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

        if (isErr(userResult)) {
          return err(new Error(`Invalid user data from database: ${userResult.error.message}`));
        }

        users.push(userResult.data);
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

      if (isErr(userResult)) {
        return err(new Error(`Invalid user data from database: ${userResult.error.message}`));
      }

      return ok(userResult.data);
    } catch (error) {
      return err(error as Error);
    }
  },
}));
```

## 重要なパターン

### 1. Branded Types
- UUID、Email、Name等にブランド型を使用
- コンパイル時に型の混在を防止
- ドメイン固有の制約を型レベルで表現

### 2. Zodスキーマファースト
- すべてのエンティティはZodスキーマから型を生成
- バリデーションロジックを一箇所に集約
- TypeScriptの型安全性とランタイムバリデーションを両立

### 3. Entityパターン
- ドメインロジックをエンティティに集約
- データベース操作とビジネスルールを分離
- Velona DIでテスタビリティを確保

### 4. エラーハンドリング
- すべての操作でResult型を使用
- 例外を投げずに明示的なエラーハンドリング
- ドメイン固有エラーメッセージ