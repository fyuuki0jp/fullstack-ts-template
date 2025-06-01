import { depend } from 'velona';
import { err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { User } from '../../../entities';
import type { UserRepository } from '../domain/repository';

export interface CreateUserInput {
  email: string;
  name: string;
}

export const createUser = depend(
  { userRepository: {} as UserRepository },
  ({ userRepository }) =>
    async (input: CreateUserInput): Promise<Result<User, Error>> => {
      // Trim input
      const email = input.email?.trim() || '';
      const name = input.name?.trim() || '';

      // Validate input
      if (!email || !name) {
        return err(new Error('Email and name are required'));
      }

      // Basic email validation
      if (!email.includes('@') || email.split('@').length !== 2) {
        return err(new Error('Invalid email format'));
      }

      // Create user
      return userRepository.create({
        email,
        name,
      });
    }
);
