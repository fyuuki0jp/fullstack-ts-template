import { z } from 'zod';
import type { User } from '../../../entities/user';
import { userInsertSchema } from '../../../entities/user/schema';

/**
 * API request types derived from Entity types (Single Source of Truth)
 * Use Pick/Partial to transform Entity types instead of duplicating definitions
 */

// Pick relevant fields from User entity for API requests
export type CreateUserRequest = Pick<User, 'email' | 'name'>;
export type UpdateUserRequest = Partial<Pick<User, 'email' | 'name'>>;

/**
 * API validation schemas reusing Entity schemas (DRY principle)
 * Transform Entity schemas instead of duplicating validation rules
 */
export const CreateUserRequestSchema = userInsertSchema;
export const UpdateUserRequestSchema = userInsertSchema.partial();

export const UserQueryParamsSchema = z.object({
  // TODO: Add query parameters for filtering/pagination
  // Example: status: z.enum(['active', 'inactive']).optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional(),
  sortBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export type UserQueryParams = z.infer<typeof UserQueryParamsSchema>;
