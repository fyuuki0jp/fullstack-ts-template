import type { Result } from '@shared/result';

export interface ExternalServiceAdapter {
  fetch<T>(
    url: string,
    options?: globalThis.RequestInit
  ): Promise<Result<T, Error>>;
}
