import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductList } from './product-list';
import { testWrapper } from '@/test-utils';
import * as hooks from '../api';

vi.mock('../api', () => ({
  useProducts: vi.fn(),
}));

describe('ProductList', () => {
  it('should display loading state', () => {
    vi.mocked(hooks.useProducts).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<ProductList />, { wrapper: testWrapper });
    
    expect(screen.getByText('Loading products...')).toBeInTheDocument();
  });

  it('should display error state', () => {
    vi.mocked(hooks.useProducts).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
    } as any);

    render(<ProductList />, { wrapper: testWrapper });
    
    expect(screen.getByText('Error loading products: Failed to load')).toBeInTheDocument();
  });

  it('should display empty state', () => {
    vi.mocked(hooks.useProducts).mockReturnValue({
      data: { products: [] },
      isLoading: false,
      error: null,
    } as any);

    render(<ProductList />, { wrapper: testWrapper });
    
    expect(screen.getByText('No products found. Create your first one!')).toBeInTheDocument();
  });

  it('should display products', () => {
    const mockProducts = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Product',
        description: 'Test description',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      },
    ];

    vi.mocked(hooks.useProducts).mockReturnValue({
      data: { products: mockProducts },
      isLoading: false,
      error: null,
    } as any);

    render(<ProductList />, { wrapper: testWrapper });
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should handle products without description', () => {
    const mockProducts = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Product',
        description: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      },
    ];

    vi.mocked(hooks.useProducts).mockReturnValue({
      data: { products: mockProducts },
      isLoading: false,
      error: null,
    } as any);

    render(<ProductList />, { wrapper: testWrapper });
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.queryByText('null')).not.toBeInTheDocument();
  });
});
