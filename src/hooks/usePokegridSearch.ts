import { useState, useEffect } from 'react';
import { Pokemon } from '../types/pokemon';

export function usePokegridSearch(displayedPokemon: Pokemon[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Pokemon[]>([]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const query = searchQuery.toLowerCase().trim();
      
      // Separate Pokemon into different priority groups
      const startsWithName: Pokemon[] = [];
      const startsWithId: Pokemon[] = [];
      const containsName: Pokemon[] = [];
      const containsId: Pokemon[] = [];
      
      displayedPokemon.forEach(pokemon => {
        const lowerName = pokemon.name.toLowerCase();
        const idString = pokemon.id.toString();
        
        if (lowerName.startsWith(query)) {
          startsWithName.push(pokemon);
        } else if (idString.startsWith(query)) {
          startsWithId.push(pokemon);
        } else if (lowerName.includes(query)) {
          containsName.push(pokemon);
        } else if (idString.includes(query)) {
          containsId.push(pokemon);
        }
      });
      
      // Sort each group by relevance (exact match first, then alphabetical)
      const sortByRelevance = (a: Pokemon, b: Pokemon) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        // Exact match first
        if (aName === query && bName !== query) return -1;
        if (bName === query && aName !== query) return 1;
        
        // Then alphabetical
        return aName.localeCompare(bName);
      };
      
      startsWithName.sort(sortByRelevance);
      startsWithId.sort((a, b) => a.id - b.id);
      containsName.sort(sortByRelevance);
      containsId.sort((a, b) => a.id - b.id);
      
      // Combine in priority order and limit results
      const combinedResults = [
        ...startsWithName,
        ...startsWithId,
        ...containsName,
        ...containsId
      ].slice(0, 50);
      
      setSearchResults(combinedResults);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, displayedPokemon]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults
  };
}
