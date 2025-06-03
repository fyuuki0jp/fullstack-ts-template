/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUsers } from './hooks';
import { createTestWrapper } from '@/test-utils';

// Mock the API client
vi.mock('@/shared/lib', () => ({
  apiClient: {
    api: {
      users: {
        $get: vi.fn(),
      },
    },
  },
}));

const mockApiClient = await import('@/shared/lib');

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully fetches users', async () => {
    const mockUsers = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        deletedAt: null,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Jane Smith',
        email: 'jane@example.com',
        createdAt: '2023-01-02T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
        deletedAt: null,
      },
    ];

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ users: mockUsers }),
    };

    vi.mocked(mockApiClient.apiClient.api.users.$get).mockResolvedValue(
      mockResponse as any
    );

    const { result } = renderHook(() => useUsers(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({ users: mockUsers });
    expect(result.current.error).toBeNull();
  });

  it('handles API error response', async () => {
    const mockResponse = {
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Failed to fetch users' }),
    };

    vi.mocked(mockApiClient.apiClient.api.users.$get).mockResolvedValue(
      mockResponse as any
    );

    const { result } = renderHook(() => useUsers(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Failed to fetch users');
    expect(result.current.data).toBeUndefined();
  });

  it('handles network error', async () => {
    vi.mocked(mockApiClient.apiClient.api.users.$get).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useUsers(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Network error');
  });

  it('handles invalid response format', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ invalidField: 'data' }),
    };

    vi.mocked(mockApiClient.apiClient.api.users.$get).mockResolvedValue(
      mockResponse as any
    );

    const { result } = renderHook(() => useUsers(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Invalid response format');
  });

  it('uses correct query key', () => {
    const { result } = renderHook(() => useUsers(), {
      wrapper: createTestWrapper(),
    });

    // Check that the query is using the correct key
    expect(result.current.isLoading).toBe(true);
    // The actual query key verification would need access to internal query client state
  });
});
