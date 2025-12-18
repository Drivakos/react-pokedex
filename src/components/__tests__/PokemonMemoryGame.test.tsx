import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PokemonMemoryGame from '../PokemonMemoryGame';

// Mock the usePokemon hook
jest.mock('../../hooks/usePokemon', () => ({
  usePokemon: jest.fn(),
}));

// Mock the API fetchPokemonData function
jest.mock('../../services/api', () => ({
  fetchPokemonData: jest.fn(),
}));

// Import after mocking
import { fetchPokemonData } from '../../services/api';
import { usePokemon } from '../../hooks/usePokemon';

describe('PokemonMemoryGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePokemon as jest.Mock).mockReturnValue({
      displayedPokemon: [
        { id: 1, name: 'bulbasaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 7, weight: 69, moves: [], has_evolutions: true, is_default: true, base_experience: 64 },
        { id: 2, name: 'ivysaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 10, weight: 130, moves: [], has_evolutions: true, is_default: true, base_experience: 142 },
        { id: 3, name: 'venusaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 20, weight: 1000, moves: [], has_evolutions: false, is_default: true, base_experience: 263 },
      ],
      loading: false,
      loadMorePokemon: jest.fn(),
      hasMore: false,
    });
  });

  it('renders loading state initially', () => {
    // Mock loading state
    (usePokemon as jest.Mock).mockReturnValue({
      displayedPokemon: [],
      loading: true,
      loadMorePokemon: jest.fn(),
      hasMore: false,
    });

    render(<PokemonMemoryGame />);

    expect(screen.getByText('Loading Pokemon...')).toBeInTheDocument();
  });

  it('renders game when Pokemon data is loaded', async () => {
    const mockPokemon = [
      { id: 1, name: 'bulbasaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 7, weight: 69, moves: [], has_evolutions: true, is_default: true, base_experience: 64 },
      { id: 2, name: 'ivysaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 10, weight: 130, moves: [], has_evolutions: true, is_default: true, base_experience: 142 },
    ];
    (fetchPokemonData as jest.Mock).mockResolvedValue(mockPokemon);

    render(<PokemonMemoryGame />);

    // Wait for the component to load Pokemon data
    await waitFor(() => {
      expect(screen.getByText('Pokémon Memory Match')).toBeInTheDocument();
    });

    expect(screen.getByText('Find matching pairs of Pokémon cards!')).toBeInTheDocument();
  });

  it('calls fetchPokemonData to load game Pokemon', async () => {
    const mockPokemon = [
      { id: 1, name: 'bulbasaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 7, weight: 69, moves: [], has_evolutions: true, is_default: true, base_experience: 64 },
      { id: 2, name: 'ivysaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 10, weight: 130, moves: [], has_evolutions: true, is_default: true, base_experience: 142 },
    ];
    (fetchPokemonData as jest.Mock).mockResolvedValue(mockPokemon);

    render(<PokemonMemoryGame />);

    // Wait for the API call
    await waitFor(() => {
      expect(fetchPokemonData).toHaveBeenCalledWith(100, 0, '', {
        types: [],
        moves: [],
        generation: '',
        weight: { min: 0, max: 0 },
        height: { min: 0, max: 0 },
        hasEvolutions: null,
      });
    });
  });

  it('handles game completion callback', async () => {
    const mockPokemon = [
      { id: 1, name: 'bulbasaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 7, weight: 69, moves: [], has_evolutions: true, is_default: true, base_experience: 64 },
      { id: 2, name: 'ivysaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 10, weight: 130, moves: [], has_evolutions: true, is_default: true, base_experience: 142 },
    ];
    (fetchPokemonData as jest.Mock).mockResolvedValue(mockPokemon);

    render(<PokemonMemoryGame />);

    // We can't easily test the callback since it's passed down to PokemonMemoryMatch
    // But we can verify the component renders correctly
    await waitFor(() => {
      expect(screen.getByText('Pokémon Memory Match')).toBeInTheDocument();
    });
  });

  it('falls back to displayed Pokemon if API fails', async () => {
    (fetchPokemonData as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<PokemonMemoryGame />);

    // Should still render the game with fallback data (from usePokemon hook)
    await waitFor(() => {
      expect(screen.getByText('Pokémon Memory Match')).toBeInTheDocument();
    });
  });
});

// Test the Pokemon loading logic
describe('Pokemon Loading Logic', () => {
  it('loads 100 Pokemon for the game', async () => {
    const mockPokemon = [
      { id: 1, name: 'bulbasaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 7, weight: 69, moves: [], has_evolutions: true, is_default: true, base_experience: 64 },
    ];
    (fetchPokemonData as jest.Mock).mockResolvedValue(mockPokemon);

    render(<PokemonMemoryGame />);

    // Wait for the API call and verify the parameters
    await waitFor(() => {
      expect(fetchPokemonData).toHaveBeenCalledWith(
        100, // limit
        0,   // offset
        '',  // searchTerm
        expect.objectContaining({
          types: [],
          moves: [],
          generation: '',
          weight: { min: 0, max: 0 },
          height: { min: 0, max: 0 },
          hasEvolutions: null,
        })
      );
    });
  });

  it('uses correct filters for maximum diversity', async () => {
    const mockPokemon = [
      { id: 1, name: 'bulbasaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 7, weight: 69, moves: [], has_evolutions: true, is_default: true, base_experience: 64 },
    ];
    (fetchPokemonData as jest.Mock).mockResolvedValue(mockPokemon);

    render(<PokemonMemoryGame />);

    // Wait for the API call and verify no filters are applied
    await waitFor(() => {
      expect(fetchPokemonData).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        '', // Empty search term
        expect.objectContaining({
          types: [], // No type filter
          moves: [], // No move filter
          generation: '', // No generation filter
          weight: { min: 0, max: 0 }, // No weight filter
          height: { min: 0, max: 0 }, // No height filter
          hasEvolutions: null, // No evolution filter
        })
      );
    });
  });
});

// Test error handling
describe('Error Handling', () => {
  it('handles API errors gracefully', async () => {
    (fetchPokemonData as jest.Mock).mockRejectedValue(new Error('Network Error'));

    render(<PokemonMemoryGame />);

    // Should still render the game with fallback data (from usePokemon hook)
    await waitFor(() => {
      expect(screen.getByText('Pokémon Memory Match')).toBeInTheDocument();
    });
  });

  it('shows loading state during API call', async () => {
    const mockPokemon = [
      { id: 1, name: 'bulbasaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 7, weight: 69, moves: [], has_evolutions: true, is_default: true, base_experience: 64 },
    ];

    // Mock a slow API call that eventually resolves
    (fetchPokemonData as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockPokemon), 100)));

    render(<PokemonMemoryGame />);

    // Should show loading state initially (from usePokemon loading state)
    expect(screen.getByText('Loading Pokemon...')).toBeInTheDocument();

    // Wait for the API call to complete and game to render
    await waitFor(() => {
      expect(screen.getByText('Pokémon Memory Match')).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});

// Test component structure
describe('Component Structure', () => {
  it('renders with correct background styling', async () => {
    // Set up the mock for this specific test
    (fetchPokemonData as jest.Mock).mockResolvedValue([
      { id: 1, name: 'bulbasaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 7, weight: 69, moves: [], has_evolutions: true, is_default: true, base_experience: 64 },
      { id: 2, name: 'ivysaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 10, weight: 130, moves: [], has_evolutions: true, is_default: true, base_experience: 142 },
    ]);

    render(<PokemonMemoryGame />);

    // Wait for the game to load and check for the background styling on the main container
    await waitFor(() => {
      // Find the main container which should have the background classes
      const gameContainer = screen.getByText('Pokémon Memory Match').parentElement?.parentElement?.parentElement;
      expect(gameContainer).toHaveClass('bg-gradient-to-br', 'from-blue-50', 'to-red-50');
    }, { timeout: 3000 });
  });

  it('passes Pokemon data to child component', async () => {
    // Set up the mock for this specific test
    (fetchPokemonData as jest.Mock).mockResolvedValue([
      { id: 1, name: 'test-pokemon', types: ['test'], sprites: {}, generation: 'test-gen' }
    ]);

    render(<PokemonMemoryGame />);

    await waitFor(() => {
      // The component should render successfully with the Pokemon data
      expect(screen.getByText('Pokémon Memory Match')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
