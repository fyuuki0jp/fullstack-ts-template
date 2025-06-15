import { depend } from 'velona';
import { err, isErr, type Result } from 'result';
import type { DrizzleDb } from '../../../shared/adapters/db';
import {
  insertUser,
  type User,
  UserEmailSchema,
  UserNameSchema,
} from '../../../entities/user';
import { CreateUserRequestSchema } from '../api/schemas';
import { validateCreateUserBusiness } from '../domain/validation';
import { createDatabaseError, ValidationError } from '../domain/errors';

/**
 * Create a new user with full validation and business rule checking
 */
export const createUser = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (input: unknown): Promise<Result<User, Error>> => {
      // 1. API request validation with Zod
      const apiValidation = CreateUserRequestSchema.safeParse(input);
      if (!apiValidation.success) {
        const firstError = apiValidation.error.issues[0];
        const errorMessage =
          firstError.path[0] === 'email'
            ? 'Invalid email address'
            : firstError.path[0] === 'name'
              ? 'Name is required'
              : `Invalid input data: ${firstError.message}`;
        return err(new ValidationError(errorMessage));
      }

      const requestData = apiValidation.data;

      // 2. Business rule validation
      const businessValidation = validateCreateUserBusiness(requestData);
      if (isErr(businessValidation)) {
        return businessValidation;
      }

      // 3. Convert to branded types and persist
      const email = UserEmailSchema.parse(businessValidation.value.email);
      const name = UserNameSchema.parse(businessValidation.value.name);

      const insertUserFn = insertUser.inject({ db })();
      const result = await insertUserFn({ email, name });

      // 4. Error mapping for user-friendly messages
      if (isErr(result)) {
        return err(createDatabaseError(result.error));
      }

      return result;
    }
);
