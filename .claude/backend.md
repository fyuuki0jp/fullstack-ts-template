# 🚀 Backend Development Guide

Complete guide for Hono backend API development with FSD, CQRS, and Railway Result patterns.

## API Route Development

### Route Structure with Method Chaining

```typescript
// src/features/user/api/routes.ts
import { Hono } from 'hono';
import { isErr } from '@fyuuki0jp/railway-result';
import type { DbAdapter } from '../../../shared/adapters/db';

export default (db: DbAdapter) => {
  // Dependencies are injected at route creation
  const userRepository = userRepositoryImpl.inject({ db })();
  const createUserUseCase = createUser.inject({ userRepository });
  const getUsersUseCase = getUsers.inject({ userRepository });

  return new Hono()
    // GET /api/users
    .get('/', async (c) => {
      const result = await getUsersUseCase()();
      
      if (isErr(result)) {
        return c.json({ error: result.error.message }, 500);
      }
      
      return c.json({ users: result.data });
    })
    
    // POST /api/users
    .post('/', async (c) => {
      let body;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
      }

      const result = await createUserUseCase()(body);
      
      if (isErr(result)) {
        const status = result.error.message.includes('Database') ? 500 : 400;
        return c.json({ error: result.error.message }, status);
      }
      
      return c.json({ user: result.data }, 201);
    })
    
    // GET /api/users/:id
    .get('/:id', async (c) => {
      const id = c.req.param('id');
      const result = await getUserByIdUseCase()(id);
      
      if (isErr(result)) {
        const status = result.error.message.includes('not found') ? 404 : 500;
        return c.json({ error: result.error.message }, status);
      }
      
      return c.json({ user: result.data });
    })
    
    // PUT /api/users/:id
    .put('/:id', async (c) => {
      const id = c.req.param('id');
      let body;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
      }

      const result = await updateUserUseCase()({ id, ...body });
      
      if (isErr(result)) {
        return c.json({ error: result.error.message }, 400);
      }
      
      return c.json({ user: result.data });
    })
    
    // DELETE /api/users/:id
    .delete('/:id', async (c) => {
      const id = c.req.param('id');
      const result = await deleteUserUseCase()(id);
      
      if (isErr(result)) {
        return c.json({ error: result.error.message }, 400);
      }
      
      return c.json({ message: 'User deleted successfully' });
    });
};
```

### Error Status Code Mapping

```typescript
function determineStatusCode(error: Error): number {
  const message = error.message.toLowerCase();
  
  // 404 Not Found
  if (message.includes('not found')) return 404;
  
  // 409 Conflict
  if (message.includes('already exists') || 
      message.includes('duplicate')) return 409;
  
  // 401 Unauthorized
  if (message.includes('unauthorized') || 
      message.includes('authentication')) return 401;
  
  // 403 Forbidden
  if (message.includes('forbidden') || 
      message.includes('permission')) return 403;
  
  // 500 Internal Server Error
  if (message.includes('database') || 
      message.includes('connection') ||
      message.includes('internal')) return 500;
  
  // 400 Bad Request (default for validation errors)
  return 400;
}
```

## Command Implementation (Write Operations)

### Basic Command Structure

```typescript
// src/features/user/commands/create-user.ts
import { depend } from 'velona';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { UserRepository } from '../domain/repository';
import type { CreateUserInput } from '../types';

export const createUser = depend(
  { userRepository: {} as UserRepository },
  async ({ userRepository }, input: CreateUserInput) => {
    // 1. Input validation
    if (!input.email || !input.name) {
      return err(new Error('Email and name are required'));
    }
    
    if (!input.email.includes('@')) {
      return err(new Error('Invalid email format'));
    }
    
    if (input.name.length < 2) {
      return err(new Error('Name must be at least 2 characters'));
    }
    
    // 2. Business logic validation
    const existingUser = await userRepository.findByEmail(input.email);
    if (isOk(existingUser) && existingUser.data) {
      return err(new Error('User with this email already exists'));
    }
    
    // 3. Execute operation
    return userRepository.create({
      email: input.email.toLowerCase().trim(),
      name: input.name.trim(),
    });
  }
);
```

### Complex Command with Transaction

```typescript
// src/features/order/commands/create-order.ts
export const createOrder = depend(
  { 
    orderRepository: {} as OrderRepository,
    productRepository: {} as ProductRepository,
    inventoryService: {} as InventoryService,
    db: {} as DbAdapter,
  },
  async ({ orderRepository, productRepository, inventoryService, db }, input: CreateOrderInput) => {
    // Use transaction for complex operations
    return db.transaction(async (tx) => {
      // 1. Validate products exist
      for (const item of input.items) {
        const product = await productRepository.findById(item.productId);
        if (isErr(product) || !product.data) {
          return err(new Error(`Product ${item.productId} not found`));
        }
      }
      
      // 2. Check inventory
      const inventoryCheck = await inventoryService.checkAvailability(input.items);
      if (isErr(inventoryCheck)) {
        return inventoryCheck;
      }
      
      // 3. Calculate total
      const total = await calculateOrderTotal(input.items);
      if (isErr(total)) {
        return total;
      }
      
      // 4. Create order
      const order = await orderRepository.create({
        userId: input.userId,
        items: input.items,
        total: total.data,
        status: 'pending',
      });
      
      if (isErr(order)) {
        return order;
      }
      
      // 5. Reserve inventory
      const reserved = await inventoryService.reserve(order.data.id, input.items);
      if (isErr(reserved)) {
        return reserved;
      }
      
      return ok(order.data);
    });
  }
);
```

## Query Implementation (Read Operations)

### Simple Query

```typescript
// src/features/user/queries/get-users.ts
import { depend } from 'velona';
import type { UserRepository } from '../domain/repository';

export const getUsers = depend(
  { userRepository: {} as UserRepository },
  async ({ userRepository }) => {
    // Queries should be simple - just delegate to repository
    return userRepository.findAll();
  }
);
```

### Query with Filters

```typescript
// src/features/product/queries/search-products.ts
export interface SearchFilters {
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  sortBy?: 'price' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export const searchProducts = depend(
  { productRepository: {} as ProductRepository },
  async ({ productRepository }, filters: SearchFilters) => {
    // Validate pagination
    const limit = Math.min(filters.limit || 20, 100);
    const offset = Math.max(filters.offset || 0, 0);
    
    return productRepository.search({
      ...filters,
      limit,
      offset,
    });
  }
);
```

## Repository Implementation

### Repository Interface

```typescript
// src/features/user/domain/repository.ts
import type { Result } from '@fyuuki0jp/railway-result';
import type { User } from '../../../entities/user';

export interface UserRepository {
  create(input: CreateUserInput): Promise<Result<User, Error>>;
  findAll(): Promise<Result<User[], Error>>;
  findById(id: string): Promise<Result<User | null, Error>>;
  findByEmail(email: string): Promise<Result<User | null, Error>>;
  update(id: string, input: UpdateUserInput): Promise<Result<User, Error>>;
  delete(id: string): Promise<Result<void, Error>>;
}
```

### Repository Implementation

```typescript
// src/features/user/domain/user-repository-impl.ts
import { depend } from 'velona';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { DbAdapter } from '../../../shared/adapters/db';
import type { UserRepository } from './repository';

interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const userRepositoryImpl = depend(
  { db: {} as DbAdapter },
  ({ db }): UserRepository => ({
    async create(input) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const result = await db.execute(
        `INSERT INTO users (id, email, name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [id, input.email, input.name, now, now]
      );
      
      if (isErr(result)) {
        // Handle unique constraint errors
        if (result.error.message.includes('UNIQUE constraint')) {
          return err(new Error('User with this email already exists'));
        }
        return result;
      }
      
      return ok({
        id,
        email: input.email,
        name: input.name,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });
    },

    async findAll() {
      const result = await db.query<UserRow>(
        'SELECT * FROM users ORDER BY created_at DESC'
      );
      
      if (isErr(result)) return result;
      
      return ok(result.data.map(transformToUser));
    },

    async findById(id) {
      const result = await db.query<UserRow>(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      if (isErr(result)) return result;
      
      return ok(result.data[0] ? transformToUser(result.data[0]) : null);
    },

    async update(id, input) {
      const updates: string[] = [];
      const values: any[] = [];
      
      if (input.email !== undefined) {
        updates.push('email = ?');
        values.push(input.email);
      }
      
      if (input.name !== undefined) {
        updates.push('name = ?');
        values.push(input.name);
      }
      
      if (updates.length === 0) {
        return err(new Error('No fields to update'));
      }
      
      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);
      
      const result = await db.execute(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      
      if (isErr(result)) return result;
      
      return this.findById(id).then(result => 
        isErr(result) ? result :
        result.data ? ok(result.data) :
        err(new Error('User not found'))
      );
    },

    async delete(id) {
      const result = await db.execute(
        'DELETE FROM users WHERE id = ?',
        [id]
      );
      
      return result;
    },
  })
);

function transformToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
```

## Database Adapter

### SQLite Adapter Implementation

```typescript
// src/shared/adapters/db/sqlite.ts
import Database from 'better-sqlite3';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { DbAdapter } from './types';

export function createSqliteAdapter(filename: string): DbAdapter {
  const db = new Database(filename);
  
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  
  return {
    async query<T>(sql: string, params?: any[]) {
      try {
        const stmt = db.prepare(sql);
        const rows = params ? stmt.all(...params) : stmt.all();
        return ok(rows as T[]);
      } catch (error) {
        return err(new Error(`Query failed: ${error.message}`));
      }
    },

    async execute(sql: string, params?: any[]) {
      try {
        const stmt = db.prepare(sql);
        params ? stmt.run(...params) : stmt.run();
        return ok(undefined);
      } catch (error) {
        return err(new Error(`Execute failed: ${error.message}`));
      }
    },

    async transaction<T>(fn) {
      const tx = db.transaction(async () => {
        try {
          // Pass self as transaction adapter
          const result = await fn(this);
          if (isErr(result)) {
            throw result.error;
          }
          return result;
        } catch (error) {
          throw error;
        }
      });

      try {
        return await tx();
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
}
```

## Server Setup

### Main Server Configuration

```typescript
// src/server.ts
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createSqliteAdapter } from './shared/adapters/db/sqlite';
import createUserRoutes from './features/user/api/routes';
import createProductRoutes from './features/product/api/routes';

// Initialize database
const db = createSqliteAdapter('./db.sqlite');

// Create tables
db.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.execute(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

// Create app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors());

// Mount feature routes
const route = app
  .basePath('/api')
  .route('/users', createUserRoutes(db))
  .route('/products', createProductRoutes(db));

// Export type for frontend
export type ApiSchema = typeof route;

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Start server
serve(
  {
    port: 3000,
    fetch: app.fetch,
  },
  (info) => {
    console.log(`Server running at http://localhost:${info.port}`);
  }
);
```

## Middleware Patterns

### Authentication Middleware

```typescript
// src/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import { verify } from 'jsonwebtoken';

export const auth = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return c.json({ error: 'No token provided' }, 401);
  }
  
  try {
    const payload = verify(token, process.env.JWT_SECRET!);
    c.set('userId', payload.userId);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Usage in routes
.get('/profile', auth, async (c) => {
  const userId = c.get('userId');
  // Use userId in handler
})
```

### Validation Middleware

```typescript
// src/middleware/validate.ts
import { z } from 'zod';

export function validate<T>(schema: z.Schema<T>) {
  return createMiddleware(async (c, next) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);
      c.set('validatedBody', validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ 
          error: 'Validation failed',
          details: error.errors,
        }, 400);
      }
      return c.json({ error: 'Invalid request body' }, 400);
    }
  });
}

// Define schema
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

// Use in route
.post('/', validate(createUserSchema), async (c) => {
  const body = c.get('validatedBody');
  // Body is now typed and validated
})
```

## Common Patterns

### Pagination

```typescript
// src/features/user/api/routes.ts
.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  
  const result = await getUsersPaginatedUseCase()({ limit, offset });
  
  if (isErr(result)) {
    return c.json({ error: result.error.message }, 500);
  }
  
  return c.json({
    users: result.data.items,
    pagination: {
      page,
      limit,
      total: result.data.total,
      totalPages: Math.ceil(result.data.total / limit),
    },
  });
})
```

### File Upload

```typescript
// src/features/upload/api/routes.ts
.post('/upload', async (c) => {
  const body = await c.req.parseBody();
  const file = body.file as File;
  
  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Invalid file type' }, 400);
  }
  
  // Save file
  const buffer = await file.arrayBuffer();
  const filename = `${crypto.randomUUID()}-${file.name}`;
  
  // Save to disk or cloud storage
  const result = await saveFile(filename, Buffer.from(buffer));
  
  if (isErr(result)) {
    return c.json({ error: 'Failed to save file' }, 500);
  }
  
  return c.json({ filename, url: result.data.url }, 201);
})
```

### Background Jobs

```typescript
// src/features/email/commands/send-welcome-email.ts
export const sendWelcomeEmail = depend(
  { 
    emailService: {} as EmailService,
    jobQueue: {} as JobQueue,
  },
  async ({ emailService, jobQueue }, userId: string) => {
    // Queue job instead of sending immediately
    return jobQueue.add('send-welcome-email', {
      userId,
      template: 'welcome',
      priority: 'low',
    });
  }
);

// In user creation command
const emailResult = await sendWelcomeEmail()(user.id);
// Don't fail user creation if email fails
if (isErr(emailResult)) {
  console.error('Failed to queue welcome email:', emailResult.error);
}
```

## Performance Tips

1. **Use Database Indexes**
   ```sql
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_products_category ON products(category);
   ```

2. **Implement Caching**
   ```typescript
   const cache = new Map<string, CachedItem>();
   
   async function getCachedUser(id: string) {
     const cached = cache.get(`user:${id}`);
     if (cached && cached.expiresAt > Date.now()) {
       return ok(cached.data);
     }
     
     const result = await userRepository.findById(id);
     if (isOk(result) && result.data) {
       cache.set(`user:${id}`, {
         data: result.data,
         expiresAt: Date.now() + 60000, // 1 minute
       });
     }
     
     return result;
   }
   ```

3. **Use Connection Pooling (for PostgreSQL)**
   ```typescript
   import { Pool } from 'pg';
   
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20,
   });
   ```

4. **Optimize Queries**
   - Select only needed columns
   - Use joins instead of multiple queries
   - Batch operations when possible

5. **Enable Response Compression**
   ```typescript
   import { compress } from 'hono/compress';
   
   app.use('*', compress());
   ```