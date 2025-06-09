#!/bin/bash

# Backend Feature Boilerplate Generator v2
# Usage: ./create-feature.sh <feature-name> [entity-name] [--dry-run]
#
# Creates v2 architecture feature with:
# - Repository pattern (not Entity pattern)
# - Railway Result error handling
# - Direct API error handling (no helper functions)
# - Pick/Partial type transformations
# - Simple domain errors

FEATURE_NAME=$1
ENTITY_NAME=${2:-$1}  # Use feature name as entity name if not provided
DRY_RUN=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
    esac
done

# Handle if --dry-run is the second parameter
if [ "$2" = "--dry-run" ]; then
    ENTITY_NAME=$1
    DRY_RUN=true
fi

if [ -z "$FEATURE_NAME" ] || [ "$FEATURE_NAME" = "--dry-run" ]; then
    echo "Usage: $0 <feature-name> [entity-name] [--dry-run]"
    echo "Example: $0 product-management product"
    echo "Example: $0 user-management user"
    echo "Example: $0 task-management task --dry-run"
    exit 1
fi

# Convert entity name to PascalCase
PASCAL_CASE_NAME=$(echo "$ENTITY_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')

# Helper function to create files
create_file() {
    local file_path=$1
    local file_content=$2
    
    if [ "$DRY_RUN" = true ]; then
        echo "Would create file: $file_path"
        return
    fi
    
    cat > "$file_path" << EOF
$file_content
EOF
}

# Create feature directory structure
FEATURE_DIR="backend/src/features/$FEATURE_NAME"

if [ "$DRY_RUN" = true ]; then
    echo "🔍 DRY RUN MODE - No files will be created"
    echo ""
    echo "Would create directories:"
    echo "  - $FEATURE_DIR/api"
    echo "  - $FEATURE_DIR/commands"
    echo "  - $FEATURE_DIR/queries"
    echo "  - $FEATURE_DIR/domain"
    echo ""
else
    mkdir -p "$FEATURE_DIR/api"
    mkdir -p "$FEATURE_DIR/commands"
    mkdir -p "$FEATURE_DIR/queries"
    mkdir -p "$FEATURE_DIR/domain"
fi

# Check if entity exists (check for new v2 structure)
ENTITY_DIR="backend/src/entities/${ENTITY_NAME}"
ENTITY_SCHEMA_FILE="$ENTITY_DIR/schema.ts"
ENTITY_REPOSITORY_FILE="$ENTITY_DIR/repository.ts"

if [ ! -d "$ENTITY_DIR" ] || [ ! -f "$ENTITY_SCHEMA_FILE" ] || [ ! -f "$ENTITY_REPOSITORY_FILE" ]; then
    echo "⚠️  Entity '${ENTITY_NAME}' not found. Creating it first..."
    if [ "$DRY_RUN" = true ]; then
        ./tools/backend/create-entity.sh "$ENTITY_NAME" --dry-run
    else
        ./tools/backend/create-entity.sh "$ENTITY_NAME"
    fi
else
    echo "✅ Entity '${ENTITY_NAME}' already exists. Using existing entity..."
fi

# Create API schemas (Pick/Partial transformations)
create_file "$FEATURE_DIR/api/schemas.ts" "\
import { z } from 'zod';
import type { ${PASCAL_CASE_NAME} } from '../../../entities/${ENTITY_NAME}';
import { ${ENTITY_NAME}InsertSchema } from '../../../entities/${ENTITY_NAME}/schema';

/**
 * API request types derived from Entity types (Single Source of Truth)
 * Use Pick/Partial to transform Entity types instead of duplicating definitions
 */

// Pick relevant fields from ${PASCAL_CASE_NAME} entity for API requests
export type Create${PASCAL_CASE_NAME}Request = Pick<${PASCAL_CASE_NAME}, /* TODO: Add fields like 'title' | 'description' */>;
export type Update${PASCAL_CASE_NAME}Request = Partial<Pick<${PASCAL_CASE_NAME}, /* TODO: Add updatable fields */>>;

/**
 * API validation schemas reusing Entity schemas (DRY principle)
 * Transform Entity schemas instead of duplicating validation rules
 */
export const Create${PASCAL_CASE_NAME}RequestSchema = ${ENTITY_NAME}InsertSchema;
export const Update${PASCAL_CASE_NAME}RequestSchema = ${ENTITY_NAME}InsertSchema.partial();

export const ${PASCAL_CASE_NAME}QueryParamsSchema = z.object({
  // TODO: Add query parameters for filtering/pagination
  // Example: status: z.enum(['active', 'inactive']).optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional(),
  sortBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export type ${PASCAL_CASE_NAME}QueryParams = z.infer<typeof ${PASCAL_CASE_NAME}QueryParamsSchema>;
"

# Create domain errors
create_file "$FEATURE_DIR/domain/errors.ts" "\
// Domain-specific error classes (no HTTP dependencies)

export class ValidationError extends Error {
  readonly name = 'ValidationError';
  
  constructor(message: string) {
    super(message);
  }
}

export class ConflictError extends Error {
  readonly name = 'ConflictError';
  
  constructor(message: string) {
    super(message);
  }
}

export class NotFoundError extends Error {
  readonly name = 'NotFoundError';
  
  constructor(message: string) {
    super(message);
  }
}

export class DatabaseError extends Error {
  readonly name = 'DatabaseError';
  
  constructor(message: string) {
    super(message);
  }
}

// Database error mapping for specific database constraints
export const createDatabaseError = (error: Error): Error => {
  const message = error.message.toLowerCase();
  if (message.includes('unique') || message.includes('duplicate')) {
    return new ConflictError('この${ENTITY_NAME}は既に存在します');
  }
  return new DatabaseError('データベースエラーが発生しました');
};
"

# Create command
create_file "$FEATURE_DIR/commands/create-${ENTITY_NAME}.ts" "\
import { depend } from 'velona';
import { ok, err, isErr, type Result } from 'result';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';
import {
  insert${PASCAL_CASE_NAME},
  type ${PASCAL_CASE_NAME},
  // TODO: Import your branded types
  // ${PASCAL_CASE_NAME}TitleSchema,
  // ${PASCAL_CASE_NAME}DescriptionSchema,
} from '../../../entities/${ENTITY_NAME}';
import { Create${PASCAL_CASE_NAME}RequestSchema, type Create${PASCAL_CASE_NAME}Request } from '../api/schemas';
import { ValidationError, createDatabaseError } from '../domain/errors';

/**
 * Business logic for creating a ${ENTITY_NAME}
 */
export const create${PASCAL_CASE_NAME} = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (input: unknown): Promise<Result<${PASCAL_CASE_NAME}, Error>> => {
      // 1. API-level validation with Zod
      const apiValidation = Create${PASCAL_CASE_NAME}RequestSchema.safeParse(input);
      if (!apiValidation.success) {
        const firstError = apiValidation.error.issues[0];
        // TODO: Add domain-specific error messages based on your fields
        const errorMessage = firstError.path[0] === 'title' 
          ? 'タイトルが無効です'
          : firstError.path[0] === 'description'
          ? '説明が無効です'
          : \`入力データが無効です: \${firstError.message}\`;
        return err(new ValidationError(errorMessage));
      }

      // TODO: Add business validation if needed
      // Example:
      // const businessValidation = validateCreateBusinessRules(apiValidation.data);
      // if (isErr(businessValidation)) {
      //   return businessValidation;
      // }

      try {
        // 2. Convert to branded types for repository
        // TODO: Add your domain field conversions
        // const title = ${PASCAL_CASE_NAME}TitleSchema.parse(apiValidation.data.title);
        // const description = ${PASCAL_CASE_NAME}DescriptionSchema.parse(apiValidation.data.description);

        const repositoryInput = {
          // TODO: Map your validated fields to repository input
          // title,
          // description,
        };

        // 3. Use repository for persistence
        const insert${PASCAL_CASE_NAME}Fn = insert${PASCAL_CASE_NAME}.inject({ db })();
        const result = await insert${PASCAL_CASE_NAME}Fn(repositoryInput);

        if (isErr(result)) {
          return err(createDatabaseError(result.error));
        }

        return ok(result.value);
      } catch (error) {
        if (error instanceof Error) {
          return err(createDatabaseError(error));
        }
        return err(new Error('${ENTITY_NAME}の作成中にエラーが発生しました'));
      }
    }
);
"

# Create queries
create_file "$FEATURE_DIR/queries/get-${ENTITY_NAME}s.ts" "\
import { depend } from 'velona';
import { ok, err, isErr, type Result } from 'result';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';
import {
  selectActive${PASCAL_CASE_NAME}s,
  select${PASCAL_CASE_NAME}ById,
  type ${PASCAL_CASE_NAME},
} from '../../../entities/${ENTITY_NAME}';
import { ${PASCAL_CASE_NAME}QueryParamsSchema } from '../api/schemas';
import { createDatabaseError, ValidationError } from '../domain/errors';

/**
 * Get ${ENTITY_NAME}s with filtering and pagination
 */
export const get${PASCAL_CASE_NAME}s = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (
      queryParams: unknown
    ): Promise<Result<{ ${ENTITY_NAME}s: ${PASCAL_CASE_NAME}[]; total: number }, Error>> => {
      // 1. Validate query parameters with Zod
      const validation = ${PASCAL_CASE_NAME}QueryParamsSchema.safeParse(queryParams);
      if (!validation.success) {
        const firstError = validation.error.issues[0];
        const errorMessage =
          firstError.path[0] === 'page'
            ? 'ページ番号は1以上の数値で入力してください'
            : firstError.path[0] === 'limit'
              ? '取得件数は1から100の間で入力してください'
              : firstError.path[0] === 'sortBy'
                ? 'ソート項目が無効です'
                : firstError.path[0] === 'order'
                  ? 'ソート順序はascまたはdescで指定してください'
                  : \`クエリパラメータが無効です: \${firstError.message}\`;
        return err(new ValidationError(errorMessage));
      }

      const params = validation.data;

      try {
        // 2. Get ${ENTITY_NAME}s from repository
        const selectActive${PASCAL_CASE_NAME}sFn = selectActive${PASCAL_CASE_NAME}s.inject({ db })();
        const result = await selectActive${PASCAL_CASE_NAME}sFn();

        if (isErr(result)) {
          return err(createDatabaseError(result.error));
        }

        let ${ENTITY_NAME}s = result.value;

        // 3. Apply filtering
        // TODO: Add filtering logic based on query parameters
        // Example:
        // if (params.status) {
        //   ${ENTITY_NAME}s = ${ENTITY_NAME}s.filter(${ENTITY_NAME} => ${ENTITY_NAME}.status === params.status);
        // }

        // 4. Apply sorting (TODO: Move to repository for better performance)
        if (params.sortBy) {
          ${ENTITY_NAME}s.sort((a, b) => {
            const aValue = (a as Record<string, unknown>)[params.sortBy!];
            const bValue = (b as Record<string, unknown>)[params.sortBy!];
            const direction = params.order === 'desc' ? -1 : 1;

            // Convert to string for comparison if not primitive types
            const aStr =
              typeof aValue === 'string' || typeof aValue === 'number'
                ? aValue
                : String(aValue);
            const bStr =
              typeof bValue === 'string' || typeof bValue === 'number'
                ? bValue
                : String(bValue);

            if (aStr < bStr) return -1 * direction;
            if (aStr > bStr) return 1 * direction;
            return 0;
          });
        }

        // 5. Apply pagination
        const page = params.page || 1;
        const limit = params.limit || 20;
        const offset = (page - 1) * limit;
        const total = ${ENTITY_NAME}s.length;
        const paginated${PASCAL_CASE_NAME}s = ${ENTITY_NAME}s.slice(offset, offset + limit);

        return ok({
          ${ENTITY_NAME}s: paginated${PASCAL_CASE_NAME}s,
          total,
        });
      } catch (error) {
        if (error instanceof Error) {
          return err(createDatabaseError(error));
        }
        return err(new Error('${ENTITY_NAME}の取得中にエラーが発生しました'));
      }
    }
);

/**
 * Get ${ENTITY_NAME} by ID
 */
export const get${PASCAL_CASE_NAME}ById = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (id: string): Promise<Result<${PASCAL_CASE_NAME} | null, Error>> => {
      try {
        // Import here to avoid circular dependency
        const { ${PASCAL_CASE_NAME}IdSchema } = await import('../../../entities/${ENTITY_NAME}');

        // Validate ID format
        const idValidation = ${PASCAL_CASE_NAME}IdSchema.safeParse(id);
        if (!idValidation.success) {
          return err(new ValidationError('${ENTITY_NAME}IDが無効です'));
        }

        // Get ${ENTITY_NAME} from repository
        const select${PASCAL_CASE_NAME}ByIdFn = select${PASCAL_CASE_NAME}ById.inject({ db })();
        const result = await select${PASCAL_CASE_NAME}ByIdFn(idValidation.data);

        if (isErr(result)) {
          return err(createDatabaseError(result.error));
        }

        return result;
      } catch (error) {
        if (error instanceof Error) {
          return err(createDatabaseError(error));
        }
        return err(new Error('${ENTITY_NAME}の取得中にエラーが発生しました'));
      }
    }
);
"

# Create API routes
create_file "$FEATURE_DIR/api/routes.ts" "\
import { Hono } from 'hono';
import { isErr } from 'result';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';
import { create${PASCAL_CASE_NAME} } from '../commands/create-${ENTITY_NAME}';
import { get${PASCAL_CASE_NAME}s, get${PASCAL_CASE_NAME}ById } from '../queries/get-${ENTITY_NAME}s';
import { ValidationError, ConflictError } from '../domain/errors';

export function create${PASCAL_CASE_NAME}Routes(db: DrizzleDb) {
  const app = new Hono();

  // GET /${ENTITY_NAME}s - List ${ENTITY_NAME}s with filtering and pagination
  return app
    .get('/', async (c) => {
      const queryParams = c.req.query();

      const get${PASCAL_CASE_NAME}sFn = get${PASCAL_CASE_NAME}s.inject({ db })();
      const result = await get${PASCAL_CASE_NAME}sFn(queryParams);

      if (isErr(result)) {
        if (result.error instanceof ValidationError) {
          return c.json({ error: result.error.message }, 400);
        }
        if (result.error instanceof ConflictError) {
          return c.json({ error: result.error.message }, 409);
        }
        // Default to 500 for other errors (DatabaseError, etc.)
        return c.json({ error: result.error.message }, 500);
      }

      return c.json({
        ${ENTITY_NAME}s: result.value.${ENTITY_NAME}s,
        total: result.value.total,
      });
    })
    .get('/:id', async (c) => {
      // GET /${ENTITY_NAME}s/:id - Get ${ENTITY_NAME} by ID
      const id = c.req.param('id');

      const get${PASCAL_CASE_NAME}ByIdFn = get${PASCAL_CASE_NAME}ById.inject({ db })();
      const result = await get${PASCAL_CASE_NAME}ByIdFn(id);

      if (isErr(result)) {
        if (result.error instanceof ValidationError) {
          return c.json({ error: result.error.message }, 400);
        }
        if (result.error instanceof ConflictError) {
          return c.json({ error: result.error.message }, 409);
        }
        // Default to 500 for other errors (DatabaseError, etc.)
        return c.json({ error: result.error.message }, 500);
      }

      if (result.value === null) {
        return c.json({ error: '${ENTITY_NAME}が見つかりません' }, 404);
      }

      return c.json({ ${ENTITY_NAME}: result.value });
    })
    .post('/', async (c) => {
      // POST /${ENTITY_NAME}s - Create new ${ENTITY_NAME}
      const body = await c.req.json();

      const create${PASCAL_CASE_NAME}Fn = create${PASCAL_CASE_NAME}.inject({ db })();
      const result = await create${PASCAL_CASE_NAME}Fn(body);

      if (isErr(result)) {
        if (result.error instanceof ValidationError) {
          return c.json({ error: result.error.message }, 400);
        }
        if (result.error instanceof ConflictError) {
          return c.json({ error: result.error.message }, 409);
        }
        // Default to 500 for other errors (DatabaseError, etc.)
        return c.json({ error: result.error.message }, 500);
      }

      return c.json({ ${ENTITY_NAME}: result.value }, 201);
    });

  // TODO: Add additional routes
  // PUT /${ENTITY_NAME}s/:id - Update ${ENTITY_NAME}
  // DELETE /${ENTITY_NAME}s/:id - Delete ${ENTITY_NAME}
}
"

# Create test files
create_file "$FEATURE_DIR/commands/create-${ENTITY_NAME}.spec.ts" "\
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { setupTestDatabase } from '../../../shared/adapters/db/pglite';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';
import { create${PASCAL_CASE_NAME} } from './create-${ENTITY_NAME}';
// TODO: Import your branded types for testing
// import { ${PASCAL_CASE_NAME}TitleSchema } from '../../../entities/${ENTITY_NAME}/schema';

describe('create${PASCAL_CASE_NAME} command', () => {
  let client: PGlite;
  let db: DrizzleDb;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    client = setup.client;
    db = setup.db;
  });

  afterAll(async () => {
    await client.close();
  });

  describe('success cases', () => {
    it('should create a ${ENTITY_NAME} with valid input', async () => {
      const input = {
        // TODO: Add your domain fields here
        // title: '${PASCAL_CASE_NAME} Title',
        // description: '${PASCAL_CASE_NAME} Description',
      };

      const create${PASCAL_CASE_NAME}Fn = create${PASCAL_CASE_NAME}.inject({ db })();
      const result = await create${PASCAL_CASE_NAME}Fn(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBeDefined();
        // TODO: Add assertions for your domain fields
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
        expect(result.value.deletedAt).toBeNull();
      }
    });
  });

  describe('validation errors', () => {
    it('should reject empty input', async () => {
      const input = {};

      const create${PASCAL_CASE_NAME}Fn = create${PASCAL_CASE_NAME}.inject({ db })();
      const result = await create${PASCAL_CASE_NAME}Fn(input);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('無効です');
      }
    });

    // TODO: Add specific field validation tests
    // it('should reject invalid title', async () => {
    //   const input = {
    //     title: '', // Invalid: empty string
    //     description: 'Valid description',
    //   };
    //
    //   const create${PASCAL_CASE_NAME}Fn = create${PASCAL_CASE_NAME}.inject({ db })();
    //   const result = await create${PASCAL_CASE_NAME}Fn(input);
    //
    //   expect(result.ok).toBe(false);
    //   if (!result.ok) {
    //     expect(result.error.message).toContain('タイトルが無効です');
    //   }
    // });
  });
});
"

create_file "$FEATURE_DIR/queries/get-${ENTITY_NAME}s.spec.ts" "\
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { setupTestDatabase } from '../../../shared/adapters/db/pglite';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';
import { get${PASCAL_CASE_NAME}s, get${PASCAL_CASE_NAME}ById } from './get-${ENTITY_NAME}s';
import { create${PASCAL_CASE_NAME} } from '../commands/create-${ENTITY_NAME}';

describe('${PASCAL_CASE_NAME} Queries', () => {
  let client: PGlite;
  let db: DrizzleDb;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    client = setup.client;
    db = setup.db;
  });

  afterAll(async () => {
    await client.close();
  });

  describe('get${PASCAL_CASE_NAME}s', () => {
    it('should return empty list when no ${ENTITY_NAME}s exist', async () => {
      const get${PASCAL_CASE_NAME}sFn = get${PASCAL_CASE_NAME}s.inject({ db })();
      const result = await get${PASCAL_CASE_NAME}sFn({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.${ENTITY_NAME}s).toEqual([]);
        expect(result.value.total).toBe(0);
      }
    });

    it('should return all ${ENTITY_NAME}s when they exist', async () => {
      // Create test ${ENTITY_NAME}s
      const create${PASCAL_CASE_NAME}Fn = create${PASCAL_CASE_NAME}.inject({ db })();
      
      await create${PASCAL_CASE_NAME}Fn({
        // TODO: Add your domain fields
      });
      await create${PASCAL_CASE_NAME}Fn({
        // TODO: Add your domain fields
      });

      const get${PASCAL_CASE_NAME}sFn = get${PASCAL_CASE_NAME}s.inject({ db })();
      const result = await get${PASCAL_CASE_NAME}sFn({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.${ENTITY_NAME}s.length).toBe(2);
        expect(result.value.total).toBe(2);
      }
    });

    it('should validate query parameters', async () => {
      const get${PASCAL_CASE_NAME}sFn = get${PASCAL_CASE_NAME}s.inject({ db })();
      const result = await get${PASCAL_CASE_NAME}sFn({ page: 'invalid' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('ページ番号');
      }
    });
  });

  describe('get${PASCAL_CASE_NAME}ById', () => {
    it('should return ${ENTITY_NAME} when found', async () => {
      // Create test ${ENTITY_NAME}
      const create${PASCAL_CASE_NAME}Fn = create${PASCAL_CASE_NAME}.inject({ db })();
      const createResult = await create${PASCAL_CASE_NAME}Fn({
        // TODO: Add your domain fields
      });
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const get${PASCAL_CASE_NAME}ByIdFn = get${PASCAL_CASE_NAME}ById.inject({ db })();
      const result = await get${PASCAL_CASE_NAME}ByIdFn(createResult.value.id);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).not.toBeNull();
        expect(result.value?.id).toBe(createResult.value.id);
      }
    });

    it('should return null when ${ENTITY_NAME} not found', async () => {
      const get${PASCAL_CASE_NAME}ByIdFn = get${PASCAL_CASE_NAME}ById.inject({ db })();
      const result = await get${PASCAL_CASE_NAME}ByIdFn('550e8400-e29b-41d4-a716-446655440001');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('should validate ID format', async () => {
      const get${PASCAL_CASE_NAME}ByIdFn = get${PASCAL_CASE_NAME}ById.inject({ db })();
      const result = await get${PASCAL_CASE_NAME}ByIdFn('invalid-id');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('IDが無効です');
      }
    });
  });
});
"

create_file "$FEATURE_DIR/api/routes.spec.ts" "\
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { setupTestDatabase } from '../../../shared/adapters/db/pglite';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';
import { create${PASCAL_CASE_NAME}Routes } from './routes';

describe('${PASCAL_CASE_NAME} API Routes', () => {
  let client: PGlite;
  let db: DrizzleDb;
  let routes: ReturnType<typeof create${PASCAL_CASE_NAME}Routes>;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    client = setup.client;
    db = setup.db;
    routes = create${PASCAL_CASE_NAME}Routes(db);
  });

  afterAll(async () => {
    await client.close();
  });

  describe('GET /', () => {
    it('should return empty ${ENTITY_NAME}s list initially', async () => {
      const response = await routes.request('/');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ ${ENTITY_NAME}s: [], total: 0 });
    });

    it('should return query parameter validation errors', async () => {
      const response = await routes.request('/?page=invalid');

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('ページ番号');
    });
  });

  describe('POST /', () => {
    it('should create ${ENTITY_NAME} with valid data', async () => {
      const ${ENTITY_NAME}Data = {
        // TODO: Add your domain fields
        // title: 'Test ${PASCAL_CASE_NAME}',
        // description: 'Test Description',
      };

      const response = await routes.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(${ENTITY_NAME}Data),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.${ENTITY_NAME}.id).toBeDefined();
      // TODO: Add assertions for your domain fields
    });

    it('should reject invalid data', async () => {
      const response = await routes.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('無効です');
    });
  });

  describe('GET /:id', () => {
    it('should return ${ENTITY_NAME} by id', async () => {
      // Create ${ENTITY_NAME} first
      const createResponse = await routes.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // TODO: Add your domain fields
        }),
      });
      const createData = await createResponse.json();
      const ${ENTITY_NAME}Id = createData.${ENTITY_NAME}.id;

      const response = await routes.request(\`/\${${ENTITY_NAME}Id}\`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.${ENTITY_NAME}.id).toBe(${ENTITY_NAME}Id);
    });

    it('should return 404 for non-existent ${ENTITY_NAME}', async () => {
      const response = await routes.request('/550e8400-e29b-41d4-a716-446655440001');

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('見つかりません');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await routes.request('/invalid-id');

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('IDが無効です');
    });
  });
});
"

# Replace placeholders in all created files
if [ "$DRY_RUN" = false ]; then
    find "$FEATURE_DIR" -name "*.ts" -exec sed -i "s/\${PASCAL_CASE_NAME}/${PASCAL_CASE_NAME}/g" {} \;
    find "$FEATURE_DIR" -name "*.ts" -exec sed -i "s/\${ENTITY_NAME}/${ENTITY_NAME}/g" {} \;
fi

if [ "$DRY_RUN" = true ]; then
    echo "✅ DRY RUN completed for backend feature '${FEATURE_NAME}'"
    echo "📁 Would create files:"
    echo "   - API schemas with Pick/Partial transformations"
    echo "   - Domain errors (no HTTP dependencies)"
    echo "   - Commands and queries using Repository pattern"
    echo "   - API routes with direct error handling"
    echo "   - Comprehensive tests for all layers"
else
    echo "✅ Backend feature '${FEATURE_NAME}' created successfully!"
    echo "📁 Created files:"
    echo "   - $FEATURE_DIR/api/schemas.ts (Pick/Partial type transformations)"
    echo "   - $FEATURE_DIR/domain/errors.ts (Domain error classes)"
    echo "   - $FEATURE_DIR/commands/create-${ENTITY_NAME}.ts"
    echo "   - $FEATURE_DIR/commands/create-${ENTITY_NAME}.spec.ts"
    echo "   - $FEATURE_DIR/queries/get-${ENTITY_NAME}s.ts"
    echo "   - $FEATURE_DIR/queries/get-${ENTITY_NAME}s.spec.ts"
    echo "   - $FEATURE_DIR/api/routes.ts (Direct error handling)"
    echo "   - $FEATURE_DIR/api/routes.spec.ts"
fi

echo ""
echo "Next steps for TDD development:"
echo "1. 🔴 RED: Start with failing tests"
echo "   - Update entity schema in entities/${ENTITY_NAME}/schema.ts with domain fields"
echo "   - Update TODO comments in test files with actual test cases"
echo "   - Update API schemas to Pick/Partial the correct fields from your entity"
echo "   - Run: yarn workspace backend test src/features/${FEATURE_NAME}/ (should fail)"
echo "2. 🟢 GREEN: Make tests pass with minimal implementation"
echo "   - Implement domain-specific logic in commands/queries"
echo "   - Add business validation rules as needed"
echo "   - Keep running tests until they pass"
echo "3. 🔵 BLUE: Refactor while keeping tests green"
echo "4. Use MCP tools for comprehensive test coverage:"
echo "   - Create decision tables for complex business scenarios"
echo "   - Generate edge case tests: mcp__testing-mcp__generate_tests"
echo "   - Analyze coverage gaps: mcp__testing-mcp__analyze_coverage"
echo "5. Add the feature routes to your main server.ts:"
echo "   import { create${PASCAL_CASE_NAME}Routes } from './features/${FEATURE_NAME}/api/routes';"
echo "   app.route('/${ENTITY_NAME}s', create${PASCAL_CASE_NAME}Routes(db));"