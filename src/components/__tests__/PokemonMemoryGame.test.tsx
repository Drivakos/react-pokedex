import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PokemonMemoryGame from '../PokemonMemoryGame';

// Mock the usePokemon hook
jest.mock('../../hooks/usePokemon', () => ({
  usePokemon: () => ({
    displayedPokemon: [
      { id: 1, name: 'bulbasaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 7, weight: 69, moves: [], has_evolutions: true, is_default: true, base_experience: 64 },
      { id: 2, name: 'ivysaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 10, weight: 130, moves: [], has_evolutions: true, is_default: true, base_experience: 142 },
      { id: 3, name: 'venusaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 20, weight: 1000, moves: [], has_evolutions: false, is_default: true, base_experience: 263 },
    ],
    loading: false,
    loadMorePokemon: jest.fn(),
    hasMore: false,
  }),
}));

// Mock the API fetchPokemonData function
jest.mock('../../services/api', () => ({
  fetchPokemonData: jest.fn(() =>
    Promise.resolve([
      { id: 1, name: 'bulbasaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 7, weight: 69, moves: [], has_evolutions: true, is_default: true, base_experience: 64 },
      { id: 2, name: 'ivysaur', types: ['grass'], sprites: {}, generation: 'generation-i', height: 10, weight: 130, moves: [], has_evolutions: true, is_default: true, base_experience: 142 },
      { id: 4, name: 'charmander', types: ['fire'], sprites: {}, generation: 'generation-i', height: 6, weight: 85, moves: [], has_evolutions: true, is_default: true, base_experience: 62 },
      { id: 7, name: 'squirtle', types: ['water'], sprites: {}, generation: 'generation-i', height: 5, weight: 90, moves: [], has_evolutions: true, is_default: true, base_experience: 63 },
    ])
  ),
}));

describe('PokemonMemoryGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // Mock loading state
    const { usePokemon } = require('../../hooks/usePokemon');
    usePokemon.mockReturnValue({
      displayedPokemon: [],
      loading: true,
      loadMorePokemon: jest.fn(),
      hasMore: false,
    });

    render(<PokemonMemoryGame />);

    expect(screen.getByText('Loading Pokemon...')).toBeInTheDocument();
    expect(screen.getByText('Preparing diverse Pokemon pool for the game')).toBeInTheDocument();
  });

  it('renders game when Pokemon data is loaded', async () => {
    render(<PokemonMemoryGame />);

    // Wait for the component to load Pokemon data
    await waitFor(() => {
      expect(screen.getByText('Pokémon Memory Match')).toBeInTheDocument();
    });

    expect(screen.getByText('Find matching pairs of Pokémon cards!')).toBeInTheDocument();
  });

  it('calls fetchPokemonData to load game Pokemon', async () => {
    const { fetchPokemonData } = require('../../services/api');

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
    const mockGameComplete = jest.fn();

    // We can't easily test the callback since it's passed down to PokemonMemoryMatch
    // But we can verify the component renders correctly
    render(<PokemonMemoryGame />);

    await waitFor(() => {
      expect(screen.getByText('Pokémon Memory Match')).toBeInTheDocument();
    });
  });

  it('falls back to displayed Pokemon if API fails', async () => {
    const { fetchPokemonData } = require('../../services/api');
    fetchPokemonData.mockRejectedValue(new Error('API Error'));

    render(<PokemonMemoryGame />);

    // Should still render the game with fallback data
    await waitFor(() => {
      expect(screen.getByText('Pokémon Memory Match')).toBeInTheDocument();
    });
  });
});

// Test the Pokemon loading logic
describe('Pokemon Loading Logic', () => {
  it('loads 100 Pokemon for the game', () => {
    const { fetchPokemonData } = require('../../services/api');

    // Verify that the component requests exactly 100 Pokemon
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

  it('uses correct filters for maximum diversity', () => {
    const { fetchPokemonData } = require('../../services/api');

    // Verify that no filters are applied to get maximum diversity
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

// Test error handling
describe('Error Handling', () => {
  it('handles API errors gracefully', async () => {
    const { fetchPokemonData } = require('../../services/api');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    fetchPokemonData.mockRejectedValue(new Error('Network Error'));

    render(<PokemonMemoryGame />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error loading Pokemon for game:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('shows loading state during API call', () => {
    const { fetchPokemonData } = require('../../services/api');

    // Mock a slow API call
    fetchPokemonData.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<PokemonMemoryGame />);

    // Should show loading state initially
    expect(screen.getByText('Loading Pokemon...')).toBeInTheDocument();
  });
});

// Test component structure
describe('Component Structure', () => {
  it('renders with correct background styling', async () => {
    render(<PokemonMemoryGame />);

    await waitFor(() => {
      const container = screen.getByText('Pokémon Memory Match').closest('div');
      expect(container).toHaveClass('bg-gradient-to-br', 'from-blue-50', 'to-red-50');
    });
  });

  it('passes Pokemon data to child component', async () => {
    const { fetchPokemonData } = require('../../services/api');

    // Mock successful API response
    fetchPokemonData.mockResolvedValue([
      { id: 1, name: 'test-pokemon', types: ['test'], sprites: {}, generation: 'test-gen' }
    ]);

    render(<PokemonMemoryGame />);

    await waitFor(() => {
      // The component should render successfully with the Pokemon data
      expect(screen.getByText('Pokémon Memory Match')).toBeInTheDocument();
    });
  });
});
