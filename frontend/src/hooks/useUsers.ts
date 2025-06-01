import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.api.users.$get();
      if (!response.ok) {
        const errorData = await response.json();
        // Handle error response type
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      // Return the users data
      if ('users' in data) {
        return data;
      }
      throw new Error('Invalid response format');
    },
  });
};