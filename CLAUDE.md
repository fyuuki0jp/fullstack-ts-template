# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Full-stack SPA Template** with modern architecture patterns:
- **Backend**: Hono + SQLite with Feature-Sliced Design (FSD), CQRS, Railway Result types
- **Frontend**: React + Vite with file-based routing (generouted), Tailwind CSS
- **Testing**: TDD with Vitest, comprehensive test patterns
- **Type Safety**: End-to-end TypeScript with strict mode

## 🚀 Quick Start

For immediate development, see: **[.claude/quick-start.md](.claude/quick-start.md)**

## 📁 Project Structure

```
.
├── backend/              # Backend API (port 3000)
│   ├── entities/         # Shared business entities
│   ├── features/         # Feature modules (FSD)
│   ├── shared/          # Shared utilities & adapters
│   └── server.ts        # Main server entry
├── frontend/            # Frontend SPA
│   ├── app/            # Routes (file-based)
│   ├── components/     # Reusable components
│   └── main.tsx        # React entry
└── .claude/            # Claude AI documentation
```

## 📚 Documentation Structure

### Essential Guides
- **[Quick Start Guide](.claude/quick-start.md)** - Get started in 5 minutes
- **[Architecture Overview](.claude/architecture.md)** - Technical patterns & decisions

### Development Patterns
- **[Backend Development](.claude/backend.md)** - API routes, CQRS, repositories
- **[Frontend Development](.claude/frontend.md)** - React patterns, routing, state
- **[Testing Guide](.claude/testing.md)** - TDD workflow, test patterns

### Advanced Topics (create as needed)
- `.claude/features/` - Feature-specific documentation
- `.claude/deployment.md` - Production deployment guide
- `.claude/troubleshooting.md` - Common issues & solutions

## 🛠️ Key Technologies

### Backend Stack
- **Hono** - Lightweight web framework
- **SQLite** - Embedded database with better-sqlite3
- **Railway Result** - Functional error handling
- **Velona** - Dependency injection

### Frontend Stack
- **React 18** - UI library
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Utility-first styling
- **generouted** - File-based routing

## 🎯 Core Principles

1. **Test-Driven Development (TDD)** - Write tests first
2. **Railway-Oriented Programming** - All functions return `Result<T, E>`
3. **Feature-Sliced Design** - Vertical feature organization
4. **CQRS Pattern** - Separate reads and writes
5. **Type Safety** - End-to-end TypeScript

## 🔧 Available Commands

```bash
# Development
yarn dev              # Start both frontend & backend
yarn dev:frontend     # Frontend only
yarn dev:backend      # Backend only

# Testing & Quality
yarn test            # Run all tests
yarn lint            # ESLint check
yarn typecheck       # TypeScript check

# Building
yarn build           # Build everything
yarn build:frontend  # Frontend only
yarn build:backend   # Backend only
```

## 📝 Important Notes

1. **All functions must return `Result<T, E>`** - Enforced by ESLint
2. **Never throw exceptions** - Use `err(new Error(...))`
3. **Business logic in commands/queries** - Not in routes or repositories
4. **Test coverage required** - All features must have tests
5. **Follow existing patterns** - Check similar code before implementing

## 🚦 Getting Help

- For library documentation: Use Context7 MCP
  - `mcp__context7__resolve-library-id` → `mcp__context7__get-library-docs`
- For project patterns: Check `.claude/` documentation
- For examples: Look at existing features (e.g., `user` feature)

---

**Note**: This is a GitHub template repository. When using this template:
1. Update project-specific details in package.json
2. Run `yarn install` to install dependencies
3. Run `yarn dev` to start development
4. Follow the patterns established in the codebase