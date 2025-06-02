#!/bin/bash

# Frontend Feature Boilerplate Generator
# Usage: ./create-feature.sh <feature-name> [entity-name]

FEATURE_NAME=$1
ENTITY_NAME=${2:-$1}  # Use feature name as entity name if not provided

if [ -z "$FEATURE_NAME" ]; then
    echo "Usage: $0 <feature-name> [entity-name]"
    echo "Example: $0 user-management user"
    echo "Example: $0 product"
    exit 1
fi

# Convert entity name to PascalCase
PASCAL_CASE_NAME=$(echo "$ENTITY_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')

# Create feature directory structure
FEATURE_DIR="frontend/src/features/$FEATURE_NAME"
mkdir -p "$FEATURE_DIR/api"
mkdir -p "$FEATURE_DIR/ui"
mkdir -p "$FEATURE_DIR/model"

# Create types file
cat > "$FEATURE_DIR/types.ts" << EOF
export interface ${PASCAL_CASE_NAME} {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Create${PASCAL_CASE_NAME}Input {
  name: string;
  description: string;
}

export interface Update${PASCAL_CASE_NAME}Input {
  name?: string;
  description?: string;
}

export interface ${PASCAL_CASE_NAME}sResponse {
  ${ENTITY_NAME}s: ${PASCAL_CASE_NAME}[];
}

export interface ${PASCAL_CASE_NAME}Response {
  ${ENTITY_NAME}: ${PASCAL_CASE_NAME};
}
EOF

# Create API hooks file
cat > "$FEATURE_DIR/api/hooks.ts" << EOF
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib';
import type { 
  ${PASCAL_CASE_NAME}, 
  Create${PASCAL_CASE_NAME}Input, 
  Update${PASCAL_CASE_NAME}Input,
  ${PASCAL_CASE_NAME}sResponse,
  ${PASCAL_CASE_NAME}Response 
} from '../types';

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
      const data = await response.json() as ${PASCAL_CASE_NAME}sResponse;
      return data;
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
      const data = await response.json() as ${PASCAL_CASE_NAME}Response;
      return data;
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
      const data = await response.json() as ${PASCAL_CASE_NAME}Response;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${ENTITY_NAME}Keys.lists() });
    },
  });
};

export const useUpdate${PASCAL_CASE_NAME} = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Update${PASCAL_CASE_NAME}Input }) => {
      const response = await apiClient.api.${ENTITY_NAME}s[':id'].\$put({
        param: { id },
        json: input,
      });
      if (!response.ok) {
        const errorData = await response.json();
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to update ${ENTITY_NAME}');
      }
      const data = await response.json() as ${PASCAL_CASE_NAME}Response;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ${ENTITY_NAME}Keys.lists() });
      queryClient.invalidateQueries({ queryKey: ${ENTITY_NAME}Keys.detail(variables.id) });
    },
  });
};

export const useDelete${PASCAL_CASE_NAME} = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.api.${ENTITY_NAME}s[':id'].\$delete({
        param: { id },
      });
      if (!response.ok) {
        const errorData = await response.json();
        if ('error' in errorData) {
          throw new Error(errorData.error);
        }
        throw new Error('Failed to delete ${ENTITY_NAME}');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${ENTITY_NAME}Keys.lists() });
    },
  });
};
EOF

# Create API hooks test file
cat > "$FEATURE_DIR/api/hooks.spec.ts" << EOF
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { 
  use${PASCAL_CASE_NAME}s, 
  use${PASCAL_CASE_NAME}, 
  useCreate${PASCAL_CASE_NAME}, 
  useUpdate${PASCAL_CASE_NAME}, 
  useDelete${PASCAL_CASE_NAME} 
} from './hooks';
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
          \$put: vi.fn(),
          \$delete: vi.fn(),
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
          id: '1', 
          name: 'Test ${PASCAL_CASE_NAME}',
          description: 'Test description',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
  });

  describe('use${PASCAL_CASE_NAME}', () => {
    it('should fetch single ${ENTITY_NAME} successfully', async () => {
      const mock${PASCAL_CASE_NAME} = { 
        id: '1', 
        name: 'Test ${PASCAL_CASE_NAME}',
        description: 'Test description',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      vi.mocked(apiClient.api.${ENTITY_NAME}s[':id'].\$get).mockResolvedValue({
        ok: true,
        json: async () => ({ ${ENTITY_NAME}: mock${PASCAL_CASE_NAME} }),
      } as Response);

      const { result } = renderHook(() => use${PASCAL_CASE_NAME}('1'), {
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
        id: '1', 
        name: 'New ${PASCAL_CASE_NAME}',
        description: 'New description',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

  describe('useUpdate${PASCAL_CASE_NAME}', () => {
    it('should update ${ENTITY_NAME} successfully', async () => {
      const updated${PASCAL_CASE_NAME} = { 
        id: '1', 
        name: 'Updated ${PASCAL_CASE_NAME}',
        description: 'Original description',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      vi.mocked(apiClient.api.${ENTITY_NAME}s[':id'].\$put).mockResolvedValue({
        ok: true,
        json: async () => ({ ${ENTITY_NAME}: updated${PASCAL_CASE_NAME} }),
      } as Response);

      const { result } = renderHook(() => useUpdate${PASCAL_CASE_NAME}(), {
        wrapper: testWrapper,
      });

      await result.current.mutateAsync({ 
        id: '1',
        input: { name: 'Updated ${PASCAL_CASE_NAME}' }
      });

      expect(apiClient.api.${ENTITY_NAME}s[':id'].\$put).toHaveBeenCalledWith({
        param: { id: '1' },
        json: { name: 'Updated ${PASCAL_CASE_NAME}' },
      });
    });
  });

  describe('useDelete${PASCAL_CASE_NAME}', () => {
    it('should delete ${ENTITY_NAME} successfully', async () => {
      vi.mocked(apiClient.api.${ENTITY_NAME}s[':id'].\$delete).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Deleted successfully' }),
      } as Response);

      const { result } = renderHook(() => useDelete${PASCAL_CASE_NAME}(), {
        wrapper: testWrapper,
      });

      await result.current.mutateAsync('1');

      expect(apiClient.api.${ENTITY_NAME}s[':id'].\$delete).toHaveBeenCalledWith({
        param: { id: '1' },
      });
    });
  });
});
EOF

# Create API index file
cat > "$FEATURE_DIR/api/index.ts" << EOF
export * from './hooks';
EOF

# Create form component
cat > "$FEATURE_DIR/ui/${ENTITY_NAME}-form.tsx" << EOF
import { FC, FormEvent, useState, useEffect } from 'react';
import { Button, Input, Card } from '@/shared/ui';
import { useCreate${PASCAL_CASE_NAME}, useUpdate${PASCAL_CASE_NAME} } from '../api';
import type { ${PASCAL_CASE_NAME}, Create${PASCAL_CASE_NAME}Input, Update${PASCAL_CASE_NAME}Input } from '../types';

interface ${PASCAL_CASE_NAME}FormProps {
  ${ENTITY_NAME}?: ${PASCAL_CASE_NAME};
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ${PASCAL_CASE_NAME}Form: FC<${PASCAL_CASE_NAME}FormProps> = ({ 
  ${ENTITY_NAME}, 
  onSuccess, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<Create${PASCAL_CASE_NAME}Input>({
    name: ${ENTITY_NAME}?.name || '',
    description: ${ENTITY_NAME}?.description || '',
  });

  const { mutate: create${PASCAL_CASE_NAME}, isPending: isCreating, error: createError } = useCreate${PASCAL_CASE_NAME}();
  const { mutate: update${PASCAL_CASE_NAME}, isPending: isUpdating, error: updateError } = useUpdate${PASCAL_CASE_NAME}();

  const isPending = isCreating || isUpdating;
  const error = createError || updateError;
  const isEditMode = !!${ENTITY_NAME};

  useEffect(() => {
    if (${ENTITY_NAME}) {
      setFormData({
        name: ${ENTITY_NAME}.name,
        description: ${ENTITY_NAME}.description,
      });
    }
  }, [${ENTITY_NAME}]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (isEditMode && ${ENTITY_NAME}) {
      const updateData: Update${PASCAL_CASE_NAME}Input = {};
      if (formData.name !== ${ENTITY_NAME}.name) updateData.name = formData.name;
      if (formData.description !== ${ENTITY_NAME}.description) updateData.description = formData.description;
      
      if (Object.keys(updateData).length > 0) {
        update${PASCAL_CASE_NAME}(
          { id: ${ENTITY_NAME}.id, input: updateData },
          {
            onSuccess: () => {
              onSuccess?.();
            },
          }
        );
      } else {
        onCancel?.();
      }
    } else {
      create${PASCAL_CASE_NAME}(formData, {
        onSuccess: () => {
          setFormData({ name: '', description: '' });
          onSuccess?.();
        },
      });
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">
        {isEditMode ? 'Edit ${PASCAL_CASE_NAME}' : 'Create New ${PASCAL_CASE_NAME}'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Name
          </label>
          <Input
            id="name"
            type="text"
            placeholder="Enter name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            required
          />
        </div>
        
        {error && (
          <div className="text-red-600 text-sm">{error.message}</div>
        )}
        
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update' : 'Create')}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};
EOF

# Create list component
cat > "$FEATURE_DIR/ui/${ENTITY_NAME}-list.tsx" << EOF
import { FC, useState } from 'react';
import { Card, Button } from '@/shared/ui';
import { use${PASCAL_CASE_NAME}s, useDelete${PASCAL_CASE_NAME} } from '../api';
import { ${PASCAL_CASE_NAME}Form } from './${ENTITY_NAME}-form';
import type { ${PASCAL_CASE_NAME} } from '../types';

export const ${PASCAL_CASE_NAME}List: FC = () => {
  const { data, isLoading, error } = use${PASCAL_CASE_NAME}s();
  const { mutate: delete${PASCAL_CASE_NAME}, isPending: isDeleting } = useDelete${PASCAL_CASE_NAME}();
  const [editing${PASCAL_CASE_NAME}, setEditing${PASCAL_CASE_NAME}] = useState<${PASCAL_CASE_NAME} | null>(null);

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

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this ${ENTITY_NAME}?')) {
      delete${PASCAL_CASE_NAME}(id);
    }
  };

  if (editing${PASCAL_CASE_NAME}) {
    return (
      <${PASCAL_CASE_NAME}Form
        ${ENTITY_NAME}={editing${PASCAL_CASE_NAME}}
        onSuccess={() => setEditing${PASCAL_CASE_NAME}(null)}
        onCancel={() => setEditing${PASCAL_CASE_NAME}(null)}
      />
    );
  }

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
                <p className="text-gray-600 mt-1">{${ENTITY_NAME}.description}</p>
                <p className="text-sm text-gray-400 mt-2">
                  Created: {new Date(${ENTITY_NAME}.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setEditing${PASCAL_CASE_NAME}(${ENTITY_NAME})}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => handleDelete(${ENTITY_NAME}.id)}
                  disabled={isDeleting}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
EOF

# Create component tests
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
  useUpdate${PASCAL_CASE_NAME}: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  })),
}));

describe('${PASCAL_CASE_NAME}Form', () => {
  it('should render create form', () => {
    render(<${PASCAL_CASE_NAME}Form />, { wrapper: testWrapper });
    
    expect(screen.getByText('Create New ${PASCAL_CASE_NAME}')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('should render edit form', () => {
    const ${ENTITY_NAME} = {
      id: '1',
      name: 'Test ${PASCAL_CASE_NAME}',
      description: 'Test description',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(<${PASCAL_CASE_NAME}Form ${ENTITY_NAME}={${ENTITY_NAME}} />, { wrapper: testWrapper });
    
    expect(screen.getByText('Edit ${PASCAL_CASE_NAME}')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test ${PASCAL_CASE_NAME}')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
  });

  it('should handle form submission for create', () => {
    const mockMutate = vi.fn();
    vi.mocked(hooks.useCreate${PASCAL_CASE_NAME}).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    } as any);

    render(<${PASCAL_CASE_NAME}Form />, { wrapper: testWrapper });
    
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New ${PASCAL_CASE_NAME}' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'New description' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    
    expect(mockMutate).toHaveBeenCalledWith(
      { name: 'New ${PASCAL_CASE_NAME}', description: 'New description' },
      expect.any(Object)
    );
  });

  it('should display error message', () => {
    vi.mocked(hooks.useCreate${PASCAL_CASE_NAME}).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: new Error('Creation failed'),
    } as any);

    render(<${PASCAL_CASE_NAME}Form />, { wrapper: testWrapper });
    
    expect(screen.getByText('Creation failed')).toBeInTheDocument();
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
  useDelete${PASCAL_CASE_NAME}: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
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
        id: '1',
        name: 'Test ${PASCAL_CASE_NAME}',
        description: 'Test description',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });
});
EOF

# Create UI index file
cat > "$FEATURE_DIR/ui/index.ts" << EOF
export * from './${ENTITY_NAME}-form';
export * from './${ENTITY_NAME}-list';
EOF

# Create feature index file
cat > "$FEATURE_DIR/index.ts" << EOF
export * from './api';
export * from './ui';
export * from './types';
EOF

echo "✅ Frontend feature '${FEATURE_NAME}' created successfully!"
echo "📁 Created in: $FEATURE_DIR"
echo ""
echo "Next steps:"
echo "1. Update the types in types.ts according to your domain"
echo "2. Modify the form fields in ui/${ENTITY_NAME}-form.tsx"
echo "3. Create a widget that uses these components:"
echo "   ./tools/frontend/create-widget.sh ${ENTITY_NAME}-management"
echo "4. Add the widget to a page"
echo "5. Run tests: yarn workspace @spa-hono/frontend test"