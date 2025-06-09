import { DecisionTable, CoverageAnalysis, InputField, Row } from '../models/decision-table.js';
import { TestCaseGenerator, GeneratedTestCase } from '../generators/test-case-generator.js';

export interface CoverageReport {
  analysis: CoverageAnalysis;
  suggestions: string[];
  gaps: Array<{
    type: 'boundary' | 'equivalence' | 'pairwise' | 'error';
    description: string;
    missingTestCase: GeneratedTestCase;
  }>;
}

export class CoverageAnalyzer {
  private table: DecisionTable;
  private inputFields: InputField[];

  constructor(table: DecisionTable) {
    this.table = table;
    this.inputFields = table.inputFields || [];
  }

  analyzeCoverage(): CoverageReport {
    const existingTests = this.table.rows;
    const generator = new TestCaseGenerator(this.inputFields, this.table.coverageOptions);
    const idealTests = generator.generateComprehensiveTestCases();

    const analysis = this.calculateCoverageMetrics(existingTests, idealTests);
    const gaps = this.identifyGaps(existingTests, idealTests);
    const suggestions = this.generateSuggestions(analysis, gaps);

    return {
      analysis,
      suggestions,
      gaps,
    };
  }

  private calculateCoverageMetrics(existingTests: Row[], idealTests: GeneratedTestCase[]): CoverageAnalysis {
    const boundaryTests = this.countCoveredTests('boundary', existingTests, idealTests);
    const equivalenceTests = this.countCoveredTests('equivalence', existingTests, idealTests);
    const pairwiseTests = this.countCoveredTests('pairwise', existingTests, idealTests);
    const errorTests = this.countCoveredTests('error', existingTests, idealTests);

    const totalIdealTests = idealTests.length;
    const totalCoveredTests = boundaryTests.covered + equivalenceTests.covered + 
                             pairwiseTests.covered + errorTests.covered;
    
    const coveragePercentage = totalIdealTests > 0 ? 
      Math.round((totalCoveredTests / totalIdealTests) * 100) : 100;

    const missingTests = idealTests
      .filter(ideal => !this.isTestCaseCovered(ideal, existingTests))
      .filter(ideal => ideal.type !== 'manual') // Exclude manual tests from missing analysis
      .map(ideal => ({
        type: ideal.type as 'boundary' | 'equivalence' | 'pairwise' | 'error',
        description: ideal.description,
        suggestedValues: ideal.inputs,
      }));

    const recommendations = this.generateRecommendations(
      boundaryTests, equivalenceTests, pairwiseTests, errorTests, totalIdealTests
    );

    return {
      totalTests: existingTests.length,
      coveragePercentage,
      missingTests,
      recommendations,
    };
  }

  private countCoveredTests(
    testType: string, 
    existingTests: Row[], 
    idealTests: GeneratedTestCase[]
  ): { covered: number; total: number } {
    const idealOfType = idealTests.filter(test => test.type === testType);
    const coveredCount = idealOfType.filter(ideal => 
      this.isTestCaseCovered(ideal, existingTests)
    ).length;

    return {
      covered: coveredCount,
      total: idealOfType.length,
    };
  }

  private isTestCaseCovered(idealTest: GeneratedTestCase, existingTests: Row[]): boolean {
    return existingTests.some(existing => {
      // Check if the input values match
      const inputsMatch = this.inputsMatch(idealTest.inputs, existing);
      
      // Check if the expected result matches
      const expectedResultMatches = this.expectedResultMatches(idealTest, existing);
      
      return inputsMatch && expectedResultMatches;
    });
  }

  private inputsMatch(idealInputs: Record<string, any>, existingTest: Row): boolean {
    // Check if all ideal inputs are present and match in the existing test
    for (const [key, idealValue] of Object.entries(idealInputs)) {
      const existingValue = existingTest[key];
      
      if (!this.valuesEqual(idealValue, existingValue)) {
        return false;
      }
    }
    
    return true;
  }

  private expectedResultMatches(idealTest: GeneratedTestCase, existingTest: Row): boolean {
    // Check success/error expectation
    const existingSuccess = existingTest.success !== false && !existingTest.isError;
    const idealSuccess = idealTest.expectedResult === 'success';
    
    if (existingSuccess !== idealSuccess) {
      return false;
    }

    // If error is expected, check error message similarity
    if (idealTest.expectedResult === 'error' && idealTest.expectedError) {
      const existingError = existingTest.errorMessage || existingTest.error;
      if (existingError && typeof existingError === 'string') {
        // Simple keyword matching for error messages
        const idealKeywords = idealTest.expectedError.toLowerCase().split(/\s+/);
        const existingLower = existingError.toLowerCase();
        
        return idealKeywords.some(keyword => existingLower.includes(keyword));
      }
    }

    return true;
  }

  private valuesEqual(value1: any, value2: any): boolean {
    // Handle null/undefined
    if (value1 == null && value2 == null) return true;
    if (value1 == null || value2 == null) return false;

    // Handle primitives
    if (typeof value1 !== 'object' && typeof value2 !== 'object') {
      return value1 === value2;
    }

    // Handle arrays
    if (Array.isArray(value1) && Array.isArray(value2)) {
      if (value1.length !== value2.length) return false;
      return value1.every((item, index) => this.valuesEqual(item, value2[index]));
    }

    // Handle objects
    if (typeof value1 === 'object' && typeof value2 === 'object') {
      const keys1 = Object.keys(value1);
      const keys2 = Object.keys(value2);
      
      if (keys1.length !== keys2.length) return false;
      
      return keys1.every(key => 
        keys2.includes(key) && this.valuesEqual(value1[key], value2[key])
      );
    }

    return false;
  }

  private identifyGaps(existingTests: Row[], idealTests: GeneratedTestCase[]): Array<{
    type: 'boundary' | 'equivalence' | 'pairwise' | 'error';
    description: string;
    missingTestCase: GeneratedTestCase;
  }> {
    const gaps: Array<{
      type: 'boundary' | 'equivalence' | 'pairwise' | 'error';
      description: string;
      missingTestCase: GeneratedTestCase;
    }> = [];

    for (const idealTest of idealTests) {
      if (!this.isTestCaseCovered(idealTest, existingTests)) {
        gaps.push({
          type: idealTest.type as 'boundary' | 'equivalence' | 'pairwise' | 'error',
          description: `Missing ${idealTest.type} test: ${idealTest.description}`,
          missingTestCase: idealTest,
        });
      }
    }

    return gaps;
  }

  private generateRecommendations(
    boundaryTests: { covered: number; total: number },
    equivalenceTests: { covered: number; total: number },
    pairwiseTests: { covered: number; total: number },
    errorTests: { covered: number; total: number },
    totalIdealTests: number
  ): string[] {
    const recommendations: string[] = [];

    // Calculate coverage percentages
    const boundaryCoverage = boundaryTests.total > 0 ? 
      (boundaryTests.covered / boundaryTests.total) * 100 : 100;
    const equivalenceCoverage = equivalenceTests.total > 0 ? 
      (equivalenceTests.covered / equivalenceTests.total) * 100 : 100;
    const pairwiseCoverage = pairwiseTests.total > 0 ? 
      (pairwiseTests.covered / pairwiseTests.total) * 100 : 100;
    const errorCoverage = errorTests.total > 0 ? 
      (errorTests.covered / errorTests.total) * 100 : 100;

    // Priority recommendations based on coverage gaps
    if (boundaryCoverage < 80) {
      recommendations.push(
        `Boundary value testing coverage is low (${Math.round(boundaryCoverage)}%). ` +
        `Add ${boundaryTests.total - boundaryTests.covered} more boundary tests.`
      );
    }

    if (equivalenceCoverage < 80) {
      recommendations.push(
        `Equivalence class testing coverage is low (${Math.round(equivalenceCoverage)}%). ` +
        `Add ${equivalenceTests.total - equivalenceTests.covered} more equivalence tests.`
      );
    }

    if (errorCoverage < 70) {
      recommendations.push(
        `Error handling testing coverage is low (${Math.round(errorCoverage)}%). ` +
        `Add ${errorTests.total - errorTests.covered} more error condition tests.`
      );
    }

    if (pairwiseTests.total > 0 && pairwiseCoverage < 50) {
      recommendations.push(
        `Pairwise combination testing coverage is low (${Math.round(pairwiseCoverage)}%). ` +
        `Consider adding ${pairwiseTests.total - pairwiseTests.covered} more combination tests.`
      );
    }

    // General recommendations
    const totalCoverage = totalIdealTests > 0 ? 
      ((boundaryTests.covered + equivalenceTests.covered + pairwiseTests.covered + errorTests.covered) / totalIdealTests) * 100 : 100;

    if (totalCoverage < 60) {
      recommendations.push(
        'Overall test coverage is quite low. Consider using automatic test generation to improve coverage.'
      );
    } else if (totalCoverage < 80) {
      recommendations.push(
        'Test coverage is moderate. Focus on adding missing boundary and error condition tests.'
      );
    } else if (totalCoverage >= 90) {
      recommendations.push(
        'Excellent test coverage! Consider adding integration and performance tests.'
      );
    }

    // Field-specific recommendations
    const fieldCoverage = this.analyzeFieldCoverage();
    for (const [fieldName, coverage] of Object.entries(fieldCoverage)) {
      if (coverage < 50) {
        recommendations.push(
          `Field '${fieldName}' has low test coverage (${Math.round(coverage)}%). ` +
          'Add more tests for different values and edge cases.'
        );
      }
    }

    return recommendations;
  }

  private analyzeFieldCoverage(): Record<string, number> {
    const fieldCoverage: Record<string, number> = {};
    
    for (const field of this.inputFields) {
      const generator = new TestCaseGenerator([field], { 
        boundary: true, 
        equivalence: true 
      });
      const idealTests = generator.generateComprehensiveTestCases();
      const covered = idealTests.filter(ideal => 
        this.isTestCaseCovered(ideal, this.table.rows)
      ).length;
      
      fieldCoverage[field.name] = idealTests.length > 0 ? 
        (covered / idealTests.length) * 100 : 100;
    }
    
    return fieldCoverage;
  }

  private generateSuggestions(analysis: CoverageAnalysis, gaps: Array<{
    type: 'boundary' | 'equivalence' | 'pairwise' | 'error';
    description: string;
    missingTestCase: GeneratedTestCase;
  }>): string[] {
    const suggestions: string[] = [];

    // High-priority gaps
    const boundaryGaps = gaps.filter(g => g.type === 'boundary');
    const errorGaps = gaps.filter(g => g.type === 'error');
    
    if (boundaryGaps.length > 0) {
      suggestions.push(
        `Add ${boundaryGaps.length} boundary value tests for better edge case coverage.`
      );
    }

    if (errorGaps.length > 0) {
      suggestions.push(
        `Add ${errorGaps.length} error condition tests to improve error handling validation.`
      );
    }

    // Specific field suggestions
    const fieldsMissingTests = this.getFieldsMissingTests(gaps);
    for (const field of fieldsMissingTests) {
      suggestions.push(
        `Field '${field}' needs additional test coverage for various input scenarios.`
      );
    }

    // Coverage improvement suggestions
    if (analysis.coveragePercentage < 80) {
      suggestions.push(
        'Consider using automatic test generation to quickly improve overall coverage.'
      );
    }

    return suggestions;
  }

  private getFieldsMissingTests(gaps: Array<{
    type: 'boundary' | 'equivalence' | 'pairwise' | 'error';
    description: string;
    missingTestCase: GeneratedTestCase;
  }>): string[] {
    const fieldsWithGaps = new Set<string>();
    
    for (const gap of gaps) {
      for (const fieldName of Object.keys(gap.missingTestCase.inputs)) {
        fieldsWithGaps.add(fieldName);
      }
    }
    
    return Array.from(fieldsWithGaps);
  }
}

export function analyzeCoverage(table: DecisionTable): CoverageReport {
  const analyzer = new CoverageAnalyzer(table);
  return analyzer.analyzeCoverage();
}