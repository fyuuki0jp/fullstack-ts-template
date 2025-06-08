# Testing MCP Server v2.0

A Model Context Protocol (MCP) server for generating comprehensive backend tests using enhanced decision tables with automatic test case generation. This tool helps automate test generation for the fullstack-ts-template monorepo by allowing you to define test scenarios with constraints and automatically generating comprehensive test coverage.

## ✨ New Features (v2.0)

- **Constraint-Based Test Generation**: Define input field constraints to automatically generate boundary value, equivalence class, and error condition tests
- **Comprehensive Coverage Analysis**: Analyze test coverage gaps and get recommendations for missing test cases
- **Automatic Test Case Generation**: Generate test cases based on field constraints, boundary values, and equivalence classes
- **Pairwise Combination Testing**: Automatically generate combination tests for multiple input fields
- **Enhanced Coverage Options**: Control which types of tests to generate (boundary, equivalence, pairwise, error combinations)
- **Test Organization**: Generated tests are organized by category (boundary tests, equivalence tests, etc.)

## Features

- Create and manage enhanced decision tables with input field constraints
- Generate Vitest test suites with comprehensive coverage from decision tables
- Automatic boundary value and equivalence class test generation
- Coverage analysis and gap identification
- Support for Railway Result pattern testing
- Automatic test structure generation following project conventions
- Test case organization and categorization

## Installation

```bash
# Install dependencies
yarn workspace testing-mcp install

# Build the MCP server
yarn workspace testing-mcp build
```

## Usage

### 1. Configure Claude Desktop

Add the following to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "testing-mcp": {
      "command": "node",
      "args": ["/path/to/fullstack-ts-template/packages/testing-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

### 2. Available Tools

The MCP server provides the following tools:

#### `create_decision_table` (Enhanced)
Create a new decision table with enhanced input field constraints and automatic test generation.

```typescript
{
  name: string;          // Name of the decision table
  feature: string;       // Feature name (e.g., "user")
  operation: string;     // Operation name (e.g., "createUser")
  description?: string;  // Optional description
  
  // Enhanced input fields with constraints (NEW)
  inputFields?: Array<{
    name: string;
    type: "input";
    description?: string;
    dataType: "string" | "number" | "boolean" | "object" | "array";
    constraints?: {
      // String constraints
      minLength?: number;
      maxLength?: number;
      pattern?: string;        // regex pattern
      allowedValues?: any[];   // enumerated values
      
      // Number constraints
      min?: number;
      max?: number;
      step?: number;
      
      // General constraints
      required?: boolean;
      
      // Array constraints
      minItems?: number;
      maxItems?: number;
      uniqueItems?: boolean;
      
      // Object constraints
      properties?: Record<string, any>;
      
      // Cross-field dependencies
      dependsOn?: string[];    // field names this field depends on
      conflicts?: string[];    // field names this field conflicts with
    };
    testValues?: {
      valid?: any[];           // manually specified valid values
      invalid?: any[];         // manually specified invalid values
      boundary?: any[];        // boundary values
      equivalence?: any[];     // equivalence class representatives
    };
  }>;
  
  // Coverage options for automatic test generation (NEW)
  coverageOptions?: {
    boundary?: boolean;        // generate boundary value tests (default: true)
    equivalence?: boolean;     // generate equivalence class tests (default: true)
    pairwise?: boolean;        // generate pairwise combination tests (default: false)
    errorCombinations?: boolean; // generate error condition combinations (default: true)
    crossField?: boolean;      // generate cross-field dependency tests (default: false)
  };
  
  // Regular columns for output/expected fields
  columns: Array<{
    name: string;
    type: "input" | "output" | "expected";
    description?: string;
    dataType?: "string" | "number" | "boolean" | "object" | "array";
  }>;
  
  // Manual test case rows (optional if using automatic generation)
  rows?: Array<Record<string, any>>;
  
  // Whether to automatically generate test cases (NEW)
  autoGenerate?: boolean;    // default: false
}
```

#### `analyze_coverage` (NEW)
Analyze test coverage for a decision table and identify gaps.

```typescript
{
  tableId: string;         // ID of the decision table to analyze
  detailed?: boolean;      // Include detailed gap analysis (default: false)
  generateMissing?: boolean; // Generate missing test cases (default: false)
}
```

#### `list_decision_tables`
List all available decision tables, with optional filtering.

#### `get_decision_table`
Retrieve a specific decision table by ID.

#### `generate_tests`
Generate Vitest tests from a decision table with enhanced coverage.

## Enhanced Decision Table Example

Here's an example of the new enhanced decision table format:

```json
{
  "name": "Enhanced Create User Validation Tests",
  "feature": "user",
  "operation": "createUser",
  "description": "Comprehensive user creation tests with automatic generation",
  "inputFields": [
    {
      "name": "name",
      "type": "input",
      "description": "User's full name",
      "dataType": "string",
      "constraints": {
        "minLength": 2,
        "maxLength": 100,
        "required": true,
        "pattern": "^[a-zA-Z\\s'-]+$"
      },
      "testValues": {
        "valid": ["John Doe", "Mary O'Connor"],
        "invalid": ["A", ""],
        "boundary": ["AB", "a".repeat(100)]
      }
    },
    {
      "name": "email",
      "type": "input",
      "dataType": "string",
      "constraints": {
        "minLength": 5,
        "maxLength": 255,
        "required": true,
        "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
      }
    },
    {
      "name": "age", 
      "type": "input",
      "dataType": "number",
      "constraints": {
        "min": 13,
        "max": 120,
        "required": false
      }
    }
  ],
  "coverageOptions": {
    "boundary": true,
    "equivalence": true,
    "pairwise": true,
    "errorCombinations": true
  },
  "columns": [
    { "name": "success", "type": "expected", "dataType": "boolean" },
    { "name": "errorMessage", "type": "expected", "dataType": "string" }
  ],
  "rows": [
    {
      "testDescription": "should create user with all valid inputs",
      "name": "John Doe",
      "email": "john@example.com",
      "age": 30,
      "success": true,
      "testType": "manual",
      "priority": "high"
    }
  ],
  "autoGenerate": true
}
```

## Automatic Test Generation

When `autoGenerate: true` is set and `inputFields` are defined with constraints, the system will automatically generate:

### 1. Boundary Value Tests
- Values at the minimum and maximum limits
- Values just below/above the limits
- Empty/null values for required fields

### 2. Equivalence Class Tests
- Valid representative values for each data type
- Invalid values that should trigger validation errors
- Edge cases specific to data types

### 3. Pairwise Combination Tests (if enabled)
- Combinations of different input values
- Mix of valid and invalid combinations

### 4. Error Condition Tests
- Multiple invalid inputs together
- Cross-field validation errors
- Dependency and conflict scenarios

## Coverage Analysis

Use the `analyze_coverage` tool to:

- Get overall test coverage percentage
- Identify missing test scenarios
- Receive recommendations for improving coverage
- Analyze field-specific coverage gaps

Example usage:
```json
{
  "tableId": "user-createUser-1234567890",
  "detailed": true,
  "generateMissing": true
}
```

## Generated Test Structure

The enhanced generator creates organized test suites:

```typescript
/**
 * Test Coverage Summary:
 * - Total Tests: 25
 * - Boundary Tests: 8
 * - Equivalence Tests: 10
 * - Error Tests: 7
 * - Overall Coverage: 95%
 * 
 * Generated by Testing MCP v2.0
 */

describe('Enhanced Create User Validation Tests', () => {
  let db: DrizzleClient;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await db.$client.end();
  });

  describe('Boundary Value Tests', () => {
    it('should succeed when name is at minimum length (2 chars)', async () => {
      // Boundary test implementation
    });
    
    it('should fail when name is below minimum length (1 chars)', async () => {
      // Boundary test implementation  
    });
  });

  describe('Equivalence Class Tests', () => {
    it('should succeed when name is valid string', async () => {
      // Equivalence test implementation
    });
  });

  describe('Error Handling Tests', () => {
    it('should fail when name is empty and email is invalid', async () => {
      // Error combination test implementation
    });
  });

  // Priority: high
  it('should create user with all valid inputs', async () => {
    // Manual test case implementation
  });
});
```

## Migration from v1.0

To upgrade existing decision tables:

1. **Add input field constraints**: Convert input columns to `inputFields` with constraints
2. **Enable auto-generation**: Set `autoGenerate: true`
3. **Configure coverage**: Set desired `coverageOptions`
4. **Analyze coverage**: Use `analyze_coverage` to identify gaps

## Best Practices

### 1. Input Field Design
- Define realistic constraints based on business rules
- Use `testValues` for domain-specific edge cases
- Set appropriate `required` flags

### 2. Coverage Strategy
- Start with boundary and equivalence tests
- Add pairwise testing for complex scenarios
- Use error combinations for robust validation testing

### 3. Test Organization
- Use `testType` metadata for categorization
- Set `priority` for important test cases
- Include descriptive test descriptions

### 4. Constraint Definition
- Use regex patterns for string validation
- Set realistic min/max values for numbers
- Define cross-field dependencies accurately

## Development

```bash
# Run tests
yarn workspace testing-mcp test

# Run in watch mode  
yarn workspace testing-mcp test:watch

# Type checking
yarn workspace testing-mcp typecheck

# Linting
yarn workspace testing-mcp lint

# Build
yarn workspace testing-mcp build
```

## Changelog

### v2.0.0
- Added constraint-based automatic test generation
- Added comprehensive coverage analysis
- Added support for boundary value and equivalence class testing
- Added pairwise combination testing
- Added enhanced test organization and categorization
- Added coverage gap identification and recommendations
- Updated decision table schema with `inputFields` and `coverageOptions`
- Enhanced Vitest generator with test grouping and metadata