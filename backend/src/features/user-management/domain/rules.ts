import type { User } from '@/entities/user';
import { err, ok, Result } from 'result';

// Business rules (pure functions)

/**
 * Check if user is in an active state
 */
export const isActiveUser = (user: User): boolean => {
  return user.deletedAt === null;
  // TODO: Add additional business logic for active state
  // Example: && user.status !== 'disabled'
};

/**
 * Check if user can be updated
 */
export const canUpdateUser = (user: User): boolean => {
  return isActiveUser(user);
  // TODO: Add additional business rules for updates
  // Example: && user.status === 'draft'
};

/**
 * Check if user can be deleted
 */
export const canDeleteUser = (user: User): boolean => {
  return isActiveUser(user);
  // TODO: Add additional business rules for deletion
  // Example: && !hasAssociatedRecords(user)
};

// TODO: Add additional business rules specific to your domain
// Examples:
// - Validation rules for business constraints
// - Permission checks
// - State transition validations
// - Calculation functions
// - Data transformation rules

/**
 * Example: Calculate priority based on business logic
 */
export const calculateUserPriority = (
  user: User
): Result<'high' | 'medium' | 'low', Error> => {
  // TODO: Implement priority calculation logic
  const ageInHours = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60);

  if (ageInHours > 48) {
    return ok('high');
  } else if (ageInHours > 24) {
    return ok('medium');
  } else if (ageInHours > 0) {
    return ok('low');
  }
  return err(new Error('Invalid user age for priority calculation'));
};

/**
 * Example: Check if user meets certain criteria
 */
export const meetsUserCriteria = (user: User): boolean => {
  // TODO: Implement your specific business criteria
  return isActiveUser(user);
  // Example additional checks:
  // && user.someField !== null
  // && user.someNumber > threshold
};
