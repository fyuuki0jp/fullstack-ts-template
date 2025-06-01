import { FC } from 'react';
import { Card } from '@/components/atoms/Card';
import { useUsers } from '@/hooks/useUsers';

export const UserList: FC = () => {
  const { data, isLoading, error } = useUsers();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600">Error loading users: {error.message}</div>
      </div>
    );
  }

  const users = data?.users || [];

  if (users.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">No users found</div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {users.map((user) => (
        <Card key={user.id} className="hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2">{user.name}</h3>
          <p className="text-gray-600">{user.email}</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>Created: {new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};
