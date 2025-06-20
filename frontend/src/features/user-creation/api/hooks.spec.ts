/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCreateUser } from './hooks';
import { createTestWrapper } from '@/test-utils';
import type { CreateUserInput } from '@/shared/types/user';

// Mock the API client
vi.mock('@/shared/lib', () => ({
  apiClient: {
    api: {
      users: {
        $post: vi.fn(),
      },
    },
  },
}));

const mockApiClient = await import('@/shared/lib');

describe('useCreateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully creates a user', async () => {
    const mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      deletedAt: null,
    };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ user: mockUser }),
    };

    vi.mocked(mockApiClient.apiClient.api.users.$post).mockResolvedValue(
      mockResponse as any
    );

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isPending).toBe(false);

    const createUserInput: CreateUserInput = {
      name: 'John Doe' as any,
      email: 'john@example.com' as any,
    };

    act(() => {
      result.current.mutate(createUserInput);
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual({ user: mockUser });
    expect(mockApiClient.apiClient.api.users.$post).toHaveBeenCalledWith({
      json: createUserInput,
    });
  });

  it('handles API error response', async () => {
    const mockResponse = {
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Email already exists' }),
    };

    vi.mocked(mockApiClient.apiClient.api.users.$post).mockResolvedValue(
      mockResponse as any
    );

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createTestWrapper(),
    });

    const createUserInput: CreateUserInput = {
      name: 'John Doe' as any,
      email: 'john@example.com' as any,
    };

    result.current.mutate(createUserInput);

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('Email already exists');
  });

  it('handles network error', async () => {
    vi.mocked(mockApiClient.apiClient.api.users.$post).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createTestWrapper(),
    });

    const createUserInput: CreateUserInput = {
      name: 'John Doe' as any,
      email: 'john@example.com' as any,
    };

    result.current.mutate(createUserInput);

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('Network error');
  });

  it('handles invalid response format', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ invalidField: 'data' }),
    };

    vi.mocked(mockApiClient.apiClient.api.users.$post).mockResolvedValue(
      mockResponse as any
    );

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createTestWrapper(),
    });

    const createUserInput: CreateUserInput = {
      name: 'John Doe' as any,
      email: 'john@example.com' as any,
    };

    result.current.mutate(createUserInput);

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('Invalid response format');
  });

  it('calls onSuccess callback and invalidates queries', async () => {
    const mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      deletedAt: null,
    };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ user: mockUser }),
    };

    vi.mocked(mockApiClient.apiClient.api.users.$post).mockResolvedValue(
      mockResponse as any
    );

    const onSuccessMock = vi.fn();

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createTestWrapper(),
    });

    const createUserInput: CreateUserInput = {
      name: 'John Doe' as any,
      email: 'john@example.com' as any,
    };

    act(() => {
      result.current.mutate(createUserInput, {
        onSuccess: onSuccessMock,
      });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.isSuccess).toBe(true);
    expect(onSuccessMock).toHaveBeenCalledWith(
      { user: mockUser },
      createUserInput,
      undefined
    );
  });
});
