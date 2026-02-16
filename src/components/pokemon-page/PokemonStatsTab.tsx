import React from 'react';
import { Heart, Shield, Zap, Swords, Award, Dumbbell } from 'lucide-react';
import { PokemonDetails } from '../../types/pokemon';

interface PokemonStatsTabProps {
  pokemonDetails: PokemonDetails;
}

export const PokemonStatsTab: React.FC<PokemonStatsTabProps> = ({ pokemonDetails }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Base Stats</h2>
      <div className="space-y-4 max-w-2xl mx-auto">
        <div>
          <div className="flex items-center mb-1">
            <Heart size={18} className="text-red-500 mr-2" />
            <span className="text-gray-700 font-medium w-32">HP</span>
            <span className="text-gray-900 font-semibold ml-auto">{pokemonDetails.stats.hp}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-red-500 h-2.5 rounded-full"
              style={{ width: `${(pokemonDetails.stats.hp / 150) * 100}%` }}
            ></div>
          </div>
        </div>
        <div>
          <div className="flex items-center mb-1">
            <Swords size={18} className="text-orange-500 mr-2" />
            <span className="text-gray-700 font-medium w-32">Attack</span>
            <span className="text-gray-900 font-semibold ml-auto">{pokemonDetails.stats.attack}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-orange-500 h-2.5 rounded-full"
              style={{ width: `${(pokemonDetails.stats.attack / 150) * 100}%` }}
            ></div>
          </div>
        </div>
        <div>
          <div className="flex items-center mb-1">
            <Shield size={18} className="text-blue-500 mr-2" />
            <span className="text-gray-700 font-medium w-32">Defense</span>
            <span className="text-gray-900 font-semibold ml-auto">{pokemonDetails.stats.defense}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full"
              style={{ width: `${(pokemonDetails.stats.defense / 150) * 100}%` }}
            ></div>
          </div>
        </div>
        <div>
          <div className="flex items-center mb-1">
            <Zap size={18} className="text-purple-500 mr-2" />
            <span className="text-gray-700 font-medium w-32">Special Attack</span>
            <span className="text-gray-900 font-semibold ml-auto">{pokemonDetails.stats.special_attack}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-purple-500 h-2.5 rounded-full"
              style={{ width: `${(pokemonDetails.stats.special_attack / 150) * 100}%` }}
            ></div>
          </div>
        </div>
        <div>
          <div className="flex items-center mb-1">
            <Award size={18} className="text-green-500 mr-2" />
            <span className="text-gray-700 font-medium w-32">Special Defense</span>
            <span className="text-gray-900 font-semibold ml-auto">{pokemonDetails.stats.special_defense}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-green-500 h-2.5 rounded-full"
              style={{ width: `${(pokemonDetails.stats.special_defense / 150) * 100}%` }}
            ></div>
          </div>
        </div>
        <div>
          <div className="flex items-center mb-1">
            <Dumbbell size={18} className="text-yellow-500 mr-2" />
            <span className="text-gray-700 font-medium w-32">Speed</span>
            <span className="text-gray-900 font-semibold ml-auto">{pokemonDetails.stats.speed}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-yellow-500 h-2.5 rounded-full"
              style={{ width: `${(pokemonDetails.stats.speed / 150) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex flex-col gap-4 mb-6">
          <h3 className="w-full text-xl font-bold mb-2">Abilities</h3>
          {pokemonDetails.abilities.map((ability, index) => (
            <div 
              key={`ability-${index}`}
              className="bg-gray-50 p-4 rounded-lg border border-gray-200"
            >
              <div className="flex items-center mb-2">
                <span className="font-medium capitalize text-lg">{ability.name}</span>
                {ability.is_hidden && (
                  <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                    Hidden
                  </span>
                )}
              </div>
              <p className="text-gray-700">{ability.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Pokédex Entry</h2>
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <p className="text-gray-700 leading-relaxed">
            {pokemonDetails.flavor_text || `${pokemonDetails.name.charAt(0).toUpperCase() + pokemonDetails.name.slice(1)} is a ${pokemonDetails.types.join('/')} type Pokémon introduced in ${pokemonDetails.generation.split('-')[1]?.toUpperCase() || 'Unknown'}. 
            It stands at ${(pokemonDetails.height / 10).toFixed(1)}m tall and weighs ${(pokemonDetails.weight / 10).toFixed(1)}kg.
            ${pokemonDetails.has_evolutions ? 
              " This Pokémon is known to evolve under certain conditions." : 
              " This Pokémon does not evolve."}`}
          </p>
          {pokemonDetails.genera && (
            <p className="mt-4 text-gray-600 italic">
              {pokemonDetails.genera}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
