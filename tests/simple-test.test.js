/**
 * Simple test to verify CI/CD environment setup
 * This test doesn't require complex mocking and focuses on basic functionality
 */

describe('CI/CD Environment Test', () => {
  it('should have Node.js available', () => {
    expect(typeof process).toBe('object');
    expect(process.version).toBeDefined();
  });

  it('should have Jest available', () => {
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
    expect(typeof expect).toBe('function');
  });

  it('should have environment variables defined', () => {
    // These should be set by the CI/CD environment or have fallbacks
    expect(process.env.NODE_ENV).toBeDefined();
  });

  it('should be able to require modules', () => {
    const path = require('path');
    expect(typeof path.join).toBe('function');
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });
});

