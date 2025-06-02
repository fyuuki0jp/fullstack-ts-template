import { depend } from 'velona';
import { err, isErr } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import { type User, type CreateUserInput, validateCreateUserInput } from '../../../entities';
import type { UserRepository } from '../domain/repository';

export const createUser = depend(
  { userRepository: {} as UserRepository },
  ({ userRepository }) =>
    async (input: unknown): Promise<Result<User, Error>> => {
      // Validate input using domain helper
      const validationResult = validateCreateUserInput(input);
      if (isErr(validationResult)) {
        return validationResult;
      }

      const validatedInput = validationResult.data;

      // Create user
      return userRepository.create({
        email: validatedInput.email,
        name: validatedInput.name,
      });
    }
);
