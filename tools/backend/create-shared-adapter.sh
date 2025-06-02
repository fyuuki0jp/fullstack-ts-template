#!/bin/bash

# Backend Shared Adapter Boilerplate Generator
# Usage: ./create-shared-adapter.sh <adapter-type> <adapter-name> [--dry-run]

ADAPTER_TYPE=$1
ADAPTER_NAME=$2
DRY_RUN=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
    esac
done

if [ -z "$ADAPTER_TYPE" ] || [ -z "$ADAPTER_NAME" ] || [ "$ADAPTER_TYPE" = "--dry-run" ]; then
    echo "Usage: $0 <adapter-type> <adapter-name> [--dry-run]"
    echo "Examples:"
    echo "  $0 db postgres"
    echo "  $0 external stripe-api"
    echo "  $0 external email-service"
    echo "  $0 db postgres --dry-run"
    exit 1
fi

# Convert adapter name to PascalCase
PASCAL_CASE_NAME=$(echo "$ADAPTER_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')

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

# Create adapter directory
ADAPTER_DIR="backend/src/shared/adapters/$ADAPTER_TYPE"

if [ "$DRY_RUN" = true ]; then
    echo "🔍 DRY RUN MODE - No files will be created"
    echo ""
    echo "Would create directory: $ADAPTER_DIR"
    echo ""
else
    mkdir -p "$ADAPTER_DIR"
fi

if [ "$ADAPTER_TYPE" = "db" ]; then
    # Create DB adapter
    create_file "$ADAPTER_DIR/${ADAPTER_NAME}.ts" "\
import { depend } from 'velona';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';
import type { DbAdapter } from './types';

interface ${PASCAL_CASE_NAME}Config {
  connectionString?: string;
  // Add more configuration options as needed
}

export const create${PASCAL_CASE_NAME}Adapter = depend(
  { config: (undefined as unknown) as ${PASCAL_CASE_NAME}Config },
  ({ config }): DbAdapter => {
    // Initialize your database connection here
    // const connection = new ${PASCAL_CASE_NAME}Client(config);

    return {
      async query<T>(sql: string, params?: any[]): Promise<Result<T[], Error>> {
        try {
          // Implement your query logic here
          // const result = await connection.query(sql, params);
          // return ok(result.rows as T[]);
          
          // Placeholder implementation
          return ok([]);
        } catch (error) {
          return err(error instanceof Error ? error : new Error('Query failed'));
        }
      },

      async execute(sql: string, params?: any[]): Promise<Result<void, Error>> {
        try {
          // Implement your execute logic here
          // await connection.execute(sql, params);
          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error('Execute failed'));
        }
      },

      async transaction<T>(
        fn: (tx: DbAdapter) => Promise<Result<T, Error>>
      ): Promise<Result<T, Error>> {
        try {
          // Implement transaction logic here
          // await connection.beginTransaction();
          // const result = await fn(this);
          // if (isErr(result)) {
          //   await connection.rollback();
          //   return result;
          // }
          // await connection.commit();
          // return result;
          
          // Placeholder implementation
          return fn(this);
        } catch (error) {
          // await connection.rollback();
          return err(error instanceof Error ? error : new Error('Transaction failed'));
        }
      },
    };
  }
);
EOF

    # Create DB adapter test
    create_file "$ADAPTER_DIR/${ADAPTER_NAME}.spec.ts" "\
import { describe, it, expect, beforeEach } from 'vitest';
import { create${PASCAL_CASE_NAME}Adapter } from './${ADAPTER_NAME}';
import { isErr } from '@fyuuki0jp/railway-result';

describe('${PASCAL_CASE_NAME} Adapter', () => {
  let adapter: ReturnType<typeof create${PASCAL_CASE_NAME}Adapter.inject>;

  beforeEach(() => {
    adapter = create${PASCAL_CASE_NAME}Adapter.inject({ 
      config: { connectionString: 'test' } 
    })();
  });

  describe('query', () => {
    it('should execute queries', async () => {
      const result = await adapter.query<{ id: string }>('SELECT * FROM test');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });
  });

  describe('execute', () => {
    it('should execute commands', async () => {
      const result = await adapter.execute('INSERT INTO test VALUES (?)', ['value']);
      
      expect(result.success).toBe(true);
    });
  });

  describe('transaction', () => {
    it('should handle transactions', async () => {
      const result = await adapter.transaction(async (tx) => {
        const insertResult = await tx.execute('INSERT INTO test VALUES (?)', ['value']);
        if (isErr(insertResult)) return insertResult;
        
        return tx.query<{ id: string }>('SELECT * FROM test');
      });
      
      expect(result.success).toBe(true);
    });
  });
});
EOF

elif [ "$ADAPTER_TYPE" = "external" ]; then
    # Create external service adapter
    create_file "$ADAPTER_DIR/${ADAPTER_NAME}.ts" "\
import { depend } from 'velona';
import { ok, err } from '@fyuuki0jp/railway-result';
import type { Result } from '@fyuuki0jp/railway-result';

interface ${PASCAL_CASE_NAME}Config {
  apiKey?: string;
  baseUrl?: string;
  // Add more configuration options as needed
}

// Define your service interface
export interface ${PASCAL_CASE_NAME}Service {
  // Example methods - replace with your actual service methods
  sendRequest<T>(endpoint: string, data?: any): Promise<Result<T, Error>>;
  validateConnection(): Promise<Result<boolean, Error>>;
}

export const create${PASCAL_CASE_NAME}Service = depend(
  { config: (undefined as unknown) as ${PASCAL_CASE_NAME}Config },
  ({ config }): ${PASCAL_CASE_NAME}Service => {
    // Initialize your service client here
    const baseUrl = config.baseUrl || 'https://api.example.com';
    const headers = {
      'Authorization': \`Bearer \${config.apiKey}\`,
      'Content-Type': 'application/json',
    };

    return {
      async sendRequest<T>(endpoint: string, data?: any): Promise<Result<T, Error>> {
        try {
          const response = await fetch(\`\${baseUrl}\${endpoint}\`, {
            method: data ? 'POST' : 'GET',
            headers,
            body: data ? JSON.stringify(data) : undefined,
          });

          if (!response.ok) {
            return err(new Error(\`Request failed: \${response.statusText}\`));
          }

          const result = await response.json();
          return ok(result as T);
        } catch (error) {
          return err(error instanceof Error ? error : new Error('Request failed'));
        }
      },

      async validateConnection(): Promise<Result<boolean, Error>> {
        try {
          // Implement connection validation logic
          const result = await this.sendRequest('/health');
          return ok(result.success);
        } catch (error) {
          return err(error instanceof Error ? error : new Error('Connection validation failed'));
        }
      },
    };
  }
);
EOF

    # Create external service adapter test
    create_file "$ADAPTER_DIR/${ADAPTER_NAME}.spec.ts" "\
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create${PASCAL_CASE_NAME}Service } from './${ADAPTER_NAME}';
import { isErr } from '@fyuuki0jp/railway-result';

// Mock fetch
global.fetch = vi.fn();

describe('${PASCAL_CASE_NAME} Service', () => {
  let service: ReturnType<typeof create${PASCAL_CASE_NAME}Service.inject>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = create${PASCAL_CASE_NAME}Service.inject({ 
      config: { 
        apiKey: 'test-key',
        baseUrl: 'https://api.test.com'
      } 
    })();
  });

  describe('sendRequest', () => {
    it('should send GET requests', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      } as Response);

      const result = await service.sendRequest<{ data: string }>('/endpoint');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data).toBe('test');
      }
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/endpoint',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
          }),
        })
      );
    });

    it('should send POST requests with data', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const data = { name: 'test' };
      const result = await service.sendRequest('/endpoint', data);
      
      expect(result.success).toBe(true);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/endpoint',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      );
    });

    it('should handle errors', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      } as Response);

      const result = await service.sendRequest('/endpoint');
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Request failed');
      }
    });
  });

  describe('validateConnection', () => {
    it('should validate connection', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await service.validateConnection();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });
  });
});
EOF

    # Update external services index
    if [ "$DRY_RUN" = true ]; then
        if [ -f "$ADAPTER_DIR/index.ts" ]; then
            echo "Would append to file: $ADAPTER_DIR/index.ts"
        else
            echo "Would create file: $ADAPTER_DIR/index.ts"
        fi
    else
        if [ -f "$ADAPTER_DIR/index.ts" ]; then
            echo "export * from './${ADAPTER_NAME}';" >> "$ADAPTER_DIR/index.ts"
        else
            create_file "$ADAPTER_DIR/index.ts" "\
export * from './types';
export * from './${ADAPTER_NAME}';
EOF
        fi
    fi
fi

if [ "$DRY_RUN" = true ]; then
    echo "✅ DRY RUN completed for backend ${ADAPTER_TYPE} adapter '${PASCAL_CASE_NAME}'"
    echo "📁 Would create files:"
    echo "   - $ADAPTER_DIR/${ADAPTER_NAME}.ts"
    echo "   - $ADAPTER_DIR/${ADAPTER_NAME}.spec.ts"
    if [ "$ADAPTER_TYPE" = "external" ]; then
        echo "   - Update or create $ADAPTER_DIR/index.ts"
    fi
else
    echo "✅ Backend ${ADAPTER_TYPE} adapter '${PASCAL_CASE_NAME}' created successfully!"
    echo "📁 Created files:"
    echo "   - $ADAPTER_DIR/${ADAPTER_NAME}.ts"
    echo "   - $ADAPTER_DIR/${ADAPTER_NAME}.spec.ts"
fi
echo ""
echo "Next steps:"
echo "1. Implement the adapter logic in ${ADAPTER_NAME}.ts"
echo "2. Update the configuration interface as needed"
echo "3. Add proper error handling and logging"
echo "4. Update tests to match your implementation"
if [ "$ADAPTER_TYPE" = "db" ]; then
    echo "5. Register the adapter in your server configuration"
elif [ "$ADAPTER_TYPE" = "external" ]; then
    echo "5. Use the service in your features via dependency injection"
fi