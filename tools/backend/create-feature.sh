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
import type { ${PASCAL_CASE_NAME}, Create${PASCAL_CASE_NAME}Input, Update${PASCAL_CASE_NAME}Input } from '../../../entities/${ENTITY_NAME}';

export interface ${PASCAL_CASE_NAME}Repository {
  create(input: Create${PASCAL_CASE_NAME}Input): Promise<Result<${PASCAL_CASE_NAME}, Error>>;
  findAll(): Promise<Result<${PASCAL_CASE_NAME}[], Error>>;
  findById(id: string): Promise<Result<${PASCAL_CASE_NAME} | null, Error>>;
  update(id: string, input: Update${PASCAL_CASE_NAME}Input): Promise<Result<${PASCAL_CASE_NAME}, Error>>;
  delete(id: string): Promise<Result<void, Error>>;
}
EOF

# Create repository implementation
create_file "$FEATURE_DIR/domain/${ENTITY_NAME}-repository-impl.ts" "\
import { depend } from 'velona';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { DbAdapter } from '../../../shared/adapters/db';
import type { ${PASCAL_CASE_NAME}Repository } from './repository';
import type { ${PASCAL_CASE_NAME}, Create${PASCAL_CASE_NAME}Input, Update${PASCAL_CASE_NAME}Input } from '../../../entities/${ENTITY_NAME}';

interface DatabaseRow {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const rowToEntity = (row: DatabaseRow): ${PASCAL_CASE_NAME} => ({
  id: row.id,
  name: row.name,
  description: row.description,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

export const ${ENTITY_NAME}RepositoryImpl = depend(
  { db: (undefined as unknown) as DbAdapter },
  ({ db }): ${PASCAL_CASE_NAME}Repository => ({
    async create(input: Create${PASCAL_CASE_NAME}Input): Promise<Result<${PASCAL_CASE_NAME}, Error>> {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const result = await db.execute(
        'INSERT INTO ${ENTITY_NAME}s (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, input.name, input.description, now, now]
      );

      if (!result.success) {
        return err(result.error);
      }

      return ok({
        id,
        ...input,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });
    },

    async findAll(): Promise<Result<${PASCAL_CASE_NAME}[], Error>> {
      const result = await db.query<DatabaseRow>(
        'SELECT * FROM ${ENTITY_NAME}s ORDER BY created_at DESC'
      );

      if (!result.success) {
        return err(result.error);
      }

      return ok(result.data.map(rowToEntity));
    },

    async findById(id: string): Promise<Result<${PASCAL_CASE_NAME} | null, Error>> {
      const result = await db.query<DatabaseRow>(
        'SELECT * FROM ${ENTITY_NAME}s WHERE id = ?',
        [id]
      );

      if (!result.success) {
        return err(result.error);
      }

      if (result.data.length === 0) {
        return ok(null);
      }

      return ok(rowToEntity(result.data[0]));
    },

    async update(id: string, input: Update${PASCAL_CASE_NAME}Input): Promise<Result<${PASCAL_CASE_NAME}, Error>> {
      const findResult = await this.findById(id);
      if (!findResult.success) {
        return err(findResult.error);
      }

      if (!findResult.data) {
        return err(new Error('${PASCAL_CASE_NAME} not found'));
      }

      const updated = {
        ...findResult.data,
        ...input,
        updatedAt: new Date(),
      };

      const result = await db.execute(
        'UPDATE ${ENTITY_NAME}s SET name = ?, description = ?, updated_at = ? WHERE id = ?',
        [updated.name, updated.description, updated.updatedAt.toISOString(), id]
      );

      if (!result.success) {
        return err(result.error);
      }

      return ok(updated);
    },

    async delete(id: string): Promise<Result<void, Error>> {
      return db.execute('DELETE FROM ${ENTITY_NAME}s WHERE id = ?', [id]);
    },
  })
);
EOF

# Create repository implementation test
create_file "$FEATURE_DIR/domain/${ENTITY_NAME}-repository-impl.spec.ts" "\
import { describe, it, expect, beforeEach } from 'vitest';
import { ${ENTITY_NAME}RepositoryImpl } from './${ENTITY_NAME}-repository-impl';
import { MockDbAdapter } from '../../../shared/adapters/db/mock';
import { isErr } from '@fyuuki0jp/railway-result';

describe('${PASCAL_CASE_NAME}RepositoryImpl', () => {
  let mockDb: MockDbAdapter;
  let repository: ReturnType<typeof ${ENTITY_NAME}RepositoryImpl.inject>;

  beforeEach(() => {
    mockDb = new MockDbAdapter();
    repository = ${ENTITY_NAME}RepositoryImpl.inject({ db: mockDb })();
  });

  describe('create', () => {
    it('should create a new ${ENTITY_NAME}', async () => {
      const input = { 
        name: 'Test ${PASCAL_CASE_NAME}',
        description: 'Test description'
      };
      const result = await repository.create(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(input.name);
        expect(result.data.description).toBe(input.description);
        expect(result.data.id).toBeDefined();
        expect(result.data.createdAt).toBeInstanceOf(Date);
        expect(result.data.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should handle database errors', async () => {
      mockDb.mockFailure('Database error');
      const result = await repository.create({ 
        name: 'Test', 
        description: 'Test' 
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Database error');
      }
    });
  });

  describe('findAll', () => {
    it('should return all ${ENTITY_NAME}s', async () => {
      const ${ENTITY_NAME}s = [
        { 
          id: '1', 
          name: 'Test 1', 
          description: 'Desc 1',
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        },
        { 
          id: '2', 
          name: 'Test 2', 
          description: 'Desc 2',
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        },
      ];
      mockDb.setData('${ENTITY_NAME}s', ${ENTITY_NAME}s);

      const result = await repository.findAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].name).toBe('Test 1');
        expect(result.data[0].createdAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('findById', () => {
    it('should return ${ENTITY_NAME} by id', async () => {
      const ${ENTITY_NAME} = { 
        id: '1', 
        name: 'Test', 
        description: 'Description',
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString() 
      };
      mockDb.setData('${ENTITY_NAME}s', [${ENTITY_NAME}]);

      const result = await repository.findById('1');

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.id).toBe('1');
        expect(result.data.name).toBe('Test');
      }
    });

    it('should return null for non-existent id', async () => {
      mockDb.setData('${ENTITY_NAME}s', []);

      const result = await repository.findById('non-existent');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe('update', () => {
    it('should update ${ENTITY_NAME}', async () => {
      const existing = { 
        id: '1', 
        name: 'Old', 
        description: 'Old desc',
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString() 
      };
      mockDb.setData('${ENTITY_NAME}s', [existing]);

      const result = await repository.update('1', { name: 'Updated' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Updated');
        expect(result.data.description).toBe('Old desc');
      }
    });

    it('should return error for non-existent ${ENTITY_NAME}', async () => {
      mockDb.setData('${ENTITY_NAME}s', []);

      const result = await repository.update('non-existent', { name: 'Updated' });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('${PASCAL_CASE_NAME} not found');
      }
    });
  });

  describe('delete', () => {
    it('should delete ${ENTITY_NAME}', async () => {
      const result = await repository.delete('1');

      expect(result.success).toBe(true);
    });
  });
});
EOF

# Create command - create
create_file "$FEATURE_DIR/commands/create-${ENTITY_NAME}.ts" "\
import { depend } from 'velona';
import { err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { ${PASCAL_CASE_NAME}Repository } from '../domain/repository';
import type { ${PASCAL_CASE_NAME}, Create${PASCAL_CASE_NAME}Input } from '../../../entities/${ENTITY_NAME}';

export const create${PASCAL_CASE_NAME} = depend(
  { ${ENTITY_NAME}Repository: (undefined as unknown) as ${PASCAL_CASE_NAME}Repository },
  ({ ${ENTITY_NAME}Repository }) =>
    async (input: Create${PASCAL_CASE_NAME}Input): Promise<Result<${PASCAL_CASE_NAME}, Error>> => {
      // Business validation
      if (!input.name || input.name.trim().length === 0) {
        return err(new Error('Name is required'));
      }

      if (input.name.length > 100) {
        return err(new Error('Name must be less than 100 characters'));
      }

      if (!input.description || input.description.trim().length === 0) {
        return err(new Error('Description is required'));
      }

      if (input.description.length > 500) {
        return err(new Error('Description must be less than 500 characters'));
      }

      return ${ENTITY_NAME}Repository.create(input);
    }
);
EOF

# Create command test
create_file "$FEATURE_DIR/commands/create-${ENTITY_NAME}.spec.ts" "\
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create${PASCAL_CASE_NAME} } from './create-${ENTITY_NAME}';
import { ok, err, isErr } from '@fyuuki0jp/railway-result';
import type { ${PASCAL_CASE_NAME}Repository } from '../domain/repository';

describe('create${PASCAL_CASE_NAME}', () => {
  let mock${PASCAL_CASE_NAME}Repository: ${PASCAL_CASE_NAME}Repository;
  let create${PASCAL_CASE_NAME}Cmd: ReturnType<typeof create${PASCAL_CASE_NAME}.inject>;

  beforeEach(() => {
    mock${PASCAL_CASE_NAME}Repository = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    create${PASCAL_CASE_NAME}Cmd = create${PASCAL_CASE_NAME}.inject({ ${ENTITY_NAME}Repository: mock${PASCAL_CASE_NAME}Repository });
  });

  it('should create a ${ENTITY_NAME} with valid input', async () => {
    const input = { 
      name: 'Test ${PASCAL_CASE_NAME}',
      description: 'Test description'
    };
    const expected = { 
      id: '123', 
      ...input, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    vi.mocked(mock${PASCAL_CASE_NAME}Repository.create).mockResolvedValue(ok(expected));

    const result = await create${PASCAL_CASE_NAME}Cmd()(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expected);
    }
    expect(mock${PASCAL_CASE_NAME}Repository.create).toHaveBeenCalledWith(input);
  });

  it('should validate empty name', async () => {
    const result = await create${PASCAL_CASE_NAME}Cmd()({ 
      name: '', 
      description: 'Valid description' 
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Name is required');
    }
    expect(mock${PASCAL_CASE_NAME}Repository.create).not.toHaveBeenCalled();
  });

  it('should validate name length', async () => {
    const result = await create${PASCAL_CASE_NAME}Cmd()({ 
      name: 'a'.repeat(101),
      description: 'Valid description'
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Name must be less than 100 characters');
    }
    expect(mock${PASCAL_CASE_NAME}Repository.create).not.toHaveBeenCalled();
  });

  it('should validate empty description', async () => {
    const result = await create${PASCAL_CASE_NAME}Cmd()({ 
      name: 'Valid name',
      description: ''
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Description is required');
    }
    expect(mock${PASCAL_CASE_NAME}Repository.create).not.toHaveBeenCalled();
  });

  it('should validate description length', async () => {
    const result = await create${PASCAL_CASE_NAME}Cmd()({ 
      name: 'Valid name',
      description: 'a'.repeat(501)
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Description must be less than 500 characters');
    }
    expect(mock${PASCAL_CASE_NAME}Repository.create).not.toHaveBeenCalled();
  });
});
EOF

# Create command - update
create_file "$FEATURE_DIR/commands/update-${ENTITY_NAME}.ts" "\
import { depend } from 'velona';
import { err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { ${PASCAL_CASE_NAME}Repository } from '../domain/repository';
import type { ${PASCAL_CASE_NAME}, Update${PASCAL_CASE_NAME}Input } from '../../../entities/${ENTITY_NAME}';

export const update${PASCAL_CASE_NAME} = depend(
  { ${ENTITY_NAME}Repository: (undefined as unknown) as ${PASCAL_CASE_NAME}Repository },
  ({ ${ENTITY_NAME}Repository }) =>
    async (id: string, input: Update${PASCAL_CASE_NAME}Input): Promise<Result<${PASCAL_CASE_NAME}, Error>> => {
      // Business validation
      if (input.name !== undefined) {
        if (input.name.trim().length === 0) {
          return err(new Error('Name cannot be empty'));
        }
        if (input.name.length > 100) {
          return err(new Error('Name must be less than 100 characters'));
        }
      }

      if (input.description !== undefined) {
        if (input.description.trim().length === 0) {
          return err(new Error('Description cannot be empty'));
        }
        if (input.description.length > 500) {
          return err(new Error('Description must be less than 500 characters'));
        }
      }

      return ${ENTITY_NAME}Repository.update(id, input);
    }
);
EOF

# Create command - delete
create_file "$FEATURE_DIR/commands/delete-${ENTITY_NAME}.ts" "\
import { depend } from 'velona';
import { err, isErr } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { ${PASCAL_CASE_NAME}Repository } from '../domain/repository';

export const delete${PASCAL_CASE_NAME} = depend(
  { ${ENTITY_NAME}Repository: (undefined as unknown) as ${PASCAL_CASE_NAME}Repository },
  ({ ${ENTITY_NAME}Repository }) =>
    async (id: string): Promise<Result<void, Error>> => {
      // Check if ${ENTITY_NAME} exists
      const findResult = await ${ENTITY_NAME}Repository.findById(id);
      if (isErr(findResult)) {
        return findResult;
      }

      if (!findResult.data) {
        return err(new Error('${PASCAL_CASE_NAME} not found'));
      }

      return ${ENTITY_NAME}Repository.delete(id);
    }
);
EOF

# Create query - get all
create_file "$FEATURE_DIR/queries/get-${ENTITY_NAME}s.ts" "\
import { depend } from 'velona';
import type { Result } from '@fyuuki0jp/railway-result';
import type { ${PASCAL_CASE_NAME}Repository } from '../domain/repository';
import type { ${PASCAL_CASE_NAME} } from '../../../entities/${ENTITY_NAME}';

export const get${PASCAL_CASE_NAME}s = depend(
  { ${ENTITY_NAME}Repository: (undefined as unknown) as ${PASCAL_CASE_NAME}Repository },
  ({ ${ENTITY_NAME}Repository }) =>
    async (): Promise<Result<${PASCAL_CASE_NAME}[], Error>> => {
      return ${ENTITY_NAME}Repository.findAll();
    }
);
EOF

# Create query - get by id
create_file "$FEATURE_DIR/queries/get-${ENTITY_NAME}-by-id.ts" "\
import { depend } from 'velona';
import { err, isErr } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { ${PASCAL_CASE_NAME}Repository } from '../domain/repository';
import type { ${PASCAL_CASE_NAME} } from '../../../entities/${ENTITY_NAME}';

export const get${PASCAL_CASE_NAME}ById = depend(
  { ${ENTITY_NAME}Repository: (undefined as unknown) as ${PASCAL_CASE_NAME}Repository },
  ({ ${ENTITY_NAME}Repository }) =>
    async (id: string): Promise<Result<${PASCAL_CASE_NAME}, Error>> => {
      const result = await ${ENTITY_NAME}Repository.findById(id);
      
      if (isErr(result)) {
        return result;
      }

      if (!result.data) {
        return err(new Error('${PASCAL_CASE_NAME} not found'));
      }

      return result;
    }
);
EOF

# Create query test
create_file "$FEATURE_DIR/queries/get-${ENTITY_NAME}s.spec.ts" "\
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get${PASCAL_CASE_NAME}s } from './get-${ENTITY_NAME}s';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { ${PASCAL_CASE_NAME}Repository } from '../domain/repository';

describe('get${PASCAL_CASE_NAME}s', () => {
  let mock${PASCAL_CASE_NAME}Repository: ${PASCAL_CASE_NAME}Repository;
  let get${PASCAL_CASE_NAME}sQuery: ReturnType<typeof get${PASCAL_CASE_NAME}s.inject>;

  beforeEach(() => {
    mock${PASCAL_CASE_NAME}Repository = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    get${PASCAL_CASE_NAME}sQuery = get${PASCAL_CASE_NAME}s.inject({ ${ENTITY_NAME}Repository: mock${PASCAL_CASE_NAME}Repository });
  });

  it('should return all ${ENTITY_NAME}s', async () => {
    const expected = [
      { 
        id: '1', 
        name: 'Test 1', 
        description: 'Desc 1',
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        id: '2', 
        name: 'Test 2', 
        description: 'Desc 2',
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
    ];
    vi.mocked(mock${PASCAL_CASE_NAME}Repository.findAll).mockResolvedValue(ok(expected));

    const result = await get${PASCAL_CASE_NAME}sQuery()();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expected);
    }
  });

  it('should propagate repository errors', async () => {
    vi.mocked(mock${PASCAL_CASE_NAME}Repository.findAll).mockResolvedValue(err(new Error('Database error')));

    const result = await get${PASCAL_CASE_NAME}sQuery()();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Database error');
    }
  });
});
EOF

# Create API routes
create_file "$FEATURE_DIR/api/routes.ts" "\
import { Hono } from 'hono';
import { isErr } from '@fyuuki0jp/railway-result';
import { create${PASCAL_CASE_NAME} } from '../commands/create-${ENTITY_NAME}';
import { update${PASCAL_CASE_NAME} } from '../commands/update-${ENTITY_NAME}';
import { delete${PASCAL_CASE_NAME} } from '../commands/delete-${ENTITY_NAME}';
import { get${PASCAL_CASE_NAME}s } from '../queries/get-${ENTITY_NAME}s';
import { get${PASCAL_CASE_NAME}ById } from '../queries/get-${ENTITY_NAME}-by-id';
import { ${ENTITY_NAME}RepositoryImpl } from '../domain/${ENTITY_NAME}-repository-impl';
import type { DbAdapter } from '../../../shared/adapters/db';

export default (db: DbAdapter) => {
  return new Hono()
    .get('/', async (c) => {
      const ${ENTITY_NAME}Repository = ${ENTITY_NAME}RepositoryImpl.inject({ db })();
      const get${PASCAL_CASE_NAME}sUseCase = get${PASCAL_CASE_NAME}s.inject({ ${ENTITY_NAME}Repository })();
      
      const result = await get${PASCAL_CASE_NAME}sUseCase();

      if (isErr(result)) {
        return c.json({ error: result.error.message }, 500);
      }

      return c.json({ ${ENTITY_NAME}s: result.data });
    })
    .post('/', async (c) => {
      let body;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
      }

      const ${ENTITY_NAME}Repository = ${ENTITY_NAME}RepositoryImpl.inject({ db })();
      const create${PASCAL_CASE_NAME}UseCase = create${PASCAL_CASE_NAME}.inject({ ${ENTITY_NAME}Repository })();

      const result = await create${PASCAL_CASE_NAME}UseCase(body);

      if (isErr(result)) {
        const statusCode = determineStatusCode(result.error.message);
        return c.json({ error: result.error.message }, statusCode);
      }

      return c.json({ ${ENTITY_NAME}: result.data }, 201);
    })
    .get('/:id', async (c) => {
      const id = c.req.param('id');
      const ${ENTITY_NAME}Repository = ${ENTITY_NAME}RepositoryImpl.inject({ db })();
      const get${PASCAL_CASE_NAME}ByIdUseCase = get${PASCAL_CASE_NAME}ById.inject({ ${ENTITY_NAME}Repository })();
      
      const result = await get${PASCAL_CASE_NAME}ByIdUseCase(id);

      if (isErr(result)) {
        const statusCode = result.error.message.includes('not found') ? 404 : 500;
        return c.json({ error: result.error.message }, statusCode);
      }

      return c.json({ ${ENTITY_NAME}: result.data });
    })
    .put('/:id', async (c) => {
      const id = c.req.param('id');
      let body;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
      }

      const ${ENTITY_NAME}Repository = ${ENTITY_NAME}RepositoryImpl.inject({ db })();
      const update${PASCAL_CASE_NAME}UseCase = update${PASCAL_CASE_NAME}.inject({ ${ENTITY_NAME}Repository })();
      
      const result = await update${PASCAL_CASE_NAME}UseCase(id, body);

      if (isErr(result)) {
        const statusCode = determineStatusCode(result.error.message);
        return c.json({ error: result.error.message }, statusCode);
      }

      return c.json({ ${ENTITY_NAME}: result.data });
    })
    .delete('/:id', async (c) => {
      const id = c.req.param('id');
      const ${ENTITY_NAME}Repository = ${ENTITY_NAME}RepositoryImpl.inject({ db })();
      const delete${PASCAL_CASE_NAME}UseCase = delete${PASCAL_CASE_NAME}.inject({ ${ENTITY_NAME}Repository })();
      
      const result = await delete${PASCAL_CASE_NAME}UseCase(id);

      if (isErr(result)) {
        const statusCode = result.error.message.includes('not found') ? 404 : 500;
        return c.json({ error: result.error.message }, statusCode);
      }

      return c.json({ message: '${PASCAL_CASE_NAME} deleted successfully' });
    });
};

function determineStatusCode(errorMessage: string): number {
  if (
    errorMessage.includes('Database') ||
    errorMessage.includes('UNIQUE constraint') ||
    errorMessage.includes('Execute failed')
  ) {
    return 500;
  }
  if (errorMessage.includes('not found')) {
    return 404;
  }
  return 400;
}
EOF

# Create API routes test
create_file "$FEATURE_DIR/api/routes.spec.ts" "\
import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import create${PASCAL_CASE_NAME}Routes from './routes';
import { MockDbAdapter } from '../../../shared/adapters/db/mock';

describe('${PASCAL_CASE_NAME} API Routes', () => {
  let app: Hono;
  let mockDb: MockDbAdapter;

  beforeEach(() => {
    mockDb = new MockDbAdapter();
    const ${ENTITY_NAME}Routes = create${PASCAL_CASE_NAME}Routes(mockDb);
    app = new Hono();
    app.route('/', ${ENTITY_NAME}Routes);
  });

  describe('GET /', () => {
    it('should return all ${ENTITY_NAME}s', async () => {
      mockDb.setData('${ENTITY_NAME}s', [
        { 
          id: '1', 
          name: 'Test ${PASCAL_CASE_NAME}', 
          description: 'Test description',
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        }
      ]);

      const res = await app.request('/');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.${ENTITY_NAME}s).toHaveLength(1);
      expect(data.${ENTITY_NAME}s[0].name).toBe('Test ${PASCAL_CASE_NAME}');
    });

    it('should handle database errors', async () => {
      mockDb.mockFailure('Database error');
      
      const res = await app.request('/');
      
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /', () => {
    it('should create a new ${ENTITY_NAME}', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: 'New ${PASCAL_CASE_NAME}',
          description: 'New description'
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.${ENTITY_NAME}.name).toBe('New ${PASCAL_CASE_NAME}');
    });

    it('should handle validation errors', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: '',
          description: 'Valid description'
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Name is required');
    });

    it('should handle invalid JSON', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid JSON');
    });
  });

  describe('GET /:id', () => {
    it('should return ${ENTITY_NAME} by id', async () => {
      mockDb.setData('${ENTITY_NAME}s', [
        { 
          id: '1', 
          name: 'Test ${PASCAL_CASE_NAME}', 
          description: 'Test description',
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        }
      ]);

      const res = await app.request('/1');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.${ENTITY_NAME}.id).toBe('1');
    });

    it('should return 404 for non-existent ${ENTITY_NAME}', async () => {
      mockDb.setData('${ENTITY_NAME}s', []);

      const res = await app.request('/non-existent');

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('${PASCAL_CASE_NAME} not found');
    });
  });

  describe('PUT /:id', () => {
    it('should update ${ENTITY_NAME}', async () => {
      mockDb.setData('${ENTITY_NAME}s', [
        { 
          id: '1', 
          name: 'Old Name', 
          description: 'Old description',
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        }
      ]);

      const res = await app.request('/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.${ENTITY_NAME}.name).toBe('Updated Name');
    });

    it('should return 404 for non-existent ${ENTITY_NAME}', async () => {
      mockDb.setData('${ENTITY_NAME}s', []);

      const res = await app.request('/non-existent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /:id', () => {
    it('should delete ${ENTITY_NAME}', async () => {
      mockDb.setData('${ENTITY_NAME}s', [
        { 
          id: '1', 
          name: 'Test', 
          description: 'Test',
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        }
      ]);

      const res = await app.request('/1', { method: 'DELETE' });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe('${PASCAL_CASE_NAME} deleted successfully');
    });

    it('should return 404 for non-existent ${ENTITY_NAME}', async () => {
      mockDb.setData('${ENTITY_NAME}s', []);

      const res = await app.request('/non-existent', { method: 'DELETE' });

      expect(res.status).toBe(404);
    });
  });
});
EOF

if [ "$DRY_RUN" = true ]; then
    echo "✅ DRY RUN completed for backend feature '${FEATURE_NAME}'"
    echo "📁 Would create in: $FEATURE_DIR"
    echo ""
    echo "Would create:"
    echo "  - Repository interface and implementation"
    echo "  - Commands: create, update, delete"
    echo "  - Queries: get all, get by id"
    echo "  - API routes with full CRUD operations"
    echo "  - Complete test suites for all components"
else
    echo "✅ Backend feature '${FEATURE_NAME}' created successfully!"
    echo "📁 Created in: $FEATURE_DIR"
fi
echo ""
echo "Next steps:"
echo "1. Create the database table for ${ENTITY_NAME}s:"
echo "   CREATE TABLE ${ENTITY_NAME}s ("
echo "     id TEXT PRIMARY KEY,"
echo "     name TEXT NOT NULL,"
echo "     description TEXT NOT NULL,"
echo "     created_at TEXT NOT NULL,"
echo "     updated_at TEXT NOT NULL"
echo "   );"
echo ""
echo "2. Add the routes to backend/src/server.ts:"
echo "   import create${PASCAL_CASE_NAME}Routes from './features/${FEATURE_NAME}/api/routes';"
echo "   app.route('/api/${ENTITY_NAME}s', create${PASCAL_CASE_NAME}Routes(db));"
echo ""
echo "3. Run tests: yarn workspace @spa-hono/backend test"