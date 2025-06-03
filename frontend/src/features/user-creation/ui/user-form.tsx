import { FC, FormEvent, useState } from 'react';
import { Button, Input } from '@/shared/ui';
import { useCreateUser } from '../api';
import { validateCreateUserInputWithErrors } from '@/shared/types/user';
import type { CreateUserInput } from '@/shared/types/user';

interface UserFormProps {
  onSuccess?: () => void;
}

export const UserForm: FC<UserFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');
  const { mutate: createUser, isPending, error } = useCreateUser();

  const validateForm = (): CreateUserInput | null => {
    const validation = validateCreateUserInputWithErrors({ email, name });
    if (validation.success) {
      setEmailError('');
      setNameError('');
      return validation.data;
    }

    setEmailError(validation.errors?.email || '');
    setNameError(validation.errors?.name || '');
    return null;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    // Clear error when user starts typing
    if (emailError) setEmailError('');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Clear error when user starts typing
    if (nameError) setNameError('');
  };

  const isFormValid = email && name && !emailError && !nameError;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Validate form with zod
    const validatedInput = validateForm();
    if (!validatedInput) {
      return;
    }

    createUser(
      validatedInput,
      {
        onSuccess: () => {
          setEmail('');
          setName('');
          setEmailError('');
          setNameError('');
          onSuccess?.();
        },
      }
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
      aria-label="Create new user"
    >
      <Input
        label="Email Address"
        type="email"
        value={email}
        onChange={handleEmailChange}
        placeholder="user@example.com"
        isRequired
        isDisabled={isPending}
        error={emailError}
        autoComplete="email"
        aria-describedby={emailError ? 'email-error' : undefined}
      />

      <Input
        label="Full Name"
        type="text"
        value={name}
        onChange={handleNameChange}
        placeholder="John Doe"
        isRequired
        isDisabled={isPending}
        error={nameError}
        autoComplete="name"
        aria-describedby={nameError ? 'name-error' : undefined}
      />

      {error && (
        <div
          className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded-md"
          role="alert"
          aria-live="polite"
        >
          <strong>Error:</strong> {error.message}
        </div>
      )}

      <Button
        type="submit"
        isDisabled={isPending || !isFormValid}
        aria-describedby={isPending ? 'submit-status' : undefined}
      >
        {isPending ? 'Creating...' : 'Create User'}
      </Button>

      {isPending && (
        <div id="submit-status" className="sr-only" aria-live="polite">
          Creating user, please wait...
        </div>
      )}
    </form>
  );
};
