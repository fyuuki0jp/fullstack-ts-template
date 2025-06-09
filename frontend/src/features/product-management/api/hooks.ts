import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib';
import {
  type Product,
  type CreateProductInput,
  type ProductsResponse,
  type ProductResponse,
  validateProduct,
} from '@/shared/types/product';

const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters?: any) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

export const useProducts = () => {
  return useQuery({
    queryKey: productKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.api.products.$get();
      if (!response.ok) {
        const errorData = await response.json();
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      if ('products' in data && Array.isArray(data.products)) {
        // Validate all products with zod
        const validatedProducts = data.products.map((product: unknown) => {
          const validated = validateProduct(product);
          if (!validated) {
            throw new Error('Invalid product data received from server');
          }
          return validated;
        });
        return { products: validatedProducts } as ProductsResponse;
      }
      throw new Error('Invalid response format');
    },
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.api.products[':id'].$get({
        param: { id },
      });
      if (!response.ok) {
        const errorData = await response.json();
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to fetch product');
      }

      const data = await response.json();
      if ('product' in data) {
        // Validate the response product data with zod
        const validatedProduct = validateProduct(data.product);
        if (!validatedProduct) {
          throw new Error('Invalid product data received from server');
        }
        return { product: validatedProduct } as ProductResponse;
      }
      throw new Error('Invalid response format');
    },
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const response = await apiClient.api.products.$post({
        json: input,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to create product');
      }

      const data = await response.json();
      if ('product' in data) {
        // Validate the response product data with zod
        const validatedProduct = validateProduct(data.product);
        if (!validatedProduct) {
          throw new Error('Invalid product data received from server');
        }
        return { product: validatedProduct } as ProductResponse;
      }
      throw new Error('Invalid response format');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};
