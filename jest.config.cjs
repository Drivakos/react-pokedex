/** @type {import('jest').Config} */
module.exports = {
  projects: [
    // Backend/Node.js tests
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/**/*.test.js'
      ],
      collectCoverageFrom: [
        'supabase/functions/**/*.{js,ts}',
        'src/services/**/*.{js,ts}',
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
        '<rootDir>/tests/**/*.test.ts'
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
        '^.+\\.(ts|js|mjs)$': ['babel-jest', {
          presets: [
            ['@babel/preset-env', { targets: { node: 'current' } }],
            ['@babel/preset-typescript', { allowDeclareFields: true }]
          ],
          plugins: ['babel-plugin-transform-vite-meta-env']
        }]
      },
      moduleFileExtensions: ['ts', 'js', 'mjs', 'json'],
      transformIgnorePatterns: [
        'node_modules/(?!(@upstash|uncrypto)/)'
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@upstash/redis$': '<rootDir>/tests/__mocks__/lib/redis.js',
        '^\\.\\./lib/redis$': '<rootDir>/tests/__mocks__/lib/redis.js',
        '^src/lib/redis$': '<rootDir>/tests/__mocks__/lib/redis.js'
      }
    }
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  verbose: true
}; 