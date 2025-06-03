import { z } from 'zod';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import { BaseEntitySchema } from './types';

// User domain branded types
export type UserId = z.infer<typeof UserIdSchema>;
export const UserIdSchema = z.string().uuid().brand<'UserId'>();

export type Email = z.infer<typeof EmailSchema>;
export const EmailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .brand<'Email'>();

export type UserName = z.infer<typeof UserNameSchema>;
export const UserNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name must be 100 characters or less')
  .brand<'UserName'>();

// User entity schema - extends base entity with user-specific fields
const _UserSchema = BaseEntitySchema.extend({
  id: UserIdSchema,
  email: EmailSchema,
  name: UserNameSchema,
});

export type User = z.infer<typeof _UserSchema>;

// Input schema for user creation (without entity fields)
const _CreateUserInputSchema = z.object({
  email: EmailSchema,
  name: UserNameSchema,
});

export type CreateUserInput = z.infer<typeof _CreateUserInputSchema>;

// Export schemas for frontend use
export const UserSchema = _UserSchema;
export const CreateUserInputSchema = _CreateUserInputSchema;

// Domain helper functions for validation (minimal export)
export const validateUser = (data: unknown): Result<User, Error> => {
  const result = _UserSchema.safeParse(data);
  if (!result.success) {
    const errorMessage = result.error.errors
      .map((error) => error.message)
      .join(', ');
    return err(new Error(`User validation failed: ${errorMessage}`));
  }
  return ok(result.data);
};

export const validateCreateUserInput = (
  data: unknown
): Result<CreateUserInput, Error> => {
  const result = _CreateUserInputSchema.safeParse(data);
  if (!result.success) {
    const errorMessage = result.error.errors
      .map((error) => error.message)
      .join(', ');
    return err(
      new Error(`Create user input validation failed: ${errorMessage}`)
    );
  }
  return ok(result.data);
};

export const createUserId = (): Result<UserId, Error> => {
  const result = UserIdSchema.safeParse(globalThis.crypto.randomUUID());
  if (!result.success) {
    return err(new Error('Failed to generate UserId'));
  }
  return ok(result.data);
};
