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
2. **MCPツール**で包括的テスト設計
3. **バックエンド**：エンティティ → コマンド/クエリ → APIルート（すべてTDD）
4. **フロントエンド**：APIフック → UIコンポーネント（すべてTDD）
5. **E2Eテスト**：ユーザーシナリオの統合確認
6. **カバレッジ確認**：Vitestカバレッジで品質保証

詳細は → [📋 TDD開発ワークフロー](.claude/templates/tdd-workflow.md)

## 🔧 基本コマンド

```bash
# 開発サーバー（両方同時起動）
yarn dev          # Backend:3000, Frontend:5173

# テスト（TDD開発で頻繁に使用）
yarn test                                # 全テスト実行
yarn workspace backend test:watch       # バックエンドウォッチ
yarn workspace frontend test:watch      # フロントエンドウォッチ

# カバレッジ測定（品質確認）
yarn workspace backend test:coverage    # バックエンドカバレッジ
yarn workspace frontend test:coverage   # フロントエンドカバレッジ

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
yarn workspace backend test
yarn workspace backend test:coverage    # カバレッジ確認
yarn workspace backend typecheck  
yarn workspace backend lint

# フロントエンド完了時
yarn workspace frontend test
yarn workspace frontend test:coverage   # カバレッジ確認
yarn workspace frontend typecheck
yarn workspace frontend lint

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

## 🔍 MCPツール最大活用TDD実践ガイド

### 🎯 **Phase 1: 要件分析・設計フェーズ**

#### 1.1 TodoWriteでタスク管理開始
```bash
# Claude Codeでタスクを構造化
TodoWrite: 
- 要件分析とエンティティ設計
- MCPツールでテスト設計
- バックエンド実装（TDD）
- フロントエンド実装（TDD）
- E2E統合テスト
- カバレッジ品質確認
```

#### 1.2 MCPツールで包括的テスト設計
```bash
# 1. 決定表でビジネスロジック網羅性確認
# MCPツール: create_decision_table
- 入力フィールドの制約定義
- 境界値・同値クラステスト生成
- エラーケース・例外処理の洗い出し
- クロスフィールド依存関係の検証

# 2. 自動テスト生成
# MCPツール: generate_tests 
- Vitestテストファイル自動生成
- 境界値テスト（min/max values）
- 同値クラステスト（valid/invalid inputs）
- エラーハンドリングテスト
```

### 🏗️ **Phase 2: バックエンド実装フェーズ（TDD）**

#### 2.1 エンティティ駆動設計
```bash
# スキャフォールディング生成
yarn create:backend:entity product

# MCPで包括的テスト設計
# .decision-tables/product-validation-table.json 生成
# → 28種類のテストケース自動生成（境界値・同値クラス・エラー）
```

#### 2.2 TDDサイクル実行
```bash
# 🔴 RED: テストファースト実装
# 1. MCPツールで生成されたテストを適用
# 2. エンティティバリデーションテスト追加
yarn workspace backend test:watch src/entities/product/

# 🟢 GREEN: 最小実装でテスト通過
# 1. Zodスキーマ定義
# 2. Branded Types適用
# 3. Railway Result実装

# 🔵 BLUE: リファクタリング
# テストが緑のままコード品質向上
```

#### 2.3 CQRS実装（コマンド・クエリ）
```bash
# 機能スキャフォールディング
yarn create:backend:feature product-management product

# MCPテスト適用でTDDサイクル
# 🔴 RED → 🟢 GREEN → 🔵 BLUE

# コマンド実装（create-product.ts/.spec.ts）
# クエリ実装（get-products.ts/.spec.ts）
# APIルート実装（routes.ts/.spec.ts）
```

### 🎨 **Phase 3: フロントエンド実装フェーズ（TDD）**

#### 3.1 APIファースト設計
```bash
# フィーチャー生成
yarn create:frontend:feature product-management product

# MCPテストパターン適用
# 1. APIフック包括テスト（成功・エラー・バリデーション）
# 2. UIコンポーネント状態テスト（ローディング・エラー・成功）
# 3. フォームバリデーションテスト（リアルタイム・送信時）
```

#### 3.2 コンポーネントTDD
```bash
# 🔴 RED: UIテストファースト
yarn workspace frontend test:watch src/features/product-management/

# APIフック → フォーム → リスト の順でTDD実装
# 各コンポーネントでMCPパターン適用
```

### 📊 **Phase 4: 品質保証・カバレッジフェーズ**

#### 4.1 カバレッジ測定・分析
```bash
# バックエンドカバレッジ確認
yarn workspace backend test:coverage
# → HTML レポート: backend/coverage/index.html

# フロントエンドカバレッジ確認  
yarn workspace frontend test:coverage
# → HTML レポート: frontend/coverage/index.html

# カバレッジ閾値: branches/functions/lines/statements >= 80%
```

#### 4.2 MCPカバレッジ分析活用
```bash
# MCPツール: analyze_coverage
# - 未テスト領域の特定
# - 不足テストケースの提案
# - テスト品質の評価
# - 追加テスト自動生成
```

### 🔄 **Phase 5: 統合・E2Eテストフェーズ**

#### 5.1 E2Eシナリオテスト
```bash
# Playwright E2Eテスト実行
yarn test:e2e

# 失敗時デバッグモード
yarn test:e2e:ui
```

#### 5.2 最終品質チェック
```bash
# 統合品質確認
yarn lint && yarn typecheck && yarn build && yarn test

# 全テスト + カバレッジ + 静的解析 の完全チェック
```

## 📈 **MCPツール活用による開発効率向上**

### 🎯 テスト設計の劇的効率化
- **従来**: 手動でテストケース設計（1-2時間）
- **MCP活用後**: 自動生成 + 包括性確認（10-15分）

### 🔍 網羅性の大幅向上  
- **境界値テスト**: 自動生成で漏れなし
- **同値クラステスト**: ビジネスロジック完全カバー
- **エラーケース**: 例外処理の抜け漏れ防止
- **クロスフィールド**: 複雑な依存関係も対応

### 💎 コード品質の向上
- **カバレッジ**: 80%以上の高品質維持
- **テストファースト**: MCPで設計→実装の確実な順序
- **リファクタリング安全性**: 包括テストによる安心感

## 🚀 実践的TDD開発例

### バックエンド機能追加の完全フロー

```bash
# 1. 要件をTodoWriteで構造化
TodoWrite: 
to memorize

# 2. エンティティ作成
yarn create:backend:entity product

# 3. MCPで決定表生成・テスト設計
create_decision_table: product-validation with constraints

# 4. 自動テストファイル生成
generate_tests: Vitest format with 25+ test cases

# 5. TDDサイクル（エンティティ）
yarn workspace backend test:watch src/entities/product/
# 🔴 RED → 🟢 GREEN → 🔵 BLUE

# 6. 機能実装
yarn create:backend:feature product-management product

# 7. TDDサイクル（CQRS）
yarn workspace backend test:watch src/features/product-management/
# コマンド → クエリ → APIルート

# 8. カバレッジ確認
yarn workspace backend test:coverage
# 100%カバレッジ達成確認
```

### フロントエンド機能追加の完全フロー

```bash
# 1. フィーチャー作成
yarn create:frontend:feature product-management product

# 2. APIフックTDD
yarn workspace frontend test:watch src/features/product-management/api/
# 🔴 RED → 🟢 GREEN → 🔵 BLUE

# 3. UIコンポーネントTDD  
yarn workspace frontend test:watch src/features/product-management/ui/
# フォーム → リスト → 詳細

# 4. カバレッジ確認
yarn workspace frontend test:coverage
# 85%以上のカバレッジ確認

# 5. E2E統合テスト
yarn test:e2e
# ユーザーシナリオ完全確認
```

## ⚡ 効率化のための重要な指針

### 1. **ウォッチモード活用**
開発中は常にテストウォッチモードを実行：
```bash
yarn workspace backend test:watch
yarn workspace frontend test:watch  
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
yarn workspace backend test --reporter=verbose
yarn workspace frontend test --reporter=verbose
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

## 🛠️ **MCPツール詳細リファレンス**

### 📊 決定表作成 (create_decision_table)
```typescript
// 使用例: ユーザー登録機能の包括的テスト設計
{
  "name": "user-registration-validation",
  "feature": "user-management", 
  "operation": "create-user",
  "inputFields": [
    {
      "name": "email",
      "type": "input",
      "dataType": "string",
      "constraints": {
        "required": true,
        "pattern": "^[^@]+@[^@]+\\.[^@]+$",
        "maxLength": 254
      }
    },
    {
      "name": "password", 
      "type": "input",
      "dataType": "string",
      "constraints": {
        "required": true,
        "minLength": 8,
        "maxLength": 128,
        "pattern": "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$"
      }
    }
  ],
  "autoGenerate": true,
  "coverageOptions": {
    "boundary": true,      // 境界値テスト
    "equivalence": true,   // 同値クラステスト  
    "errorCombinations": true, // エラーケース組み合わせ
    "crossField": true     // フィールド間依存関係
  }
}
```

### 🧪 テスト生成 (generate_tests)
```bash
# MCPで生成されたテストファイルの活用
# → 28種類のテストケース自動生成
# → 境界値・同値クラス・エラーハンドリング完全カバー
# → Vitest形式で即座に実行可能
```

### 📈 カバレッジ分析 (analyze_coverage)
```bash
# テスト品質の詳細分析
# → 未テスト領域の特定
# → 不足テストケースの具体的提案
# → テスト改善案の自動生成
```

## 🎯 **TDD + MCP 開発効率指標**

### ⏱️ 開発時間短縮効果
- **エンティティ設計**: 50% 時間短縮（自動テスト生成）
- **バリデーション実装**: 70% 時間短縮（包括パターン適用）
- **品質確認**: 80% 時間短縮（自動カバレッジ分析）

### 📊 品質向上指標
- **テストカバレッジ**: 80%+ 維持（自動閾値管理）
- **バグ密度**: 60% 減少（包括的事前テスト）
- **リファクタリング安全性**: 95% 向上（完全テスト保護）

### 🚀 **次世代TDD開発の実現**

このプロジェクトテンプレートとMCPツールにより、従来の手動TDDを大幅に進化させた**自動化TDD開発**が可能になります：

1. **設計フェーズ**: MCPで包括的テスト自動生成
2. **実装フェーズ**: テストファースト + スキャフォールディング活用
3. **品質フェーズ**: 自動カバレッジ + 静的解析
4. **統合フェーズ**: E2E + 品質指標達成確認

**結果**: 高品質・高速・高安全性の次世代Web開発が実現されます。

---

**このガイドにより、MCPツールとTDDを最大限活用した革新的開発手法で、従来の数倍の効率性と品質を実現できます。**