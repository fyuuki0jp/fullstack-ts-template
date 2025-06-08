import { depend } from 'velona';
import type { Result } from '@fullstack-ts-template/result';
import { type User, UserEntity } from '../../../entities';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';

export const getUsers = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (): Promise<Result<User[], Error>> => {
      const userEntity = UserEntity.inject({ db })();
      return userEntity.findAll();
    }
);
