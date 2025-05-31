# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hono server with Feature Sliced Design, CQRS, Railway Result types, and Velona DI.

## Commands

```bash
yarn dev          # Start dev server (http://localhost:3000)
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
│       ├── db/       # DB adapters (Prisma/Drizzle)
│       └── external/ # External services
└── entities/         # Shared business entities
```

## Key Patterns

### 1. Result Type (Railway Oriented Programming)
All functions return `Result<T, E>`:
```typescript
import { Result, ok, err } from '@fyuuki0jp/railway-result';

function process(data: string): Result<string, Error> {
  return data ? ok(data) : err(new Error('Invalid'));
}
```

### 2. CQRS with Velona DI
```typescript
// Command
export const createUser = depend(
  { userRepo },
  async ({ userRepo }, data): Result<User, Error> => 
    userRepo.create(data)
);
```

### 3. DB Adapter Pattern
```typescript
// Interface
interface DbAdapter {
  query<T>(sql: string, params?: any[]): Promise<Result<T[], Error>>;
}

// Repository with injected adapter
const userRepo = depend(
  { db },
  ({ db }) => ({
    findById: (id: string) => 
      db.query<User>('SELECT * FROM users WHERE id = ?', [id])
  })
);
```

## Dependencies

- **Hono** - Web framework
- **@fyuuki0jp/railway-result** - Result types
- **velona** - Dependency injection
- **Vite/Vitest** - Build & test
- **TypeScript** - Strict mode

## Important Notes

1. All functions must return `Result<T, E>` (enforced by ESLint)
2. Use Context7 MCP for library docs: `mcp__context7__resolve-library-id` → `mcp__context7__get-library-docs`
3. Test with `.inject()` for mock dependencies