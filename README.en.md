# Fullstack TypeScript Template

A modern fullstack TypeScript monorepo template with Test-Driven Development (TDD), Feature-Sliced Design (FSD), CQRS, and Railway Result patterns.

[日本語](./README.md)

## 🚀 Features

- **Backend**: Hono + SQLite + Drizzle ORM + Railway Result pattern
- **Frontend**: React + Vite + TanStack Query + Tailwind CSS
- **Architecture**: Feature-Sliced Design (FSD) + CQRS
- **Development**: Test-Driven Development (TDD) - Red-Green-Refactor
- **Type Safety**: End-to-end TypeScript + Zod validation
- **DI**: Dependency injection with Velona

## 🏗️ Project Structure

```
backend/src/
├── features/[feature]/     # Feature modules (CQRS)
│   ├── commands/           # Write operations
│   ├── queries/            # Read operations  
│   ├── domain/             # Business logic
│   └── api/                # HTTP endpoints
├── entities/               # Domain entities (Zod + Branded Types)
└── shared/adapters/        # DB & external service adapters

frontend/src/
├── features/[feature]/     # Feature modules (FSD)
│   ├── api/                # API hooks (TanStack Query)
│   ├── ui/                 # UI components
│   └── model/              # Local state management
├── shared/                 # Shared resources
├── widgets/                # Composite UI components
└── pages/                  # Page components
```

## 🚀 Quick Start

```bash
# Install dependencies
yarn install

# Start dev servers (Backend: 3000, Frontend: 5173)
yarn dev

# Run tests (TDD)
yarn test
yarn workspace backend test:watch
yarn workspace frontend test:watch

# Quality checks
yarn lint
yarn typecheck
yarn build
```

## 📝 Development Commands

### Basic Commands
```bash
yarn dev                    # Start dev servers
yarn test                   # Run all tests
yarn test:e2e              # Run E2E tests
yarn lint                  # ESLint
yarn typecheck             # Type checking
yarn build                 # Build
```

### Code Generation
```bash
# Backend
yarn create:backend:entity <name>
yarn create:backend:feature <feature> [entity]

# Frontend
yarn create:frontend:feature <feature> [entity]
yarn create:frontend:widget <name>
```

### Coverage Check
```bash
yarn workspace backend test:coverage
yarn workspace frontend test:coverage
```

## 🎯 Development Standards

### 1. TDD (Test-Driven Development) Required
```
1. 🔴 RED   - Write failing test
2. 🟢 GREEN - Write minimal code to pass
3. 🔵 BLUE  - Refactor
```

### 2. Railway Result Pattern
```typescript
// ✅ Correct implementation
export const createUser = async (input: unknown): Promise<Result<User, Error>> => {
  const validation = validateCreateUserInput(input);
  if (isErr(validation)) return validation;
  // ...
};

// ❌ Never throw exceptions
throw new Error('...'); // Forbidden
```

### 3. Zod Validation
```typescript
// Use Branded Types
export const UserIdSchema = z.string().uuid().brand<'UserId'>();
export type UserId = z.infer<typeof UserIdSchema>;
```

### 4. DI with Velona
```typescript
export const UserEntity = depend({ db: {} as DrizzleDb }, ({ db }) => ({
  async create(input: CreateUserInput): Promise<Result<User, Error>> {
    // Implementation
  }
}));
```

## 📊 Quality Standards

- **Test Coverage**: 80%+ (branches, functions, lines, statements)
- **Type Safety**: strict mode, no `any`
- **Error Handling**: Railway Result pattern required
- **Validation**: Zod for all external input

## 🛠️ Tech Stack

### Backend
- [Hono](https://hono.dev/) - Lightweight web framework
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [Railway Result](https://github.com/fyuuki0jp/railway-result) - Functional error handling
- [Velona](https://github.com/frouriojs/velona) - Dependency injection
- [Zod](https://zod.dev/) - Schema validation

### Frontend
- [React](https://react.dev/) - UI library
- [Vite](https://vitejs.dev/) - Build tool
- [TanStack Query](https://tanstack.com/query) - Server state management
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

### Testing
- [Vitest](https://vitest.dev/) - Unit testing
- [Playwright](https://playwright.dev/) - E2E testing
- [MSW](https://mswjs.io/) - API mocking

## 📄 License

MIT