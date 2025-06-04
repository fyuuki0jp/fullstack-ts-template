# 依存関係リファレンス

## コア技術スタック

### バックエンド
- **Hono** - Webフレームワーク
- **@fyuuki0jp/railway-result** - Result型パターン実装
- **velona** - 依存性注入ライブラリ
- **better-sqlite3** - SQLiteドライバー
- **@electric-sql/pglite** - テスト用PostgreSQL
- **drizzle-orm** - TypeScript ORM
- **zod** - スキーマバリデーション
- **tsx** - TypeScript実行環境
- **vitest** - テストフレームワーク

### フロントエンド
- **React** - UIライブラリ
- **Vite** - ビルドツール・開発サーバー
- **@tanstack/react-query** - サーバー状態管理
- **@generouted/react-router** - ファイルベースルーティング
- **hono/client** - 型安全APIクライアント
- **tailwindcss** - CSSフレームワーク
- **zod** - フロントエンドバリデーション
- **vitest** - テストフレームワーク
- **@testing-library/react** - React テスティングライブラリ
- **msw** - モックサーバー

### 共通開発ツール
- **TypeScript** - 言語（strictモード）
- **ESLint** - リンター
- **@fyuuki0jp/eslint-plugin-railway** - Railway Result用ESLint
- **Prettier** - コードフォーマッター
- **Playwright** - E2Eテスト

## パッケージマネージャー

```bash
yarn@1.22.19  # Yarn Classic使用
```

## 主要なバージョン

```json
{
  "typescript": "^5.8.3",
  "hono": "^4.7.10",
  "react": "^19.1.0",
  "vitest": "^3.1.4",
  "zod": "^3.25.49"
}
```

## Import エイリアス

### バックエンド
```typescript
// vitest.config.ts
'@': './src'
```

### フロントエンド
```typescript
// vitest.config.ts
'@': path.resolve(__dirname, './src'),
'@backend': path.resolve(__dirname, '../backend/src')
```

## ESLint 設定

### Railway Result 強制
```javascript
// .eslint.config.mjs
export [
  railway.configs.recommended
]
```

すべてのコマンド・クエリ・リポジトリ関数は必ず`Result<T, E>`を返すことが強制される。