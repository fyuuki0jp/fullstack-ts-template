import { z } from 'zod';
import { listDecisionTables } from '../utils/storage.js';

const inputSchema = z.object({
  feature: z.string().optional().describe('Filter by feature name'),
  operation: z.string().optional().describe('Filter by operation name'),
});

export const listDecisionTablesTool = {
  name: 'list_decision_tables',
  description: 'List all available decision tables',
  inputSchema: {
    type: 'object',
    properties: {
      feature: { type: 'string', description: 'Filter by feature name' },
      operation: { type: 'string', description: 'Filter by operation name' },
    },
  },
  execute: async (args: unknown) => {
    const input = inputSchema.parse(args);
    let tables = await listDecisionTables();
    
    // Apply filters if provided
    if (input.feature) {
      tables = tables.filter(t => t.feature === input.feature);
    }
    
    if (input.operation) {
      tables = tables.filter(t => t.operation === input.operation);
    }
    
    return {
      success: true,
      count: tables.length,
      tables: tables.map(t => ({
        id: t.id,
        name: t.name,
        feature: t.feature,
        operation: t.operation,
        description: t.description,
        rowCount: t.rows.length,
        createdAt: t.metadata?.createdAt,
      })),
    };
  },
};