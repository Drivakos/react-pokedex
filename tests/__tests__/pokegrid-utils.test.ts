import {
  checkConstraint,
  generateDailyGrid,
  calculateScore,
  isGameCompleted,
  isPerfectGame,
  getEffectiveMaxGuesses,
  isOutOfGuesses
} from '../../src/utils/pokegrid-game.utils';
import { Pokemon } from '../../src/types/pokemon';

describe('Pokegrid Game Utils', () => {
  const mockPokemon: Pokemon = {
    id: 25,
    name: 'pikachu',
    height: 4, // 0.4m
    weight: 60, // 6kg
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
    evolution_chain: {
      evolves_from: 'pichu'
    },
    is_legendary: false,
    is_mythical: false,
    is_starter: false
  };

  const mockPokemonWithStats = {
    ...mockPokemon,
    stats: {
      hp: 100,
      attack: 120,
      defense: 100,
      special_attack: 50,
      special_defense: 50,
      speed: 100
    }
  };

  describe('checkConstraint - Enhanced Evolution Logic', () => {
    test('should handle starter pokemon correctly', () => {
      const starterPokemon = {
        ...mockPokemon,
        name: 'bulbasaur',
        evolution_chain: { evolves_from: null },
        has_evolutions: true,
        is_starter: true
      };

      expect(checkConstraint(starterPokemon, {
        type: 'evolution-stage',
        value: 'starter',
        id: 'starter',
        label: 'Starter'
      })).toBe(true);
    });

    test('should handle first evolution pokemon', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'evolution-stage',
        value: 'first',
        id: 'first-evo',
        label: 'First Evolution'
      })).toBe(true); // Pikachu evolved from Pichu and can still evolve
    });

    test('should handle final evolution pokemon', () => {
      const finalEvoPokemon = {
        ...mockPokemon,
        has_evolutions: false
      };

      expect(checkConstraint(finalEvoPokemon, {
        type: 'evolution-stage',
        value: 'final',
        id: 'final-evo',
        label: 'Final Evolution'
      })).toBe(true);
    });

    test('should handle no evolution pokemon', () => {
      const noEvoPokemon = {
        ...mockPokemon,
        has_evolutions: false,
        evolution_chain: { evolves_from: null }
      };

      expect(checkConstraint(noEvoPokemon, {
        type: 'evolution-stage',
        value: 'none',
        id: 'no-evolution',
        label: 'No Evolution'
      })).toBe(true);
    });

    test('should handle legendary pokemon', () => {
      const legendaryPokemon = {
        ...mockPokemon,
        is_legendary: true,
        base_experience: 350
      };

      expect(checkConstraint(legendaryPokemon, {
        type: 'evolution-stage',
        value: 'legendary',
        id: 'legendary',
        label: 'Legendary'
      })).toBe(true);
    });
  });

  describe('checkConstraint - Enhanced Move Logic', () => {
    test('should handle move name variations', () => {
      const pokemonWithMoves = {
        ...mockPokemon,
        moves: ['thunderbolt', 'quick attack', 'thunder-wave', 'iron tail']
      };

      // Test various formats
      expect(checkConstraint(pokemonWithMoves, {
        type: 'move-category',
        value: 'thunder-wave',
        id: 'learns-thunder-wave',
        label: 'Thunder Wave'
      })).toBe(true);

      expect(checkConstraint(pokemonWithMoves, {
        type: 'move-category',
        value: 'thunder-wave',
        id: 'learns-thunder-wave',
        label: 'Thunder Wave'
      })).toBe(true);
    });

    test('should handle surf variations', () => {
      const pokemonWithSurf = {
        ...mockPokemon,
        moves: ['surf', 'water-gun']
      };

      expect(checkConstraint(pokemonWithSurf, {
        type: 'move-category',
        value: 'surf',
        id: 'learns-surf',
        label: 'Surf'
      })).toBe(true);
    });
  });

  describe('checkConstraint - Enhanced Stat Logic', () => {
    test('should handle high stats correctly', () => {
      expect(checkConstraint(mockPokemonWithStats, {
        type: 'stat-range',
        value: 'hp-high',
        id: 'high-hp',
        label: 'High HP'
      })).toBe(true); // HP = 100 >= 100

      expect(checkConstraint(mockPokemonWithStats, {
        type: 'stat-range',
        value: 'attack-high',
        id: 'high-attack',
        label: 'High Attack'
      })).toBe(true); // Attack = 120 >= 120

      expect(checkConstraint(mockPokemonWithStats, {
        type: 'stat-range',
        value: 'speed-high',
        id: 'high-speed',
        label: 'High Speed'
      })).toBe(true); // Speed = 100 >= 100
    });

    test('should handle low stats correctly', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'stat-range',
        value: 'hp-low',
        id: 'low-hp',
        label: 'Low HP'
      })).toBe(true); // HP = 35 <= 50

      expect(checkConstraint(mockPokemon, {
        type: 'stat-range',
        value: 'attack-low',
        id: 'low-attack',
        label: 'Low Attack'
      })).toBe(true); // Attack = 55 <= 60
    });

    test('should handle missing stats gracefully', () => {
      const pokemonWithoutStats = { ...mockPokemon, stats: undefined };

      expect(checkConstraint(pokemonWithoutStats, {
        type: 'stat-range',
        value: 'hp-high',
        id: 'high-hp',
        label: 'High HP'
      })).toBe(false);
    });
  });

  describe('calculateScore', () => {
    test('should calculate basic score correctly', () => {
      const cells = [
        {
          id: 'cell-0-0',
          pokemon: mockPokemon,
          isCorrect: true,
          attempts: 1,
          rarity: 1,
          row: 0,
          col: 0,
          rowConstraint: { type: 'type', value: 'electric' },
          colConstraint: { type: 'generation', value: 'generation-i' }
        }
      ];

      const score = calculateScore(cells);
      expect(score).toBe(120); // 100 base + 20 rarity bonus = 120
    });

    test('should apply attempt penalties', () => {
      const cells = [
        {
          id: 'cell-0-0',
          pokemon: mockPokemon,
          isCorrect: true,
          attempts: 3,
          rarity: 1,
          row: 0,
          col: 0,
          rowConstraint: { type: 'type', value: 'electric' },
          colConstraint: { type: 'generation', value: 'generation-i' }
        }
      ];

      const score = calculateScore(cells);
      expect(score).toBe(76); // (100 base + 20 rarity) * 0.8 fallback multiplier - 20 penalty = 96 - 20 = 76
    });

    test('should handle empty cells', () => {
      const cells = [
        {
          id: 'cell-0-0',
          pokemon: null,
          isCorrect: false,
          attempts: 0,
          rarity: 0,
          row: 0,
          col: 0,
          rowConstraint: { type: 'type', value: 'electric' },
          colConstraint: { type: 'generation', value: 'generation-i' }
        }
      ];

      const score = calculateScore(cells);
      expect(score).toBe(0);
    });
  });

  describe('Game State Functions', () => {
    test('should detect completed games', () => {
      const completedCells = [
        { isCorrect: true, pokemon: mockPokemon },
        { isCorrect: true, pokemon: mockPokemon },
        { isCorrect: true, pokemon: mockPokemon }
      ];

      const incompleteCells = [
        { isCorrect: true, pokemon: mockPokemon },
        { isCorrect: false, pokemon: null },
        { isCorrect: true, pokemon: mockPokemon }
      ];

      expect(isGameCompleted(completedCells)).toBe(true);
      expect(isGameCompleted(incompleteCells)).toBe(false);
    });

    test('should detect perfect games', () => {
      const perfectCells = [
        { isCorrect: true, attempts: 1, pokemon: mockPokemon },
        { isCorrect: true, attempts: 1, pokemon: mockPokemon },
        { isCorrect: true, attempts: 1, pokemon: mockPokemon }
      ];

      const imperfectCells = [
        { isCorrect: true, attempts: 1, pokemon: mockPokemon },
        { isCorrect: true, attempts: 2, pokemon: mockPokemon },
        { isCorrect: true, attempts: 1, pokemon: mockPokemon }
      ];

      expect(isPerfectGame(perfectCells)).toBe(true);
      expect(isPerfectGame(imperfectCells)).toBe(false);
    });
  });

  describe('Guess Limit Functions', () => {
    test('should calculate effective max guesses correctly', () => {
      expect(getEffectiveMaxGuesses(0)).toBe(9); // Base 9 guesses
      expect(getEffectiveMaxGuesses(3)).toBe(12); // Base 9 + 3 bonus
      expect(getEffectiveMaxGuesses(5)).toBe(14); // Base 9 + 5 bonus
    });

    test('should detect out of guesses correctly', () => {
      expect(isOutOfGuesses(8, 0)).toBe(false); // 8 < 9
      expect(isOutOfGuesses(9, 0)).toBe(true);  // 9 >= 9
      expect(isOutOfGuesses(11, 3)).toBe(false); // 11 < 12
      expect(isOutOfGuesses(12, 3)).toBe(true);  // 12 >= 12
    });
  });

  describe('generateDailyGrid', () => {
    test('should generate valid grid structure', () => {
      const date = new Date('2024-01-01');
      const grid = generateDailyGrid(date);

      expect(grid).toHaveProperty('id');
      expect(grid).toHaveProperty('date');
      expect(grid).toHaveProperty('cells');
      expect(grid.cells).toHaveLength(9); // 3x3 grid
      expect(grid).toHaveProperty('constraints');
      expect(grid.constraints.rows).toHaveLength(3);
      expect(grid.constraints.cols).toHaveLength(3);
    });

    test('should generate deterministic grids for same date', () => {
      const date = new Date('2024-01-01');
      const grid1 = generateDailyGrid(date);
      const grid2 = generateDailyGrid(date);

      expect(grid1.id).toBe(grid2.id);
      expect(grid1.cells.length).toBe(grid2.cells.length);
    });

    test('should generate different grids for different dates', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      const grid1 = generateDailyGrid(date1);
      const grid2 = generateDailyGrid(date2);

      expect(grid1.id).not.toBe(grid2.id);
    });
  });
});
