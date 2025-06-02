import { z } from 'zod';

export const createUserSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;