import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCreateUser } from './hooks';
import { createTestWrapper } from '@/test-utils';

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
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
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

    const createUserInput = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    result.current.mutate(createUserInput);

    expect(result.current.isPending).toBe(true);

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

    const createUserInput = {
      name: 'John Doe',
      email: 'john@example.com',
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

    const createUserInput = {
      name: 'John Doe',
      email: 'john@example.com',
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

    const createUserInput = {
      name: 'John Doe',
      email: 'john@example.com',
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
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
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

    const createUserInput = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    result.current.mutate(createUserInput, {
      onSuccess: onSuccessMock,
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.isSuccess).toBe(true);
    expect(onSuccessMock).toHaveBeenCalledWith(
      { user: mockUser },
      createUserInput,
      expect.any(Object)
    );
  });
});
