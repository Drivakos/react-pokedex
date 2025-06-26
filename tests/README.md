# Backend Test Suite

This directory contains comprehensive tests for the Pokemon Pokedex backend functions.

## Test Structure

### Unit Tests

#### `pokemon-rest.test.js`
Tests for the REST API function (`netlify/functions/pokemon-rest.cjs`):
- **CORS Handling**: OPTIONS request processing
- **Path Parsing**: URL path validation and parsing
- **Cache Duration Logic**: Different cache times for different endpoints
- **API Response Handling**: Success and error scenarios
- **Request Construction**: URL building and headers
- **Edge Cases**: Empty parameters, complex paths

#### `pokemon-graphql.test.js`
Tests for the GraphQL API function (`netlify/functions/pokemon-graphql.cjs`):
- **CORS Handling**: OPTIONS request processing
- **Request Validation**: JSON parsing and query validation
- **Cache Functionality**: Cache hits, misses, and key generation
- **GraphQL API Integration**: Query execution and error handling
- **Error Handling**: Cache errors and API failures
- **Complex Queries**: Multi-variable queries and mutations

#### `cached-api.test.js`
Tests for the cached API service (`src/services/cached-api.ts`):
- **Function Coverage**: All exported functions tested
- **Data Transformation**: Pokemon detail transformation logic
- **Generation Detection**: Pokemon generation based on ID
- **Error Handling**: API error propagation
- **Parameter Passing**: Correct parameter forwarding

### Integration Tests

#### `integration.test.js`
End-to-end tests simulating real usage:
- **Simultaneous Requests**: REST and GraphQL function coordination
- **Error Scenarios**: Graceful degradation under failure
- **Cache Coordination**: Different cache strategies working together
- **Performance Testing**: Response time validation
- **Real-world Scenarios**: Complete user workflows

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### CI Mode
```bash
npm run test:ci
```

## Test Configuration

- **Framework**: Jest with ts-jest for TypeScript support
- **Mocking**: @netlify/cache and fetch are mocked for isolated testing
- **Environment**: Node.js test environment
- **Timeout**: 30 seconds per test
- **Coverage**: Functions, statements, branches, and lines

## Mock Strategy

### External Dependencies
- `@netlify/cache`: All cache operations are mocked
- `fetch`: Global fetch is mocked for API calls
- Environment variables: Set in `setup.js`

### Test Data
- Pokemon data follows actual PokeAPI structure
- GraphQL responses match beta.pokeapi.co format
- Cache keys are deterministic for testing

## Coverage Goals

The test suite aims for:
- **Functions**: 100% coverage
- **Statements**: >95% coverage
- **Branches**: >90% coverage
- **Lines**: >95% coverage

## Writing New Tests

When adding new backend functionality:

1. **Unit Tests**: Test individual function behavior
2. **Integration Tests**: Test function interaction
3. **Error Scenarios**: Test failure handling
4. **Performance**: Test response times
5. **Edge Cases**: Test boundary conditions

### Example Test Structure
```javascript
describe('New Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('should handle successful request', async () => {
      // Setup mocks
      // Execute function
      // Assert results
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Setup error mocks
      // Execute function
      // Assert error handling
    });
  });
});
```

## Debugging Tests

### Running Single Test File
```bash
npx jest tests/pokemon-rest.test.js
```

### Running Specific Test
```bash
npx jest -t "should handle OPTIONS request"
```

### Verbose Output
```bash
npx jest --verbose
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Main branch commits
- Release branches

CI configuration ensures:
- All tests pass
- Coverage thresholds are met
- No performance regressions 