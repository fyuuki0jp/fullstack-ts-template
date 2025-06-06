import { z } from 'zod';
import { loadDecisionTable } from '../utils/storage.js';
import { VitestGenerator } from '../generators/vitest-generator.js';
import { promises as fs } from 'fs';
import path from 'path';

const inputSchema = z.object({
  tableId: z.string().describe('ID of the decision table to use for test generation'),
  outputPath: z.string().optional().describe('Path where to save the generated test file'),
  preview: z.boolean().optional().default(false).describe('If true, only preview the generated tests without saving'),
});

export const generateTestsTool = {
  name: 'generate_tests',
  description: 'Generate Vitest tests from a decision table',
  inputSchema: {
    type: 'object',
    properties: {
      tableId: { type: 'string', description: 'ID of the decision table to use for test generation' },
      outputPath: { type: 'string', description: 'Path where to save the generated test file' },
      preview: { type: 'boolean', description: 'If true, only preview the generated tests without saving' },
    },
    required: ['tableId'],
  },
  execute: async (args: unknown) => {
    const input = inputSchema.parse(args);
    
    // Load the decision table
    const table = await loadDecisionTable(input.tableId);
    if (!table) {
      return {
        success: false,
        error: `Decision table with ID '${input.tableId}' not found`,
      };
    }
    
    // Generate tests
    const generator = new VitestGenerator(table);
    const testCode = generator.generateTestSuite();
    
    // If preview mode, just return the generated code
    if (input.preview) {
      return {
        success: true,
        preview: true,
        code: testCode,
        message: 'Test preview generated successfully',
      };
    }
    
    // Determine output path
    const outputPath = input.outputPath || 
      path.join(
        process.cwd(),
        'backend',
        'src',
        'features',
        table.feature,
        table.operation.includes('command') ? 'commands' : 'queries',
        `${table.operation}.spec.ts`
      );
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write the test file
    await fs.writeFile(outputPath, testCode);
    
    return {
      success: true,
      outputPath,
      message: `Tests generated successfully at ${outputPath}`,
      code: testCode,
    };
  },
};