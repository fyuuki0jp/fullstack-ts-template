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

# Create schema file (Drizzle table definition)
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $ENTITY_DIR/schema.ts"
else
    cat > "$ENTITY_DIR/schema.ts" << 'EOF'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const ${ENTITY_NAME}sTable = pgTable('${ENTITY_NAME}s', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
EOF
    # Replace placeholders
    sed -i "s/\${ENTITY_NAME}/${ENTITY_NAME}/g" "$ENTITY_DIR/schema.ts"
fi

# Create entity file
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $ENTITY_DIR/entity.ts"
else
    cat > "$ENTITY_DIR/entity.ts" << 'EOF'
import { z } from 'zod';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import { BaseEntitySchema } from './types';

// ${PASCAL_CASE_NAME} domain branded types
export type ${PASCAL_CASE_NAME}Id = z.infer<typeof ${PASCAL_CASE_NAME}IdSchema>;
export const ${PASCAL_CASE_NAME}IdSchema = z.string().uuid().brand<'${PASCAL_CASE_NAME}Id'>();

export type ${PASCAL_CASE_NAME}Name = z.infer<typeof ${PASCAL_CASE_NAME}NameSchema>;
export const ${PASCAL_CASE_NAME}NameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name must be 100 characters or less')
  .brand<'${PASCAL_CASE_NAME}Name'>();

export type ${PASCAL_CASE_NAME}Description = z.infer<typeof ${PASCAL_CASE_NAME}DescriptionSchema>;
export const ${PASCAL_CASE_NAME}DescriptionSchema = z
  .string()
  .trim()
  .max(500, 'Description must be 500 characters or less')
  .optional()
  .brand<'${PASCAL_CASE_NAME}Description'>();

// ${PASCAL_CASE_NAME} entity schema - extends base entity with domain-specific fields
const _${PASCAL_CASE_NAME}Schema = BaseEntitySchema.extend({
  id: ${PASCAL_CASE_NAME}IdSchema,
  name: ${PASCAL_CASE_NAME}NameSchema,
  description: ${PASCAL_CASE_NAME}DescriptionSchema,
});

export type ${PASCAL_CASE_NAME} = z.infer<typeof _${PASCAL_CASE_NAME}Schema>;

// Input schema for ${ENTITY_NAME} creation (without entity fields)
const _Create${PASCAL_CASE_NAME}InputSchema = z.object({
  name: ${PASCAL_CASE_NAME}NameSchema,
  description: ${PASCAL_CASE_NAME}DescriptionSchema,
});

export type Create${PASCAL_CASE_NAME}Input = z.infer<typeof _Create${PASCAL_CASE_NAME}InputSchema>;

// Input schema for ${ENTITY_NAME} update
const _Update${PASCAL_CASE_NAME}InputSchema = z.object({
  name: ${PASCAL_CASE_NAME}NameSchema.optional(),
  description: ${PASCAL_CASE_NAME}DescriptionSchema.optional(),
});

export type Update${PASCAL_CASE_NAME}Input = z.infer<typeof _Update${PASCAL_CASE_NAME}InputSchema>;

// Export schemas for frontend use
export const ${PASCAL_CASE_NAME}Schema = _${PASCAL_CASE_NAME}Schema;
export const Create${PASCAL_CASE_NAME}InputSchema = _Create${PASCAL_CASE_NAME}InputSchema;
export const Update${PASCAL_CASE_NAME}InputSchema = _Update${PASCAL_CASE_NAME}InputSchema;

// Domain helper functions for validation (minimal export)
export const validate${PASCAL_CASE_NAME} = (data: unknown): Result<${PASCAL_CASE_NAME}, Error> => {
  const result = _${PASCAL_CASE_NAME}Schema.safeParse(data);
  if (!result.success) {
    const errorMessage = result.error.errors
      .map((error) => error.message)
      .join(', ');
    return err(new Error(`${PASCAL_CASE_NAME} validation failed: ${errorMessage}`));
  }
  return ok(result.data);
};

export const validateCreate${PASCAL_CASE_NAME}Input = (
  data: unknown
): Result<Create${PASCAL_CASE_NAME}Input, Error> => {
  const result = _Create${PASCAL_CASE_NAME}InputSchema.safeParse(data);
  if (!result.success) {
    const errorMessage = result.error.errors
      .map((error) => error.message)
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
  const result = _Update${PASCAL_CASE_NAME}InputSchema.safeParse(data);
  if (!result.success) {
    const errorMessage = result.error.errors
      .map((error) => error.message)
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
import { describe, it, expect } from 'vitest';
import { isErr } from '@fyuuki0jp/railway-result';
import {
  type ${PASCAL_CASE_NAME},
  type Create${PASCAL_CASE_NAME}Input,
  type Update${PASCAL_CASE_NAME}Input,
  validate${PASCAL_CASE_NAME},
  validateCreate${PASCAL_CASE_NAME}Input,
  validateUpdate${PASCAL_CASE_NAME}Input,
  create${PASCAL_CASE_NAME}Id,
} from './entity';

describe('${PASCAL_CASE_NAME} Entity', () => {
  describe('validate${PASCAL_CASE_NAME}', () => {
    it('should validate a correct ${ENTITY_NAME}', () => {
      const ${ENTITY_NAME}Data = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test ${PASCAL_CASE_NAME}',
        description: 'A test ${ENTITY_NAME}',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const result = validate${PASCAL_CASE_NAME}(${ENTITY_NAME}Data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('550e8400-e29b-41d4-a716-446655440001');
        expect(result.data.name).toBe('Test ${PASCAL_CASE_NAME}');
        expect(result.data.description).toBe('A test ${ENTITY_NAME}');
        expect(result.data.createdAt).toBeInstanceOf(Date);
        expect(result.data.updatedAt).toBeInstanceOf(Date);
        expect(result.data.deletedAt).toBeNull();
      }
    });

    it('should reject invalid ${ENTITY_NAME} data', () => {
      const invalid${PASCAL_CASE_NAME}Data = {
        id: 'invalid-id',
        name: '',
        description: 'A'.repeat(501), // Too long
      };

      const result = validate${PASCAL_CASE_NAME}(invalid${PASCAL_CASE_NAME}Data);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('${PASCAL_CASE_NAME} validation failed');
      }
    });
  });

  describe('validateCreate${PASCAL_CASE_NAME}Input', () => {
    it('should validate correct create input', () => {
      const input = {
        name: 'New ${PASCAL_CASE_NAME}',
        description: 'A new ${ENTITY_NAME}',
      };

      const result = validateCreate${PASCAL_CASE_NAME}Input(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('New ${PASCAL_CASE_NAME}');
        expect(result.data.description).toBe('A new ${ENTITY_NAME}');
      }
    });

    it('should reject invalid create input', () => {
      const invalidInput = {
        name: '', // Empty name
        description: 'A'.repeat(501), // Too long
      };

      const result = validateCreate${PASCAL_CASE_NAME}Input(invalidInput);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Name is required');
        expect(result.error.message).toContain('500 characters or less');
      }
    });
  });

  describe('validateUpdate${PASCAL_CASE_NAME}Input', () => {
    it('should validate correct update input', () => {
      const input = {
        name: 'Updated ${PASCAL_CASE_NAME}',
      };

      const result = validateUpdate${PASCAL_CASE_NAME}Input(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Updated ${PASCAL_CASE_NAME}');
      }
    });

    it('should validate empty update input', () => {
      const input = {};

      const result = validateUpdate${PASCAL_CASE_NAME}Input(input);

      expect(result.success).toBe(true);
    });

    it('should reject invalid update input', () => {
      const invalidInput = {
        name: '', // Empty name
      };

      const result = validateUpdate${PASCAL_CASE_NAME}Input(invalidInput);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Name is required');
      }
    });
  });

  describe('create${PASCAL_CASE_NAME}Id', () => {
    it('should generate a valid ${PASCAL_CASE_NAME}Id', () => {
      const result = create${PASCAL_CASE_NAME}Id();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data).toBe('string');
        expect(result.data).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      }
    });
  });
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