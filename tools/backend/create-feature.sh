#!/bin/bash

# Backend Feature Boilerplate Generator
# Usage: ./create-feature.sh <feature-name> [entity-name] [--dry-run]

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

# Check if entity exists
ENTITY_FILE="backend/src/entities/${ENTITY_NAME}.ts"
if [ ! -f "$ENTITY_FILE" ]; then
    echo "⚠️  Entity '${ENTITY_NAME}' not found. Creating it first..."
    if [ "$DRY_RUN" = true ]; then
        ./tools/backend/create-entity.sh "$ENTITY_NAME" --dry-run
    else
        ./tools/backend/create-entity.sh "$ENTITY_NAME"
    fi
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

export const ${ENTITY_NAME}RepositoryImpl = depend({ db: {} as DbAdapter }, ({ db }) => ({
  async create(input: Create${PASCAL_CASE_NAME}Input): Promise<Result<${PASCAL_CASE_NAME}, Error>> {
    const idResult = create${PASCAL_CASE_NAME}Id();
    if (isErr(idResult)) {
      return idResult;
    }

    const now = new Date();

    const ${ENTITY_NAME}Data: ${PASCAL_CASE_NAME} = {
      id: idResult.data,
      name: input.name,
      description: input.description,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const result = await db.execute(
      \`INSERT INTO ${ENTITY_NAME}s (id, name, description, created_at, updated_at, deleted_at) 
         VALUES (?, ?, ?, ?, ?, ?)\`,
      [
        ${ENTITY_NAME}Data.id,
        ${ENTITY_NAME}Data.name,
        ${ENTITY_NAME}Data.description || null,
        ${ENTITY_NAME}Data.createdAt.toISOString(),
        ${ENTITY_NAME}Data.updatedAt.toISOString(),
        ${ENTITY_NAME}Data.deletedAt?.toISOString() || null,
      ]
    );

    if (isErr(result)) {
      return err(result.error);
    }

    return ok(${ENTITY_NAME}Data);
  },

  async findAll(): Promise<Result<${PASCAL_CASE_NAME}[], Error>> {
    const result = await db.query<{
      id: string;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
    }>(
      'SELECT id, name, description, created_at, updated_at, deleted_at FROM ${ENTITY_NAME}s WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );

    if (isErr(result)) {
      return err(result.error);
    }

    const ${ENTITY_NAME}s: ${PASCAL_CASE_NAME}[] = [];
    for (const row of result.data) {
      const ${ENTITY_NAME}Result = validate${PASCAL_CASE_NAME}({
        id: row.id,
        name: row.name,
        description: row.description,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
      });

      if (isErr(${ENTITY_NAME}Result)) {
        return err(
          new Error(
            \`Invalid ${ENTITY_NAME} data from database for id: \${row.id} - \${${ENTITY_NAME}Result.error.message}\`
          )
        );
      }

      ${ENTITY_NAME}s.push(${ENTITY_NAME}Result.data);
    }

    return ok(${ENTITY_NAME}s);
  },

  async findById(id: ${PASCAL_CASE_NAME}Id): Promise<Result<${PASCAL_CASE_NAME} | null, Error>> {
    const result = await db.query<{
      id: string;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
    }>(
      'SELECT id, name, description, created_at, updated_at, deleted_at FROM ${ENTITY_NAME}s WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    if (isErr(result)) {
      return err(result.error);
    }

    if (result.data.length === 0) {
      return ok(null);
    }

    const row = result.data[0];
    const ${ENTITY_NAME}Result = validate${PASCAL_CASE_NAME}({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    });

    if (isErr(${ENTITY_NAME}Result)) {
      return err(
        new Error(
          \`Invalid ${ENTITY_NAME} data from database for id: \${row.id} - \${${ENTITY_NAME}Result.error.message}\`
        )
      );
    }

    return ok(${ENTITY_NAME}Result.data);
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

export const create${PASCAL_CASE_NAME} = depend(
  { ${ENTITY_NAME}Repository: {} as ${PASCAL_CASE_NAME}Repository },
  ({ ${ENTITY_NAME}Repository }) =>
    async (input: unknown): Promise<Result<${PASCAL_CASE_NAME}, Error>> => {
      // Validate input using domain helper
      const validationResult = validateCreate${PASCAL_CASE_NAME}Input(input);
      if (isErr(validationResult)) {
        return validationResult;
      }

      const validatedInput = validationResult.data;

      // Create ${ENTITY_NAME}
      return ${ENTITY_NAME}Repository.create({
        name: validatedInput.name,
        description: validatedInput.description,
      });
    }
);
"

# Create query
create_file "$FEATURE_DIR/queries/get-${ENTITY_NAME}s.ts" "\
import { depend } from 'velona';
import type { Result } from '@fyuuki0jp/railway-result';
import type { ${PASCAL_CASE_NAME} } from '../../../entities/${ENTITY_NAME}';
import type { ${PASCAL_CASE_NAME}Repository } from '../domain/repository';

export const get${PASCAL_CASE_NAME}s = depend(
  { ${ENTITY_NAME}Repository: {} as ${PASCAL_CASE_NAME}Repository },
  ({ ${ENTITY_NAME}Repository }) => async (): Promise<Result<${PASCAL_CASE_NAME}[], Error>> => {
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

export const get${PASCAL_CASE_NAME}ById = depend(
  { ${ENTITY_NAME}Repository: {} as ${PASCAL_CASE_NAME}Repository },
  ({ ${ENTITY_NAME}Repository }) =>
    async (id: unknown): Promise<Result<${PASCAL_CASE_NAME} | null, Error>> => {
      // Validate ID format
      const idValidation = ${PASCAL_CASE_NAME}IdSchema.safeParse(id);
      if (!idValidation.success) {
        return err(new Error('Invalid ${ENTITY_NAME} ID format'));
      }

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
    const input = {
      name: 'Test ${PASCAL_CASE_NAME}',
      description: 'A test ${ENTITY_NAME}',
    };
    const created${PASCAL_CASE_NAME}: ${PASCAL_CASE_NAME} = {
      id: '550e8400-e29b-41d4-a716-446655440001' as ${PASCAL_CASE_NAME}['id'],
      name: input.name as ${PASCAL_CASE_NAME}['name'],
      description: input.description as ${PASCAL_CASE_NAME}['description'],
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

  it('should validate name is required', async () => {
    const input = {
      name: '',
      description: 'A test ${ENTITY_NAME}',
    };

    const result = await create${PASCAL_CASE_NAME}Cmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain('Name is required');
    }
    expect(mock${PASCAL_CASE_NAME}Repo.create).not.toHaveBeenCalled();
  });

  it('should validate name length', async () => {
    const input = {
      name: 'a'.repeat(101), // 101 characters
      description: 'A test ${ENTITY_NAME}',
    };

    const result = await create${PASCAL_CASE_NAME}Cmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain('100 characters or less');
    }
    expect(mock${PASCAL_CASE_NAME}Repo.create).not.toHaveBeenCalled();
  });

  it('should validate description length', async () => {
    const input = {
      name: 'Test ${PASCAL_CASE_NAME}',
      description: 'a'.repeat(501), // 501 characters
    };

    const result = await create${PASCAL_CASE_NAME}Cmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain('500 characters or less');
    }
    expect(mock${PASCAL_CASE_NAME}Repo.create).not.toHaveBeenCalled();
  });

  it('should handle repository errors', async () => {
    const input = {
      name: 'Test ${PASCAL_CASE_NAME}',
      description: 'A test ${ENTITY_NAME}',
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
    const input = {
      name: 123,
      description: true,
    };

    const result = await create${PASCAL_CASE_NAME}Cmd()(input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain('Expected string');
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
    const mock${PASCAL_CASE_NAME}s = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test ${PASCAL_CASE_NAME} 1',
        description: 'First test ${ENTITY_NAME}',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Test ${PASCAL_CASE_NAME} 2',
        description: 'Second test ${ENTITY_NAME}',
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

      // Create test ${ENTITY_NAME}s
      await testApp.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '${PASCAL_CASE_NAME} 1', description: 'First ${ENTITY_NAME}' }),
      });

      await testApp.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '${PASCAL_CASE_NAME} 2', description: 'Second ${ENTITY_NAME}' }),
      });

      const res = await testApp.request('/');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.${ENTITY_NAME}s.length).toBeGreaterThanOrEqual(2);

      // Check ${ENTITY_NAME}s are present (order might vary)
      const names = data.${ENTITY_NAME}s.map((item: { name: string }) => item.name);
      expect(names).toContain('${PASCAL_CASE_NAME} 1');
      expect(names).toContain('${PASCAL_CASE_NAME} 2');

      await isolatedSetup.client.close();
    });
  });

  describe('POST /', () => {
    it('should create a new ${ENTITY_NAME} with valid data', async () => {
      const ${ENTITY_NAME}Data = {
        name: 'Test ${PASCAL_CASE_NAME}',
        description: 'A test ${ENTITY_NAME}',
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
      expect(data.${ENTITY_NAME}.name).toBe('Test ${PASCAL_CASE_NAME}');
      expect(data.${ENTITY_NAME}.description).toBe('A test ${ENTITY_NAME}');
      expect(data.${ENTITY_NAME}.id).toBeTruthy();
      expect(data.${ENTITY_NAME}.createdAt).toBeTruthy();
      expect(data.${ENTITY_NAME}.updatedAt).toBeTruthy();
      expect(data.${ENTITY_NAME}.deletedAt).toBeNull();
    });

    it('should validate name is required', async () => {
      const ${ENTITY_NAME}Data = {
        name: '',
        description: 'A test ${ENTITY_NAME}',
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
      expect(data.error).toContain('Name is required');
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

      // Create a test ${ENTITY_NAME}
      const createRes = await testApp.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test ${PASCAL_CASE_NAME}', description: 'A test ${ENTITY_NAME}' }),
      });
      const createData = await createRes.json();
      const ${ENTITY_NAME}Id = createData.${ENTITY_NAME}.id;

      const res = await testApp.request(\`/\${${ENTITY_NAME}Id}\`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.${ENTITY_NAME}.id).toBe(${ENTITY_NAME}Id);
      expect(data.${ENTITY_NAME}.name).toBe('Test ${PASCAL_CASE_NAME}');

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
echo "1. Add the feature routes to your main server.ts:"
echo "   import create${PASCAL_CASE_NAME}Routes from './features/${FEATURE_NAME}/api/routes';"
echo "   app.route('/${ENTITY_NAME}s', create${PASCAL_CASE_NAME}Routes(db));"
echo "2. Create the database table for ${ENTITY_NAME}s with id, name, description, created_at, updated_at, deleted_at columns"
echo "3. Run tests: yarn test src/features/${FEATURE_NAME}/"