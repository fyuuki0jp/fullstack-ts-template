import type { Result } from '@fullstack-ts-template/result';

export interface ExternalServiceAdapter {
  fetch<T>(
    url: string,
    options?: globalThis.RequestInit
  ): Promise<Result<T, Error>>;
}
