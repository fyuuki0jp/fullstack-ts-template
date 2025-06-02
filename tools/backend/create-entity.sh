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
ENTITY_DIR="backend/src/entities"

if [ "$DRY_RUN" = true ]; then
    echo "🔍 DRY RUN MODE - No files will be created"
    echo ""
    echo "Would create directory: $ENTITY_DIR"
else
    mkdir -p "$ENTITY_DIR"
fi

# Create entity file
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $ENTITY_DIR/${ENTITY_NAME}.ts"
else
    cat > "$ENTITY_DIR/${ENTITY_NAME}.ts" << 'EOF'
import type { Entity } from './types';

export interface ${PASCAL_CASE_NAME} extends Entity {
  name: string;
  description: string;
  // Add more fields as needed
}

export interface Create${PASCAL_CASE_NAME}Input {
  name: string;
  description: string;
  // Add more fields as needed
}

export interface Update${PASCAL_CASE_NAME}Input {
  name?: string;
  description?: string;
  // Add more fields as needed
}
EOF
    # Replace placeholders
    sed -i "s/\${PASCAL_CASE_NAME}/${PASCAL_CASE_NAME}/g" "$ENTITY_DIR/${ENTITY_NAME}.ts"
fi

# Create entity test file
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $ENTITY_DIR/${ENTITY_NAME}.spec.ts"
    echo ""
else
    cat > "$ENTITY_DIR/${ENTITY_NAME}.spec.ts" << 'EOF'
import { describe, it, expect } from 'vitest';
import type { ${PASCAL_CASE_NAME}, Create${PASCAL_CASE_NAME}Input, Update${PASCAL_CASE_NAME}Input } from './${ENTITY_NAME}';

describe('${PASCAL_CASE_NAME} Entity', () => {
  it('should have proper structure for ${PASCAL_CASE_NAME}', () => {
    const ${ENTITY_NAME}: ${PASCAL_CASE_NAME} = {
      id: '123',
      name: 'Test ${PASCAL_CASE_NAME}',
      description: 'A test ${ENTITY_NAME}',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(${ENTITY_NAME}.id).toBeDefined();
    expect(${ENTITY_NAME}.name).toBeDefined();
    expect(${ENTITY_NAME}.description).toBeDefined();
    expect(${ENTITY_NAME}.createdAt).toBeInstanceOf(Date);
    expect(${ENTITY_NAME}.updatedAt).toBeInstanceOf(Date);
  });

  it('should have proper structure for Create${PASCAL_CASE_NAME}Input', () => {
    const input: Create${PASCAL_CASE_NAME}Input = {
      name: 'New ${PASCAL_CASE_NAME}',
      description: 'A new ${ENTITY_NAME}',
    };

    expect(input.name).toBeDefined();
    expect(input.description).toBeDefined();
  });

  it('should have proper structure for Update${PASCAL_CASE_NAME}Input', () => {
    const input: Update${PASCAL_CASE_NAME}Input = {
      name: 'Updated ${PASCAL_CASE_NAME}',
    };

    expect(input.name).toBeDefined();
  });
});
EOF
    # Replace placeholders
    sed -i "s/\${PASCAL_CASE_NAME}/${PASCAL_CASE_NAME}/g" "$ENTITY_DIR/${ENTITY_NAME}.spec.ts"
    sed -i "s/\${ENTITY_NAME}/${ENTITY_NAME}/g" "$ENTITY_DIR/${ENTITY_NAME}.spec.ts"
fi

# Update entities index file to export the new entity
if [ "$DRY_RUN" = true ]; then
    if [ -f "$ENTITY_DIR/index.ts" ]; then
        echo "Would append to file: $ENTITY_DIR/index.ts"
        echo "Would add: export * from './${ENTITY_NAME}';"
    else
        echo "Would create file: $ENTITY_DIR/index.ts"
    fi
    echo ""
else
    if [ -f "$ENTITY_DIR/index.ts" ]; then
        echo "export * from './${ENTITY_NAME}';" >> "$ENTITY_DIR/index.ts"
    else
        cat > "$ENTITY_DIR/index.ts" << EOF
export * from './types';
export * from './${ENTITY_NAME}';
EOF
    fi
fi

if [ "$DRY_RUN" = true ]; then
    echo "✅ DRY RUN completed for backend entity '${PASCAL_CASE_NAME}'"
    echo "📁 Would create files:"
    echo "   - $ENTITY_DIR/${ENTITY_NAME}.ts"
    echo "   - $ENTITY_DIR/${ENTITY_NAME}.spec.ts"
    echo "   - Update $ENTITY_DIR/index.ts"
else
    echo "✅ Backend entity '${PASCAL_CASE_NAME}' created successfully!"
    echo "📁 Created files:"
    echo "   - $ENTITY_DIR/${ENTITY_NAME}.ts"
    echo "   - $ENTITY_DIR/${ENTITY_NAME}.spec.ts"
fi
echo ""
echo "Next steps:"
echo "1. Update the entity fields in ${ENTITY_NAME}.ts according to your domain"
echo "2. Create a feature that uses this entity: ./tools/backend/create-feature.sh ${ENTITY_NAME}"