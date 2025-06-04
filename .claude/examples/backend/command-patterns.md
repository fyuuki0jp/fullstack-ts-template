# バックエンド コマンドパターン

## CQRS コマンドパターン（書き込み操作）

### 基本コマンド構造

```typescript
// features/user/commands/create-user.ts
import { depend } from 'velona';
import { isErr } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { DrizzleDb } from '../../../shared/adapters/db';
import { UserEntity, validateCreateUserInput, type User } from '../../../entities/user';

export const createUser = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (input: unknown): Promise<Result<User, Error>> => {
      // 1. 入力バリデーション（Zodを使用）
      const validationResult = validateCreateUserInput(input);
      if (isErr(validationResult)) {
        return validationResult;
      }

      // 2. エンティティを使用してビジネスロジック実行
      const userEntity = UserEntity.inject({ db })();
      return userEntity.create(validationResult.data);
    }
);
```

### 複雑なビジネスロジック例

```typescript
// features/order/commands/create-order.ts
import { depend } from 'velona';
import { ok, err, isErr } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';

export const createOrder = depend(
  { 
    db: {} as DrizzleDb,
    orderRepository: {} as OrderRepository,
    userRepository: {} as UserRepository,
    productRepository: {} as ProductRepository 
  },
  ({ db, orderRepository, userRepository, productRepository }) =>
    async (input: unknown): Promise<Result<Order, Error>> => {
      // 1. 入力バリデーション
      const validationResult = validateCreateOrderInput(input);
      if (isErr(validationResult)) {
        return validationResult;
      }

      const { userId, items } = validationResult.data;

      // 2. ユーザー存在確認
      const userResult = await userRepository.findById(userId);
      if (isErr(userResult)) {
        return userResult;
      }
      if (!userResult.data) {
        return err(new Error('User not found'));
      }

      // 3. 商品存在・在庫確認
      for (const item of items) {
        const productResult = await productRepository.findById(item.productId);
        if (isErr(productResult)) {
          return productResult;
        }
        if (!productResult.data) {
          return err(new Error(`Product not found: ${item.productId}`));
        }
        if (productResult.data.stock < item.quantity) {
          return err(new Error(`Insufficient stock for product: ${item.productId}`));
        }
      }

      // 4. トランザクション内で注文作成＋在庫更新
      return db.transaction(async (tx) => {
        // 注文作成
        const orderResult = await orderRepository.create(validationResult.data);
        if (isErr(orderResult)) {
          return orderResult;
        }

        // 在庫更新
        for (const item of items) {
          const updateResult = await productRepository.updateStock(
            item.productId, 
            -item.quantity
          );
          if (isErr(updateResult)) {
            return updateResult; // トランザクションロールバック
          }
        }

        return ok(orderResult.data);
      });
    }
);
```

### バリデーション付きコマンド

```typescript
// features/user/commands/update-user-profile.ts
export const updateUserProfile = depend(
  { userRepository: {} as UserRepository },
  ({ userRepository }) =>
    async (userId: unknown, input: unknown): Promise<Result<User, Error>> => {
      // 1. ID バリデーション
      const idValidation = UserIdSchema.safeParse(userId);
      if (!idValidation.success) {
        return err(new Error('Invalid user ID format'));
      }

      // 2. 入力バリデーション
      const inputValidation = validateUpdateUserInput(input);
      if (isErr(inputValidation)) {
        return inputValidation;
      }

      // 3. ユーザー存在確認
      const existingUserResult = await userRepository.findById(idValidation.data);
      if (isErr(existingUserResult)) {
        return existingUserResult;
      }
      if (!existingUserResult.data) {
        return err(new Error('User not found'));
      }

      // 4. ビジネスルール適用（例：メール変更時の重複チェック）
      const { email, name } = inputValidation.data;
      if (email && email !== existingUserResult.data.email) {
        const duplicateCheckResult = await userRepository.findByEmail(email);
        if (isErr(duplicateCheckResult)) {
          return duplicateCheckResult;
        }
        if (duplicateCheckResult.data) {
          return err(new Error('Email already exists'));
        }
      }

      // 5. 更新実行
      return userRepository.update(idValidation.data, inputValidation.data);
    }
);
```

## コマンドのテストパターン

### モックリポジトリを使用した単体テスト

```typescript
// features/user/commands/create-user.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createUser } from './create-user';
import { isErr, ok, err } from '@fyuuki0jp/railway-result';
import type { UserRepository } from '../domain/repository';

describe('createUser command', () => {
  let mockUserRepo: UserRepository;
  let createUserCmd: ReturnType<typeof createUser.inject>;

  beforeEach(() => {
    mockUserRepo = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
    };
    createUserCmd = createUser.inject({ userRepository: mockUserRepo });
  });

  it('should create a user with valid input', async () => {
    const input = {
      email: 'test@example.com',
      name: 'Test User',
    };
    const expected = { 
      id: '123', 
      ...input, 
      createdAt: new Date(), 
      updatedAt: new Date(),
      deletedAt: null 
    };
    
    vi.mocked(mockUserRepo.create).mockResolvedValue(ok(expected));

    const result = await createUserCmd()(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expected);
    }
    expect(mockUserRepo.create).toHaveBeenCalledWith(input);
  });

  it('should validate email format', async () => {
    const input = {
      email: 'invalid-email',
      name: 'Test User',
    };

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain('Please enter a valid email address');
    }
    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });

  it('should handle repository errors', async () => {
    const input = {
      email: 'test@example.com',
      name: 'Test User',
    };

    vi.mocked(mockUserRepo.create).mockResolvedValue(
      err(new Error('Database error'))
    );

    const result = await createUserCmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Database error');
    }
  });
});
```

## 重要なパターン

### 1. Railway-Oriented Programming
- すべてのコマンドは`Result<T, Error>`を返す
- 早期リターンでエラーハンドリング
- `isErr()`でエラーチェック

### 2. 入力バリデーション
- Zodスキーマによる型安全なバリデーション
- ビジネスルール検証
- 複数フィールドのクロスバリデーション

### 3. 依存性注入
- Velonaによるクリーンなテスタビリティ
- リポジトリパターンでデータアクセス抽象化
- モック注入による単体テスト

### 4. トランザクション管理
- 複数リポジトリ操作の原子性保証
- エラー時の自動ロールバック
- Drizzle ORMトランザクション活用