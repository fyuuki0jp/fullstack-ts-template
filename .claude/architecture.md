# 🏗️ Architecture Overview

This document explains the technical architecture and design decisions of this full-stack application.

## Core Architecture Patterns

### 1. Railway-Oriented Programming (ROP)

Every function returns a `Result<T, E>` type for explicit error handling:

```typescript
import { Result, ok, err, isErr } from '@fyuuki0jp/railway-result';

// ✅ Good: Explicit error handling
async function getUser(id: string): Promise<Result<User, Error>> {
  const result = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  if (isErr(result)) return result;
  
  if (result.data.length === 0) {
    return err(new Error('User not found'));
  }
  
  return ok(transformToUser(result.data[0]));
}

// ❌ Bad: Throwing exceptions
async function getUser(id: string): Promise<User> {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) throw new Error('User not found'); // Never do this!
  return user;
}
```

### 2. Feature-Sliced Design (FSD)

Features are organized vertically with clear boundaries:

```
src/features/user/
├── api/          # Public API layer
│   └── routes.ts # HTTP endpoints
├── commands/     # Write operations
│   └── create-user.ts
├── queries/      # Read operations
│   └── get-users.ts
└── domain/       # Business logic
    ├── repository.ts      # Interface
    └── user-repository-impl.ts # Implementation
```

### 3. CQRS (Command Query Responsibility Segregation)

Commands and queries are separated for clarity:

```typescript
// Command: Has side effects, validates business rules
export const createUser = depend(
  { userRepository },
  async ({ userRepository }, input: CreateUserInput) => {
    // Business validation
    if (!input.email.includes('@')) {
      return err(new Error('Invalid email format'));
    }
    
    // Delegate to repository
    return userRepository.create(input);
  }
);

// Query: No side effects, just data retrieval
export const getUsers = depend(
  { userRepository },
  async ({ userRepository }) => userRepository.findAll()
);
```

### 4. Dependency Injection with Velona

Dependencies are injected manually for testability:

```typescript
// Define dependencies
export const createUser = depend(
  { userRepository: {} as UserRepository },
  async ({ userRepository }, input) => {
    // Implementation
  }
);

// Inject at runtime
const injectedCreateUser = createUser.inject({
  userRepository: userRepositoryImpl.inject({ db })()
});

// Use in route
const result = await injectedCreateUser(input);
```

## Database Architecture

### Adapter Pattern

Database operations are abstracted behind an interface:

```typescript
export interface DbAdapter {
  query<T>(sql: string, params?: any[]): Promise<Result<T[], Error>>;
  execute(sql: string, params?: any[]): Promise<Result<void, Error>>;
  transaction<T>(
    fn: (tx: DbAdapter) => Promise<Result<T, Error>>
  ): Promise<Result<T, Error>>;
}
```

### Entity Management

All entities follow a consistent structure:

```typescript
export interface Entity {
  id: string;        // UUID v4
  createdAt: Date;   // Created timestamp
  updatedAt: Date;   // Last update timestamp
}

// Domain entities extend Entity
export interface User extends Entity {
  email: string;
  name: string;
}
```

### Data Transformation

Database rows are transformed at the repository level:

```typescript
// Database row (snake_case)
interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;  // ISO string
  updated_at: string;  // ISO string
}

// Transform to domain entity (camelCase)
function transformToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
```

## API Architecture

### Route Organization

Routes use Hono's method chaining for clean code:

```typescript
export default (db: DbAdapter) => {
  return new Hono()
    .get('/', async (c) => {
      // GET /api/users
    })
    .post('/', async (c) => {
      // POST /api/users
    })
    .get('/:id', async (c) => {
      // GET /api/users/:id
    })
    .put('/:id', async (c) => {
      // PUT /api/users/:id
    })
    .delete('/:id', async (c) => {
      // DELETE /api/users/:id
    });
};
```

### Error Handling

Consistent error responses across the API:

```typescript
// Route handler pattern
const result = await useCase(input);

if (isErr(result)) {
  const status = determineStatusCode(result.error);
  return c.json({ error: result.error.message }, status);
}

return c.json({ user: result.data }, 201);
```

### Response Formats

Consistent JSON response structure:

```typescript
// Success responses
{ users: User[] }        // GET /users
{ user: User }          // GET /users/:id, POST /users
{ message: "Deleted" }  // DELETE /users/:id

// Error responses
{ error: "Error message" }  // All errors
```

## Client Integration

The API is designed to be consumed by any client (React, Vue, mobile apps, etc.). The focus is on providing a clean, consistent API that follows REST principles.

## Testing Architecture

### Test Organization

Tests live next to the code they test:

```
create-user.ts
create-user.spec.ts  # Test file
```

### Mock Strategy

Different mocking approaches by layer:

```typescript
// Repository tests: Use MockDbAdapter
const mockDb = new MockDbAdapter();
mockDb.setData('users', [testUser]);

// Command tests: Mock repository
const mockRepo = {
  create: vi.fn().mockResolvedValue(ok(user))
};

// Route tests: Full integration with MockDbAdapter
const app = new Hono().route('/', createUserRoutes(mockDb));
const response = await app.request('/');
```

## Security Considerations

### Input Validation

- Validation happens in commands, not repositories
- Use explicit validation with clear error messages
- Never trust client input

### SQL Injection Prevention

- Always use parameterized queries
- Never concatenate SQL strings

```typescript
// ✅ Good: Parameterized query
db.query('SELECT * FROM users WHERE id = ?', [id]);

// ❌ Bad: String concatenation
db.query(`SELECT * FROM users WHERE id = '${id}'`);
```

### Authentication & Authorization

- Implement in middleware (not included in template)
- Add to routes that need protection
- Consider JWT or session-based auth

## Performance Considerations

### Database

- SQLite with WAL mode for concurrent reads
- Indexes on frequently queried columns
- Connection pooling not needed (SQLite)

### API

- Lightweight Hono framework
- No unnecessary middleware
- Efficient error handling

### Frontend

- Vite for fast development
- Code splitting with React.lazy (when needed)
- Optimized production builds

## Deployment Architecture

### Backend Deployment

- Single Node.js process
- SQLite file on persistent volume
- Environment variables for config

### Frontend Deployment

- Static files (HTML, JS, CSS)
- CDN for global distribution
- API proxy configuration

### Environment Variables

```bash
# Backend
PORT=3000
DATABASE_PATH=./db.sqlite

# Frontend (build time)
VITE_API_URL=https://api.example.com
```

## Future Considerations

### Scaling

- PostgreSQL for multi-instance deployments
- Redis for caching
- Message queue for async operations

### Monitoring

- Structured logging
- Error tracking (Sentry)
- Performance monitoring

### Advanced Features

- Real-time updates (WebSockets)
- File uploads
- Background jobs