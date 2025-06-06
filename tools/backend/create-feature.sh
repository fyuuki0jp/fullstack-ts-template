#!/bin/bash

# Backend Feature Boilerplate Generator
# Usage: ./create-feature.sh <feature-name> [entity-name] [--dry-run]
#
# This script creates a generic feature template with TODO comments.
# After running this script, you should:
# 1. Implement the domain-specific logic according to your requirements
# 2. Use MCP testing tools for comprehensive test coverage:
#    - Create decision tables: mcp__testing-mcp__create_decision_table
#    - Generate tests: mcp__testing-mcp__generate_tests
#    - Add generated tests to replace the generic TODO test templates

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
    echo "Example: $0 user"
    echo "Example: $0 user --dry-run"
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

# Check if entity exists (check for entity directory structure)
ENTITY_DIR="backend/src/entities/${ENTITY_NAME}"
ENTITY_SCHEMA_FILE="$ENTITY_DIR/schema.ts"
ENTITY_ENTITY_FILE="$ENTITY_DIR/entity.ts"

if [ ! -d "$ENTITY_DIR" ] || [ ! -f "$ENTITY_SCHEMA_FILE" ] || [ ! -f "$ENTITY_ENTITY_FILE" ]; then
    echo "⚠️  Entity '${ENTITY_NAME}' not found. Creating it first..."
    if [ "$DRY_RUN" = true ]; then
        ./tools/backend/create-entity.sh "$ENTITY_NAME" --dry-run
    else
        ./tools/backend/create-entity.sh "$ENTITY_NAME"
    fi
else
    echo "✅ Entity '${ENTITY_NAME}' already exists. Using existing entity..."
fi

# Create repository interface
create_file "$FEATURE_DIR/domain/repository.ts" "\
import type { Result } from '@fyuuki0jp/railway-result';
import type { ${PASCAL_CASE_NAME}, Create${PASCAL_CASE_NAME}Input, ${PASCAL_CASE_NAME}Id } from '../../../entities/${ENTITY_NAME}';

export interface ${PASCAL_CASE_NAME}Repository {
  create(input: Create${PASCAL_CASE_NAME}Input): Promise<Result<${PASCAL_CASE_NAME}, Error>>;
  findAll(): Promise<Result<${PASCAL_CASE_NAME}[], Error>>;
  findById(id: ${PASCAL_CASE_NAME}Id): Promise<Result<${PASCAL_CASE_NAME} | null, Error>>;
}
"

# Create repository implementation
create_file "$FEATURE_DIR/domain/${ENTITY_NAME}-repository-impl.ts" "\
import { depend } from 'velona';
import { ok, err, isErr } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { DbAdapter } from '../../../shared/adapters/db';
import {
  type ${PASCAL_CASE_NAME},
  type Create${PASCAL_CASE_NAME}Input,
  type ${PASCAL_CASE_NAME}Id,
  validate${PASCAL_CASE_NAME},
  create${PASCAL_CASE_NAME}Id,
} from '../../../entities/${ENTITY_NAME}';

// TODO: Implement repository methods according to your entity schema
export const ${ENTITY_NAME}RepositoryImpl = depend({ db: {} as DbAdapter }, ({ db }) => ({
  async create(input: Create${PASCAL_CASE_NAME}Input): Promise<Result<${PASCAL_CASE_NAME}, Error>> {
    // TODO: Generate ID for new entity
    const idResult = create${PASCAL_CASE_NAME}Id();
    if (isErr(idResult)) {
      return idResult;
    }

    // TODO: Create entity data based on your schema
    // Example:
    // const entityData: ${PASCAL_CASE_NAME} = {
    //   id: idResult.data,
    //   // Add your domain fields here
    //   createdAt: new Date(),
    //   updatedAt: new Date(),
    //   deletedAt: null,
    // };

    // TODO: Execute INSERT query with your table columns
    // Example:
    // const result = await db.execute(
    //   'INSERT INTO ${ENTITY_NAME}s (id, field1, field2, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    //   [entityData.id, entityData.field1, entityData.field2, entityData.createdAt.toISOString(), entityData.updatedAt.toISOString()]
    // );

    // TODO: Return created entity or error
    throw new Error('TODO: Implement create method according to your entity schema');
  },

  async findAll(): Promise<Result<${PASCAL_CASE_NAME}[], Error>> {
    // TODO: Execute SELECT query with your table columns
    // Example:
    // const result = await db.query<{
    //   id: string;
    //   field1: string;
    //   field2: string | null;
    //   created_at: string;
    //   updated_at: string;
    //   deleted_at: string | null;
    // }>('SELECT id, field1, field2, created_at, updated_at, deleted_at FROM ${ENTITY_NAME}s WHERE deleted_at IS NULL');

    // TODO: Transform database rows to domain objects
    // Use validate${PASCAL_CASE_NAME}() to ensure data integrity

    throw new Error('TODO: Implement findAll method according to your entity schema');
  },

  async findById(id: ${PASCAL_CASE_NAME}Id): Promise<Result<${PASCAL_CASE_NAME} | null, Error>> {
    // TODO: Execute SELECT query by ID
    // TODO: Return null if not found, entity if found, error if database error
    // Use validate${PASCAL_CASE_NAME}() to ensure data integrity

    throw new Error('TODO: Implement findById method according to your entity schema');
  },
}));
"

# Create command
create_file "$FEATURE_DIR/commands/create-${ENTITY_NAME}.ts" "\
import { depend } from 'velona';
import { isErr } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import { type ${PASCAL_CASE_NAME}, validateCreate${PASCAL_CASE_NAME}Input } from '../../../entities/${ENTITY_NAME}';
import type { ${PASCAL_CASE_NAME}Repository } from '../domain/repository';

// TODO: Implement create command according to your domain requirements
export const create${PASCAL_CASE_NAME} = depend(
  { ${ENTITY_NAME}Repository: {} as ${PASCAL_CASE_NAME}Repository },
  ({ ${ENTITY_NAME}Repository }) =>
    async (input: unknown): Promise<Result<${PASCAL_CASE_NAME}, Error>> => {
      // TODO: Validate input using domain helper
      const validationResult = validateCreate${PASCAL_CASE_NAME}Input(input);
      if (isErr(validationResult)) {
        return validationResult;
      }

      const validatedInput = validationResult.data;

      // TODO: Add additional business logic validation if needed
      // Example: Check business rules, permissions, etc.

      // TODO: Create entity using repository
      return ${ENTITY_NAME}Repository.create(validatedInput);
    }
);
"

# Create query
create_file "$FEATURE_DIR/queries/get-${ENTITY_NAME}s.ts" "\
import { depend } from 'velona';
import type { Result } from '@fyuuki0jp/railway-result';
import type { ${PASCAL_CASE_NAME} } from '../../../entities/${ENTITY_NAME}';
import type { ${PASCAL_CASE_NAME}Repository } from '../domain/repository';

// TODO: Implement query to get all entities
export const get${PASCAL_CASE_NAME}s = depend(
  { ${ENTITY_NAME}Repository: {} as ${PASCAL_CASE_NAME}Repository },
  ({ ${ENTITY_NAME}Repository }) => async (): Promise<Result<${PASCAL_CASE_NAME}[], Error>> => {
    // TODO: Add business logic if needed (filtering, sorting, etc.)
    // TODO: Add authorization checks if needed

    return ${ENTITY_NAME}Repository.findAll();
  }
);
"

# Create get by ID query
create_file "$FEATURE_DIR/queries/get-${ENTITY_NAME}-by-id.ts" "\
import { depend } from 'velona';
import { err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import { type ${PASCAL_CASE_NAME}, ${PASCAL_CASE_NAME}IdSchema } from '../../../entities/${ENTITY_NAME}';
import type { ${PASCAL_CASE_NAME}Repository } from '../domain/repository';

// TODO: Implement query to get entity by ID
export const get${PASCAL_CASE_NAME}ById = depend(
  { ${ENTITY_NAME}Repository: {} as ${PASCAL_CASE_NAME}Repository },
  ({ ${ENTITY_NAME}Repository }) =>
    async (id: unknown): Promise<Result<${PASCAL_CASE_NAME} | null, Error>> => {
      // TODO: Validate ID format
      const idValidation = ${PASCAL_CASE_NAME}IdSchema.safeParse(id);
      if (!idValidation.success) {
        return err(new Error('Invalid ${ENTITY_NAME} ID format'));
      }

      // TODO: Add authorization checks if needed
      // TODO: Add business logic if needed

      return ${ENTITY_NAME}Repository.findById(idValidation.data);
    }
);
"

# Create API routes
create_file "$FEATURE_DIR/api/routes.ts" "\
import { Hono } from 'hono';
import { isErr } from '@fyuuki0jp/railway-result';
import { create${PASCAL_CASE_NAME} } from '../commands/create-${ENTITY_NAME}';
import { get${PASCAL_CASE_NAME}s } from '../queries/get-${ENTITY_NAME}s';
import { get${PASCAL_CASE_NAME}ById } from '../queries/get-${ENTITY_NAME}-by-id';
import { ${ENTITY_NAME}RepositoryImpl } from '../domain/${ENTITY_NAME}-repository-impl';
import type { DbAdapter } from '../../../shared/adapters/db';

export default (db: DbAdapter) => {
  return new Hono()
    .get('/', async (c) => {
      // Dependency injection
      const ${ENTITY_NAME}Repository = ${ENTITY_NAME}RepositoryImpl.inject({ db })();
      const get${PASCAL_CASE_NAME}sUseCase = get${PASCAL_CASE_NAME}s.inject({ ${ENTITY_NAME}Repository })();

      // Execute use case
      const result = await get${PASCAL_CASE_NAME}sUseCase();

      // Handle errors with appropriate status codes
      if (isErr(result)) {
        return c.json({ error: result.error.message }, 500);
      }

      // Return success response
      return c.json({ ${ENTITY_NAME}s: result.data });
    })
    .post('/', async (c) => {
      // Parse request body with error handling
      let body;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
      }

      // Dependency injection
      const ${ENTITY_NAME}Repository = ${ENTITY_NAME}RepositoryImpl.inject({ db })();
      const create${PASCAL_CASE_NAME}UseCase = create${PASCAL_CASE_NAME}.inject({ ${ENTITY_NAME}Repository })();

      // Execute use case
      const result = await create${PASCAL_CASE_NAME}UseCase(body);

      // Handle errors with appropriate status codes
      if (isErr(result)) {
        const statusCode = determineStatusCode(result.error.message);
        return c.json({ error: result.error.message }, statusCode);
      }

      // Return 201 Created for successful creation
      return c.json({ ${ENTITY_NAME}: result.data }, 201);
    })
    .get('/:id', async (c) => {
      const id = c.req.param('id');

      // Dependency injection
      const ${ENTITY_NAME}Repository = ${ENTITY_NAME}RepositoryImpl.inject({ db })();
      const get${PASCAL_CASE_NAME}ByIdUseCase = get${PASCAL_CASE_NAME}ById.inject({ ${ENTITY_NAME}Repository })();

      // Execute use case
      const result = await get${PASCAL_CASE_NAME}ByIdUseCase(id);

      // Handle errors with appropriate status codes
      if (isErr(result)) {
        if (result.error.message.includes('Invalid ${ENTITY_NAME} ID format')) {
          return c.json({ error: result.error.message }, 400);
        }
        return c.json({ error: result.error.message }, 500);
      }

      // Handle not found
      if (result.data === null) {
        return c.json({ error: '${PASCAL_CASE_NAME} not found' }, 404);
      }

      // Return success response
      return c.json({ ${ENTITY_NAME}: result.data });
    });
};

// Helper function to determine status code based on error message
function determineStatusCode(errorMessage: string): number {
  if (
    errorMessage.includes('Database') ||
    errorMessage.includes('UNIQUE constraint') ||
    errorMessage.includes('Execute failed')
  ) {
    return 500;
  }
  return 400;
}
"

# Create command test
create_file "$FEATURE_DIR/commands/create-${ENTITY_NAME}.spec.ts" "\
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create${PASCAL_CASE_NAME} } from './create-${ENTITY_NAME}';
import { isErr, ok, err } from '@fyuuki0jp/railway-result';
import type { ${PASCAL_CASE_NAME}Repository } from '../domain/repository';
import type { ${PASCAL_CASE_NAME} } from '../../../entities/${ENTITY_NAME}';

describe('create${PASCAL_CASE_NAME} command', () => {
  let mock${PASCAL_CASE_NAME}Repo: ${PASCAL_CASE_NAME}Repository;
  let create${PASCAL_CASE_NAME}Cmd: ReturnType<typeof create${PASCAL_CASE_NAME}.inject>;

  beforeEach(() => {
    mock${PASCAL_CASE_NAME}Repo = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
    };
    create${PASCAL_CASE_NAME}Cmd = create${PASCAL_CASE_NAME}.inject({ ${ENTITY_NAME}Repository: mock${PASCAL_CASE_NAME}Repo });
  });

  it('should create a ${ENTITY_NAME} with valid input', async () => {
    // TODO: Replace with your domain-specific input fields
    const input = {
      // Example: title: 'Test ${PASCAL_CASE_NAME}',
      // Example: description: 'A test ${ENTITY_NAME}',
    };
    // TODO: Replace with your entity structure
    const created${PASCAL_CASE_NAME}: ${PASCAL_CASE_NAME} = {
      id: '550e8400-e29b-41d4-a716-446655440001' as ${PASCAL_CASE_NAME}['id'],
      // TODO: Add your domain fields here
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    vi.mocked(mock${PASCAL_CASE_NAME}Repo.create).mockResolvedValue(ok(created${PASCAL_CASE_NAME}));

    const result = await create${PASCAL_CASE_NAME}Cmd()(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(created${PASCAL_CASE_NAME});
    }
    expect(mock${PASCAL_CASE_NAME}Repo.create).toHaveBeenCalledWith(input);
  });

  // TODO: Add validation tests based on your domain schema
  it('should validate required fields', async () => {
    const input = {
      // TODO: Add invalid field values according to your schema
    };

    const result = await create${PASCAL_CASE_NAME}Cmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      // TODO: Update error message to match your validation
      expect(result.error.message).toContain('validation failed');
    }
    expect(mock${PASCAL_CASE_NAME}Repo.create).not.toHaveBeenCalled();
  });

  // TODO: Add specific field validation tests
  it('should validate field constraints', async () => {
    const input = {
      // TODO: Add input that violates field constraints
    };

    const result = await create${PASCAL_CASE_NAME}Cmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      // TODO: Update error message to match your validation
      expect(result.error.message).toContain('validation failed');
    }
    expect(mock${PASCAL_CASE_NAME}Repo.create).not.toHaveBeenCalled();
  });

  // TODO: Add additional validation tests for your domain
  it('should validate optional field constraints', async () => {
    const input = {
      // TODO: Add input that violates optional field constraints
    };

    const result = await create${PASCAL_CASE_NAME}Cmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      // TODO: Update error message to match your validation
      expect(result.error.message).toContain('validation failed');
    }
    expect(mock${PASCAL_CASE_NAME}Repo.create).not.toHaveBeenCalled();
  });

  it('should handle repository errors', async () => {
    // TODO: Use valid input according to your schema
    const input = {
      // TODO: Add valid field values
    };

    vi.mocked(mock${PASCAL_CASE_NAME}Repo.create).mockResolvedValue(
      err(new Error('Database error'))
    );

    const result = await create${PASCAL_CASE_NAME}Cmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Database error');
    }
  });

  it('should handle invalid input types', async () => {
    // TODO: Add input with wrong types according to your schema
    const input = {
      // TODO: Add fields with wrong types (e.g., number instead of string)
    };

    const result = await create${PASCAL_CASE_NAME}Cmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      // TODO: Update error message to match your validation
      expect(result.error.message).toContain('Expected');
    }
    expect(mock${PASCAL_CASE_NAME}Repo.create).not.toHaveBeenCalled();
  });
});
"

# Create query test
create_file "$FEATURE_DIR/queries/get-${ENTITY_NAME}s.spec.ts" "\
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get${PASCAL_CASE_NAME}s } from './get-${ENTITY_NAME}s';
import { isErr, ok, err } from '@fyuuki0jp/railway-result';
import type { ${PASCAL_CASE_NAME}Repository } from '../domain/repository';

describe('get${PASCAL_CASE_NAME}s query', () => {
  let mock${PASCAL_CASE_NAME}Repo: ${PASCAL_CASE_NAME}Repository;
  let get${PASCAL_CASE_NAME}sQuery: ReturnType<typeof get${PASCAL_CASE_NAME}s.inject>;

  beforeEach(() => {
    mock${PASCAL_CASE_NAME}Repo = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
    };
    get${PASCAL_CASE_NAME}sQuery = get${PASCAL_CASE_NAME}s.inject({ ${ENTITY_NAME}Repository: mock${PASCAL_CASE_NAME}Repo });
  });

  it('should return all ${ENTITY_NAME}s', async () => {
    // TODO: Create mock entities according to your schema
    const mock${PASCAL_CASE_NAME}s = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        // TODO: Add your domain fields here
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        // TODO: Add your domain fields here
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];

    vi.mocked(mock${PASCAL_CASE_NAME}Repo.findAll).mockResolvedValue(ok(mock${PASCAL_CASE_NAME}s));

    const result = await get${PASCAL_CASE_NAME}sQuery()();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mock${PASCAL_CASE_NAME}s);
      expect(result.data).toHaveLength(2);
    }
  });

  it('should return empty array when no ${ENTITY_NAME}s exist', async () => {
    vi.mocked(mock${PASCAL_CASE_NAME}Repo.findAll).mockResolvedValue(ok([]));

    const result = await get${PASCAL_CASE_NAME}sQuery()();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it('should handle repository errors', async () => {
    vi.mocked(mock${PASCAL_CASE_NAME}Repo.findAll).mockResolvedValue(
      err(new Error('Database connection failed'))
    );

    const result = await get${PASCAL_CASE_NAME}sQuery()();

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Database connection failed');
    }
  });
});
"

# Create API routes test
create_file "$FEATURE_DIR/api/routes.spec.ts" "\
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import create${PASCAL_CASE_NAME}Routes from './routes';
import { setupTestDatabase } from '../../../shared/adapters/db/pglite';
import type { PGlite } from '@electric-sql/pglite';
import type { DrizzleDb } from '../../../shared/adapters/db/pglite';

describe('${PASCAL_CASE_NAME} API Routes', () => {
  let app: Hono;
  let client: PGlite;
  let db: DrizzleDb;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    client = setup.client;
    db = setup.db;
    const ${ENTITY_NAME}Routes = create${PASCAL_CASE_NAME}Routes(db);
    app = new Hono();
    app.route('/', ${ENTITY_NAME}Routes);
  });

  afterAll(async () => {
    await client.close();
  });

  describe('GET /', () => {
    it('should return empty ${ENTITY_NAME}s list initially', async () => {
      const res = await app.request('/');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ${ENTITY_NAME}s: [] });
    });

    it('should return all ${ENTITY_NAME}s when they exist', async () => {
      // Create isolated test instance  
      const isolatedSetup = await setupTestDatabase();
      const isolatedRoutes = create${PASCAL_CASE_NAME}Routes(isolatedSetup.db);
      const testApp = new Hono();
      testApp.route('/', isolatedRoutes);

      // TODO: Create test ${ENTITY_NAME}s with your domain fields
      await testApp.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // TODO: Replace with your domain fields
        body: JSON.stringify({ /* Add your required fields here */ }),
      });

      await testApp.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // TODO: Replace with your domain fields
        body: JSON.stringify({ /* Add your required fields here */ }),
      });

      const res = await testApp.request('/');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.${ENTITY_NAME}s.length).toBeGreaterThanOrEqual(2);

      // TODO: Check ${ENTITY_NAME}s are present (adapt to your fields)
      // Example: const values = data.${ENTITY_NAME}s.map((item: { fieldName: string }) => item.fieldName);
      // expect(values).toContain('Expected Value 1');
      // expect(values).toContain('Expected Value 2');

      await isolatedSetup.client.close();
    });
  });

  describe('POST /', () => {
    it('should create a new ${ENTITY_NAME} with valid data', async () => {
      // TODO: Replace with your domain fields
      const ${ENTITY_NAME}Data = {
        // TODO: Add required fields according to your schema
      };

      const res = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(${ENTITY_NAME}Data),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      // TODO: Update assertions to match your domain fields
      expect(data.${ENTITY_NAME}.id).toBeTruthy();
      expect(data.${ENTITY_NAME}.createdAt).toBeTruthy();
      expect(data.${ENTITY_NAME}.updatedAt).toBeTruthy();
      expect(data.${ENTITY_NAME}.deletedAt).toBeNull();
    });

    // TODO: Add validation tests based on your domain requirements
    it('should validate required fields', async () => {
      const ${ENTITY_NAME}Data = {
        // TODO: Add invalid field values according to your schema
      };

      const res = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(${ENTITY_NAME}Data),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      // TODO: Update error message to match your validation
      expect(data.error).toContain('validation failed');
    });

    it('should handle invalid JSON', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid JSON');
    });
  });

  describe('GET /:id', () => {
    it('should return ${ENTITY_NAME} by id', async () => {
      // Create isolated test instance and add test data
      const isolatedSetup = await setupTestDatabase();
      const isolatedRoutes = create${PASCAL_CASE_NAME}Routes(isolatedSetup.db);
      const testApp = new Hono();
      testApp.route('/', isolatedRoutes);

      // TODO: Create a test ${ENTITY_NAME} with your domain fields
      const createRes = await testApp.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // TODO: Replace with your required fields
        body: JSON.stringify({ /* Add your required fields here */ }),
      });
      const createData = await createRes.json();
      const ${ENTITY_NAME}Id = createData.${ENTITY_NAME}.id;

      const res = await testApp.request(\`/\${${ENTITY_NAME}Id}\`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.${ENTITY_NAME}.id).toBe(${ENTITY_NAME}Id);
      // TODO: Add assertions for your domain fields

      await isolatedSetup.client.close();
    });

    it('should return 404 when ${ENTITY_NAME} not found', async () => {
      const ${ENTITY_NAME}Id = '550e8400-e29b-41d4-a716-446655440001';

      const res = await app.request(\`/\${${ENTITY_NAME}Id}\`);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('${PASCAL_CASE_NAME} not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await app.request('/invalid-id');

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid ${ENTITY_NAME} ID format');
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
    echo "   - Repository interface and implementation"
    echo "   - Commands and queries with tests"
    echo "   - API routes with tests"
    echo "   - All files using zod + branded types + Railway Result pattern"
else
    echo "✅ Backend feature '${FEATURE_NAME}' created successfully!"
    echo "📁 Created files:"
    echo "   - $FEATURE_DIR/domain/repository.ts"
    echo "   - $FEATURE_DIR/domain/${ENTITY_NAME}-repository-impl.ts"
    echo "   - $FEATURE_DIR/commands/create-${ENTITY_NAME}.ts"
    echo "   - $FEATURE_DIR/commands/create-${ENTITY_NAME}.spec.ts"
    echo "   - $FEATURE_DIR/queries/get-${ENTITY_NAME}s.ts"
    echo "   - $FEATURE_DIR/queries/get-${ENTITY_NAME}s.spec.ts"
    echo "   - $FEATURE_DIR/queries/get-${ENTITY_NAME}-by-id.ts"
    echo "   - $FEATURE_DIR/api/routes.ts"
    echo "   - $FEATURE_DIR/api/routes.spec.ts"
fi

echo ""
echo "Next steps:"
echo "1. Implement domain-specific logic by replacing TODO comments"
echo "2. Create decision tables using MCP tools:"
echo "   - mcp__testing-mcp__create_decision_table for test scenarios"
echo "   - mcp__testing-mcp__generate_tests to generate test code"
echo "3. Replace generic test templates with generated MCP tests"
echo "4. Add the feature routes to your main server.ts:"
echo "   import create${PASCAL_CASE_NAME}Routes from './features/${FEATURE_NAME}/api/routes';"
echo "   app.route('/${ENTITY_NAME}s', create${PASCAL_CASE_NAME}Routes(db));"
echo "5. Ensure database table structure matches your entity schema"
echo "6. Run tests: yarn test src/features/${FEATURE_NAME}/"