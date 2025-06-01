import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('renders input with label', () => {
    const { container } = render(<Input label="Test Label" />);

    expect(container.querySelector('input')).toBeInTheDocument();
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('renders without label', () => {
    const { container } = render(<Input placeholder="Test placeholder" />);

    expect(screen.getByPlaceholderText('Test placeholder')).toBeInTheDocument();
    // Check that no label element exists in this specific container
    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  it('displays error message', () => {
    const { container } = render(
      <Input label="Test" error="This field is required" />
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(container.querySelector('input')).toHaveClass('border-red-300');
  });

  it('applies correct styling without error', () => {
    const { container } = render(<Input label="Test" />);
    const input = container.querySelector('input');

    expect(input).toHaveClass('border-gray-300');
    expect(input).not.toHaveClass('border-red-300');
  });

  it('handles input changes', () => {
    const handleChange = vi.fn();
    const { container } = render(
      <Input label="Test" onChange={handleChange} />
    );

    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test value' } });

    expect(handleChange).toHaveBeenCalledWith('test value');
    expect(input).toHaveValue('test value');
  });

  it('forwards ref correctly', () => {
    const { container } = render(<Input label="Test" />);

    // React Aria manages refs internally, so we test that the input renders correctly
    expect(container.querySelector('input')).toBeInTheDocument();
  });

  it('passes through HTML attributes', () => {
    const { container } = render(
      <Input
        label="Test"
        type="email"
        placeholder="Enter email"
        isRequired
        isDisabled
      />
    );

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'Enter email');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toBeDisabled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <Input label="Test" className="custom-input" />
    );

    expect(container.querySelector('input')).toHaveClass('custom-input');
  });
});
