# 🏗️ アーキテクチャ概要

このドキュメントでは、フルスタックアプリケーションの技術アーキテクチャと設計決定について説明します。

## コアアーキテクチャパターン

### 1. Railway-Oriented Programming（ROP）

明示的なエラーハンドリングのため、すべての関数が`Result<T, E>`型を返します：

```typescript
import { Result, ok, err, isErr } from '@fyuuki0jp/railway-result';

// ✅ 良い例：明示的なエラーハンドリング
async function getUser(id: string): Promise<Result<User, Error>> {
  const result = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  if (isErr(result)) return result;
  
  if (result.data.length === 0) {
    return err(new Error('User not found'));
  }
  
  return ok(transformToUser(result.data[0]));
}

// ❌ 悪い例：例外を投げる
async function getUser(id: string): Promise<User> {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) throw new Error('User not found'); // これは絶対にやらない！
  return user;
}
```

### 2. Feature-Sliced Design（FSD）

機能は明確な境界を持つ垂直的な組織化がされています：

```
src/features/user/
├── api/          # パブリックAPI層
│   └── routes.ts # HTTPエンドポイント
├── commands/     # 書き込み操作
│   └── create-user.ts
├── queries/      # 読み込み操作
│   └── get-users.ts
└── domain/       # ビジネスロジック
    ├── repository.ts      # インターフェース
    └── user-repository-impl.ts # 実装
```

### 3. CQRS（Command Query Responsibility Segregation）

明確性のためにコマンドとクエリが分離されています：

```typescript
// コマンド：副作用あり、ビジネスルールを検証
export const createUser = depend(
  { userRepository },
  async ({ userRepository }, input: CreateUserInput) => {
    // ビジネスバリデーション
    if (!input.email.includes('@')) {
      return err(new Error('Invalid email format'));
    }
    
    // リポジトリに委譲
    return userRepository.create(input);
  }
);

// クエリ：副作用なし、データ取得のみ
export const getUsers = depend(
  { userRepository },
  async ({ userRepository }) => userRepository.findAll()
);
```

### 4. Velonaによる依存性注入

テスタビリティのため、依存性は手動で注入されます：

```typescript
// 依存性の定義
export const createUser = depend(
  { userRepository: {} as UserRepository },
  async ({ userRepository }, input) => {
    // 実装
  }
);

// 実行時に注入
const injectedCreateUser = createUser.inject({
  userRepository: userRepositoryImpl.inject({ db })()
});

// ルートで使用
const result = await injectedCreateUser(input);
```

## データベースアーキテクチャ

### アダプターパターン

データベース操作はインターフェースの背後に抽象化されています：

```typescript
export interface DbAdapter {
  query<T>(sql: string, params?: any[]): Promise<Result<T[], Error>>;
  execute(sql: string, params?: any[]): Promise<Result<void, Error>>;
  transaction<T>(
    fn: (tx: DbAdapter) => Promise<Result<T, Error>>
  ): Promise<Result<T, Error>>;
}
```

### エンティティ管理

すべてのエンティティは一貫した構造に従います：

```typescript
export interface Entity {
  id: string;        // UUID v4
  createdAt: Date;   // 作成タイムスタンプ
  updatedAt: Date;   // 最終更新タイムスタンプ
}

// ドメインエンティティはEntityを拡張
export interface User extends Entity {
  email: string;
  name: string;
}
```

### データ変換

データベース行はリポジトリレベルで変換されます：

```typescript
// データベース行（snake_case）
interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;  // ISO文字列
  updated_at: string;  // ISO文字列
}

// ドメインエンティティに変換（camelCase）
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

## APIアーキテクチャ

### ルート組織化

ルートはクリーンなコードのためHonoのメソッドチェーンを使用します：

```typescript
export default (db: DbAdapter) => {
  return new Hono()
    .get('/', async (c) => {
      // GET /api/users
    })
    .post('/', async (c) => {
      // POST /api/users
    })
    .get('/:id', async (c) => {
      // GET /api/users/:id
    })
    .put('/:id', async (c) => {
      // PUT /api/users/:id
    })
    .delete('/:id', async (c) => {
      // DELETE /api/users/:id
    });
};
```

### エラーハンドリング

API全体で一貫したエラーレスポンス：

```typescript
// ルートハンドラーパターン
const result = await useCase(input);

if (isErr(result)) {
  const status = determineStatusCode(result.error);
  return c.json({ error: result.error.message }, status);
}

return c.json({ user: result.data }, 201);
```

### レスポンス形式

一貫したJSONレスポンス構造：

```typescript
// 成功レスポンス
{ users: User[] }        // GET /users
{ user: User }          // GET /users/:id, POST /users
{ message: "Deleted" }  // DELETE /users/:id

// エラーレスポンス
{ error: "Error message" }  // すべてのエラー
```

## クライアント統合

APIは任意のクライアント（React、Vue、モバイルアプリなど）で使用できるよう設計されています。RESTの原則に従ったクリーンで一貫したAPIの提供に焦点を当てています。

## テストアーキテクチャ

### テスト組織化

テストはテスト対象のコードの隣に配置されます：

```
create-user.ts
create-user.spec.ts  # テストファイル
```

### モック戦略

レイヤーごとに異なるモックアプローチ：

```typescript
// リポジトリテスト：MockDbAdapterを使用
const mockDb = new MockDbAdapter();
mockDb.setData('users', [testUser]);

// コマンドテスト：リポジトリをモック
const mockRepo = {
  create: vi.fn().mockResolvedValue(ok(user))
};

// ルートテスト：MockDbAdapterでフル統合
const app = new Hono().route('/', createUserRoutes(mockDb));
const response = await app.request('/');
```

## セキュリティ考慮事項

### 入力バリデーション

- バリデーションはリポジトリではなくコマンドで行う
- 明確なエラーメッセージで明示的バリデーションを使用
- クライアント入力を決して信頼しない

### SQLインジェクション防止

- 常にパラメータ化クエリを使用
- SQL文字列を決して連結しない

```typescript
// ✅ 良い例：パラメータ化クエリ
db.query('SELECT * FROM users WHERE id = ?', [id]);

// ❌ 悪い例：文字列連結
db.query(`SELECT * FROM users WHERE id = '${id}'`);
```

### 認証・認可

- ミドルウェアで実装（テンプレートには含まれない）
- 保護が必要なルートに追加
- JWTまたはセッションベース認証を検討

## パフォーマンス考慮事項

### データベース

- 同時読み込み用のWALモード付きSQLite
- 頻繁にクエリされる列にインデックス
- 接続プーリングは不要（SQLite）

### API

- 軽量なHonoフレームワーク
- 不要なミドルウェアなし
- 効率的なエラーハンドリング

### フロントエンド

- 高速開発用Vite
- 必要に応じてReact.lazyでコード分割
- 最適化された本番ビルド

## デプロイメントアーキテクチャ

### バックエンドデプロイメント

- 単一のNode.jsプロセス
- 永続ボリューム上のSQLiteファイル
- 設定用環境変数

### フロントエンドデプロイメント

- 静的ファイル（HTML、JS、CSS）
- グローバル配信用CDN
- APIプロキシ設定

### 環境変数

```bash
# バックエンド
PORT=3000
DATABASE_PATH=./db.sqlite

# フロントエンド（ビルド時）
VITE_API_URL=https://api.example.com
```

## 将来の考慮事項

### スケーリング

- マルチインスタンスデプロイメント用PostgreSQL
- キャッシュ用Redis
- 非同期操作用メッセージキュー

### 監視

- 構造化ログ
- エラートラッキング（Sentry）
- パフォーマンス監視

### 高度な機能

- リアルタイム更新（WebSockets）
- ファイルアップロード
- バックグラウンドジョブ