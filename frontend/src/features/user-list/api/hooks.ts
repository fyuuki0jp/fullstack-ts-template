import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib';

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
        return data;
      }
      throw new Error('Invalid response format');
    },
  });
};
