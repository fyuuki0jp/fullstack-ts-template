import { ok, err, type Result } from 'result';
import type { CreateUserRequest, UpdateUserRequest } from '../api/schemas';
import { meetsUserCriteria, canUpdateUser } from './rules';
import type { User } from '../../../entities/user';

// Domain-specific business validation (beyond basic API validation)

/**
 * Validate business rules for creating a user
 */
export const validateCreateUserBusiness = (
  data: CreateUserRequest
): Result<CreateUserRequest, Error> => {
  // TODO: Add business rule validations
  // Examples:
  // - Check business constraints
  // - Validate against external systems
  // - Apply domain-specific rules

  // Example validation:
  // if (data.someField && data.someField < minimumValue) {
  //   return err(new Error('値が最小値を下回っています'));
  // }

  return ok(data);
};

/**
 * Validate business rules for updating a user
 */
export const validateUpdateUserBusiness = (
  currentUser: User,
  updateData: UpdateUserRequest
): Result<UpdateUserRequest, Error> => {
  // Check if user can be updated
  if (!canUpdateUser(currentUser)) {
    return err(new Error('このuserは更新できません'));
  }

  // TODO: Add specific business rule validations for updates
  // Examples:
  // - State transition validations
  // - Field-specific business rules
  // - Cross-field validations

  return ok(updateData);
};

/**
 * Validate user deletion
 */
export const validateUserDeletion = (user: User): Result<User, Error> => {
  if (user.deletedAt !== null) {
    return err(new Error('このuserは既に削除されています'));
  }

  // TODO: Add additional deletion validations
  // Examples:
  // - Check for dependent records
  // - Validate business constraints
  // - Check permissions

  return ok(user);
};

/**
 * Validate user meets business criteria
 */
export const validateUserCriteria = (user: User): Result<User, Error> => {
  if (!meetsUserCriteria(user)) {
    return err(new Error('userが必要な条件を満たしていません'));
  }

  return ok(user);
};

// TODO: Add more domain-specific validation functions as needed
// Examples:
// - Complex business rule validations
// - Multi-entity validation logic
// - External system integration validations
// - Workflow state validations
