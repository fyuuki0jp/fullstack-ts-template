import { z } from 'zod';

// Import backend schemas directly to avoid duplication
import type {
  User as BackendUser,
  CreateUserInput as BackendCreateUserInput,
  UpdateUserInput as BackendUpdateUserInput,
  UserId,
  UserName,
} from '@backend/entities/user/schema';

// Re-export backend branded types
export type { UserId, UserName };

// Frontend User type with ISO string dates (converted from backend Date objects)
export type User = Omit<
  BackendUser,
  'createdAt' | 'updatedAt' | 'deletedAt'
> & {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

// Frontend input types (same as backend but re-exported for convenience)
export type CreateUserInput = BackendCreateUserInput;
export type UpdateUserInput = BackendUpdateUserInput;

// Import backend validation schemas and adapt for frontend use
import {
  userSelectSchema,
  userInsertSchema,
  userUpdateSchema,
} from '@backend/entities/user/schema';

// Frontend schema with ISO string dates (for API response validation)
const _FrontendUserSchema = userSelectSchema
  .omit({
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
  })
  .extend({
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    deletedAt: z.string().datetime().nullable(),
  });

// Re-use backend validation schemas directly for form validation
const _CreateUserInputSchema = userInsertSchema;
const _UpdateUserInputSchema = userUpdateSchema;

// Validation helpers
export const validateUser = (data: unknown): User | null => {
  const result = _FrontendUserSchema.safeParse(data);
  return result.success ? result.data : null;
};

export const validateCreateUserInput = (
  data: unknown
): CreateUserInput | null => {
  const result = _CreateUserInputSchema.safeParse(data);
  return result.success ? result.data : null;
};

export const validateUpdateUserInput = (
  data: unknown
): UpdateUserInput | null => {
  const result = _UpdateUserInputSchema.safeParse(data);
  return result.success ? result.data : null;
};

// Form validation with error details
export const validateCreateUserInputWithErrors = (data: unknown) => {
  const result = _CreateUserInputSchema.safeParse(data);
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
