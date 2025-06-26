// Frontend test setup for browser environment testing

// Mock console to reduce noise during tests (unless debug mode)
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  };
}

// Mock environment variables for frontend
process.env.VITE_API_URL = 'https://pokeapi.co/api/v2';
process.env.VITE_API_GRAPHQL_URL = 'https://beta.pokeapi.co/graphql/v1beta';
process.env.VITE_USE_CACHED_API = 'false';
process.env.DEV = 'false';

// Mock import.meta for Vite compatibility
global.importMeta = {
  env: {
    VITE_API_URL: 'https://pokeapi.co/api/v2',
    VITE_API_GRAPHQL_URL: 'https://beta.pokeapi.co/graphql/v1beta',
    VITE_USE_CACHED_API: 'false',
    DEV: false
  }
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.sessionStorage = sessionStorageMock;

// Mock window.location
delete window.location;
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn()
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
}); 