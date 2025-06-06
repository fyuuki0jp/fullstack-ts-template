import { DecisionTable } from '../models/decision-table.js';

interface TestCase {
  description: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  expected: Record<string, any>;
  metadata?: {
    testType?: string;
    priority?: string;
    category?: string;
  };
}

export class VitestGenerator {
  private table: DecisionTable;
  
  constructor(table: DecisionTable) {
    this.table = table;
  }

  generateTestSuite(): string {
    const testCases = this.extractTestCases();
    const imports = this.generateImports();
    const setup = this.generateSetup();
    const tests = this.generateTests(testCases);
    const coverage = this.generateCoverageComment();
    
    return `${coverage}${imports}

describe('${this.table.name}', () => {
${setup}

${tests}
});`;
  }

  private extractTestCases(): TestCase[] {
    return this.table.rows.map((row) => {
      const inputs: Record<string, any> = {};
      const outputs: Record<string, any> = {};
      const expected: Record<string, any> = {};
      
      // Handle enhanced input fields
      if (this.table.inputFields) {
        this.table.inputFields.forEach(field => {
          if (row[field.name] !== undefined) {
            inputs[field.name] = row[field.name];
          }
        });
      }
      
      // Handle regular columns
      this.table.columns.forEach(column => {
        const value = row[column.name];
        
        switch (column.type) {
          case 'input':
            inputs[column.name] = value;
            break;
          case 'output':
            outputs[column.name] = value;
            break;
          case 'expected':
            expected[column.name] = value;
            break;
        }
      });
      
      // Generate description from row data
      const description = row['testDescription'] || 
        this.generateTestDescription(inputs, expected);
      
      // Include test metadata if available
      const metadata = {
        testType: row['testType'],
        priority: row['priority'],
        category: row['category'],
      };
      
      return { description, inputs, outputs, expected, metadata };
    });
  }

  private generateTestDescription(inputs: Record<string, any>, expected: Record<string, any>): string {
    const hasError = expected.success === false || expected.isError === true;
    
    if (hasError) {
      return `should return error when ${this.describeInputs(inputs)}`;
    }
    
    return `should succeed when ${this.describeInputs(inputs)}`;
  }

  private describeInputs(inputs: Record<string, any>): string {
    const descriptions: string[] = [];
    
    for (const [key, value] of Object.entries(inputs)) {
      if (value === null || value === undefined) {
        descriptions.push(`${key} is missing`);
      } else if (value === '') {
        descriptions.push(`${key} is empty`);
      } else if (typeof value === 'string' && value.length > 50) {
        descriptions.push(`${key} is too long`);
      } else {
        descriptions.push(`${key} is "${value}"`);
      }
    }
    
    return descriptions.join(' and ');
  }

  private generateImports(): string {
    const operation = this.table.operation;
    
    return `import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ${operation} } from './${operation}.js';
import { setupTestDatabase } from '@/shared/adapters/db/test-utils.js';
import { isErr } from '@/shared/utils/result.js';
import type { DrizzleClient } from '@/shared/adapters/db/index.js';`;
  }

  private generateSetup(): string {
    return `  let db: DrizzleClient;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await db.$client.end();
  });`;
  }

  private generateTests(testCases: TestCase[]): string {
    // Group tests by category if metadata is available
    const groupedTests = this.groupTestsByCategory(testCases);
    
    let testsOutput = '';
    
    for (const [category, tests] of Object.entries(groupedTests)) {
      if (category !== 'default' && tests.length > 1) {
        testsOutput += `\n  describe('${category}', () => {\n`;
        testsOutput += tests.map(test => this.generateSingleTest(test, '    ')).join('\n\n');
        testsOutput += '\n  });\n';
      } else {
        testsOutput += tests.map(test => this.generateSingleTest(test)).join('\n\n');
      }
    }
    
    return testsOutput;
  }

  private generateSingleTest(testCase: TestCase, indent: string = '  '): string {
    const { description, inputs, expected, metadata } = testCase;
    const hasError = expected.success === false || expected.isError === true;
    
    // Add test priority as a comment if available
    let testOutput = '';
    if (metadata?.priority && metadata.priority !== 'medium') {
      testOutput += `${indent}// Priority: ${metadata.priority}\n`;
    }
    
    if (hasError) {
      testOutput += this.generateErrorTest(description, inputs, expected, indent);
    } else {
      testOutput += this.generateSuccessTest(description, inputs, expected, indent);
    }
    
    return testOutput;
  }

  private generateSuccessTest(description: string, inputs: Record<string, any>, expected: Record<string, any>, indent: string = '  '): string {
    const inputsStr = this.formatInputObject(inputs, indent);
    const assertions = this.generateSuccessAssertions(expected, indent);
    
    return `${indent}it('${description}', async () => {
${indent}  const result = await ${this.table.operation}.inject({ db }).execute(${inputsStr});
${indent}  
${indent}  expect(result.success).toBe(true);
${indent}  if (result.success) {
${assertions}
${indent}  }
${indent}});`;
  }

  private generateErrorTest(description: string, inputs: Record<string, any>, expected: Record<string, any>, indent: string = '  '): string {
    const inputsStr = this.formatInputObject(inputs, indent);
    const errorMessage = expected.errorMessage || expected.error;
    
    return `${indent}it('${description}', async () => {
${indent}  const result = await ${this.table.operation}.inject({ db }).execute(${inputsStr});
${indent}  
${indent}  expect(isErr(result)).toBe(true);
${indent}  if (isErr(result)) {
${errorMessage ? `${indent}    expect(result.error.message).toContain('${errorMessage}');` : `${indent}    expect(result.error).toBeDefined();`}
${indent}  }
${indent}});`;
  }

  private formatInputObject(inputs: Record<string, any>, indent: string = '  '): string {
    const formatted = JSON.stringify(inputs, null, 6);
    return formatted.split('\n').map((line, index) => {
      if (index === 0) return line;
      return indent + '    ' + line;
    }).join('\n');
  }

  private generateSuccessAssertions(expected: Record<string, any>, indent: string = '  '): string {
    const assertions: string[] = [];
    
    for (const [key, value] of Object.entries(expected)) {
      if (key === 'success' || key === 'isError') continue;
      
      if (typeof value === 'object' && value !== null) {
        assertions.push(`${indent}    expect(result.data.${key}).toMatchObject(${JSON.stringify(value)});`);
      } else {
        assertions.push(`${indent}    expect(result.data.${key}).toBe(${JSON.stringify(value)});`);
      }
    }
    
    return assertions.join('\n');
  }

  private generateCoverageComment(): string {
    if (!this.table.metadata?.coverageAnalysis) {
      return '';
    }

    const coverage = this.table.metadata.coverageAnalysis;
    return `/**
 * Test Coverage Summary:
 * - Total Tests: ${this.table.rows.length}
 * - Boundary Tests: ${coverage.boundaryTests || 0}
 * - Equivalence Tests: ${coverage.equivalenceTests || 0}
 * - Error Tests: ${coverage.errorTests || 0}
 * - Overall Coverage: ${coverage.totalCoverage || 0}%
 * 
 * Generated by Testing MCP v2.0
 */

`;
  }

  private groupTestsByCategory(testCases: TestCase[]): Record<string, TestCase[]> {
    const grouped: Record<string, TestCase[]> = {
      'default': [],
    };

    for (const testCase of testCases) {
      const category = testCase.metadata?.testType || testCase.metadata?.category || 'default';
      
      if (!grouped[category]) {
        grouped[category] = [];
      }
      
      grouped[category].push(testCase);
    }

    // Clean up category names for better test organization
    const cleanedGrouped: Record<string, TestCase[]> = {};
    
    for (const [category, tests] of Object.entries(grouped)) {
      let cleanCategory = category;
      
      switch (category) {
        case 'boundary':
          cleanCategory = 'Boundary Value Tests';
          break;
        case 'equivalence':
          cleanCategory = 'Equivalence Class Tests';
          break;
        case 'error':
          cleanCategory = 'Error Handling Tests';
          break;
        case 'pairwise':
          cleanCategory = 'Pairwise Combination Tests';
          break;
        case 'manual':
          cleanCategory = 'Manual Test Cases';
          break;
      }
      
      cleanedGrouped[cleanCategory] = tests;
    }

    return cleanedGrouped;
  }
}