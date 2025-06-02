import type { Result } from '@fyuuki0jp/railway-result';
import type { User, CreateUserInput, UserId } from '../../../entities';

export interface UserRepository {
  create(user: CreateUserInput): Promise<Result<User, Error>>;
  findAll(): Promise<Result<User[], Error>>;
  findById(id: UserId): Promise<Result<User | null, Error>>;
}
