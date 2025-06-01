import { FC, FormEvent, useState } from 'react';
import { Button, Input } from '@/shared/ui';
import { useCreateUser } from '../api';

interface UserFormProps {
  onSuccess?: () => void;
}

export const UserForm: FC<UserFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');
  const { mutate: createUser, isPending, error } = useCreateUser();

  const validateEmail = (value: string) => {
    if (!value) {
      return 'Email is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validateName = (value: string) => {
    if (!value) {
      return 'Name is required';
    }
    if (value.length < 2) {
      return 'Name must be at least 2 characters long';
    }
    return '';
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError(validateEmail(value));
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setNameError(validateName(value));
  };

  const isFormValid = email && name && !emailError && !nameError;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Validate on submit
    const emailValidation = validateEmail(email);
    const nameValidation = validateName(name);

    setEmailError(emailValidation);
    setNameError(nameValidation);

    if (emailValidation || nameValidation) {
      return;
    }

    createUser(
      { email, name },
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
      data-oid="t30h3vo"
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
        data-oid="x-yvsl."
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
        data-oid=":zcyx:m"
      />

      {error && (
        <div
          className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded-md"
          role="alert"
          aria-live="polite"
          data-oid="8vrw7mw"
        >
          <strong data-oid="lyydst9">Error:</strong> {error.message}
        </div>
      )}

      <Button
        type="submit"
        isDisabled={isPending || !isFormValid}
        aria-describedby={isPending ? 'submit-status' : undefined}
        data-oid="l23k9m8"
      >
        {isPending ? 'Creating...' : 'Create User'}
      </Button>

      {isPending && (
        <div
          id="submit-status"
          className="sr-only"
          aria-live="polite"
          data-oid="9iw3glm"
        >
          Creating user, please wait...
        </div>
      )}
    </form>
  );
};
