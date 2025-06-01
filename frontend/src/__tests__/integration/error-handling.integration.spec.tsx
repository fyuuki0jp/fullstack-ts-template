import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { UserManagementWidget } from '@/widgets/user-management';
import { createTestWrapper } from '@/test-utils';
import { server } from '@/test-utils/msw-setup';

describe('Error Handling Integration', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('handles API error when fetching users', async () => {
    // Mock API error
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      })
    );

    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    // Should initially show loading
    expect(screen.getByText('Loading users...')).toBeInTheDocument();

    // Should show error message
    await waitFor(() => {
      expect(
        screen.getByText('Error loading users: Internal server error')
      ).toBeInTheDocument();
    });
  });

  it('handles network error when fetching users', async () => {
    // Mock network error
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.error();
      })
    );

    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Error loading users:/)).toBeInTheDocument();
    });
  });

  it('handles API error when creating user', async () => {
    // Mock successful fetch but failed create
    server.use(
      http.post('/api/users', () => {
        return HttpResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      })
    );

    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Fill out the form
    const emailInput = screen.getByLabelText('Email');
    const nameInput = screen.getByLabelText('Name');
    const submitButton = screen.getByRole('button', { name: 'Create User' });

    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.change(nameInput, { target: { value: 'Existing User' } });
    fireEvent.click(submitButton);

    // Should show error message in form
    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });

    // Form should not be reset
    expect(emailInput).toHaveValue('existing@example.com');
    expect(nameInput).toHaveValue('Existing User');
  });

  it('handles invalid JSON response when fetching users', async () => {
    // Mock invalid response format
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json({ invalidField: 'data' });
      })
    );

    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    // Should show error message
    await waitFor(() => {
      expect(
        screen.getByText('Error loading users: Invalid response format')
      ).toBeInTheDocument();
    });
  });

  it('handles invalid JSON response when creating user', async () => {
    // Mock invalid response format for create
    server.use(
      http.post('/api/users', () => {
        return HttpResponse.json({ invalidField: 'data' });
      })
    );

    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Fill out the form
    const emailInput = screen.getByLabelText('Email');
    const nameInput = screen.getByLabelText('Name');
    const submitButton = screen.getByRole('button', { name: 'Create User' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Invalid response format')).toBeInTheDocument();
    });
  });

  it('shows error state consistently', async () => {
    // Mock API to always fail
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json(
          { error: 'Persistent error' },
          { status: 500 }
        );
      })
    );

    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    // Should show error state
    await waitFor(() => {
      expect(
        screen.getByText('Error loading users: Persistent error')
      ).toBeInTheDocument();
    });

    // Form should still be available
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('displays empty state correctly', async () => {
    // Mock empty users response
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json({ users: [] });
      })
    );

    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    // Should show empty state
    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });

    // Form should still be functional
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create User' })
    ).toBeInTheDocument();
  });
});
