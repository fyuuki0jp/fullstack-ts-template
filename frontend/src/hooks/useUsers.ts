import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.api.users.$get();
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch users');
      }
      return response.json();
    },
  });
};
