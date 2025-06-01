import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { SqliteAdapter } from './shared/adapters/db';
import createUserRoutes from './features/user/api/routes';

// Initialize database - use in-memory for testing, file-based for production
const isTestMode =
  process.env.NODE_ENV === 'test' || process.env.DATABASE_MODE === 'memory';
const dbPath = isTestMode ? ':memory:' : './data.db';
const db = new SqliteAdapter(dbPath);

console.log(
  `Database initialized: ${isTestMode ? 'in-memory (test mode)' : 'file-based (production mode)'}`
);

// Create users table
await db.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

// Create app
const app = new Hono();

// Mount user routes
const route = app.basePath('/api').route('/users', createUserRoutes(db));

export type ApiSchema = typeof route;

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

serve(
  {
    port,
    fetch: route.fetch,
  },
  (info) => {
    console.log(`Server is running at http://localhost:${info.port}`);
  }
);
