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
  );
};

export default PokemonList;
