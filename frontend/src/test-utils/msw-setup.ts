import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock handlers for API endpoints
export const handlers = [
  // GET /api/users
  http.get('/api/users', () => {
    return HttpResponse.json({
      users: [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          createdAt: '2023-01-02T00:00:00Z',
          updatedAt: '2023-01-02T00:00:00Z',
        },
      ],
    });
  }),

  // POST /api/users
  http.post('/api/users', async ({ request }) => {
    const body = (await request.json()) as { name: string; email: string };
    return HttpResponse.json(
      {
        user: {
          id: '3',
          name: body.name,
          email: body.email,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  }),
];

// Setup MSW server
export const server = setupServer(...handlers);
