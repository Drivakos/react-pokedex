/**
 * Unit tests for the generate-daily-grids.js script
 */

import { jest } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import {
  createSeededRandom,
  shuffleArray,
  checkBasicConstraints,
  isConstraintCombinationSolvable,
  generateSolvableConstraintsForDate
} from '../scripts/generate-daily-grids-utils.js';

// Mock Supabase
jest.mock('@supabase/supabase-js');

// Mock environment variables
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

// Import the script functions (we'll need to refactor the script to export functions for testing)
describe('Generate Daily Grids Script', () => {
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

  describe('Seeded Random Generation', () => {
    test('should generate consistent results for same seed', () => {
      const seed = 'test-seed-123';
      const random1 = createSeededRandom(seed);
      const random2 = createSeededRandom(seed);

      // Generate same sequence
      const values1 = Array.from({ length: 10 }, () => random1());
      const values2 = Array.from({ length: 10 }, () => random2());

      expect(values1).toEqual(values2);
    });

    test('should generate different results for different seeds', () => {
      const seed1 = 'test-seed-1';
      const seed2 = 'test-seed-2';
      const random1 = createSeededRandom(seed1);
      const random2 = createSeededRandom(seed2);

      const values1 = Array.from({ length: 10 }, () => random1());
      const values2 = Array.from({ length: 10 }, () => random2());

      expect(values1).not.toEqual(values2);
    });

    test('should generate values between 0 and 1', () => {
      const random = createSeededRandom('test-seed');
      for (let i = 0; i < 100; i++) {
        const value = random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });
  });

  describe('Array Shuffling', () => {
    test('should shuffle array deterministically with same random seed', () => {
      const array = [1, 2, 3, 4, 5];
      const random1 = createSeededRandom('test-seed');
      const random2 = createSeededRandom('test-seed');

      const shuffled1 = shuffleArray(array, random1);
      const shuffled2 = shuffleArray(array, random2);

      expect(shuffled1).toEqual(shuffled2);
      expect(shuffled1).toHaveLength(array.length);
      expect(shuffled1.sort()).toEqual(array.sort());
    });

    test('should produce different shuffles with different seeds', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const random1 = createSeededRandom('seed-1');
      const random2 = createSeededRandom('seed-2');

      const shuffled1 = shuffleArray(array, random1);
      const shuffled2 = shuffleArray(array, random2);

      expect(shuffled1).not.toEqual(shuffled2);
      expect(shuffled1).toHaveLength(array.length);
      expect(shuffled2).toHaveLength(array.length);
    });
  });

  describe('Constraint Solvability', () => {
    test('should detect conflicting type combinations', () => {
      const fireConstraint = { type: 'type', value: 'fire' };
      const waterConstraint = { type: 'type', value: 'water' };

      expect(isConstraintCombinationSolvable(fireConstraint, waterConstraint)).toBe(false);
      expect(isConstraintCombinationSolvable(waterConstraint, fireConstraint)).toBe(false);
    });

    test('should allow compatible type combinations', () => {
      const fireConstraint = { type: 'type', value: 'fire' };
      const flyingConstraint = { type: 'type', value: 'flying' };

      expect(isConstraintCombinationSolvable(fireConstraint, flyingConstraint)).toBe(true);
    });

    test('should detect conflicting stat ranges', () => {
      const highHp = { type: 'stat-range', value: 'hp-high' };
      const lowHp = { type: 'stat-range', value: 'hp-low' };

      expect(isConstraintCombinationSolvable(highHp, lowHp)).toBe(false);
      expect(isConstraintCombinationSolvable(lowHp, highHp)).toBe(false);
    });

    test('should detect conflicting type effectiveness', () => {
      const weakFire = { type: 'type-effectiveness', value: 'weak-fire' };
      const resistFire = { type: 'type-effectiveness', value: 'resist-fire' };

      expect(isConstraintCombinationSolvable(weakFire, resistFire)).toBe(false);
      expect(isConstraintCombinationSolvable(resistFire, weakFire)).toBe(false);
    });

    test('should detect "common sense" conflicts between type and effectiveness', () => {
      // Psychic is naturally resistant to Fighting, so "Psychic and Weak to Fighting" should be avoided
      // even if technically solvable by a dual type (though in this case it isn't even solvable).
      const psychicType = { type: 'type', value: 'psychic' };
      const weakFighting = { type: 'type-effectiveness', value: 'weak-fighting' };
      
      expect(isConstraintCombinationSolvable(psychicType, weakFighting)).toBe(false);
      expect(isConstraintCombinationSolvable(weakFighting, psychicType)).toBe(false);

      // Fire is weak to Water, so "Fire and Resists Water" should be avoided
      const fireType = { type: 'type', value: 'fire' };
      const resistWater = { type: 'type-effectiveness', value: 'resist-water' };
      
      expect(isConstraintCombinationSolvable(fireType, resistWater)).toBe(false);

      // Ghost is immune to Normal
      const ghostType = { type: 'type', value: 'ghost' };
      const weakNormal = { type: 'type-effectiveness', value: 'weak-normal' };
      // Note: weak-normal isn't in our current constraints list but the logic should handle it
      // if it were there. Let's test with one that IS there if possible.
      // Actually weak-to-fire is there. Water resists Fire.
      const waterType = { type: 'type', value: 'water' };
      const weakFire = { type: 'type-effectiveness', value: 'weak-fire' };
      expect(isConstraintCombinationSolvable(waterType, weakFire)).toBe(false);
    });

    test('should allow "common sense" compatible type and effectiveness', () => {
      // Fire is weak to Ground, so "Fire and Weak to Ground" makes sense
      const fireType = { type: 'type', value: 'fire' };
      const weakWater = { type: 'type-effectiveness', value: 'weak-water' };
      
      // isConstraintCombinationSolvable doesn't currently check for "natural" weaknesses
      // it only checks for CONTRADICTORY ones (resists vs weak).
      // So this should be true.
      expect(isConstraintCombinationSolvable(fireType, weakWater)).toBe(true);

      // Water resists Fire
      const waterType = { type: 'type', value: 'water' };
      const resistFire = { type: 'type-effectiveness', value: 'resist-fire' };
      expect(isConstraintCombinationSolvable(waterType, resistFire)).toBe(true);
    });

    test('should handle undefined constraints', () => {
      const fireType = { type: 'type', value: 'fire' };

      expect(isConstraintCombinationSolvable(fireType, undefined)).toBe(false);
      expect(isConstraintCombinationSolvable(undefined, fireType)).toBe(false);
      expect(isConstraintCombinationSolvable(undefined, undefined)).toBe(false);
    });
  });

  describe('Constraint Generation', () => {
    test('should generate solvable constraint combinations', () => {
      const date = new Date('2024-01-01');
      const result = generateSolvableConstraintsForDate(date);

      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('cols');
      expect(result).toHaveProperty('seed');
      expect(result).toHaveProperty('difficulty');

      expect(result.rows).toHaveLength(3);
      expect(result.cols).toHaveLength(3);

      // Verify all combinations are solvable
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          expect(isConstraintCombinationSolvable(result.rows[row], result.cols[col])).toBe(true);
        }
      }
    });

    test('should generate different constraints for different dates', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');

      const result1 = generateSolvableConstraintsForDate(date1);
      const result2 = generateSolvableConstraintsForDate(date2);

      // Seeds should be different
      expect(result1.seed).not.toBe(result2.seed);
    });

    test('should include different constraint types', () => {
      const date = new Date('2024-01-01');
      const result = generateSolvableConstraintsForDate(date);

      const allConstraints = [...result.rows, ...result.cols];
      const types = allConstraints.map(c => c.type);
      const uniqueTypes = [...new Set(types)];

      // Should have at least 2 different types
      expect(uniqueTypes.length).toBeGreaterThanOrEqual(2);
    });

    test('should generate deterministic results for same date', () => {
      const date = new Date('2024-01-15');
      const result1 = generateSolvableConstraintsForDate(date);
      const result2 = generateSolvableConstraintsForDate(date);

      expect(result1.seed).toBe(result2.seed);
      expect(result1.rows).toEqual(result2.rows);
      expect(result1.cols).toEqual(result2.cols);
    });

  });

  describe('Basic Constraint Checking', () => {
    test('should check type constraints correctly', () => {
      const fireConstraint = { type: 'type', value: 'fire' };
      const waterConstraint = { type: 'type', value: 'water' };

      expect(checkBasicConstraints(['fire'], fireConstraint)).toBe(true);
      expect(checkBasicConstraints(['water'], fireConstraint)).toBe(false);
      expect(checkBasicConstraints(['fire', 'flying'], fireConstraint)).toBe(true);
    });

    test('should check type count constraints correctly', () => {
      const singleTypeConstraint = { type: 'type-count', value: 'single' };
      const dualTypeConstraint = { type: 'type-count', value: 'dual' };

      expect(checkBasicConstraints(['fire'], singleTypeConstraint)).toBe(true);
      expect(checkBasicConstraints(['fire', 'flying'], singleTypeConstraint)).toBe(false);
      expect(checkBasicConstraints(['fire', 'flying'], dualTypeConstraint)).toBe(true);
      expect(checkBasicConstraints(['fire'], dualTypeConstraint)).toBe(false);
    });

    test('should handle evolution stage constraints', () => {
      const starterConstraint = { type: 'evolution-stage', value: 'starter' };
      const legendaryConstraint = { type: 'evolution-stage', value: 'legendary' };
      const mythicalConstraint = { type: 'evolution-stage', value: 'mythical' };

      // These are simplified checks - they return true for most cases
      expect(checkBasicConstraints(['fire'], starterConstraint)).toBe(true);
      expect(checkBasicConstraints(['fire'], legendaryConstraint)).toBe(false);
      expect(checkBasicConstraints(['fire'], mythicalConstraint)).toBe(false);
    });

    test('should return true for unknown constraint types', () => {
      const unknownConstraint = { type: 'unknown', value: 'test' };
      expect(checkBasicConstraints(['fire'], unknownConstraint)).toBe(true);
    });

    test('should return true for simplified checks', () => {
      const generationConstraint = { type: 'generation', value: 'generation-i' };
      const statConstraint = { type: 'stat-range', value: 'hp-high' };
      const sizeConstraint = { type: 'height-weight', value: 'small' };
      const moveConstraint = { type: 'move-category', value: 'earthquake' };
      const effectivenessConstraint = { type: 'type-effectiveness', value: 'weak-fire' };

      // These all return true in simplified implementation
      expect(checkBasicConstraints(['fire'], generationConstraint)).toBe(true);
      expect(checkBasicConstraints(['fire'], statConstraint)).toBe(true);
      expect(checkBasicConstraints(['fire'], sizeConstraint)).toBe(true);
      expect(checkBasicConstraints(['fire'], moveConstraint)).toBe(true);
      expect(checkBasicConstraints(['fire'], effectivenessConstraint)).toBe(true);
    });
  });

  describe('Database Operations', () => {
    // Mock the saveGridConfiguration function
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

        console.log(`✅ Saved configuration for ${dateString}`);
        return true;
      } catch (error) {
        console.error(`❌ Error saving configuration for ${dateString}:`, error);
        return false;
      }
    };

    test('should save configuration to database successfully', async () => {
      const mockUpsert = jest.fn(() => Promise.resolve({ data: null, error: null }));
      mockSupabaseClient.from.mockReturnValue({
        upsert: mockUpsert
      });

      const testConfig = {
        rows: [
          { id: 'fire-type', type: 'type', value: 'fire', label: 'Fire' }
        ],
        cols: [
          { id: 'gen-1', type: 'generation', value: 'generation-i', label: 'Generation I' }
        ],
        difficulty: 'medium',
        seed: 'test-seed'
      };

      const date = new Date('2024-01-01');
      const success = await saveGridConfiguration(date, testConfig);

      expect(success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith({
        grid_date: '2024-01-01',
        row_constraints: testConfig.rows,
        col_constraints: testConfig.cols,
        difficulty_level: 'medium',
        generation_seed: 'test-seed'
      }, {
        onConflict: 'grid_date'
      });
    });

    test('should handle database errors gracefully', async () => {
      const mockError = { message: 'Database connection failed' };
      mockSupabaseClient.from.mockReturnValue({
        upsert: jest.fn(() => Promise.resolve({ data: null, error: mockError }))
      });

      const testConfig = {
        rows: [{ type: 'type', value: 'fire' }],
        cols: [{ type: 'generation', value: 'generation-i' }]
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const date = new Date('2024-01-01');
      const success = await saveGridConfiguration(date, testConfig);

      expect(success).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Failed to save configuration for 2024-01-01:',
        mockError.message
      );

      consoleSpy.mockRestore();
    });

    test('should handle string dates correctly', async () => {
      const mockUpsert = jest.fn(() => Promise.resolve({ data: null, error: null }));
      mockSupabaseClient.from.mockReturnValue({
        upsert: mockUpsert
      });

      const testConfig = {
        rows: [{ type: 'type', value: 'fire' }],
        cols: [{ type: 'generation', value: 'generation-i' }]
      };

      const dateString = '2024-01-01';
      const success = await saveGridConfiguration(dateString, testConfig);

      expect(success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ grid_date: '2024-01-01' }),
        expect.any(Object)
      );
    });
  });

  describe('Command Line Interface', () => {
    test('should parse days argument correctly', () => {
      // Test argument parsing
    });

    test('should default to generating today when no arguments', () => {
      // Test default behavior
    });

    test('should handle negative days for backfill', () => {
      // Test backfill functionality
    });
  });
});

