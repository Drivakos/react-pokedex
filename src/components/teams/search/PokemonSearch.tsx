import React, { useState, useEffect, useMemo } from 'react';
import SearchBar from './SearchBar';
import TypeFilter from './TypeFilter';
import SearchResults from './SearchResults';
import { PokemonDetails, PokemonMove, PokemonAbility } from '../../../types/pokemon'; 
import { Info } from 'lucide-react';

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
  const itemsPerPage = 20;

  const filteredPool = useMemo(() => {
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
  }, [initialPool, searchTerm, selectedTypes]);

  const totalPages = Math.ceil(filteredPool.length / itemsPerPage);
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPool.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPool, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTypes]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
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
          {filteredPool.length} Pokémon found
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
        isLoading={isLoading || isLoadingInitialPool}
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
