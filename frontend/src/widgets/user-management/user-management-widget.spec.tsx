import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserManagementWidget } from './user-management-widget';
import { createTestWrapper } from '@/test-utils';

// Mock the feature components
vi.mock('@/features/user-creation', () => ({
  UserForm: () => <div data-testid="user-form">User Form Component</div>,
}));

vi.mock('@/features/user-list', () => ({
  UserList: () => <div data-testid="user-list">User List Component</div>,
}));

describe('UserManagementWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main title', () => {
    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('User Management')).toHaveClass(
      'text-3xl',
      'font-bold',
      'mb-8'
    );
  });

  it('renders both UserForm and UserList components', () => {
    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    expect(screen.getByTestId('user-form')).toBeInTheDocument();
    expect(screen.getByTestId('user-list')).toBeInTheDocument();
  });

  it('renders section titles', () => {
    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    expect(screen.getByText('Add New User')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('has correct layout structure', () => {
    const { container } = render(<UserManagementWidget />, {
      wrapper: createTestWrapper(),
    });

    // Check that container exists with proper class structure
    const mainContainer = container.querySelector('.container');
    expect(mainContainer).toBeTruthy();

    // Check that grid layout exists
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeTruthy();
  });

  it('renders UserForm in a Card with proper layout', () => {
    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    const formSection = screen.getByText('Add New User').parentElement;
    expect(formSection?.parentElement).toHaveClass('lg:col-span-1');
  });

  it('renders UserList with proper layout', () => {
    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    const listSection = screen.getByText('Users').parentElement;
    expect(listSection).toHaveClass('lg:col-span-2');
  });

  it('uses Card component for form section', () => {
    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    const formSection = screen.getByText('Add New User').parentElement;
    // Card component applies these classes
    expect(formSection).toHaveClass(
      'bg-white',
      'rounded-lg',
      'shadow-md',
      'p-6'
    );
  });

  it('applies correct heading styles', () => {
    render(<UserManagementWidget />, { wrapper: createTestWrapper() });

    const addUserHeading = screen.getByText('Add New User');
    const usersHeading = screen.getByText('Users');

    expect(addUserHeading).toHaveClass('text-xl', 'font-semibold', 'mb-4');
    expect(usersHeading).toHaveClass('text-xl', 'font-semibold', 'mb-4');
  });

  it('renders with responsive layout classes', () => {
    const { container } = render(<UserManagementWidget />, {
      wrapper: createTestWrapper(),
    });

    // Check that responsive classes exist in the DOM
    expect(container.innerHTML).toContain('lg:grid-cols-3');
    expect(container.innerHTML).toContain('lg:col-span-1');
    expect(container.innerHTML).toContain('lg:col-span-2');
  });
});
