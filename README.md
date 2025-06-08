# フルスタック TypeScript テンプレート

Test-Driven Development (TDD)、Feature-Sliced Design (FSD)、CQRS、Railway Result パターンを採用したモダンなフルスタック TypeScript モノレポテンプレート。

[English](./README.en.md)

## 🚀 特徴

- **バックエンド**: Hono + SQLite + Drizzle ORM + Railway Result パターン
- **フロントエンド**: React + Vite + TanStack Query + Tailwind CSS
- **アーキテクチャ**: Feature-Sliced Design (FSD) + CQRS
- **開発手法**: Test-Driven Development (TDD) - Red-Green-Refactor
- **型安全**: エンドツーエンドの TypeScript + Zod バリデーション
- **DI**: Velona による依存性注入

## 🏗️ プロジェクト構造

```
backend/src/
├── features/[feature]/     # 機能モジュール（CQRS）
│   ├── commands/           # 書き込み操作
│   ├── queries/            # 読み込み操作  
│   ├── domain/             # ビジネスロジック
│   └── api/                # HTTPエンドポイント
├── entities/               # ドメインエンティティ（Zod + Branded Types）
└── shared/adapters/        # DB・外部サービスアダプター

frontend/src/
├── features/[feature]/     # 機能モジュール（FSD）
│   ├── api/                # APIフック（TanStack Query）
│   ├── ui/                 # UIコンポーネント
│   └── model/              # ローカル状態管理
├── shared/                 # 共有リソース
├── widgets/                # 複合UIコンポーネント
└── pages/                  # ページコンポーネント
```

## 🚀 クイックスタート

```bash
# 依存関係のインストール
yarn install

# 開発サーバー起動（Backend: 3000, Frontend: 5173）
yarn dev

# テスト実行（TDD）
yarn test
yarn workspace backend test:watch
yarn workspace frontend test:watch

# 品質チェック
yarn lint
yarn typecheck
yarn build
```

## 📝 開発コマンド

### 基本コマンド
```bash
yarn dev                    # 開発サーバー起動
yarn test                   # 全テスト実行
yarn test:e2e              # E2Eテスト実行
yarn lint                  # ESLint
yarn typecheck             # 型チェック
yarn build                 # ビルド
```

### コード生成
```bash
# バックエンド
yarn create:backend:entity <name>
yarn create:backend:feature <feature> [entity]

# フロントエンド
yarn create:frontend:feature <feature> [entity]
yarn create:frontend:widget <name>
```

### カバレッジ確認
```bash
yarn workspace backend test:coverage
yarn workspace frontend test:coverage
```

## 🎯 開発規約

### 1. TDD（テスト駆動開発）必須
```
1. 🔴 RED   - 失敗するテストを書く
2. 🟢 GREEN - テストを通す最小限のコードを書く
3. 🔵 BLUE  - リファクタリング
```

### 2. Railway Result パターン
```typescript
// ✅ 正しい実装
export const createUser = async (input: unknown): Promise<Result<User, Error>> => {
  const validation = validateCreateUserInput(input);
  if (isErr(validation)) return validation;
  // ...
};

// ❌ 例外を投げない
throw new Error('...'); // 禁止
```

### 3. Zod によるバリデーション
```typescript
// Branded Types を使用
export const UserIdSchema = z.string().uuid().brand<'UserId'>();
export type UserId = z.infer<typeof UserIdSchema>;
```

### 4. Velona による DI
```typescript
export const UserEntity = depend({ db: {} as DrizzleDb }, ({ db }) => ({
  async create(input: CreateUserInput): Promise<Result<User, Error>> {
    // 実装
  }
}));
```

## 📊 品質基準

- **テストカバレッジ**: 80% 以上（branches, functions, lines, statements）
- **型安全**: strict モード、`any` 禁止
- **エラーハンドリング**: Railway Result パターン必須
- **バリデーション**: すべての外部入力に Zod 使用

## 🛠️ 技術スタック

### バックエンド
- [Hono](https://hono.dev/) - 軽量 Web フレームワーク
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [Railway Result](https://github.com/fyuuki0jp/railway-result) - 関数型エラーハンドリング
- [Velona](https://github.com/frouriojs/velona) - 依存性注入
- [Zod](https://zod.dev/) - スキーマバリデーション

### フロントエンド
- [React](https://react.dev/) - UI ライブラリ
- [Vite](https://vitejs.dev/) - ビルドツール
- [TanStack Query](https://tanstack.com/query) - サーバー状態管理
- [Tailwind CSS](https://tailwindcss.com/) - CSS フレームワーク

### テスト
- [Vitest](https://vitest.dev/) - ユニットテスト
- [Playwright](https://playwright.dev/) - E2E テスト
- [MSW](https://mswjs.io/) - API モック

## 📄 ライセンス

MIT