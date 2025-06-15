import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { ok, err, type Result } from 'result';

// Database table definition
export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Branded types for domain-specific IDs and values
export type UserId = z.infer<typeof UserIdSchema>;
export const UserIdSchema = z.string().uuid().brand<'UserId'>();

// Define additional branded types for our domain
export type UserEmail = z.infer<typeof UserEmailSchema>;
export const UserEmailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .brand<'UserEmail'>();

export type UserName = z.infer<typeof UserNameSchema>;
export const UserNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters long')
  .max(100, 'Name must be 100 characters or less')
  .brand<'UserName'>();

// Data validation schemas (for DB consistency only)
export const userSelectSchema = z.object({
  id: UserIdSchema,
  email: UserEmailSchema,
  name: UserNameSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const userInsertSchema = z.object({
  email: UserEmailSchema,
  name: UserNameSchema,
});

export const userUpdateSchema = userInsertSchema.partial();

// Export types derived from schemas
export type User = z.infer<typeof userSelectSchema>;
export type CreateUserInput = z.infer<typeof userInsertSchema>;
export type UpdateUserInput = z.infer<typeof userUpdateSchema>;

// Drizzle type inference for compatibility
export type UserSelectType = typeof usersTable.$inferSelect;
export type UserInsertType = typeof usersTable.$inferInsert;

// ID generation helper
export const createUserId = (): Result<UserId, Error> => {
  const result = UserIdSchema.safeParse(globalThis.crypto.randomUUID());
  if (!result.success) {
    return err(new Error('Failed to generate UserId'));
  }
  return ok(result.data);
};

// Data validation helpers (DB consistency only - no business rules)
export const validateUserData = (data: unknown): Result<User, Error> => {
  const result = userSelectSchema.safeParse(data);
  if (!result.success) {
    return err(new Error('Invalid user data format'));
  }
  return ok(result.data);
};

export const validateUserInsertData = (
  data: unknown
): Result<CreateUserInput, Error> => {
  const result = userInsertSchema.safeParse(data);
  if (!result.success) {
    return err(new Error('Invalid user insert data format'));
  }
  return ok(result.data);
};

export const validateUserUpdateData = (
  data: unknown
): Result<UpdateUserInput, Error> => {
  const result = userUpdateSchema.safeParse(data);
  if (!result.success) {
    return err(new Error('Invalid user update data format'));
  }
  return ok(result.data);
};
