# 🧪 テストガイド

このプロジェクトにおけるテスト駆動開発（TDD）の包括的ガイド。

## TDDワークフロー

### Red-Green-Refactorサイクル

1. **🔴 Red**：最初に失敗するテストを書く
2. **🟢 Green**：テストを通すための最小限のコードを書く
3. **🔵 Refactor**：テストを緑に保ちながらコードを改善する

```bash
# TDD用ウォッチモード
yarn test --watch

# 特定のテストファイルを実行
yarn test user.spec

# カバレッジ付きで実行
yarn test --coverage
```

## テストファイル組織化

### 命名規則

```
feature.ts          # 実装
feature.spec.ts     # テストファイル（同じディレクトリ）
```

### テスト構造

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('機能名', () => {
  // セットアップ
  beforeEach(() => {
    // モックのリセット、テストデータの初期化
  });

  describe('特定の機能', () => {
    it('特定のことを行うべき', () => {
      // Arrange（準備）
      const input = { /* テストデータ */ };
      
      // Act（実行）
      const result = functionUnderTest(input);
      
      // Assert（検証）
      expect(result).toEqual(expected);
    });
  });
});
```

## レイヤー別テストパターン

### 1. コマンドのテスト（ビジネスロジック）

コマンドにはバリデーションとビジネスルールが含まれます：

```typescript
// create-user.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createUser } from './create-user';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { UserRepository } from '../domain/repository';

describe('createUser command', () => {
  let mockUserRepository: UserRepository;
  let createUserCmd: ReturnType<typeof createUser.inject>;

  beforeEach(() => {
    // モックリポジトリの作成
    mockUserRepository = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    
    // モックの注入
    createUserCmd = createUser.inject({ userRepository: mockUserRepository });
  });

  it('有効なメールでユーザーを作成すべき', async () => {
    // Arrange
    const input = { email: 'test@example.com', name: 'テストユーザー' };
    const expectedUser = {
      id: '123',
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(mockUserRepository.create).mockResolvedValue(ok(expectedUser));

    // Act
    const result = await createUserCmd()(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expectedUser);
    }
    expect(mockUserRepository.create).toHaveBeenCalledWith(input);
  });

  it('無効なメールを拒否すべき', async () => {
    // Arrange
    const input = { email: 'invalid-email', name: 'テストユーザー' };

    // Act
    const result = await createUserCmd()(input);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('メールアドレスの形式が無効です');
    }
    expect(mockUserRepository.create).not.toHaveBeenCalled();
  });
});
```

### 2. クエリのテスト（データ取得）

クエリはシンプルであり、エラー伝播をテストします：

```typescript
// get-users.spec.ts
describe('getUsers query', () => {
  it('すべてのユーザーを返すべき', async () => {
    // Arrange
    const expectedUsers = [
      { id: '1', email: 'user1@example.com', name: 'ユーザー1' },
      { id: '2', email: 'user2@example.com', name: 'ユーザー2' },
    ];
    vi.mocked(mockUserRepository.findAll).mockResolvedValue(ok(expectedUsers));

    // Act
    const result = await getUsersQuery();

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expectedUsers);
    }
  });

  it('リポジトリエラーを伝播すべき', async () => {
    // Arrange
    const error = new Error('データベース接続に失敗しました');
    vi.mocked(mockUserRepository.findAll).mockResolvedValue(err(error));

    // Act
    const result = await getUsersQuery();

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(error);
    }
  });
});
```

### 3. リポジトリのテスト（データアクセス）

データベースインタラクションテストにはMockDbAdapterを使用：

```typescript
// user-repository-impl.spec.ts
import { MockDbAdapter } from '../../../shared/adapters/db/mock';
import { userRepositoryImpl } from './user-repository-impl';

describe('UserRepository implementation', () => {
  let mockDb: MockDbAdapter;
  let userRepo: ReturnType<typeof userRepositoryImpl.inject>;

  beforeEach(() => {
    mockDb = new MockDbAdapter();
    userRepo = userRepositoryImpl.inject({ db: mockDb });
  });

  describe('findAll', () => {
    it('すべてのユーザーを返すべき', async () => {
      // Arrange
      const dbRows = [
        {
          id: '1',
          email: 'user@example.com',
          name: 'テストユーザー',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];
      mockDb.setData('users', dbRows);

      // Act
      const result = await userRepo().findAll();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].createdAt).toBeInstanceOf(Date);
        expect(result.data[0].updatedAt).toBeInstanceOf(Date);
      }
    });

    it('データベースエラーを処理すべき', async () => {
      // Arrange
      mockDb.mockFailure('接続タイムアウト');

      // Act
      const result = await userRepo().findAll();

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('接続タイムアウト');
      }
    });
  });
});
```

### 4. APIルートのテスト（HTTP層）

フルHTTPリクエスト/レスポンスサイクルをテスト：

```typescript
// routes.spec.ts
import { Hono } from 'hono';
import createUserRoutes from './routes';
import { MockDbAdapter } from '../../../shared/adapters/db/mock';

describe('User API Routes', () => {
  let app: Hono;
  let mockDb: MockDbAdapter;

  beforeEach(() => {
    mockDb = new MockDbAdapter();
    const userRoutes = createUserRoutes(mockDb);
    app = new Hono();
    app.route('/', userRoutes);
  });

  describe('GET /', () => {
    it('ユーザーリストを返すべき', async () => {
      // Arrange
      mockDb.setData('users', [
        { id: '1', email: 'test@example.com', name: 'テスト' },
      ]);

      // Act
      const res = await app.request('/');

      // Assert
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.users).toHaveLength(1);
    });
  });

  describe('POST /', () => {
    it('ユーザーを作成すべき', async () => {
      // Act
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@example.com',
          name: '新しいユーザー',
        }),
      });

      // Assert
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.user.email).toBe('new@example.com');
    });

    it('無効なJSONを処理すべき', async () => {
      // Act
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      // Assert
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid JSON');
    });
  });
});
```

## Railway Resultのテスト

### 成功ケース

```typescript
// 常に最初にsuccessフラグをチェック
expect(result.success).toBe(true);
if (result.success) {
  expect(result.data).toEqual(expectedData);
}
```

### エラーケース

```typescript
// エラーチェックにはisErrを使用
import { isErr } from '@fyuuki0jp/railway-result';

expect(isErr(result)).toBe(true);
if (isErr(result)) {
  expect(result.error.message).toBe('期待されるエラーメッセージ');
}
```

## モックユーティリティ

### MockDbAdapter

データベース操作用のテストダブル：

```typescript
const mockDb = new MockDbAdapter();

// テストデータの設定
mockDb.setData('users', [
  { id: '1', email: 'test@example.com', name: 'テスト' }
]);

// 失敗のシミュレート
mockDb.mockFailure('データベースエラー');

// テスト間でのリセット
mockDb.reset();
```

### Vitestモッキング

```typescript
// 関数のモック
const mockFn = vi.fn();
mockFn.mockResolvedValue(ok(data));
mockFn.mockResolvedValue(err(new Error('失敗')));

// モジュールのモック
vi.mock('./module', () => ({
  someFunction: vi.fn(),
}));

// 既存関数のスパイ
const spy = vi.spyOn(object, 'method');
```

## テストデータビルダー

再利用可能なテストデータの作成：

```typescript
// test-builders.ts
export function buildUser(overrides?: Partial<User>): User {
  return {
    id: '123',
    email: 'test@example.com',
    name: 'テストユーザー',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// テストでの使用
const user = buildUser({ name: 'カスタム名' });
```

## カバレッジ要件

### 最小カバレッジ

- コマンド：100%（すべてのバリデーションパス）
- クエリ：100%（成功およびエラーパス）
- リポジトリ：90%（データ変換）
- ルート：90%（HTTP処理）

### テストすべきもの

✅ **これらをテスト：**
- ビジネスロジックとバリデーション
- エラーハンドリングパス
- データ変換
- HTTPステータスコード
- エッジケース

❌ **これらはテストしない：**
- フレームワーク内部
- サードパーティライブラリ
- シンプルなゲッター/セッター
- 型定義

## 共通テストパターン

### 非同期操作のテスト

```typescript
it('非同期操作を処理すべき', async () => {
  // 明確性のため常にasync/awaitを使用
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### 時間依存コードのテスト

```typescript
beforeEach(() => {
  // 一貫したテストのため時間を固定
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-01-01'));
});

afterEach(() => {
  vi.useRealTimers();
});
```

### エラーシナリオのテスト

```typescript
it('特定のエラーを処理すべき', async () => {
  // 異なるエラータイプをテスト
  const errors = [
    'ネットワークエラー',
    'バリデーション失敗',
    '認証エラー',
  ];

  for (const errorMsg of errors) {
    mockDb.mockFailure(errorMsg);
    const result = await repository.findAll();
    expect(isErr(result)).toBe(true);
  }
});
```

## テストのデバッグ

### コンソール出力

```typescript
// デバッグ用に一時的にconsole.logを追加
console.log('結果:', JSON.stringify(result, null, 2));

// デバッグモードを使用
DEBUG=* yarn test
```

### VS Codeデバッグ

1. テストにブレークポイントを追加
2. VS Codeから「Debug Test」を実行
3. コードをステップ実行

### よくある問題

1. **非同期の問題**：非同期操作は常にawaitする
2. **モックが動作しない**：モックが適切に注入されているかチェック
3. **不安定なテスト**：時間依存や共有状態を確認
4. **型エラー**：モックがインターフェースと一致することを確認

## ベストプラクティス

1. **実装ではなく動作をテスト**
   - コードがどのように動作するかではなく、何をするかに焦点を当てる
   - テストはリファクタリングに耐えるべき

2. **説明的なテスト名を使用**
   ```typescript
   // ✅ 良い例
   it('@記号のないメールを拒否すべき')
   
   // ❌ 悪い例
   it('入力をバリデーションすべき')
   ```

3. **テストごとに1つのアサーション**
   - 失敗を明確にする
   - 壊れたテストの修正が簡単

4. **テストを分離**
   - テスト間で状態を共有しない
   - 各テストは独立している必要がある

5. **高速テスト**
   - 外部依存関係をモック
   - テスト用にインメモリデータベースを使用