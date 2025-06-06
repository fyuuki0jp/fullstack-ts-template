import { z } from 'zod';
import { loadDecisionTable } from '../utils/storage.js';

const inputSchema = z.object({
  id: z.string().describe('ID of the decision table to retrieve'),
});

export const getDecisionTableTool = {
  name: 'get_decision_table',
  description: 'Get a specific decision table by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID of the decision table to retrieve' },
    },
    required: ['id'],
  },
  execute: async (args: unknown) => {
    const input = inputSchema.parse(args);
    const table = await loadDecisionTable(input.id);
    
    if (!table) {
      return {
        success: false,
        error: `Decision table with ID '${input.id}' not found`,
      };
    }
    
    return {
      success: true,
      table,
    };
  },
};