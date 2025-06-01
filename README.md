# SPA Hono

Feature Sliced Design (FSD)、CQRS、Railway Result型、Velona DIを採用したフルスタックモノレポ。

[English README](./README.en.md)

## 🚀 機能

- **バックエンド**: Honoサーバー（SQLite、FSD、CQRS、Railway Resultパターン）
- **フロントエンド**: React + Vite + TanStack Query（Feature-Sliced Design）
- **型安全性**: Hono RPCクライアントによるエンドツーエンドのTypeScript（strictモード）
- **テスト**: テスト駆動開発（TDD）、Vitest + Playwright E2E
- **開発体験**: ホットリロード、並行開発、包括的なツール群

## 📁 プロジェクト構造

```
/
├── backend/          # Honoサーバー（FSD + CQRS）
│   └── src/
│       ├── features/         # 機能モジュール
│       │   └── [feature]/
│       │       ├── commands/ # 書き込み操作（Railway Result）
│       │       ├── queries/  # 読み込み操作
│       │       ├── domain/   # ビジネスロジック + Repository
│       │       └── api/      # HTTPエンドポイント（Hono）
│       ├── shared/
│       │   └── adapters/
│       │       ├── db/       # データベースアダプター
│       │       └── external/ # 外部サービス
│       ├── entities/         # 共有ビジネスエンティティ
│       └── server.ts         # Honoアプリケーション
└── frontend/         # Reactアプリ（FSD）
    └── src/
        ├── app/              # アプリケーション初期化
        │   └── providers/    # グローバルプロバイダー
        ├── features/         # 機能モジュール
        │   └── [feature]/
        │       ├── api/      # APIフック（TanStack Query）
        │       ├── ui/       # UIコンポーネント
        │       └── model/    # ローカル状態管理（オプション）
        ├── shared/
        │   ├── ui/           # 再利用可能UIコンポーネント
        │   ├── lib/          # 共通ライブラリ（API client等）
        │   └── types/        # 共有型定義
        ├── widgets/          # 複合ウィジェット
        └── pages/            # ページコンポーネント
```

## 🛠️ はじめに

### 前提条件

- Node.js 18以上
- Yarn 1.22以上

### インストール

```bash
# リポジトリのクローン
git clone <your-repo-url>
cd spa-hono

# 依存関係のインストール
yarn install

# 開発サーバーの起動
yarn dev
```

アプリケーションは以下のURLで利用可能です：
- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:3000

## 📝 利用可能なスクリプト

### モノレポコマンド

```bash
# 開発
yarn dev          # 両サーバーを同時起動
yarn build        # 全プロジェクトをビルド
yarn test         # 全テストを実行
yarn test:e2e     # PlaywrightでE2Eテストを実行
yarn lint         # 全プロジェクトでESLintを実行
yarn typecheck    # 全プロジェクトでTypeScript型チェック

# 個別ワークスペース
yarn workspace @spa-hono/backend dev    # バックエンドのみ
yarn workspace @spa-hono/frontend dev   # フロントエンドのみ
```

## 🏗️ アーキテクチャ

### バックエンド
- **Hono**: RPC機能を備えた軽量Webフレームワーク
- **SQLite**: better-sqlite3による組み込みデータベース
- **Feature-Sliced Design**: 垂直機能編成
- **CQRS**: コマンドクエリ責務分離
- **Railway Result**: 関数型エラーハンドリング
- **Velona**: 依存性注入
- **TypeScript**: Strictモード

### フロントエンド
- **React**: UIライブラリ
- **Vite**: HMR対応ビルドツール
- **TanStack Query**: サーバー状態管理
- **Feature-Sliced Design**: スケーラブルなフロントエンドアーキテクチャ
- **Hono RPCクライアント**: 型安全なAPI通信
- **Tailwind CSS**: ユーティリティファーストCSSフレームワーク

### テスト
- **Vitest**: ユニット・統合テスト
- **Playwright**: エンドツーエンドテスト
- **MSW**: フロントエンドテスト用APIモック

## 🧪 テスト

```bash
# 全テストを実行
yarn test

# バックエンドテストを実行
yarn workspace @spa-hono/backend test

# フロントエンドテストを実行
yarn workspace @spa-hono/frontend test

# E2Eテストを実行
yarn test:e2e

# ウォッチモード
yarn test:watch
```

## 🔧 開発パターン

### バックエンド開発

1. **CQRSパターン**: コマンド（書き込み）とクエリ（読み込み）を分離
2. **Railway Result**: 一貫したエラーハンドリングのため全関数が`Result<T, E>`を返す
3. **依存性注入**: テスタブルなコードのためVelonaの`depend`を使用
4. **リポジトリパターン**: データベース操作を抽象化

例：
```typescript
// バリデーション付きコマンド
export const createUser = depend(
  { userRepo },
  async ({ userRepo }, input) => {
    if (!input.email.includes('@')) {
      return err(new Error('Invalid email'));
    }
    return userRepo.create(input);
  }
);
```

### フロントエンド開発

1. **Feature-Sliced Design**: ファイルタイプではなく機能で整理
2. **APIフック**: サーバー状態にはTanStack Queryを使用
3. **型安全性**: エンドツーエンドの型のためHono RPCクライアントを活用
4. **コンポーネント階層**: `shared/ui` → `features` → `widgets` → `pages`

例：
```typescript
// TanStack QueryによるAPIフック
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.api.users.$get();
      return response.json();
    },
  });
};
```

## 📚 ドキュメント

詳細な開発パターンとガイドラインについては[CLAUDE.md](./CLAUDE.md)を参照してください。

## 🤝 コントリビューション

1. リポジトリをフォーク
2. フィーチャーブランチを作成（`git checkout -b feature/amazing-feature`）
3. テストを先に書く（TDD）
4. 変更をコミット（`git commit -m 'Add some amazing feature'`）
5. ブランチにプッシュ（`git push origin feature/amazing-feature`）
6. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下でライセンスされています。

## 🙏 謝辞

以下の素晴らしい技術で構築されています：
- [Hono](https://hono.dev/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TanStack Query](https://tanstack.com/query)
- [Railway Result](https://github.com/fyuuki0jp/railway-result)
- [Velona](https://github.com/frouriojs/velona)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [Tailwind CSS](https://tailwindcss.com/)