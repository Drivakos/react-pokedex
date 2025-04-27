import React, { useState, useEffect, useMemo } from 'react';
import SearchBar from './SearchBar';
import TypeFilter from './TypeFilter';
import SearchResults from './SearchResults';
import { PokemonDetails, PokemonMove, PokemonAbility } from '../../../types/pokemon'; 
import { Info } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { fetchMultiplePokemonDetails } from '../../../services/api';

interface PokemonSearchProps {
  initialPool?: PokemonDetails[];
  selectedPokemon?: PokemonDetails | null;
  onPokemonSelect: (pokemon: PokemonDetails) => void;
  isLoading?: boolean;
  isLoadingInitialPool?: boolean;
}

const PokemonSearch: React.FC<PokemonSearchProps> = ({
  initialPool = [],
  selectedPokemon = null,
  onPokemonSelect,
  isLoading = false,
  isLoadingInitialPool = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [infoVisible, setInfoVisible] = useState(false);
  const [favoritePokemon, setFavoritePokemon] = useState<PokemonDetails[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [showingFavorites, setShowingFavorites] = useState(true);
  const { user, favorites } = useAuth();
  const itemsPerPage = 20;

  const filteredPool = useMemo(() => {
    if (showingFavorites && favoritePokemon.length > 0 && searchTerm === '' && selectedTypes.length === 0) {
      return favoritePokemon;
    }
    
    // Once user filters or searches, switch to normal pool
    if (showingFavorites && (searchTerm !== '' || selectedTypes.length > 0)) {
      setShowingFavorites(false);
    }
    
    if (!initialPool || initialPool.length === 0) return [];
    
    return initialPool.filter(pokemon => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = lowerSearchTerm === '' || 
        pokemon.name.toLowerCase().includes(lowerSearchTerm) ||
        pokemon.id.toString().includes(searchTerm) || 
        searchInMoves(pokemon.moves, lowerSearchTerm) || 
        searchInAbilities(pokemon.abilities, lowerSearchTerm);
      
      const matchesTypes = selectedTypes.length === 0 || 
        selectedTypes.every(type => includesType(pokemon.types, type)); 
      
      return matchesSearch && matchesTypes;
    });
  }, [initialPool, searchTerm, selectedTypes, favoritePokemon, showingFavorites]);

  const totalPages = Math.ceil(filteredPool.length / itemsPerPage);
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPool.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPool, currentPage, itemsPerPage]);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!user || favorites.length === 0) {
        setFavoritePokemon([]);
        return;
      }
      
      try {
        setLoadingFavorites(true);
        // Extract Pokémon IDs from favorites
        const favoriteIds = favorites.map(fav => fav.pokemon_id);
        
        // Fetch details for favorite Pokémon
        const favoriteDetails = await fetchMultiplePokemonDetails(favoriteIds);
        setFavoritePokemon(favoriteDetails);
      } catch (error) {
        console.error('Error loading favorites:', error);
      } finally {
        setLoadingFavorites(false);
      }
    };
    
    loadFavorites();
  }, [user, favorites]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTypes]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term !== '' && showingFavorites) {
      setShowingFavorites(false);
    }
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => {
      const newTypes = prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type];
      
      if (newTypes.length > 0 && showingFavorites) {
        setShowingFavorites(false);
      }
      
      return newTypes;
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold">Pokémon Search</h2>
          <button 
            className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none" 
            onClick={() => setInfoVisible(!infoVisible)}
            aria-label="Search information"
          >
            <Info size={16} />
          </button>
        </div>
        
        <div className="text-sm text-gray-500">
          {showingFavorites && favoritePokemon.length > 0 ? 
            `Showing ${favoritePokemon.length} favorites` : 
            `${filteredPool.length} Pokémon found`}
        </div>
      </div>
      
      {infoVisible && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-md">
          <p>Search by Pokémon name, ID, type, move, or ability. Select multiple types to filter results further.</p>
        </div>
      )}
      
      <div className="space-y-4 mb-6">
        <SearchBar 
          onSearch={handleSearch}
          placeholder="Search by name, ID, move, or ability..."
          initialValue={searchTerm}
        />
        
        <TypeFilter 
          selectedTypes={selectedTypes}
          onTypeToggle={handleTypeToggle}
        />
      </div>
      
      <SearchResults 
        results={paginatedResults}
        selectedPokemon={selectedPokemon}
        onSelectPokemon={onPokemonSelect}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        isLoading={isLoading || isLoadingInitialPool || loadingFavorites}
      />
    </div>
  );
};

const searchInMoves = (moves: PokemonMove[] | undefined, term: string): boolean => {
  if (!moves || !Array.isArray(moves)) return false;
  
  return moves.some(move => 
    move.name?.toLowerCase().includes(term) 
  );
};

const searchInAbilities = (abilities: PokemonAbility[] | undefined, term: string): boolean => {
  if (!abilities || !Array.isArray(abilities)) return false;
  
  return abilities.some(ability => 
    ability.name?.toLowerCase().includes(term)
  );
};

const includesType = (types: string[] | undefined, typeToFind: string): boolean => {
  if (!types || !Array.isArray(types)) return false;
  
  return types.includes(typeToFind);
};

export default PokemonSearch;
