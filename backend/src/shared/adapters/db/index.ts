import type { Result } from '@fyuuki0jp/railway-result';

export interface DbAdapter {
  query<T>(sql: string, params?: unknown[]): Promise<Result<T[], Error>>;
  execute(sql: string, params?: unknown[]): Promise<Result<number, Error>>;
  transaction<T>(
    fn: (tx: DbAdapter) => Promise<Result<T, Error>>
  ): Promise<Result<T, Error>>;
}
