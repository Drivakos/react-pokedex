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
  const mockContext = {
    displayedPokemon: [
      { id: 1, name: 'bulbasaur', types: ['grass'], sprites: {}, generation: 'generation-i' },
      { id: 2, name: 'ivysaur', types: ['grass'], sprites: {}, generation: 'generation-i' },
    ],
    loading: false,
    loadMorePokemon: jest.fn(),
    hasMore: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePokemon as jest.Mock).mockReturnValue(mockContext);
  });

  it('renders loading state initially', () => {
    (usePokemon as jest.Mock).mockReturnValue({
      ...mockContext,
      loading: true,
    });

    render(<PokemonMemoryGame />);
    expect(screen.getByText('Loading Pokemon...')).toBeInTheDocument();
  });

  it('renders game when Pokemon data is loaded', async () => {
    (fetchPokemonData as jest.Mock).mockResolvedValue(mockContext.displayedPokemon);

    render(<PokemonMemoryGame />);

    await waitFor(() => {
      expect(screen.getByText('Find matching pairs of Pokémon cards!')).toBeInTheDocument();
    });
  });

  it('calls fetchPokemonData with signal', async () => {
    (fetchPokemonData as jest.Mock).mockResolvedValue(mockContext.displayedPokemon);

    render(<PokemonMemoryGame />);

    await waitFor(() => {
      expect(fetchPokemonData).toHaveBeenCalledWith(
        100, 0, '', expect.any(Object), expect.any(AbortSignal)
      );
    });
  });

  it('handles API errors gracefully', async () => {
    (fetchPokemonData as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<PokemonMemoryGame />);

    await waitFor(() => {
      expect(screen.getByText(/No Pokemon data available/i)).toBeInTheDocument();
    });
  });
});
