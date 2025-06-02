import { z } from 'zod';
// Import backend types directly to avoid duplication
import type {
  User as BackendUser,
  CreateUserInput as BackendCreateUserInput,
  UserId,
  Email,
  UserName,
} from '../../../../backend/src/entities/user';

// Re-export backend types for convenience
export type { UserId, Email, UserName };
export type { CreateUserInput } from '../../../../backend/src/entities/user';

// Frontend User type with ISO string dates (transformed from backend Date objects)
export type User = Omit<BackendUser, 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

// Frontend User schema for validation (dates as ISO strings)
const _FrontendUserSchema = z.object({
  id: z.string().uuid().brand<'UserId'>(),
  email: z.string().trim().min(1).email().brand<'Email'>(),
  name: z.string().trim().min(1).max(100).brand<'UserName'>(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

// Frontend input schema (same as backend)
const _CreateUserInputSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email format').brand<'Email'>(),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').brand<'UserName'>(),
});

// Validation helpers
export const validateUser = (data: unknown): User | null => {
  const result = _FrontendUserSchema.safeParse(data);
  return result.success ? result.data : null;
};

export const validateCreateUserInput = (
  data: unknown
): BackendCreateUserInput | null => {
  const result = _CreateUserInputSchema.safeParse(data);
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
      const field = error.path[0] as keyof BackendCreateUserInput;
      acc[field] = error.message;
      return acc;
    },
    {} as Record<keyof BackendCreateUserInput, string>
  );

  return { success: false, data: null, errors };
};

// Utility to transform backend User (with Date objects) to frontend User (with ISO strings)
export const transformBackendUserToFrontend = (backendUser: BackendUser): User => ({
  ...backendUser,
  createdAt: backendUser.createdAt.toISOString(),
  updatedAt: backendUser.updatedAt.toISOString(),
  deletedAt: backendUser.deletedAt?.toISOString() || null,
});
