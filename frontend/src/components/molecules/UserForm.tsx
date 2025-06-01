import { FC, FormEvent, useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useCreateUser } from '@/hooks/useCreateUser';

interface UserFormProps {
  onSuccess?: () => void;
}

export const UserForm: FC<UserFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const { mutate: createUser, isPending, error } = useCreateUser();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!email || !name) {
      return;
    }

    createUser(
      { email, name },
      {
        onSuccess: () => {
          setEmail('');
          setName('');
          onSuccess?.();
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="user@example.com"
        required
        disabled={isPending}
      />

      <Input
        label="Name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="John Doe"
        required
        disabled={isPending}
      />

      {error && <div className="text-red-600 text-sm">{error.message}</div>}

      <Button type="submit" disabled={isPending || !email || !name}>
        {isPending ? 'Creating...' : 'Create User'}
      </Button>
    </form>
  );
};
