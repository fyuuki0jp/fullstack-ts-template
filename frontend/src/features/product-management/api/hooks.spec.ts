import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProducts, useProduct, useCreateProduct } from './hooks';
import { testWrapper } from '@/test-utils';
import { apiClient } from '@/shared/lib';
import { Product } from '@backend/entities';

vi.mock('@/shared/lib', () => ({
  apiClient: {
    api: {
      products: {
        $get: vi.fn(),
        $post: vi.fn(),
        ':id': {
          $get: vi.fn(),
        },
      },
    },
  },
}));

describe('Product API hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useProducts', () => {
    it('should fetch products successfully', async () => {
      const mockProducts = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Test Product',
          description: 'Test description',
          price: '99.99',
          stock: 10,
          sku: 'TEST-001',
          category: 'Electronics',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      ];

      vi.mocked(apiClient.api.products.$get).mockResolvedValue({
        ok: true,
        json: async () => ({ products: mockProducts }),
      } as never);

      const { result } = renderHook(() => useProducts(), {
        wrapper: testWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.products).toEqual(mockProducts);
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.api.products.$get).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      } as never);

      const { result } = renderHook(() => useProducts(), {
        wrapper: testWrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Server error');
    });

    it('should handle invalid product data', async () => {
      const invalidProducts = [
        {
          id: 'invalid-uuid', // Invalid UUID
          name: 'Test Product',
          description: 'Test description',
          price: '99.99',
          stock: 10,
          sku: 'TEST-001',
          category: 'Electronics',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      ];

      vi.mocked(apiClient.api.products.$get).mockResolvedValue({
        ok: true,
        json: async () => ({ products: invalidProducts }),
      } as never);

      const { result } = renderHook(() => useProducts(), {
        wrapper: testWrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe(
        'Invalid product data received from server'
      );
    });
  });

  describe('useProduct', () => {
    it('should fetch single product successfully', async () => {
      const mockProduct = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Product',
        description: 'Test description',
        price: '99.99',
        stock: 10,
        sku: 'TEST-001',
        category: 'Electronics',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      vi.mocked(apiClient.api.products[':id'].$get).mockResolvedValue({
        ok: true,
        json: async () => ({ product: mockProduct }),
      } as never);

      const { result } = renderHook(
        () => useProduct('550e8400-e29b-41d4-a716-446655440001'),
        {
          wrapper: testWrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.product).toEqual(mockProduct);
    });
  });

  describe('useCreateProduct', () => {
    it('should create product successfully', async () => {
      const newProduct = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'New Product',
        description: 'New description',
        price: '199.99',
        stock: 5,
        sku: 'NEW-001',
        category: 'Books',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      vi.mocked(apiClient.api.products.$post).mockResolvedValue({
        ok: true,
        json: async () => ({ product: newProduct }),
      } as never);

      const { result } = renderHook(() => useCreateProduct(), {
        wrapper: testWrapper,
      });

      await result.current.mutateAsync({
        name: 'New Product' as Product['name'],
        description: 'New description' as Product['description'],
        price: '199.99' as Product['price'],
        stock: 5 as Product['stock'],
        sku: 'NEW-001' as Product['sku'],
        category: 'Books' as Product['category'],
      });

      expect(apiClient.api.products.$post).toHaveBeenCalledWith({
        json: {
          name: 'New Product',
          description: 'New description',
          price: '199.99',
          stock: 5,
          sku: 'NEW-001',
          category: 'Books',
        },
      });
    });
  });
});
