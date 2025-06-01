export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
}

export interface UsersResponse {
  users: User[];
}

export interface UserResponse {
  user: User;
}
