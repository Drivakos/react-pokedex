import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PokemonImage from '../PokemonImage';

// Mock the helpers
jest.mock('../../utils/helpers', () => ({
  getPokemonImageSource: jest.fn(),
  getPokemonImageFallback: jest.fn(),
}));

import { getPokemonImageSource, getPokemonImageFallback } from '../../utils/helpers';

const mockGetPokemonImageSource = getPokemonImageSource as jest.Mock;
const mockGetPokemonImageFallback = getPokemonImageFallback as jest.Mock;

describe('PokemonImage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any pending async operations
    jest.clearAllTimers();
  });

  describe('Low Pokemon IDs (≤ 905)', () => {
    it('should start with local thumbnail for Pokemon ID 25', () => {
      mockGetPokemonImageSource.mockReturnValue('/images/pokemon/thumbnails/025.png');
      mockGetPokemonImageFallback.mockReturnValue('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png');

      render(<PokemonImage pokemonId={25} alt="Pikachu" />);

      const img = screen.getByAltText('Pikachu');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/images/pokemon/thumbnails/025.png');
      expect(mockGetPokemonImageSource).toHaveBeenCalledWith(25);
    });

    it('should fall back to CDN when local image fails to load', async () => {
      mockGetPokemonImageSource.mockReturnValue('/images/pokemon/thumbnails/025.png');
      mockGetPokemonImageFallback.mockReturnValue('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png');

      render(<PokemonImage pokemonId={25} alt="Pikachu" />);

      const img = screen.getByAltText('Pikachu');

      // Simulate local image load failure
      img.dispatchEvent(new Event('error'));

      await waitFor(() => {
        expect(img).toHaveAttribute('src', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png');
        expect(mockGetPokemonImageFallback).toHaveBeenCalledWith(25);
      });
    });
  });

  describe('High Pokemon IDs (> 905)', () => {
    it('should start with CDN URL for Pokemon ID 10177', () => {
      mockGetPokemonImageFallback.mockReturnValue('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10177.png');

      render(<PokemonImage pokemonId={10177} alt="Unknown Pokemon" />);

      const img = screen.getByAltText('Unknown Pokemon');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10177.png');
      expect(mockGetPokemonImageFallback).toHaveBeenCalledWith(10177);
    });

    it('should not try local image first for high Pokemon IDs', () => {
      mockGetPokemonImageFallback.mockReturnValue('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10177.png');

      render(<PokemonImage pokemonId={10177} alt="Unknown Pokemon" />);

      expect(mockGetPokemonImageSource).not.toHaveBeenCalled();
      expect(mockGetPokemonImageFallback).toHaveBeenCalledWith(10177);
    });
  });

  describe('Props handling', () => {
    it('should apply custom className', () => {
      mockGetPokemonImageSource.mockReturnValue('/images/pokemon/thumbnails/025.png');

      render(<PokemonImage pokemonId={25} alt="Pikachu" className="custom-class" />);

      const img = screen.getByAltText('Pikachu');
      expect(img).toHaveClass('custom-class');
    });

    it('should use default alt text when not provided', () => {
      mockGetPokemonImageSource.mockReturnValue('/images/pokemon/thumbnails/025.png');

      render(<PokemonImage pokemonId={25} />);

      const img = screen.getByAltText('Pokemon #25');
      expect(img).toBeInTheDocument();
    });
  });
});