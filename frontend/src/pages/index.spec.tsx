import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HomePage from './index';
import { createTestWrapper } from '@/test-utils';

// Mock the UserManagementWidget
vi.mock('@/widgets/user-management', () => ({
  UserManagementWidget: () => (
    <div data-testid="user-management-widget">User Management Widget</div>
  ),
}));

describe('HomePage', () => {
  it('renders UserManagementWidget', () => {
    render(<HomePage />, { wrapper: createTestWrapper() });

    expect(screen.getByTestId('user-management-widget')).toBeInTheDocument();
  });

  it('renders without any additional wrapper elements', () => {
    render(<HomePage />, { wrapper: createTestWrapper() });

    // The page should directly render the widget without additional containers
    const widget = screen.getByTestId('user-management-widget');
    expect(widget.parentElement?.tagName).toBe('DIV'); // React fragment renders as div in test
  });
});
