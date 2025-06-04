# フロントエンド APIフックパターン

## TanStack Query基本パターン

### 基本フック構造

```typescript
// features/user-management/api/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib';
import {
  type User,
  type CreateUserInput,
  type UsersResponse,
  type UserResponse,
  validateUser,
} from '@/shared/types/user';

const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters?: any) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};
```

### クエリフック（データ取得）

```typescript
export const useUsers = () => {
  return useQuery({
    queryKey: userKeys.lists(),
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
      if ('users' in data && Array.isArray(data.users)) {
        // Zodによるレスポンス検証
        const validatedUsers = data.users.map((user: unknown) => {
          const validated = validateUser(user);
          if (!validated) {
            throw new Error('Invalid user data received from server');
          }
          return validated;
        });
        return { users: validatedUsers } as UsersResponse;
      }
      throw new Error('Invalid response format');
    },
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.api.users[':id'].$get({
        param: { id },
      });
      if (!response.ok) {
        const errorData = await response.json();
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to fetch user');
      }

      const data = await response.json();
      if ('user' in data) {
        const validatedUser = validateUser(data.user);
        if (!validatedUser) {
          throw new Error('Invalid user data received from server');
        }
        return { user: validatedUser } as UserResponse;
      }
      throw new Error('Invalid response format');
    },
    enabled: !!id,
  });
};
```

### ミューテーションフック（データ変更）

```typescript
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const response = await apiClient.api.users.$post({
        json: input,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to create user');
      }

      const data = await response.json();
      if ('user' in data) {
        const validatedUser = validateUser(data.user);
        if (!validatedUser) {
          throw new Error('Invalid user data received from server');
        }
        return { user: validatedUser } as UserResponse;
      }
      throw new Error('Invalid response format');
    },
    onSuccess: () => {
      // ユーザーリストを無効化してリフェッチを促す
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateUserInput }) => {
      const response = await apiClient.api.users[':id'].$put({
        param: { id },
        json: input,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to update user');
      }

      const data = await response.json();
      if ('user' in data) {
        const validatedUser = validateUser(data.user);
        if (!validatedUser) {
          throw new Error('Invalid user data received from server');
        }
        return { user: validatedUser } as UserResponse;
      }
      throw new Error('Invalid response format');
    },
    onSuccess: (data, variables) => {
      // 特定ユーザーのキャッシュを更新
      queryClient.setQueryData(
        userKeys.detail(variables.id),
        data
      );
      // リストも無効化
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.api.users[':id'].$delete({
        param: { id },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to delete user');
      }

      return { success: true };
    },
    onSuccess: (_, id) => {
      // 削除されたユーザーをキャッシュから除去
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};
```

## エラーハンドリングパターン

### 楽観的更新

```typescript
export const useUpdateUserOptimistic = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateUserInput }) => {
      const response = await apiClient.api.users[':id'].$put({
        param: { id },
        json: input,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      return response.json();
    },
    onMutate: async ({ id, input }) => {
      // 進行中のリフェッチをキャンセル
      await queryClient.cancelQueries({ queryKey: userKeys.detail(id) });

      // 以前のデータを保存
      const previousUser = queryClient.getQueryData(userKeys.detail(id));

      // 楽観的更新
      queryClient.setQueryData(userKeys.detail(id), (old: UserResponse | undefined) => {
        if (!old) return old;
        return {
          user: { ...old.user, ...input, updatedAt: new Date().toISOString() }
        };
      });

      return { previousUser, id };
    },
    onError: (err, variables, context) => {
      // エラー時は以前のデータに戻す
      if (context?.previousUser) {
        queryClient.setQueryData(userKeys.detail(context.id), context.previousUser);
      }
    },
    onSettled: (data, error, variables) => {
      // 最終的にサーバーからの最新データを取得
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
    },
  });
};
```

### ページネーション付きクエリ

```typescript
export const useUsersPaginated = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: userKeys.list({ page, limit }),
    queryFn: async () => {
      const response = await apiClient.api.users.$get({
        query: { page: page.toString(), limit: limit.toString() },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const data = await response.json();
      return data as PaginatedUsersResponse;
    },
    keepPreviousData: true, // ページ切り替え時にローディング状態を防ぐ
  });
};
```

## テストパターン

```typescript
// features/user-management/api/hooks.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUsers, useUser, useCreateUser } from './hooks';
import { testWrapper } from '@/test-utils';
import { apiClient } from '@/shared/lib';

vi.mock('@/shared/lib', () => ({
  apiClient: {
    api: {
      users: {
        $get: vi.fn(),
        $post: vi.fn(),
        ':id': {
          $get: vi.fn(),
        },
      },
    },
  },
}));

describe('User API hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useUsers', () => {
    it('should fetch users successfully', async () => {
      const mockUsers = [
        { 
          id: '550e8400-e29b-41d4-a716-446655440001', 
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      ];
      
      vi.mocked(apiClient.api.users.$get).mockResolvedValue({
        ok: true,
        json: async () => ({ users: mockUsers }),
      } as Response);

      const { result } = renderHook(() => useUsers(), {
        wrapper: testWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.users).toEqual(mockUsers);
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.api.users.$get).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      } as Response);

      const { result } = renderHook(() => useUsers(), {
        wrapper: testWrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Server error');
    });

    it('should handle invalid user data', async () => {
      const invalidUsers = [
        { 
          id: 'invalid-uuid', // Invalid UUID
          email: 'test@example.com',
          name: 'Test User',
        },
      ];
      
      vi.mocked(apiClient.api.users.$get).mockResolvedValue({
        ok: true,
        json: async () => ({ users: invalidUsers }),
      } as Response);

      const { result } = renderHook(() => useUsers(), {
        wrapper: testWrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Invalid user data received from server');
    });
  });

  describe('useCreateUser', () => {
    it('should create user successfully', async () => {
      const newUser = { 
        id: '550e8400-e29b-41d4-a716-446655440001', 
        email: 'new@example.com',
        name: 'New User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      
      vi.mocked(apiClient.api.users.$post).mockResolvedValue({
        ok: true,
        json: async () => ({ user: newUser }),
      } as Response);

      const { result } = renderHook(() => useCreateUser(), {
        wrapper: testWrapper,
      });

      await result.current.mutateAsync({ 
        email: 'new@example.com',
        name: 'New User'
      });

      expect(apiClient.api.users.$post).toHaveBeenCalledWith({
        json: { 
          email: 'new@example.com',
          name: 'New User'
        },
      });
    });
  });
});
```

## 重要なパターン

### 1. キーファクトリーパターン
- クエリキーの一元管理
- 型安全なキー生成
- 階層的なキャッシュ無効化

### 2. Zodバリデーション
- APIレスポンスの型安全性確保
- 不正データの早期検出
- デバッグ情報の提供

### 3. エラーハンドリング
- 統一されたエラーメッセージ処理
- 適切なフォールバック
- ユーザーフレンドリーなエラー表示

### 4. キャッシュ戦略
- 楽観的更新による UX 向上
- 適切なデータ無効化
- メモリ使用量の最適化