export type Result<T, E extends Error> = Ok<T> | Err<E>;

export type Ok<T> = {
  readonly ok: true;
  readonly value: T;
  readonly error: null;
};

export type Err<E extends Error> = {
  readonly ok: false;
  readonly value: null;
  readonly error: E;
};

export const ok = <T>(value: T): Ok<T> => ({
  ok: true,
  value,
  error: null,
});

export const err = <E extends Error>(error: E): Err<E> => ({
  ok: false,
  value: null,
  error,
});

export const isOk = <T, E extends Error>(
  result: Result<T, E>
): result is Ok<T> => {
  return result.ok === true;
};

export const isErr = <T, E extends Error>(
  result: Result<T, E>
): result is Err<E> => {
  return result.ok === false;
};

export const unwrap = <T, E extends Error>(result: Result<T, E>): T => {
  if (isOk(result)) {
    return result.value;
  }
  // Note: This function should be used with caution as it can throw
  // Consider using unwrapOr or checking with isOk/isErr before calling
  throw result.error;
};

export const unwrapOr = <T, E extends Error>(
  result: Result<T, E>,
  defaultValue: T
): T => {
  return isOk(result) ? result.value : defaultValue;
};

export const map = <T, U, E extends Error>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  return isOk(result) ? ok(fn(result.value)) : result;
};

export const mapErr = <T, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> => {
  return isErr(result) ? err(fn(result.error)) : result;
};

export const andThen = <T, U, E extends Error>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  return isOk(result) ? fn(result.value) : result;
};

export const orElse = <T, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: (error: E) => Result<T, F>
): Result<T, F> => {
  return isErr(result) ? fn(result.error) : result;
};

export const match = <T, E extends Error, U>(
  result: Result<T, E>,
  onOk: (value: T) => U,
  onErr: (error: E) => U
): U => {
  return isOk(result) ? onOk(result.value) : onErr(result.error);
};

export const fold = match; // Alias for match
