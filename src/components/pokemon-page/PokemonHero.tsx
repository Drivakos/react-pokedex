import React from 'react';
import { PokemonDetails, TYPE_COLORS, TYPE_BACKGROUNDS } from '../../types/pokemon';
import PokemonImage from '../PokemonImage';

interface PokemonHeroProps {
  pokemonDetails: PokemonDetails;
  formattedId: string;
}

export const PokemonHero: React.FC<PokemonHeroProps> = ({ pokemonDetails, formattedId }) => {
  const getPrimaryType = () => {
    if (!pokemonDetails || !pokemonDetails.types || pokemonDetails.types.length === 0) {
      return 'normal';
    }
    const priorityTypes = ['dragon', 'fire', 'water', 'electric', 'grass', 'ice', 'ghost', 'psychic'];
    for (const priorityType of priorityTypes) {
      if (pokemonDetails.types.includes(priorityType)) {
        return priorityType;
      }
    }
    return pokemonDetails.types[0];
  };

  const primaryType = getPrimaryType();
  const backgroundStyle = TYPE_BACKGROUNDS[primaryType] || TYPE_BACKGROUNDS.normal;

  return (
    <div className={`bg-gradient-to-r ${backgroundStyle.gradient} text-white p-6 relative overflow-hidden`}>
      {backgroundStyle.pattern && (
        <div className={`absolute inset-0 ${backgroundStyle.pattern}`}></div>
      )}
      <div className="flex flex-col md:flex-row md:items-center">
        <div className="flex-shrink-0 flex justify-center mb-4 md:mb-0 md:mr-8">
          <PokemonImage
            pokemonId={pokemonDetails.id}
            alt={pokemonDetails.name}
            title={`${pokemonDetails.name.charAt(0).toUpperCase() + pokemonDetails.name.slice(1)} - #${formattedId} - ${pokemonDetails.types.join('/')} Type Pokémon`}
            className="w-48 h-48 object-contain"
          />
        </div>
        <div>
          <div className="flex items-center mb-2">
            <span className="text-sm font-semibold bg-white bg-opacity-20 px-3 py-1 rounded-full">
              #{formattedId}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold capitalize mb-2">
            {pokemonDetails.name}
          </h1>
          <div className="flex flex-wrap gap-2 mb-4">
            {pokemonDetails.types.map((type) => (
              <span
                key={type}
                className={`${TYPE_COLORS[type as keyof typeof TYPE_COLORS]} text-white px-3 py-1 rounded-full text-sm capitalize`}
              >
                {type}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-white text-opacity-80">Height</p>
              <p className="font-semibold">{(pokemonDetails.height / 10).toFixed(1)}m</p>
            </div>
            <div>
              <p className="text-sm text-white text-opacity-80">Weight</p>
              <p className="font-semibold">{(pokemonDetails.weight / 10).toFixed(1)}kg</p>
            </div>
            <div>
              <p className="text-sm text-white text-opacity-80">Generation</p>
              <p className="font-semibold capitalize">{pokemonDetails.generation?.replace('-', ' ') || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-white text-opacity-80">Base Exp</p>
              <p className="font-semibold">{pokemonDetails.base_experience}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
