/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'netlify/functions/**/*.{js,cjs}',
    '!netlify/functions/**/*.test.{js}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  transform: {
    '^.+\\.(js|cjs)$': 'babel-jest'
  },
  moduleFileExtensions: ['js', 'cjs', 'json'],
  testTimeout: 30000,
  verbose: true
}; 