import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib';

export interface CreateUserInput {
  email: string;
  name: string;
}

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const response = await apiClient.api.users.$post({
        json: input,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to create user');
      }

      const data = await response.json();
      if ('user' in data) {
        return data;
      }
      throw new Error('Invalid response format');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
