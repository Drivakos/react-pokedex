/**
 * Grid Generation Smoke Tests
 * Production-ready tests that validate the complete grid generation workflow
 *
 * These tests simulate production usage and validate that generated grids
 * are playable and meet quality standards.
 */

import { jest } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { generateSolvableConstraintsForDate } from '../scripts/generate-daily-grids-utils.js';

// Mock Supabase for smoke tests (we'll test with real data validation)
jest.mock('@supabase/supabase-js');

describe('Grid Generation Smoke Tests', () => {
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

  describe('Production Grid Quality', () => {
    test('should generate grids with balanced difficulty', () => {
      // Generate grids for a week
      const baseDate = new Date('2024-01-01');
      const difficulties = [];

      for (let i = 0; i < 7; i++) {
        const testDate = new Date(baseDate);
        testDate.setDate(baseDate.getDate() + i);

        const constraints = generateSolvableConstraintsForDate(testDate);
        difficulties.push(constraints.difficulty);
      }

      // Should have reasonable difficulties (currently all medium, but test allows for future variety)
      const uniqueDifficulties = [...new Set(difficulties)];
      const validDifficulties = ['easy', 'medium', 'hard'];

      uniqueDifficulties.forEach(difficulty => {
        expect(validDifficulties).toContain(difficulty);
      });

      // All should be medium or easy (current implementation)
      difficulties.forEach(difficulty => {
        expect(['easy', 'medium']).toContain(difficulty);
      });
    });

    test('should generate grids with diverse constraint types', () => {
      const testDate = new Date('2024-01-15');
      const constraints = generateSolvableConstraintsForDate(testDate);

      const allConstraints = [...constraints.rows, ...constraints.cols];
      const typeCounts = {};

      allConstraints.forEach(constraint => {
        typeCounts[constraint.type] = (typeCounts[constraint.type] || 0) + 1;
      });

      // Should have at least 3 different constraint types
      expect(Object.keys(typeCounts).length).toBeGreaterThanOrEqual(3);

      // Types should be reasonable
      const validTypes = ['type', 'generation', 'evolution-stage', 'stat-range', 'height-weight', 'type-count', 'move-category', 'type-effectiveness'];
      Object.keys(typeCounts).forEach(type => {
        expect(validTypes).toContain(type);
      });
    });

    test('should generate grids that change daily', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');

      const grid1 = generateSolvableConstraintsForDate(date1);
      const grid2 = generateSolvableConstraintsForDate(date2);

      // Seeds should be different
      expect(grid1.seed).not.toBe(grid2.seed);

      // At least one constraint should be different
      const constraints1 = [...grid1.rows, ...grid1.cols];
      const constraints2 = [...grid2.rows, ...grid2.cols];

      let hasDifference = false;
      for (let i = 0; i < constraints1.length; i++) {
        if (constraints1[i].id !== constraints2[i].id) {
          hasDifference = true;
          break;
        }
      }
      expect(hasDifference).toBe(true);
    });
  });

  describe('Constraint Balance Validation', () => {
    test('should not have impossible type combinations', () => {
      // Generate many grids and check none have impossible combinations
      for (let i = 0; i < 10; i++) {
        const testDate = new Date(`2024-01-${10 + i}`);
        const constraints = generateSolvableConstraintsForDate(testDate);

        // Check all combinations are solvable
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            const rowConstraint = constraints.rows[row];
            const colConstraint = constraints.cols[col];

            // Simple check for obviously impossible combinations
            if (rowConstraint.type === 'type' && colConstraint.type === 'type') {
              const impossiblePairs = [
                ['fire', 'water'], ['water', 'grass'], ['grass', 'fire']
              ];

              const isImpossible = impossiblePairs.some(([a, b]) =>
                (rowConstraint.value === a && colConstraint.value === b) ||
                (rowConstraint.value === b && colConstraint.value === a)
              );

              expect(isImpossible).toBe(false);
            }
          }
        }
      }
    });

    test('should have reasonable distribution of constraint types', () => {
      const sampleSize = 30;
      const typeDistribution = {};

      for (let i = 0; i < sampleSize; i++) {
        const testDate = new Date(`2024-01-${i + 1}`);
        const constraints = generateSolvableConstraintsForDate(testDate);
        const allConstraints = [...constraints.rows, ...constraints.cols];

        allConstraints.forEach(constraint => {
          typeDistribution[constraint.type] = (typeDistribution[constraint.type] || 0) + 1;
        });
      }

      // Type constraints should be most common
      expect(typeDistribution.type).toBeGreaterThan(sampleSize * 6 * 0.4); // At least 40% types

      // Should have some variety
      expect(Object.keys(typeDistribution).length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Performance Validation', () => {
    test('should generate grids within reasonable time', () => {
      const startTime = Date.now();

      // Generate 10 grids
      for (let i = 0; i < 10; i++) {
        const testDate = new Date(`2024-02-${i + 1}`);
        generateSolvableConstraintsForDate(testDate);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    test('should handle edge dates correctly', () => {
      // Test various edge cases
      const edgeDates = [
        new Date('2020-01-01'), // Far past
        new Date('2030-12-31'), // Far future
        new Date('2024-02-29'), // Leap year
        new Date('2024-12-31'), // Year end
      ];

      edgeDates.forEach(date => {
        const constraints = generateSolvableConstraintsForDate(date);
        expect(constraints.rows).toHaveLength(3);
        expect(constraints.cols).toHaveLength(3);
        expect(constraints.seed).toBeDefined();
      });
    });
  });

  describe('Data Integrity', () => {
    test('should generate valid constraint objects', () => {
      const testDate = new Date('2024-03-15');
      const constraints = generateSolvableConstraintsForDate(testDate);

      const allConstraints = [...constraints.rows, ...constraints.cols];

      allConstraints.forEach(constraint => {
        // Each constraint should have required properties
        expect(constraint).toHaveProperty('id');
        expect(constraint).toHaveProperty('type');
        expect(constraint).toHaveProperty('value');
        expect(constraint).toHaveProperty('label');

        // ID should be a string
        expect(typeof constraint.id).toBe('string');
        expect(constraint.id.length).toBeGreaterThan(0);

        // Type should be valid
        const validTypes = ['type', 'generation', 'evolution-stage', 'stat-range', 'height-weight', 'type-count', 'move-category', 'type-effectiveness'];
        expect(validTypes).toContain(constraint.type);

        // Value should exist
        expect(constraint.value).toBeDefined();
        expect(constraint.value !== null).toBe(true);

        // Label should be a string
        expect(typeof constraint.label).toBe('string');
        expect(constraint.label.length).toBeGreaterThan(0);
      });
    });

    test('should generate unique IDs', () => {
      const testDate = new Date('2024-03-20');
      const constraints = generateSolvableConstraintsForDate(testDate);

      const allConstraints = [...constraints.rows, ...constraints.cols];
      const ids = allConstraints.map(c => c.id);
      const uniqueIds = [...new Set(ids)];

      // All IDs should be unique
      expect(uniqueIds.length).toBe(ids.length);
    });
  });
});
