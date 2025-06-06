# SPA Hono

Full-stack monorepo with Feature Sliced Design (FSD), CQRS, Railway Result types, and Velona DI.

[日本語版README](./README.md)

## 🚀 Features

- **Backend**: Hono server with SQLite, Feature-Sliced Design (FSD), CQRS, and Railway Result patterns
- **Frontend**: React + Vite + TanStack Query with Feature-Sliced Design
- **Type Safety**: End-to-end TypeScript with strict mode and Hono RPC client
- **Testing**: Test-Driven Development (TDD) with Vitest + Playwright E2E
- **Developer Experience**: Hot reload, concurrent development, and comprehensive tooling

## 📁 Project Structure

```
/
├── backend/          # Hono server (FSD + CQRS)
│   └── src/
│       ├── features/         # Feature modules
│       │   └── [feature]/
│       │       ├── commands/ # Write operations (Railway Result)
│       │       ├── queries/  # Read operations
│       │       ├── domain/   # Business logic + Repository
│       │       └── api/      # HTTP endpoints (Hono)
│       ├── shared/
│       │   └── adapters/
│       │       ├── db/       # Database adapters
│       │       └── external/ # External services
│       ├── entities/         # Shared business entities
│       └── server.ts         # Hono application
└── frontend/         # React app (FSD)
    └── src/
        ├── app/              # App initialization
        │   └── providers/    # Global providers
        ├── features/         # Feature modules
        │   └── [feature]/
        │       ├── api/      # API hooks (TanStack Query)
        │       ├── ui/       # UI components
        │       └── model/    # Local state (optional)
        ├── shared/
        │   ├── ui/           # Reusable UI components
        │   ├── lib/          # Common libraries (API client)
        │   └── types/        # Shared type definitions
        ├── widgets/          # Composite widgets
        └── pages/            # Page components
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- Yarn 1.22+

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd fullstack-ts-template

# Install dependencies
yarn install

# Start development servers
yarn dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 📝 Available Scripts

### Monorepo Commands

```bash
# Development
yarn dev          # Start both servers concurrently
yarn build        # Build all projects
yarn test         # Run all tests
yarn test:e2e     # Run E2E tests with Playwright
yarn lint         # Run ESLint on all projects
yarn typecheck    # TypeScript type check all projects

# Individual workspaces
yarn workspace backend dev    # Backend only
yarn workspace frontend dev   # Frontend only
```

## 🏗️ Architecture

### Backend
- **Hono**: Lightweight web framework with RPC capabilities
- **SQLite**: Embedded database with better-sqlite3
- **Feature-Sliced Design**: Vertical feature organization
- **CQRS**: Command Query Responsibility Segregation
- **Railway Result**: Functional error handling
- **Velona**: Dependency injection
- **TypeScript**: Strict mode

### Frontend
- **React**: UI library
- **Vite**: Build tool with HMR
- **TanStack Query**: Server state management
- **Feature-Sliced Design**: Scalable frontend architecture
- **Hono RPC Client**: Type-safe API communication
- **Tailwind CSS**: Utility-first CSS framework

### Testing
- **Vitest**: Unit and integration testing
- **Playwright**: End-to-end testing
- **MSW**: API mocking for frontend tests

## 🧪 Testing

```bash
# Run all tests
yarn test

# Run backend tests
yarn workspace backend test

# Run frontend tests
yarn workspace frontend test

# Run E2E tests
yarn test:e2e

# Watch mode
yarn test:watch
```

## 🔧 Development Patterns

### Backend Development

1. **CQRS Pattern**: Separate commands (write) and queries (read)
2. **Railway Result**: All functions return `Result<T, E>` for consistent error handling
3. **Dependency Injection**: Use Velona's `depend` for testable code
4. **Repository Pattern**: Abstract database operations

Example:
```typescript
// Command with validation
export const createUser = depend(
  { userRepo },
  async ({ userRepo }, input) => {
    if (!input.email.includes('@')) {
      return err(new Error('Invalid email'));
    }
    return userRepo.create(input);
  }
);
```

### Frontend Development

1. **Feature-Sliced Design**: Organize by features, not file types
2. **API Hooks**: Use TanStack Query for server state
3. **Type Safety**: Leverage Hono RPC client for end-to-end types
4. **Component Hierarchy**: `shared/ui` → `features` → `widgets` → `pages`

Example:
```typescript
// API hook with TanStack Query
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.api.users.$get();
      return response.json();
    },
  });
};
```

## 📚 Documentation

See [CLAUDE.md](./CLAUDE.md) for detailed development patterns and guidelines.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (TDD)
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Built with these amazing technologies:
- [Hono](https://hono.dev/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TanStack Query](https://tanstack.com/query)
- [Railway Result](https://github.com/fyuuki0jp/railway-result)
- [Velona](https://github.com/frouriojs/velona)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [Tailwind CSS](https://tailwindcss.com/)