import { depend } from 'velona';
import type { Result } from '@fyuuki0jp/railway-result';
import type { User } from '../../../entities';
import type { UserRepository } from '../domain/repository';

export const getUsers = depend(
  { userRepository: {} as UserRepository },
  ({ userRepository }) =>
    async (): Promise<Result<User[], Error>> => {
      return userRepository.findAll();
    }
);
