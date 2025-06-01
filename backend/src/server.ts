import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { SqliteAdapter } from './shared/adapters/db';
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

// Mount user routes
const route = app.basePath('/api').route('/users', createUserRoutes(db));

export type ApiSchema = typeof route;

serve(
  {
    port: 3000,
    fetch: route.fetch,
  },
  (info) => {
    console.log(`Server is running at http://localhost:${info.port}`);
  }
);
