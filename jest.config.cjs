/** @type {import('jest').Config} */
module.exports = {
  projects: [
    // Integration tests (no mocking)
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/integration/**/*.test.js'
      ],
      collectCoverageFrom: [
        'scripts/**/*-utils.js',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/coverage/**'
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      transform: {
        '^.+\\.(js|cjs|ts)$': 'babel-jest'
      },
      moduleFileExtensions: ['js', 'cjs', 'ts', 'json'],
      // No module name mapper - we want real modules for integration tests
    },
    // Backend/Node.js tests
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/**/*.test.js'
      ],
      testPathIgnorePatterns: [
        '<rootDir>/tests/integration/' // Exclude integration tests from backend project
      ],
      collectCoverageFrom: [
        'supabase/functions/**/*.{js,ts}',
        'src/services/**/*.{js,ts}',
        'scripts/**/*-utils.js',
        '!supabase/functions/**/*.test.{js,ts}',
        '!src/services/**/*.test.{js,ts}',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/coverage/**'
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      transform: {
        '^.+\\.(js|cjs|ts)$': 'babel-jest'
      },
      moduleFileExtensions: ['js', 'cjs', 'ts', 'json'],
      moduleNameMapper: {
        '^@netlify/(.*)$': '<rootDir>/tests/__mocks__/@netlify/$1',
        '^@supabase/(.*)$': '<rootDir>/tests/__mocks__/@supabase/$1',
        '^https://deno.land/(.*)': '<rootDir>/tests/__mocks__/deno-land/$1'
      }
    },
    // Frontend/Browser tests
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/tests/**/*.test.{ts,tsx}',
        '<rootDir>/src/**/*.test.{ts,tsx}'
      ],
      testPathIgnorePatterns: [
        '<rootDir>/tests/integration/' // Exclude integration tests from frontend project
      ],
      collectCoverageFrom: [
        'src/services/**/*.{js,ts}',
        '!src/services/**/*.test.{js,ts}',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/coverage/**'
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup-frontend.js'],
      transform: {
        '^.+\\.(ts|tsx|js|mjs)$': ['babel-jest', {
          presets: [
            ['@babel/preset-env', { targets: { node: 'current' } }],
            ['@babel/preset-react', { runtime: 'automatic' }],
            ['@babel/preset-typescript', { allowDeclareFields: true }]
          ],
          plugins: ['babel-plugin-transform-vite-meta-env']
        }]
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'json'],
      transformIgnorePatterns: [
        'node_modules/(?!(@upstash|uncrypto)/)'
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@upstash/redis$': '<rootDir>/tests/__mocks__/lib/redis.js',
        '^\\.\\./lib/redis$': '<rootDir>/tests/__mocks__/lib/redis.js',
        '^src/lib/redis$': '<rootDir>/tests/__mocks__/lib/redis.js',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      }
    }
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  verbose: true
}; 