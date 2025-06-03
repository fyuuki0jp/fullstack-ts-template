# プロジェクト開発ガイド

このファイルは、Claude Code（claude.ai/code）がこのリポジトリで作業を行う際のガイダンスを提供します。

## プロジェクト概要

Feature Sliced Design（FSD）、CQRS、Railway Result型、Velona DIを採用したフルスタックモノレポ。
- **バックエンド**: HonoサーバーでCQRS + Railway Result + Velona DI
- **フロントエンド**: React + Vite + TanStack Query + FSD

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

## 基本コマンド

```bash
# モノレポ全体
yarn dev          # 両サーバー同時起動（backend:3000, frontend:5173）
yarn build        # 全プロジェクトビルド
yarn test         # 全テスト実行
yarn lint         # 全ESLint実行
yarn typecheck    # 全TypeScript型チェック

# 個別実行
yarn workspace @spa-hono/backend dev    # バックエンドのみ
yarn workspace @spa-hono/frontend dev   # フロントエンドのみ
```

## 実装アプローチ

### 1. Railway-Oriented Programming（ROP）

すべての関数は一貫したエラーハンドリングのため`Result<T, E>`を返します：

```typescript
import { Result, ok, err, isErr } from '@fyuuki0jp/railway-result';

// すべての関数はこのパターンに従います
async function operation(): Promise<Result<Data, Error>> {
  const result = await dependency.method();
  if (isErr(result)) return result;
  
  return ok(processedData);
}
```

### 2. Feature-Sliced Design（FSD）

各機能は明確な境界を持つ自己完結型です：
- **api/routes.ts** - ユースケースを調整するHTTPエンドポイント
- **commands/** - ビジネス検証を含む書き込み操作
- **queries/** - 読み込み操作（シンプルなデータ取得）
- **domain/** - リポジトリインターフェースと実装

### 3. CQRSパターン

コマンドとクエリは分離されています：

```typescript
// Zodバリデーション付きコマンド
export const createUser = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (input: unknown): Promise<Result<User, Error>> => {
      // Zodを使用した入力バリデーション
      const validationResult = validateCreateUserInput(input);
      if (isErr(validationResult)) {
        return validationResult;
      }

      // Entityを使用してユーザー作成
      const userEntity = UserEntity.inject({ db })();
      return userEntity.create(validationResult.data);
  }
);

// クエリ（ビジネスロジックなし）
export const getUsers = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (): Promise<Result<User[], Error>> => {
      const userEntity = UserEntity.inject({ db })();
      return userEntity.findAll();
    }
);
```

### 4. Velonaによる依存性注入

ルートレベルでの手動注入：

```typescript
export default (db: DrizzleDb) => {
  return new Hono()
    .get('/', async (c) => {
      const getUsersUseCase = getUsers.inject({ db })();
      const result = await getUsersUseCase();

      if (isErr(result)) {
        return c.json({ error: result.error.message }, 500);
      }

      return c.json({ users: result.data });
    })
    .post('/', async (c) => {
      const createUserUseCase = createUser.inject({ db })();
      
      let body;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
      }

      const result = await createUserUseCase(body);

      if (isErr(result)) {
        const statusCode = determineStatusCode(result.error.message);
        return c.json({ error: result.error.message }, statusCode);
      }

      return c.json({ user: result.data }, 201);
    });
};
```

### 5. Zodバリデーション戦略

Zodを使用して型安全なバリデーションを実装：

```typescript
// エンティティレベルでのZodスキーマ定義
export const EmailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .brand<'Email'>();

export const UserNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters long')
  .max(100, 'Name must be 100 characters or less')
  .brand<'UserName'>();

export const CreateUserInputSchema = z.object({
  email: EmailSchema,
  name: UserNameSchema,
});

// フロントエンドでのリアルタイムバリデーション
export const validateCreateUserInputWithErrors = (data: unknown) => {
  const result = CreateUserInputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }

  const errors = result.error.errors.reduce(
    (acc, error) => {
      const field = error.path[0] as keyof CreateUserInput;
      acc[field] = error.message;
      return acc;
    },
    {} as Record<keyof CreateUserInput, string>
  );

  return { success: false, data: null, errors };
};
```

### 6. エンティティ管理

Zodスキーマとbranded typesを使用したエンティティ定義：

```typescript
// Branded types for domain-specific IDs and values
export type UserId = z.infer<typeof UserIdSchema>;
export const UserIdSchema = z.string().uuid().brand<'UserId'>();

export type User = z.infer<typeof UserSchema>;
export const UserSchema = z.object({
  id: UserIdSchema,
  email: EmailSchema,
  name: UserNameSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// Entityパターンによるドメインロジック
export const UserEntity = depend({ db: {} as DrizzleDb }, ({ db }) => ({
  async create(input: CreateUserInput): Promise<Result<User, Error>> {
    try {
      // バリデーション、ID生成、データベース操作
      const validationResult = CreateUserInputSchema.safeParse(input);
      if (!validationResult.success) {
        return err(new Error('Validation failed'));
      }

      const idResult = createUserId();
      if (!idResult.success) {
        return err(idResult.error);
      }

      // Drizzle ORMによるデータベース操作
      const [dbUser] = await db
        .insert(usersTable)
        .values({
          id: idResult.data,
          email: validationResult.data.email,
          name: validationResult.data.name,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        })
        .returning();

      return ok(userResult.data);
    } catch (error) {
      // 重複メールエラーの処理
      if (error.message.includes('unique constraint')) {
        return err(new Error('Email already exists'));
      }
      return err(error as Error);
    }
  },
  // その他のCRUD操作
}));

```

### 7. エラーハンドリングフロー

```typescript
// ルートハンドラー
const result = await createUserCmd(input);
if (isErr(result)) {
  return c.json({ error: result.error.message }, 400);
}
return c.json(result.data, 201);
```

### 8. Hono APIメソッドチェーン

すべてのHonoルートは、クリーンで読みやすいコードのためメソッドチェーンパターンを**必須**で使用します：

```typescript
// ✅ 正しい：メソッドチェーン
export default (db: DrizzleDb) => {
  return new Hono()
    .get('/', async (c) => {
      // ハンドラー実装
    })
    .post('/', async (c) => {
      // ハンドラー実装
    })
    .put('/:id', async (c) => {
      // ハンドラー実装
    })
    .delete('/:id', async (c) => {
      // ハンドラー実装
    });
};

// ❌ 間違い：個別宣言
export default (db: DrizzleDb) => {
  const router = new Hono();
  router.get('/', handler);
  router.post('/', handler);
  return router;
};
```

### 9. ルート実装のベストプラクティス

#### ルートファイル構造（api/routes.ts）

```typescript
import { Hono } from 'hono';
import { isErr } from '@fyuuki0jp/railway-result';
import { createUser } from '../commands/create-user';
import { getUsers } from '../queries/get-users';
import { userRepositoryImpl } from '../domain/user-repository-impl';
import type { DbAdapter } from '../../../shared/adapters/db';

export default (db: DbAdapter) => {
  return new Hono()
    .get('/', async (c) => {
      // 1. 依存性注入
      const userRepository = userRepositoryImpl.inject({ db })();
      const getUsersUseCase = getUsers.inject({ userRepository })();
      
      // 2. ユースケース実行
      const result = await getUsersUseCase();

      // 3. 適切なステータスコードでエラーハンドリング
      if (isErr(result)) {
        return c.json({ error: result.error.message }, 500);
      }

      // 4. 成功レスポンス返却
      return c.json({ users: result.data });
    })
    .post('/', async (c) => {
      // 1. エラーハンドリング付きリクエストボディ解析
      let body;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
      }

      // 2. 依存性注入
      const userRepository = userRepositoryImpl.inject({ db })();
      const createUserUseCase = createUser.inject({ userRepository })();

      // 3. ユースケース実行
      const result = await createUserUseCase(body);

      // 4. 適切なステータスコードでエラーハンドリング
      if (isErr(result)) {
        const statusCode = determineStatusCode(result.error.message);
        return c.json({ error: result.error.message }, statusCode);
      }

      // 5. 201 Createdで成功レスポンス返却
      return c.json({ user: result.data }, 201);
    });
};

// ステータスコード判定用ヘルパー関数
function determineStatusCode(errorMessage: string): number {
  if (
    errorMessage.includes('Database') ||
    errorMessage.includes('UNIQUE constraint') ||
    errorMessage.includes('Execute failed')
  ) {
    return 500;
  }
  return 400;
}
```

#### 主要パターン

1. **ルートレベルでの依存性注入**
   - 各ハンドラー内でリポジトリをユースケースに注入
   - テスタビリティと柔軟性の向上

2. **一貫したエラーレスポンス形式**
   ```typescript
   { error: string }
   ```

3. **一貫した成功レスポンス形式**
   ```typescript
   // コレクション用
   { users: User[] }
   
   // 単一エンティティ用
   { user: User }
   ```

4. **ステータスコードガイドライン**
   - `200 OK` - 成功したGET
   - `201 Created` - 成功したPOST
   - `400 Bad Request` - バリデーションエラー
   - `500 Internal Server Error` - データベース/インフラエラー

5. **リクエストボディバリデーション**
   - JSON解析は常にtry-catchでラップ
   - 無効なJSONに対しては400と明確なエラーメッセージを返す

6. **メソッドチェーンの順序**
   - GET ルート（読み込み操作）を最初に
   - POST ルート（作成操作）
   - PUT/PATCH ルート（更新操作）
   - DELETE ルート（削除操作）

## 重要な実装詳細

- **データベース**: better-sqlite3によるSQLite（WALモード有効）
- **ID**: `crypto.randomUUID()`を使用して生成
- **日付**: ISO文字列として保存、ドメインでDateオブジェクトに変換
- **バリデーション**: リポジトリではなく、コマンドでビジネスルール実装
- **テスト**: `.inject()`を使用してモック依存性を提供

## フロントエンド Feature-Sliced Design

### 1. FSD層構造

FSDは以下の層で構成されます（依存性は上から下のみ）：

```
app/        → アプリケーション初期化・グローバル設定
pages/      → ページコンポーネント（ルーティング）
widgets/    → 独立した複合UI（複数featureを組み合わせ）
features/   → ビジネス機能（ユーザー管理、注文管理等）
shared/     → 再利用可能なリソース
```

### 2. Features実装パターン

各機能は以下の構造を持ちます：

```typescript
// features/user-management/api/hooks.ts - APIロジック
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.api.users.$get();
      // エラーハンドリング・レスポンス処理
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      // API呼び出し
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

// features/user-management/ui/user-form.tsx - UIコンポーネント
export const UserForm: FC<UserFormProps> = ({ onSuccess }) => {
  const { mutate: createUser, isPending, error } = useCreateUser();
  // フォーム実装
};

// features/user-management/ui/user-list.tsx - UIコンポーネント
export const UserList: FC = () => {
  const { data, isLoading, error } = useUsers();
  // リスト表示実装
};
```

### 3. Shared層のベストプラクティス

#### UI コンポーネント
```typescript
// shared/ui/button.tsx - 汎用Button
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
}

// shared/ui/index.ts - バレルエクスポート
export { Button } from './button';
export { Card } from './card';
export { Input } from './input';
```

#### 共通ライブラリ
```typescript
// shared/lib/api-client.ts - 型安全なAPIクライアント
import { hc } from 'hono/client';
import type { ApiSchema } from '../../../backend/src/server';

export const apiClient = hc<ApiSchema>('/');

// shared/types/user.ts - 共有型定義
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4. Widget層の活用

複数のfeatureを組み合わせた複合コンポーネント：

```typescript
// widgets/user-management/user-management-widget.tsx
import { Card } from '@/shared/ui';
import { UserForm, UserList } from '@/features/user-management';

export const UserManagementWidget: FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">User Management</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <h2 className="text-xl font-semibold mb-4">Add New User</h2>
            <UserForm />
          </Card>
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Users</h2>
          <UserList />
        </div>
      </div>
    </div>
  );
};
```

### 5. App層の責務

```typescript
// app/providers/query-client-provider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 1000 },
  },
});

export const AppQueryClientProvider: FC<AppQueryClientProviderProps> = ({
  children,
}) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// main.tsx - アプリケーション初期化
import { AppQueryClientProvider } from './app/providers';

createRoot(document.getElementById('root')!).render(
  <AppQueryClientProvider>
    <Routes />
  </AppQueryClientProvider>
);
```

### 6. Import規則

FSDでは以下のimport規則を厳守：

```typescript
// ✅ 正しい：階層に従った依存性
import { Button } from '@/shared/ui';                    // shared使用OK
import { useUsers } from '@/features/user-management';   // 同一・下位層OK

// ❌ 間違い：上位層への依存
import { UserWidget } from '@/widgets/user-management';  // featureからwidget
import { HomePage } from '@/pages/home';                 // featureからpage
```

### 7. TanStack Query統合

```typescript
// features内でのAPIフック実装
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.api.users.$get();
      if (!response.ok) {
        const errorData = await response.json();
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      if ('users' in data) {
        return data;
      }
      throw new Error('Invalid response format');
    },
  });
};

// UIコンポーネントでの使用
const { data, isLoading, error } = useUsers();
```

### 8. フロントエンドバリデーション戦略

フロントエンドでは共有Zodスキーマを使用してリアルタイムバリデーションを実装：

```typescript
// shared/types/user.ts - フロントエンド用Zodスキーマ
export const CreateUserInputSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must be 100 characters or less'),
});

// エラー詳細付きバリデーション関数
export const validateCreateUserInputWithErrors = (data: unknown) => {
  const result = CreateUserInputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }

  const errors = result.error.errors.reduce(
    (acc, error) => {
      const field = error.path[0] as keyof CreateUserInput;
      acc[field] = error.message;
      return acc;
    },
    {} as Record<keyof CreateUserInput, string>
  );

  return { success: false, data: null, errors };
};
```

### 9. リアルタイムバリデーションパターン

入力中にバリデーションを実行してUXを向上：

```typescript
// features/user-creation/ui/user-form.tsx
export const UserForm: FC<UserFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');
  const { mutate: createUser, isPending, error } = useCreateUser();

  // リアルタイムバリデーション
  const handleEmailChange = (value: string) => {
    setEmail(value);
    
    if (value.trim()) {
      const validation = validateCreateUserInputWithErrors({
        email: value,
        name: 'ValidName', // 他フィールドダミー値
      });
      if (!validation.success && validation.errors?.email) {
        setEmailError(validation.errors.email);
      } else {
        setEmailError('');
      }
    } else {
      setEmailError('');
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    
    if (value.trim()) {
      const validation = validateCreateUserInputWithErrors({
        email: 'valid@example.com', // 他フィールドダミー値
        name: value,
      });
      if (!validation.success && validation.errors?.name) {
        setNameError(validation.errors.name);
      } else {
        setNameError('');
      }
    } else {
      setNameError('');
    }
  };

  // フォーム有効性チェック
  const isFormValid = email.trim() && name.trim() && !emailError && !nameError;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const validatedInput = validateForm();
    if (!validatedInput) return;

    createUser(validatedInput, {
      onSuccess: () => {
        setEmail('');
        setName('');
        setEmailError('');
        setNameError('');
        onSuccess?.();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email Address"
        value={email}
        onChange={handleEmailChange}
        error={emailError}
        isDisabled={isPending}
        placeholder="user@example.com"
      />

      <Input
        label="Full Name"
        value={name}
        onChange={handleNameChange}
        error={nameError}
        isDisabled={isPending}
        placeholder="John Doe"
      />

      {error && (
        <div className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded-md">
          <strong>Error:</strong> {error.message}
        </div>
      )}

      <Button
        type="submit"
        isDisabled={isPending || !isFormValid}
      >
        {isPending ? 'Creating...' : 'Create User'}
      </Button>
    </form>
  );
};
```

## 依存関係

### バックエンド
- **Hono** - Webフレームワーク
- **@fyuuki0jp/railway-result** - Result型
- **velona** - 依存性注入
- **better-sqlite3** - SQLiteドライバー
- **tsx** - TypeScript実行
- **Vitest** - テストフレームワーク

### フロントエンド
- **React** - UIライブラリ
- **Vite** - ビルドツール
- **@tanstack/react-query** - サーバー状態管理
- **@generouted/react-router** - ファイルベースルーティング
- **hono/client** - 型安全APIクライアント
- **Tailwind CSS** - CSSフレームワーク

### 共通
- **TypeScript** - Strictモード
- **ESLint** - リンター
- **Prettier** - コードフォーマッター

## テスト駆動開発（TDD）

### 開発ワークフロー

1. **Red** - 最初に失敗するテストを書く
2. **Green** - テストを通す最小限のコードを書く
3. **Refactor** - テストを緑のままでコード品質を改善

### テスト構造

```typescript
// コマンドのテスト例
describe('createUser command', () => {
  let mockUserRepo: UserRepository;
  let createUserCmd: ReturnType<typeof createUser.inject>;

  beforeEach(() => {
    mockUserRepo = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
    };
    createUserCmd = createUser.inject({ userRepository: mockUserRepo });
  });

  it('有効な入力でユーザーを作成できること', async () => {
    // Arrange
    const input = { email: 'test@example.com', name: 'Test User' };
    const expected = { id: '123', ...input, createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(mockUserRepo.create).mockResolvedValue(ok(expected));

    // Act
    const result = await createUserCmd()(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expected);
    }
    expect(mockUserRepo.create).toHaveBeenCalledWith(input);
  });
});
```

### テストガイドライン

1. **ファイル命名**: テストファイルには`.spec.ts`サフィックスを使用
2. **テストの場所**: テスト対象のコードの隣にテストを配置
3. **モック戦略**: 
   - シンプルなモックには`vi.fn()`を使用
   - データベース層のテストには`MockDbAdapter`を使用
   - Velonaの`.inject()`メソッドを使用してモックを注入
4. **テストカテゴリ**:
   - **Commands**: ビジネスバリデーションとエラーハンドリングをテスト
   - **Queries**: データ取得とエラー伝播をテスト
   - **Repositories**: データベース操作とデータ変換をテスト
   - **Routes**: HTTP層の統合をテスト

### テストパターン

#### Railway Resultのテスト
```typescript
// 成功ケース
expect(result.success).toBe(true);
if (result.success) {
  expect(result.data).toEqual(expectedData);
}

// エラーケース
expect(isErr(result)).toBe(true);
if (isErr(result)) {
  expect(result.error.message).toBe('Expected error message');
}
```

#### バリデーション付きコマンドのテスト
```typescript
it('メール形式をバリデーションすること', async () => {
  const result = await createUserCmd()({ email: 'invalid', name: 'User' });
  
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.error.message).toBe('Invalid email format');
  }
  expect(mockUserRepo.create).not.toHaveBeenCalled();
});
```

#### リポジトリ実装のテスト
```typescript
it('データベース行をUserエンティティに変換すること', async () => {
  const dbRow = {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    created_at: '2023-01-01T12:00:00Z',
    updated_at: '2023-01-02T14:30:00Z',
  };
  mockDb.setData('users', [dbRow]);

  const result = await userRepo.findById('123');

  expect(result.success).toBe(true);
  if (result.success && result.data) {
    expect(result.data.createdAt).toBeInstanceOf(Date);
    expect(result.data.updatedAt).toBeInstanceOf(Date);
  }
});
```

### モック実装

#### MockDbAdapterの使用
```typescript
const mockDb = new MockDbAdapter();
const userRepo = userRepositoryImpl.inject({ db: mockDb })();

// テストデータの設定
mockDb.setData('users', [{ id: '1', email: 'test@example.com', name: 'Test' }]);

// データベースエラーのシミュレート
mockDb.mockFailure('Database connection failed');
```

#### リポジトリモック
```typescript
const mockUserRepo: UserRepository = {
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
};
```

### カバレッジ要件

- すべてのコマンドはバリデーションロジックをテストする必要がある
- すべてのクエリはエラー伝播をテストする必要がある
- すべてのリポジトリはデータ変換をテストする必要がある
- すべてのルートはHTTPステータスコードとレスポンス形式をテストする必要がある

### ルートテストのベストプラクティス

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
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
    it('すべてのユーザーを返すこと', async () => {
      mockDb.setData('users', [
        { id: '1', email: 'user@example.com', name: 'User' }
      ]);

      const res = await app.request('/');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users).toHaveLength(1);
    });

    it('データベースエラーをハンドリングすること', async () => {
      mockDb.mockFailure('Database error');
      
      const res = await app.request('/');
      
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /', () => {
    it('有効なデータでユーザーを作成すること', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', name: 'Test' }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user.email).toBe('test@example.com');
    });

    it('無効なJSONをハンドリングすること', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid JSON');
    });
  });
});
```

## 重要な注意事項

### バックエンド
1. すべての関数は`Result<T, E>`を返す必要があります（ESLintで強制）
2. ライブラリドキュメント用にContext7 MCPを使用：`mcp__context7__resolve-library-id` → `mcp__context7__get-library-docs`
3. `.inject()`を使用してモック依存性でテスト
4. 例外を投げない - 常に`err(new Error(...))`を返す
5. ビジネスロジックはルートやリポジトリではなく、コマンド/クエリに保持
6. **TDDファースト**: 実装前に常にテストを書く
7. **すべてのパスをテスト**: 成功、バリデーションエラー、インフラエラーをカバー

### フロントエンド
1. **FSD層規則を厳守**: 上位層は下位層のみ参照可能
2. **APIロジックは features/*/api に集約**: UIコンポーネントから直接APIを呼ばない
3. **shared/ui コンポーネントはビジネスロジック非依存**: 汎用的な再利用可能コンポーネントのみ
4. **型安全性の確保**: Hono clientによる型共有を活用
5. **TanStack Query最適化**:適切なキャッシング・無効化戦略を実装

## プロジェクトテンプレート利用ガイド

このリポジトリを新しいプロジェクトのテンプレートとして使用する際の手順：

### 1. 初期セットアップ

```bash
# リポジトリクローン
git clone <this-repo> <new-project-name>
cd <new-project-name>

# リモートorigin変更
git remote remove origin
git remote add origin <new-repo-url>

# 依存関係インストール
yarn install

# 初回ビルド・テスト確認
yarn build
yarn test
```

### 2. プロジェクト名変更

```bash
# package.jsonの name フィールドを更新
# - ルートpackage.json: "name": "<new-project-name>"
# - backend/package.json: "name": "@<new-project-name>/backend"  
# - frontend/package.json: "name": "@<new-project-name>/frontend"

# CLAUDE.mdのプロジェクト概要セクションを更新
# README.mdの内容を新プロジェクト向けに更新
```

### 3. ドメイン固有実装への置き換え

#### バックエンド
```bash
# 1. src/entities/ - ドメインエンティティを追加
# 2. src/features/ - 新機能モジュールを追加（userは参考例として残す/削除）
# 3. src/shared/adapters/db/ - 必要に応じてDBアダプターを追加
# 4. src/server.ts - 新APIルートの追加
```

#### フロントエンド
```bash
# 1. src/features/ - 新機能モジュールを追加
# 2. src/shared/ui/ - プロジェクト固有UIコンポーネント追加
# 3. src/shared/types/ - 新エンティティ型を追加
# 4. src/widgets/ - 複合UIウィジェット追加
# 5. src/pages/ - 新ページを追加
```

### 4. 環境構築

```bash
# 開発環境設定
cp .env.example .env.local  # 環境変数設定（作成する場合）

# データベース初期化（必要に応じて）
yarn workspace @<new-project-name>/backend db:migrate

# 開発サーバー起動確認
yarn dev
```

### 5. カスタマイズポイント

#### デザインシステム
- `frontend/src/shared/ui/` - UI コンポーネントライブラリ
- `frontend/src/index.css` - Tailwind カスタムスタイル
- `frontend/tailwind.config.js` - Tailwindテーマ設定（存在する場合）

#### API設計
- `backend/src/features/*/api/routes.ts` - エンドポイント設計
- `backend/src/entities/` - ドメインモデル設計
- `backend/src/shared/adapters/` - インフラ層設計

#### 型共有
- Hono型共有により、バックエンドAPIの変更は自動的にフロントエンドに反映
- `frontend/src/shared/types/` で追加の型定義を管理

### 6. 推奨拡張

#### 認証・認可
```bash
# JWT認証の場合
yarn workspace @<new-project-name>/backend add jsonwebtoken @types/jsonwebtoken
# フロントエンド側でのトークン管理実装を features/auth に追加
```

#### バリデーション
```bash  
# Zodによるスキーマバリデーション
yarn add zod
# backend/src/shared/schemas/ でスキーマ定義
```

#### 状態管理
```bash
# Zustandによるクライアント状態管理（必要に応じて）
yarn workspace @<new-project-name>/frontend add zustand
```

### 7. 継続的改善

1. **機能追加時**: 必ずFSD層規則に従って配置
2. **テスト拡充**: 新機能追加時は必ずテストを先行実装
3. **型安全性維持**: TypeScript strict mode を維持
4. **ドキュメント更新**: CLAUDE.md を新機能に合わせて更新
5. **依存関係管理**: 定期的に依存関係をアップデート

このテンプレートは実際のプロダクション環境で検証された設計パターンに基づいており、
スケーラブルで保守性の高いフルスタックアプリケーションの基盤として活用できます。