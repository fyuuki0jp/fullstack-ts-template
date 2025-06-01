import type { Result } from '@fyuuki0jp/railway-result';
import type { User } from '../../../entities';

export interface UserRepository {
  create(
    user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<User, Error>>;
  findAll(): Promise<Result<User[], Error>>;
  findById(id: string): Promise<Result<User | null, Error>>;
}
