# SPA Hono Monorepo Template

A modern full-stack monorepo template with Hono backend and React frontend.

## 🚀 Features

- **Monorepo Structure**: Yarn workspaces for efficient package management
- **Backend**: Hono server with SQLite, Feature-Sliced Design (FSD), CQRS, and Railway Result patterns
- **Frontend**: React + Vite with file-based routing (generouted) and Tailwind CSS
- **Type Safety**: End-to-end TypeScript with strict mode
- **Testing**: Test-Driven Development (TDD) with Vitest
- **Developer Experience**: Hot reload, concurrent development, and comprehensive tooling

## 📁 Project Structure

```
.
├── packages/
│   ├── backend/          # Backend API (@spa-hono/backend)
│   │   ├── entities/     # Business entities
│   │   ├── features/     # Feature modules (FSD)
│   │   ├── shared/       # Shared utilities
│   │   └── server.ts     # Main server
│   └── frontend/         # Frontend SPA (@spa-hono/frontend)
│       ├── app/          # Routes (file-based)
│       ├── components/   # React components
│       └── main.tsx      # Entry point
└── .claude/              # AI assistant documentation
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

# Install dependencies for all packages
yarn install

# Start development servers
yarn dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 📝 Available Scripts

```bash
# Development
yarn dev                                 # Start both frontend & backend
yarn workspace @spa-hono/frontend dev    # Frontend only
yarn workspace @spa-hono/backend dev     # Backend only

# Building
yarn build                               # Build all packages
yarn workspace @spa-hono/frontend build  # Frontend only
yarn workspace @spa-hono/backend build   # Backend only

# Testing
yarn test                                # Run all tests
yarn test:watch                          # Watch mode

# Code Quality
yarn lint                                # ESLint
yarn typecheck                           # TypeScript check
yarn format                              # Prettier format
```

## 🏗️ Architecture

### Backend
- **Hono**: Lightweight web framework
- **SQLite**: Embedded database with better-sqlite3
- **Feature-Sliced Design**: Vertical feature organization
- **CQRS**: Command Query Responsibility Segregation
- **Railway Result**: Functional error handling
- **Velona**: Dependency injection

### Frontend
- **React 18**: UI library
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first styling
- **generouted**: File-based routing
- **React Query**: Data fetching (optional)

## 📚 Documentation

For detailed documentation and guides:
- [Quick Start Guide](.claude/quick-start.md)
- [Architecture Overview](.claude/architecture.md)
- [Backend Development](.claude/backend.md)
- [Frontend Development](.claude/frontend.md)
- [Testing Guide](.claude/testing.md)

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
- [Tailwind CSS](https://tailwindcss.com/)
- [Railway Result](https://github.com/fyuuki0jp/railway-result)
- [Velona](https://github.com/frouriojs/velona)