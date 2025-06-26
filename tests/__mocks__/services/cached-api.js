// Mock cached API functions
import { mockPokemon, mockPokemonDetails } from '../types/pokemon.js';

export const fetchCachedPokemonById = jest.fn().mockResolvedValue(mockPokemon);
export const fetchCachedPokemonData = jest.fn().mockResolvedValue([mockPokemon]);
export const fetchCachedPokemonDetails = jest.fn().mockResolvedValue(mockPokemonDetails);
export const fetchCachedFilterOptions = jest.fn().mockResolvedValue({
  types: ['grass', 'poison', 'fire', 'water'],
  moves: ['tackle', 'vine-whip', 'scratch'],
  generations: ['generation-i', 'generation-ii']
}); 