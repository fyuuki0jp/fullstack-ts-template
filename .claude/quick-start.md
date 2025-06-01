# 🚀 Quick Start Guide

Get your full-stack app running in 5 minutes!

## Prerequisites

- Node.js 18+ and Yarn installed
- Basic knowledge of TypeScript, React, and SQL

## 1. Initial Setup

```bash
# Clone/use this template
git clone [your-repo-url]
cd [your-project-name]

# Install dependencies
yarn install

# Start development
yarn dev
```

Your app is now running:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

## 2. Create Your First Feature

Let's create a "Product" feature step by step.

### Step 1: Define the Entity

```bash
# Create entity file
touch backend/entities/product.ts
```

```typescript
// backend/entities/product.ts
import type { Entity } from './types';

export interface Product extends Entity {
  name: string;
  price: number;
  description?: string;
}
```

### Step 2: Create Feature Structure

```bash
# Create feature directories
mkdir -p backend/features/product/{api,commands,queries,domain}
```

### Step 3: Write Tests First (TDD)

```bash
# Create test file
touch backend/features/product/commands/create-product.spec.ts
```

See the existing `user` feature for test examples!

### Step 4: Implement the Feature

Follow this order:
1. **Domain**: Repository interface & implementation
2. **Commands**: Write operations (create, update, delete)
3. **Queries**: Read operations (get, list)
4. **API Routes**: HTTP endpoints

### Step 5: Add Frontend Route

```bash
# Create product listing page
touch frontend/app/products/index.tsx
```

```tsx
// frontend/app/products/index.tsx
export default function ProductsPage() {
  // Your component code
}
```

## 3. Common Tasks

### Add a New API Endpoint

1. Add route in `backend/features/[feature]/api/routes.ts`
2. Use method chaining pattern
3. Return consistent response format

### Add a Frontend Page

1. Create file in `frontend/app/[route].tsx`
2. Route is automatically generated
3. Use fetch for API calls

### Run Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test --watch

# Run specific test file
yarn test user.spec
```

### Database Migrations

The database schema is created automatically in `backend/server.ts`. To add a new table:

```typescript
// In backend/server.ts
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);
```

## 4. Best Practices Checklist

✅ **Before Writing Code:**
- [ ] Write tests first (TDD)
- [ ] Check existing patterns in codebase
- [ ] Plan your feature structure

✅ **While Coding:**
- [ ] All functions return `Result<T, E>`
- [ ] Never throw exceptions
- [ ] Follow FSD structure
- [ ] Keep business logic in commands/queries

✅ **After Coding:**
- [ ] Run `yarn lint`
- [ ] Run `yarn typecheck`
- [ ] Run `yarn test`
- [ ] Check that all tests pass

## 5. Quick Reference

### File Naming
- Tests: `*.spec.ts`
- Routes: `api/routes.ts`
- Commands: `commands/[action]-[entity].ts`
- Queries: `queries/get-[entities].ts`

### Status Codes
- `200` - Success (GET)
- `201` - Created (POST)
- `400` - Bad Request (validation)
- `500` - Server Error (database)

### Response Format
```typescript
// Success
{ users: User[] }      // Collection
{ user: User }         // Single

// Error
{ error: string }      // All errors
```

## Need More Help?

- Check existing `user` feature for examples
- See [Architecture Overview](./architecture.md) for patterns
- See [Testing Guide](./testing.md) for test patterns
- See [Backend Guide](./backend.md) for API development
- See [Frontend Guide](./frontend.md) for React patterns