import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { type Result, ok } from '@fyuuki0jp/railway-result';

const app = new Hono();

function funcA(arg: string): Result<string> {
  return ok(`Hello ${arg}`);
}

app.get('/', (c) => {
  const result = funcA('World');
  if (result.success) {
    return c.text(result.data);
  }
  return c.text('Error occurred');
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
