import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use jsdom for DOM APIs
    environment: 'jsdom',

    // Setup files run before each test file
    setupFiles: ['./src/__tests__/setup.ts'],

    // Include patterns
    include: ['src/**/*.{test,spec}.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/__tests__/**',
        'src/main.ts',
      ],
      thresholds: {
        // Start low, increase as tests are added
        // Target: 30% (Week 2), 50% (Week 3), 80% (Week 6)
        lines: 1,
        functions: 1,
        branches: 0,
        statements: 1,
      },
    },

    // Globals (describe, it, expect available without import)
    globals: true,
  },

  // Resolve aliases
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});

