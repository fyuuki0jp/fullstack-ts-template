# ツール・コマンドリファレンス

## 基本コマンド

### モノレポ全体
```bash
yarn dev          # 両サーバー同時起動（backend:3000, frontend:5173）
yarn build        # 全プロジェクトビルド
yarn test         # 全テスト実行
yarn lint         # 全ESLint実行
yarn typecheck    # 全TypeScript型チェック

# E2Eテスト
yarn test:e2e     # Playwright E2Eテスト実行
yarn test:e2e:ui  # Playwright UI モードでテスト実行
yarn test:install # Playwright ブラウザーインストール
```

### 個別実行
```bash
yarn workspace @spa-hono/backend dev      # バックエンドのみ
yarn workspace @spa-hono/frontend dev     # フロントエンドのみ
yarn workspace @spa-hono/backend test     # バックエンドテストのみ
yarn workspace @spa-hono/frontend test    # フロントエンドテストのみ
```

## スキャフォールディングツール

### バックエンド機能生成
```bash
# 基本パターン
yarn create:backend:entity <entity-name>
yarn create:backend:feature <feature-name> [entity-name]
yarn create:backend:adapter <adapter-name>

# 例
yarn create:backend:entity user
yarn create:backend:feature user-management user
yarn create:backend:adapter redis

# ドライラン（ファイル作成前にプレビュー）
yarn create:backend:feature product --dry-run
```

### フロントエンド機能生成
```bash
# 基本パターン
yarn create:frontend:feature <feature-name> [entity-name]
yarn create:frontend:page <page-name>
yarn create:frontend:ui <component-name>
yarn create:frontend:widget <widget-name>

# 例
yarn create:frontend:feature user-creation user
yarn create:frontend:page home
yarn create:frontend:ui modal
yarn create:frontend:widget user-dashboard

# ドライラン
yarn create:frontend:feature product-list product --dry-run
```

## テストコマンド

### 単体テスト
```bash
# 通常実行
yarn test

# ウォッチモード
yarn workspace @spa-hono/backend test:watch
yarn workspace @spa-hono/frontend test:watch

# 特定のテストファイル
yarn workspace @spa-hono/backend test src/features/user/
yarn workspace @spa-hono/frontend test src/features/user-creation/
```

### テスト環境
```bash
# テスト用サーバー起動（メモリDB使用）
yarn dev:test

# テスト用環境変数
NODE_ENV=test DATABASE_MODE=memory
```

## データベース管理（Drizzle）

```bash
# スキーマからマイグレーション生成
yarn workspace @spa-hono/backend drizzle:generate

# マイグレーション実行
yarn workspace @spa-hono/backend drizzle:migrate

# データベーススキーマを直接プッシュ（開発用）
yarn workspace @spa-hono/backend drizzle:push

# Drizzle Studio（データベースGUI）
yarn workspace @spa-hono/backend drizzle:studio
```

## 開発サーバー

### 通常開発
```bash
yarn dev
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

### ネットワーク公開
```bash
# フロントエンドをネットワークに公開
yarn workspace @spa-hono/frontend dev
# --host フラグが自動で有効
```

## コード品質

### リンター・フォーマッター
```bash
yarn lint              # ESLint実行
yarn format            # Prettier フォーマット実行
yarn format:check      # Prettier チェックのみ
yarn typecheck         # TypeScript型チェック
```

### Git フック（推奨）
```bash
# pre-commit でリンター・フォーマッター実行
# husky設定でコミット前に自動実行
```

## 環境固有設定

### 開発環境
- SQLite（WALモード）
- ホットリロード有効
- 詳細ログ出力

### テスト環境
- PGLite（インメモリPostgreSQL）
- 高速実行
- 分離されたデータベース

### 本番環境
- PostgreSQL/MySQL/SQLite
- 最適化されたビルド
- エラーログのみ