import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { UserManagementWidget } from '@/widgets/user-management';
import { createTestWrapper } from '@/test-utils';
import { server } from '@/test-utils/msw-setup';

describe('User Management Integration', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('loads and displays users on initial render', async () => {
    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    // Initially should show loading
    expect(screen.getByText('Loading users...')).toBeInTheDocument();

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('allows user creation workflow', async () => {
    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Fill out the form
    const emailInput = screen.getByLabelText('Email');
    const nameInput = screen.getByLabelText('Name');
    const submitButton = screen.getByRole('button', { name: 'Create User' });

    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
    fireEvent.change(nameInput, { target: { value: 'New User' } });

    // Submit button should be enabled
    expect(submitButton).toBeEnabled();

    // Submit the form
    fireEvent.click(submitButton);

    // Wait for form to reset
    await waitFor(() => {
      expect(emailInput).toHaveValue('');
      expect(nameInput).toHaveValue('');
    });
  });

  it('handles form validation correctly', async () => {
    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    const submitButton = screen.getByRole('button', { name: 'Create User' });

    // Submit button should be disabled initially
    expect(submitButton).toBeDisabled();

    // Fill only email
    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    // Should still be disabled
    expect(submitButton).toBeDisabled();

    // Fill only name (clear email first)
    fireEvent.change(emailInput, { target: { value: '' } });
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Test User' } });

    // Should still be disabled
    expect(submitButton).toBeDisabled();

    // Fill both fields
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    // Should be enabled
    expect(submitButton).toBeEnabled();
  });

  it('maintains initial user data consistency', async () => {
    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    // Wait for initial load and verify basic functionality
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Count initial users
    const initialUserCards = screen.getAllByText(/Created:/);
    expect(initialUserCards).toHaveLength(2);

    // Verify both users are present
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('renders with proper structure', () => {
    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    // Check that the main components are present
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Add New User')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });
});
