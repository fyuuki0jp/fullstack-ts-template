# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hono server with Feature Sliced Design, CQRS, Railway Result types, and Velona DI.

## Commands

```bash
yarn dev          # Start dev server (http://localhost:3001)
yarn build        # Build project
yarn test         # Run tests
yarn lint         # Run ESLint
yarn typecheck    # TypeScript type check
```

## Directory Structure

```
src/
├── app/              # App config & providers
├── features/         # Feature modules
│   └── [feature]/
│       ├── commands/ # Write operations
│       ├── queries/  # Read operations
│       ├── domain/   # Business logic
│       └── api/      # HTTP endpoints
├── shared/
│   └── adapters/
│       ├── db/       # DB adapters (SQLite/Prisma/Drizzle)
│       └── external/ # External services
└── entities/         # Shared business entities
```

## Implementation Approach

### 1. Railway-Oriented Programming (ROP)

Every function returns `Result<T, E>` for consistent error handling:

```typescript
import { Result, ok, err, isErr } from '@fyuuki0jp/railway-result';

// All functions follow this pattern
async function operation(): Promise<Result<Data, Error>> {
  const result = await dependency.method();
  if (isErr(result)) return result;
  
  return ok(processedData);
}
```

### 2. Feature-Sliced Design (FSD)

Each feature is self-contained with clear boundaries:
- **api/routes.ts** - HTTP endpoints that orchestrate use cases
- **commands/** - Write operations with business validation
- **queries/** - Read operations (simple data fetching)
- **domain/** - Repository interfaces and implementations

### 3. CQRS Pattern

Commands and queries are separated:

```typescript
// Command with validation
export const createUser = depend(
  { userRepo },
  async ({ userRepo }, input) => {
    // Validate email format
    if (!input.email.includes('@')) {
      return err(new Error('Invalid email'));
    }
    return userRepo.create(input);
  }
);

// Query (no business logic)
export const getUsers = depend(
  { userRepo },
  async ({ userRepo }) => userRepo.findAll()
);
```

### 4. Dependency Injection with Velona

Manual injection at the route level:

```typescript
export default function createUserRoutes(db: DbAdapter) {
  const userRepo = userRepositoryImpl.inject({ db });
  const createUserCmd = createUser.inject({ userRepo });
  const getUsersQuery = getUsers.inject({ userRepo });
  
  const router = new Hono();
  // Route handlers use injected dependencies
  return router;
}
```

### 5. Adapter Pattern

Database operations are abstracted:

```typescript
interface DbAdapter {
  query<T>(sql: string, params?: any[]): Promise<Result<T[], Error>>;
  execute(sql: string, params?: any[]): Promise<Result<void, Error>>;
  transaction<T>(fn: (tx: DbAdapter) => Promise<Result<T, Error>>): Promise<Result<T, Error>>;
}
```

### 6. Entity Management

All entities extend base interface:

```typescript
interface Entity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

interface User extends Entity {
  email: string;
  name: string;
}
```

### 7. Error Handling Flow

```typescript
// Route handler
const result = await createUserCmd(input);
if (isErr(result)) {
  return c.json({ error: result.error.message }, 400);
}
return c.json(result.data, 201);
```

### 8. Hono API Method Chaining

All Hono routes MUST use method chaining pattern for clean, readable code:

```typescript
// ✅ CORRECT: Method chaining
export default (db: DbAdapter) => {
  return new Hono()
    .get('/', async (c) => {
      // Handler implementation
    })
    .post('/', async (c) => {
      // Handler implementation
    })
    .put('/:id', async (c) => {
      // Handler implementation
    })
    .delete('/:id', async (c) => {
      // Handler implementation
    });
};

// ❌ WRONG: Separate declarations
export default (db: DbAdapter) => {
  const router = new Hono();
  router.get('/', handler);
  router.post('/', handler);
  return router;
};
```

### 9. Route Implementation Best Practices

#### Route File Structure (api/routes.ts)

```typescript
import { Hono } from 'hono';
import { isErr } from '@fyuuki0jp/railway-result';
import { createUser } from '../commands/create-user';
import { getUsers } from '../queries/get-users';
import { userRepositoryImpl } from '../domain/user-repository-impl';
import type { DbAdapter } from '../../../shared/adapters/db';

export default (db: DbAdapter) => {
  return new Hono()
    .get('/', async (c) => {
      // 1. Inject dependencies
      const userRepository = userRepositoryImpl.inject({ db })();
      const getUsersUseCase = getUsers.inject({ userRepository })();
      
      // 2. Execute use case
      const result = await getUsersUseCase();

      // 3. Handle errors with proper status codes
      if (isErr(result)) {
        return c.json({ error: result.error.message }, 500);
      }

      // 4. Return success response
      return c.json({ users: result.data });
    })
    .post('/', async (c) => {
      // 1. Parse request body with error handling
      let body;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
      }

      // 2. Inject dependencies
      const userRepository = userRepositoryImpl.inject({ db })();
      const createUserUseCase = createUser.inject({ userRepository })();

      // 3. Execute use case
      const result = await createUserUseCase(body);

      // 4. Handle errors with proper status codes
      if (isErr(result)) {
        const statusCode = determineStatusCode(result.error.message);
        return c.json({ error: result.error.message }, statusCode);
      }

      // 5. Return success response with 201 Created
      return c.json({ user: result.data }, 201);
    });
};

// Helper function for status code determination
function determineStatusCode(errorMessage: string): number {
  if (
    errorMessage.includes('Database') ||
    errorMessage.includes('UNIQUE constraint') ||
    errorMessage.includes('Execute failed')
  ) {
    return 500;
  }
  return 400;
}
```

#### Key Patterns

1. **Dependency Injection at Route Level**
   - Inject repositories into use cases inside each handler
   - This allows for better testability and flexibility

2. **Consistent Error Response Format**
   ```typescript
   { error: string }
   ```

3. **Consistent Success Response Format**
   ```typescript
   // For collections
   { users: User[] }
   
   // For single entities
   { user: User }
   ```

4. **Status Code Guidelines**
   - `200 OK` - Successful GET
   - `201 Created` - Successful POST
   - `400 Bad Request` - Validation errors
   - `500 Internal Server Error` - Database/infrastructure errors

5. **Request Body Validation**
   - Always wrap JSON parsing in try-catch
   - Return 400 with clear error message for invalid JSON

6. **Method Chaining Order**
   - GET routes first (read operations)
   - POST routes (create operations)
   - PUT/PATCH routes (update operations)
   - DELETE routes (delete operations)

## Key Implementation Details

- **Database**: SQLite with better-sqlite3 (WAL mode enabled)
- **IDs**: Generated using `crypto.randomUUID()`
- **Dates**: Stored as ISO strings, converted to Date objects in domain
- **Validation**: Business rules in commands, not in repositories
- **Testing**: Use `.inject()` to provide mock dependencies

## Dependencies

- **Hono** - Web framework
- **@fyuuki0jp/railway-result** - Result types
- **velona** - Dependency injection
- **better-sqlite3** - SQLite driver
- **tsx** - TypeScript execution
- **Vite/Vitest** - Build & test
- **TypeScript** - Strict mode

## Test-Driven Development (TDD)

### Development Workflow

1. **Red** - Write a failing test first
2. **Green** - Write minimal code to make the test pass
3. **Refactor** - Improve code quality while keeping tests green

### Test Structure

```typescript
// Example test for a command
describe('createUser command', () => {
  let mockUserRepo: UserRepository;
  let createUserCmd: ReturnType<typeof createUser.inject>;

  beforeEach(() => {
    mockUserRepo = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
    };
    createUserCmd = createUser.inject({ userRepository: mockUserRepo });
  });

  it('should create a user with valid input', async () => {
    // Arrange
    const input = { email: 'test@example.com', name: 'Test User' };
    const expected = { id: '123', ...input, createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(mockUserRepo.create).mockResolvedValue(ok(expected));

    // Act
    const result = await createUserCmd()(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expected);
    }
    expect(mockUserRepo.create).toHaveBeenCalledWith(input);
  });
});
```

### Testing Guidelines

1. **File Naming**: Use `.spec.ts` suffix for test files
2. **Test Location**: Place tests next to the code they test
3. **Mock Strategy**: 
   - Use `vi.fn()` for simple mocks
   - Use `MockDbAdapter` for database layer testing
   - Inject mocks using `.inject()` method from Velona
4. **Test Categories**:
   - **Commands**: Test business validation and error handling
   - **Queries**: Test data retrieval and error propagation
   - **Repositories**: Test database operations and data transformation
   - **Routes**: Test HTTP layer integration

### Test Patterns

#### Testing Railway Results
```typescript
// Success case
expect(result.success).toBe(true);
if (result.success) {
  expect(result.data).toEqual(expectedData);
}

// Error case
expect(isErr(result)).toBe(true);
if (isErr(result)) {
  expect(result.error.message).toBe('Expected error message');
}
```

#### Testing Commands with Validation
```typescript
it('should validate email format', async () => {
  const result = await createUserCmd()({ email: 'invalid', name: 'User' });
  
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.error.message).toBe('Invalid email format');
  }
  expect(mockUserRepo.create).not.toHaveBeenCalled();
});
```

#### Testing Repository Implementation
```typescript
it('should transform database row to User entity', async () => {
  const dbRow = {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    created_at: '2023-01-01T12:00:00Z',
    updated_at: '2023-01-02T14:30:00Z',
  };
  mockDb.setData('users', [dbRow]);

  const result = await userRepo.findById('123');

  expect(result.success).toBe(true);
  if (result.success && result.data) {
    expect(result.data.createdAt).toBeInstanceOf(Date);
    expect(result.data.updatedAt).toBeInstanceOf(Date);
  }
});
```

### Mock Implementations

#### MockDbAdapter Usage
```typescript
const mockDb = new MockDbAdapter();
const userRepo = userRepositoryImpl.inject({ db: mockDb })();

// Setup test data
mockDb.setData('users', [{ id: '1', email: 'test@example.com', name: 'Test' }]);

// Simulate database errors
mockDb.mockFailure('Database connection failed');
```

#### Repository Mock
```typescript
const mockUserRepo: UserRepository = {
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
};
```

### Coverage Requirements

- All commands must test validation logic
- All queries must test error propagation
- All repositories must test data transformation
- All routes must test HTTP status codes and response format

### Route Testing Best Practices

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
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
    it('should return all users', async () => {
      mockDb.setData('users', [
        { id: '1', email: 'user@example.com', name: 'User' }
      ]);

      const res = await app.request('/');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users).toHaveLength(1);
    });

    it('should handle database errors', async () => {
      mockDb.mockFailure('Database error');
      
      const res = await app.request('/');
      
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /', () => {
    it('should create user with valid data', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', name: 'Test' }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user.email).toBe('test@example.com');
    });

    it('should handle invalid JSON', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid JSON');
    });
  });
});
```

## Important Notes

1. All functions must return `Result<T, E>` (enforced by ESLint)
2. Use Context7 MCP for library docs: `mcp__context7__resolve-library-id` → `mcp__context7__get-library-docs`
3. Test with `.inject()` for mock dependencies
4. Never throw exceptions - always return `err(new Error(...))`
5. Keep business logic in commands/queries, not in routes or repositories
6. **TDD First**: Always write tests before implementation
7. **Test All Paths**: Cover success, validation errors, and infrastructure errors
