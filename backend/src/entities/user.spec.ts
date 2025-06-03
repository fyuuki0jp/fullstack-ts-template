import { describe, it, expect } from 'vitest';
import type { User, UserId, Email, UserName } from './user';

describe('User entity', () => {
  it('should have required properties', () => {
    const user: User = {
      id: '550e8400-e29b-41d4-a716-446655440001' as UserId,
      email: 'test@example.com' as Email,
      name: 'Test User' as UserName,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      deletedAt: null,
    };

    expect(user.id).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('should extend Entity interface', () => {
    const user: User = {
      id: '550e8400-e29b-41d4-a716-446655440002' as UserId,
      email: 'test@example.com' as Email,
      name: 'Test User' as UserName,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    // User should have all Entity properties
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');
  });
});
