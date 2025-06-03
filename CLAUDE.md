# TDD開発ガイド - SPA Hono Monorepo

このファイルは、Claude Code（claude.ai/code）がこのリポジトリでテスト駆動開発（TDD）を行う際のガイダンスを提供します。

## プロジェクト概要

Feature Sliced Design（FSD）、CQRS、Railway Result型、Velona DIを採用したフルスタックモノレポ。
**TDD（テスト駆動開発）**を基本開発手法として採用しています。

- **バックエンド**: HonoサーバーでCQRS + Railway Result + Velona DI
- **フロントエンド**: React + Vite + TanStack Query + FSD
- **開発手法**: Red-Green-Refactor TDDサイクル

## 🚀 TDD開発手順（必須）

### 基本原則：**テストファースト**

すべての機能実装は以下の順序で実行してください：

```
1. 🔴 RED   → 失敗するテストを書く
2. 🟢 GREEN → テストを通す最小限のコードを書く  
3. 🔵 BLUE  → テストが緑のままでリファクタリング
```

### 新機能開発の標準フロー

1. **TodoWrite**でタスクを分解・管理
2. **バックエンド**：エンティティ → コマンド/クエリ → APIルート（すべてTDD）
3. **フロントエンド**：APIフック → UIコンポーネント（すべてTDD）
4. **E2Eテスト**：ユーザーシナリオの統合確認

詳細は → [📋 TDD開発ワークフロー](.claude/templates/tdd-workflow.md)

## 🔧 基本コマンド

```bash
# 開発サーバー（両方同時起動）
yarn dev          # Backend:3000, Frontend:5173

# テスト（TDD開発で頻繁に使用）
yarn test                                    # 全テスト実行
yarn workspace @spa-hono/backend test:watch # バックエンドウォッチ
yarn workspace @spa-hono/frontend test:watch # フロントエンドウォッチ

# 品質チェック（コミット前必須）
yarn lint         # ESLintチェック
yarn typecheck    # TypeScript型チェック
yarn build        # 本番ビルド確認

# E2Eテスト
yarn test:e2e     # Playwright E2Eテスト
```

すべてのコマンド詳細 → [🛠️ ツール・コマンドリファレンス](.claude/reference/tools-commands.md)

## 📂 プロジェクト構造

モノレポ構造とFeature-Sliced Design（FSD）を採用：

```
backend/src/
├── features/[feature]/    # 機能モジュール（CQRS）
│   ├── commands/         # 書き込み操作（TDD必須）
│   ├── queries/          # 読み込み操作（TDD必須）
│   ├── domain/           # ビジネスロジック + Repository
│   └── api/              # HTTPエンドポイント（TDD必須）
├── entities/             # 共有ビジネスエンティティ（Zod + Branded Types）
└── shared/adapters/      # DB・外部サービス

frontend/src/
├── features/[feature]/   # 機能モジュール（FSD）
│   ├── api/              # APIフック（TanStack Query + TDD必須）
│   ├── ui/               # UIコンポーネント（TDD必須）
│   └── model/            # ローカル状態管理
├── shared/               # 再利用可能リソース
├── widgets/              # 複合UI
└── pages/                # ページコンポーネント
```

詳細構造 → [🏗️ プロジェクト構造リファレンス](.claude/reference/project-structure.md)

## 🎯 開発時の行動規範

### 1. **必須：TDDサイクル遵守**

- **絶対に**実装前にテストを書く
- Red→Green→Blueサイクルを厳密に実行
- テストが失敗することから始める

### 2. **品質保証チェックリスト**

各段階で以下を必ず実行：

```bash
# バックエンド完了時
yarn workspace @spa-hono/backend test
yarn workspace @spa-hono/backend typecheck  
yarn workspace @spa-hono/backend lint

# フロントエンド完了時
yarn workspace @spa-hono/frontend test
yarn workspace @spa-hono/frontend typecheck
yarn workspace @spa-hono/frontend lint

# 統合完了時
yarn test:e2e
yarn build
yarn test
```

### 3. **スキャフォールディング活用**

効率的な開発のためにツールを活用：

```bash
# バックエンド
yarn create:backend:entity <entity-name>
yarn create:backend:feature <feature-name> [entity-name]

# フロントエンド  
yarn create:frontend:feature <feature-name> [entity-name]
yarn create:frontend:widget <widget-name>
```

### 4. **コード規約遵守**

- **Railway Result**: すべての関数は`Result<T, E>`を返す（ESLint強制）
- **Zodバリデーション**: 入力は必ずZodスキーマで検証
- **Branded Types**: ドメイン固有IDと値にブランド型使用
- **Honoメソッドチェーン**: API ルートは必ずメソッドチェーンパターン

## 📚 実装パターン・サンプルコード

実装時は以下のパターンを参照してください：

### バックエンドパターン
- [🏛️ エンティティパターン](.claude/examples/backend/entity-patterns.md) - Zod + Branded Types
- [✍️ コマンドパターン](.claude/examples/backend/command-patterns.md) - CQRS書き込み操作
- [🔍 クエリパターン](.claude/examples/backend/query-patterns.md) - CQRS読み込み操作  
- [🌐 APIルートパターン](.claude/examples/backend/api-route-patterns.md) - Honoルート実装

### フロントエンドパターン
- [🎣 APIフックパターン](.claude/examples/frontend/api-hook-patterns.md) - TanStack Query + Zod検証

### 参照情報
- [🏗️ プロジェクト構造](.claude/reference/project-structure.md)
- [📦 依存関係](.claude/reference/dependencies.md)
- [🛠️ ツール・コマンド](.claude/reference/tools-commands.md)

## 🔍 TDD実践例

### バックエンド機能追加の流れ

```bash
# 1. エンティティ作成（TDD）
yarn create:backend:entity product

# 2. 機能作成（TDD）
yarn create:backend:feature product-management product

# 3. TDDサイクル実行
# 🔴 RED: テスト作成
# features/product/commands/create-product.spec.ts
describe('createProduct command', () => {
  it('should create product with valid input', async () => {
    // テストコード
  });
});

# テスト実行 → 失敗確認
yarn workspace @spa-hono/backend test src/features/product/commands/

# 🟢 GREEN: 最小実装
# features/product/commands/create-product.ts でテストを通す

# 🔵 BLUE: リファクタリング（テストは緑のまま）
```

### フロントエンド機能追加の流れ

```bash
# 1. フィーチャー作成（TDD）
yarn create:frontend:feature product-management product

# 2. TDDサイクル実行
# 🔴 RED: APIフックテスト
# features/product-management/api/hooks.spec.ts

# 🟢 GREEN: フック実装
# features/product-management/api/hooks.ts

# 🔴 RED: UIコンポーネントテスト  
# features/product-management/ui/product-form.spec.tsx

# 🟢 GREEN: コンポーネント実装
# features/product-management/ui/product-form.tsx
```

## ⚡ 効率化のための重要な指針

### 1. **ウォッチモード活用**
開発中は常にテストウォッチモードを実行：
```bash
yarn workspace @spa-hono/backend test:watch
yarn workspace @spa-hono/frontend test:watch  
```

### 2. **小さなステップ**
- 一度に一つの機能に集中
- 大きなジャンプは避ける
- 頻繁にコミット

### 3. **依存性注入**
- Velonaでテスタビリティ確保
- モック・スタブ適切に使用
- 外部依存の最小化

### 4. **エラーハンドリング**
- すべてのパスをテスト（成功・バリデーションエラー・インフラエラー）
- Railway Resultパターン徹底
- 例外を投げずに明示的なエラー返却

## 🚨 重要な注意事項

### **絶対に守ること**
1. **テストファースト**：実装前に必ずテストを書く
2. **Result型必須**：すべての関数でRailway Resultパターン使用
3. **品質チェック**：コミット前にlint・typecheck・test実行
4. **メソッドチェーン**：HonoルートはメソッドチェーンパターンのみOK

### **禁止事項** 
- ❌ テストなしでの実装
- ❌ 例外throw（Result型を使用）
- ❌ Honoルートの個別宣言
- ❌ バリデーションなしの入力処理

## 🆘 トラブルシューティング

### テスト失敗時
```bash
# 詳細なエラー情報表示
yarn workspace @spa-hono/backend test --reporter=verbose
yarn workspace @spa-hono/frontend test --reporter=verbose
```

### 型エラー時
```bash
# 厳密な型チェック
yarn typecheck
```

### E2Eテスト失敗時
```bash
# ブラウザUIモードでデバッグ
yarn test:e2e:ui
```

---

**このガイドにより、高品質で保守性の高いコードを効率的に開発できます。TDDを中心とした開発手法で、安全で迅速な機能追加を実現してください。**
