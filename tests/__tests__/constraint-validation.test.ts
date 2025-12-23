import { checkConstraint } from '../../src/utils/pokegrid-game.utils';
import { Pokemon } from '../../src/types/pokemon';

describe('Constraint Validation', () => {
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

  describe('Type constraints', () => {
    test('should match electric type', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'type',
        value: 'electric',
        id: 'electric-type',
        label: 'Electric',
        description: 'Electric-type Pokémon'
      })).toBe(true);
    });

    test('should not match fire type', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'type',
        value: 'fire',
        id: 'fire-type',
        label: 'Fire',
        description: 'Fire-type Pokémon'
      })).toBe(false);
    });
  });

  describe('Generation constraints', () => {
    test('should match generation I', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'generation',
        value: 'generation-i',
        id: 'gen-1',
        label: 'Generation I',
        description: 'Kanto region Pokémon'
      })).toBe(true);
    });

    test('should not match generation II', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'generation',
        value: 'generation-ii',
        id: 'gen-2',
        label: 'Generation II',
        description: 'Johto region Pokémon'
      })).toBe(false);
    });
  });

  describe('Evolution stage constraints', () => {
    test('should match first evolution', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'evolution-stage',
        value: 'first',
        id: 'first-evo',
        label: 'First Evolution',
        description: 'First evolution stage'
      })).toBe(true);
    });

    test('should not match final evolution', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'evolution-stage',
        value: 'final',
        id: 'final-evo',
        label: 'Final Evolution',
        description: 'Final evolution Pokémon'
      })).toBe(false);
    });

    test('should not match no evolution', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'evolution-stage',
        value: 'none',
        id: 'no-evolution',
        label: 'No Evolution',
        description: 'Does not evolve'
      })).toBe(false);
    });
  });

  describe('Type count constraints', () => {
    test('should match single type', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'type-count',
        value: 'single',
        id: 'single-type',
        label: 'Single Type',
        description: 'Single-type Pokémon'
      })).toBe(true);
    });

    test('should not match dual type', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'type-count',
        value: 'dual',
        id: 'dual-type',
        label: 'Dual Type',
        description: 'Dual-type Pokémon'
      })).toBe(false);
    });
  });

  describe('Stat range constraints', () => {
    test('should match low HP', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'stat-range',
        value: 'hp-low',
        id: 'low-hp',
        label: 'Low HP',
        description: 'HP ≤ 50'
      })).toBe(true);
    });

    test('should match high speed', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'stat-range',
        value: 'speed-high',
        id: 'high-speed',
        label: 'High Speed',
        description: 'Speed ≥ 100'
      })).toBe(false); // Pikachu has 90 speed
    });

    test('should handle missing stats gracefully', () => {
      const pokemonWithoutStats = { ...mockPokemon, stats: undefined };
      expect(checkConstraint(pokemonWithoutStats, {
        type: 'stat-range',
        value: 'hp-high',
        id: 'high-hp',
        label: 'High HP',
        description: 'HP ≥ 100'
      })).toBe(false);
    });
  });

  describe('Height-weight constraints', () => {
    test('should match small size', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'height-weight',
        value: 'small',
        id: 'small-size',
        label: 'Small',
        description: 'Height < 1.0m AND Weight < 30kg'
      })).toBe(true);
    });

    test('should match light weight', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'height-weight',
        value: 'light',
        id: 'light-weight',
        label: 'Light',
        description: 'Weight < 10kg'
      })).toBe(true);
    });
  });

  describe('Move category constraints', () => {
    test('should match thunder wave', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'move-category',
        value: 'thunder-wave',
        id: 'learns-thunder-wave',
        label: 'Learns Thunder Wave',
        description: 'Can learn Thunder Wave'
      })).toBe(true);
    });

    test('should not match earthquake', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'move-category',
        value: 'earthquake',
        id: 'learns-earthquake',
        label: 'Learns Earthquake',
        description: 'Can learn Earthquake'
      })).toBe(false);
    });
  });

  describe('Type effectiveness constraints', () => {
    test('should match weak to ground', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'type-effectiveness',
        value: 'weak-ground',
        id: 'weak-to-ground',
        label: 'Weak to Ground',
        description: 'Takes super effective damage from Ground'
      })).toBe(true); // Electric is weak to ground
    });

    test('should not match weak to fire', () => {
      expect(checkConstraint(mockPokemon, {
        type: 'type-effectiveness',
        value: 'weak-fire',
        id: 'weak-to-fire',
        label: 'Weak to Fire',
        description: 'Takes super effective damage from Fire'
      })).toBe(false); // Electric resists fire
    });
  });
});
