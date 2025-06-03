import { z } from 'zod';

// Frontend branded types (using frontend zod instance)
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

// Frontend User type with ISO string dates
export type User = {
  id: UserId;
  email: Email;
  name: UserName;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

// Frontend input type for user creation
export type CreateUserInput = {
  email: Email;
  name: UserName;
};

// Frontend User schema for validation (dates as ISO strings)
const _FrontendUserSchema = z.object({
  id: UserIdSchema,
  email: EmailSchema,
  name: UserNameSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

// Frontend input schema
const _CreateUserInputSchema = z.object({
  email: EmailSchema,
  name: UserNameSchema,
});

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
