/**
 * ESLint plugin for Railway Oriented Programming with Result types
 * Self-contained implementation for packages/result
 */

import requireResultReturnType from './require-result-return-type.js';

const plugin = {
  meta: {
    name: '@fullstack-ts-template/result-eslint-rules',
    version: '1.0.0'
  },
  
  rules: {
    'require-result-return-type': requireResultReturnType
  }
};

export default plugin;