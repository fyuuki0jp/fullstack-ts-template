/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserList } from './user-list';
import { createTestWrapper } from '@/test-utils';

// Mock the useUsers hook
vi.mock('../api', () => ({
  useUsers: vi.fn(),
}));

const mockUseUsers = await import('../api');

describe('UserList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays loading state', () => {
    vi.mocked(mockUseUsers.useUsers).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<UserList />, { wrapper: createTestWrapper() });

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    const errorMessage = 'Failed to fetch users';
    vi.mocked(mockUseUsers.useUsers).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error(errorMessage),
    } as any);

    render(<UserList />, { wrapper: createTestWrapper() });

    expect(screen.getByText('Error loading users')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('displays empty state when no users', () => {
    vi.mocked(mockUseUsers.useUsers).mockReturnValue({
      data: { users: [] },
      isLoading: false,
      error: null,
    } as any);

    render(<UserList />, { wrapper: createTestWrapper() });

    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('displays users when data is available', () => {
    const mockUsers = [
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
    ];

    vi.mocked(mockUseUsers.useUsers).mockReturnValue({
      data: { users: mockUsers },
      isLoading: false,
      error: null,
    } as any);

    render(<UserList />, { wrapper: createTestWrapper() });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('formats and displays creation dates', () => {
    const mockUsers = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: '2023-01-15T12:30:00Z',
        updatedAt: '2023-01-15T12:30:00Z',
      },
    ];

    vi.mocked(mockUseUsers.useUsers).mockReturnValue({
      data: { users: mockUsers },
      isLoading: false,
      error: null,
    } as any);

    render(<UserList />, { wrapper: createTestWrapper() });

    expect(screen.getByText(/Created:/)).toBeInTheDocument();
    // Note: The exact date format depends on the user's locale
    expect(
      screen.getByText(/1\/15\/2023|15\/1\/2023|2023-01-15/)
    ).toBeInTheDocument();
  });

  it('applies hover effects to user cards', () => {
    const mockUsers = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
    ];

    vi.mocked(mockUseUsers.useUsers).mockReturnValue({
      data: { users: mockUsers },
      isLoading: false,
      error: null,
    } as any);

    render(<UserList />, { wrapper: createTestWrapper() });

    const userCard = screen.getByText('John Doe').closest('div');
    expect(userCard).toHaveClass('hover:shadow-lg', 'transition-shadow');
  });

  it('renders in grid layout', () => {
    const mockUsers = [
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
    ];

    vi.mocked(mockUseUsers.useUsers).mockReturnValue({
      data: { users: mockUsers },
      isLoading: false,
      error: null,
    } as any);

    render(<UserList />, { wrapper: createTestWrapper() });

    const container = screen
      .getByText('John Doe')
      .closest('div')?.parentElement;
    expect(container).toHaveClass(
      'grid',
      'gap-4',
      'md:grid-cols-2',
      'lg:grid-cols-3'
    );
  });
});
