import { depend } from 'velona';
import { ok, err, isErr, type Result } from 'result';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';
import {
  selectActiveUsers,
  selectUserById,
  type User,
} from '../../../entities/user';
import { UserQueryParamsSchema } from '../api/schemas';
import { createDatabaseError, ValidationError } from '../domain/errors';

/**
 * Get users with filtering and pagination
 */
export const getUsers = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (
      queryParams: unknown
    ): Promise<Result<{ users: User[]; total: number }, Error>> => {
      // 1. Validate query parameters with Zod
      const validation = UserQueryParamsSchema.safeParse(queryParams);
      if (!validation.success) {
        const firstError = validation.error.issues[0];
        const errorMessage =
          firstError.path[0] === 'page'
            ? 'ページ番号は1以上の数値で入力してください'
            : firstError.path[0] === 'limit'
              ? '取得件数は1から100の間で入力してください'
              : firstError.path[0] === 'sortBy'
                ? 'ソート項目が無効です'
                : firstError.path[0] === 'order'
                  ? 'ソート順序はascまたはdescで指定してください'
                  : `クエリパラメータが無効です: ${firstError.message}`;
        return err(new ValidationError(errorMessage));
      }

      const params = validation.data;

      try {
        // 2. Get users from repository
        const selectActiveUsersFn = selectActiveUsers.inject({ db })();
        const result = await selectActiveUsersFn();

        if (isErr(result)) {
          return err(createDatabaseError(result.error));
        }

        let users = result.value;

        // 3. Apply filtering
        // TODO: Add filtering logic based on query parameters
        // Example:
        // if (params.status) {
        //   users = users.filter(user => user.status === params.status);
        // }

        // 4. Apply sorting
        if (params.sortBy) {
          users.sort((a, b) => {
            const aValue = (a as Record<string, unknown>)[params.sortBy!];
            const bValue = (b as Record<string, unknown>)[params.sortBy!];
            const direction = params.order === 'desc' ? -1 : 1;

            // Convert to string for comparison if not primitive types
            const aStr =
              typeof aValue === 'string' || typeof aValue === 'number'
                ? aValue
                : String(aValue);
            const bStr =
              typeof bValue === 'string' || typeof bValue === 'number'
                ? bValue
                : String(bValue);

            if (aStr < bStr) return -1 * direction;
            if (aStr > bStr) return 1 * direction;
            return 0;
          });
        }

        // 5. Apply pagination
        const page = params.page || 1;
        const limit = params.limit || 20;
        const offset = (page - 1) * limit;
        const total = users.length;
        const paginatedUsers = users.slice(offset, offset + limit);

        return ok({
          users: paginatedUsers,
          total,
        });
      } catch (error) {
        if (error instanceof Error) {
          return err(createDatabaseError(error));
        }
        return err(new Error('userの取得中にエラーが発生しました'));
      }
    }
);

/**
 * Get user by ID
 */
export const getUserById = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (id: string): Promise<Result<User | null, Error>> => {
      try {
        // Import here to avoid circular dependency
        const { UserIdSchema } = await import('../../../entities/user');

        // Validate ID format
        const idValidation = UserIdSchema.safeParse(id);
        if (!idValidation.success) {
          return err(new ValidationError('userIDが無効です'));
        }

        // Get user from repository
        const selectUserByIdFn = selectUserById.inject({ db })();
        const result = await selectUserByIdFn(idValidation.data);

        if (isErr(result)) {
          return err(createDatabaseError(result.error));
        }

        return result;
      } catch (error) {
        if (error instanceof Error) {
          return err(createDatabaseError(error));
        }
        return err(new Error('userの取得中にエラーが発生しました'));
      }
    }
);
