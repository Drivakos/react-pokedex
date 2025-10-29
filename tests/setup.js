// Global test setup
process.env.NODE_ENV = 'test';
global.console = {
  ...console,
  // Suppress console.warn and console.error during tests unless running in verbose mode
  warn: process.env.NODE_ENV === 'test' && !process.env.VERBOSE ? jest.fn() : console.warn,
  error: process.env.NODE_ENV === 'test' && !process.env.VERBOSE ? jest.fn() : console.error,
};

// Mock environment variables for tests
process.env.VITE_API_URL = 'https://pokeapi.co/api/v2';
process.env.VITE_API_GRAPHQL_URL = 'https://beta.pokeapi.co/graphql/v1beta';
process.env.VITE_USE_CACHED_API = 'false';