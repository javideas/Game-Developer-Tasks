// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import-x';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.js', '*.config.ts'],
  },

  // Base ESLint recommended
  eslint.configs.recommended,

  // TypeScript recommended
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,

  // Project-specific configuration (excludes test files from type-aware linting)
  {
    files: ['src/**/*.ts'],
    ignores: ['src/__tests__/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      'import-x': importPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // TypeScript specific
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_|animationResetVersion', // Used in nested callbacks
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      // Non-null assertions are valid in game code where lifecycle is controlled
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-this-alias': 'off', // Common in game callbacks
      '@typescript-eslint/no-empty-function': 'off', // Common for placeholder callbacks
      '@typescript-eslint/prefer-for-of': 'warn', // Prefer but don't enforce

      // Import organization (relaxed - no empty line enforcement)
      'import-x/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'ignore',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // Prettier integration
      'prettier/prettier': 'error',

      // General best practices
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }], // Allow console.log in game dev
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
    },
  },

  // Test files configuration (no type-aware linting)
  {
    files: ['src/__tests__/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests for mocking
      '@typescript-eslint/no-non-null-assertion': 'off', // Allow ! in tests
      'prettier/prettier': 'error',
    },
  },

  // Prettier compatibility (must be last)
  prettierConfig
);

