#!/bin/bash

# Frontend Feature Boilerplate Generator
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
    echo "Example: $0 user-management user"
    echo "Example: $0 product"
    echo "Example: $0 product --dry-run"
    exit 1
fi

# Convert entity name to PascalCase
PASCAL_CASE_NAME=$(echo "$ENTITY_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')

# Create feature directory structure
FEATURE_DIR="frontend/src/features/$FEATURE_NAME"

if [ "$DRY_RUN" = true ]; then
    echo "🔍 DRY RUN MODE - No files will be created"
    echo ""
    echo "Would create directories:"
    echo "  - $FEATURE_DIR/api"
    echo "  - $FEATURE_DIR/ui"
    echo "  - $FEATURE_DIR/model"
    echo ""
else
    mkdir -p "$FEATURE_DIR/api"
    mkdir -p "$FEATURE_DIR/ui"
    mkdir -p "$FEATURE_DIR/model"
fi

# Check if backend entity exists
BACKEND_ENTITY_FILE="backend/src/entities/${ENTITY_NAME}.ts"
if [ ! -f "$BACKEND_ENTITY_FILE" ]; then
    echo "⚠️  Backend entity '${ENTITY_NAME}' not found. Please create it first using:"
    echo "   ./tools/backend/create-entity.sh ${ENTITY_NAME}"
    exit 1
fi

# Create shared types file (imports backend types)
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: frontend/src/shared/types/${ENTITY_NAME}.ts"
else
    cat > "frontend/src/shared/types/${ENTITY_NAME}.ts" << EOF
import { z } from 'zod';
// Import backend types directly to avoid duplication
import type {
  ${PASCAL_CASE_NAME} as Backend${PASCAL_CASE_NAME},
  Create${PASCAL_CASE_NAME}Input as BackendCreate${PASCAL_CASE_NAME}Input,
  ${PASCAL_CASE_NAME}Id,
} from '../../../../backend/src/entities/${ENTITY_NAME}';

// Re-export backend types for convenience
export type { ${PASCAL_CASE_NAME}Id };
export type { Create${PASCAL_CASE_NAME}Input } from '../../../../backend/src/entities/${ENTITY_NAME}';

// Frontend ${PASCAL_CASE_NAME} type with ISO string dates (transformed from backend Date objects)
export type ${PASCAL_CASE_NAME} = Omit<
  Backend${PASCAL_CASE_NAME},
  'createdAt' | 'updatedAt' | 'deletedAt'
> & {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

// Frontend ${PASCAL_CASE_NAME} schema for validation (dates as ISO strings)
const _Frontend${PASCAL_CASE_NAME}Schema = z.object({
  id: z.string().uuid().brand<'${PASCAL_CASE_NAME}Id'>(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

// Frontend input schema (same as backend)
const _Create${PASCAL_CASE_NAME}InputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
});

// Validation helpers
export const validate${PASCAL_CASE_NAME} = (data: unknown): ${PASCAL_CASE_NAME} | null => {
  const result = _Frontend${PASCAL_CASE_NAME}Schema.safeParse(data);
  return result.success ? result.data : null;
};

export const validateCreate${PASCAL_CASE_NAME}Input = (
  data: unknown
): BackendCreate${PASCAL_CASE_NAME}Input | null => {
  const result = _Create${PASCAL_CASE_NAME}InputSchema.safeParse(data);
  return result.success ? result.data : null;
};

// Form validation with error details
export const validateCreate${PASCAL_CASE_NAME}InputWithErrors = (data: unknown) => {
  const result = _Create${PASCAL_CASE_NAME}InputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }

  const errors = result.error.errors.reduce(
    (acc, error) => {
      const field = error.path[0] as keyof BackendCreate${PASCAL_CASE_NAME}Input;
      acc[field] = error.message;
      return acc;
    },
    {} as Record<keyof BackendCreate${PASCAL_CASE_NAME}Input, string>
  );

  return { success: false, data: null, errors };
};

// Utility to transform backend ${PASCAL_CASE_NAME} (with Date objects) to frontend ${PASCAL_CASE_NAME} (with ISO strings)
export const transformBackend${PASCAL_CASE_NAME}ToFrontend = (
  backend${PASCAL_CASE_NAME}: Backend${PASCAL_CASE_NAME}
): ${PASCAL_CASE_NAME} => ({
  ...backend${PASCAL_CASE_NAME},
  createdAt: backend${PASCAL_CASE_NAME}.createdAt.toISOString(),
  updatedAt: backend${PASCAL_CASE_NAME}.updatedAt.toISOString(),
  deletedAt: backend${PASCAL_CASE_NAME}.deletedAt?.toISOString() || null,
});

// Response types for API
export interface ${PASCAL_CASE_NAME}sResponse {
  ${ENTITY_NAME}s: ${PASCAL_CASE_NAME}[];
}

export interface ${PASCAL_CASE_NAME}Response {
  ${ENTITY_NAME}: ${PASCAL_CASE_NAME};
}
EOF
fi

# Create API hooks file
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $FEATURE_DIR/api/hooks.ts"
else
    cat > "$FEATURE_DIR/api/hooks.ts" << EOF
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib';
import {
  type ${PASCAL_CASE_NAME},
  type Create${PASCAL_CASE_NAME}Input,
  type ${PASCAL_CASE_NAME}sResponse,
  type ${PASCAL_CASE_NAME}Response,
  validate${PASCAL_CASE_NAME},
} from '@/shared/types/${ENTITY_NAME}';

const ${ENTITY_NAME}Keys = {
  all: ['${ENTITY_NAME}s'] as const,
  lists: () => [...${ENTITY_NAME}Keys.all, 'list'] as const,
  list: (filters?: any) => [...${ENTITY_NAME}Keys.lists(), filters] as const,
  details: () => [...${ENTITY_NAME}Keys.all, 'detail'] as const,
  detail: (id: string) => [...${ENTITY_NAME}Keys.details(), id] as const,
};

export const use${PASCAL_CASE_NAME}s = () => {
  return useQuery({
    queryKey: ${ENTITY_NAME}Keys.lists(),
    queryFn: async () => {
      const response = await apiClient.api.${ENTITY_NAME}s.\$get();
      if (!response.ok) {
        const errorData = await response.json();
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to fetch ${ENTITY_NAME}s');
      }

      const data = await response.json();
      if ('${ENTITY_NAME}s' in data && Array.isArray(data.${ENTITY_NAME}s)) {
        // Validate all ${ENTITY_NAME}s with zod
        const validated${PASCAL_CASE_NAME}s = data.${ENTITY_NAME}s.map((${ENTITY_NAME}: unknown) => {
          const validated = validate${PASCAL_CASE_NAME}(${ENTITY_NAME});
          if (!validated) {
            throw new Error('Invalid ${ENTITY_NAME} data received from server');
          }
          return validated;
        });
        return { ${ENTITY_NAME}s: validated${PASCAL_CASE_NAME}s } as ${PASCAL_CASE_NAME}sResponse;
      }
      throw new Error('Invalid response format');
    },
  });
};

export const use${PASCAL_CASE_NAME} = (id: string) => {
  return useQuery({
    queryKey: ${ENTITY_NAME}Keys.detail(id),
    queryFn: async () => {
      const response = await apiClient.api.${ENTITY_NAME}s[':id'].\$get({
        param: { id },
      });
      if (!response.ok) {
        const errorData = await response.json();
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to fetch ${ENTITY_NAME}');
      }

      const data = await response.json();
      if ('${ENTITY_NAME}' in data) {
        // Validate the response ${ENTITY_NAME} data with zod
        const validated${PASCAL_CASE_NAME} = validate${PASCAL_CASE_NAME}(data.${ENTITY_NAME});
        if (!validated${PASCAL_CASE_NAME}) {
          throw new Error('Invalid ${ENTITY_NAME} data received from server');
        }
        return { ${ENTITY_NAME}: validated${PASCAL_CASE_NAME} } as ${PASCAL_CASE_NAME}Response;
      }
      throw new Error('Invalid response format');
    },
    enabled: !!id,
  });
};

export const useCreate${PASCAL_CASE_NAME} = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: Create${PASCAL_CASE_NAME}Input) => {
      const response = await apiClient.api.${ENTITY_NAME}s.\$post({
        json: input,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to create ${ENTITY_NAME}');
      }

      const data = await response.json();
      if ('${ENTITY_NAME}' in data) {
        // Validate the response ${ENTITY_NAME} data with zod
        const validated${PASCAL_CASE_NAME} = validate${PASCAL_CASE_NAME}(data.${ENTITY_NAME});
        if (!validated${PASCAL_CASE_NAME}) {
          throw new Error('Invalid ${ENTITY_NAME} data received from server');
        }
        return { ${ENTITY_NAME}: validated${PASCAL_CASE_NAME} } as ${PASCAL_CASE_NAME}Response;
      }
      throw new Error('Invalid response format');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${ENTITY_NAME}Keys.lists() });
    },
  });
};
EOF
fi

# Create API hooks test file
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $FEATURE_DIR/api/hooks.spec.ts"
else
    cat > "$FEATURE_DIR/api/hooks.spec.ts" << EOF
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { use${PASCAL_CASE_NAME}s, use${PASCAL_CASE_NAME}, useCreate${PASCAL_CASE_NAME} } from './hooks';
import { testWrapper } from '@/test-utils';
import { apiClient } from '@/shared/lib';

vi.mock('@/shared/lib', () => ({
  apiClient: {
    api: {
      ${ENTITY_NAME}s: {
        \$get: vi.fn(),
        \$post: vi.fn(),
        ':id': {
          \$get: vi.fn(),
        },
      },
    },
  },
}));

describe('${PASCAL_CASE_NAME} API hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('use${PASCAL_CASE_NAME}s', () => {
    it('should fetch ${ENTITY_NAME}s successfully', async () => {
      const mock${PASCAL_CASE_NAME}s = [
        { 
          id: '550e8400-e29b-41d4-a716-446655440001', 
          name: 'Test ${PASCAL_CASE_NAME}',
          description: 'Test description',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      ];
      
      vi.mocked(apiClient.api.${ENTITY_NAME}s.\$get).mockResolvedValue({
        ok: true,
        json: async () => ({ ${ENTITY_NAME}s: mock${PASCAL_CASE_NAME}s }),
      } as Response);

      const { result } = renderHook(() => use${PASCAL_CASE_NAME}s(), {
        wrapper: testWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.${ENTITY_NAME}s).toEqual(mock${PASCAL_CASE_NAME}s);
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.api.${ENTITY_NAME}s.\$get).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      } as Response);

      const { result } = renderHook(() => use${PASCAL_CASE_NAME}s(), {
        wrapper: testWrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Server error');
    });

    it('should handle invalid ${ENTITY_NAME} data', async () => {
      const invalid${PASCAL_CASE_NAME}s = [
        { 
          id: 'invalid-uuid', // Invalid UUID
          name: 'Test ${PASCAL_CASE_NAME}',
          description: 'Test description',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      ];
      
      vi.mocked(apiClient.api.${ENTITY_NAME}s.\$get).mockResolvedValue({
        ok: true,
        json: async () => ({ ${ENTITY_NAME}s: invalid${PASCAL_CASE_NAME}s }),
      } as Response);

      const { result } = renderHook(() => use${PASCAL_CASE_NAME}s(), {
        wrapper: testWrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Invalid ${ENTITY_NAME} data received from server');
    });
  });

  describe('use${PASCAL_CASE_NAME}', () => {
    it('should fetch single ${ENTITY_NAME} successfully', async () => {
      const mock${PASCAL_CASE_NAME} = { 
        id: '550e8400-e29b-41d4-a716-446655440001', 
        name: 'Test ${PASCAL_CASE_NAME}',
        description: 'Test description',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      
      vi.mocked(apiClient.api.${ENTITY_NAME}s[':id'].\$get).mockResolvedValue({
        ok: true,
        json: async () => ({ ${ENTITY_NAME}: mock${PASCAL_CASE_NAME} }),
      } as Response);

      const { result } = renderHook(() => use${PASCAL_CASE_NAME}('550e8400-e29b-41d4-a716-446655440001'), {
        wrapper: testWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.${ENTITY_NAME}).toEqual(mock${PASCAL_CASE_NAME});
    });
  });

  describe('useCreate${PASCAL_CASE_NAME}', () => {
    it('should create ${ENTITY_NAME} successfully', async () => {
      const new${PASCAL_CASE_NAME} = { 
        id: '550e8400-e29b-41d4-a716-446655440001', 
        name: 'New ${PASCAL_CASE_NAME}',
        description: 'New description',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      
      vi.mocked(apiClient.api.${ENTITY_NAME}s.\$post).mockResolvedValue({
        ok: true,
        json: async () => ({ ${ENTITY_NAME}: new${PASCAL_CASE_NAME} }),
      } as Response);

      const { result } = renderHook(() => useCreate${PASCAL_CASE_NAME}(), {
        wrapper: testWrapper,
      });

      await result.current.mutateAsync({ 
        name: 'New ${PASCAL_CASE_NAME}',
        description: 'New description'
      });

      expect(apiClient.api.${ENTITY_NAME}s.\$post).toHaveBeenCalledWith({
        json: { 
          name: 'New ${PASCAL_CASE_NAME}',
          description: 'New description'
        },
      });
    });
  });
});
EOF
fi

# Create API index file
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $FEATURE_DIR/api/index.ts"
else
    cat > "$FEATURE_DIR/api/index.ts" << EOF
export * from './hooks';
EOF
fi

# Create form component
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $FEATURE_DIR/ui/${ENTITY_NAME}-form.tsx"
else
    cat > "$FEATURE_DIR/ui/${ENTITY_NAME}-form.tsx" << EOF
import { FC, FormEvent, useState } from 'react';
import { Button, Input, Card } from '@/shared/ui';
import { useCreate${PASCAL_CASE_NAME} } from '../api';
import {
  type Create${PASCAL_CASE_NAME}Input,
  validateCreate${PASCAL_CASE_NAME}InputWithErrors,
} from '@/shared/types/${ENTITY_NAME}';

interface ${PASCAL_CASE_NAME}FormProps {
  onSuccess?: () => void;
}

export const ${PASCAL_CASE_NAME}Form: FC<${PASCAL_CASE_NAME}FormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { mutate: create${PASCAL_CASE_NAME}, isPending, error } = useCreate${PASCAL_CASE_NAME}();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Validate form data with zod
    const validation = validateCreate${PASCAL_CASE_NAME}InputWithErrors(formData);
    if (!validation.success) {
      setFieldErrors(validation.errors || {});
      return;
    }

    // Create ${ENTITY_NAME} with validated data
    create${PASCAL_CASE_NAME}(validation.data as Create${PASCAL_CASE_NAME}Input, {
      onSuccess: () => {
        setFormData({ name: '', description: '' });
        setFieldErrors({});
        onSuccess?.();
      },
    });
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">Create New ${PASCAL_CASE_NAME}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Name *
          </label>
          <Input
            id="name"
            type="text"
            placeholder="Enter name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          {fieldErrors.name && (
            <div className="text-red-600 text-sm mt-1">{fieldErrors.name}</div>
          )}
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter description (optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
          {fieldErrors.description && (
            <div className="text-red-600 text-sm mt-1">{fieldErrors.description}</div>
          )}
        </div>
        
        {error && (
          <div className="text-red-600 text-sm">{error.message}</div>
        )}
        
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
EOF
fi

# Create list component
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $FEATURE_DIR/ui/${ENTITY_NAME}-list.tsx"
else
    cat > "$FEATURE_DIR/ui/${ENTITY_NAME}-list.tsx" << EOF
import { FC } from 'react';
import { Card } from '@/shared/ui';
import { use${PASCAL_CASE_NAME}s } from '../api';

export const ${PASCAL_CASE_NAME}List: FC = () => {
  const { data, isLoading, error } = use${PASCAL_CASE_NAME}s();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading ${ENTITY_NAME}s...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center">
        Error loading ${ENTITY_NAME}s: {error.message}
      </div>
    );
  }

  const ${ENTITY_NAME}s = data?.${ENTITY_NAME}s || [];

  return (
    <div className="space-y-4">
      {${ENTITY_NAME}s.length === 0 ? (
        <Card>
          <p className="text-gray-500 text-center py-8">
            No ${ENTITY_NAME}s found. Create your first one!
          </p>
        </Card>
      ) : (
        ${ENTITY_NAME}s.map((${ENTITY_NAME}) => (
          <Card key={${ENTITY_NAME}.id}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{${ENTITY_NAME}.name}</h3>
                {${ENTITY_NAME}.description && (
                  <p className="text-gray-600 mt-1">{${ENTITY_NAME}.description}</p>
                )}
                <p className="text-sm text-gray-400 mt-2">
                  Created: {new Date(${ENTITY_NAME}.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
EOF
fi

# Create component tests
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $FEATURE_DIR/ui/${ENTITY_NAME}-form.spec.tsx"
    echo "Would create file: $FEATURE_DIR/ui/${ENTITY_NAME}-list.spec.tsx"
else
    cat > "$FEATURE_DIR/ui/${ENTITY_NAME}-form.spec.tsx" << EOF
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ${PASCAL_CASE_NAME}Form } from './${ENTITY_NAME}-form';
import { testWrapper } from '@/test-utils';
import * as hooks from '../api';

vi.mock('../api', () => ({
  useCreate${PASCAL_CASE_NAME}: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  })),
}));

describe('${PASCAL_CASE_NAME}Form', () => {
  it('should render create form', () => {
    render(<${PASCAL_CASE_NAME}Form />, { wrapper: testWrapper });
    
    expect(screen.getByText('Create New ${PASCAL_CASE_NAME}')).toBeInTheDocument();
    expect(screen.getByLabelText('Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('should handle form submission for create', () => {
    const mockMutate = vi.fn();
    vi.mocked(hooks.useCreate${PASCAL_CASE_NAME}).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    } as any);

    render(<${PASCAL_CASE_NAME}Form />, { wrapper: testWrapper });
    
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'New ${PASCAL_CASE_NAME}' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'New description' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    
    expect(mockMutate).toHaveBeenCalledWith(
      { name: 'New ${PASCAL_CASE_NAME}', description: 'New description' },
      expect.any(Object)
    );
  });

  it('should display validation errors', () => {
    render(<${PASCAL_CASE_NAME}Form />, { wrapper: testWrapper });
    
    // Try to submit with empty name (should trigger validation error)
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('should display API error message', () => {
    vi.mocked(hooks.useCreate${PASCAL_CASE_NAME}).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: new Error('Creation failed'),
    } as any);

    render(<${PASCAL_CASE_NAME}Form />, { wrapper: testWrapper });
    
    expect(screen.getByText('Creation failed')).toBeInTheDocument();
  });

  it('should show pending state during submission', () => {
    vi.mocked(hooks.useCreate${PASCAL_CASE_NAME}).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      error: null,
    } as any);

    render(<${PASCAL_CASE_NAME}Form />, { wrapper: testWrapper });
    
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
  });
});
EOF

    cat > "$FEATURE_DIR/ui/${ENTITY_NAME}-list.spec.tsx" << EOF
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ${PASCAL_CASE_NAME}List } from './${ENTITY_NAME}-list';
import { testWrapper } from '@/test-utils';
import * as hooks from '../api';

vi.mock('../api', () => ({
  use${PASCAL_CASE_NAME}s: vi.fn(),
}));

describe('${PASCAL_CASE_NAME}List', () => {
  it('should display loading state', () => {
    vi.mocked(hooks.use${PASCAL_CASE_NAME}s).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<${PASCAL_CASE_NAME}List />, { wrapper: testWrapper });
    
    expect(screen.getByText('Loading ${ENTITY_NAME}s...')).toBeInTheDocument();
  });

  it('should display error state', () => {
    vi.mocked(hooks.use${PASCAL_CASE_NAME}s).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
    } as any);

    render(<${PASCAL_CASE_NAME}List />, { wrapper: testWrapper });
    
    expect(screen.getByText('Error loading ${ENTITY_NAME}s: Failed to load')).toBeInTheDocument();
  });

  it('should display empty state', () => {
    vi.mocked(hooks.use${PASCAL_CASE_NAME}s).mockReturnValue({
      data: { ${ENTITY_NAME}s: [] },
      isLoading: false,
      error: null,
    } as any);

    render(<${PASCAL_CASE_NAME}List />, { wrapper: testWrapper });
    
    expect(screen.getByText('No ${ENTITY_NAME}s found. Create your first one!')).toBeInTheDocument();
  });

  it('should display ${ENTITY_NAME}s', () => {
    const mock${PASCAL_CASE_NAME}s = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test ${PASCAL_CASE_NAME}',
        description: 'Test description',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      },
    ];

    vi.mocked(hooks.use${PASCAL_CASE_NAME}s).mockReturnValue({
      data: { ${ENTITY_NAME}s: mock${PASCAL_CASE_NAME}s },
      isLoading: false,
      error: null,
    } as any);

    render(<${PASCAL_CASE_NAME}List />, { wrapper: testWrapper });
    
    expect(screen.getByText('Test ${PASCAL_CASE_NAME}')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should handle ${ENTITY_NAME}s without description', () => {
    const mock${PASCAL_CASE_NAME}s = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test ${PASCAL_CASE_NAME}',
        description: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      },
    ];

    vi.mocked(hooks.use${PASCAL_CASE_NAME}s).mockReturnValue({
      data: { ${ENTITY_NAME}s: mock${PASCAL_CASE_NAME}s },
      isLoading: false,
      error: null,
    } as any);

    render(<${PASCAL_CASE_NAME}List />, { wrapper: testWrapper });
    
    expect(screen.getByText('Test ${PASCAL_CASE_NAME}')).toBeInTheDocument();
    expect(screen.queryByText('null')).not.toBeInTheDocument();
  });
});
EOF
fi

# Create UI index file
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $FEATURE_DIR/ui/index.ts"
else
    cat > "$FEATURE_DIR/ui/index.ts" << EOF
export * from './${ENTITY_NAME}-form';
export * from './${ENTITY_NAME}-list';
EOF
fi

# Create feature index file
if [ "$DRY_RUN" = true ]; then
    echo "Would create file: $FEATURE_DIR/index.ts"
else
    cat > "$FEATURE_DIR/index.ts" << EOF
export * from './api';
export * from './ui';
EOF
fi

if [ "$DRY_RUN" = true ]; then
    echo "✅ DRY RUN completed for frontend feature '${FEATURE_NAME}'"
    echo "📁 Would create in: $FEATURE_DIR"
    echo "📁 Would create shared types in: frontend/src/shared/types/${ENTITY_NAME}.ts"
    echo ""
    echo "Would create:"
    echo "  - Shared type definitions (imports backend types)"
    echo "  - API hooks with zod validation (React Query)"
    echo "  - UI components: Form with validation and List"
    echo "  - Complete test suites with UUID test data"
    echo "  - Frontend validation helpers with error details"
else
    echo "✅ Frontend feature '${FEATURE_NAME}' created successfully!"
    echo "📁 Created in: $FEATURE_DIR"
    echo "📁 Created shared types in: frontend/src/shared/types/${ENTITY_NAME}.ts"
    echo ""
    echo "✨ Features implemented:"
    echo "  - ✅ Backend type imports (no duplication)"
    echo "  - ✅ Zod validation with error handling"
    echo "  - ✅ UUID-based IDs with branded types"
    echo "  - ✅ Frontend form validation with field errors"
    echo "  - ✅ API response validation"
    echo "  - ✅ Comprehensive test coverage"
fi
echo ""
echo "Next steps:"
echo "1. Create a widget that uses these components:"
echo "   ./tools/frontend/create-widget.sh ${ENTITY_NAME}-management"
echo "2. Add the widget to a page"
echo "3. Ensure backend entity and routes are properly set up"
echo "4. Run tests: yarn workspace @spa-hono/frontend test"
echo "5. Test the full flow: yarn dev"