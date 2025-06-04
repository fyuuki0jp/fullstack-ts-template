# バックエンド クエリパターン

## CQRS クエリパターン（読み込み操作）

### 基本クエリ構造

```typescript
// features/user/queries/get-users.ts
import { depend } from 'velona';
import type { Result } from '@fyuuki0jp/railway-result';
import type { User } from '../../../entities/user';
import type { UserRepository } from '../domain/repository';

export const getUsers = depend(
  { userRepository: {} as UserRepository },
  ({ userRepository }) => 
    async (): Promise<Result<User[], Error>> => {
      return userRepository.findAll();
    }
);
```

### パラメータ付きクエリ

```typescript
// features/user/queries/get-user-by-id.ts
import { depend } from 'velona';
import { err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import { UserIdSchema, type User } from '../../../entities/user';
import type { UserRepository } from '../domain/repository';

export const getUserById = depend(
  { userRepository: {} as UserRepository },
  ({ userRepository }) =>
    async (id: unknown): Promise<Result<User | null, Error>> => {
      // IDバリデーション
      const idValidation = UserIdSchema.safeParse(id);
      if (!idValidation.success) {
        return err(new Error('Invalid user ID format'));
      }

      return userRepository.findById(idValidation.data);
    }
);
```

### フィルタリング・ソート付きクエリ

```typescript
// features/user/queries/search-users.ts
import { depend } from 'velona';
import { err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import { z } from 'zod';

const SearchUsersQuerySchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  sortBy: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

type SearchUsersQuery = z.infer<typeof SearchUsersQuerySchema>;

export const searchUsers = depend(
  { userRepository: {} as UserRepository },
  ({ userRepository }) =>
    async (query: unknown): Promise<Result<User[], Error>> => {
      // クエリパラメータバリデーション
      const queryValidation = SearchUsersQuerySchema.safeParse(query);
      if (!queryValidation.success) {
        return err(new Error('Invalid search parameters'));
      }

      return userRepository.search(queryValidation.data);
    }
);
```

### 集計クエリ

```typescript
// features/analytics/queries/get-user-statistics.ts
import { depend } from 'velona';
import type { Result } from '@fyuuki0jp/railway-result';

interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  topDomains: Array<{ domain: string; count: number }>;
}

export const getUserStatistics = depend(
  { userRepository: {} as UserRepository },
  ({ userRepository }) =>
    async (): Promise<Result<UserStatistics, Error>> => {
      return userRepository.getStatistics();
    }
);
```

### リレーション含むクエリ

```typescript
// features/order/queries/get-user-orders.ts
import { depend } from 'velona';
import { err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import { UserIdSchema } from '../../../entities/user';

interface UserWithOrders {
  user: User;
  orders: Order[];
  totalOrderValue: number;
}

export const getUserOrders = depend(
  { 
    userRepository: {} as UserRepository,
    orderRepository: {} as OrderRepository 
  },
  ({ userRepository, orderRepository }) =>
    async (userId: unknown): Promise<Result<UserWithOrders, Error>> => {
      // IDバリデーション
      const idValidation = UserIdSchema.safeParse(userId);
      if (!idValidation.success) {
        return err(new Error('Invalid user ID format'));
      }

      // ユーザー取得
      const userResult = await userRepository.findById(idValidation.data);
      if (isErr(userResult)) {
        return userResult;
      }
      if (!userResult.data) {
        return err(new Error('User not found'));
      }

      // 注文履歴取得
      const ordersResult = await orderRepository.findByUserId(idValidation.data);
      if (isErr(ordersResult)) {
        return ordersResult;
      }

      // 集計計算
      const totalOrderValue = ordersResult.data.reduce(
        (sum, order) => sum + order.totalAmount, 
        0
      );

      return ok({
        user: userResult.data,
        orders: ordersResult.data,
        totalOrderValue,
      });
    }
);
```

## ページネーション付きクエリ

```typescript
// shared/types/pagination.ts
export interface PaginationQuery {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// features/user/queries/get-users-paginated.ts
const PaginationQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const getUsersPaginated = depend(
  { userRepository: {} as UserRepository },
  ({ userRepository }) =>
    async (query: unknown): Promise<Result<PaginatedResult<User>, Error>> => {
      const queryValidation = PaginationQuerySchema.safeParse(query);
      if (!queryValidation.success) {
        return err(new Error('Invalid pagination parameters'));
      }

      const { page, limit } = queryValidation.data;
      const offset = (page - 1) * limit;

      // データ取得
      const usersResult = await userRepository.findMany({ offset, limit });
      if (isErr(usersResult)) {
        return usersResult;
      }

      // 総数取得
      const totalResult = await userRepository.count();
      if (isErr(totalResult)) {
        return totalResult;
      }

      const total = totalResult.data;
      const totalPages = Math.ceil(total / limit);

      return ok({
        data: usersResult.data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    }
);
```

## クエリのテストパターン

```typescript
// features/user/queries/get-users.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUsers } from './get-users';
import { isErr, ok, err } from '@fyuuki0jp/railway-result';
import type { UserRepository } from '../domain/repository';

describe('getUsers query', () => {
  let mockUserRepo: UserRepository;
  let getUsersQuery: ReturnType<typeof getUsers.inject>;

  beforeEach(() => {
    mockUserRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      // ... other methods
    };
    getUsersQuery = getUsers.inject({ userRepository: mockUserRepo });
  });

  it('should return all users', async () => {
    const mockUsers = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'user1@example.com',
        name: 'User 1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002', 
        email: 'user2@example.com',
        name: 'User 2',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];

    vi.mocked(mockUserRepo.findAll).mockResolvedValue(ok(mockUsers));

    const result = await getUsersQuery()();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockUsers);
      expect(result.data).toHaveLength(2);
    }
  });

  it('should return empty array when no users exist', async () => {
    vi.mocked(mockUserRepo.findAll).mockResolvedValue(ok([]));

    const result = await getUsersQuery()();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it('should handle repository errors', async () => {
    vi.mocked(mockUserRepo.findAll).mockResolvedValue(
      err(new Error('Database connection failed'))
    );

    const result = await getUsersQuery()();

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Database connection failed');
    }
  });
});
```

## 重要なパターン

### 1. シンプルさの原則
- クエリはビジネスロジックを含まない
- リポジトリに処理を委譲
- エラー伝播のみ

### 2. バリデーション
- 入力パラメータの型安全性確保
- Zodスキーマによる検証
- 早期エラーリターン

### 3. ページネーション
- 標準的なページネーション構造
- メタデータ付きレスポンス
- パフォーマンス考慮

### 4. テスタビリティ
- モックリポジトリによる分離テスト
- エラーケースの網羅
- 境界値テスト