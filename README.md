# SPA Hono

Hono server with Feature Sliced Design, CQRS, Railway Result types, and Velona DI.

## 🚀 Features

- **Backend**: Hono server with SQLite, Feature-Sliced Design (FSD), CQRS, and Railway Result patterns
- **Type Safety**: End-to-end TypeScript with strict mode
- **Testing**: Test-Driven Development (TDD) with Vitest
- **Developer Experience**: Hot reload, concurrent development, and comprehensive tooling

## 📁 Project Structure

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

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- Yarn 1.22+

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd spa-hono

# Install dependencies
yarn install

# Start development server
yarn dev
```

The application will be available at:
- Backend API: http://localhost:3001

## 📝 Available Scripts

```bash
# Development
yarn dev          # Start dev server (http://localhost:3001)
yarn build        # Build project
yarn test         # Run tests
yarn lint         # Run ESLint
yarn typecheck    # TypeScript type check
```

## 🏗️ Architecture

- **Hono**: Lightweight web framework
- **SQLite**: Embedded database with better-sqlite3
- **Feature-Sliced Design**: Vertical feature organization
- **CQRS**: Command Query Responsibility Segregation
- **Railway Result**: Functional error handling
- **Velona**: Dependency injection
- **TypeScript**: Strict mode
- **Vitest**: Testing framework

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
- [Railway Result](https://github.com/fyuuki0jp/railway-result)
- [Velona](https://github.com/frouriojs/velona)
- [Vitest](https://vitest.dev/)