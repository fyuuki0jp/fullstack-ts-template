import { z } from 'zod';
import { createDecisionTable, Column, Row, InputField, CoverageOptions } from '../models/decision-table.js';
import { saveDecisionTable } from '../utils/storage.js';
import { TestCaseGenerator } from '../generators/test-case-generator.js';

const inputSchema = z.object({
  name: z.string().describe('Name of the decision table'),
  feature: z.string().describe('Feature name (e.g., user-management)'),
  operation: z.string().describe('Operation name (e.g., create-user)'),
  description: z.string().optional().describe('Description of the decision table'),
  
  // Enhanced input fields with constraints for automatic test generation
  inputFields: z.array(z.object({
    name: z.string(),
    type: z.literal('input'),
    description: z.string().optional(),
    dataType: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    constraints: z.object({
      // String constraints
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional(),
      allowedValues: z.array(z.any()).optional(),
      
      // Number constraints
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().optional(),
      
      // Boolean/general constraints
      required: z.boolean().optional().default(true),
      
      // Array constraints
      minItems: z.number().optional(),
      maxItems: z.number().optional(),
      uniqueItems: z.boolean().optional(),
      
      // Object constraints
      properties: z.record(z.string(), z.any()).optional(),
      
      // Cross-field dependencies
      dependsOn: z.array(z.string()).optional(),
      conflicts: z.array(z.string()).optional(),
    }).optional(),
    testValues: z.object({
      valid: z.array(z.any()).optional(),
      invalid: z.array(z.any()).optional(),
      boundary: z.array(z.any()).optional(),
      equivalence: z.array(z.any()).optional(),
    }).optional(),
  })).optional().describe('Enhanced input field definitions with constraints for automatic test generation'),
  
  // Coverage options for test generation
  coverageOptions: z.object({
    boundary: z.boolean().optional().default(true),
    equivalence: z.boolean().optional().default(true),
    pairwise: z.boolean().optional().default(false),
    errorCombinations: z.boolean().optional().default(true),
    crossField: z.boolean().optional().default(false),
  }).optional().describe('Test coverage options for automatic generation'),
  
  // Backward compatibility: regular columns for output/expected fields
  columns: z.array(z.object({
    name: z.string(),
    type: z.enum(['input', 'output', 'expected']),
    description: z.string().optional(),
    dataType: z.enum(['string', 'number', 'boolean', 'object', 'array']).optional(),
  })).describe('Column definitions for the decision table'),
  
  // Test case rows (can be manually specified or auto-generated)
  rows: z.array(z.record(z.string(), z.any())).optional().describe('Manual test case rows (optional if using automatic generation)'),
  
  // Option to automatically generate test cases based on input fields
  autoGenerate: z.boolean().optional().default(false).describe('Whether to automatically generate test cases based on input field constraints'),
});

export const createDecisionTableTool = {
  name: 'create_decision_table',
  description: 'Create a new decision table for test generation with enhanced constraint-based automatic test generation',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Name of the decision table' },
      feature: { type: 'string', description: 'Feature name (e.g., user-management)' },
      operation: { type: 'string', description: 'Operation name (e.g., create-user)' },
      description: { type: 'string', description: 'Description of the decision table' },
      
      inputFields: {
        type: 'array',
        description: 'Enhanced input field definitions with constraints for automatic test generation',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['input'] },
            description: { type: 'string' },
            dataType: { type: 'string', enum: ['string', 'number', 'boolean', 'object', 'array'] },
            constraints: {
              type: 'object',
              properties: {
                minLength: { type: 'number' },
                maxLength: { type: 'number' },
                pattern: { type: 'string' },
                allowedValues: { type: 'array' },
                min: { type: 'number' },
                max: { type: 'number' },
                step: { type: 'number' },
                required: { type: 'boolean', default: true },
                minItems: { type: 'number' },
                maxItems: { type: 'number' },
                uniqueItems: { type: 'boolean' },
                properties: { type: 'object' },
                dependsOn: { type: 'array', items: { type: 'string' } },
                conflicts: { type: 'array', items: { type: 'string' } },
              },
            },
            testValues: {
              type: 'object',
              properties: {
                valid: { type: 'array' },
                invalid: { type: 'array' },
                boundary: { type: 'array' },
                equivalence: { type: 'array' },
              },
            },
          },
          required: ['name', 'type', 'dataType'],
        },
      },
      
      coverageOptions: {
        type: 'object',
        description: 'Test coverage options for automatic generation',
        properties: {
          boundary: { type: 'boolean', default: true },
          equivalence: { type: 'boolean', default: true },
          pairwise: { type: 'boolean', default: false },
          errorCombinations: { type: 'boolean', default: true },
          crossField: { type: 'boolean', default: false },
        },
      },
      
      columns: {
        type: 'array',
        description: 'Column definitions for output/expected fields',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['input', 'output', 'expected'] },
            description: { type: 'string' },
            dataType: { type: 'string', enum: ['string', 'number', 'boolean', 'object', 'array'] },
          },
          required: ['name', 'type'],
        },
      },
      
      rows: {
        type: 'array',
        description: 'Manual test case rows (optional if using automatic generation)',
        items: {
          type: 'object',
          additionalProperties: true,
        },
      },
      
      autoGenerate: {
        type: 'boolean',
        default: false,
        description: 'Whether to automatically generate test cases based on input field constraints',
      },
    },
    required: ['name', 'feature', 'operation', 'columns'],
  },
  execute: async (args: unknown) => {
    const input = inputSchema.parse(args);
    
    let rows = input.rows || [];
    
    // Auto-generate test cases if requested and input fields are provided
    if (input.autoGenerate && input.inputFields && input.inputFields.length > 0) {
      const generator = new TestCaseGenerator(
        input.inputFields as InputField[],
        input.coverageOptions as CoverageOptions
      );
      
      const generatedTests = generator.generateComprehensiveTestCases();
      
      // Convert generated test cases to table rows
      const generatedRows = generatedTests.map(test => {
        const row: Record<string, any> = {
          testDescription: test.description,
          testType: test.type,
          ...test.inputs,
        };
        
        // Add expected results
        if (test.expectedResult === 'success') {
          row.success = true;
          row.isError = false;
        } else {
          row.success = false;
          row.isError = true;
          if (test.expectedError) {
            row.errorMessage = test.expectedError;
          }
        }
        
        return row;
      });
      
      // Merge manual and generated rows
      rows = [...rows, ...generatedRows];
    }
    
    const table = createDecisionTable({
      name: input.name,
      feature: input.feature,
      operation: input.operation,
      description: input.description,
      inputFields: input.inputFields as InputField[],
      columns: input.columns as Column[],
      coverageOptions: input.coverageOptions as CoverageOptions,
      rows: rows as Row[],
    });
    
    // Update metadata with generation info
    if (table.metadata && input.autoGenerate) {
      table.metadata.generatedTestCount = rows.length - (input.rows?.length || 0);
    }
    
    await saveDecisionTable(table);
    
    return {
      success: true,
      id: table.id,
      message: `Decision table '${table.name}' created successfully${input.autoGenerate ? ` with ${table.metadata?.generatedTestCount || 0} auto-generated tests` : ''}`,
      table,
      stats: {
        totalTests: rows.length,
        manualTests: input.rows?.length || 0,
        generatedTests: input.autoGenerate ? (rows.length - (input.rows?.length || 0)) : 0,
      },
    };
  },
};