#!/bin/bash

# Backend Entity Boilerplate Generator
# Usage: ./create-entity.sh <entity-name> [--dry-run]

ENTITY_NAME=$1
DRY_RUN=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
    esac
done

if [ -z "$ENTITY_NAME" ] || [ "$ENTITY_NAME" = "--dry-run" ]; then
    echo "Usage: $0 <entity-name> [--dry-run]"
    echo "Example: $0 product"
    echo "Example: $0 product --dry-run"
    exit 1
fi

# Convert entity name to PascalCase
PASCAL_CASE_NAME=$(echo "$ENTITY_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')

# Create entity directory
ENTITY_DIR="backend/src/entities/${ENTITY_NAME}"

if [ "$DRY_RUN" = true ]; then
    echo "🔍 DRY RUN MODE - No files will be created"
    echo ""
    echo "Would create directory: $ENTITY_DIR"
else
    mkdir -p "$ENTITY_DIR"
fi

# Create schema file (Drizzle table definition with Zod schemas)
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $ENTITY_DIR/schema.ts"
else
    cat > "$ENTITY_DIR/schema.ts" << 'EOF'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { ok, err, type Result } from 'result';

// Database table definition
export const ${ENTITY_NAME}sTable = pgTable('${ENTITY_NAME}s', {
  id: uuid('id').primaryKey().defaultRandom(),
  // TODO: Add your domain-specific fields here
  // Example: title: text('title').notNull(),
  // Example: description: text('description'),
  // Example: status: text('status').default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Branded types for domain-specific IDs and values
export type ${PASCAL_CASE_NAME}Id = z.infer<typeof ${PASCAL_CASE_NAME}IdSchema>;
export const ${PASCAL_CASE_NAME}IdSchema = z.string().uuid().brand<'${PASCAL_CASE_NAME}Id'>();

// TODO: Define additional branded types for your domain
// Example:
// export type ${PASCAL_CASE_NAME}Title = z.infer<typeof ${PASCAL_CASE_NAME}TitleSchema>;
// export const ${PASCAL_CASE_NAME}TitleSchema = z
//   .string()
//   .trim()
//   .min(1, 'Title is required')
//   .max(200, 'Title must be 200 characters or less')
//   .brand<'${PASCAL_CASE_NAME}Title'>();

// Data validation schemas (for DB consistency only)
export const ${ENTITY_NAME}SelectSchema = z.object({
  id: ${PASCAL_CASE_NAME}IdSchema,
  // TODO: Add your domain fields with proper validation
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const ${ENTITY_NAME}InsertSchema = z.object({
  // TODO: Define required fields for creating new ${ENTITY_NAME}
  // Example: title: ${PASCAL_CASE_NAME}TitleSchema,
});

export const ${ENTITY_NAME}UpdateSchema = ${ENTITY_NAME}InsertSchema.partial();

// Export types derived from schemas
export type ${PASCAL_CASE_NAME} = z.infer<typeof ${ENTITY_NAME}SelectSchema>;
export type Create${PASCAL_CASE_NAME}Input = z.infer<typeof ${ENTITY_NAME}InsertSchema>;
export type Update${PASCAL_CASE_NAME}Input = z.infer<typeof ${ENTITY_NAME}UpdateSchema>;

// Drizzle type inference for compatibility
export type ${PASCAL_CASE_NAME}SelectType = typeof ${ENTITY_NAME}sTable.$inferSelect;
export type ${PASCAL_CASE_NAME}InsertType = typeof ${ENTITY_NAME}sTable.$inferInsert;

// ID generation helper
export const create${PASCAL_CASE_NAME}Id = (): Result<${PASCAL_CASE_NAME}Id, Error> => {
  const result = ${PASCAL_CASE_NAME}IdSchema.safeParse(globalThis.crypto.randomUUID());
  if (!result.success) {
    return err(new Error('Failed to generate ${PASCAL_CASE_NAME}Id'));
  }
  return ok(result.data);
};

// Data validation helpers (DB consistency only - no business rules)
export const validate${PASCAL_CASE_NAME}Data = (data: unknown): Result<${PASCAL_CASE_NAME}, Error> => {
  const result = ${ENTITY_NAME}SelectSchema.safeParse(data);
  if (!result.success) {
    return err(new Error('Invalid ${ENTITY_NAME} data format'));
  }
  return ok(result.data);
};

export const validate${PASCAL_CASE_NAME}InsertData = (
  data: unknown
): Result<Create${PASCAL_CASE_NAME}Input, Error> => {
  const result = ${ENTITY_NAME}InsertSchema.safeParse(data);
  if (!result.success) {
    return err(new Error('Invalid ${ENTITY_NAME} insert data format'));
  }
  return ok(result.data);
};

export const validate${PASCAL_CASE_NAME}UpdateData = (
  data: unknown
): Result<Update${PASCAL_CASE_NAME}Input, Error> => {
  const result = ${ENTITY_NAME}UpdateSchema.safeParse(data);
  if (!result.success) {
    return err(new Error('Invalid ${ENTITY_NAME} update data format'));
  }
  return ok(result.data);
};
EOF
    # Replace placeholders
    sed -i "s/\${ENTITY_NAME}/${ENTITY_NAME}/g" "$ENTITY_DIR/schema.ts"
    sed -i "s/\${PASCAL_CASE_NAME}/${PASCAL_CASE_NAME}/g" "$ENTITY_DIR/schema.ts"
fi

# Create repository file
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $ENTITY_DIR/repository.ts"
else
    cat > "$ENTITY_DIR/repository.ts" << 'EOF'
import { depend } from 'velona';
import { eq, isNull, and } from 'drizzle-orm';
import { ok, err, isErr, type Result } from 'result';
import {
  ${ENTITY_NAME}sTable,
  validate${PASCAL_CASE_NAME}Data,
  create${PASCAL_CASE_NAME}Id,
  type ${PASCAL_CASE_NAME},
  type Create${PASCAL_CASE_NAME}Input,
  type Update${PASCAL_CASE_NAME}Input,
  type ${PASCAL_CASE_NAME}Id,
} from './schema';
import type { DrizzleDb } from '@/shared/adapters/db/pglite';

// Pure CRUD operations (no business logic)
export const insert${PASCAL_CASE_NAME} = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (data: Create${PASCAL_CASE_NAME}Input): Promise<Result<${PASCAL_CASE_NAME}, Error>> => {
      try {
        const idResult = create${PASCAL_CASE_NAME}Id();
        if (isErr(idResult)) {
          return idResult;
        }
        const id = idResult.value;
        const now = new Date();

        const [db${PASCAL_CASE_NAME}] = await db
          .insert(${ENTITY_NAME}sTable)
          .values({
            id,
            ...data,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          })
          .returning();

        // Validate returned data structure
        const ${ENTITY_NAME}Result = validate${PASCAL_CASE_NAME}Data({
          id: db${PASCAL_CASE_NAME}.id,
          // TODO: Add your domain fields here
          createdAt: db${PASCAL_CASE_NAME}.createdAt,
          updatedAt: db${PASCAL_CASE_NAME}.updatedAt,
          deletedAt: db${PASCAL_CASE_NAME}.deletedAt,
        });

        if (isErr(${ENTITY_NAME}Result)) {
          return err(new Error('Invalid ${ENTITY_NAME} data returned from database'));
        }

        return ok(${ENTITY_NAME}Result.value);
      } catch (error) {
        if (error instanceof Error) {
          return err(error);
        }
        return err(new Error('Database error occurred'));
      }
    }
);

export const select${PASCAL_CASE_NAME}ById = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (id: ${PASCAL_CASE_NAME}Id): Promise<Result<${PASCAL_CASE_NAME} | null, Error>> => {
      try {
        const [db${PASCAL_CASE_NAME}] = await db
          .select()
          .from(${ENTITY_NAME}sTable)
          .where(and(eq(${ENTITY_NAME}sTable.id, id), isNull(${ENTITY_NAME}sTable.deletedAt)))
          .limit(1);

        if (!db${PASCAL_CASE_NAME}) {
          return ok(null);
        }

        const ${ENTITY_NAME}Result = validate${PASCAL_CASE_NAME}Data({
          id: db${PASCAL_CASE_NAME}.id,
          // TODO: Add your domain fields here
          createdAt: db${PASCAL_CASE_NAME}.createdAt,
          updatedAt: db${PASCAL_CASE_NAME}.updatedAt,
          deletedAt: db${PASCAL_CASE_NAME}.deletedAt,
        });

        if (isErr(${ENTITY_NAME}Result)) {
          return err(new Error('Invalid ${ENTITY_NAME} data from database'));
        }

        return ok(${ENTITY_NAME}Result.value);
      } catch (error) {
        if (error instanceof Error) {
          return err(error);
        }
        return err(new Error('Database error occurred'));
      }
    }
);

export const selectActive${PASCAL_CASE_NAME}s = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (): Promise<Result<${PASCAL_CASE_NAME}[], Error>> => {
      try {
        const db${PASCAL_CASE_NAME}s = await db
          .select()
          .from(${ENTITY_NAME}sTable)
          .where(isNull(${ENTITY_NAME}sTable.deletedAt))
          .orderBy(${ENTITY_NAME}sTable.createdAt, ${ENTITY_NAME}sTable.id);

        const ${ENTITY_NAME}s: ${PASCAL_CASE_NAME}[] = [];
        for (const db${PASCAL_CASE_NAME} of db${PASCAL_CASE_NAME}s) {
          const ${ENTITY_NAME}Result = validate${PASCAL_CASE_NAME}Data({
            id: db${PASCAL_CASE_NAME}.id,
            // TODO: Add your domain fields here
            createdAt: db${PASCAL_CASE_NAME}.createdAt,
            updatedAt: db${PASCAL_CASE_NAME}.updatedAt,
            deletedAt: db${PASCAL_CASE_NAME}.deletedAt,
          });

          if (isErr(${ENTITY_NAME}Result)) {
            return err(
              new Error(`Invalid ${ENTITY_NAME} data from database for id: ${db${PASCAL_CASE_NAME}.id}`)
            );
          }

          ${ENTITY_NAME}s.push(${ENTITY_NAME}Result.value);
        }

        return ok(${ENTITY_NAME}s);
      } catch (error) {
        if (error instanceof Error) {
          return err(error);
        }
        return err(new Error('Database error occurred'));
      }
    }
);

export const update${PASCAL_CASE_NAME} = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (
      id: ${PASCAL_CASE_NAME}Id,
      data: Update${PASCAL_CASE_NAME}Input
    ): Promise<Result<${PASCAL_CASE_NAME} | null, Error>> => {
      try {
        const [db${PASCAL_CASE_NAME}] = await db
          .update(${ENTITY_NAME}sTable)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(and(eq(${ENTITY_NAME}sTable.id, id), isNull(${ENTITY_NAME}sTable.deletedAt)))
          .returning();

        if (!db${PASCAL_CASE_NAME}) {
          return ok(null);
        }

        const ${ENTITY_NAME}Result = validate${PASCAL_CASE_NAME}Data({
          id: db${PASCAL_CASE_NAME}.id,
          // TODO: Add your domain fields here
          createdAt: db${PASCAL_CASE_NAME}.createdAt,
          updatedAt: db${PASCAL_CASE_NAME}.updatedAt,
          deletedAt: db${PASCAL_CASE_NAME}.deletedAt,
        });

        if (isErr(${ENTITY_NAME}Result)) {
          return err(new Error('Invalid ${ENTITY_NAME} data returned from database'));
        }

        return ok(${ENTITY_NAME}Result.value);
      } catch (error) {
        if (error instanceof Error) {
          return err(error);
        }
        return err(new Error('Database error occurred'));
      }
    }
);

export const delete${PASCAL_CASE_NAME} = depend(
  { db: {} as DrizzleDb },
  ({ db }) =>
    async (id: ${PASCAL_CASE_NAME}Id): Promise<Result<boolean, Error>> => {
      try {
        const result = await db
          .update(${ENTITY_NAME}sTable)
          .set({ deletedAt: new Date() })
          .where(and(eq(${ENTITY_NAME}sTable.id, id), isNull(${ENTITY_NAME}sTable.deletedAt)))
          .returning({ id: ${ENTITY_NAME}sTable.id });

        return ok(result.length > 0);
      } catch (error) {
        if (error instanceof Error) {
          return err(error);
        }
        return err(new Error('Database error occurred'));
      }
    }
);
EOF
    # Replace placeholders
    sed -i "s/\${PASCAL_CASE_NAME}/${PASCAL_CASE_NAME}/g" "$ENTITY_DIR/repository.ts"
    sed -i "s/\${ENTITY_NAME}/${ENTITY_NAME}/g" "$ENTITY_DIR/repository.ts"
fi

# Create repository test file
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $ENTITY_DIR/repository.spec.ts"
    echo ""
else
    cat > "$ENTITY_DIR/repository.spec.ts" << 'EOF'
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { setupTestDatabase } from '../../shared/adapters/db/pglite';
import type { DrizzleDb } from '../../shared/adapters/db/pglite';
import {
  insert${PASCAL_CASE_NAME},
  select${PASCAL_CASE_NAME}ById,
  selectActive${PASCAL_CASE_NAME}s,
  update${PASCAL_CASE_NAME},
  delete${PASCAL_CASE_NAME},
} from './repository';
import type { Create${PASCAL_CASE_NAME}Input, Update${PASCAL_CASE_NAME}Input } from './schema';
// TODO: Import your branded types for testing
// import { ${PASCAL_CASE_NAME}TitleSchema } from './schema';

describe('${PASCAL_CASE_NAME} Repository', () => {
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

  describe('insert${PASCAL_CASE_NAME}', () => {
    it('should insert a new ${ENTITY_NAME}', async () => {
      const input: Create${PASCAL_CASE_NAME}Input = {
        // TODO: Add your domain fields here
        // Example: title: ${PASCAL_CASE_NAME}TitleSchema.parse('Test Title'),
      };

      const insert${PASCAL_CASE_NAME}Fn = insert${PASCAL_CASE_NAME}.inject({ db })();
      const result = await insert${PASCAL_CASE_NAME}Fn(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBeDefined();
        // TODO: Add assertions for your domain fields
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
        expect(result.value.deletedAt).toBeNull();
      }
    });

    it('should handle database errors gracefully', async () => {
      // TODO: Add test for database constraint violations or other errors
      // Example: duplicate key violation, foreign key constraint, etc.
    });
  });

  describe('select${PASCAL_CASE_NAME}ById', () => {
    it('should return ${ENTITY_NAME} when found', async () => {
      // First, create a ${ENTITY_NAME}
      const input: Create${PASCAL_CASE_NAME}Input = {
        // TODO: Add your domain fields here
      };

      const insert${PASCAL_CASE_NAME}Fn = insert${PASCAL_CASE_NAME}.inject({ db })();
      const insertResult = await insert${PASCAL_CASE_NAME}Fn(input);
      expect(insertResult.ok).toBe(true);

      if (insertResult.ok) {
        const select${PASCAL_CASE_NAME}ByIdFn = select${PASCAL_CASE_NAME}ById.inject({ db })();
        const selectResult = await select${PASCAL_CASE_NAME}ByIdFn(insertResult.value.id);

        expect(selectResult.ok).toBe(true);
        if (selectResult.ok) {
          expect(selectResult.value).not.toBeNull();
          expect(selectResult.value?.id).toBe(insertResult.value.id);
        }
      }
    });

    it('should return null when ${ENTITY_NAME} not found', async () => {
      const { create${PASCAL_CASE_NAME}Id } = await import('./schema');
      const idResult = create${PASCAL_CASE_NAME}Id();
      expect(idResult.ok).toBe(true);
      if (!idResult.ok) return;

      const select${PASCAL_CASE_NAME}ByIdFn = select${PASCAL_CASE_NAME}ById.inject({ db })();
      const result = await select${PASCAL_CASE_NAME}ByIdFn(idResult.value);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('selectActive${PASCAL_CASE_NAME}s', () => {
    it('should return all active ${ENTITY_NAME}s', async () => {
      const selectActive${PASCAL_CASE_NAME}sFn = selectActive${PASCAL_CASE_NAME}s.inject({ db })();
      const result = await selectActive${PASCAL_CASE_NAME}sFn();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value)).toBe(true);
        // All returned ${ENTITY_NAME}s should have deletedAt as null
        result.value.forEach(${ENTITY_NAME} => {
          expect(${ENTITY_NAME}.deletedAt).toBeNull();
        });
      }
    });
  });

  describe('update${PASCAL_CASE_NAME}', () => {
    it('should update existing ${ENTITY_NAME}', async () => {
      // First, create a ${ENTITY_NAME}
      const input: Create${PASCAL_CASE_NAME}Input = {
        // TODO: Add your domain fields here
      };

      const insert${PASCAL_CASE_NAME}Fn = insert${PASCAL_CASE_NAME}.inject({ db })();
      const insertResult = await insert${PASCAL_CASE_NAME}Fn(input);
      expect(insertResult.ok).toBe(true);

      if (insertResult.ok) {
        const updateData: Update${PASCAL_CASE_NAME}Input = {
          // TODO: Add fields to update
        };

        const update${PASCAL_CASE_NAME}Fn = update${PASCAL_CASE_NAME}.inject({ db })();
        const updateResult = await update${PASCAL_CASE_NAME}Fn(insertResult.value.id, updateData);

        expect(updateResult.ok).toBe(true);
        if (updateResult.ok && updateResult.value) {
          expect(updateResult.value.id).toBe(insertResult.value.id);
          // TODO: Add assertions for updated fields
          expect(updateResult.value.updatedAt.getTime()).toBeGreaterThan(
            insertResult.value.updatedAt.getTime()
          );
        }
      }
    });

    it('should return null when updating non-existent ${ENTITY_NAME}', async () => {
      const { create${PASCAL_CASE_NAME}Id } = await import('./schema');
      const idResult = create${PASCAL_CASE_NAME}Id();
      expect(idResult.ok).toBe(true);
      if (!idResult.ok) return;

      const updateData: Update${PASCAL_CASE_NAME}Input = {
        // TODO: Add fields to update
      };

      const update${PASCAL_CASE_NAME}Fn = update${PASCAL_CASE_NAME}.inject({ db })();
      const result = await update${PASCAL_CASE_NAME}Fn(idResult.value, updateData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('delete${PASCAL_CASE_NAME}', () => {
    it('should soft delete existing ${ENTITY_NAME}', async () => {
      // First, create a ${ENTITY_NAME}
      const input: Create${PASCAL_CASE_NAME}Input = {
        // TODO: Add your domain fields here
      };

      const insert${PASCAL_CASE_NAME}Fn = insert${PASCAL_CASE_NAME}.inject({ db })();
      const insertResult = await insert${PASCAL_CASE_NAME}Fn(input);
      expect(insertResult.ok).toBe(true);

      if (insertResult.ok) {
        const delete${PASCAL_CASE_NAME}Fn = delete${PASCAL_CASE_NAME}.inject({ db })();
        const deleteResult = await delete${PASCAL_CASE_NAME}Fn(insertResult.value.id);

        expect(deleteResult.ok).toBe(true);
        if (deleteResult.ok) {
          expect(deleteResult.value).toBe(true);
        }

        // Verify the ${ENTITY_NAME} is not returned by selectActive
        const select${PASCAL_CASE_NAME}ByIdFn = select${PASCAL_CASE_NAME}ById.inject({ db })();
        const selectResult = await select${PASCAL_CASE_NAME}ByIdFn(insertResult.value.id);
        expect(selectResult.ok).toBe(true);
        if (selectResult.ok) {
          expect(selectResult.value).toBeNull();
        }
      }
    });

    it('should return false when deleting non-existent ${ENTITY_NAME}', async () => {
      const { create${PASCAL_CASE_NAME}Id } = await import('./schema');
      const idResult = create${PASCAL_CASE_NAME}Id();
      expect(idResult.ok).toBe(true);
      if (!idResult.ok) return;

      const delete${PASCAL_CASE_NAME}Fn = delete${PASCAL_CASE_NAME}.inject({ db })();
      const result = await delete${PASCAL_CASE_NAME}Fn(idResult.value);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });
  });
});
EOF
    # Replace placeholders
    sed -i "s/\${PASCAL_CASE_NAME}/${PASCAL_CASE_NAME}/g" "$ENTITY_DIR/repository.spec.ts"
    sed -i "s/\${ENTITY_NAME}/${ENTITY_NAME}/g" "$ENTITY_DIR/repository.spec.ts"
fi

# Create index file for entity
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $ENTITY_DIR/index.ts"
else
    cat > "$ENTITY_DIR/index.ts" << EOF
export * from './schema';
export * from './repository';
EOF
fi

# Update entities main index file to export the new entity
ENTITIES_INDEX="backend/src/entities/index.ts"
if [ "$DRY_RUN" = true ]; then
    if [ -f "$ENTITIES_INDEX" ]; then
        echo "Would append to file: $ENTITIES_INDEX"
        echo "Would add: export * from './${ENTITY_NAME}';"
    else
        echo "Would create file: $ENTITIES_INDEX"
    fi
    echo ""
else
    if [ -f "$ENTITIES_INDEX" ]; then
        echo "export * from './${ENTITY_NAME}';" >> "$ENTITIES_INDEX"
    else
        cat > "$ENTITIES_INDEX" << EOF
export * from './types';
export * from './${ENTITY_NAME}';
EOF
    fi
fi

if [ "$DRY_RUN" = true ]; then
    echo "✅ DRY RUN completed for backend entity '${PASCAL_CASE_NAME}'"
    echo "📁 Would create files:"
    echo "   - $ENTITY_DIR/schema.ts (Table definition, types, validation)"
    echo "   - $ENTITY_DIR/repository.ts (CRUD operations with Railway Result)"
    echo "   - $ENTITY_DIR/repository.spec.ts (Repository tests)"
    echo "   - $ENTITY_DIR/index.ts"
    echo "   - Update $ENTITIES_INDEX"
else
    echo "✅ Backend entity '${PASCAL_CASE_NAME}' created successfully!"
    echo "📁 Created files:"
    echo "   - $ENTITY_DIR/schema.ts (Table definition, types, validation)"
    echo "   - $ENTITY_DIR/repository.ts (CRUD operations with Railway Result)"
    echo "   - $ENTITY_DIR/repository.spec.ts (Repository tests)"
    echo "   - $ENTITY_DIR/index.ts"
fi
echo ""
echo "Next steps for TDD development:"
echo "1. 🔴 RED: Update schema.ts with your domain fields and run failing tests"
echo "   - Add branded types for domain-specific validations"
echo "   - Update test cases in repository.spec.ts with actual field values"
echo "2. 🟢 GREEN: Make tests pass by implementing minimal changes"
echo "   - Run: yarn workspace backend test src/entities/${ENTITY_NAME}/"
echo "3. 🔵 BLUE: Refactor while keeping tests green"
echo "4. Generate comprehensive test cases using MCP tools:"
echo "   - Create decision tables: mcp__testing-mcp__create_decision_table"
echo "   - Generate additional tests: mcp__testing-mcp__generate_tests"
echo "5. Create a feature that uses this entity: ./tools/backend/create-feature.sh ${ENTITY_NAME}-management ${ENTITY_NAME}"
echo "6. Run 'yarn drizzle:generate' to create migration files (migrations auto-apply on startup)"