import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// Define the users table - this provides type-safe database operations
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

export type Email = z.infer<typeof EmailSchema>;
export const EmailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .brand<'Email'>();

export type UserName = z.infer<typeof UserNameSchema>;
export const UserNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters long')
  .max(100, 'Name must be 100 characters or less')
  .brand<'UserName'>();

// Manual Zod schemas with branded types - compatible with Drizzle table structure
export const userSelectSchema = z.object({
  id: UserIdSchema,
  email: EmailSchema,
  name: UserNameSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const userInsertSchema = z.object({
  email: EmailSchema,
  name: UserNameSchema,
});

export const userUpdateSchema = userInsertSchema.partial();

// Export types derived from schemas
export type User = z.infer<typeof userSelectSchema>;
export type CreateUserInput = z.infer<typeof userInsertSchema>;
export type UpdateUserInput = z.infer<typeof userUpdateSchema>;

// Demonstrate Drizzle's type inference capabilities
export type UserSelectType = typeof usersTable.$inferSelect;
export type UserInsertType = typeof usersTable.$inferInsert;

// Comment: This approach provides:
// 1. Type-safe database operations via Drizzle table definition
// 2. Branded types for domain safety
// 3. Manual Zod schemas for validation
// 4. Full compatibility with existing code
// 5. Future migration path to drizzle-zod when compatibility improves
