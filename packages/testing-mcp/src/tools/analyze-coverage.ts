import { z } from 'zod';
import { loadDecisionTable } from '../utils/storage.js';
import { analyzeCoverage, CoverageReport } from '../utils/coverage-analyzer.js';
import { TestCaseGenerator, GeneratedTestCase } from '../generators/test-case-generator.js';

const inputSchema = z.object({
  tableId: z.string().describe('ID of the decision table to analyze for coverage'),
  detailed: z.boolean().optional().default(false).describe('Whether to include detailed gap analysis and suggestions'),
  generateMissing: z.boolean().optional().default(false).describe('Whether to generate missing test cases'),
});

export const analyzeCoverageTool = {
  name: 'analyze_coverage',
  description: 'Analyze test coverage for a decision table and identify gaps',
  inputSchema: {
    type: 'object',
    properties: {
      tableId: { 
        type: 'string', 
        description: 'ID of the decision table to analyze for coverage' 
      },
      detailed: { 
        type: 'boolean', 
        default: false,
        description: 'Whether to include detailed gap analysis and suggestions' 
      },
      generateMissing: { 
        type: 'boolean', 
        default: false,
        description: 'Whether to generate missing test cases' 
      },
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

    // Check if table has input fields for enhanced analysis
    if (!table.inputFields || table.inputFields.length === 0) {
      return {
        success: false,
        error: 'Decision table does not have enhanced input fields for coverage analysis. Please recreate with inputFields to enable comprehensive coverage analysis.',
        suggestion: 'Use the create_decision_table tool with inputFields and constraints to enable automatic coverage analysis.',
      };
    }

    try {
      // Perform coverage analysis
      const coverageReport: CoverageReport = analyzeCoverage(table);
      
      const result: any = {
        success: true,
        tableId: input.tableId,
        tableName: table.name,
        analysis: {
          totalTests: coverageReport.analysis.totalTests,
          coveragePercentage: coverageReport.analysis.coveragePercentage,
          missingTestCount: coverageReport.analysis.missingTests.length,
        },
        summary: {
          status: coverageReport.analysis.coveragePercentage >= 80 ? 'good' : 
                 coverageReport.analysis.coveragePercentage >= 60 ? 'moderate' : 'poor',
          recommendations: coverageReport.suggestions.slice(0, 3), // Top 3 recommendations
        },
      };

      // Add detailed analysis if requested
      if (input.detailed) {
        result.detailed = {
          fullAnalysis: coverageReport.analysis,
          allRecommendations: coverageReport.suggestions,
          gaps: coverageReport.gaps.map(gap => ({
            type: gap.type,
            description: gap.description,
            priority: gap.type === 'boundary' || gap.type === 'error' ? 'high' : 'medium',
          })),
          fieldCoverage: analyzeCoverageTool.analyzeFieldSpecificCoverage(table),
        };
      }

      // Generate missing test cases if requested
      if (input.generateMissing && table.inputFields) {
        const generator = new TestCaseGenerator(table.inputFields, table.coverageOptions);
        const idealTests = generator.generateComprehensiveTestCases();
        
        // Find missing tests
        const missingTests = idealTests.filter(idealTest => 
          !analyzeCoverageTool.isTestCovered(idealTest, table.rows)
        );

        result.missingTestCases = missingTests.slice(0, 10).map(test => ({
          type: test.type,
          description: test.description,
          inputs: test.inputs,
          expectedResult: test.expectedResult,
          expectedError: test.expectedError,
          priority: test.type === 'boundary' || test.type === 'error' ? 'high' : 'medium',
        }));

        result.generationSummary = {
          totalMissing: missingTests.length,
          returned: Math.min(10, missingTests.length),
          note: missingTests.length > 10 ? 'Showing top 10 missing tests. Run generate_tests to create all missing tests.' : undefined,
        };
      }

      return result;
      
    } catch (error) {
      return {
        success: false,
        error: `Coverage analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },

  // Helper method to check if a test case is covered
  isTestCovered(idealTest: GeneratedTestCase, existingRows: any[]): boolean {
    return existingRows.some(row => {
      // Check if inputs match
      const inputsMatch = Object.entries(idealTest.inputs).every(([key, value]) => {
        return this.valuesEqual(row[key], value);
      });

      if (!inputsMatch) return false;

      // Check expected result
      const rowSuccess = row.success !== false && !row.isError;
      const idealSuccess = idealTest.expectedResult === 'success';
      
      return rowSuccess === idealSuccess;
    });
  },

  valuesEqual(value1: any, value2: any): boolean {
    if (value1 == null && value2 == null) return true;
    if (value1 == null || value2 == null) return false;
    
    if (typeof value1 !== 'object' && typeof value2 !== 'object') {
      return value1 === value2;
    }
    
    if (Array.isArray(value1) && Array.isArray(value2)) {
      return value1.length === value2.length && 
             value1.every((item, index) => this.valuesEqual(item, value2[index]));
    }
    
    if (typeof value1 === 'object' && typeof value2 === 'object') {
      const keys1 = Object.keys(value1);
      const keys2 = Object.keys(value2);
      
      return keys1.length === keys2.length &&
             keys1.every(key => keys2.includes(key) && this.valuesEqual(value1[key], value2[key]));
    }
    
    return false;
  },

  analyzeFieldSpecificCoverage(table: any): Record<string, any> {
    const fieldCoverage: Record<string, any> = {};
    
    if (!table.inputFields) return fieldCoverage;
    
    for (const field of table.inputFields) {
      const generator = new TestCaseGenerator([field], { 
        boundary: true, 
        equivalence: true 
      });
      const fieldTests = generator.generateComprehensiveTestCases();
      
      const coveredTests = fieldTests.filter(test => analyzeCoverageTool.isTestCovered(test, table.rows));
      const coverage = fieldTests.length > 0 ? (coveredTests.length / fieldTests.length) * 100 : 100;
      
      fieldCoverage[field.name] = {
        coverage: Math.round(coverage),
        totalNeeded: fieldTests.length,
        covered: coveredTests.length,
        status: coverage >= 80 ? 'good' : coverage >= 60 ? 'moderate' : 'poor',
      };
    }
    
    return fieldCoverage;
  },
};