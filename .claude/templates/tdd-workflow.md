# TDD開発ワークフロー

## 基本的なTDDサイクル

### Red-Green-Refactorサイクル

```
1. 🔴 RED   → 失敗するテストを書く
2. 🟢 GREEN → テストを通す最小限のコードを書く  
3. 🔵 BLUE  → コードをリファクタリングする
```

## 機能開発の標準フロー

### Step 1: 要件分析とタスク分解

```bash
# TodoWriteで開発タスクを分解・管理
1. エンティティ設計
2. バックエンドAPIの実装（TDD）
3. フロントエンドフックの実装（TDD）
4. UIコンポーネントの実装（TDD）
5. E2Eテストの実装
6. 統合テスト・手動テスト
```

### Step 2: バックエンド開発（TDD）

#### 2-1. エンティティ作成

```bash
# スキャフォールディング使用
yarn create:backend:entity <entity-name>

# 手動の場合
mkdir -p backend/src/entities/<entity-name>
# Zodスキーマ + branded types作成
```

#### 2-2. 機能開発（TDD）

```bash
# フィーチャー作成
yarn create:backend:feature <feature-name> <entity-name>

# TDDサイクル実行：
```

**🔴 RED - テストファースト**
```typescript
// 1. コマンドテストを最初に書く
// features/user/commands/create-user.spec.ts
describe('createUser command', () => {
  it('should create a user with valid input', async () => {
    const input = { email: 'test@example.com', name: 'Test User' };
    const result = await createUserCmd()(input);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe(input.email);
      expect(result.data.name).toBe(input.name);
    }
  });
});

# テスト実行 → 失敗することを確認
yarn workspace @spa-hono/backend test src/features/user/commands/
```

**🟢 GREEN - 最小実装**
```typescript
// 2. テストを通す最小限のコード
// features/user/commands/create-user.ts
export const createUser = depend(
  { userRepository: {} as UserRepository },
  ({ userRepository }) =>
    async (input: unknown): Promise<Result<User, Error>> => {
      // 最小限の実装でテストを通す
      const validationResult = validateCreateUserInput(input);
      if (isErr(validationResult)) return validationResult;
      
      return userRepository.create(validationResult.data);
    }
);

# テスト実行 → 成功することを確認
yarn workspace @spa-hono/backend test src/features/user/commands/
```

**🔵 BLUE - リファクタリング**
```typescript
// 3. コード品質改善（テストは緑を維持）
// エラーハンドリング改善、ログ追加など
```

#### 2-3. バリデーション強化（TDD）

**🔴 RED - バリデーションテスト**
```typescript
// より多くのテストケースを追加
it('should validate email format', async () => {
  const result = await createUserCmd()({ email: 'invalid', name: 'User' });
  expect(isErr(result)).toBe(true);
});

it('should validate name length', async () => {
  const result = await createUserCmd()({ email: 'test@example.com', name: '' });
  expect(isErr(result)).toBe(true);
});
```

**🟢 GREEN - バリデーション実装**
```typescript
// Zodスキーマでバリデーション強化
```

#### 2-4. APIルート実装（TDD）

**🔴 RED - APIテスト**
```typescript
// features/user/api/routes.spec.ts
describe('User API Routes', () => {
  it('should create user via POST /', async () => {
    const res = await app.request('/', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', name: 'Test' }),
    });
    expect(res.status).toBe(201);
  });
});
```

**🟢 GREEN - ルート実装**
```typescript
// features/user/api/routes.ts - メソッドチェーンパターン使用
```

### Step 3: フロントエンド開発（TDD）

#### 3-1. フィーチャー作成

```bash
yarn create:frontend:feature <feature-name> <entity-name>
```

#### 3-2. APIフック実装（TDD）

**🔴 RED - フックテスト**
```typescript
// features/user-management/api/hooks.spec.ts
describe('useCreateUser', () => {
  it('should create user successfully', async () => {
    // MSWでモックレスポンス設定
    // フック動作テスト
  });
});
```

**🟢 GREEN - フック実装**
```typescript
// features/user-management/api/hooks.ts
export const useCreateUser = () => {
  return useMutation({
    mutationFn: async (input) => {
      // 最小実装
    },
  });
};
```

#### 3-3. UIコンポーネント実装（TDD）

**🔴 RED - コンポーネントテスト**
```typescript
// features/user-management/ui/user-form.spec.tsx
describe('UserForm', () => {
  it('should render form fields', () => {
    render(<UserForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
  
  it('should validate input and submit', () => {
    // フォーム動作テスト
  });
});
```

**🟢 GREEN - コンポーネント実装**
```typescript
// features/user-management/ui/user-form.tsx
export const UserForm = () => {
  // 最小実装でテストを通す
};
```

### Step 4: E2Eテスト

```typescript
// e2e/user-management.spec.ts
test('complete user creation flow', async ({ page }) => {
  await page.goto('/users');
  await page.fill('[data-testid="email-input"]', 'test@example.com');
  await page.fill('[data-testid="name-input"]', 'Test User');
  await page.click('[data-testid="submit-button"]');
  
  await expect(page.locator('[data-testid="user-list"]')).toContainText('Test User');
});
```

## 品質保証チェックリスト

### 各段階での必須チェック

#### バックエンド完了時
```bash
# すべてのテストが通ることを確認
yarn workspace @spa-hono/backend test

# 型チェック
yarn workspace @spa-hono/backend typecheck

# リンター
yarn workspace @spa-hono/backend lint

# 手動API動作確認
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
```

#### フロントエンド完了時
```bash
# すべてのテストが通ることを確認
yarn workspace @spa-hono/frontend test

# 型チェック
yarn workspace @spa-hono/frontend typecheck

# リンター
yarn workspace @spa-hono/frontend lint

# ビルドエラーがないことを確認
yarn workspace @spa-hono/frontend build
```

#### 統合完了時
```bash
# E2Eテスト
yarn test:e2e

# 全体ビルド
yarn build

# 全体テスト
yarn test
```

## TDDベストプラクティス

### 1. テストファースト原則
- **常に**実装前にテストを書く
- **Red**→**Green**→**Blue**サイクルを厳守
- 失敗するテストから始める

### 2. 小さなステップ
- 一度に一つの機能に集中
- 最小限の実装でテストを通す
- 大きなジャンプは避ける

### 3. テストの粒度
- 単体テスト：個別関数・コンポーネント
- 統合テスト：機能全体の動作
- E2Eテスト：ユーザーシナリオ

### 4. リファクタリング指針
- テストが緑の状態でのみリファクタリング
- 機能追加とリファクタリングを分離
- 小さなリファクタリングを頻繁に

### 5. 依存性の管理
- モック・スタブを適切に使用
- 外部依存を最小化
- 依存性注入でテスタビリティ確保

## 効率化テクニック

### 1. スキャフォールディング活用
```bash
# テンプレート生成で時間短縮
yarn create:backend:feature <name>
yarn create:frontend:feature <name>
```

### 2. テストテンプレート
- 共通テストパターンをテンプレート化
- test-utils でテスト環境の統一
- MSW で API モック統一

### 3. 自動化
```bash
# ウォッチモードでリアルタイムフィードバック
yarn workspace @spa-hono/backend test:watch
yarn workspace @spa-hono/frontend test:watch
```

### 4. IDE設定
- テスト実行ショートカット
- 自動フォーマット（Prettier）
- リアルタイム型チェック