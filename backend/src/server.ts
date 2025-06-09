import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { initializeDb } from './shared/adapters/db/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { createUserRoutes } from './features/user-management/api/routes';

// Initialize database - use in-memory for testing, file-based for production
const isTestMode =
  process.env.NODE_ENV === 'test' || process.env.DATABASE_MODE === 'memory';
const dataDir = isTestMode ? undefined : './data';
const db = initializeDb(dataDir);

console.log(
  `Database initialized: ${isTestMode ? 'in-memory (test mode)' : 'file-based (production mode)'}`
);

// Apply migrations
await migrate(db, { migrationsFolder: './drizzle' }).catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

// Create app
const app = new Hono();

// Mount routes
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
