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

// TODO: Define the ${ENTITY_NAME}s table according to your domain requirements
// Add/remove columns as needed for your specific use case
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

// TODO: Define branded types for domain-specific IDs and values
export type ${PASCAL_CASE_NAME}Id = z.infer<typeof ${PASCAL_CASE_NAME}IdSchema>;
export const ${PASCAL_CASE_NAME}IdSchema = z.string().uuid().brand<'${PASCAL_CASE_NAME}Id'>();

// TODO: Add validation schemas for your domain fields
// Example:
// export type ${PASCAL_CASE_NAME}Title = z.infer<typeof ${PASCAL_CASE_NAME}TitleSchema>;
// export const ${PASCAL_CASE_NAME}TitleSchema = z
//   .string()
//   .trim()
//   .min(1, 'Title is required')
//   .max(200, 'Title must be 200 characters or less')
//   .brand<'${PASCAL_CASE_NAME}Title'>();

// TODO: Define select, insert, and update schemas based on your table structure
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
EOF
    # Replace placeholders
    sed -i "s/\${ENTITY_NAME}/${ENTITY_NAME}/g" "$ENTITY_DIR/schema.ts"
    sed -i "s/\${PASCAL_CASE_NAME}/${PASCAL_CASE_NAME}/g" "$ENTITY_DIR/schema.ts"
fi

# Create entity file
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $ENTITY_DIR/entity.ts"
else
    cat > "$ENTITY_DIR/entity.ts" << 'EOF'
import { ok, err, type Result } from 'result';
import {
  ${PASCAL_CASE_NAME}Id,
  ${PASCAL_CASE_NAME}IdSchema,
  ${PASCAL_CASE_NAME},
  Create${PASCAL_CASE_NAME}Input,
  Update${PASCAL_CASE_NAME}Input,
  ${ENTITY_NAME}SelectSchema,
  ${ENTITY_NAME}InsertSchema,
  ${ENTITY_NAME}UpdateSchema,
  // TODO: Import additional domain types from schema as needed
} from './schema';

// Re-export types and schemas from schema
export type {
  ${PASCAL_CASE_NAME}Id,
  ${PASCAL_CASE_NAME},
  Create${PASCAL_CASE_NAME}Input,
  Update${PASCAL_CASE_NAME}Input,
  // TODO: Export additional domain types as needed
};

export {
  ${PASCAL_CASE_NAME}IdSchema,
  ${ENTITY_NAME}SelectSchema as ${PASCAL_CASE_NAME}Schema,
  ${ENTITY_NAME}InsertSchema as Create${PASCAL_CASE_NAME}InputSchema,
  ${ENTITY_NAME}UpdateSchema as Update${PASCAL_CASE_NAME}InputSchema,
  // TODO: Export additional validation schemas as needed
};

// TODO: Implement domain helper functions for validation
export const validate${PASCAL_CASE_NAME} = (data: unknown): Result<${PASCAL_CASE_NAME}, Error> => {
  const result = ${ENTITY_NAME}SelectSchema.safeParse(data);
  if (!result.success) {
    const errorMessage = result.error.issues
      .map((issue) => issue.message)
      .join(', ');
    return err(new Error(`${PASCAL_CASE_NAME} validation failed: ${errorMessage}`));
  }
  return ok(result.data);
};

export const validateCreate${PASCAL_CASE_NAME}Input = (
  data: unknown
): Result<Create${PASCAL_CASE_NAME}Input, Error> => {
  const result = ${ENTITY_NAME}InsertSchema.safeParse(data);
  if (!result.success) {
    const errorMessage = result.error.issues
      .map((issue) => issue.message)
      .join(', ');
    return err(
      new Error(`Create ${PASCAL_CASE_NAME} input validation failed: ${errorMessage}`)
    );
  }
  return ok(result.data);
};

export const validateUpdate${PASCAL_CASE_NAME}Input = (
  data: unknown
): Result<Update${PASCAL_CASE_NAME}Input, Error> => {
  const result = ${ENTITY_NAME}UpdateSchema.safeParse(data);
  if (!result.success) {
    const errorMessage = result.error.issues
      .map((issue) => issue.message)
      .join(', ');
    return err(
      new Error(`Update ${PASCAL_CASE_NAME} input validation failed: ${errorMessage}`)
    );
  }
  return ok(result.data);
};

export const create${PASCAL_CASE_NAME}Id = (): Result<${PASCAL_CASE_NAME}Id, Error> => {
  const result = ${PASCAL_CASE_NAME}IdSchema.safeParse(globalThis.crypto.randomUUID());
  if (!result.success) {
    return err(new Error('Failed to generate ${PASCAL_CASE_NAME}Id'));
  }
  return ok(result.data);
};

// TODO: Add additional domain-specific helper functions as needed
// Examples:
// - Business logic validation
// - Data transformation functions
// - Domain-specific calculations
EOF
    # Replace placeholders
    sed -i "s/\${PASCAL_CASE_NAME}/${PASCAL_CASE_NAME}/g" "$ENTITY_DIR/entity.ts"
    sed -i "s/\${ENTITY_NAME}/${ENTITY_NAME}/g" "$ENTITY_DIR/entity.ts"
fi

# Create entity test file
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $ENTITY_DIR/entity.spec.ts"
    echo ""
else
    cat > "$ENTITY_DIR/entity.spec.ts" << 'EOF'
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isErr } from 'result';
import type { PGlite } from '@electric-sql/pglite';
import { setupTestDatabase } from '@/shared/adapters/db/pglite';
import type { DrizzleDb } from '@/shared/adapters/db';
import { ${ENTITY_NAME}sTable } from './schema';
import {
  type ${PASCAL_CASE_NAME},
  type Create${PASCAL_CASE_NAME}Input,
  type Update${PASCAL_CASE_NAME}Input,
  validate${PASCAL_CASE_NAME},
  validateCreate${PASCAL_CASE_NAME}Input,
  validateUpdate${PASCAL_CASE_NAME}Input,
  create${PASCAL_CASE_NAME}Id,
} from './entity';

// TODO: For comprehensive test coverage using decision tables:
// 1. Create decision tables using MCP tools for different scenarios
// 2. Generate test cases from decision tables using mcp__testing-mcp__generate_tests
// 3. Add the generated tests to this file

describe('${PASCAL_CASE_NAME} Entity', () => {
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

  describe('validate${PASCAL_CASE_NAME}', () => {
    // TODO: Add test cases based on your domain schema
    it('should validate a correct ${ENTITY_NAME}', () => {
      const ${ENTITY_NAME}Data = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        // TODO: Add your domain fields here based on schema
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const result = validate${PASCAL_CASE_NAME}(${ENTITY_NAME}Data);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('550e8400-e29b-41d4-a716-446655440001');
        // TODO: Add assertions for your domain fields
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
        expect(result.value.deletedAt).toBeNull();
      }
    });

    it('should reject invalid ${ENTITY_NAME} data', () => {
      const invalid${PASCAL_CASE_NAME}Data = {
        id: 'invalid-id',
        // TODO: Add invalid domain field values
      };

      const result = validate${PASCAL_CASE_NAME}(invalid${ENTITY_NAME}Data);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('${PASCAL_CASE_NAME} validation failed');
      }
    });
  });

  describe('validateCreate${PASCAL_CASE_NAME}Input', () => {
    // TODO: Add test cases for create input validation
    // Consider using MCP decision tables for comprehensive test coverage

    it('should validate correct create input', () => {
      const input = {
        // TODO: Add required fields for creating ${ENTITY_NAME}
      };

      const result = validateCreate${PASCAL_CASE_NAME}Input(input);

      expect(result.ok).toBe(true);
      // TODO: Add assertions for your domain fields
    });

    it('should reject invalid create input', () => {
      const invalidInput = {
        // TODO: Add invalid field values
      };

      const result = validateCreate${PASCAL_CASE_NAME}Input(invalidInput);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        // TODO: Add specific error message checks
        expect(result.error.message).toContain('validation failed');
      }
    });
  });

  describe('validateUpdate${PASCAL_CASE_NAME}Input', () => {
    // TODO: Add test cases for update input validation

    it('should validate correct update input', () => {
      const input = {
        // TODO: Add fields to update
      };

      const result = validateUpdate${PASCAL_CASE_NAME}Input(input);

      expect(result.ok).toBe(true);
    });

    it('should validate empty update input', () => {
      const input = {};

      const result = validateUpdate${PASCAL_CASE_NAME}Input(input);

      expect(result.ok).toBe(true);
    });
  });

  describe('create${PASCAL_CASE_NAME}Id', () => {
    it('should generate a valid ${PASCAL_CASE_NAME}Id', () => {
      const result = create${PASCAL_CASE_NAME}Id();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.value).toBe('string');
        expect(result.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      }
    });
  });

  // TODO: Add domain repository tests here
  describe('${PASCAL_CASE_NAME} Repository Operations', () => {
    // Example test structure for when you implement repository operations
    it.skip('should create a new ${ENTITY_NAME} in database', async () => {
      // TODO: Implement when you add repository operations
      // const input: Create${PASCAL_CASE_NAME}Input = {
      //   // Add fields
      // };
      // const result = await create${PASCAL_CASE_NAME}(db, input);
      // expect(result.ok).toBe(true);
    });

    it.skip('should update an existing ${ENTITY_NAME}', async () => {
      // TODO: Implement when you add repository operations
    });

    it.skip('should delete a ${ENTITY_NAME}', async () => {
      // TODO: Implement when you add repository operations
    });
  });

  // TODO: Add decision table-based tests here
  // Example workflow:
  // 1. Use mcp__testing-mcp__create_decision_table to create test scenarios
  // 2. Use mcp__testing-mcp__generate_tests to generate test code
  // 3. Copy generated tests into appropriate describe blocks above
});
EOF
    # Replace placeholders
    sed -i "s/\${PASCAL_CASE_NAME}/${PASCAL_CASE_NAME}/g" "$ENTITY_DIR/entity.spec.ts"
    sed -i "s/\${ENTITY_NAME}/${ENTITY_NAME}/g" "$ENTITY_DIR/entity.spec.ts"
fi

# Create index file for entity
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $ENTITY_DIR/index.ts"
else
    cat > "$ENTITY_DIR/index.ts" << EOF
export * from './entity';
export * from './schema';
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
    echo "   - $ENTITY_DIR/schema.ts (Drizzle table definition)"
    echo "   - $ENTITY_DIR/entity.ts (Entity with validation)"
    echo "   - $ENTITY_DIR/entity.spec.ts"
    echo "   - $ENTITY_DIR/index.ts"
    echo "   - Update $ENTITIES_INDEX"
else
    echo "✅ Backend entity '${PASCAL_CASE_NAME}' created successfully!"
    echo "📁 Created files:"
    echo "   - $ENTITY_DIR/schema.ts (Drizzle table definition)"
    echo "   - $ENTITY_DIR/entity.ts (Entity with validation)"
    echo "   - $ENTITY_DIR/entity.spec.ts"
    echo "   - $ENTITY_DIR/index.ts"
fi
echo ""
echo "Next steps:"
echo "1. Update the table schema in schema.ts according to your domain"
echo "2. Update the entity fields and validation in entity.ts" 
echo "3. Run 'yarn drizzle:generate' to create migration files"
echo "4. Run 'yarn drizzle:migrate' to apply migrations"
echo "5. Create a feature that uses this entity: ./tools/backend/create-feature.sh ${ENTITY_NAME}"