import { z } from 'zod';

// Base Entity schema - minimal with basic operations only
export const BaseEntitySchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export type BaseEntity = z.infer<typeof BaseEntitySchema>;
