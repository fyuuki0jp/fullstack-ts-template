import type { Entity } from './types';

export interface User extends Entity {
  email: string;
  name: string;
}
