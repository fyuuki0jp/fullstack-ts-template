# プロジェクト構造リファレンス

## モノレポ構造

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

## ディレクトリ命名規則

### バックエンド
- **features/[feature-name]** - kebab-case（例：user-management）
- **entities/[entity-name]** - single noun, kebab-case（例：user, product）
- **commands/** - 動詞-名詞形式（例：create-user.ts）
- **queries/** - get-名詞形式（例：get-users.ts）

### フロントエンド
- **features/[feature-name]** - kebab-case（例：user-creation, user-list）
- **shared/ui/[component]** - kebab-case（例：button.tsx, user-form.tsx）
- **widgets/[widget-name]** - kebab-case（例：user-management-widget.tsx）

## Feature-Sliced Design層

```
app/        → アプリケーション初期化・グローバル設定
pages/      → ページコンポーネント（ルーティング）
widgets/    → 独立した複合UI（複数featureを組み合わせ）
features/   → ビジネス機能（ユーザー管理、注文管理等）
shared/     → 再利用可能なリソース
```

**重要：** 依存性は上から下のみ。上位層は下位層のみ参照可能。

## ファイル拡張子規則

- **TypeScript**: `.ts` (ロジック)、`.tsx` (React コンポーネント)
- **テストファイル**: `.spec.ts` または `.spec.tsx`
- **型定義**: `types.ts` または dedicated type files
- **設定ファイル**: `.config.ts`