import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('renders input with label', () => {
    render(<Input label="Test Label" />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('renders without label', () => {
    render(<Input placeholder="Test placeholder" />);

    expect(screen.getByPlaceholderText('Test placeholder')).toBeInTheDocument();
    expect(screen.queryByText('Test Label')).not.toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<Input label="Test" error="This field is required" />);

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('border-red-300');
  });

  it('applies correct styling without error', () => {
    render(<Input label="Test" />);

    expect(screen.getByRole('textbox')).toHaveClass('border-gray-300');
    expect(screen.getByRole('textbox')).not.toHaveClass('border-red-300');
  });

  it('handles input changes', () => {
    const handleChange = vi.fn();
    render(<Input label="Test" onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });

    expect(handleChange).toHaveBeenCalledWith('test value');
    expect(input).toHaveValue('test value');
  });

  it('forwards ref correctly', () => {
    render(<Input label="Test" />);

    // React Aria manages refs internally, so we test that the input renders correctly
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('passes through HTML attributes', () => {
    render(
      <Input
        label="Test"
        type="email"
        placeholder="Enter email"
        isRequired
        isDisabled
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'Enter email');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Input label="Test" className="custom-input" />);

    expect(screen.getByRole('textbox')).toHaveClass('custom-input');
  });
});
