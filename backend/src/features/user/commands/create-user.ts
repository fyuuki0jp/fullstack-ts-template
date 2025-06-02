import { depend } from 'velona';
import { err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { User } from '../../../entities';
import type { UserRepository } from '../domain/repository';
import { createUserSchema, type CreateUserInput } from '../../../shared/schemas';

export const createUser = depend(
  { userRepository: {} as UserRepository },
  ({ userRepository }) =>
    async (input: unknown): Promise<Result<User, Error>> => {
      // Validate input with Zod schema
      const validation = createUserSchema.safeParse(input);
      if (!validation.success) {
        const errorMessage = validation.error.errors
          .map((err) => err.message)
          .join(', ');
        return err(new Error(errorMessage));
      }

      const validatedInput = validation.data;

      // Create user
      return userRepository.create({
        email: validatedInput.email,
        name: validatedInput.name,
      });
    }
);
