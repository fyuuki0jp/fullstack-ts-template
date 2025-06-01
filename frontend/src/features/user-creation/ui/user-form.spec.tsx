import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserForm } from './user-form';
import { createTestWrapper } from '@/test-utils';

// Mock the useCreateUser hook
vi.mock('../api', () => ({
  useCreateUser: vi.fn(),
}));

const mockUseCreateUser = await import('../api');

describe('UserForm', () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockUseCreateUser.useCreateUser).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    } as any);
  });

  it('renders form fields correctly', () => {
    render(<UserForm />, { wrapper: createTestWrapper() });

    const textboxes = screen.getAllByRole('textbox');
    expect(textboxes).toHaveLength(2);
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create User' })
    ).toBeInTheDocument();
  });

  it('handles input changes', () => {
    render(<UserForm />, { wrapper: createTestWrapper() });

    const [emailInput, nameInput] = screen.getAllByRole('textbox');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(nameInput, { target: { value: 'Test User' } });

    expect(emailInput).toHaveValue('test@example.com');
    expect(nameInput).toHaveValue('Test User');
  });

  it('submits form with correct data', () => {
    render(<UserForm />, { wrapper: createTestWrapper() });

    const [emailInput, nameInput] = screen.getAllByRole('textbox');
    const submitButton = screen.getByRole('button', { name: 'Create User' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.click(submitButton);

    expect(mockMutate).toHaveBeenCalledWith(
      { email: 'test@example.com', name: 'Test User' },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      })
    );
  });

  it('prevents submission with empty fields', () => {
    render(<UserForm />, { wrapper: createTestWrapper() });

    const submitButton = screen.getByRole('button', { name: 'Create User' });
    fireEvent.click(submitButton);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('prevents submission with only email filled', () => {
    render(<UserForm />, { wrapper: createTestWrapper() });

    const [emailInput] = screen.getAllByRole('textbox');
    const submitButton = screen.getByRole('button', { name: 'Create User' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('prevents submission with only name filled', () => {
    render(<UserForm />, { wrapper: createTestWrapper() });

    const [, nameInput] = screen.getAllByRole('textbox');
    const submitButton = screen.getByRole('button', { name: 'Create User' });

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.click(submitButton);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('shows loading state during submission', () => {
    vi.mocked(mockUseCreateUser.useCreateUser).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      error: null,
    } as any);

    render(<UserForm />, { wrapper: createTestWrapper() });

    expect(
      screen.getByRole('button', { name: 'Creating...' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    const [emailInput, nameInput] = screen.getAllByRole('textbox');
    expect(emailInput).toBeDisabled();
    expect(nameInput).toBeDisabled();
  });

  it('disables submit button when fields are empty', () => {
    render(<UserForm />, { wrapper: createTestWrapper() });

    const submitButton = screen.getByRole('button', { name: 'Create User' });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when both fields are filled', () => {
    render(<UserForm />, { wrapper: createTestWrapper() });

    const [emailInput, nameInput] = screen.getAllByRole('textbox');
    const submitButton = screen.getByRole('button', { name: 'Create User' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(nameInput, { target: { value: 'Test User' } });

    expect(submitButton).toBeEnabled();
  });

  it('displays error message when there is an error', () => {
    const errorMessage = 'Email already exists';
    vi.mocked(mockUseCreateUser.useCreateUser).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: new Error(errorMessage),
    } as any);

    render(<UserForm />, { wrapper: createTestWrapper() });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('clears form and calls onSuccess after successful submission', async () => {
    const onSuccess = vi.fn();
    let capturedOnSuccess: (() => void) | undefined;

    mockMutate.mockImplementation((_data, options) => {
      capturedOnSuccess = options.onSuccess;
    });

    render(<UserForm onSuccess={onSuccess} />, {
      wrapper: createTestWrapper(),
    });

    const [emailInput, nameInput] = screen.getAllByRole('textbox');
    const submitButton = screen.getByRole('button', { name: 'Create User' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.click(submitButton);

    // Simulate successful mutation
    if (capturedOnSuccess) {
      capturedOnSuccess();
    }

    await waitFor(() => {
      expect(emailInput).toHaveValue('');
      expect(nameInput).toHaveValue('');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('has correct form attributes', () => {
    const { container } = render(<UserForm />, {
      wrapper: createTestWrapper(),
    });

    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();

    const [emailInput, nameInput] = screen.getAllByRole('textbox');

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('placeholder', 'user@example.com');
    expect(emailInput).toHaveAttribute('aria-required', 'true');

    expect(nameInput).toHaveAttribute('type', 'text');
    expect(nameInput).toHaveAttribute('placeholder', 'John Doe');
    expect(nameInput).toHaveAttribute('aria-required', 'true');
  });
});
