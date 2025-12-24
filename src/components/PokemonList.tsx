import React from 'react';
import { Pokemon } from '../types/pokemon';
import { PokemonCard } from './PokemonCard';

interface PokemonListProps {
  pokemon: Pokemon[];
  onSelectPokemon: (pokemon: Pokemon) => void;
  lastPokemonRef: (node: HTMLDivElement | null) => void;
  isLoading: boolean;
}

export const PokemonList: React.FC<PokemonListProps> = ({
  pokemon,
  onSelectPokemon,
  lastPokemonRef,
  isLoading,
}) => {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        {pokemon.map((pokemonItem, index) => (
          <div
            key={pokemonItem.id}
            ref={index === pokemon.length - 1 ? lastPokemonRef : undefined}
          >
            <PokemonCard
              pokemon={pokemonItem}
              onClick={() => onSelectPokemon(pokemonItem)}
            />
          </div>
        ))}

        {/* Loading placeholders - show fewer for better performance */}
        {isLoading && (
          <>
            {[...Array(5)].map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="bg-gray-100 rounded-lg animate-pulse h-48"
              />
            ))}
          </>
        )}
      </div>

      {/* Loading icon at bottom when loading more Pokemon */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </>
  );
};

export default PokemonList;
