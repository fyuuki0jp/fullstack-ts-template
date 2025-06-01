import { FC } from 'react';
import { Card } from '@/components/atoms/Card';
import { UserForm } from '@/components/molecules/UserForm';
import { UserList } from '@/components/organisms/UserList';

export const UserManagement: FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">User Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <h2 className="text-xl font-semibold mb-4">Add New User</h2>
            <UserForm />
          </Card>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Users</h2>
          <UserList />
        </div>
      </div>
    </div>
  );
};
