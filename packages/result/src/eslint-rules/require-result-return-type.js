/**
 * ESLint rule to enforce Result<T, E> return types (Railway Oriented Programming)
 * Based on @fyuuki0jp/eslint-plugin-railway implementation
 */

const DEFAULT_OPTIONS = {
  allowedReturnTypes: [
    'void', 
    'Promise<void>', 
    'never',
    'boolean',
    'string',
    'number',
    'null',
    'undefined',
    // React component return types
    'JSX.Element',
    'React.JSX.Element', 
    'ReactElement',
    'React.ReactElement',
    'ReactElement<any>',
    'React.ReactElement<any>',
    'ReactElement<any, any>',
    'React.ReactElement<any, any>',
    'ReactNode',
    'React.ReactNode',
    // Hono and API return types
    'Response',
    'Promise<Response>',
    'TypedResponse',
    'Promise<TypedResponse>',
    // Database and utility types
    'DrizzleDb',
    'Promise<DrizzleDb>'
  ],
  exemptFunctions: [
    'main', 'setup', 'teardown', 'beforeEach', 'afterEach', 
    'beforeAll', 'afterAll', 'describe', 'it', 'test',
    'isOk', 'isErr', 'ok', 'err', 'unwrap', 'unwrapOr',
    'map', 'mapErr', 'andThen', 'orElse', 'match', 'fold',
    'voidFunction', 'neverFunction','<anonymous>'
  ],
  exemptPatterns: [
    '^test', '^spec', '^mock', '^stub',
    '^before', '^after', '^setup', '^teardown',
    // React component patterns
    '^use[A-Z]', // React hooks (useEffect, useState, etc.)
    'Component$', // Components ending with 'Component'
    '^render', // render functions
    // Backend API patterns
    '^get$', '^post$', '^put$', '^delete$', '^patch$', // HTTP method handlers
    '^create[A-Z]', '^initialize[A-Z]', '^get[A-Z]', // Common function patterns
    '^is[A-Z]', '^can[A-Z]', '^has[A-Z]', // Boolean predicates
    '^validate[A-Z]', '^parse[A-Z]', '^format[A-Z]' // Utility functions
  ]
};

function isResultType(typeText) {
  if (!typeText) return false;
  
  const normalizedType = typeText.replace(/\s+/g, ' ').trim();
  
  const resultPatterns = [
    /^Result<[^>]+,\s*[^>]+>$/,           // Result<T, E>
    /^Result<[^>]+>$/,                    // Result<T>
    /^Promise<Result<[^>]+,\s*[^>]+>>$/, // Promise<Result<T, E>>
    /^Promise<Result<[^>]+>>$/           // Promise<Result<T>>
  ];
  
  return resultPatterns.some(pattern => pattern.test(normalizedType));
}

function getFunctionName(node) {
  if (node.id && node.id.name) {
    return node.id.name;
  }
  if (node.key && node.key.name) {
    return node.key.name;
  }
  if (node.parent && node.parent.type === 'VariableDeclarator' && node.parent.id) {
    return node.parent.id.name;
  }
  if (node.parent && node.parent.type === 'Property' && node.parent.key) {
    return node.parent.key.name;
  }
  return '<anonymous>';
}

function getReturnTypeText(node, context) {
  if (!node.returnType || !node.returnType.typeAnnotation) {
    return null;
  }
  
  const sourceCode = context.getSourceCode();
  if (!sourceCode) return null;
  
  try {
    return sourceCode.getText(node.returnType.typeAnnotation);
  } catch {
    return null;
  }
}

function shouldExemptFunction(functionName, options, node) {
  const { exemptFunctions, exemptPatterns } = options;
  
  // Check exempt function names
  if (exemptFunctions.includes(functionName)) {
    return true;
  }
  
  // Check exempt patterns
  const isExemptByPattern = exemptPatterns.some(pattern => {
    const regex = new RegExp(pattern, 'i');
    return regex.test(functionName);
  });
  
  if (isExemptByPattern) {
    return true;
  }
  
  // Additional React component detection
  // 1. Function name starts with uppercase (PascalCase - typical React component)
  if (/^[A-Z][a-zA-Z0-9]*$/.test(functionName)) {
    return true;
  }
  
  // 2. Arrow function assigned to PascalCase variable
  if (node.parent && 
      node.parent.type === 'VariableDeclarator' && 
      node.parent.id && 
      /^[A-Z][a-zA-Z0-9]*$/.test(node.parent.id.name)) {
    return true;
  }
  
  return false;
}

function isAllowedReturnType(typeText, options) {
  if (!typeText) return false;
  
  const normalizedType = typeText.replace(/\s+/g, ' ').trim();
  return options.allowedReturnTypes.some(allowedType => {
    const normalizedAllowed = allowedType.replace(/\s+/g, ' ').trim();
    return normalizedType === normalizedAllowed;
  });
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce Result<T, E> return types for Railway Oriented Programming',
      category: 'Best Practices',
      recommended: true
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedReturnTypes: {
            type: 'array',
            items: { type: 'string' }
          },
          exemptFunctions: {
            type: 'array',
            items: { type: 'string' }
          },
          exemptPatterns: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      requireResultType: "Function '{{name}}' must return Result<T, E> type. Current return type: {{currentType}}",
      missingReturnType: "Function '{{name}}' must have an explicit return type annotation that returns Result<T, E>"
    }
  },

  create(context) {
    const options = Object.assign({}, DEFAULT_OPTIONS, context.options[0] || {});
    
    function checkFunction(node) {
      // Skip constructors, getters, setters
      if (node.kind === 'constructor' || node.kind === 'get' || node.kind === 'set') {
        return;
      }
      
      const functionName = getFunctionName(node);
      
      // Skip exempt functions
      if (shouldExemptFunction(functionName, options, node)) {
        return;
      }
      
      const returnTypeText = getReturnTypeText(node, context);
      
      // No return type annotation
      if (!returnTypeText) {
        context.report({
          node,
          messageId: 'missingReturnType',
          data: { name: functionName }
        });
        return;
      }
      
      // Check if it's an allowed return type
      if (isAllowedReturnType(returnTypeText, options)) {
        return;
      }
      
      // Check if it's a Result type
      if (!isResultType(returnTypeText)) {
        context.report({
          node,
          messageId: 'requireResultType',
          data: { 
            name: functionName,
            currentType: returnTypeText
          }
        });
        return;
      }
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
      MethodDefinition: checkFunction
    };
  }
};