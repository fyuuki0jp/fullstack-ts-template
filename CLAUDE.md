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

## Database (PGLite + Drizzle)

- **Development**: Uses PGLite
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

## Creating Shared Packages

This monorepo supports creating shared packages in the `packages/` directory for code reuse across workspaces.

### Package Structure

```
packages/[package-name]/
├── src/
│   └── index.ts                # Main implementation
├── dist/                       # Built output (auto-generated)
├── package.json                # Package configuration
├── tsconfig.json              # TypeScript configuration
├── eslint.config.mjs          # ESLint configuration
└── README.md                   # Package documentation
```

### Essential Configuration Files

#### package.json
```json
{
  "name": "package-name",
  "version": "1.0.0", 
  "description": "Package description",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "prepare": "tsc",
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest",
    "test:watch": "vitest --watch", 
    "test:coverage": "vitest --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  },
  "devDependencies": {
    "@types/node": "^20.11.17",
    "typescript": "^5.7.2"
  },
  "files": ["dist", "package.json"],
  "license": "MIT"
}
```

#### tsconfig.json
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.spec.ts", "**/*.test.ts"]
}
```

#### eslint.config.mjs
```javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.js'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
```

### Integration Steps

1. **Add to workspace**: Root `package.json` includes `"packages/*"` in workspaces
2. **Install in consumers**: Add dependency with `"package-name": "file:../packages/package-name"`
3. **Update CI workflows**: Add build step for shared packages:
   ```yaml
   - name: Build shared packages
     run: yarn workspace package-name build
   - name: Refresh package links
     run: yarn install --force
   ```

### Best Practices

- **Package naming**: Use simple names without `@` characters to avoid conflicts with Vitest aliases
- **ESM first**: All packages use `"type": "module"` for ES module support
- **TypeScript strict**: Enable strict type checking with declaration files
- **Build before test**: CI must build packages before running tests
- **Symlink refresh**: Run `yarn install --force` after building to refresh symlinks
- **Version alignment**: Use consistent versions across all workspaces (especially Vitest)

### Example: Railway Result Package

The `result` package demonstrates this pattern, providing functional error handling:

```typescript
// packages/result/src/index.ts
export type Result<T, E extends Error> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({
  ok: true,
  value,
  error: null,
});

export const err = <E extends Error>(error: E): Err<E> => ({
  ok: false,
  value: null,
  error,
});
```

Usage across workspaces:
```typescript
import { ok, err, type Result } from 'result';

export const createUser = async (input: unknown): Promise<Result<User, Error>> => {
  // Implementation using Railway Result pattern
};
```