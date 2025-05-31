import { describe, it, expect } from 'vitest';
import type { User } from './user';

describe('User entity', () => {
  it('should have required properties', () => {
    const user: User = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    expect(user.id).toBe('123');
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('should extend Entity interface', () => {
    const user: User = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // User should have all Entity properties
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');
  });
});
