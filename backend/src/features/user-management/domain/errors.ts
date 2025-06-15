/**
 * Domain-specific error types for user-management
 * These errors represent business/domain concerns, not HTTP specifics
 */

// Define specific error types for better type safety
export class ValidationError extends Error {
  readonly name = 'ValidationError';
}

export class NotFoundError extends Error {
  readonly name = 'NotFoundError';
}

export class ConflictError extends Error {
  readonly name = 'ConflictError';
}

export class DatabaseError extends Error {
  readonly name = 'DatabaseError';
}

/**
 * Create appropriate error type from database errors
 */
export const createDatabaseError = (error: Error): Error => {
  const message = error.message.toLowerCase();

  // Unique constraint violations
  if (
    message.includes('unique') ||
    message.includes('duplicate') ||
    (message.includes('failed query') &&
      message.includes('insert') &&
      message.includes('email'))
  ) {
    return new ConflictError('Email already exists');
  }

  // Other database errors
  return new DatabaseError('Database error occurred');
};

// Domain layer should not know about HTTP status codes
// HTTP mapping will be done in the API layer
