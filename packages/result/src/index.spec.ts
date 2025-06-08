import { describe, it, expect } from 'vitest';
import {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  map,
  mapErr,
  andThen,
  orElse,
  match,
  fold,
  type Result,
} from './index';

describe('Result type', () => {
  describe('ok', () => {
    it('should create an Ok result', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
      expect(result.error).toBe(null);
    });
  });

  describe('err', () => {
    it('should create an Err result', () => {
      const error = new Error('Something went wrong');
      const result = err(error);
      expect(result.ok).toBe(false);
      expect(result.value).toBe(null);
      expect(result.error).toBe(error);
    });
  });

  describe('isOk', () => {
    it('should return true for Ok result', () => {
      const result = ok(42);
      expect(isOk(result)).toBe(true);
    });

    it('should return false for Err result', () => {
      const result = err(new Error('Error'));
      expect(isOk(result)).toBe(false);
    });
  });

  describe('isErr', () => {
    it('should return true for Err result', () => {
      const result = err(new Error('Error'));
      expect(isErr(result)).toBe(true);
    });

    it('should return false for Ok result', () => {
      const result = ok(42);
      expect(isErr(result)).toBe(false);
    });
  });

  describe('unwrap', () => {
    it('should return value for Ok result', () => {
      const result = ok(42);
      expect(unwrap(result)).toBe(42);
    });

    it('should throw error for Err result', () => {
      const error = new Error('Error');
      const result = err(error);
      expect(() => unwrap(result)).toThrow(error);
    });
  });

  describe('unwrapOr', () => {
    it('should return value for Ok result', () => {
      const result = ok(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    it('should return default value for Err result', () => {
      const result = err(new Error('Error'));
      expect(unwrapOr(result, 0)).toBe(0);
    });
  });

  describe('map', () => {
    it('should transform Ok value', () => {
      const result = ok(42);
      const mapped = map(result, (x) => x * 2);
      expect(isOk(mapped)).toBe(true);
      expect(unwrap(mapped)).toBe(84);
    });

    it('should pass through Err', () => {
      const error = new Error('Error');
      const result = err(error);
      const mapped = map(result, (x: number) => x * 2);
      expect(isErr(mapped)).toBe(true);
      expect(mapped.error).toBe(error);
    });
  });

  describe('mapErr', () => {
    it('should pass through Ok', () => {
      const result = ok(42);
      const mapped = mapErr(result, (e) => new Error(`Wrapped: ${e.message}`));
      expect(isOk(mapped)).toBe(true);
      expect(unwrap(mapped)).toBe(42);
    });

    it('should transform Err value', () => {
      const result = err(new Error('Original'));
      const mapped = mapErr(result, (e) => new Error(`Wrapped: ${e.message}`));
      expect(isErr(mapped)).toBe(true);
      expect(mapped.error?.message).toBe('Wrapped: Original');
    });
  });

  describe('andThen', () => {
    it('should chain Ok results', () => {
      const result = ok(42);
      const chained = andThen(result, (x) => ok(x * 2));
      expect(isOk(chained)).toBe(true);
      expect(unwrap(chained)).toBe(84);
    });

    it('should return first Err in chain', () => {
      const error = new Error('First error');
      const result = err(error);
      const chained = andThen(result, (x: number) => ok(x * 2));
      expect(isErr(chained)).toBe(true);
      expect(chained.error).toBe(error);
    });

    it('should return second Err in chain', () => {
      const result = ok(42);
      const secondError = new Error('Second error');
      const chained = andThen(result, () => err(secondError));
      expect(isErr(chained)).toBe(true);
      expect(chained.error).toBe(secondError);
    });
  });

  describe('orElse', () => {
    it('should pass through Ok', () => {
      const result = ok(42);
      const chained = orElse(result, () => ok(0));
      expect(isOk(chained)).toBe(true);
      expect(unwrap(chained)).toBe(42);
    });

    it('should handle Err with recovery', () => {
      const result = err(new Error('Error'));
      const chained = orElse(result, () => ok(42));
      expect(isOk(chained)).toBe(true);
      expect(unwrap(chained)).toBe(42);
    });

    it('should propagate new Err', () => {
      const result = err(new Error('First'));
      const newError = new Error('Second');
      const chained = orElse(result, () => err(newError));
      expect(isErr(chained)).toBe(true);
      expect(chained.error).toBe(newError);
    });
  });

  describe('type narrowing', () => {
    it('should narrow types correctly', () => {
      function test(value: number): Result<number, Error> {
        if (value > 0) {
          return ok(value);
        } else {
          return err(new Error('Value must be positive'));
        }
      }

      const result: Result<number, Error> = test(42);

      if (isOk(result)) {
        // TypeScript should know result.value is number
        const value: number = result.value;
        expect(value).toBe(42);
      } else {
        // TypeScript should know result.error is Error
        const error: Error = result.error;
        expect(error).toBeInstanceOf(Error);
      }
      const negativeResult: Result<number, Error> = test(-1);
      if (isErr(negativeResult)) {
        // TypeScript should know negativeResult.error is Error
        const error: Error = negativeResult.error;
        expect(error.message).toBe('Value must be positive');
      } else {
        // TypeScript should know negativeResult.value is number
        const value: number = negativeResult.value;
        expect(value).toBe(-1); // This should not happen, but just for type checking
      }
    });
  });

  describe('match', () => {
    it('should handle Ok result', () => {
      const result = ok(42);
      const value = match(
        result,
        (v) => `Value: ${v}`,
        (e) => `Error: ${e.message}`
      );
      expect(value).toBe('Value: 42');
    });

    it('should handle Err result', () => {
      const result = err(new Error('Something went wrong'));
      const value = match(
        result,
        (v) => `Value: ${v}`,
        (e) => `Error: ${e.message}`
      );
      expect(value).toBe('Error: Something went wrong');
    });
  });

  describe('fold', () => {
    it('should be an alias for match', () => {
      expect(fold).toBe(match);
    });

    it('should work like match', () => {
      const result = ok(42);
      const value = fold(
        result,
        (v) => v * 2,
        () => 0
      );
      expect(value).toBe(84);
    });
  });
});
