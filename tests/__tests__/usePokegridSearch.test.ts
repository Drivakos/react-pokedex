/**
 * Tests for usePokegridSearch hook
 * Focuses on search query trimming and optimization features
 */

import { renderHook, act } from '@testing-library/react';
import { usePokegridSearch } from '../../src/hooks/usePokegridSearch';

// Mock the dependencies
jest.mock('../../src/services/api', () => ({
  fetchPokemonData: jest.fn(),
}));

jest.mock('../../src/utils/pokemon-search', () => ({
  sortPokemonByRelevance: jest.fn(),
}));

describe('usePokegridSearch', () => {
  const mockFetchPokemonData = require('../../src/services/api').fetchPokemonData;
  const mockSortPokemonByRelevance = require('../../src/utils/pokemon-search').sortPokemonByRelevance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful API response
    mockFetchPokemonData.mockResolvedValue([
      { id: 25, name: 'pikachu', types: ['electric'] },
      { id: 1, name: 'bulbasaur', types: ['grass', 'poison'] }
    ]);

    // Mock sorting to return results as-is
    mockSortPokemonByRelevance.mockImplementation((results) => results);
  });

  describe('Query trimming', () => {
    test('should trim leading and trailing whitespace from search queries', async () => {
      const { result } = renderHook(() => usePokegridSearch());

      // Set query with leading and trailing spaces
      act(() => {
        result.current.setSearchQuery('  pikachu  ');
      });

      // Wait for debounced search to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify the search was called with trimmed query
      expect(mockFetchPokemonData).toHaveBeenCalledWith(
        1000,
        0,
        'pikachu', // Should be trimmed
        expect.any(Object),
        expect.anything()
      );
    });

    test('should not search for queries that are only whitespace', async () => {
      const { result } = renderHook(() => usePokegridSearch());

      // Set query with only spaces
      act(() => {
        result.current.setSearchQuery('   ');
      });

      // Wait for any potential search
      await new Promise(resolve => setTimeout(resolve, 250));

      // Verify no search was performed
      expect(mockFetchPokemonData).not.toHaveBeenCalled();
    });

    test('should not search for queries shorter than minimum length', async () => {
      const { result } = renderHook(() => usePokegridSearch());

      // Set query with only 1 character
      act(() => {
        result.current.setSearchQuery('p');
      });

      // Wait for any potential search
      await new Promise(resolve => setTimeout(resolve, 250));

      // Verify no search was performed (minimum 2 characters required)
      expect(mockFetchPokemonData).not.toHaveBeenCalled();
    });

    test('should handle empty string after trimming', async () => {
      const { result } = renderHook(() => usePokegridSearch());

      // Set empty query
      act(() => {
        result.current.setSearchQuery('');
      });

      // Wait for any potential search
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify no search was performed
      expect(mockFetchPokemonData).not.toHaveBeenCalled();
    });

    test('should prevent duplicate searches for same trimmed query', async () => {
      const { result } = renderHook(() => usePokegridSearch());

      // Set query with spaces
      act(() => {
        result.current.setSearchQuery('pikachu ');
      });

      // Wait for search
      await new Promise(resolve => setTimeout(resolve, 200));

      // Reset mock call count
      mockFetchPokemonData.mockClear();

      // Set the same query again (with different spacing)
      act(() => {
        result.current.setSearchQuery(' pikachu');
      });

      // Wait for potential search
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should not trigger another search since trimmed query is the same
      expect(mockFetchPokemonData).not.toHaveBeenCalled();
    });
  });

  describe('Search behavior', () => {
    test('should limit results to 50 items', async () => {
      // Mock API to return more than 50 results
      const mockResults = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `pokemon-${i + 1}`,
        types: ['normal']
      }));
      mockFetchPokemonData.mockResolvedValue(mockResults);

      const { result } = renderHook(() => usePokegridSearch());

      act(() => {
        result.current.setSearchQuery('pokemon');
      });

      // Wait for debounced search (200ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 250));

      // Verify the search was called
      expect(mockFetchPokemonData).toHaveBeenCalledWith(
        1000,
        0,
        'pokemon',
        expect.any(Object),
        expect.anything()
      );

      // Should only return 50 results due to limiting in hook
      expect(result.current.searchResults).toHaveLength(50);
    });

    test('should handle search errors gracefully', async () => {
      mockFetchPokemonData.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => usePokegridSearch());

      act(() => {
        result.current.setSearchQuery('pikachu');
      });

      // Wait for search to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should return empty results on error
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.isSearching).toBe(false);
    });
  });
});
