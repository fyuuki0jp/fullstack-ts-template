# CLAUDE.md

## 言語設定
- **ユーザーとの対話**: 日本語
- **コード**: 英語（変数名、関数名、コメント等）
- **コミットメッセージ**: 英語
- **エラーメッセージ**: 日本語（ユーザー向け）、英語（開発者向けログ）

## Project Overview
Fullstack TypeScript monorepo with Feature-Sliced Design (FSD), CQRS, Result patterns, and Velona DI.

## Essential Commands
```bash
# Development
yarn dev                                 # Backend:3000, Frontend:5173
yarn test:watch                         # Watch mode for tests
yarn lint && yarn typecheck && yarn build  # Quality checks

# Code generation (ALWAYS use scaffolding first)
yarn create:backend:entity <name>
yarn create:backend:feature <feature> [entity]
yarn create:frontend:feature <feature> [entity]
yarn create:frontend:widget <name>
```

## Architecture (v2)
```
backend/src/
├── entities/[entity]/      # Data layer: schema.ts + repository.ts
├── features/[feature]/     # Business layer: commands/ + queries/ + api/ + domain/
└── shared/adapters/        # DB + external services

frontend/src/
├── features/[feature]/     # API hooks + UI components
├── widgets/                # Composite components
├── pages/                  # Page components
└── shared/                 # Reusable UI + types
```

## Mandatory Patterns

### 1. TDD Red-Green-Blue Cycle
1. 🔴 **RED**: Run scaffolding → Update TODOs → Failing tests
2. 🟢 **GREEN**: Minimal implementation → Tests pass
3. 🔵 **BLUE**: Refactor + MCP tools for comprehensive coverage

### 2. Result Pattern (Never throw)
```typescript
// ✅ Always return Result<T, Error>
export const createUser = async (input: unknown): Promise<Result<User, Error>> => {
  const validation = validateInput(input);
  if (isErr(validation)) return validation;
  // ...
};
```

### 3. Type Strategy (DRY Principle)
```typescript
// ✅ Entities are Single Source of Truth
export type CreateUserRequest = Pick<User, 'email' | 'name'>;
export type UpdateUserRequest = Partial<Pick<User, 'email' | 'name'>>;
```

## Claude Development Workflow

### 🎯 Always Start with Scaffolding
```bash
# Never create files manually - use tools first
yarn create:backend:entity product                    # → schema.ts + repository.ts  
yarn create:backend:feature product-management product # → commands + queries + API
yarn create:frontend:feature product-management product # → hooks + UI components
```

### 📋 Task Planning (Use TodoWrite for multi-step tasks)
```typescript
TodoWrite([
  { content: "Create entity with scaffolding", status: "pending", priority: "high" },
  { content: "Implement business logic in feature", status: "pending", priority: "high" },
  { content: "Build frontend with components", status: "pending", priority: "medium" }
]);
```

### 🧪 Testing with MCP Tools
```bash
# Use after scaffolding for comprehensive coverage
mcp__testing-mcp__create_decision_table     # Complex scenarios
mcp__testing-mcp__generate_tests           # Edge cases  
mcp__testing-mcp__analyze_coverage         # Gap analysis
```

### ✅ Quality Gates (Before completing features)
```bash
yarn test                # 80% coverage required
yarn typecheck          # No `any` types
yarn lint               # ESLint passes
yarn build              # Production build works
```

## Key Rules
- **No manual file creation** - scaffolding exists for everything
- **No throw statements** - always use Result pattern
- **No type duplication** - Pick/Partial from entities
- **Always TDD** - tests first, then minimal implementation
- **TodoWrite for planning** - break down complex tasks
- **MCP tools for testing** - comprehensive coverage analysis

## Response Formats
```typescript
// API Success: { users: User[] } | { user: User } | { message: "Deleted" }
// API Error: { error: "日本語エラーメッセージ" }
// Status: 200 (GET), 201 (POST), 400 (validation), 404 (not found), 500 (server)
```