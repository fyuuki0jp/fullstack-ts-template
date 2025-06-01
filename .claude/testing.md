# 🧪 Testing Guide

Comprehensive guide to Test-Driven Development (TDD) in this project.

## TDD Workflow

### The Red-Green-Refactor Cycle

1. **🔴 Red**: Write a failing test first
2. **🟢 Green**: Write minimal code to pass the test
3. **🔵 Refactor**: Improve code while keeping tests green

```bash
# Watch mode for TDD
yarn test --watch

# Run specific test file
yarn test user.spec

# Run with coverage
yarn test --coverage
```

## Test File Organization

### Naming Convention

```
feature.ts          # Implementation
feature.spec.ts     # Test file (same directory)
```

### Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Feature Name', () => {
  // Setup
  beforeEach(() => {
    // Reset mocks, initialize test data
  });

  describe('specific functionality', () => {
    it('should do something specific', () => {
      // Arrange
      const input = { /* test data */ };
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toEqual(expected);
    });
  });
});
```

## Testing Patterns by Layer

### 1. Testing Commands (Business Logic)

Commands contain validation and business rules:

```typescript
// create-user.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createUser } from './create-user';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { UserRepository } from '../domain/repository';

describe('createUser command', () => {
  let mockUserRepository: UserRepository;
  let createUserCmd: ReturnType<typeof createUser.inject>;

  beforeEach(() => {
    // Create mock repository
    mockUserRepository = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    
    // Inject mock
    createUserCmd = createUser.inject({ userRepository: mockUserRepository });
  });

  it('should create user with valid email', async () => {
    // Arrange
    const input = { email: 'test@example.com', name: 'Test User' };
    const expectedUser = {
      id: '123',
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(mockUserRepository.create).mockResolvedValue(ok(expectedUser));

    // Act
    const result = await createUserCmd()(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expectedUser);
    }
    expect(mockUserRepository.create).toHaveBeenCalledWith(input);
  });

  it('should reject invalid email', async () => {
    // Arrange
    const input = { email: 'invalid-email', name: 'Test User' };

    // Act
    const result = await createUserCmd()(input);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Invalid email format');
    }
    expect(mockUserRepository.create).not.toHaveBeenCalled();
  });
});
```

### 2. Testing Queries (Data Retrieval)

Queries should be simple and test error propagation:

```typescript
// get-users.spec.ts
describe('getUsers query', () => {
  it('should return all users', async () => {
    // Arrange
    const expectedUsers = [
      { id: '1', email: 'user1@example.com', name: 'User 1' },
      { id: '2', email: 'user2@example.com', name: 'User 2' },
    ];
    vi.mocked(mockUserRepository.findAll).mockResolvedValue(ok(expectedUsers));

    // Act
    const result = await getUsersQuery();

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expectedUsers);
    }
  });

  it('should propagate repository errors', async () => {
    // Arrange
    const error = new Error('Database connection failed');
    vi.mocked(mockUserRepository.findAll).mockResolvedValue(err(error));

    // Act
    const result = await getUsersQuery();

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(error);
    }
  });
});
```

### 3. Testing Repositories (Data Access)

Use MockDbAdapter for database interaction tests:

```typescript
// user-repository-impl.spec.ts
import { MockDbAdapter } from '../../../shared/adapters/db/mock';
import { userRepositoryImpl } from './user-repository-impl';

describe('UserRepository implementation', () => {
  let mockDb: MockDbAdapter;
  let userRepo: ReturnType<typeof userRepositoryImpl.inject>;

  beforeEach(() => {
    mockDb = new MockDbAdapter();
    userRepo = userRepositoryImpl.inject({ db: mockDb });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      // Arrange
      const dbRows = [
        {
          id: '1',
          email: 'user@example.com',
          name: 'Test User',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];
      mockDb.setData('users', dbRows);

      // Act
      const result = await userRepo().findAll();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].createdAt).toBeInstanceOf(Date);
        expect(result.data[0].updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should handle database errors', async () => {
      // Arrange
      mockDb.mockFailure('Connection timeout');

      // Act
      const result = await userRepo().findAll();

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Connection timeout');
      }
    });
  });
});
```

### 4. Testing API Routes (HTTP Layer)

Test the full HTTP request/response cycle:

```typescript
// routes.spec.ts
import { Hono } from 'hono';
import createUserRoutes from './routes';
import { MockDbAdapter } from '../../../shared/adapters/db/mock';

describe('User API Routes', () => {
  let app: Hono;
  let mockDb: MockDbAdapter;

  beforeEach(() => {
    mockDb = new MockDbAdapter();
    const userRoutes = createUserRoutes(mockDb);
    app = new Hono();
    app.route('/', userRoutes);
  });

  describe('GET /', () => {
    it('should return users list', async () => {
      // Arrange
      mockDb.setData('users', [
        { id: '1', email: 'test@example.com', name: 'Test' },
      ]);

      // Act
      const res = await app.request('/');

      // Assert
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.users).toHaveLength(1);
    });
  });

  describe('POST /', () => {
    it('should create user', async () => {
      // Act
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@example.com',
          name: 'New User',
        }),
      });

      // Assert
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.user.email).toBe('new@example.com');
    });

    it('should handle invalid JSON', async () => {
      // Act
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      // Assert
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid JSON');
    });
  });
});
```

## Testing Railway Results

### Success Cases

```typescript
// Always check success flag first
expect(result.success).toBe(true);
if (result.success) {
  expect(result.data).toEqual(expectedData);
}
```

### Error Cases

```typescript
// Use isErr for error checks
import { isErr } from '@fyuuki0jp/railway-result';

expect(isErr(result)).toBe(true);
if (isErr(result)) {
  expect(result.error.message).toBe('Expected error message');
}
```

## Mock Utilities

### MockDbAdapter

A test double for database operations:

```typescript
const mockDb = new MockDbAdapter();

// Set test data
mockDb.setData('users', [
  { id: '1', email: 'test@example.com', name: 'Test' }
]);

// Simulate failures
mockDb.mockFailure('Database error');

// Reset between tests
mockDb.reset();
```

### Vitest Mocking

```typescript
// Mock functions
const mockFn = vi.fn();
mockFn.mockResolvedValue(ok(data));
mockFn.mockResolvedValue(err(new Error('Failed')));

// Mock modules
vi.mock('./module', () => ({
  someFunction: vi.fn(),
}));

// Spy on existing functions
const spy = vi.spyOn(object, 'method');
```

## Test Data Builders

Create reusable test data:

```typescript
// test-builders.ts
export function buildUser(overrides?: Partial<User>): User {
  return {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// Usage in tests
const user = buildUser({ name: 'Custom Name' });
```

## Coverage Requirements

### Minimum Coverage

- Commands: 100% (all validation paths)
- Queries: 100% (success and error paths)
- Repositories: 90% (data transformations)
- Routes: 90% (HTTP handling)

### What to Test

✅ **Test These:**
- Business logic and validation
- Error handling paths
- Data transformations
- HTTP status codes
- Edge cases

❌ **Don't Test These:**
- Framework internals
- Third-party libraries
- Simple getters/setters
- Type definitions

## Common Testing Patterns

### Testing Async Operations

```typescript
it('should handle async operations', async () => {
  // Always use async/await for clarity
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Time-Dependent Code

```typescript
beforeEach(() => {
  // Fix time for consistent tests
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-01-01'));
});

afterEach(() => {
  vi.useRealTimers();
});
```

### Testing Error Scenarios

```typescript
it('should handle specific errors', async () => {
  // Test different error types
  const errors = [
    'Network error',
    'Validation failed',
    'Unauthorized',
  ];

  for (const errorMsg of errors) {
    mockDb.mockFailure(errorMsg);
    const result = await repository.findAll();
    expect(isErr(result)).toBe(true);
  }
});
```

## Debugging Tests

### Console Output

```typescript
// Temporarily add console.log for debugging
console.log('Result:', JSON.stringify(result, null, 2));

// Use debug mode
DEBUG=* yarn test
```

### VS Code Debugging

1. Add breakpoint in test
2. Run "Debug Test" from VS Code
3. Step through code

### Common Issues

1. **Async Issues**: Always await async operations
2. **Mock Not Working**: Check mock is properly injected
3. **Flaky Tests**: Look for time dependencies or shared state
4. **Type Errors**: Ensure mocks match interfaces

## Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how
   - Tests should survive refactoring

2. **Use Descriptive Test Names**
   ```typescript
   // ✅ Good
   it('should reject email without @ symbol')
   
   // ❌ Bad
   it('should validate input')
   ```

3. **One Assertion Per Test**
   - Makes failures clear
   - Easier to fix broken tests

4. **Isolate Tests**
   - No shared state between tests
   - Each test should be independent

5. **Fast Tests**
   - Mock external dependencies
   - Use in-memory database for tests