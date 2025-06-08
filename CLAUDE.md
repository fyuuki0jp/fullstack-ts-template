# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 言語設定

このプロジェクトでは以下の言語を使用します：
- **ユーザーとの対話**: 日本語（要件定義、質問、回答すべて）
- **コード**: 英語（変数名、関数名、コメント等）
- **コミットメッセージ**: 英語
- **エラーメッセージ**: 日本語（ユーザー向け）、英語（開発者向けログ）

## Project Overview

Fullstack TypeScript monorepo with Feature-Sliced Design (FSD), CQRS, Railway Result patterns, and Velona DI.

- **Backend**: Hono server with SQLite, CQRS pattern, Railway Result error handling
- **Frontend**: React + Vite + TanStack Query with Feature-Sliced Design
- **Development**: Test-Driven Development (TDD) with Red-Green-Refactor cycles

## Essential Commands

```bash
# Development (starts both servers)
yarn dev                                 # Backend:3000, Frontend:5173

# Testing (use frequently for TDD)
yarn test                                # All tests
yarn workspace backend test:watch       # Backend watch mode
yarn workspace frontend test:watch      # Frontend watch mode

# Coverage (80% threshold enforced)
yarn workspace backend test:coverage    # Backend coverage report
yarn workspace frontend test:coverage   # Frontend coverage report

# Quality checks (run before commits)
yarn lint                               # ESLint
yarn typecheck                         # TypeScript checks
yarn build                             # Production build
yarn test:e2e                          # Playwright E2E tests
yarn test:e2e:ui                       # E2E with UI debugger

# Code generation scaffolding
yarn create:backend:entity <name>
yarn create:backend:feature <feature> [entity]
yarn create:frontend:feature <feature> [entity]
yarn create:frontend:widget <name>
```

## Architecture

### Backend Structure (CQRS + Railway Result)
```
backend/src/
├── features/[feature]/     # Feature modules
│   ├── commands/           # Write operations (create, update, delete)
│   ├── queries/            # Read operations  
│   ├── domain/             # Business logic + repositories
│   └── api/                # HTTP endpoints (Hono routes)
├── entities/               # Domain entities with Zod schemas + Branded types
└── shared/adapters/        # DB adapters, external services
```

### Frontend Structure (Feature-Sliced Design)
```
frontend/src/
├── features/[feature]/     # Feature modules
│   ├── api/                # API hooks (TanStack Query)
│   ├── ui/                 # UI components
│   └── model/              # Local state (optional)
├── shared/                 # Reusable resources
│   ├── ui/                 # Shared UI components
│   ├── lib/                # API client, utilities
│   └── types/              # Shared types
├── widgets/                # Composite UI components
└── pages/                  # Page components
```

## Mandatory Development Patterns

### 1. TDD Cycle (Strict Requirement)
Always follow Red-Green-Refactor:
1. 🔴 **RED**: Write failing test first
2. 🟢 **GREEN**: Write minimal code to pass
3. 🔵 **BLUE**: Refactor while keeping tests green

### 2. Railway Result Pattern (ESLint Enforced)
All functions must return `Result<T, E>` instead of throwing exceptions:

```typescript
// ✅ Correct
export const createUser = async (input: unknown): Promise<Result<User, Error>> => {
  const validation = validateCreateUserInput(input);
  if (isErr(validation)) return validation;
  // ... 
};

// ❌ Forbidden  
export const createUser = async (input: unknown): Promise<User> => {
  if (!input.email) throw new Error('Email required'); // Never throw
};
```

### 3. Velona Dependency Injection
Use `depend()` for testability:

```typescript
export const UserEntity = depend({ db: {} as DrizzleDb }, ({ db }) => ({
  async create(input: CreateUserInput): Promise<Result<User, Error>> {
    // Implementation
  }
}));
```

### 4. Zod Validation + Branded Types
All input validation uses Zod schemas with branded types for IDs:

```typescript
export const UserIdSchema = z.string().uuid().brand<'UserId'>();
export type UserId = z.infer<typeof UserIdSchema>;
```

### 5. Hono Method Chaining
API routes must use method chaining pattern only:

```typescript
// ✅ Correct
app.get('/users', async (c) => { /* ... */ });

// ❌ Forbidden individual declarations
const getUsersHandler = async (c) => { /* ... */ };
app.get('/users', getUsersHandler);
```

## Quality Requirements

- **Test Coverage**: 80% minimum (branches, functions, lines, statements)
- **No Exceptions**: Use Railway Result pattern exclusively
- **Validation**: All external input must be validated with Zod
- **Type Safety**: Strict TypeScript mode with no `any` types

## Testing Patterns

### Backend Testing
```bash
# Entity tests with domain validation
yarn workspace backend test:watch src/entities/user/

# Command/query tests with mocked dependencies  
yarn workspace backend test:watch src/features/user/commands/
yarn workspace backend test:watch src/features/user/queries/

# API route tests
yarn workspace backend test:watch src/features/user/api/
```

### Frontend Testing
```bash
# API hooks with MSW mocking
yarn workspace frontend test:watch src/features/user-management/api/

# Component testing with React Testing Library
yarn workspace frontend test:watch src/features/user-management/ui/
```

## Development Workflow

1. **Use TodoWrite tool** to plan multi-step tasks
2. **Start with tests** - never implement without tests first
3. **Use scaffolding** - leverage the generation scripts
4. **Watch mode** - run tests in watch mode during development
5. **Check coverage** - ensure 80%+ coverage before completing features
6. **Quality gates** - run `yarn lint && yarn typecheck && yarn build && yarn test` before commits

## Database (SQLite + Drizzle)

- **Development**: Uses SQLite with better-sqlite3
- **Testing**: In-memory database via `DATABASE_MODE=memory`
- **Schema**: Drizzle ORM with automatic migrations
- **Commands**: `yarn workspace backend drizzle:*` for schema operations

## Key Dependencies

- **Backend**: Hono, Drizzle ORM, Railway Result, Velona, Zod
- **Frontend**: React, Vite, TanStack Query, Tailwind CSS  
- **Testing**: Vitest, Playwright, MSW, Testing Library
- **Tooling**: TypeScript strict mode, ESLint with custom Railway rules

## Response Format Standards

### API Response Format
```typescript
// Success responses
{ users: User[] }        // GET /users
{ user: User }          // GET /users/:id, POST /users
{ message: "Deleted" }  // DELETE /users/:id

// Error responses  
{ error: "エラーメッセージ" }  // All errors (user-facing messages in Japanese)
```

### Status Codes
- `200` - Success (GET)
- `201` - Created (POST)
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Server Error (database errors)

## File Naming Conventions

- **Tests**: `*.spec.ts` (co-located with source files)
- **Routes**: `api/routes.ts`
- **Commands**: `commands/[action]-[entity].ts`
- **Queries**: `queries/get-[entities].ts`
- **Entities**: `entities/[entity]/entity.ts`