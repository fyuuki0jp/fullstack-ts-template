import type { Result } from '@fyuuki0jp/railway-result';

export interface ExternalServiceAdapter {
  fetch<T>(
    url: string,
    options?: globalThis.RequestInit
  ): Promise<Result<T, Error>>;
}
