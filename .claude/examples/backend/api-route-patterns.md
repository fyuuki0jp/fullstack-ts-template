# バックエンド APIルートパターン

## Hono ルートの基本構造

### 必須：メソッドチェーンパターン

```typescript
// features/user/api/routes.ts
import { Hono } from 'hono';
import { isErr } from '@fyuuki0jp/railway-result';
import { createUser } from '../commands/create-user';
import { getUsers } from '../queries/get-users';
import { getUserById } from '../queries/get-user-by-id';
import { userRepositoryImpl } from '../domain/user-repository-impl';
import type { DbAdapter } from '../../../shared/adapters/db';

export default (db: DbAdapter) => {
  return new Hono()
    .get('/', async (c) => {
      // 1. 依存性注入
      const userRepository = userRepositoryImpl.inject({ db })();
      const getUsersUseCase = getUsers.inject({ userRepository })();
      
      // 2. ユースケース実行
      const result = await getUsersUseCase();

      // 3. エラーハンドリング
      if (isErr(result)) {
        return c.json({ error: result.error.message }, 500);
      }

      // 4. 成功レスポンス
      return c.json({ users: result.data });
    })
    .post('/', async (c) => {
      // 1. リクエストボディ解析（エラーハンドリング付き）
      let body;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
      }

      // 2. 依存性注入
      const userRepository = userRepositoryImpl.inject({ db })();
      const createUserUseCase = createUser.inject({ userRepository })();

      // 3. ユースケース実行
      const result = await createUserUseCase(body);

      // 4. エラーハンドリング（適切なステータスコード）
      if (isErr(result)) {
        const statusCode = determineStatusCode(result.error.message);
        return c.json({ error: result.error.message }, statusCode);
      }

      // 5. 201 Created で成功レスポンス
      return c.json({ user: result.data }, 201);
    })
    .get('/:id', async (c) => {
      const id = c.req.param('id');

      const userRepository = userRepositoryImpl.inject({ db })();
      const getUserByIdUseCase = getUserById.inject({ userRepository })();

      const result = await getUserByIdUseCase(id);

      if (isErr(result)) {
        if (result.error.message.includes('Invalid user ID format')) {
          return c.json({ error: result.error.message }, 400);
        }
        return c.json({ error: result.error.message }, 500);
      }

      if (result.data === null) {
        return c.json({ error: 'User not found' }, 404);
      }

      return c.json({ user: result.data });
    })
    .put('/:id', async (c) => {
      const id = c.req.param('id');
      
      let body;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
      }

      const userRepository = userRepositoryImpl.inject({ db })();
      const updateUserUseCase = updateUser.inject({ userRepository })();

      const result = await updateUserUseCase(id, body);

      if (isErr(result)) {
        const statusCode = determineStatusCode(result.error.message);
        return c.json({ error: result.error.message }, statusCode);
      }

      return c.json({ user: result.data });
    })
    .delete('/:id', async (c) => {
      const id = c.req.param('id');

      const userRepository = userRepositoryImpl.inject({ db })();
      const deleteUserUseCase = deleteUser.inject({ userRepository })();

      const result = await deleteUserUseCase(id);

      if (isErr(result)) {
        if (result.error.message.includes('User not found')) {
          return c.json({ error: result.error.message }, 404);
        }
        const statusCode = determineStatusCode(result.error.message);
        return c.json({ error: result.error.message }, statusCode);
      }

      return c.json({ message: 'User deleted successfully' });
    });
};
```

### ステータスコード判定ヘルパー

```typescript
// ステータスコード判定用ヘルパー関数
function determineStatusCode(errorMessage: string): number {
  // データベース・インフラエラー
  if (
    errorMessage.includes('Database') ||
    errorMessage.includes('UNIQUE constraint') ||
    errorMessage.includes('Execute failed') ||
    errorMessage.includes('Connection failed')
  ) {
    return 500;
  }
  
  // バリデーションエラー
  if (
    errorMessage.includes('required') ||
    errorMessage.includes('Invalid') ||
    errorMessage.includes('must be') ||
    errorMessage.includes('format')
  ) {
    return 400;
  }
  
  // 重複エラー
  if (errorMessage.includes('already exists')) {
    return 409;
  }
  
  // 権限エラー
  if (errorMessage.includes('Unauthorized') || errorMessage.includes('Access denied')) {
    return 403;
  }
  
  // デフォルトはクライアントエラー
  return 400;
}
```

## クエリパラメータ・ページネーション対応

```typescript
// features/user/api/routes.ts - クエリパラメータ版
export default (db: DbAdapter) => {
  return new Hono()
    .get('/', async (c) => {
      // クエリパラメータ取得
      const page = parseInt(c.req.query('page') || '1');
      const limit = parseInt(c.req.query('limit') || '20');
      const search = c.req.query('search');
      const sortBy = c.req.query('sortBy') || 'createdAt';
      const sortOrder = c.req.query('sortOrder') || 'desc';

      const userRepository = userRepositoryImpl.inject({ db })();
      const searchUsersUseCase = searchUsers.inject({ userRepository })();

      const result = await searchUsersUseCase({
        page,
        limit,
        search,
        sortBy,
        sortOrder,
      });

      if (isErr(result)) {
        return c.json({ error: result.error.message }, 500);
      }

      return c.json(result.data);
    });
};
```

## ミドルウェア統合パターン

```typescript
// 認証ミドルウェア付きルート
import { jwt } from 'hono/jwt';

export default (db: DbAdapter) => {
  return new Hono()
    // 公開エンドポイント
    .get('/public', async (c) => {
      // 認証不要
      return c.json({ message: 'Public endpoint' });
    })
    // 認証が必要なエンドポイント群
    .use('/protected/*', jwt({ secret: process.env.JWT_SECRET }))
    .get('/protected/profile', async (c) => {
      const payload = c.get('jwtPayload');
      const userId = payload.sub;

      const userRepository = userRepositoryImpl.inject({ db })();
      const getUserByIdUseCase = getUserById.inject({ userRepository })();

      const result = await getUserByIdUseCase(userId);

      if (isErr(result)) {
        return c.json({ error: result.error.message }, 500);
      }

      if (!result.data) {
        return c.json({ error: 'User not found' }, 404);
      }

      return c.json({ user: result.data });
    });
};
```

## CORS・セキュリティヘッダー

```typescript
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

export default (db: DbAdapter) => {
  return new Hono()
    .use('*', cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    }))
    .use('*', secureHeaders())
    .get('/', async (c) => {
      // ルート実装
    });
};
```

## ルートテストパターン

```typescript
// features/user/api/routes.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import createUserRoutes from './routes';
import { setupTestDatabase } from '../../../shared/adapters/db/pglite';
import type { PGlite } from '@electric-sql/pglite';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';

describe('User API Routes', () => {
  let app: Hono;
  let client: PGlite;
  let db: DrizzleDb;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    client = setup.client;
    db = setup.db;
    const userRoutes = createUserRoutes(db);
    app = new Hono();
    app.route('/', userRoutes);
  });

  afterAll(async () => {
    await client.close();
  });

  describe('GET /', () => {
    it('should return all users', async () => {
      const res = await app.request('/');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('users');
      expect(Array.isArray(data.users)).toBe(true);
    });

    it('should handle database errors', async () => {
      // データベース接続を閉じてエラーをシミュレート
      await client.close();
      
      const res = await app.request('/');
      
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user.email).toBe(userData.email);
      expect(data.user.name).toBe(userData.name);
      expect(data.user.id).toBeTruthy();
    });

    it('should validate required fields', async () => {
      const userData = {
        email: '',
        name: 'Test User',
      };

      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Email is required');
    });

    it('should handle invalid JSON', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid JSON');
    });

    it('should handle duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        name: 'User One',
      };

      // 最初のユーザー作成
      await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      // 同じメールで2回目作成
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userData, name: 'User Two' }),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain('already exists');
    });
  });

  describe('GET /:id', () => {
    it('should return user by valid ID', async () => {
      // テストユーザー作成
      const createRes = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'gettest@example.com', name: 'Get Test' }),
      });
      const createData = await createRes.json();
      const userId = createData.user.id;

      const res = await app.request(`/${userId}`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.id).toBe(userId);
      expect(data.user.email).toBe('gettest@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440001';
      
      const res = await app.request(`/${nonExistentId}`);
      
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('User not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await app.request('/invalid-id');
      
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid user ID format');
    });
  });
});
```

## 重要なパターン

### 1. メソッドチェーン必須
- `.get()`, `.post()`, `.put()`, `.delete()` をチェーン
- 個別宣言は禁止

### 2. 一貫したエラーレスポンス
- `{ error: string }` 形式
- 適切なHTTPステータスコード
- エラーメッセージに基づく自動判定

### 3. 依存性注入パターン
- ルートレベルでリポジトリを注入
- ユースケースへの明示的な依存関係

### 4. レスポンス形式統一
- コレクション：`{ users: User[] }`
- 単一エンティティ：`{ user: User }`
- エラー：`{ error: string }`

### 5. リクエスト検証
- JSON解析エラーの適切なハンドリング
- パスパラメータの型安全性確保