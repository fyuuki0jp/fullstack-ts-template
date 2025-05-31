import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { SqliteAdapter } from './shared/adapters/db/sqlite';
import createUserRoutes from './features/user/api/routes';

// Initialize database
const db = new SqliteAdapter();

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

// Health check
app.get('/', (c) => c.text('Hello Hono!'));

// Mount user routes
app.route('/users', createUserRoutes(db));

// Start server
const port = 3001;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
