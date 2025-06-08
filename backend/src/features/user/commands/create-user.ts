import { depend } from 'velona';
import { isErr, type Result } from '@shared/result';
import {
  type User,
  UserEntity,
  validateCreateUserInput,
} from '../../../entities';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';

export const createUser = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (input: unknown): Promise<Result<User, Error>> => {
      // Validate input using domain helper
      const validationResult = validateCreateUserInput(input);
      if (isErr(validationResult)) {
        return validationResult;
      }

      const validatedInput = validationResult.value;

      // Create user using entity
      const userEntity = UserEntity.inject({ db })();
      return userEntity.create({
        email: validatedInput.email,
        name: validatedInput.name,
      });
    }
);
