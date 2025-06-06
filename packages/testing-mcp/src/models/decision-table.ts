import { z } from 'zod';

// Decision table column types
export const ColumnTypeSchema = z.enum(['input', 'output', 'expected']);

// Input field constraints for automatic test generation
export const InputFieldConstraintsSchema = z.object({
  // String constraints
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(), // regex pattern
  allowedValues: z.array(z.any()).optional(), // enumerated values
  
  // Number constraints
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  
  // Boolean constraints
  required: z.boolean().optional().default(true),
  
  // Array constraints
  minItems: z.number().optional(),
  maxItems: z.number().optional(),
  uniqueItems: z.boolean().optional(),
  
  // Object constraints
  properties: z.record(z.string(), z.any()).optional(),
  
  // Cross-field dependencies
  dependsOn: z.array(z.string()).optional(), // field names this field depends on
  conflicts: z.array(z.string()).optional(), // field names this field conflicts with
});

// Test values for automatic generation
export const TestValuesSchema = z.object({
  valid: z.array(z.any()).optional(), // manually specified valid test values
  invalid: z.array(z.any()).optional(), // manually specified invalid test values
  boundary: z.array(z.any()).optional(), // boundary values
  equivalence: z.array(z.any()).optional(), // equivalence class representatives
});

// Coverage options for test generation
export const CoverageOptionsSchema = z.object({
  boundary: z.boolean().optional().default(true), // generate boundary value tests
  equivalence: z.boolean().optional().default(true), // generate equivalence class tests
  pairwise: z.boolean().optional().default(false), // generate pairwise combination tests
  errorCombinations: z.boolean().optional().default(true), // generate error condition combinations
  crossField: z.boolean().optional().default(false), // generate cross-field dependency tests
});

// Enhanced column definition with constraints and test generation support
export const InputFieldSchema = z.object({
  name: z.string(),
  type: z.literal('input'),
  description: z.string().optional(),
  dataType: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  constraints: InputFieldConstraintsSchema.optional(),
  testValues: TestValuesSchema.optional(),
});

// Regular column definition for non-input fields
export const ColumnSchema = z.object({
  name: z.string(),
  type: ColumnTypeSchema,
  description: z.string().optional(),
  dataType: z.enum(['string', 'number', 'boolean', 'object', 'array']).optional(),
});

// Row data - each row represents a test case
export const RowSchema = z.record(z.string(), z.any());

// Enhanced decision table with input fields and coverage options
export const DecisionTableSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  feature: z.string(), // e.g., "user-management"
  operation: z.string(), // e.g., "create-user"
  
  // Enhanced field definitions
  inputFields: z.array(InputFieldSchema).optional(), // input fields with constraints
  columns: z.array(ColumnSchema), // backward compatibility and output/expected columns
  
  // Test configuration
  coverageOptions: CoverageOptionsSchema.optional(),
  
  // Test cases (can be manually specified or auto-generated)
  rows: z.array(RowSchema),
  
  metadata: z.object({
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    version: z.string().default('2.0.0'), // version bump for enhanced format
    generatedTestCount: z.number().optional(),
    coverageAnalysis: z.object({
      boundaryTests: z.number().optional(),
      equivalenceTests: z.number().optional(),
      pairwiseTests: z.number().optional(),
      errorTests: z.number().optional(),
      totalCoverage: z.number().optional(), // percentage
    }).optional(),
  }).optional(),
});

// Test case analysis result
export const CoverageAnalysisSchema = z.object({
  totalTests: z.number(),
  coveragePercentage: z.number(),
  missingTests: z.array(z.object({
    type: z.enum(['boundary', 'equivalence', 'pairwise', 'error']),
    description: z.string(),
    suggestedValues: z.record(z.string(), z.any()),
  })),
  recommendations: z.array(z.string()),
});

export type ColumnType = z.infer<typeof ColumnTypeSchema>;
export type Column = z.infer<typeof ColumnSchema>;
export type InputField = z.infer<typeof InputFieldSchema>;
export type InputFieldConstraints = z.infer<typeof InputFieldConstraintsSchema>;
export type TestValues = z.infer<typeof TestValuesSchema>;
export type CoverageOptions = z.infer<typeof CoverageOptionsSchema>;
export type Row = z.infer<typeof RowSchema>;
export type DecisionTable = z.infer<typeof DecisionTableSchema>;
export type CoverageAnalysis = z.infer<typeof CoverageAnalysisSchema>;

// Helper functions
export function validateDecisionTable(data: unknown): DecisionTable {
  return DecisionTableSchema.parse(data);
}

export function createDecisionTable(params: {
  name: string;
  feature: string;
  operation: string;
  description?: string;
  inputFields?: InputField[];
  columns: Column[];
  coverageOptions?: CoverageOptions;
  rows: Row[];
}): DecisionTable {
  return {
    id: `${params.feature}-${params.operation}-${Date.now()}`,
    name: params.name,
    description: params.description,
    feature: params.feature,
    operation: params.operation,
    inputFields: params.inputFields,
    columns: params.columns,
    coverageOptions: params.coverageOptions,
    rows: params.rows,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '2.0.0',
    },
  };
}