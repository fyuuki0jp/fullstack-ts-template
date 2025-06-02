#!/bin/bash

# Backend Entity Boilerplate Generator
# Usage: ./create-entity.sh <entity-name>

ENTITY_NAME=$1

if [ -z "$ENTITY_NAME" ]; then
    echo "Usage: $0 <entity-name>"
    echo "Example: $0 product"
    exit 1
fi

# Convert entity name to PascalCase
PASCAL_CASE_NAME=$(echo "$ENTITY_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')

# Create entity directory
ENTITY_DIR="backend/src/entities"
mkdir -p "$ENTITY_DIR"

# Create entity file
cat > "$ENTITY_DIR/${ENTITY_NAME}.ts" << EOF
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

# Create entity test file
cat > "$ENTITY_DIR/${ENTITY_NAME}.spec.ts" << EOF
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

# Update entities index file to export the new entity
if [ -f "$ENTITY_DIR/index.ts" ]; then
    echo "export * from './${ENTITY_NAME}';" >> "$ENTITY_DIR/index.ts"
else
    cat > "$ENTITY_DIR/index.ts" << EOF
export * from './types';
export * from './${ENTITY_NAME}';
EOF
fi

echo "✅ Backend entity '${PASCAL_CASE_NAME}' created successfully!"
echo "📁 Created files:"
echo "   - $ENTITY_DIR/${ENTITY_NAME}.ts"
echo "   - $ENTITY_DIR/${ENTITY_NAME}.spec.ts"
echo ""
echo "Next steps:"
echo "1. Update the entity fields in ${ENTITY_NAME}.ts according to your domain"
echo "2. Create a feature that uses this entity: ./tools/backend/create-feature.sh ${ENTITY_NAME}"