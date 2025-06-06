import { InputField, CoverageOptions } from '../models/decision-table.js';

export interface GeneratedTestCase {
  type: 'boundary' | 'equivalence' | 'pairwise' | 'error' | 'manual';
  description: string;
  inputs: Record<string, any>;
  expectedResult: 'success' | 'error';
  expectedError?: string;
  metadata?: {
    testClass?: string;
    boundary?: string;
    equivalenceClass?: string;
  };
}

export class TestCaseGenerator {
  private inputFields: InputField[];
  private coverageOptions: CoverageOptions;

  constructor(inputFields: InputField[], coverageOptions?: Partial<CoverageOptions>) {
    this.inputFields = inputFields;
    
    const defaultOptions: CoverageOptions = {
      boundary: true,
      equivalence: true,
      pairwise: false,
      errorCombinations: true,
      crossField: false,
    };
    
    this.coverageOptions = {
      ...defaultOptions,
      ...coverageOptions,
    };
  }

  generateComprehensiveTestCases(): GeneratedTestCase[] {
    const testCases: GeneratedTestCase[] = [];

    // Generate boundary value tests
    if (this.coverageOptions.boundary) {
      testCases.push(...this.generateBoundaryValueTests());
    }

    // Generate equivalence class tests
    if (this.coverageOptions.equivalence) {
      testCases.push(...this.generateEquivalenceClassTests());
    }

    // Generate pairwise combination tests
    if (this.coverageOptions.pairwise) {
      testCases.push(...this.generatePairwiseTests());
    }

    // Generate error combination tests
    if (this.coverageOptions.errorCombinations) {
      testCases.push(...this.generateErrorCombinationTests());
    }

    // Generate cross-field dependency tests
    if (this.coverageOptions.crossField) {
      testCases.push(...this.generateCrossFieldTests());
    }

    return this.deduplicateTestCases(testCases);
  }

  private generateBoundaryValueTests(): GeneratedTestCase[] {
    const testCases: GeneratedTestCase[] = [];

    for (const field of this.inputFields) {
      const boundaries = this.getBoundaryValues(field);
      
      for (const boundary of boundaries) {
        const inputs = this.createBaseInputs();
        inputs[field.name] = boundary.value;

        testCases.push({
          type: 'boundary',
          description: `should ${boundary.expectedResult} when ${field.name} is ${boundary.description}`,
          inputs,
          expectedResult: boundary.expectedResult,
          expectedError: boundary.expectedError,
          metadata: {
            testClass: 'boundary',
            boundary: boundary.description,
          },
        });
      }
    }

    return testCases;
  }

  private generateEquivalenceClassTests(): GeneratedTestCase[] {
    const testCases: GeneratedTestCase[] = [];

    for (const field of this.inputFields) {
      const equivalenceClasses = this.getEquivalenceClasses(field);
      
      for (const eqClass of equivalenceClasses) {
        const inputs = this.createBaseInputs();
        inputs[field.name] = eqClass.value;

        testCases.push({
          type: 'equivalence',
          description: `should ${eqClass.expectedResult} when ${field.name} is ${eqClass.description}`,
          inputs,
          expectedResult: eqClass.expectedResult,
          expectedError: eqClass.expectedError,
          metadata: {
            testClass: 'equivalence',
            equivalenceClass: eqClass.description,
          },
        });
      }
    }

    return testCases;
  }

  private generatePairwiseTests(): GeneratedTestCase[] {
    const testCases: GeneratedTestCase[] = [];
    const fields = this.inputFields;

    // Generate pairwise combinations using a simple algorithm
    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) {
        const field1 = fields[i];
        const field2 = fields[j];
        
        const values1 = this.getRepresentativeValues(field1);
        const values2 = this.getRepresentativeValues(field2);

        for (const val1 of values1) {
          for (const val2 of values2) {
            const inputs = this.createBaseInputs();
            inputs[field1.name] = val1.value;
            inputs[field2.name] = val2.value;

            const expectedResult = val1.expectedResult === 'success' && val2.expectedResult === 'success' 
              ? 'success' : 'error';
            
            const expectedError = expectedResult === 'error' 
              ? (val1.expectedError || val2.expectedError) 
              : undefined;

            testCases.push({
              type: 'pairwise',
              description: `should ${expectedResult} when ${field1.name} is ${val1.description} and ${field2.name} is ${val2.description}`,
              inputs,
              expectedResult,
              expectedError,
              metadata: {
                testClass: 'pairwise',
              },
            });
          }
        }
      }
    }

    return testCases;
  }

  private generateErrorCombinationTests(): GeneratedTestCase[] {
    const testCases: GeneratedTestCase[] = [];

    // Test multiple invalid inputs together
    const invalidCombinations = this.getInvalidValueCombinations();
    
    for (const combination of invalidCombinations) {
      const inputs = this.createBaseInputs();
      let description = 'should fail when ';
      const errorParts: string[] = [];

      for (const [fieldName, invalidValue] of Object.entries(combination)) {
        inputs[fieldName] = invalidValue.value;
        errorParts.push(`${fieldName} is ${invalidValue.description}`);
      }

      description += errorParts.join(' and ');

      testCases.push({
        type: 'error',
        description,
        inputs,
        expectedResult: 'error',
        expectedError: 'Multiple validation errors',
        metadata: {
          testClass: 'error-combination',
        },
      });
    }

    return testCases;
  }

  private generateCrossFieldTests(): GeneratedTestCase[] {
    const testCases: GeneratedTestCase[] = [];

    // Generate tests for field dependencies and conflicts
    for (const field of this.inputFields) {
      const constraints = field.constraints;
      if (!constraints) continue;

      // Test dependencies
      if (constraints.dependsOn) {
        for (const dependency of constraints.dependsOn) {
          const inputs = this.createBaseInputs();
          
          // Test with dependency missing
          delete inputs[dependency];
          inputs[field.name] = this.getValidValue(field);

          testCases.push({
            type: 'error',
            description: `should fail when ${field.name} is provided but ${dependency} is missing`,
            inputs,
            expectedResult: 'error',
            expectedError: `${dependency} is required when ${field.name} is provided`,
            metadata: {
              testClass: 'cross-field-dependency',
            },
          });
        }
      }

      // Test conflicts
      if (constraints.conflicts) {
        for (const conflict of constraints.conflicts) {
          const inputs = this.createBaseInputs();
          inputs[field.name] = this.getValidValue(field);
          inputs[conflict] = this.getValidValueForField(conflict);

          testCases.push({
            type: 'error',
            description: `should fail when both ${field.name} and ${conflict} are provided`,
            inputs,
            expectedResult: 'error',
            expectedError: `${field.name} and ${conflict} cannot be provided together`,
            metadata: {
              testClass: 'cross-field-conflict',
            },
          });
        }
      }
    }

    return testCases;
  }

  private getBoundaryValues(field: InputField): Array<{
    value: any;
    description: string;
    expectedResult: 'success' | 'error';
    expectedError?: string;
  }> {
    const boundaries: Array<{
      value: any;
      description: string;
      expectedResult: 'success' | 'error';
      expectedError?: string;
    }> = [];

    const constraints = field.constraints;
    if (!constraints) return boundaries;

    switch (field.dataType) {
      case 'string':
        if (constraints.minLength !== undefined) {
          // Below minimum
          if (constraints.minLength > 0) {
            boundaries.push({
              value: 'a'.repeat(constraints.minLength - 1),
              description: `below minimum length (${constraints.minLength - 1} chars)`,
              expectedResult: 'error',
              expectedError: `${field.name} must be at least ${constraints.minLength} characters`,
            });
          }
          
          // At minimum
          boundaries.push({
            value: 'a'.repeat(constraints.minLength),
            description: `at minimum length (${constraints.minLength} chars)`,
            expectedResult: 'success',
          });
        }

        if (constraints.maxLength !== undefined) {
          // At maximum
          boundaries.push({
            value: 'a'.repeat(constraints.maxLength),
            description: `at maximum length (${constraints.maxLength} chars)`,
            expectedResult: 'success',
          });
          
          // Above maximum
          boundaries.push({
            value: 'a'.repeat(constraints.maxLength + 1),
            description: `above maximum length (${constraints.maxLength + 1} chars)`,
            expectedResult: 'error',
            expectedError: `${field.name} must be at most ${constraints.maxLength} characters`,
          });
        }

        // Empty string
        boundaries.push({
          value: '',
          description: 'empty string',
          expectedResult: constraints.required === false ? 'success' : 'error',
          expectedError: constraints.required !== false ? `${field.name} is required` : undefined,
        });

        break;

      case 'number':
        if (constraints.min !== undefined) {
          // Below minimum
          boundaries.push({
            value: constraints.min - 1,
            description: `below minimum (${constraints.min - 1})`,
            expectedResult: 'error',
            expectedError: `${field.name} must be at least ${constraints.min}`,
          });
          
          // At minimum
          boundaries.push({
            value: constraints.min,
            description: `at minimum (${constraints.min})`,
            expectedResult: 'success',
          });
        }

        if (constraints.max !== undefined) {
          // At maximum
          boundaries.push({
            value: constraints.max,
            description: `at maximum (${constraints.max})`,
            expectedResult: 'success',
          });
          
          // Above maximum
          boundaries.push({
            value: constraints.max + 1,
            description: `above maximum (${constraints.max + 1})`,
            expectedResult: 'error',
            expectedError: `${field.name} must be at most ${constraints.max}`,
          });
        }

        break;

      case 'array':
        if (constraints.minItems !== undefined) {
          // Below minimum items
          if (constraints.minItems > 0) {
            boundaries.push({
              value: Array(constraints.minItems - 1).fill('item'),
              description: `below minimum items (${constraints.minItems - 1} items)`,
              expectedResult: 'error',
              expectedError: `${field.name} must have at least ${constraints.minItems} items`,
            });
          }
          
          // At minimum items
          boundaries.push({
            value: Array(constraints.minItems).fill('item'),
            description: `at minimum items (${constraints.minItems} items)`,
            expectedResult: 'success',
          });
        }

        if (constraints.maxItems !== undefined) {
          // At maximum items
          boundaries.push({
            value: Array(constraints.maxItems).fill('item'),
            description: `at maximum items (${constraints.maxItems} items)`,
            expectedResult: 'success',
          });
          
          // Above maximum items
          boundaries.push({
            value: Array(constraints.maxItems + 1).fill('item'),
            description: `above maximum items (${constraints.maxItems + 1} items)`,
            expectedResult: 'error',
            expectedError: `${field.name} must have at most ${constraints.maxItems} items`,
          });
        }

        break;
    }

    return boundaries;
  }

  private getEquivalenceClasses(field: InputField): Array<{
    value: any;
    description: string;
    expectedResult: 'success' | 'error';
    expectedError?: string;
  }> {
    const classes: Array<{
      value: any;
      description: string;
      expectedResult: 'success' | 'error';
      expectedError?: string;
    }> = [];

    const constraints = field.constraints;

    // Use manually specified test values if available
    if (field.testValues?.valid) {
      for (const value of field.testValues.valid) {
        classes.push({
          value,
          description: `valid value (${value})`,
          expectedResult: 'success',
        });
      }
    }

    if (field.testValues?.invalid) {
      for (const value of field.testValues.invalid) {
        classes.push({
          value,
          description: `invalid value (${value})`,
          expectedResult: 'error',
          expectedError: `Invalid ${field.name}`,
        });
      }
    }

    // Generate standard equivalence classes based on data type
    switch (field.dataType) {
      case 'string':
        if (!field.testValues?.valid?.length) {
          // Valid string
          const validLength = constraints?.maxLength ? 
            Math.min(20, Math.floor(constraints.maxLength / 2)) : 10;
          classes.push({
            value: 'a'.repeat(validLength),
            description: 'valid string',
            expectedResult: 'success',
          });

          // Special characters
          classes.push({
            value: 'Test@123!',
            description: 'string with special characters',
            expectedResult: 'success',
          });

          // Unicode characters
          classes.push({
            value: 'Tëst 测试',
            description: 'string with unicode characters',
            expectedResult: 'success',
          });
        }

        if (!field.testValues?.invalid?.length) {
          // null/undefined
          classes.push({
            value: null,
            description: 'null value',
            expectedResult: constraints?.required === false ? 'success' : 'error',
            expectedError: constraints?.required !== false ? `${field.name} is required` : undefined,
          });

          // Whitespace only
          classes.push({
            value: '   ',
            description: 'whitespace only',
            expectedResult: 'error',
            expectedError: `${field.name} cannot be only whitespace`,
          });
        }

        break;

      case 'number':
        if (!field.testValues?.valid?.length) {
          // Positive integer
          classes.push({
            value: 42,
            description: 'positive integer',
            expectedResult: 'success',
          });

          // Negative integer
          classes.push({
            value: -10,
            description: 'negative integer',
            expectedResult: 'success',
          });

          // Decimal
          classes.push({
            value: 3.14,
            description: 'decimal number',
            expectedResult: 'success',
          });

          // Zero
          classes.push({
            value: 0,
            description: 'zero',
            expectedResult: 'success',
          });
        }

        if (!field.testValues?.invalid?.length) {
          // NaN
          classes.push({
            value: NaN,
            description: 'NaN',
            expectedResult: 'error',
            expectedError: `${field.name} must be a valid number`,
          });

          // Infinity
          classes.push({
            value: Infinity,
            description: 'Infinity',
            expectedResult: 'error',
            expectedError: `${field.name} must be a finite number`,
          });

          // String that looks like number
          classes.push({
            value: '123',
            description: 'string that looks like number',
            expectedResult: 'error',
            expectedError: `${field.name} must be a number`,
          });
        }

        break;

      case 'boolean':
        if (!field.testValues?.valid?.length) {
          classes.push({
            value: true,
            description: 'true',
            expectedResult: 'success',
          });

          classes.push({
            value: false,
            description: 'false',
            expectedResult: 'success',
          });
        }

        if (!field.testValues?.invalid?.length) {
          classes.push({
            value: 'true',
            description: 'string "true"',
            expectedResult: 'error',
            expectedError: `${field.name} must be a boolean`,
          });

          classes.push({
            value: 1,
            description: 'number 1',
            expectedResult: 'error',
            expectedError: `${field.name} must be a boolean`,
          });
        }

        break;

      case 'array':
        if (!field.testValues?.valid?.length) {
          classes.push({
            value: ['item1', 'item2'],
            description: 'valid array',
            expectedResult: 'success',
          });

          classes.push({
            value: [],
            description: 'empty array',
            expectedResult: constraints?.minItems && constraints.minItems > 0 ? 'error' : 'success',
            expectedError: constraints?.minItems && constraints.minItems > 0 ? 
              `${field.name} must have at least ${constraints.minItems} items` : undefined,
          });
        }

        break;

      case 'object':
        if (!field.testValues?.valid?.length) {
          classes.push({
            value: { key: 'value' },
            description: 'valid object',
            expectedResult: 'success',
          });

          classes.push({
            value: {},
            description: 'empty object',
            expectedResult: 'success',
          });
        }

        if (!field.testValues?.invalid?.length) {
          classes.push({
            value: 'not an object',
            description: 'string instead of object',
            expectedResult: 'error',
            expectedError: `${field.name} must be an object`,
          });
        }

        break;
    }

    // Handle allowed values constraint
    if (constraints?.allowedValues?.length) {
      // Add all allowed values as valid
      for (const value of constraints.allowedValues) {
        classes.push({
          value,
          description: `allowed value (${value})`,
          expectedResult: 'success',
        });
      }

      // Add a disallowed value
      classes.push({
        value: 'disallowed_value',
        description: 'disallowed value',
        expectedResult: 'error',
        expectedError: `${field.name} must be one of: ${constraints.allowedValues.join(', ')}`,
      });
    }

    return classes;
  }

  private getRepresentativeValues(field: InputField): Array<{
    value: any;
    description: string;
    expectedResult: 'success' | 'error';
    expectedError?: string;
  }> {
    // Combine boundary and equivalence values, but select representative ones
    const boundary = this.getBoundaryValues(field);
    const equivalence = this.getEquivalenceClasses(field);
    
    const all = [...boundary, ...equivalence];
    
    // Select a subset for pairwise testing
    const representatives: Array<{
      value: any;
      description: string;
      expectedResult: 'success' | 'error';
      expectedError?: string;
    }> = [];
    
    // Always include at least one valid and one invalid value
    const validValues = all.filter(v => v.expectedResult === 'success');
    const invalidValues = all.filter(v => v.expectedResult === 'error');
    
    if (validValues.length > 0) {
      representatives.push(validValues[0]); // First valid value
    }
    
    if (invalidValues.length > 0) {
      representatives.push(invalidValues[0]); // First invalid value
    }
    
    return representatives;
  }

  private getInvalidValueCombinations(): Array<Record<string, {
    value: any;
    description: string;
  }>> {
    const combinations: Array<Record<string, {
      value: any;
      description: string;
    }>> = [];

    // Generate combinations of 2-3 invalid values
    const invalidValuesByField: Record<string, Array<{
      value: any;
      description: string;
    }>> = {};

    for (const field of this.inputFields) {
      const equivalenceClasses = this.getEquivalenceClasses(field);
      const invalidValues = equivalenceClasses
        .filter(eq => eq.expectedResult === 'error')
        .map(eq => ({ value: eq.value, description: eq.description }));
      
      if (invalidValues.length > 0) {
        invalidValuesByField[field.name] = invalidValues;
      }
    }

    const fieldNames = Object.keys(invalidValuesByField);
    
    // Generate pairs of invalid values
    for (let i = 0; i < fieldNames.length; i++) {
      for (let j = i + 1; j < fieldNames.length; j++) {
        const field1 = fieldNames[i];
        const field2 = fieldNames[j];
        
        const invalid1 = invalidValuesByField[field1][0]; // First invalid value
        const invalid2 = invalidValuesByField[field2][0]; // First invalid value
        
        combinations.push({
          [field1]: invalid1,
          [field2]: invalid2,
        });
      }
    }

    return combinations.slice(0, 5); // Limit to 5 combinations to avoid explosion
  }

  private createBaseInputs(): Record<string, any> {
    const inputs: Record<string, any> = {};
    
    // Set valid default values for all fields
    for (const field of this.inputFields) {
      inputs[field.name] = this.getValidValue(field);
    }
    
    return inputs;
  }

  private getValidValue(field: InputField): any {
    const constraints = field.constraints;
    
    // Use manually specified valid value if available
    if (field.testValues?.valid?.length) {
      return field.testValues.valid[0];
    }

    // Generate valid value based on constraints
    switch (field.dataType) {
      case 'string':
        if (constraints?.allowedValues?.length) {
          return constraints.allowedValues[0];
        }
        
        const minLen = constraints?.minLength || 1;
        const maxLen = constraints?.maxLength || 50;
        const targetLen = Math.min(10, Math.max(minLen, Math.floor((minLen + maxLen) / 2)));
        
        return 'test'.repeat(Math.ceil(targetLen / 4)).substring(0, targetLen);

      case 'number':
        const min = constraints?.min || 0;
        const max = constraints?.max || 100;
        return Math.floor((min + max) / 2);

      case 'boolean':
        return true;

      case 'array':
        const minItems = constraints?.minItems || 0;
        const targetItems = Math.max(1, minItems);
        return Array(targetItems).fill('item');

      case 'object':
        return { key: 'value' };

      default:
        return 'default_value';
    }
  }

  private getValidValueForField(fieldName: string): any {
    const field = this.inputFields.find(f => f.name === fieldName);
    return field ? this.getValidValue(field) : 'default_value';
  }

  private deduplicateTestCases(testCases: GeneratedTestCase[]): GeneratedTestCase[] {
    const seen = new Set<string>();
    const deduplicated: GeneratedTestCase[] = [];

    for (const testCase of testCases) {
      // Create a signature based on inputs and expected result
      const signature = JSON.stringify({
        inputs: testCase.inputs,
        expectedResult: testCase.expectedResult,
      });

      if (!seen.has(signature)) {
        seen.add(signature);
        deduplicated.push(testCase);
      }
    }

    return deduplicated;
  }
}