import React from 'react';
import PokemonSearchCard from './PokemonSearchCard';
import Pagination from './Pagination';
import { PokemonDetails } from '../../../types/pokemon';

interface SearchResultsProps {
  results: PokemonDetails[];
  selectedPokemon: PokemonDetails | null;
  onSelectPokemon: (pokemon: PokemonDetails) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  selectedPokemon,
  onSelectPokemon,
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false
}) => {
  if (isLoading) {
    return <LoadingState />;
  }

  if (results.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {results.map(pokemon => (
          <PokemonSearchCard
            key={pokemon.id}
            pokemon={pokemon}
            isSelected={selectedPokemon?.id === pokemon.id}
            onSelect={onSelectPokemon}
          />
        ))}
      </div>
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
};

const LoadingState: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
    {Array.from({ length: 10 }).map((_, index) => (
      <div 
        key={`skeleton-${index}`} 
        className="p-3 border rounded-lg animate-pulse"
      >
        <div className="bg-gray-200 w-full h-24 rounded-md mb-3"></div>
        <div className="bg-gray-200 h-4 w-3/4 mx-auto rounded mb-2"></div>
        <div className="flex justify-center space-x-2">
          <div className="bg-gray-200 h-3 w-12 rounded-full"></div>
          <div className="bg-gray-200 h-3 w-12 rounded-full"></div>
        </div>
      </div>
    ))}
  </div>
);

const EmptyState: React.FC = () => (
  <div className="p-8 text-center bg-gray-50 rounded-lg">
    <div className="text-gray-400 mb-2">
      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-700 mb-1">No Pokémon found</h3>
    <p className="text-gray-500">Try adjusting your search or filters</p>
  </div>
);

export default SearchResults;
