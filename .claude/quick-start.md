# 🚀 クイックスタートガイド

5分でフルスタックアプリを動かそう！

## 前提条件

- Node.js 18+とYarnがインストール済み
- TypeScript、React、SQLの基本知識

## 1. 初期セットアップ

```bash
# このテンプレートをクローン/使用
git clone [your-repo-url]
cd [your-project-name]

# 依存関係のインストール
yarn install

# 開発開始
yarn dev
```

アプリが起動しました：
- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:3000/api

## 2. 最初の機能を作成

「Product」機能をステップバイステップで作成してみましょう。

### ステップ1：エンティティの定義

```bash
# エンティティファイルを作成
touch src/entities/product.ts
```

```typescript
// src/entities/product.ts
import type { Entity } from './types';

export interface Product extends Entity {
  name: string;
  price: number;
  description?: string;
}
```

### ステップ2：機能構造の作成

```bash
# 機能ディレクトリを作成
mkdir -p src/features/product/{api,commands,queries,domain}
```

### ステップ3：テストファーストで書く（TDD）

```bash
# テストファイルを作成
touch src/features/product/commands/create-product.spec.ts
```

既存の`user`機能を参考にテスト例を確認してください！

### ステップ4：機能の実装

この順序で実装してください：
1. **Domain**：リポジトリインターフェースと実装
2. **Commands**：書き込み操作（create、update、delete）
3. **Queries**：読み込み操作（get、list）
4. **API Routes**：HTTPエンドポイント

### ステップ5：ルートを追加

```bash
# server.tsにルートを追加
```

## 3. 一般的なタスク

### 新しいAPIエンドポイントの追加

1. `src/features/[feature]/api/routes.ts`にルートを追加
2. メソッドチェーンパターンを使用
3. 一貫したレスポンス形式を返す

### テストの実行

```bash
# すべてのテストを実行
yarn test

# ウォッチモードでテストを実行
yarn test --watch

# 特定のテストファイルを実行
yarn test user.spec
```

### データベースマイグレーション

データベーススキーマは`src/server.ts`で自動的に作成されます。新しいテーブルを追加するには：

```typescript
// src/server.ts内で
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);
```

## 4. ベストプラクティス チェックリスト

✅ **コードを書く前に：**
- [ ] テストファーストで書く（TDD）
- [ ] コードベースの既存パターンを確認
- [ ] 機能構造を計画

✅ **コーディング中：**
- [ ] すべての関数が`Result<T, E>`を返す
- [ ] 例外を投げない
- [ ] FSD構造に従う
- [ ] ビジネスロジックはcommands/queriesに保持

✅ **コーディング後：**
- [ ] `yarn lint`を実行
- [ ] `yarn typecheck`を実行
- [ ] `yarn test`を実行
- [ ] すべてのテストが通ることを確認

## 5. クイックリファレンス

### ファイル命名

- テスト：`*.spec.ts`
- ルート：`api/routes.ts`
- コマンド：`commands/[action]-[entity].ts`
- クエリ：`queries/get-[entities].ts`

### ステータスコード

- `200` - 成功（GET）
- `201` - 作成（POST）
- `400` - Bad Request（バリデーション）
- `500` - サーバーエラー（データベース）

### レスポンス形式

```typescript
// 成功
{ users: User[] }      // コレクション
{ user: User }         // 単一

// エラー
{ error: string }      // すべてのエラー
```

## さらにヘルプが必要？

- 例については既存の`user`機能を確認
- パターンについては[アーキテクチャ概要](./architecture.md)を参照
- テストパターンについては[テストガイド](./testing.md)を参照
- API開発については[バックエンドガイド](./backend.md)を参照
- Reactパターンについては[フロントエンドガイド](./frontend.md)を参照