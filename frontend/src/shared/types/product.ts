import { z } from 'zod';
// Import backend types directly to avoid duplication
import type {
  Product as BackendProduct,
  CreateProductInput as BackendCreateProductInput,
  ProductId,
} from '@backend/entities/product';

// Re-export backend types for convenience
export type { ProductId };
export type { CreateProductInput } from '@backend/entities/product';

// Frontend Product type with ISO string dates (transformed from backend Date objects)
export type Product = Omit<
  BackendProduct,
  'createdAt' | 'updatedAt' | 'deletedAt'
> & {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

// Frontend schema based on actual product entity fields
const _FrontendProductSchema = z.object({
  id: z.string().uuid().brand<'ProductId'>(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.string(),
  stock: z.number(),
  sku: z.string(),
  category: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

// Input schema based on actual CreateProductInput from backend
const _CreateProductInputSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required'),
  description: z.string().trim().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid decimal'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  sku: z.string().trim().min(1, 'SKU is required'),
  category: z.string().trim().min(1, 'Category is required'),
  isActive: z.boolean().optional(),
});

// Validation helpers
export const validateProduct = (data: unknown): Product | null => {
  const result = _FrontendProductSchema.safeParse(data);
  return result.success ? result.data : null;
};

export const validateCreateProductInput = (
  data: unknown
): BackendCreateProductInput | null => {
  const result = _CreateProductInputSchema.safeParse(data);
  return result.success ? result.data : null;
};

// Form validation with error details
export const validateCreateProductInputWithErrors = (data: unknown) => {
  const result = _CreateProductInputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }

  const errors = result.error.issues.reduce(
    (acc, issue) => {
      const field = issue.path[0] as keyof BackendCreateProductInput;
      acc[field] = issue.message;
      return acc;
    },
    {} as Record<keyof BackendCreateProductInput, string>
  );

  return { success: false, data: null, errors };
};

// Utility to transform backend Product (with Date objects) to frontend Product (with ISO strings)
export const transformBackendProductToFrontend = (
  backendProduct: BackendProduct
): Product => ({
  ...backendProduct,
  createdAt: backendProduct.createdAt.toISOString(),
  updatedAt: backendProduct.updatedAt.toISOString(),
  deletedAt: backendProduct.deletedAt?.toISOString() || null,
});

// Response types for API
export interface ProductsResponse {
  products: Product[];
}

export interface ProductResponse {
  product: Product;
}
