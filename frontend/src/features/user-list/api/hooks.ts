import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib';
import { validateUser } from '@/shared/types/user';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.api.users.$get();
      if (!response.ok) {
        const errorData = await response.json();
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      if ('users' in data) {
        // Validate each user in the response with zod
        const validatedUsers = data.users
          .map(validateUser)
          .filter((user) => user !== null);

        if (validatedUsers.length !== data.users.length) {
          throw new Error('Some user data received from server is invalid');
        }

        return { users: validatedUsers };
      }
      throw new Error('Invalid response format');
    },
  });
};
