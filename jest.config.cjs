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
        'netlify/functions/**/*.{js,cjs}',
        '!netlify/functions/**/*.test.{js}',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/coverage/**'
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      transform: {
        '^.+\\.(js|cjs)$': 'babel-jest'
      },
      moduleFileExtensions: ['js', 'cjs', 'json'],
      moduleNameMapper: {
        '^@netlify/(.*)$': '<rootDir>/tests/__mocks__/@netlify/$1'
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
        '^.+\\.ts$': ['babel-jest', {
          presets: [
            ['@babel/preset-env', { targets: { node: 'current' } }],
            ['@babel/preset-typescript', { allowDeclareFields: true }]
          ],
          plugins: ['babel-plugin-transform-vite-meta-env']
        }]
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
      transformIgnorePatterns: [
        'node_modules/(?!(.*\\.mjs$))'
      ]
    }
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  verbose: true
}; 