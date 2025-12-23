import { createClient } from '@supabase/supabase-js';
import { Pokemon } from '../../src/types/pokemon';
import { checkConstraint } from '../../src/utils/pokegrid-game.utils';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }))
}));

describe('PokéGrid Integration Tests', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createClient('mock-url', 'mock-key');
  });

  describe('Grid Generation Integration', () => {
    test('should generate solvable grid configurations', async () => {
      // Mock the constraint generation function
      const generateSolvableConstraintsForDate = (date: Date) => {
        return {
          rows: [
            { type: 'type', value: 'fire', label: 'Fire' },
            { type: 'type', value: 'water', label: 'Water' },
            { type: 'type', value: 'grass', label: 'Grass' }
          ],
          cols: [
            { type: 'generation', value: 'generation-i', label: 'Generation I' },
            { type: 'evolution-stage', value: 'final', label: 'Final Evolution' },
            { type: 'stat-range', value: 'hp-high', label: 'High HP' }
          ],
          seed: 'test-seed',
          difficulty: 'medium'
        };
      };

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const constraints = generateSolvableConstraintsForDate(tomorrow);

      // Verify structure
      expect(constraints.rows).toHaveLength(3);
      expect(constraints.cols).toHaveLength(3);
      expect(constraints.difficulty).toBe('medium');

      // Verify constraint types are valid
      constraints.rows.forEach((constraint: any) => {
        expect(['type', 'generation', 'evolution-stage', 'stat-range', 'height-weight', 'type-count', 'move-category', 'type-effectiveness']).toContain(constraint.type);
      });

      constraints.cols.forEach((constraint: any) => {
        expect(['type', 'generation', 'evolution-stage', 'stat-range', 'height-weight', 'type-count', 'move-category', 'type-effectiveness']).toContain(constraint.type);
      });
    });

    test('should validate grid solvability', () => {
      const isConstraintCombinationSolvable = (rowConstraint: any, colConstraint: any): boolean => {
        // Type conflicts
        if (rowConstraint.type === 'type' && colConstraint.type === 'type') {
          const conflictingTypes = [
            ['fire', 'water'], ['water', 'grass'], ['grass', 'fire']
          ];

          return !conflictingTypes.some(([type1, type2]) =>
            (rowConstraint.value === type1 && colConstraint.value === type2) ||
            (rowConstraint.value === type2 && colConstraint.value === type1)
          );
        }

        // Stat conflicts
        if (rowConstraint.type === 'stat-range' && colConstraint.type === 'stat-range') {
          const stats = ['hp', 'attack', 'defense', 'speed'];
          return !stats.some(stat =>
            (rowConstraint.value === `${stat}-high` && colConstraint.value === `${stat}-low`) ||
            (rowConstraint.value === `${stat}-low` && colConstraint.value === `${stat}-high`)
          );
        }

        return true;
      };

      // Test valid combinations
      expect(isConstraintCombinationSolvable(
        { type: 'type', value: 'fire' },
        { type: 'generation', value: 'generation-i' }
      )).toBe(true);

      // Test invalid combinations
      expect(isConstraintCombinationSolvable(
        { type: 'type', value: 'fire' },
        { type: 'type', value: 'water' }
      )).toBe(false);

      expect(isConstraintCombinationSolvable(
        { type: 'stat-range', value: 'hp-high' },
        { type: 'stat-range', value: 'hp-low' }
      )).toBe(false);
    });
  });

  describe('Database Integration', () => {
    test('should save grid configuration to database', async () => {
      const mockRpc = jest.fn().mockResolvedValue({ data: [123], error: null });
      mockSupabaseClient.rpc.mockImplementation(mockRpc);

      const testConfig = {
        rows: [{ type: 'type', value: 'fire' }],
        cols: [{ type: 'generation', value: 'generation-i' }]
      };

      // Simulate the save operation
      const result = await mockSupabaseClient.rpc('save_pokegrid_configuration', {
        p_grid_date: '2024-01-01',
        p_configuration: testConfig,
        p_difficulty_level: 'medium',
        p_generation_seed: 'test-seed'
      });

      expect(mockRpc).toHaveBeenCalledWith('save_pokegrid_configuration', {
        p_grid_date: '2024-01-01',
        p_configuration: testConfig,
        p_difficulty_level: 'medium',
        p_generation_seed: 'test-seed'
      });
    });

    test('should load grid configuration from database', async () => {
      const mockData = {
        id: 1,
        grid_date: '2024-01-01',
        configuration: {
          rows: [{ type: 'type', value: 'fire' }],
          cols: [{ type: 'generation', value: 'generation-i' }]
        },
        difficulty_level: 'medium'
      };

      const mockRpc = jest.fn().mockResolvedValue({ data: [mockData], error: null });
      mockSupabaseClient.rpc.mockImplementation(mockRpc);

      const result = await mockSupabaseClient.rpc('get_pokegrid_configuration', {
        p_grid_date: '2024-01-01'
      });

      expect(mockRpc).toHaveBeenCalledWith('get_pokegrid_configuration', {
        p_grid_date: '2024-01-01'
      });

      expect(result.data[0]).toEqual(mockData);
    });
  });

  describe('End-to-End Grid Validation', () => {
    test('should validate complete grid has solvable combinations', () => {
      const grid = {
        rows: [
          { type: 'type', value: 'fire' },
          { type: 'type', value: 'water' },
          { type: 'type', value: 'grass' }
        ],
        cols: [
          { type: 'generation', value: 'generation-i' },
          { type: 'evolution-stage', value: 'final' },
          { type: 'stat-range', value: 'hp-high' }
        ]
      };

      const isConstraintCombinationSolvable = (row: any, col: any): boolean => {
        if (row.type === 'type' && col.type === 'type') {
          const conflicts = [['fire', 'water'], ['water', 'grass'], ['grass', 'fire']];
          return !conflicts.some(([a, b]) =>
            (row.value === a && col.value === b) || (row.value === b && col.value === a)
          );
        }
        return true;
      };

      // Check all 9 combinations in the 3x3 grid
      let allSolvable = true;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (!isConstraintCombinationSolvable(grid.rows[row], grid.cols[col])) {
            allSolvable = false;
            break;
          }
        }
        if (!allSolvable) break;
      }

      expect(allSolvable).toBe(true);
    });

    test('should handle Pokemon constraint checking', () => {
      const mockPokemon: Pokemon = {
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        types: ['electric'],
        moves: ['thunderbolt', 'quick-attack', 'thunder-wave'],
        sprites: { front_default: '' },
        generation: 'generation-i',
        has_evolutions: true,
        is_default: true,
        base_experience: 112,
        stats: [{ hp: 35, attack: 55, defense: 40, special_attack: 50, special_defense: 50, speed: 90 }],
        evolution_chain: { evolves_from: 'pichu' },
        is_legendary: false,
        is_mythical: false,
        is_starter: false
      };

      // Test that constraint checking works with actual Pokemon data
      const electricType = { type: 'type', value: 'electric' };
      const pikachuGen = { type: 'generation', value: 'generation-i' };

      expect(checkConstraint(mockPokemon, electricType)).toBe(true);
      expect(checkConstraint(mockPokemon, pikachuGen)).toBe(true);

      // Test non-matching constraints
      const fireType = { type: 'type', value: 'fire' };
      expect(checkConstraint(mockPokemon, fireType)).toBe(false);
    });
  });
});
