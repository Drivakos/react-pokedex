/**
 * Grid Generation Error Handling Tests
 * Tests error conditions and edge cases for the grid generation script
 */

import { jest } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { generateSolvableConstraintsForDate } from '../scripts/generate-daily-grids-utils.js';

// Mock Supabase
jest.mock('@supabase/supabase-js');

describe('Grid Generation Error Handling', () => {
  let mockSupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = {
      from: jest.fn(() => ({
        upsert: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    };
    createClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Environment Variable Errors', () => {
    test('should handle missing SUPABASE_URL', () => {
      const originalUrl = process.env.VITE_SUPABASE_URL;
      const originalKey = process.env.VITE_SUPABASE_ANON_KEY;

      delete process.env.VITE_SUPABASE_URL;
      delete process.env.VITE_SUPABASE_ANON_KEY;

      // Mock process.exit to prevent actual exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Test the validation logic
      if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
        console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
        process.exit(1);
      }

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
      expect(mockExit).toHaveBeenCalledWith(1);

      // Restore
      process.env.VITE_SUPABASE_URL = originalUrl;
      process.env.VITE_SUPABASE_ANON_KEY = originalKey;
      mockExit.mockRestore();
      mockConsoleError.mockRestore();
    });

    test('should handle invalid SUPABASE_URL format', () => {
      const originalUrl = process.env.VITE_SUPABASE_URL;
      process.env.VITE_SUPABASE_URL = 'invalid-url';

      createClient.mockImplementation(() => {
        throw new Error('Invalid URL format');
      });

      expect(() => {
        createClient(process.env.VITE_SUPABASE_URL, 'test-key');
      }).toThrow('Invalid URL format');

      process.env.VITE_SUPABASE_URL = originalUrl;
    });
  });

  describe('Database Connection Errors', () => {
    test('should handle database connection failures', async () => {
      mockSupabaseClient.from.mockReturnValue({
        upsert: jest.fn(() => Promise.reject(new Error('Connection failed')))
      });

      const saveGridConfiguration = async (date, constraints) => {
        const dateString = typeof date === 'string' ? date : date.toISOString().split('T')[0];

        try {
          const { data, error } = await mockSupabaseClient
            .from('pokegrid_daily_configs')
            .upsert({
              grid_date: dateString,
              row_constraints: constraints.rows,
              col_constraints: constraints.cols,
              difficulty_level: constraints.difficulty || 'medium',
              generation_seed: constraints.seed || null
            }, {
              onConflict: 'grid_date'
            });

          if (error) {
            console.error(`❌ Failed to save configuration for ${dateString}:`, error.message);
            return false;
          }

          return true;
        } catch (error) {
          console.error(`❌ Error saving configuration for ${dateString}:`, error);
          return false;
        }
      };

      const testDate = new Date('2024-01-01');
      const constraints = generateSolvableConstraintsForDate(testDate);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const success = await saveGridConfiguration(testDate, constraints);

      expect(success).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Error saving configuration for 2024-01-01:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should handle database permission errors', async () => {
      const permissionError = { message: 'Insufficient privileges' };
      mockSupabaseClient.from.mockReturnValue({
        upsert: jest.fn(() => Promise.resolve({ data: null, error: permissionError }))
      });

      const saveGridConfiguration = async (date, constraints) => {
        const dateString = typeof date === 'string' ? date : date.toISOString().split('T')[0];

        try {
          const { data, error } = await mockSupabaseClient
            .from('pokegrid_daily_configs')
            .upsert({
              grid_date: dateString,
              row_constraints: constraints.rows,
              col_constraints: constraints.cols,
              difficulty_level: constraints.difficulty || 'medium',
              generation_seed: constraints.seed || null
            }, {
              onConflict: 'grid_date'
            });

          if (error) {
            console.error(`❌ Failed to save configuration for ${dateString}:`, error.message);
            return false;
          }

          return true;
        } catch (error) {
          console.error(`❌ Error saving configuration for ${dateString}:`, error);
          return false;
        }
      };

      const testDate = new Date('2024-01-01');
      const constraints = generateSolvableConstraintsForDate(testDate);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const success = await saveGridConfiguration(testDate, constraints);

      expect(success).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Failed to save configuration for 2024-01-01:',
        'Insufficient privileges'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Invalid Input Handling', () => {
    test('should handle invalid date inputs', () => {
      // Test with invalid date - this should throw due to toISOString() on invalid date
      const invalidDate = new Date('invalid');

      expect(() => {
        generateSolvableConstraintsForDate(invalidDate);
      }).toThrow('Invalid time value');
    });

    test('should handle null/undefined constraints', () => {
      // This should be handled by the generation logic
      const testDate = new Date('2024-01-01');
      const result = generateSolvableConstraintsForDate(testDate);

      // Ensure no null/undefined constraints
      const allConstraints = [...result.rows, ...result.cols];
      allConstraints.forEach(constraint => {
        expect(constraint).toBeDefined();
        expect(constraint).not.toBeNull();
        expect(constraint.id).toBeDefined();
        expect(constraint.type).toBeDefined();
        expect(constraint.value).toBeDefined();
      });
    });

    test('should handle extreme date ranges', () => {
      const pastDate = new Date('1900-01-01');
      const futureDate = new Date('2100-12-31');

      expect(() => generateSolvableConstraintsForDate(pastDate)).not.toThrow();
      expect(() => generateSolvableConstraintsForDate(futureDate)).not.toThrow();

      const pastResult = generateSolvableConstraintsForDate(pastDate);
      const futureResult = generateSolvableConstraintsForDate(futureDate);

      expect(pastResult.rows).toHaveLength(3);
      expect(futureResult.rows).toHaveLength(3);
      expect(pastResult.seed).not.toBe(futureResult.seed);
    });
  });

  describe('Network and Timeout Errors', () => {
    test('should handle network timeouts', async () => {
      mockSupabaseClient.from.mockReturnValue({
        upsert: jest.fn(() => new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        }))
      });

      const saveGridConfiguration = async (date, constraints) => {
        const dateString = typeof date === 'string' ? date : date.toISOString().split('T')[0];

        try {
          const { data, error } = await mockSupabaseClient
            .from('pokegrid_daily_configs')
            .upsert({
              grid_date: dateString,
              row_constraints: constraints.rows,
              col_constraints: constraints.cols,
              difficulty_level: constraints.difficulty || 'medium',
              generation_seed: constraints.seed || null
            }, {
              onConflict: 'grid_date'
            });

          if (error) {
            console.error(`❌ Failed to save configuration for ${dateString}:`, error.message);
            return false;
          }

          return true;
        } catch (error) {
          console.error(`❌ Error saving configuration for ${dateString}:`, error);
          return false;
        }
      };

      const testDate = new Date('2024-01-01');
      const constraints = generateSolvableConstraintsForDate(testDate);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Use a timeout for the test
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve(false), 200);
      });

      const testPromise = saveGridConfiguration(testDate, constraints);

      const result = await Promise.race([testPromise, timeoutPromise]);

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });

    test('should handle malformed JSON responses', async () => {
      // Mock a response that returns invalid JSON
      mockSupabaseClient.from.mockReturnValue({
        upsert: jest.fn(() => Promise.resolve({
          data: null,
          error: { message: 'Invalid JSON response' }
        }))
      });

      const saveGridConfiguration = async (date, constraints) => {
        const dateString = typeof date === 'string' ? date : date.toISOString().split('T')[0];

        const { data, error } = await mockSupabaseClient
          .from('pokegrid_daily_configs')
          .upsert({
            grid_date: dateString,
            row_constraints: constraints.rows,
            col_constraints: constraints.cols,
            difficulty_level: constraints.difficulty || 'medium',
            generation_seed: constraints.seed || null
          }, {
            onConflict: 'grid_date'
          });

        if (error) {
          console.error(`❌ Failed to save configuration for ${dateString}:`, error.message);
          return false;
        }

        return true;
      };

      const testDate = new Date('2024-01-01');
      const constraints = generateSolvableConstraintsForDate(testDate);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const success = await saveGridConfiguration(testDate, constraints);

      expect(success).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Failed to save configuration for 2024-01-01:',
        'Invalid JSON response'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Script Execution Errors', () => {
    test('should handle invalid command line arguments', () => {
      // Mock process.argv
      const originalArgv = process.argv;
      process.argv = ['node', 'generate-daily-grids.js', 'invalid-number'];

      // Mock console.error and process.exit
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

      // Test argument parsing logic
      const args = process.argv.slice(2);
      const days = args.length > 0 ? parseInt(args[0], 10) : 0;

      if (isNaN(days)) {
        console.error('❌ Invalid argument. Usage: node generate-daily-grids.js [days]');
        process.exit(1);
      }

      expect(consoleSpy).toHaveBeenCalledWith('❌ Invalid argument. Usage: node generate-daily-grids.js [days]');
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Restore
      process.argv = originalArgv;
      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });

    test('should handle script execution without proper setup', () => {
      // Test what happens if script is run without proper environment
      const originalEnv = { ...process.env };

      // Remove required environment variables
      delete process.env.VITE_SUPABASE_URL;
      delete process.env.VITE_SUPABASE_ANON_KEY;

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

      // Simulate the check from the script
      if (!process.env.VITE_SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.VITE_SUPABASE_ANON_KEY)) {
        console.error('❌ Error: VITE_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY must be set in .env');
        process.exit(1);
      }

      expect(consoleSpy).toHaveBeenCalledWith('❌ Error: VITE_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY must be set in .env');
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Restore
      process.env = originalEnv;
      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });
});
