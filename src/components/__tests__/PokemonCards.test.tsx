import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PokemonCards from '../PokemonCards';

// Mock the helpers
jest.mock('../../utils/helpers', () => ({
  getTcgCardImage: jest.fn((id) => `https://storage.googleapis.com/pokehelper/tcg-cards-webp/${id}.webp`),
  formatName: jest.fn((name) => name),
}));

// Mock the Fetch API
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockMapping = {
  "1": [
    {
      "id": "base1-1",
      "name": "Bulbasaur",
      "rarity": "Common",
      "set": {
        "name": "Base",
        "series": "Base",
        "releaseDate": "1999/01/09"
      },
      "images": {
        "small": "https://images.pokemontcg.io/base1/1.png",
        "large": "https://images.pokemontcg.io/base1/1_hires.png"
      }
    }
  ]
};

describe('PokemonCards Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockMapping,
    });
    // Clear localStorage
    localStorage.clear();
  });

  it('should load cards from local JSON mapping', async () => {
    render(<PokemonCards pokemonName="Bulbasaur" pokemonId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Trading Cards')).toBeInTheDocument();
      expect(screen.getByAltText('Bulbasaur card')).toBeInTheDocument();
    });

    const img = screen.getByAltText('Bulbasaur card');
    expect(img).toHaveAttribute('src', 'https://storage.googleapis.com/pokehelper/tcg-cards-webp/base1-1.webp');
  });

  it('should fallback to API small image if bucket image fails', async () => {
    render(<PokemonCards pokemonName="Bulbasaur" pokemonId={1} />);

    await waitFor(() => {
      expect(screen.getByAltText('Bulbasaur card')).toBeInTheDocument();
    });

    const img = screen.getByAltText('Bulbasaur card');
    
    // Simulate error on the bucket image
    fireEvent.error(img);

    expect(img).toHaveAttribute('src', 'https://images.pokemontcg.io/base1/1.png');
  });

  it('should show empty state when no cards found', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<PokemonCards pokemonName="MissingNo" pokemonId={0} />);

    await waitFor(() => {
      expect(screen.getByText('No trading cards found for MissingNo.')).toBeInTheDocument();
    });
  });

  it('should open modal with large image when card is clicked', async () => {
    render(<PokemonCards pokemonName="Bulbasaur" pokemonId={1} />);

    await waitFor(() => {
      expect(screen.getByAltText('Bulbasaur card')).toBeInTheDocument();
    });

    const card = screen.getByAltText('Bulbasaur card');
    fireEvent.click(card);

    await waitFor(() => {
      const modalImg = screen.getByAltText('Bulbasaur card large');
      expect(modalImg).toBeInTheDocument();
      expect(modalImg).toHaveAttribute('src', 'https://storage.googleapis.com/pokehelper/tcg-cards-webp/base1-1.webp');
    });
  });
});
