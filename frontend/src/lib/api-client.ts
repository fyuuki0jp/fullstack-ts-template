import { hc } from 'hono/client';
import type { ApiSchema } from '../../../backend/src/server';

export const apiClient = hc<ApiSchema>('/');
