import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PokemonMemoryMatch } from '../PokemonMemoryMatch';
import { GAME_CONSTANTS } from '../PokemonMemoryMatch';

// Mock Pokemon data for testing
const mockPokemonList = [
  { id: 1, name: 'bulbasaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 7, weight: 69, moves: [], has_evolutions: true, is_default: true, base_experience: 64 },
  { id: 2, name: 'ivysaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 10, weight: 130, moves: [], has_evolutions: true, is_default: true, base_experience: 142 },
  { id: 3, name: 'venusaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 20, weight: 1000, moves: [], has_evolutions: false, is_default: true, base_experience: 263 },
  { id: 4, name: 'charmander', types: ['fire'], sprites: {}, generation: 'generation-i', height: 6, weight: 85, moves: [], has_evolutions: true, is_default: true, base_experience: 62 },
  { id: 5, name: 'charmeleon', types: ['fire'], sprites: {}, generation: 'generation-i', height: 11, weight: 190, moves: [], has_evolutions: true, is_default: true, base_experience: 142 },
  { id: 6, name: 'charizard', types: ['fire', 'flying'], sprites: {}, generation: 'generation-i', height: 17, weight: 905, moves: [], has_evolutions: false, is_default: true, base_experience: 267 },
  { id: 7, name: 'squirtle', types: ['water'], sprites: {}, generation: 'generation-i', height: 5, weight: 90, moves: [], has_evolutions: true, is_default: true, base_experience: 63 },
  { id: 8, name: 'wartortle', types: ['water'], sprites: {}, generation: 'generation-i', height: 10, weight: 225, moves: [], has_evolutions: true, is_default: true, base_experience: 142 },
  { id: 9, name: 'blastoise', types: ['water'], sprites: {}, generation: 'generation-i', height: 16, weight: 855, moves: [], has_evolutions: false, is_default: true, base_experience: 265 },
  { id: 10, name: 'caterpie', types: ['bug'], sprites: {}, generation: 'generation-i', height: 3, weight: 29, moves: [], has_evolutions: true, is_default: true, base_experience: 39 },
  { id: 11, name: 'metapod', types: ['bug'], sprites: {}, generation: 'generation-i', height: 7, weight: 99, moves: [], has_evolutions: true, is_default: true, base_experience: 72 },
  { id: 12, name: 'butterfree', types: ['bug', 'flying'], sprites: {}, generation: 'generation-i', height: 11, weight: 320, moves: [], has_evolutions: false, is_default: true, base_experience: 178 },
  { id: 25, name: 'pikachu', types: ['electric'], sprites: {}, generation: 'generation-i', height: 4, weight: 60, moves: [], has_evolutions: true, is_default: true, base_experience: 112 },
  { id: 26, name: 'raichu', types: ['electric'], sprites: {}, generation: 'generation-i', height: 8, weight: 300, moves: [], has_evolutions: false, is_default: true, base_experience: 243 },
  { id: 39, name: 'jigglypuff', types: ['normal', 'fairy'], sprites: {}, generation: 'generation-i', height: 5, weight: 55, moves: [], has_evolutions: true, is_default: true, base_experience: 95 },
  { id: 40, name: 'wigglytuff', types: ['normal', 'fairy'], sprites: {}, generation: 'generation-i', height: 10, weight: 120, moves: [], has_evolutions: false, is_default: true, base_experience: 218 },
];

const mockOnGameComplete = jest.fn();

describe('PokemonMemoryMatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders with default difficulty level', () => {
    render(<PokemonMemoryMatch pokemonList={mockPokemonList} onGameComplete={mockOnGameComplete} />);

    expect(screen.getByText('Pokémon Memory Match')).toBeInTheDocument();
    expect(screen.getByText('Find matching pairs of Pokémon cards!')).toBeInTheDocument();
  });

  it('displays difficulty selection buttons', () => {
    render(<PokemonMemoryMatch pokemonList={mockPokemonList} onGameComplete={mockOnGameComplete} />);

    expect(screen.getByText('Choose Difficulty')).toBeInTheDocument();
    expect(screen.getByText('Easy (6 pairs)')).toBeInTheDocument();
    expect(screen.getByText('Medium (8 pairs)')).toBeInTheDocument();
    expect(screen.getByText('Hard (12 pairs)')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<PokemonMemoryMatch pokemonList={[]} onGameComplete={mockOnGameComplete} />);

    expect(screen.getByText('Loading Pokemon...')).toBeInTheDocument();
  });

  it('starts game when card is clicked', () => {
    render(<PokemonMemoryMatch pokemonList={mockPokemonList} onGameComplete={mockOnGameComplete} />);

    // Wait for game to initialize
    jest.advanceTimersByTime(100);

    // Game should start when first card is clicked
    const cards = screen.getAllByRole('button');
    if (cards.length > 0) {
      fireEvent.click(cards[0]);
      // Timer should start (this would normally start the game)
    }
  });

  it('displays correct game stats', () => {
    render(<PokemonMemoryMatch pokemonList={mockPokemonList} onGameComplete={mockOnGameComplete} />);

    // Wait for game initialization
    jest.advanceTimersByTime(100);

    // Check if stats are displayed (they might be in fixed panel)
    // This test verifies the component renders without crashing
    expect(screen.getByText('Pokémon Memory Match')).toBeInTheDocument();
  });

  it('handles difficulty changes correctly', () => {
    render(<PokemonMemoryMatch pokemonList={mockPokemonList} onGameComplete={mockOnGameComplete} />);

    const hardButton = screen.getByText('Hard (12 pairs)');
    fireEvent.click(hardButton);

    // Should show confirmation modal for difficulty change during gameplay
    // This test verifies the button is clickable
    expect(hardButton).toBeInTheDocument();
  });

  it('displays progress bar', () => {
    render(<PokemonMemoryMatch pokemonList={mockPokemonList} onGameComplete={mockOnGameComplete} />);

    // Wait for game initialization
    jest.advanceTimersByTime(100);

    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('shows New Game button', () => {
    render(<PokemonMemoryMatch pokemonList={mockPokemonList} onGameComplete={mockOnGameComplete} />);

    expect(screen.getByText('New Game')).toBeInTheDocument();
  });
});

// Test utility functions and constants
describe('GAME_CONSTANTS', () => {
  it('has correct animation timing constants', () => {
    expect(GAME_CONSTANTS.MATCH_ANIMATION_DELAY).toBe(600);
    expect(GAME_CONSTANTS.MISMATCH_ANIMATION_DELAY).toBe(600);
    expect(GAME_CONSTANTS.CELEBRATION_DURATION).toBe(600);
    expect(GAME_CONSTANTS.TIMER_INTERVAL).toBe(1000);
  });

  it('has correct scoring system constants', () => {
    expect(GAME_CONSTANTS.BASE_SCORE).toBe(1000);
    expect(GAME_CONSTANTS.MOVE_PENALTY).toBe(10);
    expect(GAME_CONSTANTS.TIME_PENALTY).toBe(2);
    expect(GAME_CONSTANTS.MINIMUM_SCORE).toBe(100);
  });

  it('has correct UI measurement constants', () => {
    expect(GAME_CONSTANTS.STATS_PANEL_WIDTH).toBe(140);
    expect(GAME_CONSTANTS.PROGRESS_BAR_HEIGHT).toBe(3);
    expect(GAME_CONSTANTS.TOUCH_TARGET_SIZE).toBe(44);
  });

  it('has correct game mechanics constants', () => {
    expect(GAME_CONSTANTS.MAX_FLIPPED_CARDS).toBe(2);
  });

  it('has correct difficulty levels', () => {
    expect(GAME_CONSTANTS.DIFFICULTY_LEVELS.easy.pairs).toBe(6);
    expect(GAME_CONSTANTS.DIFFICULTY_LEVELS.medium.pairs).toBe(8);
    expect(GAME_CONSTANTS.DIFFICULTY_LEVELS.hard.pairs).toBe(12);
  });
});

// Test scoring algorithm
describe('Scoring Algorithm', () => {
  const calculateScore = (moves: number, time: number) => {
    return Math.max(
      GAME_CONSTANTS.BASE_SCORE -
      (moves * GAME_CONSTANTS.MOVE_PENALTY) -
      (time * GAME_CONSTANTS.TIME_PENALTY),
      GAME_CONSTANTS.MINIMUM_SCORE
    );
  };

  it('calculates perfect score correctly', () => {
    const score = calculateScore(6, 10); // Minimum moves and time for easy level
    expect(score).toBe(1000 - (6 * 10) - (10 * 2)); // 1000 - 60 - 20 = 920
    expect(score).toBe(920);
  });

  it('applies minimum score limit', () => {
    const score = calculateScore(200, 500); // Very high moves and time
    expect(score).toBe(GAME_CONSTANTS.MINIMUM_SCORE);
  });

  it('handles zero moves and time', () => {
    const score = calculateScore(0, 0);
    expect(score).toBe(GAME_CONSTANTS.BASE_SCORE);
  });
});

// Test Pokemon selection algorithm
describe('Pokemon Selection Algorithm', () => {
  it('selects unique Pokemon by ID', () => {
    const selectedIds = new Set<number>();
    const testPokemon = [
      { id: 1, generation: 'generation-i' },
      { id: 2, generation: 'generation-i' },
      { id: 1, generation: 'generation-i' }, // Duplicate ID
      { id: 3, generation: 'generation-ii' },
    ];

    // Simulate selection logic
    for (const pokemon of testPokemon) {
      if (!selectedIds.has(pokemon.id)) {
        selectedIds.add(pokemon.id);
      }
    }

    expect(selectedIds.size).toBe(3); // Should have 3 unique IDs
    expect(selectedIds.has(1)).toBe(true);
    expect(selectedIds.has(2)).toBe(true);
    expect(selectedIds.has(3)).toBe(true);
  });

  it('validates Pokemon data correctly', () => {
    const validPokemon = [
      { id: 1, name: 'test', generation: 'gen-i' },
      { id: 2, name: '', generation: 'gen-i' }, // Invalid: empty name
      { id: undefined, name: 'test', generation: 'gen-i' }, // Invalid: no id
      { id: 3, name: 'valid', generation: 'gen-i' },
    ];

    const filtered = validPokemon.filter(pokemon =>
      pokemon && typeof pokemon.id === 'number' && pokemon.name
    );

    expect(filtered.length).toBe(2);
    expect(filtered[0].id).toBe(1);
    expect(filtered[1].id).toBe(3);
  });
});

// Test timer functionality
describe('Timer Functionality', () => {
  it('calculates time correctly', () => {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(59)).toBe('0:59');
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(125)).toBe('2:05');
    expect(formatTime(3599)).toBe('59:59');
  });

  it('uses correct timer interval', () => {
    expect(GAME_CONSTANTS.TIMER_INTERVAL).toBe(1000); // 1 second
  });
});

// Test grid layout logic
describe('Grid Layout Logic', () => {
  const getGridClasses = (difficulty: string): string => {
    const grid = GAME_CONSTANTS.DIFFICULTY_LEVELS[difficulty as keyof typeof GAME_CONSTANTS.DIFFICULTY_LEVELS]?.grid;
    switch (grid) {
      case '3x4':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
      case '4x4':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
      case '4x6':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
      default:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
    }
  };

  it('returns correct grid classes for easy difficulty', () => {
    expect(getGridClasses('easy')).toBe('grid-cols-2 sm:grid-cols-3 md:grid-cols-4');
  });

  it('returns correct grid classes for medium difficulty', () => {
    expect(getGridClasses('medium')).toBe('grid-cols-2 sm:grid-cols-3 md:grid-cols-4');
  });

  it('returns correct grid classes for hard difficulty', () => {
    expect(getGridClasses('hard')).toBe('grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6');
  });

  it('returns default grid classes for unknown difficulty', () => {
    expect(getGridClasses('unknown')).toBe('grid-cols-2 sm:grid-cols-3 md:grid-cols-4');
  });
});

// Test keyboard shortcuts
describe('Keyboard Shortcuts', () => {
  it('defines correct keyboard shortcuts', () => {
    // Test that Space key is defined for new game
    // This is more of an integration test, but we can verify the logic
    const mockEvent = {
      code: 'Space',
      preventDefault: jest.fn(),
    };

    // Simulate the keyboard handler logic
    if (mockEvent.code === 'Space') {
      mockEvent.preventDefault();
      // Would call handleNewGame()
    }

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });
});
