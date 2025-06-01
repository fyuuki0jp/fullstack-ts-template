import { FC } from 'react';
import { Card } from '@/shared/ui';
import { useUsers } from '../api';

export const UserList: FC = () => {
  const { data, isLoading, error } = useUsers();

  if (isLoading) {
    return (
      <div
        className="flex justify-center items-center h-64"
        role="status"
        aria-live="polite"
        aria-label="Loading users"
      >
        <div className="flex items-center space-x-2">
          <div
            className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"
            aria-hidden="true"
          />
          <span className="text-gray-500">Loading users...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex justify-center items-center h-64"
        role="alert"
        aria-live="assertive"
      >
        <div className="text-center">
          <div className="text-red-600 font-medium">Error loading users</div>
          <div className="text-red-500 text-sm mt-1">{error.message}</div>
          <p className="text-gray-600 text-sm mt-2">
            Please try refreshing the page or contact support if the problem
            persists.
          </p>
        </div>
      </div>
    );
  }

  const users = data?.users || [];

  if (users.length === 0) {
    return (
      <div
        className="flex justify-center items-center h-64"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div className="text-gray-500 text-lg font-medium">
            No users found
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Create your first user using the form above.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      role="region"
      aria-label={`User list with ${users.length} users`}
    >
      {users.map((user) => (
        <Card
          key={user.id}
          className="hover:shadow-lg transition-shadow focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
        >
          <article
            aria-labelledby={`user-name-${user.id}`}
            aria-describedby={`user-details-${user.id}`}
          >
            <h3
              id={`user-name-${user.id}`}
              className="text-lg font-semibold mb-2"
            >
              {user.name}
            </h3>
            <div id={`user-details-${user.id}`}>
              <p className="text-gray-600" aria-label={`Email: ${user.email}`}>
                {user.email}
              </p>
              <div className="mt-4 text-sm text-gray-500">
                <p>
                  <span className="sr-only">Created on </span>
                  Created: {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </article>
        </Card>
      ))}
    </div>
  );
};
