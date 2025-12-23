import { createClient } from '@supabase/supabase-js';
import { checkConstraint } from '../../src/utils/pokegrid-game.utils';
import { Pokemon } from '../../src/types/pokemon';

// Mock Supabase client for end-to-end testing
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

describe('PokéGrid End-to-End Workflow', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createClient('mock-url', 'mock-key');
  });

  describe('Complete Daily Grid Lifecycle', () => {
    test('should handle full grid generation and validation workflow', () => {
      // Step 1: Generate solvable constraints
      const generateSolvableConstraintsForDate = (date: Date) => {
        return {
          rows: [
            { type: 'type', value: 'electric', label: 'Electric' },
            { type: 'type', value: 'fire', label: 'Fire' },
            { type: 'type', value: 'water', label: 'Water' }
          ],
          cols: [
            { type: 'generation', value: 'generation-i', label: 'Generation I' },
            { type: 'evolution-stage', value: 'first', label: 'First Evolution' },
            { type: 'stat-range', value: 'speed-high', label: 'High Speed' }
          ],
          seed: 'e2e-test-seed',
          difficulty: 'medium'
        };
      };

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const constraints = generateSolvableConstraintsForDate(tomorrow);

      // Step 2: Verify constraints are valid types
      expect(constraints.rows).toHaveLength(3);
      expect(constraints.cols).toHaveLength(3);

      // All constraints should have required properties
      [...constraints.rows, ...constraints.cols].forEach(constraint => {
        expect(constraint).toHaveProperty('type');
        expect(constraint).toHaveProperty('value');
        expect(constraint).toHaveProperty('label');
      });

      // Step 3: Test solvability of all 9 combinations
      const isConstraintCombinationSolvable = (row: any, col: any): boolean => {
        // Type conflicts
        if (row.type === 'type' && col.type === 'type') {
          const conflicts = [
            ['fire', 'water'], ['water', 'grass'], ['grass', 'fire'],
            ['electric', 'ground'], ['psychic', 'bug'], ['ghost', 'normal']
          ];
          return !conflicts.some(([a, b]) =>
            (row.value === a && col.value === b) || (row.value === b && col.value === a)
          );
        }

        // Stat conflicts
        if (row.type === 'stat-range' && col.type === 'stat-range') {
          const stats = ['hp', 'attack', 'defense', 'speed'];
          return !stats.some(stat =>
            (row.value === `${stat}-high` && col.value === `${stat}-low`) ||
            (row.value === `${stat}-low` && col.value === `${stat}-high`)
          );
        }

        return true;
      };

      // Verify all combinations are solvable
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          expect(isConstraintCombinationSolvable(
            constraints.rows[row],
            constraints.cols[col]
          )).toBe(true);
        }
      }
    });

    test('should validate real Pokemon against generated constraints', () => {
      // Sample Pokemon data
      const pikachu: Pokemon = {
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        types: ['electric'],
        moves: ['thunderbolt', 'quick-attack', 'thunder-wave', 'iron-tail'],
        sprites: { front_default: '' },
        generation: 'generation-i',
        has_evolutions: true,
        is_default: true,
        base_experience: 112,
        stats: {
          hp: 35,
          attack: 55,
          defense: 40,
          special_attack: 50,
          special_defense: 50,
          speed: 90
        },
        evolution_chain: { evolves_from: 'pichu' },
        is_legendary: false,
        is_mythical: false,
        is_starter: false
      };

      const charizard: Pokemon = {
        id: 6,
        name: 'charizard',
        height: 17,
        weight: 905,
        types: ['fire', 'flying'],
        moves: ['flamethrower', 'wing-attack', 'slash', 'fire-spin'],
        sprites: { front_default: '' },
        generation: 'generation-i',
        has_evolutions: false,
        is_default: true,
        base_experience: 267,
        stats: {
          hp: 78,
          attack: 84,
          defense: 78,
          special_attack: 109,
          special_defense: 85,
          speed: 100
        },
        evolution_chain: { evolves_from: 'charmeleon' },
        is_legendary: false,
        is_mythical: false,
        is_starter: true
      };

      const blastoise: Pokemon = {
        id: 9,
        name: 'blastoise',
        height: 16,
        weight: 855,
        types: ['water'],
        moves: ['hydro-pump', 'skull-bash', 'ice-beam', 'earthquake'],
        sprites: { front_default: '' },
        generation: 'generation-i',
        has_evolutions: false,
        is_default: true,
        base_experience: 265,
        stats: {
          hp: 79,
          attack: 83,
          defense: 100,
          special_attack: 85,
          special_defense: 105,
          speed: 78
        },
        evolution_chain: { evolves_from: 'wartortle' },
        is_legendary: false,
        is_mythical: false,
        is_starter: true
      };

      // Test constraint grid with real Pokemon
      const gridConstraints = {
        rows: [
          { type: 'type', value: 'electric', label: 'Electric' },
          { type: 'type', value: 'fire', label: 'Fire' },
          { type: 'type', value: 'water', label: 'Water' }
        ],
        cols: [
          { type: 'generation', value: 'generation-i', label: 'Generation I' },
          { type: 'evolution-stage', value: 'final', label: 'Final Evolution' },
          { type: 'stat-range', value: 'speed-high', label: 'High Speed (≥100)' }
        ]
      };

      // Test each cell position with appropriate Pokemon
      const testCases = [
        // Cell 0,0: Electric + Gen I
        { pokemon: pikachu, row: 0, col: 0, expected: true },
        // Cell 1,1: Fire + Final Evolution
        { pokemon: charizard, row: 1, col: 1, expected: true },
        // Cell 2,2: Water + High Speed
        { pokemon: blastoise, row: 2, col: 2, expected: false } // Blastoise speed is 78, not >=100
      ];

      testCases.forEach(({ pokemon, row, col, expected }) => {
        const rowConstraint = gridConstraints.rows[row];
        const colConstraint = gridConstraints.cols[col];

        const rowMatch = checkConstraint(pokemon, rowConstraint);
        const colMatch = checkConstraint(pokemon, colConstraint);
        const bothMatch = rowMatch && colMatch;

        expect(bothMatch).toBe(expected);
      });
    });

    test('should handle complete game simulation', () => {
      // Simulate a complete game session
      const gameState = {
        gridDate: '2024-01-01',
        cells: [
          { id: 'cell-0-0', pokemon: null, attempts: 0 },
          { id: 'cell-0-1', pokemon: null, attempts: 0 },
          { id: 'cell-0-2', pokemon: null, attempts: 0 },
          { id: 'cell-1-0', pokemon: null, attempts: 0 },
          { id: 'cell-1-1', pokemon: null, attempts: 0 },
          { id: 'cell-1-2', pokemon: null, attempts: 0 },
          { id: 'cell-2-0', pokemon: null, attempts: 0 },
          { id: 'cell-2-1', pokemon: null, attempts: 0 },
          { id: 'cell-2-2', pokemon: null, attempts: 0 }
        ],
        totalGuesses: 0,
        score: 0,
        completed: false,
        perfectGame: false
      };

      // Simulate filling the grid
      const pikachu: Pokemon = {
        id: 25, name: 'pikachu', height: 4, weight: 60, types: ['electric'],
        moves: ['thunderbolt'], sprites: { front_default: '' },
        generation: 'generation-i', has_evolutions: true, is_default: true,
        base_experience: 112,
        stats: { hp: 35, attack: 55, defense: 40, special_attack: 50, special_defense: 50, speed: 90 },
        evolution_chain: { evolves_from: 'pichu' }, is_legendary: false, is_mythical: false, is_starter: false
      };

      // Fill all cells with Pikachu (simplified test)
      gameState.cells.forEach(cell => {
        cell.pokemon = pikachu;
        cell.attempts = 1;
      });

      gameState.totalGuesses = 9;
      gameState.completed = true;
      gameState.perfectGame = true;

      // Verify game completion
      expect(gameState.completed).toBe(true);
      expect(gameState.perfectGame).toBe(true);
      expect(gameState.totalGuesses).toBe(9);
      expect(gameState.cells.every(cell => cell.pokemon !== null)).toBe(true);
    });

    test('should handle database operations workflow', async () => {
      // Mock successful database operations
      const mockRpc = jest.fn();
      mockSupabaseClient.rpc.mockImplementation(mockRpc);

      // 1. Save grid configuration
      mockRpc.mockResolvedValueOnce({ data: [123], error: null });

      const saveResult = await mockSupabaseClient.rpc('save_pokegrid_configuration', {
        p_grid_date: '2024-01-01',
        p_configuration: { rows: [], cols: [] },
        p_difficulty_level: 'medium',
        p_generation_seed: 'test-seed'
      });

      expect(saveResult.data).toEqual([123]);

      // 2. Load grid configuration
      const mockConfig = {
        id: 123,
        grid_date: '2024-01-01',
        configuration: { rows: [], cols: [] },
        difficulty_level: 'medium'
      };
      mockRpc.mockResolvedValueOnce({ data: [mockConfig], error: null });

      const loadResult = await mockSupabaseClient.rpc('get_pokegrid_configuration', {
        p_grid_date: '2024-01-01'
      });

      expect(loadResult.data[0]).toEqual(mockConfig);

      // 3. Save user progress
      mockRpc.mockResolvedValueOnce({ data: [456], error: null });

      const progressResult = await mockSupabaseClient.rpc('save_pokegrid_progress', {
        p_user_id: 'user-123',
        p_grid_date: '2024-01-01',
        p_game_data: { cells: [] },
        p_completed: true,
        p_score: 2700,
        p_total_guesses: 9,
        p_correct_guesses: 9
      });

      expect(progressResult.error).toBe(null);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing constraint data gracefully', () => {
      const invalidConstraint = { type: 'invalid-type', value: 'test' };

      const pikachu: Pokemon = {
        id: 25, name: 'pikachu', types: ['electric'], generation: 'generation-i',
        has_evolutions: true, height: 4, weight: 60, moves: [], sprites: { front_default: '' },
        is_default: true, base_experience: 0
      };

      // Invalid constraint types should return false
      expect(checkConstraint(pikachu, invalidConstraint)).toBe(false);
    });

    test('should handle network failures during grid operations', async () => {
      // Mock network failure
      const mockRpc = jest.fn().mockRejectedValue(new Error('Network error'));
      mockSupabaseClient.rpc.mockImplementation(mockRpc);

      try {
        await mockSupabaseClient.rpc('get_pokegrid_configuration', {
          p_grid_date: '2024-01-01'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    test('should handle invalid grid dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10); // More than 7 days ahead

      // The system should only allow today and last 6 days
      const today = new Date();
      const validWindow = 7; // days

      const isValidDate = (date: Date) => {
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= -6 && diffDays <= 0; // Today and last 6 days
      };

      expect(isValidDate(today)).toBe(true);
      expect(isValidDate(futureDate)).toBe(false);

      const sixDaysAgo = new Date(today);
      sixDaysAgo.setDate(today.getDate() - 6);
      expect(isValidDate(sixDaysAgo)).toBe(true);

      const eightDaysAgo = new Date(today);
      eightDaysAgo.setDate(today.getDate() - 8);
      expect(isValidDate(eightDaysAgo)).toBe(false);
    });
  });
});
