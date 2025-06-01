# 🚀 バックエンド開発ガイド

FSD、CQRS、Railway Resultパターンを採用したHono バックエンドAPI開発の完全ガイド。

## APIルート開発

### メソッドチェーンによるルート構造

```typescript
// src/features/user/api/routes.ts
import { Hono } from 'hono';
import { isErr } from '@fyuuki0jp/railway-result';
import type { DbAdapter } from '../../../shared/adapters/db';

export default (db: DbAdapter) => {
  // 依存性はルート作成時に注入
  const userRepository = userRepositoryImpl.inject({ db })();
  const createUserUseCase = createUser.inject({ userRepository });
  const getUsersUseCase = getUsers.inject({ userRepository });

  return new Hono()
    // GET /api/users
    .get('/', async (c) => {
      const result = await getUsersUseCase()();
      
      if (isErr(result)) {
        return c.json({ error: result.error.message }, 500);
      }
      
      return c.json({ users: result.data });
    })
    
    // POST /api/users
    .post('/', async (c) => {
      let body;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
      }

      const result = await createUserUseCase()(body);
      
      if (isErr(result)) {
        const status = result.error.message.includes('Database') ? 500 : 400;
        return c.json({ error: result.error.message }, status);
      }
      
      return c.json({ user: result.data }, 201);
    })
    
    // GET /api/users/:id
    .get('/:id', async (c) => {
      const id = c.req.param('id');
      const result = await getUserByIdUseCase()(id);
      
      if (isErr(result)) {
        const status = result.error.message.includes('not found') ? 404 : 500;
        return c.json({ error: result.error.message }, status);
      }
      
      return c.json({ user: result.data });
    })
    
    // PUT /api/users/:id
    .put('/:id', async (c) => {
      const id = c.req.param('id');
      let body;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
      }

      const result = await updateUserUseCase()({ id, ...body });
      
      if (isErr(result)) {
        return c.json({ error: result.error.message }, 400);
      }
      
      return c.json({ user: result.data });
    })
    
    // DELETE /api/users/:id
    .delete('/:id', async (c) => {
      const id = c.req.param('id');
      const result = await deleteUserUseCase()(id);
      
      if (isErr(result)) {
        return c.json({ error: result.error.message }, 400);
      }
      
      return c.json({ message: 'ユーザーが正常に削除されました' });
    });
};
```

### エラーステータスコードマッピング

```typescript
function determineStatusCode(error: Error): number {
  const message = error.message.toLowerCase();
  
  // 404 Not Found
  if (message.includes('not found')) return 404;
  
  // 409 Conflict
  if (message.includes('already exists') || 
      message.includes('duplicate')) return 409;
  
  // 401 Unauthorized
  if (message.includes('unauthorized') || 
      message.includes('authentication')) return 401;
  
  // 403 Forbidden
  if (message.includes('forbidden') || 
      message.includes('permission')) return 403;
  
  // 500 Internal Server Error
  if (message.includes('database') || 
      message.includes('connection') ||
      message.includes('internal')) return 500;
  
  // 400 Bad Request（バリデーションエラーのデフォルト）
  return 400;
}
```

## コマンド実装（書き込み操作）

### 基本的なコマンド構造

```typescript
// src/features/user/commands/create-user.ts
import { depend } from 'velona';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { UserRepository } from '../domain/repository';
import type { CreateUserInput } from '../types';

export const createUser = depend(
  { userRepository: {} as UserRepository },
  async ({ userRepository }, input: CreateUserInput) => {
    // 1. 入力バリデーション
    if (!input.email || !input.name) {
      return err(new Error('メールアドレスと名前は必須です'));
    }
    
    if (!input.email.includes('@')) {
      return err(new Error('メールアドレスの形式が無効です'));
    }
    
    if (input.name.length < 2) {
      return err(new Error('名前は最低2文字以上である必要があります'));
    }
    
    // 2. ビジネスロジックバリデーション
    const existingUser = await userRepository.findByEmail(input.email);
    if (isOk(existingUser) && existingUser.data) {
      return err(new Error('このメールアドレスのユーザーは既に存在します'));
    }
    
    // 3. 操作実行
    return userRepository.create({
      email: input.email.toLowerCase().trim(),
      name: input.name.trim(),
    });
  }
);
```

### トランザクション付き複雑なコマンド

```typescript
// src/features/order/commands/create-order.ts
export const createOrder = depend(
  { 
    orderRepository: {} as OrderRepository,
    productRepository: {} as ProductRepository,
    inventoryService: {} as InventoryService,
    db: {} as DbAdapter,
  },
  async ({ orderRepository, productRepository, inventoryService, db }, input: CreateOrderInput) => {
    // 複雑な操作にはトランザクションを使用
    return db.transaction(async (tx) => {
      // 1. 商品の存在確認
      for (const item of input.items) {
        const product = await productRepository.findById(item.productId);
        if (isErr(product) || !product.data) {
          return err(new Error(`商品 ${item.productId} が見つかりません`));
        }
      }
      
      // 2. 在庫確認
      const inventoryCheck = await inventoryService.checkAvailability(input.items);
      if (isErr(inventoryCheck)) {
        return inventoryCheck;
      }
      
      // 3. 合計金額計算
      const total = await calculateOrderTotal(input.items);
      if (isErr(total)) {
        return total;
      }
      
      // 4. 注文作成
      const order = await orderRepository.create({
        userId: input.userId,
        items: input.items,
        total: total.data,
        status: 'pending',
      });
      
      if (isErr(order)) {
        return order;
      }
      
      // 5. 在庫確保
      const reserved = await inventoryService.reserve(order.data.id, input.items);
      if (isErr(reserved)) {
        return reserved;
      }
      
      return ok(order.data);
    });
  }
);
```

## クエリ実装（読み込み操作）

### シンプルなクエリ

```typescript
// src/features/user/queries/get-users.ts
import { depend } from 'velona';
import type { UserRepository } from '../domain/repository';

export const getUsers = depend(
  { userRepository: {} as UserRepository },
  async ({ userRepository }) => {
    // クエリはシンプルに - リポジトリに委譲するだけ
    return userRepository.findAll();
  }
);
```

### フィルター付きクエリ

```typescript
// src/features/product/queries/search-products.ts
export interface SearchFilters {
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  sortBy?: 'price' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export const searchProducts = depend(
  { productRepository: {} as ProductRepository },
  async ({ productRepository }, filters: SearchFilters) => {
    // ページネーションのバリデーション
    const limit = Math.min(filters.limit || 20, 100);
    const offset = Math.max(filters.offset || 0, 0);
    
    return productRepository.search({
      ...filters,
      limit,
      offset,
    });
  }
);
```

## リポジトリ実装

### リポジトリインターフェース

```typescript
// src/features/user/domain/repository.ts
import type { Result } from '@fyuuki0jp/railway-result';
import type { User } from '../../../entities/user';

export interface UserRepository {
  create(input: CreateUserInput): Promise<Result<User, Error>>;
  findAll(): Promise<Result<User[], Error>>;
  findById(id: string): Promise<Result<User | null, Error>>;
  findByEmail(email: string): Promise<Result<User | null, Error>>;
  update(id: string, input: UpdateUserInput): Promise<Result<User, Error>>;
  delete(id: string): Promise<Result<void, Error>>;
}
```

### リポジトリ実装

```typescript
// src/features/user/domain/user-repository-impl.ts
import { depend } from 'velona';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { DbAdapter } from '../../../shared/adapters/db';
import type { UserRepository } from './repository';

interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const userRepositoryImpl = depend(
  { db: {} as DbAdapter },
  ({ db }): UserRepository => ({
    async create(input) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const result = await db.execute(
        `INSERT INTO users (id, email, name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [id, input.email, input.name, now, now]
      );
      
      if (isErr(result)) {
        // UNIQUE制約エラーの処理
        if (result.error.message.includes('UNIQUE constraint')) {
          return err(new Error('このメールアドレスのユーザーは既に存在します'));
        }
        return result;
      }
      
      return ok({
        id,
        email: input.email,
        name: input.name,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });
    },

    async findAll() {
      const result = await db.query<UserRow>(
        'SELECT * FROM users ORDER BY created_at DESC'
      );
      
      if (isErr(result)) return result;
      
      return ok(result.data.map(transformToUser));
    },

    async findById(id) {
      const result = await db.query<UserRow>(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      if (isErr(result)) return result;
      
      return ok(result.data[0] ? transformToUser(result.data[0]) : null);
    },

    async update(id, input) {
      const updates: string[] = [];
      const values: any[] = [];
      
      if (input.email !== undefined) {
        updates.push('email = ?');
        values.push(input.email);
      }
      
      if (input.name !== undefined) {
        updates.push('name = ?');
        values.push(input.name);
      }
      
      if (updates.length === 0) {
        return err(new Error('更新するフィールドがありません'));
      }
      
      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);
      
      const result = await db.execute(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      
      if (isErr(result)) return result;
      
      return this.findById(id).then(result => 
        isErr(result) ? result :
        result.data ? ok(result.data) :
        err(new Error('ユーザーが見つかりません'))
      );
    },

    async delete(id) {
      const result = await db.execute(
        'DELETE FROM users WHERE id = ?',
        [id]
      );
      
      return result;
    },
  })
);

function transformToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
```

## データベースアダプター

### SQLiteアダプター実装

```typescript
// src/shared/adapters/db/sqlite.ts
import Database from 'better-sqlite3';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { DbAdapter } from './types';

export function createSqliteAdapter(filename: string): DbAdapter {
  const db = new Database(filename);
  
  // より良い同時性のためWALモードを有効化
  db.pragma('journal_mode = WAL');
  
  return {
    async query<T>(sql: string, params?: any[]) {
      try {
        const stmt = db.prepare(sql);
        const rows = params ? stmt.all(...params) : stmt.all();
        return ok(rows as T[]);
      } catch (error) {
        return err(new Error(`クエリが失敗しました: ${error.message}`));
      }
    },

    async execute(sql: string, params?: any[]) {
      try {
        const stmt = db.prepare(sql);
        params ? stmt.run(...params) : stmt.run();
        return ok(undefined);
      } catch (error) {
        return err(new Error(`実行が失敗しました: ${error.message}`));
      }
    },

    async transaction<T>(fn) {
      const tx = db.transaction(async () => {
        try {
          // トランザクションアダプターとして自分自身を渡す
          const result = await fn(this);
          if (isErr(result)) {
            throw result.error;
          }
          return result;
        } catch (error) {
          throw error;
        }
      });

      try {
        return await tx();
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
}
```

## サーバーセットアップ

### メインサーバー設定

```typescript
// src/server.ts
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createSqliteAdapter } from './shared/adapters/db/sqlite';
import createUserRoutes from './features/user/api/routes';
import createProductRoutes from './features/product/api/routes';

// データベース初期化
const db = createSqliteAdapter('./db.sqlite');

// テーブル作成
db.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.execute(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

// アプリ作成
const app = new Hono();

// グローバルミドルウェア
app.use('*', logger());
app.use('*', cors());

// 機能ルートのマウント
const route = app
  .basePath('/api')
  .route('/users', createUserRoutes(db))
  .route('/products', createProductRoutes(db));

// フロントエンド用の型エクスポート
export type ApiSchema = typeof route;

// ヘルスチェック
app.get('/health', (c) => c.json({ status: 'ok' }));

// サーバー開始
serve(
  {
    port: 3000,
    fetch: app.fetch,
  },
  (info) => {
    console.log(`サーバーが http://localhost:${info.port} で起動しました`);
  }
);
```

## ミドルウェアパターン

### 認証ミドルウェア

```typescript
// src/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import { verify } from 'jsonwebtoken';

export const auth = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return c.json({ error: 'トークンが提供されていません' }, 401);
  }
  
  try {
    const payload = verify(token, process.env.JWT_SECRET!);
    c.set('userId', payload.userId);
    await next();
  } catch (error) {
    return c.json({ error: '無効なトークンです' }, 401);
  }
});

// ルートでの使用
.get('/profile', auth, async (c) => {
  const userId = c.get('userId');
  // ハンドラーでuserIdを使用
})
```

### バリデーションミドルウェア

```typescript
// src/middleware/validate.ts
import { z } from 'zod';

export function validate<T>(schema: z.Schema<T>) {
  return createMiddleware(async (c, next) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);
      c.set('validatedBody', validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ 
          error: 'バリデーションが失敗しました',
          details: error.errors,
        }, 400);
      }
      return c.json({ error: '無効なリクエストボディです' }, 400);
    }
  });
}

// スキーマ定義
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

// ルートでの使用
.post('/', validate(createUserSchema), async (c) => {
  const body = c.get('validatedBody');
  // bodyは型付けされバリデーション済み
})
```

## 共通パターン

### ページネーション

```typescript
// src/features/user/api/routes.ts
.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  
  const result = await getUsersPaginatedUseCase()({ limit, offset });
  
  if (isErr(result)) {
    return c.json({ error: result.error.message }, 500);
  }
  
  return c.json({
    users: result.data.items,
    pagination: {
      page,
      limit,
      total: result.data.total,
      totalPages: Math.ceil(result.data.total / limit),
    },
  });
})
```

### ファイルアップロード

```typescript
// src/features/upload/api/routes.ts
.post('/upload', async (c) => {
  const body = await c.req.parseBody();
  const file = body.file as File;
  
  if (!file) {
    return c.json({ error: 'ファイルが提供されていません' }, 400);
  }
  
  // ファイルタイプのバリデーション
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: '無効なファイルタイプです' }, 400);
  }
  
  // ファイル保存
  const buffer = await file.arrayBuffer();
  const filename = `${crypto.randomUUID()}-${file.name}`;
  
  // ディスクまたはクラウドストレージに保存
  const result = await saveFile(filename, Buffer.from(buffer));
  
  if (isErr(result)) {
    return c.json({ error: 'ファイルの保存に失敗しました' }, 500);
  }
  
  return c.json({ filename, url: result.data.url }, 201);
})
```

### バックグラウンドジョブ

```typescript
// src/features/email/commands/send-welcome-email.ts
export const sendWelcomeEmail = depend(
  { 
    emailService: {} as EmailService,
    jobQueue: {} as JobQueue,
  },
  async ({ emailService, jobQueue }, userId: string) => {
    // 即座に送信する代わりにジョブをキューに追加
    return jobQueue.add('send-welcome-email', {
      userId,
      template: 'welcome',
      priority: 'low',
    });
  }
);

// ユーザー作成コマンドで
const emailResult = await sendWelcomeEmail()(user.id);
// メール送信に失敗してもユーザー作成は失敗させない
if (isErr(emailResult)) {
  console.error('ウェルカムメールのキューイングに失敗:', emailResult.error);
}
```

## パフォーマンスのコツ

1. **データベースインデックスを使用**
   ```sql
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_products_category ON products(category);
   ```

2. **キャッシュの実装**
   ```typescript
   const cache = new Map<string, CachedItem>();
   
   async function getCachedUser(id: string) {
     const cached = cache.get(`user:${id}`);
     if (cached && cached.expiresAt > Date.now()) {
       return ok(cached.data);
     }
     
     const result = await userRepository.findById(id);
     if (isOk(result) && result.data) {
       cache.set(`user:${id}`, {
         data: result.data,
         expiresAt: Date.now() + 60000, // 1分
       });
     }
     
     return result;
   }
   ```

3. **接続プーリングの使用（PostgreSQL用）**
   ```typescript
   import { Pool } from 'pg';
   
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20,
   });
   ```

4. **クエリの最適化**
   - 必要な列のみを選択
   - 複数クエリの代わりにJOINを使用
   - 可能な限りバッチ操作を行う

5. **レスポンス圧縮の有効化**
   ```typescript
   import { compress } from 'hono/compress';
   
   app.use('*', compress());
   ```