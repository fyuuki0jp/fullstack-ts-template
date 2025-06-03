import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib';
import { type CreateUserInput, validateUser } from '@/shared/types/user';

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
        // Validate the response user data with zod
        const validatedUser = validateUser(data.user);
        if (!validatedUser) {
          throw new Error('Invalid user data received from server');
        }
        return { user: validatedUser };
      }
      throw new Error('Invalid response format');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
