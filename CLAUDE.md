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

## Important Notes

1. All functions must return `Result<T, E>` (enforced by ESLint)
2. Use Context7 MCP for library docs: `mcp__context7__resolve-library-id` → `mcp__context7__get-library-docs`
3. Test with `.inject()` for mock dependencies
4. Never throw exceptions - always return `err(new Error(...))`
5. Keep business logic in commands/queries, not in routes or repositories
