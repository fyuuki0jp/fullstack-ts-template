import type { Result } from 'result';

export interface ExternalServiceAdapter {
  fetch<T>(
    url: string,
    options?: globalThis.RequestInit
  ): Promise<Result<T, Error>>;
}
