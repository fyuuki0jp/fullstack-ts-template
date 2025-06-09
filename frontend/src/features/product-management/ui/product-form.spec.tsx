import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductForm } from './product-form';
import { testWrapper } from '@/test-utils';
import * as hooks from '../api';

vi.mock('../api', () => ({
  useCreateProduct: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  })),
}));

describe('ProductForm', () => {
  it('should render create form', () => {
    render(<ProductForm />, { wrapper: testWrapper });
    
    expect(screen.getByText('Create New Product')).toBeInTheDocument();
    expect(screen.getByLabelText('Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('should handle form submission for create', () => {
    const mockMutate = vi.fn();
    vi.mocked(hooks.useCreateProduct).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    } as any);

    render(<ProductForm />, { wrapper: testWrapper });
    
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'New Product' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'New description' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    
    expect(mockMutate).toHaveBeenCalledWith(
      { name: 'New Product', description: 'New description' },
      expect.any(Object)
    );
  });

  it('should display validation errors', () => {
    render(<ProductForm />, { wrapper: testWrapper });
    
    // Try to submit with empty name (should trigger validation error)
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('should display API error message', () => {
    vi.mocked(hooks.useCreateProduct).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: new Error('Creation failed'),
    } as any);

    render(<ProductForm />, { wrapper: testWrapper });
    
    expect(screen.getByText('Creation failed')).toBeInTheDocument();
  });

  it('should show pending state during submission', () => {
    vi.mocked(hooks.useCreateProduct).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      error: null,
    } as any);

    render(<ProductForm />, { wrapper: testWrapper });
    
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
  });
});
