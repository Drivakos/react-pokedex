import React from 'react';
import PokemonImage from '../../PokemonImage';

interface ProfileFavoritesProps {
  favoritePokemonIds: number[];
  onNavigateToPokemon: (id: number) => void;
  onBrowse: () => void;
}

export const ProfileFavorites: React.FC<ProfileFavoritesProps> = ({
  favoritePokemonIds,
  onNavigateToPokemon,
  onBrowse
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Favorites</h2>
      {favoritePokemonIds.length === 0 ? (
        <p className="text-gray-500 text-sm">No favorites yet. <button onClick={onBrowse} className="text-blue-500 hover:underline">Browse Pokémon</button></p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {favoritePokemonIds.slice(0, 12).map((pokemonId) => (
            <button
              key={pokemonId}
              onClick={() => onNavigateToPokemon(pokemonId)}
              className="w-12 h-12 bg-gray-50 rounded border hover:bg-gray-100"
            >
              <PokemonImage
                pokemonId={pokemonId}
                alt={`#${pokemonId}`}
                className="w-full h-full object-contain"
              />
            </button>
          ))}
          {favoritePokemonIds.length > 12 && (
            <span className="text-sm text-gray-500 self-center ml-2">+{favoritePokemonIds.length - 12} more</span>
          )}
        </div>
      )}
    </div>
  );
};
